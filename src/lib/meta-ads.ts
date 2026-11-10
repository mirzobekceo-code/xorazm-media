import "server-only";

import { getToken, GRAPH as BASE, META_VERSION as VERSION } from "./meta-token";

/**
 * Meta (Facebook) Marketing API — faqat O'QISH. Claude connector (/api/mcp/[key]) shu funksiyalarni chaqiradi.
 * Bu faylda faqat GET so'rovlari bor: reklama, budjet yoki akkauntni o'zgartiradigan kod yo'q va bo'lmasligi kerak.
 * Token: meta-token.ts ("Facebook orqali ulash" yoki META_ACCESS_TOKEN). META_GRAPH_URL — faqat sinov uchun.
 */

export class MetaError extends Error {
  constructor(message: string, readonly code?: number) { super(message); }
  /** Meta so'rovlar limiti (keyinroq qayta urinish kerak) */
  get rateLimited() { return this.code !== undefined && RATE_CODES.has(this.code); }
}
const RATE_CODES = new Set([4, 17, 32, 613, 80000, 80003, 80004, 80005, 80006, 80008]);

/** Meta xato kodlari → tushunarli o'zbekcha sabab */
function explain(code: number | undefined, message: string): string {
  if (code === 190) return "Meta ulanishi eskirgan yoki bekor qilingan. connection_status asbobidagi havola orqali Facebook bilan qayta ulaning.";
  if (code === 10 || code === 200 || code === 294) return "Bu ma'lumot uchun ruxsat yo'q: ulangan Facebook profilida shu reklama akkauntiga kirish huquqi yo'q yoki ulashda ads_read ruxsati berilmagan.";
  if (code === 2635) return "Meta API versiyasi eskirgan. Vercel'da META_API_VERSION ni yangi versiyaga (masalan v24.0) o'zgartiring.";
  if (code === 100) return `Noto'g'ri so'rov: ${message}`;
  if (code !== undefined && RATE_CODES.has(code)) return `Meta so'rovlar limiti tugadi (kod ${code}). Taxminan 15–60 daqiqadan keyin qayta so'rang.`;
  return `Meta xatosi${code ? ` (${code})` : ""}: ${message}`;
}

type Paged<T> = { data?: T[]; paging?: { next?: string } };

/** Graph API GET. Sahifali javoblarda barcha sahifalarni yig'adi (maxItems gacha). */
async function graph<T>(path: string, params: Record<string, string>, opts: { all?: boolean; maxItems?: number } = {}): Promise<T> {
  const token = (await getToken())?.token;
  if (!token) throw new MetaError("Meta hali ulanmagan. connection_status asbobidagi havola orqali Facebook bilan ulaning.");
  const url = new URL(`${BASE()}/${VERSION()}/${path.replace(/^\//, "")}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const items: unknown[] = [];
  let next: string | undefined = url.toString();
  let first: unknown;
  while (next) {
    const res: Response = await fetch(next, { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20_000), cache: "no-store" });
    const json = (await res.json().catch(() => null)) as (Paged<unknown> & { error?: { code?: number; message?: string } }) | null;
    if (!res.ok || !json || json.error) throw new MetaError(explain(json?.error?.code, json?.error?.message ?? `HTTP ${res.status}`), json?.error?.code);
    if (!opts.all) return json as T;
    first ??= json;
    items.push(...(json.data ?? []));
    next = items.length < (opts.maxItems ?? 1000) ? json.paging?.next : undefined;
  }
  return { ...(first as object), data: items } as T;
}

// ---- Holat kodlari (Meta hujjatlari bo'yicha) ----

export const ACCOUNT_STATUS: Record<number, string> = {
  1: "Faol",
  2: "O'chirilgan (bloklangan)",
  3: "To'lanmagan qarz bor",
  7: "Xavfsizlik tekshiruvida",
  8: "To'lov kutilmoqda",
  9: "Imtiyozli davr (to'lov muddati o'tgan)",
  100: "Yopilish arafasida",
  101: "Yopilgan",
  201: "Faol (har qanday)",
  202: "Yopilgan (har qanday)",
};

export const DISABLE_REASON: Record<number, string> = {
  0: "Sabab yo'q",
  1: "Reklama qoidalari buzilgan (Ads Integrity)",
  2: "Intellektual mulk tekshiruvi",
  3: "To'lov xavfi (Risk payment)",
  4: "Shubhali akkaunt sifatida yopilgan",
  5: "Qo'shimcha tekshiruv (AFC review)",
  6: "Biznes yaxlitligi tekshiruvi",
  7: "Butunlay yopilgan",
  8: "Foydalanilmagan reseller akkaunt",
  9: "Foydalanilmagan akkaunt",
};

/** Meta pul summalarini "eng kichik birlik"da beradi (sent). Bu valyutalarda kasr yo'q. */
const NO_MINOR_UNITS = new Set(["CLP", "COP", "CRC", "HUF", "ISK", "IDR", "JPY", "KRW", "PYG", "TWD", "VND"]);
export function money(minor: string | number | undefined | null, currency: string): number | null {
  if (minor === undefined || minor === null || minor === "") return null;
  const n = Number(minor);
  if (!Number.isFinite(n)) return null;
  return NO_MINOR_UNITS.has(currency) ? n : Math.round(n) / 100;
}

const ACT = (id: string) => {
  const clean = String(id).trim().replace(/^act_/, "");
  if (!/^\d{1,25}$/.test(clean)) throw new MetaError(`Noto'g'ri reklama akkaunt ID: "${id}". Masalan: act_1234567890 yoki 1234567890.`);
  return `act_${clean}`;
};

/** Natijalar: lid, xabar yozishmalar, xaridlar — "actions" ro'yxatidan asosiylari */
const RESULT_ACTIONS: Record<string, string> = {
  lead: "lidlar",
  "onsite_conversion.lead_grouped": "lidlar (forma)",
  "onsite_conversion.messaging_conversation_started_7d": "yozishmalar boshlandi",
  purchase: "xaridlar",
  link_click: "havola kliklari",
  video_view: "video ko'rishlar",
  post_engagement: "post faolligi",
};
function results(actions?: { action_type: string; value: string }[]) {
  const out: Record<string, number> = {};
  for (const a of actions ?? []) if (RESULT_ACTIONS[a.action_type]) out[RESULT_ACTIONS[a.action_type]] = Number(a.value);
  return out;
}

export const DATE_PRESETS = ["today", "yesterday", "last_7d", "last_14d", "last_30d", "this_month", "last_month", "maximum"] as const;
export type DatePreset = (typeof DATE_PRESETS)[number];
const preset = (p?: string): DatePreset => (DATE_PRESETS as readonly string[]).includes(p ?? "") ? (p as DatePreset) : "last_7d";

// ---- Asboblar (tools) ----

type RawAccount = {
  id: string; account_id: string; name: string; account_status: number; disable_reason?: number; currency: string;
  balance?: string; amount_spent?: string; spend_cap?: string; business?: { name: string }; timezone_name?: string;
  insights?: { data?: { spend?: string; impressions?: string }[] };
};

function account(a: RawAccount) {
  const cap = money(a.spend_cap, a.currency);
  const spent = money(a.amount_spent, a.currency);
  return {
    id: a.id,
    name: a.name,
    biznes: a.business?.name ?? null,
    holat: ACCOUNT_STATUS[a.account_status] ?? `Noma'lum (${a.account_status})`,
    holat_kodi: a.account_status,
    bloklanish_sababi: a.disable_reason ? (DISABLE_REASON[a.disable_reason] ?? `Kod ${a.disable_reason}`) : null,
    valyuta: a.currency,
    // balance — keyingi hisobda to'lanadigan summa; kartali akkauntda bu odatiy holat, qarz emas (haqiqiy qarz — holat kodi 3)
    tolanadigan_summa: money(a.balance, a.currency),
    jami_sarflangan: spent,
    sarf_limiti: cap || null,
    limitgacha_qoldi: cap ? Math.round((cap - (spent ?? 0)) * 100) / 100 : null,
    limit_tugayapti: cap ? (cap - (spent ?? 0)) <= cap * 0.1 : false,
    davr_sarfi: (a.insights?.data?.[0]?.spend !== undefined ? Number(a.insights.data[0].spend) : 0) as number | null,
  };
}

const ACCOUNT_FIELDS = "id,account_id,name,account_status,disable_reason,currency,balance,amount_spent,spend_cap,business{name},timezone_name";

/**
 * Ulangan profil ko'radigan BARCHA reklama akkauntlari: o'ziga biriktirilganlari (me/adaccounts) va
 * admin bo'lgan har bir biznes portfelining o'z va mijoz akkauntlari. Yangi ochilgan akkauntlar ham shu yerda o'zi chiqadi.
 * Biror portfelga ruxsat bo'lmasa, u o'tkazib yuboriladi (xato butun ro'yxatni to'xtatmaydi).
 */
const accountCache = new Map<string, { at: number; value: { rows: unknown[]; skipped: string[] } }>();
async function allAccounts<T extends { id: string }>(fields: string): Promise<{ rows: T[]; skipped: string[] }> {
  // Bir suhbatda ketma-ket savollar Meta limitini yemasligi uchun ro'yxat 2 daqiqa eslab qolinadi
  const hit = accountCache.get(fields);
  if (hit && Date.now() - hit.at < 120_000) return hit.value as { rows: T[]; skipped: string[] };
  const value = await scanAccounts<T>(fields);
  accountCache.set(fields, { at: Date.now(), value });
  return value;
}
async function scanAccounts<T extends { id: string }>(fields: string): Promise<{ rows: T[]; skipped: string[] }> {
  const byId = new Map<string, T>();
  const skipped: string[] = [];
  const add = (list: T[]) => { for (const a of list) if (!byId.has(a.id)) byId.set(a.id, a); };
  add((await graph<{ data: T[] }>("me/adaccounts", { fields, limit: "100" }, { all: true, maxItems: 1000 })).data);
  let businesses: { id: string; name: string }[] = [];
  try {
    businesses = (await graph<{ data: { id: string; name: string }[] }>("me/businesses", { fields: "id,name", limit: "100" }, { all: true, maxItems: 200 })).data;
  } catch {
    skipped.push("Biznes portfellar ro'yxati (business_management ruxsati berilmagan bo'lishi mumkin)");
  }
  for (let i = 0; i < businesses.length; i += 5) {
    await Promise.all(businesses.slice(i, i + 5).flatMap((b) => ["owned_ad_accounts", "client_ad_accounts"].map(async (edge) => {
      try {
        add((await graph<{ data: T[] }>(`${b.id}/${edge}`, { fields, limit: "100" }, { all: true, maxItems: 1000 })).data);
      } catch {
        if (edge === "owned_ad_accounts") skipped.push(b.name);
      }
    })));
  }
  return { rows: [...byId.values()], skipped };
}

/** Barcha reklama akkauntlari: holat, bloklanish sababi, qarz, limit va tanlangan davrdagi sarf. */
/**
 * Faol akkauntlar sarfini alohida, 3 tadan so'raydi. Statistika so'rovlari Meta'da eng "qimmat" —
 * ro'yxat bilan birga so'ralsa limit tez tugaydi. Limit chiqsa, qolganlari so'ralmaydi (null), ro'yxat baribir qaytadi.
 */
async function spendFor(ids: string[], p: DatePreset, fields = "spend") {
  const out = new Map<string, InsightRow | null>();
  let limited = false;
  for (let i = 0; i < ids.length && !limited; i += 3) {
    await Promise.all(ids.slice(i, i + 3).map(async (id) => {
      try {
        const r = await graph<{ data: InsightRow[] }>(`${id}/insights`, { date_preset: p, fields });
        out.set(id, r.data[0] ?? null);
      } catch (e) {
        if (e instanceof MetaError && e.rateLimited) limited = true;
      }
    }));
  }
  return { out, limited };
}

export async function listAdAccounts(input: { date_preset?: string; search?: string; only_problems?: boolean }) {
  const p = preset(input.date_preset);
  const res = await allAccounts<RawAccount>(ACCOUNT_FIELDS);
  let rows = res.rows.map(account);
  if (input.search) {
    const q = input.search.toLowerCase();
    rows = rows.filter((r) => r.name.toLowerCase().includes(q) || r.id.includes(q) || (r.biznes ?? "").toLowerCase().includes(q));
  }
  // Muammo: akkaunt faol emas yoki sarf limitining 10% dan kami qolgan
  const problem = (r: ReturnType<typeof account>) => r.holat_kodi !== 1 || r.limit_tugayapti;
  if (input.only_problems) rows = rows.filter(problem);
  const spend = await spendFor(rows.filter((r) => r.holat_kodi === 1 || r.holat_kodi === 9).map((r) => r.id), p);
  const withSpend = rows.map((r) => ({ ...r, davr_sarfi: spend.out.has(r.id) ? Number(spend.out.get(r.id)?.spend ?? 0) : r.holat_kodi === 1 || r.holat_kodi === 9 ? null : 0 }));
  // Avval muammolilar, keyin ko'p sarflaganlar
  withSpend.sort((a, b) => Number(problem(b)) - Number(problem(a)) || (b.davr_sarfi ?? -1) - (a.davr_sarfi ?? -1));
  rows = withSpend;
  return {
    davr: p,
    jami_akkauntlar: rows.length,
    faol: rows.filter((r) => r.holat_kodi === 1).length,
    muammoli: rows.filter(problem).length,
    akkauntlar: rows,
    ...(res.skipped.length ? { korilmagan_portfellar: res.skipped } : {}),
    ...(spend.limited ? { eslatma: "Meta statistika limiti tufayli ba'zi akkauntlar sarfi olinmadi (davr_sarfi: null). Holatlar to'liq; sarfni keyinroq spend_report bilan so'rang." } : {}),
  };
}

/** Bitta akkaunt: to'liq holat + davr bo'yicha natijalar. */
export async function accountDetails(input: { account_id: string; date_preset?: string }) {
  const id = ACT(input.account_id);
  const p = preset(input.date_preset);
  const [a, ins] = await Promise.all([
    graph<RawAccount>(id, { fields: ACCOUNT_FIELDS }),
    graph<{ data: InsightRow[] }>(`${id}/insights`, { date_preset: p, fields: INSIGHT_FIELDS }),
  ]);
  const natijalar = ins.data[0] ? insight(ins.data[0], a.currency) : null;
  return { ...account(a), davr_sarfi: natijalar?.sarf ?? 0, vaqt_zonasi: a.timezone_name ?? null, davr: p, natijalar };
}

type RawCampaign = {
  id: string; name: string; effective_status: string; status: string; objective?: string;
  daily_budget?: string; lifetime_budget?: string; budget_remaining?: string; issues_info?: { error_message?: string; level?: string }[];
  insights?: { data?: InsightRow[] };
};

export const EFFECTIVE_STATUS: Record<string, string> = {
  ACTIVE: "Faol", PAUSED: "To'xtatilgan", DELETED: "O'chirilgan", ARCHIVED: "Arxivda", IN_PROCESS: "Jarayonda",
  WITH_ISSUES: "Muammo bor", PENDING_REVIEW: "Tekshiruvda", DISAPPROVED: "Rad etilgan", PREAPPROVED: "Oldindan tasdiqlangan",
  PENDING_BILLING_INFO: "To'lov ma'lumoti kutilmoqda", CAMPAIGN_PAUSED: "Kampaniya to'xtatilgan", ADSET_PAUSED: "Ad set to'xtatilgan",
};
const st = (s: string) => EFFECTIVE_STATUS[s] ?? s;

/** Akkauntdagi kampaniyalar: holati, budjeti, muammolari va davr natijalari. */
export async function listCampaigns(input: { account_id: string; date_preset?: string; only_active?: boolean }) {
  const id = ACT(input.account_id);
  const p = preset(input.date_preset);
  const a = await graph<{ currency: string; name: string }>(id, { fields: "currency,name" });
  const params: Record<string, string> = {
    fields: `id,name,effective_status,status,objective,daily_budget,lifetime_budget,budget_remaining,issues_info,insights.date_preset(${p}){${INSIGHT_FIELDS}}`,
    limit: "100",
  };
  if (input.only_active) params.effective_status = JSON.stringify(["ACTIVE", "WITH_ISSUES", "PENDING_REVIEW", "IN_PROCESS"]);
  const res = await graph<{ data: RawCampaign[] }>(`${id}/campaigns`, params, { all: true, maxItems: 300 });
  return {
    akkaunt: a.name, davr: p,
    kampaniyalar: res.data.map((c) => ({
      id: c.id, name: c.name, holat: st(c.effective_status), maqsad: c.objective ?? null,
      kunlik_budjet: money(c.daily_budget, a.currency), umumiy_budjet: money(c.lifetime_budget, a.currency),
      qolgan_budjet: money(c.budget_remaining, a.currency),
      muammolar: (c.issues_info ?? []).map((i) => i.error_message).filter(Boolean),
      natijalar: c.insights?.data?.[0] ? insight(c.insights.data[0], a.currency) : null,
    })),
  };
}

type RawAd = {
  id: string; name: string; effective_status: string; campaign?: { name: string }; adset?: { name: string };
  ad_review_feedback?: { global?: Record<string, string> }; issues_info?: { error_message?: string }[];
};

/** Rad etilgan, muammoli va tekshiruvdagi reklamalar (bitta akkaunt yoki hammasi). */
export async function problemAds(input: { account_id?: string }) {
  const ids = input.account_id ? [ACT(input.account_id)] : (await allAccounts<RawAccount>(ACCOUNT_FIELDS)).rows.filter((x) => x.account_status === 1).map((x) => x.id);
  let limited = false;
  const filtering = JSON.stringify([{ field: "effective_status", operator: "IN", value: ["DISAPPROVED", "WITH_ISSUES", "PENDING_REVIEW"] }]);
  const out: { akkaunt: string; reklama: string; holat: string; kampaniya: string | null; sabab: string[] }[] = [];
  const errors: string[] = [];
  // Bir vaqtda 5 tadan — Meta limitlariga tushmaslik uchun
  for (let i = 0; i < ids.length && !limited; i += 3) {
    await Promise.all(ids.slice(i, i + 3).map(async (id) => {
      try {
        const res = await graph<{ data: (RawAd & { account_id?: string })[] }>(`${id}/ads`, {
          fields: "id,name,effective_status,campaign{name},adset{name},ad_review_feedback,issues_info", filtering, limit: "100",
        }, { all: true, maxItems: 200 });
        for (const ad of res.data) {
          const reasons = [...Object.values(ad.ad_review_feedback?.global ?? {}), ...(ad.issues_info ?? []).map((x) => x.error_message ?? "")].filter(Boolean);
          out.push({ akkaunt: id, reklama: ad.name, holat: st(ad.effective_status), kampaniya: ad.campaign?.name ?? null, sabab: reasons });
        }
      } catch (e) {
        if (e instanceof MetaError && e.rateLimited) limited = true;
        else errors.push(`${id}: ${(e as Error).message}`);
      }
    }));
  }
  return {
    tekshirilgan_akkauntlar: ids.length, topildi: out.length, reklamalar: out, xatolar: errors,
    ...(limited ? { eslatma: "Meta limiti tufayli hamma akkaunt tekshirilmadi — keyinroq qayta so'rang yoki account_id bilan bittasini tekshiring." } : {}),
  };
}

type InsightRow = {
  spend?: string; impressions?: string; reach?: string; clicks?: string; ctr?: string; cpc?: string; cpm?: string;
  frequency?: string; actions?: { action_type: string; value: string }[]; date_start?: string; date_stop?: string;
  campaign_name?: string; account_name?: string; account_currency?: string;
};
const INSIGHT_FIELDS = "spend,impressions,reach,clicks,ctr,cpc,cpm,frequency,actions,date_start,date_stop";
const num = (v?: string) => (v === undefined ? null : Math.round(Number(v) * 100) / 100);
function insight(r: InsightRow, currency?: string) {
  return {
    davr: r.date_start && r.date_stop ? `${r.date_start} — ${r.date_stop}` : null,
    valyuta: currency ?? r.account_currency ?? null,
    sarf: num(r.spend) ?? 0, korishlar: num(r.impressions), qamrov: num(r.reach), kliklar: num(r.clicks),
    ctr_foiz: num(r.ctr), cpc: num(r.cpc), cpm: num(r.cpm), chastota: num(r.frequency),
    natijalar: results(r.actions),
  };
}

/** Sarf va natijalar: bitta akkaunt bo'yicha (kampaniyalarga bo'lib) yoki barcha akkauntlar bo'yicha. */
export async function spendReport(input: { account_id?: string; date_preset?: string; by_campaign?: boolean }) {
  const p = preset(input.date_preset);
  if (input.account_id) {
    const id = ACT(input.account_id);
    const res = await graph<{ data: InsightRow[] }>(`${id}/insights`, {
      date_preset: p, fields: `${INSIGHT_FIELDS},account_name,account_currency${input.by_campaign ? ",campaign_name" : ""}`,
      ...(input.by_campaign ? { level: "campaign", limit: "200" } : {}),
    }, { all: true, maxItems: 300 });
    return { davr: p, akkaunt: id, qatorlar: res.data.map((r) => ({ ...(r.campaign_name ? { kampaniya: r.campaign_name } : {}), ...insight(r) })) };
  }
  const res = await allAccounts<RawAccount>(ACCOUNT_FIELDS);
  const active = res.rows.filter((a) => a.account_status === 1 || a.account_status === 9);
  const spend = await spendFor(active.map((a) => a.id), p, INSIGHT_FIELDS);
  const rows = active.filter((a) => spend.out.get(a.id)).map((a) => ({ akkaunt: a.name, id: a.id, ...insight(spend.out.get(a.id)!, a.currency) }))
    .sort((a, b) => b.sarf - a.sarf);
  return {
    davr: p, sarf_qilgan_akkauntlar: rows.length, qatorlar: rows,
    ...(spend.limited ? { eslatma: `Meta statistika limiti tufayli ${active.length - spend.out.size} ta akkaunt sarfi olinmadi — keyinroq qayta so'rang.` } : {}),
  };
}
