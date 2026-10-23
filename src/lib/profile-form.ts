import "server-only";
import { asc, desc, eq } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { getDistricts, getProfessions } from "./queries";
import { AGE_GROUPS, RATE_LABELS, type ProfileInputT } from "./profile-input";
import { uploadLimits } from "./limits";

/** Formaga kerakli ma'lumotnomalar. */
export async function wizardRefs() {
  const [profs, dists] = await Promise.all([getProfessions(), getDistricts()]);
  return {
    professions: profs.map((p) => ({ slug: p.slug, nameUz: p.nameUz, description: p.description, icon: p.icon, unit: p.unit, fieldsSchema: p.fieldsSchema })),
    districts: dists.map((d) => [d.slug, d.nameUz] as [string, string]),
    limits: uploadLimits(),
  };
}

/** Bazadagi profilni forma qiymatlariga aylantiradi (tahrirlash uchun). */
export async function profileToInput(profileId: number): Promise<{ input: ProfileInputT; media: Awaited<ReturnType<typeof loadMedia>> }> {
  const db = await getDb();
  const [p] = await db.select().from(s.profiles).where(eq(s.profiles.id, profileId));
  const profs = await getProfessions();
  const [dists, [c], [b], admins, media] = await Promise.all([
    db.select({ slug: s.districts.slug }).from(s.profileDistricts).innerJoin(s.districts, eq(s.districts.id, s.profileDistricts.districtId)).where(eq(s.profileDistricts.profileId, p.id)),
    db.select().from(s.profileContacts).where(eq(s.profileContacts.profileId, p.id)),
    db.select().from(s.bloggerStats).where(eq(s.bloggerStats.profileId, p.id)).orderBy(desc(s.bloggerStats.createdAt)).limit(1),
    db.select().from(s.bloggerAdmins).where(eq(s.bloggerAdmins.profileId, p.id)).orderBy(asc(s.bloggerAdmins.sortOrder)),
    loadMedia(p.id),
  ]);
  const prof = profs.find((x) => x.id === p.professionId)!;
  const input: ProfileInputT = {
    profession: prof.slug,
    extraProfession: profs.find((x) => x.id === p.extraProfessionId)?.slug ?? "",
    fullName: p.fullName, birthYear: p.birthYear ?? ("" as unknown as number), gender: p.gender ?? "f",
    languages: p.languages as ("uz" | "ru" | "en")[], districts: dists.map((d) => d.slug), bio: p.bio,
    experienceYears: p.experienceYears, price: p.price ?? undefined, priceNegotiable: p.priceNegotiable,
    tags: p.tags.join(", "), extra: p.extra, videoLinks: p.videoLinks.join("\n"),
    contacts: { phone: c?.phone ?? "", telegram: c?.telegram ?? "", instagram: c?.instagram ?? "" },
    consent: true,
    blogger: prof.slug === "bloger" ? {
      followers: { instagram: 0, telegram: 0, tiktok: 0, youtube: 0, ...(b?.followers ?? {}) },
      er: b?.er ?? undefined, avgViews: b?.avgViews ?? undefined, storiesReach: b?.storiesReach ?? undefined,
      genderF: b?.audience?.gender.f ?? 50,
      ages: AGE_GROUPS.map((g) => b?.audience?.ages.find(([k]) => k === g)?.[1] ?? 0),
      cities: b?.audience?.cities ?? [["Urganch", 50]],
      rates: RATE_LABELS.map((l) => b?.rates.find(([k]) => k === l)?.[1] ?? 0),
      topics: b?.topics ?? "", noAds: b?.noAds ?? "",
      admins: admins.length ? admins.map((a) => ({ name: a.name, role: a.role, phone: a.phone, telegram: a.telegram ?? "" })) : [{ name: "", role: "Reklama bo‘yicha admin", phone: "", telegram: "" }],
    } : undefined,
  };
  return { input, media };
}

async function loadMedia(profileId: number) {
  const db = await getDb();
  return db.select({
    id: s.media.id, url: s.media.url, thumbUrl: s.media.thumbUrl, type: s.media.type, isCover: s.media.isCover,
    isStatScreenshot: s.media.isStatScreenshot, moderationStatus: s.media.moderationStatus,
  }).from(s.media).where(eq(s.media.profileId, profileId)).orderBy(asc(s.media.sortOrder));
}
