import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { normalizePhone, slugify } from "./format";
import { AGE_GROUPS, RATE_LABELS, type ProfileParsed } from "./profile-input";
import { notifyStaff } from "./telegram";

export async function getOwnProfile(userId: number) {
  const db = await getDb();
  const [p] = await db.select().from(s.profiles).where(eq(s.profiles.userId, userId)).limit(1);
  return p ?? null;
}

/**
 * Profilni yaratadi yoki yangilaydi. Tasdiqlangan profilda ism, kasb yoki bloger statistikasi
 * o'zgarsa, profil qayta tekshiruvga tushadi; narx, bio va holat o'zgarishi tekshiruvsiz.
 */
export async function upsertProfile(userId: number, phone: string, input: ProfileParsed): Promise<{ ok: true; profileId: number } | { ok: false; error: string }> {
  const db = await getDb();
  const profs = await db.select().from(s.professions);
  const prof = profs.find((p) => p.slug === input.profession);
  if (!prof) return { ok: false, error: "Yo‘nalish topilmadi" };
  const extraProf = input.extraProfession ? profs.find((p) => p.slug === input.extraProfession && p.id !== prof.id) : undefined;
  const isBlogger = prof.slug === "bloger";
  if (isBlogger && !input.blogger) return { ok: false, error: "Bloger statistikasini to‘ldiring" };
  for (const f of prof.fieldsSchema) {
    if (f.required && !input.extra[f.key]) return { ok: false, error: `“${f.label}” maydonini to‘ldiring` };
  }
  const extra = Object.fromEntries(prof.fieldsSchema.map((f) => [f.key, input.extra[f.key] ?? ""]).filter(([, v]) => v));

  const dists = await db.select().from(s.districts).where(inArray(s.districts.slug, input.districts));
  if (!dists.length) return { ok: false, error: "Tuman tanlang" };

  let admins: { name: string; role: string; phone: string; telegram: string }[] = [];
  if (isBlogger) {
    for (const a of input.blogger!.admins) {
      const ph = normalizePhone(a.phone);
      if (!ph) return { ok: false, error: `Admin telefoni noto‘g‘ri: ${a.phone}` };
      admins.push({ ...a, phone: ph });
    }
  }

  const values = {
    professionId: prof.id,
    extraProfessionId: extraProf?.id ?? null,
    fullName: input.fullName,
    birthYear: input.birthYear,
    gender: input.gender,
    languages: input.languages,
    bio: input.bio,
    experienceYears: input.experienceYears,
    price: input.price || null,
    priceNegotiable: input.priceNegotiable,
    tags: input.tags,
    videoLinks: input.videoLinks,
    extra,
    consentAt: new Date(),
    updatedAt: new Date(),
  };

  const existing = await getOwnProfile(userId);
  let profileId: number;
  let needsReview = false;
  if (existing) {
    profileId = existing.id;
    needsReview = existing.status === "approved" && (existing.fullName !== input.fullName || existing.professionId !== prof.id);
    await db.update(s.profiles).set({ ...values, ...(needsReview ? { status: "pending" as const } : {}) }).where(eq(s.profiles.id, profileId));
  } else {
    const [row] = await db.insert(s.profiles).values({ ...values, userId, slug: `${slugify(input.fullName) || "profil"}-${userId}` }).returning({ id: s.profiles.id });
    profileId = row.id;
  }

  await db.delete(s.profileDistricts).where(eq(s.profileDistricts.profileId, profileId));
  await db.insert(s.profileDistricts).values(dists.map((d) => ({ profileId, districtId: d.id })));

  const contactPhone = input.contacts.phone ? normalizePhone(input.contacts.phone) : phone;
  if (!contactPhone) return { ok: false, error: "Kontakt telefoni noto‘g‘ri" };
  await db.insert(s.profileContacts).values({ profileId, phone: contactPhone, telegram: input.contacts.telegram || null, instagram: input.contacts.instagram || null })
    .onConflictDoUpdate({ target: s.profileContacts.profileId, set: { phone: contactPhone, telegram: input.contacts.telegram || null, instagram: input.contacts.instagram || null } });

  await db.delete(s.bloggerAdmins).where(eq(s.bloggerAdmins.profileId, profileId));
  if (isBlogger) {
    const b = input.blogger!;
    await db.insert(s.bloggerAdmins).values(admins.map((a, i) => ({ profileId, ...a, telegram: a.telegram || null, sortOrder: i })));
    const followers = Object.fromEntries(Object.entries(b.followers).filter(([, v]) => v > 0));
    const next = {
      followers, er: b.er ?? null, avgViews: b.avgViews ?? null, storiesReach: b.storiesReach ?? null,
      audience: {
        gender: { f: b.genderF, m: 100 - b.genderF },
        ages: AGE_GROUPS.map((g, i) => [g, b.ages[i]] as [string, number]),
        cities: b.cities.filter(([c]) => c),
      },
      rates: RATE_LABELS.map((l, i) => [l, b.rates[i]] as [string, number]).filter(([, v]) => v > 0),
      topics: b.topics, noAds: b.noAds,
    };
    const [last] = await db.select().from(s.bloggerStats).where(eq(s.bloggerStats.profileId, profileId)).orderBy(desc(s.bloggerStats.createdAt)).limit(1);
    const statsChanged = !last || JSON.stringify([last.followers, last.er, last.avgViews, last.storiesReach, last.audience]) !==
      JSON.stringify([next.followers, next.er, next.avgViews, next.storiesReach, next.audience]);
    if (statsChanged) {
      // Yangi qator: tarix saqlanadi, tasdiq qaytadan kerak
      await db.insert(s.bloggerStats).values({ profileId, ...next, statDate: new Date() });
      if (existing?.status === "approved") needsReview = true;
    } else {
      await db.update(s.bloggerStats).set({ rates: next.rates, topics: next.topics, noAds: next.noAds }).where(eq(s.bloggerStats.id, last.id));
    }
    if (needsReview) await db.update(s.profiles).set({ status: "pending" }).where(eq(s.profiles.id, profileId));
  }
  if (needsReview) await notifyStaff(`Tasdiqlangan profil o‘zgardi, qayta tekshiruv: ${input.fullName}`);
  return { ok: true, profileId };
}

export async function submitForReview(userId: number): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = await getDb();
  const p = await getOwnProfile(userId);
  if (!p) return { ok: false, error: "Avval profilni to‘ldiring" };
  if (p.status === "blocked") return { ok: false, error: "Profil bloklangan. Admin bilan bog‘laning." };
  if (p.status === "approved" || p.status === "pending") return { ok: true };
  const images = await db.select({ id: s.media.id }).from(s.media)
    .where(and(eq(s.media.profileId, p.id), eq(s.media.type, "image"), eq(s.media.isStatScreenshot, false)));
  if (!images.length) return { ok: false, error: "Kamida bitta rasm yuklang" };
  await db.update(s.profiles).set({ status: "pending", rejectReason: null, updatedAt: new Date() }).where(eq(s.profiles.id, p.id));
  await notifyStaff(`Yangi profil tekshiruvga keldi: ${p.fullName}`);
  return { ok: true };
}
