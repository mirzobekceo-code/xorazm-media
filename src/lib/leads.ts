import "server-only";
import { and, asc, desc, eq, gt, isNotNull } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { prettyPhone } from "./format";
import { SITE } from "./site";
import { send, tgDocument } from "./telegram";

/**
 * Lidlar: biznes egasi mutaxassis kontaktini ochdi yoki portfolio sahifasidan buyurtma qoldirdi.
 * Kim, qaysi xizmat, qaysi mutaxassis — haftalik hisobot (Google Sheets) va Adverto takliflari uchun.
 */

/** Kontakt ochilishi: bir foydalanuvchi + profil uchun kuniga bir marta yoziladi. Profil egasi va xodimlar hisoblanmaydi. */
export async function recordContactLead(user: { id: number; role: string; phone: string; telegramUsername: string | null }, profileId: number, source: string | null) {
  if (user.role !== "specialist") return;
  const db = await getDb();
  const [own] = await db.select({ id: s.profiles.id }).from(s.profiles).where(and(eq(s.profiles.id, profileId), eq(s.profiles.userId, user.id)));
  if (own) return;
  const [dup] = await db.select({ id: s.leads.id }).from(s.leads).where(and(
    eq(s.leads.kind, "contact"), eq(s.leads.userId, user.id), eq(s.leads.profileId, profileId),
    gt(s.leads.createdAt, new Date(Date.now() - 86_400_000)),
  )).limit(1);
  if (dup) return;
  await db.insert(s.leads).values({
    kind: "contact", userId: user.id, profileId, phone: user.phone, telegramUsername: user.telegramUsername, source: source?.slice(0, 60) || null,
  });
}

/** Portfolio sahifasidagi "Buyurtma berish": mutaxassisga botda, Google Sheets'ga darhol. */
export async function createOrderLead(profileId: number, input: { name: string; phone: string; message: string; source: string }) {
  const db = await getDb();
  const [p] = await db.select({ id: s.profiles.id, name: s.profiles.fullName, slug: s.profiles.slug, userId: s.profiles.userId, prof: s.professions.nameUz })
    .from(s.profiles).innerJoin(s.professions, eq(s.professions.id, s.profiles.professionId))
    .where(and(eq(s.profiles.id, profileId), eq(s.profiles.status, "approved"))).limit(1);
  if (!p) return false;
  const [row] = await db.insert(s.leads).values({ kind: "order", profileId, name: input.name, phone: input.phone, message: input.message || null, source: input.source }).returning();
  const [owner] = await db.select({ tg: s.users.telegramId }).from(s.users).where(eq(s.users.id, p.userId));
  if (owner?.tg) {
    await send(owner.tg, [
      "🔔 <b>Yangi buyurtma — portfolio sahifangizdan</b>", "",
      `👤 ${esc(input.name)}`, `📞 ${prettyPhone(input.phone)}`, ...(input.message ? ["", esc(input.message)] : []), "",
      "Mijozga tezroq qo‘ng‘iroq qiling — birinchi javob bergan mutaxassis ko‘pincha buyurtmani oladi.",
    ].join("\n"), { parse_mode: "HTML" }).catch(() => false);
  }
  await pushToSheets("order", [orderRow({ ...row, specialist: p.name, slug: p.slug, profession: p.prof })]).catch((e) => console.error("sheets", e));
  return true;
}

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const tz = (d: Date) => new Date(d.getTime() + 5 * 3_600_000).toISOString().slice(0, 16).replace("T", " ");

export const SHEET_HEADER = ["Sana", "Turi", "Telegram", "Telefon", "Ism", "Xizmat", "Mutaxassis", "Profil", "Manba", "Izoh"];
type Row = (string | number)[];

function orderRow(l: { createdAt: Date; name: string | null; phone: string | null; message: string | null; source: string | null; specialist: string; slug: string; profession: string }): Row {
  return [tz(l.createdAt), "Buyurtma", "", l.phone ? prettyPhone(l.phone) : "", l.name ?? "", l.profession, l.specialist, `${SITE.url}/m/${l.slug}`, l.source ?? "", l.message ?? ""];
}

/** Oxirgi 7 kunning lidlari va so'rovlari — hisobot qatorlari. */
export async function weeklyRows(days = 7): Promise<Row[]> {
  const db = await getDb();
  const since = new Date(Date.now() - days * 86_400_000);
  const leads = await db.select({
    l: s.leads, specialist: s.profiles.fullName, slug: s.profiles.slug, profession: s.professions.nameUz, tgUser: s.users.telegramUsername,
  }).from(s.leads)
    .innerJoin(s.profiles, eq(s.profiles.id, s.leads.profileId))
    .innerJoin(s.professions, eq(s.professions.id, s.profiles.professionId))
    .leftJoin(s.users, eq(s.users.id, s.leads.userId))
    .where(gt(s.leads.createdAt, since)).orderBy(asc(s.leads.createdAt));
  const reqs = await db.select({ r: s.requests, tgUser: s.users.telegramUsername }).from(s.requests)
    .leftJoin(s.users, eq(s.users.id, s.requests.userId))
    .where(gt(s.requests.createdAt, since)).orderBy(asc(s.requests.createdAt));
  const profs = await db.select({ id: s.professions.id, nameUz: s.professions.nameUz }).from(s.professions);
  const at = (u: string | null | undefined) => (u ? `@${u}` : "");
  return [
    ...leads.map(({ l, specialist, slug, profession, tgUser }) => l.kind === "order"
      ? orderRow({ ...l, specialist, slug, profession })
      : [tz(l.createdAt), "Kontakt ochdi", at(l.telegramUsername ?? tgUser), l.phone ? prettyPhone(l.phone) : "", "", profession, specialist, `${SITE.url}/m/${slug}`, l.source ?? "", ""]),
    ...reqs.map(({ r, tgUser }) => [
      tz(r.createdAt), "So‘rov", at(tgUser), prettyPhone(r.contactPhone), r.businessName ?? "",
      r.professionIds.map((id) => profs.find((p) => p.id === id)?.nameUz).filter(Boolean).join(", "), r.status === "adverto" ? "Adverto" : "",
      `${SITE.url}/sorovlar/${r.id}`, r.budgetLabel ?? "", r.description.slice(0, 300),
    ]),
  ];
}

/**
 * Google Sheets: Apps Script veb-ilovasi (docs/google-sheets-webhook.gs) qatorlarni jadvalga qo'shadi.
 * GOOGLE_SHEETS_WEBHOOK_URL bo'lmasa — jim o'tkaziladi.
 */
export async function pushToSheets(sheet: "weekly" | "order", rows: Row[]): Promise<boolean> {
  const url = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  if (!url || !rows.length) return false;
  const res = await fetch(url, {
    method: "POST", headers: { "content-type": "application/json" }, redirect: "follow",
    body: JSON.stringify({ secret: process.env.GOOGLE_SHEETS_SECRET ?? "", sheet, header: SHEET_HEADER, rows }),
  });
  // Apps Script maxfiy so'z noto'g'ri bo'lsa ham 200 qaytaradi — javob matniga qaraymiz
  const json = (await res.json().catch(() => null)) as { ok?: boolean } | null;
  return res.ok && json?.ok === true;
}

const csv = (rows: Row[]) => [SHEET_HEADER, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");

/** Har shanba 20:00: haftalik hisobot Google Sheets'ga va adminlarga Telegram'da (CSV). */
export async function sendWeeklyLeadReport() {
  const rows = await weeklyRows(7);
  const sheets = await pushToSheets("weekly", rows).catch((e) => { console.error("sheets", e); return false; });
  const db = await getDb();
  const admins = await db.select({ tg: s.users.telegramId }).from(s.users).where(and(eq(s.users.role, "admin"), isNotNull(s.users.telegramId)));
  const count = (t: string) => rows.filter((r) => r[1] === t).length;
  const caption = `📊 Haftalik lidlar hisoboti\nKontakt ochganlar: ${count("Kontakt ochdi")} · Buyurtmalar: ${count("Buyurtma")} · So‘rovlar: ${count("So‘rov")}`
    + (sheets ? "\n✓ Google Sheets’ga yozildi" : "");
  const file = Buffer.from("﻿" + csv(rows), "utf8"); // BOM: Excel o'zbekcha harflarni to'g'ri ochadi
  const day = tz(new Date()).slice(0, 10);
  for (const a of admins) await tgDocument(a.tg!, file, `lidlar-${day}.csv`, caption);
  return { rows: rows.length, sheets, admins: admins.length };
}

/** Admin sahifasi uchun: oxirgi lidlar. */
export async function recentLeads(limit = 200) {
  const db = await getDb();
  return db.select({
    l: s.leads, specialist: s.profiles.fullName, slug: s.profiles.slug, profession: s.professions.nameUz, tgUser: s.users.telegramUsername,
  }).from(s.leads)
    .innerJoin(s.profiles, eq(s.profiles.id, s.leads.profileId))
    .innerJoin(s.professions, eq(s.professions.id, s.profiles.professionId))
    .leftJoin(s.users, eq(s.users.id, s.leads.userId))
    .orderBy(desc(s.leads.createdAt)).limit(limit);
}
