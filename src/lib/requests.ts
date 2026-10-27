import "server-only";
import { and, asc, desc, eq, inArray, isNotNull, lt, or, sql } from "drizzle-orm";
import type { z } from "zod";
import { getDb, schema as s } from "@/db";
import { money, normalizePhone, prettyPhone } from "./format";
import { SITE } from "./site";
import { notifyUser, send, tg } from "./telegram";
import { QuickRequestInput, REMOTE, requestTitle } from "./request-input";

export const REQUEST_REJECT_REASONS = ["Spam yoki reklama", "Ma’lumot yetarli emas", "Platformaga mos emas"] as const;
/** E'lon qilingan so'rov shuncha kun ochiq turadi */
export const REQUEST_DAYS = 14;
/** Bir foydalanuvchi (yoki raqam) uchun bir vaqtdagi faol (tekshiruvda yoki ochiq) so'rovlar */
export const MAX_ACTIVE_REQUESTS = 3;

/**
 * Tezkor so'rov ("Muammoni yozing"): kirish shart emas, faqat raqam. Moderatorga botda boradi —
 * u Adverto o'zi olishini yoki qaysi kasbdagi mutaxassislarga yuborishni tanlaydi.
 */
export async function createQuickRequest(userId: number | null, input: z.output<typeof QuickRequestInput>)
  : Promise<{ ok: true; id: number } | { ok: false; error: string }> {
  const db = await getDb();
  const phone = normalizePhone(input.phone);
  if (!phone) return { ok: false, error: "Telefon raqami noto‘g‘ri (+998 …)" };
  const remote = input.place === REMOTE;
  const [dist] = input.place && !remote ? await db.select({ id: s.districts.id }).from(s.districts).where(eq(s.districts.slug, input.place)) : [];
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(s.requests)
    .where(and(userId ? eq(s.requests.userId, userId) : eq(s.requests.contactPhone, phone), inArray(s.requests.status, ["pending", "open"])));
  if (n >= MAX_ACTIVE_REQUESTS) return { ok: false, error: `Bu raqamdan ${MAX_ACTIVE_REQUESTS} ta so‘rov ko‘rib chiqilmoqda. Mutaxassislar tez orada bog‘lanadi.` };
  const [row] = await db.insert(s.requests).values({
    userId, districtId: dist?.id ?? null, remote, title: requestTitle(input.text), description: input.text,
    budgetLabel: input.budget || null, contactPhone: phone,
  }).returning({ id: s.requests.id });
  await sendRequestModeration(row.id).catch((e) => console.error("so'rov moderatsiyasi", e));
  return { ok: true, id: row.id };
}

/** So'rov va unga oid nomlar (kasblar, hudud). */
export async function getRequest(id: number) {
  const db = await getDb();
  const [r] = await db.select({
    req: s.requests, district: s.districts.nameUz,
    responses: sql<number>`(select count(*)::int from ${s.requestResponses} rr where rr.request_id = ${sql.raw(`"requests"."id"`)})`,
  }).from(s.requests)
    .leftJoin(s.districts, eq(s.districts.id, s.requests.districtId))
    .where(eq(s.requests.id, id));
  if (!r) return null;
  const profs = await targetProfessions(r.req);
  return {
    ...r.req, district: placeText(r.req.remote, r.district), responses: r.responses,
    profession: profs.map((p) => p.nameUz).join(", "), professionSlugs: profs.map((p) => p.slug),
  };
}
export type RequestFull = NonNullable<Awaited<ReturnType<typeof getRequest>>>;

const placeText = (remote: boolean, district: string | null) => (remote ? "Masofaviy" : district ?? "Butun Xorazm");

/** Moderator tanlagan kasblar (eski to'liq formada biznesning o'zi tanlagan kasb). */
async function targetProfessions(r: { professionIds: number[]; professionId: number | null }) {
  const ids = r.professionIds.length ? r.professionIds : r.professionId ? [r.professionId] : [];
  if (!ids.length) return [];
  const db = await getDb();
  return db.select({ id: s.professions.id, nameUz: s.professions.nameUz, slug: s.professions.slug })
    .from(s.professions).where(inArray(s.professions.id, ids)).orderBy(asc(s.professions.sortOrder));
}

export const budgetText = (r: { budgetLabel: string | null; budget: number | null }) =>
  r.budgetLabel || (r.budget ? `${money(r.budget)} so‘m` : "Kelishiladi");

/** Ochiq so'rovlar ro'yxati (ixtiyoriy kasb bo'yicha). */
export async function listOpenRequests(professionSlug?: string) {
  const db = await getDb();
  const [prof] = professionSlug ? await db.select({ id: s.professions.id }).from(s.professions).where(eq(s.professions.slug, professionSlug)) : [];
  if (professionSlug && !prof) return [];
  const rows = await db.select({
    req: s.requests, district: s.districts.nameUz,
    responses: sql<number>`(select count(*)::int from ${s.requestResponses} rr where rr.request_id = ${sql.raw(`"requests"."id"`)})`,
  }).from(s.requests)
    .leftJoin(s.districts, eq(s.districts.id, s.requests.districtId))
    .where(and(eq(s.requests.status, "open"), prof ? or(sql`${prof.id} = any(${s.requests.professionIds})`, eq(s.requests.professionId, prof.id)) : undefined))
    .orderBy(desc(s.requests.approvedAt)).limit(100);
  const allProfs = await db.select({ id: s.professions.id, nameUz: s.professions.nameUz }).from(s.professions);
  const name = (id: number) => allProfs.find((p) => p.id === id)?.nameUz ?? "";
  return rows.map((r) => {
    const ids = r.req.professionIds.length ? r.req.professionIds : r.req.professionId ? [r.req.professionId] : [];
    return { ...r.req, profession: ids.map(name).join(", "), district: placeText(r.req.remote, r.district), responses: r.responses };
  });
}

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const appBtn = (text: string, path: string) =>
  SITE.url.startsWith("https://") ? { text, web_app: { url: `${SITE.url}${path}` } } : { text, url: `${SITE.url}${path}` };

/** Botdagi so'rov matni: muammo, hudud, budjet (+ kerak bo'lsa aloqa raqami). */
function requestText(r: RequestFull, withContact: boolean) {
  return [
    esc(r.description.slice(0, 1500)),
    "",
    `📍 ${esc(r.district)} · 💰 ${esc(budgetText(r))}${r.deadline ? ` · ⏱ ${esc(r.deadline)}` : ""}`,
    ...(r.profession ? [`👥 ${esc(r.profession)}`] : []),
    ...(withContact ? [`📞 ${prettyPhone(r.contactPhone)}${r.contactTelegram ? ` · ${esc(r.contactTelegram)}` : ""}`] : []),
    ...(withContact && r.businessName ? [`🏢 ${esc(r.businessName)}`] : []),
  ].join("\n");
}

async function staffChats() {
  const db = await getDb();
  return db.select({ tg: s.users.telegramId }).from(s.users)
    .where(and(inArray(s.users.role, ["moderator", "admin"]), isNotNull(s.users.telegramId)));
}

/** Yangi so'rov moderator va adminlarga (Telegram): Adverto oladi / mutaxassislarga / rad etish. */
export async function sendRequestModeration(id: number) {
  const r = await getRequest(id);
  if (!r) return;
  const text = `📝 <b>Yangi so‘rov #${id}</b>\n\n${requestText(r, true)}`;
  await Promise.all((await staffChats()).map(({ tg: chatId }) => tg("sendMessage", {
    chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true, reply_markup: requestModButtons(id),
  })));
}

export const requestModButtons = (id: number) => ({
  inline_keyboard: [
    [{ text: "🏢 Adverto oladi", callback_data: `rq:v:${id}` }, { text: "👥 Mutaxassislarga", callback_data: `rq:p:${id}` }],
    [{ text: "✕ Rad etish", callback_data: `rq:r:${id}` }],
  ],
});
export const requestReasonButtons = (id: number) => ({
  inline_keyboard: [
    ...REQUEST_REJECT_REASONS.map((t, i) => [{ text: t, callback_data: `rq:x:${id}:${i}` }]),
    [{ text: "← Orqaga", callback_data: `rq:b:${id}` }],
  ],
});

/** Kasblarni tanlash tugmalari: bir nechtasini belgilab, "Yuborish" bosiladi. */
export async function requestProfessionButtons(id: number) {
  const db = await getDb();
  const [r] = await db.select({ ids: s.requests.professionIds }).from(s.requests).where(eq(s.requests.id, id));
  const profs = await db.select({ id: s.professions.id, nameUz: s.professions.nameUz }).from(s.professions)
    .where(eq(s.professions.isActive, true)).orderBy(asc(s.professions.sortOrder));
  const picked = new Set(r?.ids ?? []);
  const btns = profs.map((p) => ({ text: `${picked.has(p.id) ? "✅" : "▫️"} ${p.nameUz}`, callback_data: `rq:t:${id}:${p.id}` }));
  const rows: (typeof btns)[] = [];
  for (let i = 0; i < btns.length; i += 2) rows.push(btns.slice(i, i + 2));
  return {
    inline_keyboard: [...rows, [{ text: "← Orqaga", callback_data: `rq:b:${id}` }, { text: `📤 Yuborish (${picked.size})`, callback_data: `rq:s:${id}` }]],
  };
}

/** Kasbni tanlash/olib tashlash (faqat tekshiruvdagi so'rovda). */
export async function toggleRequestProfession(id: number, professionId: number) {
  const db = await getDb();
  await db.update(s.requests).set({
    professionIds: sql`case when ${professionId} = any(${s.requests.professionIds})
      then array_remove(${s.requests.professionIds}, ${professionId}) else array_append(${s.requests.professionIds}, ${professionId}) end`,
  }).where(and(eq(s.requests.id, id), eq(s.requests.status, "pending")));
}

/** So'rovni Adverto o'zi oladi: mutaxassislarga yuborilmaydi. */
export async function takeByAdverto(id: number) {
  const db = await getDb();
  const [r] = await db.update(s.requests).set({ status: "adverto", approvedAt: new Date(), closedAt: new Date() })
    .where(and(eq(s.requests.id, id), eq(s.requests.status, "pending"))).returning();
  if (r?.userId) await notifyUser(r.userId, "✓ So‘rovingiz qabul qilindi. Adverto jamoasi tez orada siz bilan bog‘lanadi.");
  return !!r;
}

/**
 * Tasdiqlash: so'rov ochiladi va tanlangan kasblardagi mos mutaxassislarga botda (aloqa raqami bilan) yuboriladi.
 * Nechta mutaxassisga yetgani qaytadi; kasb tanlanmagan bo'lsa null.
 */
export async function approveRequest(id: number): Promise<number | null> {
  const db = await getDb();
  const [cur] = await db.select().from(s.requests).where(eq(s.requests.id, id));
  if (!cur || cur.status !== "pending") return 0;
  const ids = cur.professionIds.length ? cur.professionIds : cur.professionId ? [cur.professionId] : [];
  if (!ids.length) return null;
  const [r0] = await db.update(s.requests).set({ status: "open", professionIds: ids, approvedAt: new Date(), expiresAt: new Date(Date.now() + REQUEST_DAYS * 86_400_000) })
    .where(and(eq(s.requests.id, id), eq(s.requests.status, "pending"))).returning();
  if (!r0) return 0;
  const r = (await getRequest(id))!;
  // Kasbi (asosiy yoki qo'shimcha) mos, tanlangan tumanda (masofaviy yoki butun Xorazm — hamma), Telegram'i ulangan, band emas
  const inDistrict = r.districtId
    ? sql`exists (select 1 from ${s.profileDistricts} pd where pd.profile_id = ${sql.raw(`"profiles"."id"`)} and pd.district_id = ${r.districtId})`
    : sql`true`;
  const targets = await db.selectDistinct({ tg: s.users.telegramId }).from(s.profiles)
    .innerJoin(s.users, eq(s.users.id, s.profiles.userId))
    .where(and(
      eq(s.profiles.status, "approved"), eq(s.profiles.isAvailable, true), isNotNull(s.users.telegramId),
      or(inArray(s.profiles.professionId, ids), inArray(s.profiles.extraProfessionId, ids)), inDistrict,
    )).limit(500);
  let sent = 0;
  for (const t of targets) {
    if (!t.tg) continue;
    const ok = await send(t.tg, `🆕 <b>Yangi so‘rov — mijoz mutaxassis qidiryapti</b>\n\n${requestText(r, true)}\n\nO‘zingiz qo‘ng‘iroq qiling yoki “Qiziqaman” bosing.`, {
      parse_mode: "HTML", reply_markup: { inline_keyboard: [[appBtn("👋 Qiziqaman / batafsil", `/sorovlar/${id}`)]] },
    });
    if (ok) sent++;
  }
  await db.update(s.requests).set({ notifiedCount: sent }).where(eq(s.requests.id, id));
  if (r.userId) await notifyUser(r.userId, `✓ So‘rovingiz ${sent} ta mos mutaxassisga yuborildi. Ular tez orada siz bilan bog‘lanadi.\n\n${SITE.url}/sorovlar/${id}`);
  return sent;
}

export async function rejectRequest(id: number, reason: string) {
  const db = await getDb();
  const [r] = await db.update(s.requests).set({ status: "rejected", rejectReason: reason })
    .where(and(eq(s.requests.id, id), eq(s.requests.status, "pending"))).returning();
  if (r?.userId) await notifyUser(r.userId, `So‘rovingiz e’lon qilinmadi: ${reason}.\n\nTuzatib, qayta yuborishingiz mumkin: ${SITE.url}/sorov`);
  return !!r;
}

/** Mutaxassisning "Qiziqaman" javobi: so'rov egasiga (Telegram'i bo'lsa) profil havolasi bilan xabar boradi. */
export async function respondToRequest(requestId: number, profile: { id: number; fullName: string; slug: string; professionId: number })
  : Promise<{ ok: true; first: boolean } | { ok: false; error: string }> {
  const db = await getDb();
  const r = await getRequest(requestId);
  if (!r || r.status !== "open") return { ok: false, error: "So‘rov yopilgan" };
  const [row] = await db.insert(s.requestResponses).values({ requestId, profileId: profile.id }).onConflictDoNothing().returning();
  if (!row) return { ok: true, first: false };
  const [p] = await db.select({ name: s.professions.nameUz }).from(s.professions).where(eq(s.professions.id, profile.professionId));
  const [owner] = r.userId ? await db.select({ tg: s.users.telegramId }).from(s.users).where(eq(s.users.id, r.userId)) : [];
  if (owner?.tg) {
    await send(owner.tg, `👋 <b>${esc(profile.fullName)}</b> (${esc(p?.name ?? "")}) so‘rovingizga qiziqdi:\n«${esc(r.title)}»\n\nPortfolio va kontaktlarini ko‘ring:`, {
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
