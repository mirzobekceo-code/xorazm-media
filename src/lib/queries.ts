import { cache } from "react";
import { and, asc, desc, eq, gte, ilike, inArray, lte, ne, or, sql, type SQL } from "drizzle-orm";

// Subquery ichida tashqi ustun: drizzle bitta jadvalli select'da jadval nomini tushirib qoldiradi,
// shuning uchun to'liq nom bilan yoziladi (aks holda ichki jadvalning "id"siga bog'lanadi).
const P_ID = sql.raw(`"profiles"."id"`);
const PROF_ID = sql.raw(`"professions"."id"`);
const DIST_ID = sql.raw(`"districts"."id"`);
import { getDb, schema as s } from "@/db";
import { audienceBucket, totalFollowers } from "./format";

export const PAGE_SIZE = 24;

export const getProfessions = cache(async () => {
  const db = await getDb();
  const rows = await db
    .select({
      p: s.professions,
      count: sql<number>`(select count(*)::int from ${s.profiles} p where p.profession_id = ${PROF_ID} and p.status = 'approved')`,
    })
    .from(s.professions)
    .where(eq(s.professions.isActive, true))
    .orderBy(asc(s.professions.sortOrder));
  return rows.map((r) => ({ ...r.p, count: r.count }));
});

export const getDistricts = cache(async () => {
  const db = await getDb();
  const rows = await db
    .select({
      d: s.districts,
      count: sql<number>`(select count(*)::int from ${s.profileDistricts} pd join ${s.profiles} p on p.id = pd.profile_id where pd.district_id = ${DIST_ID} and p.status = 'approved')`,
    })
    .from(s.districts)
    .orderBy(asc(s.districts.sortOrder));
  return rows.map((r) => ({ ...r.d, count: r.count }));
});

export type CatalogFilters = {
  profession?: string;
  district?: string;
  q?: string;
  exp?: number;
  priceMin?: number;
  priceMax?: number;
  gender?: "f" | "m";
  audience?: "s" | "m" | "l";
  sort?: "top" | "new" | "cheap" | "views";
  page?: number;
  /** Kabinetdagi oldindan ko'rish: shu profil, holatidan qat'i nazar */
  onlyId?: number;
};

export type ProfileCard = Awaited<ReturnType<typeof searchProfiles>>["items"][number];

export async function searchProfiles(f: CatalogFilters) {
  const db = await getDb();
  const where: SQL[] = [f.onlyId ? eq(s.profiles.id, f.onlyId) : eq(s.profiles.status, "approved")];
  const profs = await getProfessions();
  const prof = f.profession ? profs.find((p) => p.slug === f.profession) : undefined;
  if (prof) {
    where.push(or(eq(s.profiles.professionId, prof.id), eq(s.profiles.extraProfessionId, prof.id))!);
  }
  if (f.district) {
    where.push(sql`exists (select 1 from ${s.profileDistricts} pd join ${s.districts} d on d.id = pd.district_id where pd.profile_id = ${P_ID} and d.slug = ${f.district})`);
  }
  if (f.q) {
    const like = `%${f.q.replace(/[%_]/g, "")}%`;
    where.push(or(ilike(s.profiles.fullName, like), ilike(s.profiles.bio, like), sql`array_to_string(${s.profiles.tags}, ' ') ilike ${like}`)!);
  }
  if (f.exp) where.push(gte(s.profiles.experienceYears, f.exp));
  if (f.priceMin) where.push(gte(s.profiles.price, f.priceMin));
  if (f.priceMax) where.push(lte(s.profiles.price, f.priceMax));
  if (f.gender) where.push(eq(s.profiles.gender, f.gender));

  const followersExpr = sql<number>`coalesce((select (select coalesce(sum(value::int),0) from jsonb_each_text(bs.followers)) from ${s.bloggerStats} bs where bs.profile_id = ${P_ID} order by bs.created_at desc limit 1), 0)`;
  if (f.audience) {
    const [lo, hi] = { s: [0, 10_000], m: [10_000, 50_000], l: [50_000, 1e12] }[f.audience];
    where.push(sql`${followersExpr} >= ${lo} and ${followersExpr} < ${hi}`);
  }

  const views30 = sql<number>`(select count(*)::int from ${s.events} e where e.profile_id = ${P_ID} and e.type = 'view' and e.created_at > now() - interval '30 days')`;
  const order = {
    top: [desc(s.profiles.isFeatured), desc(s.profiles.rankScore), desc(s.profiles.id)],
    new: [desc(s.profiles.verifiedAt), desc(s.profiles.id)],
    cheap: [sql`${s.profiles.price} asc nulls last`, desc(s.profiles.id)],
    views: [desc(views30), desc(s.profiles.id)],
  }[f.sort ?? "top"];

  const page = Math.max(1, f.page ?? 1);
  const cond = and(...where);
  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(s.profiles).where(cond);
  const rows = await db
    .select({
      id: s.profiles.id,
      slug: s.profiles.slug,
      fullName: s.profiles.fullName,
      experienceYears: s.profiles.experienceYears,
      price: s.profiles.price,
      priceNegotiable: s.profiles.priceNegotiable,
      tags: s.profiles.tags,
      isFeatured: s.profiles.isFeatured,
      isAvailable: s.profiles.isAvailable,
      professionId: s.profiles.professionId,
      followers: followersExpr,
      er: sql<number | null>`(select bs.er from ${s.bloggerStats} bs where bs.profile_id = ${P_ID} order by bs.created_at desc limit 1)`,
      cover: sql<string | null>`(select coalesce(m.thumb_url, m.url) from ${s.media} m where m.profile_id = ${P_ID} and m.type = 'image' and m.moderation_status = 'approved' and not m.is_stat_screenshot order by m.is_cover desc, m.sort_order asc limit 1)`,
      // Kartochka ostidagi portfolio: muqovadan keyingi 3 ta rasm
      thumbs: sql<string[]>`(select coalesce(array_agg(t.u), '{}') from (select coalesce(m.thumb_url, m.url) as u from ${s.media} m where m.profile_id = ${P_ID} and m.type = 'image' and m.moderation_status = 'approved' and not m.is_stat_screenshot order by m.is_cover desc, m.sort_order asc offset 1 limit 3) t)`,
      districts: sql<string[]>`(select coalesce(array_agg(d.name_uz order by d.sort_order), '{}') from ${s.profileDistricts} pd join ${s.districts} d on d.id = pd.district_id where pd.profile_id = ${P_ID})`,
    })
    .from(s.profiles)
    .where(cond)
    .orderBy(...order)
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  const byId = new Map(profs.map((p) => [p.id, p]));
  return {
    total,
    page,
    pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    items: rows.map((r) => ({ ...r, profession: byId.get(r.professionId)! })),
  };
}

export async function getProfile(slug: string, opts: { includeUnapproved?: boolean } = {}) {
  const db = await getDb();
  const [p] = await db.select().from(s.profiles).where(eq(s.profiles.slug, slug)).limit(1);
  if (!p) return null;
  if (!opts.includeUnapproved && p.status !== "approved") return null;
  const profs = await getProfessions();
  const [districts, mediaRows, stats, admins] = await Promise.all([
    db.select({ slug: s.districts.slug, nameUz: s.districts.nameUz })
      .from(s.profileDistricts).innerJoin(s.districts, eq(s.districts.id, s.profileDistricts.districtId))
      .where(eq(s.profileDistricts.profileId, p.id)).orderBy(asc(s.districts.sortOrder)),
    db.select().from(s.media)
      .where(and(eq(s.media.profileId, p.id), eq(s.media.isStatScreenshot, false),
        opts.includeUnapproved ? ne(s.media.moderationStatus, "rejected") : eq(s.media.moderationStatus, "approved")))
      .orderBy(desc(s.media.isCover), asc(s.media.sortOrder)),
    db.select().from(s.bloggerStats).where(eq(s.bloggerStats.profileId, p.id)).orderBy(desc(s.bloggerStats.createdAt)).limit(1),
    db.select().from(s.bloggerAdmins).where(eq(s.bloggerAdmins.profileId, p.id)).orderBy(asc(s.bloggerAdmins.sortOrder)),
  ]);
  return {
    ...p,
    profession: profs.find((x) => x.id === p.professionId)!,
    extraProfession: profs.find((x) => x.id === p.extraProfessionId) ?? null,
    districts,
    media: mediaRows,
    blogger: stats[0] ?? null,
    admins,
  };
}

export async function getSimilar(profileId: number, professionSlug: string, limit = 6) {
  const res = await searchProfiles({ profession: professionSlug, sort: "top" });
  return res.items.filter((x) => x.id !== profileId).slice(0, limit);
}

export async function getContacts(profileId: number) {
  const db = await getDb();
  const [p] = await db.select({ status: s.profiles.status, professionId: s.profiles.professionId })
    .from(s.profiles).where(eq(s.profiles.id, profileId)).limit(1);
  if (!p || p.status !== "approved") return null;
  const [c] = await db.select().from(s.profileContacts).where(eq(s.profileContacts.profileId, profileId)).limit(1);
  const admins = await db.select({ name: s.bloggerAdmins.name, role: s.bloggerAdmins.role, phone: s.bloggerAdmins.phone, telegram: s.bloggerAdmins.telegram })
    .from(s.bloggerAdmins).where(eq(s.bloggerAdmins.profileId, profileId)).orderBy(asc(s.bloggerAdmins.sortOrder));
  const isBlogger = admins.length > 0;
  return {
    // Bloger shaxsiy raqami ko'rsatilmaydi, faqat Instagram va adminlar
    phone: isBlogger ? null : c?.phone ?? null,
    telegram: isBlogger ? null : c?.telegram ?? null,
    instagram: c?.instagram ?? null,
    admins,
  };
}

export async function profileStats(profileId: number, days = 30) {
  const db = await getDb();
  const rows = await db.select({ type: s.events.type, n: sql<number>`count(*)::int` })
    .from(s.events)
    .where(and(eq(s.events.profileId, profileId), sql`${s.events.createdAt} > now() - make_interval(days => ${days})`))
    .groupBy(s.events.type);
  return {
    views: rows.find((r) => r.type === "view")?.n ?? 0,
    contacts: rows.find((r) => r.type === "contact_click")?.n ?? 0,
  };
}

export function bloggerTotals(stats: { followers: Record<string, number> } | null) {
  const total = totalFollowers(stats?.followers);
  return { total, bucket: audienceBucket(total) };
}

export { inArray };

/** Kasb ichidagi o'rni (TOP tartibi bo'yicha) va jami tasdiqlangan profillar soni. */
export async function professionPlace(professionId: number, rankScore: number) {
  const db = await getDb();
  const [r] = await db.select({
    above: sql<number>`count(*) filter (where ${s.profiles.rankScore} > ${rankScore})::int`,
    total: sql<number>`count(*)::int`,
  }).from(s.profiles).where(and(eq(s.profiles.professionId, professionId), eq(s.profiles.status, "approved")));
  return { place: r.above + 1, total: Math.max(r.total, 1) };
}
