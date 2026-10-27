import "server-only";
import { and, desc, eq, inArray, isNotNull, lt, or, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema as s } from "@/db";
import { money, normalizePhone } from "./format";
import { SITE } from "./site";
import { notifyUser, send, tg } from "./telegram";

/** So'rov muddati variantlari (biznes egasi tanlaydi). */
export const REQUEST_DEADLINES = ["Shoshilinch (1–2 kun)", "Shu hafta", "Shu oy", "Kelishiladi"] as const;
export const REQUEST_REJECT_REASONS = ["Spam yoki reklama", "Ma’lumot yetarli emas", "Platformaga mos emas"] as const;
/** E'lon qilingan so'rov shuncha kun ochiq turadi */
export const REQUEST_DAYS = 14;
/** Bir foydalanuvchining bir vaqtdagi faol (tekshiruvda yoki ochiq) so'rovlari */
export const MAX_ACTIVE_REQUESTS = 3;

const handle = z.string().trim().max(64).regex(/^@?[A-Za-z0-9_.]*$/, "Telegram: faqat lotin harflari, raqam, _ va .")
  .transform((v) => (v ? (v.startsWith("@") ? v : "@" + v) : ""));

export const RequestInput = z.object({
  profession: z.string().min(1, "Qaysi mutaxassis kerakligini tanlang"),
  district: z.string().default(""),
  title: z.string().trim().min(5, "Qisqacha nima kerakligini yozing (kamida 5 belgi)").max(120),
  description: z.string().trim().max(1000).default(""),
  budget: z.preprocess((v) => (v === "" || v == null ? undefined : String(v).replace(/\D/g, "")), z.coerce.number<number>().int().min(0).max(1_000_000_000).optional()),
  deadline: z.enum(REQUEST_DEADLINES, { error: "Muddatni tanlang" }),
  businessName: z.string().trim().max(80).default(""),
  contactPhone: z.string().trim().min(9, "Bog‘lanish uchun telefon raqamini kiriting"),
  contactTelegram: handle.default(""),
});
export type RequestInputT = z.input<typeof RequestInput>;

export async function createRequest(userId: number, input: z.output<typeof RequestInput>): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
  const db = await getDb();
  const phone = normalizePhone(input.contactPhone);
  if (!phone) return { ok: false, error: "Telefon raqami noto‘g‘ri (+998 …)" };
  const [prof] = await db.select({ id: s.professions.id }).from(s.professions).where(eq(s.professions.slug, input.profession));
  if (!prof) return { ok: false, error: "Yo‘nalish topilmadi" };
  const [dist] = input.district ? await db.select({ id: s.districts.id }).from(s.districts).where(eq(s.districts.slug, input.district)) : [];
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(s.requests)
    .where(and(eq(s.requests.userId, userId), inArray(s.requests.status, ["pending", "open"])));
  if (n >= MAX_ACTIVE_REQUESTS) return { ok: false, error: `Bir vaqtda ${MAX_ACTIVE_REQUESTS} tagacha faol so‘rov. Eskisini yoping yoki muddati tugashini kuting.` };
  const [row] = await db.insert(s.requests).values({
    userId, professionId: prof.id, districtId: dist?.id ?? null, title: input.title, description: input.description,
    budget: input.budget || null, deadline: input.deadline, businessName: input.businessName || null,
    contactPhone: phone, contactTelegram: input.contactTelegram || null,
  }).returning({ id: s.requests.id });
  await sendRequestModeration(row.id).catch((e) => console.error("so'rov moderatsiyasi", e));
  return { ok: true, id: row.id };
}

/** So'rov va unga oid nomlar (kasb, hudud). */
export async function getRequest(id: number) {
  const db = await getDb();
  const [r] = await db.select({
    req: s.requests, profession: s.professions.nameUz, professionSlug: s.professions.slug, district: s.districts.nameUz,
    responses: sql<number>`(select count(*)::int from ${s.requestResponses} rr where rr.request_id = ${sql.raw(`"requests"."id"`)})`,
  }).from(s.requests)
    .innerJoin(s.professions, eq(s.professions.id, s.requests.professionId))
    .leftJoin(s.districts, eq(s.districts.id, s.requests.districtId))
    .where(eq(s.requests.id, id));
  return r ? { ...r.req, profession: r.profession, professionSlug: r.professionSlug, district: r.district ?? "Butun Xorazm", responses: r.responses } : null;
}
export type RequestFull = NonNullable<Awaited<ReturnType<typeof getRequest>>>;

export const budgetText = (b: number | null) => (b ? `${money(b)} so‘m` : "Kelishiladi");

/** Ochiq so'rovlar ro'yxati (ixtiyoriy kasb bo'yicha). */
export async function listOpenRequests(professionSlug?: string) {
  const db = await getDb();
  const rows = await db.select({
    req: s.requests, profession: s.professions.nameUz, professionSlug: s.professions.slug, district: s.districts.nameUz,
    responses: sql<number>`(select count(*)::int from ${s.requestResponses} rr where rr.request_id = ${sql.raw(`"requests"."id"`)})`,
  }).from(s.requests)
    .innerJoin(s.professions, eq(s.professions.id, s.requests.professionId))
    .leftJoin(s.districts, eq(s.districts.id, s.requests.districtId))
    .where(and(eq(s.requests.status, "open"), professionSlug ? eq(s.professions.slug, professionSlug) : undefined))
    .orderBy(desc(s.requests.approvedAt)).limit(100);
  return rows.map((r) => ({ ...r.req, profession: r.profession, professionSlug: r.professionSlug, district: r.district ?? "Butun Xorazm", responses: r.responses }));
}

function summary(r: RequestFull) {
  return [
    `<b>${esc(r.title)}</b>`,
    `${esc(r.profession)} · ${esc(r.district)}`,
    `Budjet: ${budgetText(r.budget)} · Muddat: ${esc(r.deadline)}`,
    ...(r.description ? ["", esc(r.description.slice(0, 600))] : []),
  ].join("\n");
}
const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const appBtn = (text: string, path: string) =>
  SITE.url.startsWith("https://") ? { text, web_app: { url: `${SITE.url}${path}` } } : { text, url: `${SITE.url}${path}` };

/** Yangi so'rov moderator va adminlarga (Telegram): tasdiqlash yoki rad etish tugmalari bilan. */
export async function sendRequestModeration(id: number) {
  const db = await getDb();
  const r = await getRequest(id);
  if (!r) return;
  const staff = await db.select({ tg: s.users.telegramId }).from(s.users)
    .where(and(inArray(s.users.role, ["moderator", "admin"]), isNotNull(s.users.telegramId)));
  const text = `📝 <b>Yangi so‘rov tekshiruvga keldi</b>\n\n${summary(r)}\n\n📞 ${esc(r.contactPhone)}${r.contactTelegram ? ` · ${esc(r.contactTelegram)}` : ""}${r.businessName ? `\n🏢 ${esc(r.businessName)}` : ""}`;
  await Promise.all(staff.map(({ tg: chatId }) => tg("sendMessage", {
    chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true, reply_markup: requestModButtons(id),
  })));
}

export const requestModButtons = (id: number) => ({
  inline_keyboard: [
    [{ text: "✓ E’lon qilish", callback_data: `rq:a:${id}` }, { text: "✕ Rad etish", callback_data: `rq:r:${id}` }],
  ],
});
export const requestReasonButtons = (id: number) => ({
  inline_keyboard: [
    ...REQUEST_REJECT_REASONS.map((t, i) => [{ text: t, callback_data: `rq:x:${id}:${i}` }]),
    [{ text: "← Orqaga", callback_data: `rq:b:${id}` }],
  ],
});

/** Tasdiqlash: so'rov ochiladi va mos mutaxassislarga botda yuboriladi. Nechta mutaxassisga yetgani qaytadi. */
export async function approveRequest(id: number): Promise<number> {
  const db = await getDb();
  const [r0] = await db.update(s.requests).set({ status: "open", approvedAt: new Date(), expiresAt: new Date(Date.now() + REQUEST_DAYS * 86_400_000) })
    .where(and(eq(s.requests.id, id), eq(s.requests.status, "pending"))).returning();
  if (!r0) return 0;
  const r = (await getRequest(id))!;
  // Mos kasb (asosiy yoki qo'shimcha), tanlangan hudud (yoki butun Xorazm), Telegram'i ulangan, band emas
  const inDistrict = r.districtId
    ? sql`exists (select 1 from ${s.profileDistricts} pd where pd.profile_id = ${sql.raw(`"profiles"."id"`)} and pd.district_id = ${r.districtId})`
    : sql`true`;
  const targets = await db.select({ tg: s.users.telegramId }).from(s.profiles)
    .innerJoin(s.users, eq(s.users.id, s.profiles.userId))
    .where(and(
      eq(s.profiles.status, "approved"), eq(s.profiles.isAvailable, true), isNotNull(s.users.telegramId),
      or(eq(s.profiles.professionId, r.professionId), eq(s.profiles.extraProfessionId, r.professionId)), inDistrict,
    )).limit(300);
  let sent = 0;
  for (const t of targets) {
    if (t.tg === undefined || t.tg === null) continue;
    const ok = await send(t.tg, `🆕 <b>Yangi so‘rov sizning yo‘nalishingizda</b>\n\n${summary(r)}`, {
      parse_mode: "HTML", reply_markup: { inline_keyboard: [[appBtn("Ko‘rish va javob berish", `/sorovlar/${id}`)]] },
    });
    if (ok) sent++;
  }
  await db.update(s.requests).set({ notifiedCount: sent }).where(eq(s.requests.id, id));
  await notifyUser(r.userId, `✓ So‘rovingiz e’lon qilindi va ${sent} ta mos mutaxassisga yuborildi. Qiziqqanlar shu yerga va kabinetingizga keladi.\n\n${SITE.url}/sorovlar/${id}`);
  return sent;
}

export async function rejectRequest(id: number, reason: string) {
  const db = await getDb();
  const [r] = await db.update(s.requests).set({ status: "rejected", rejectReason: reason })
    .where(and(eq(s.requests.id, id), eq(s.requests.status, "pending"))).returning();
  if (r) await notifyUser(r.userId, `So‘rovingiz e’lon qilinmadi: ${reason}.\n\nTuzatib, qayta yuborishingiz mumkin: ${SITE.url}/sorov`);
  return !!r;
}

/** Mutaxassisning "Qiziqaman" javobi: biznes egasiga profil havolasi bilan xabar boradi. */
export async function respondToRequest(requestId: number, profile: { id: number; fullName: string; slug: string; professionId: number })
  : Promise<{ ok: true; first: boolean } | { ok: false; error: string }> {
  const db = await getDb();
  const r = await getRequest(requestId);
  if (!r || r.status !== "open") return { ok: false, error: "So‘rov yopilgan" };
  const [row] = await db.insert(s.requestResponses).values({ requestId, profileId: profile.id }).onConflictDoNothing().returning();
  if (!row) return { ok: true, first: false };
  const [p] = await db.select({ name: s.professions.nameUz }).from(s.professions).where(eq(s.professions.id, profile.professionId));
  const owner = await db.select({ tg: s.users.telegramId }).from(s.users).where(eq(s.users.id, r.userId));
  if (owner[0]?.tg) {
    await send(owner[0].tg, `👋 <b>${esc(profile.fullName)}</b> (${esc(p?.name ?? "")}) so‘rovingizga qiziqdi:\n«${esc(r.title)}»\n\nPortfolio va kontaktlarini ko‘ring:`, {
      parse_mode: "HTML", reply_markup: { inline_keyboard: [[appBtn("Profilni ochish", `/m/${profile.slug}`)], [appBtn("Barcha javoblar", `/sorovlar/${requestId}`)]] },
    });
  }
  return { ok: true, first: true };
}

export async function closeRequest(id: number, userId: number) {
  const db = await getDb();
  await db.update(s.requests).set({ status: "closed", closedAt: new Date() })
    .where(and(eq(s.requests.id, id), eq(s.requests.userId, userId), inArray(s.requests.status, ["pending", "open"])));
}

/** Kunlik: muddati o'tgan ochiq so'rovlar yopiladi. */
export async function expireRequests(): Promise<number> {
  const db = await getDb();
  const rows = await db.update(s.requests).set({ status: "expired", closedAt: new Date() })
    .where(and(eq(s.requests.status, "open"), lt(s.requests.expiresAt, new Date()))).returning({ id: s.requests.id });
  return rows.length;
}

/** So'rovga javob bergan mutaxassislar (egasi ko'radi). */
export async function requestResponders(requestId: number) {
  const db = await getDb();
  return db.select({ profileId: s.requestResponses.profileId, at: s.requestResponses.createdAt })
    .from(s.requestResponses).where(eq(s.requestResponses.requestId, requestId)).orderBy(desc(s.requestResponses.createdAt));
}

export async function userRequests(userId: number) {
  const db = await getDb();
  return db.select({
    id: s.requests.id, title: s.requests.title, status: s.requests.status, createdAt: s.requests.createdAt, notifiedCount: s.requests.notifiedCount,
    responses: sql<number>`(select count(*)::int from ${s.requestResponses} rr where rr.request_id = ${sql.raw(`"requests"."id"`)})`,
  }).from(s.requests).where(eq(s.requests.userId, userId)).orderBy(desc(s.requests.createdAt));
}
