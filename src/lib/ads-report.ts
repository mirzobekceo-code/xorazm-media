/**
 * Telegram botdagi /reklama buyrug'i uchun matn: Meta reklama akkauntlari holati.
 * Sof funksiyalar (tarmoq va baza yo'q) — ma'lumotni meta-ads.ts dagi listAdAccounts beradi.
 */

export type ReportAccount = {
  id: string;
  name: string;
  biznes: string | null;
  holat: string;
  holat_kodi: number;
  bloklanish_sababi: string | null;
  valyuta: string;
  tolanadigan_summa: number | null;
  limit_tugayapti: boolean;
  limitgacha_qoldi: number | null;
  davr_sarfi: number | null;
};
export type ReportData = { davr: string; akkauntlar: ReportAccount[]; korilmagan_portfellar?: string[]; eslatma?: string };

export type ReportQuery = { datePreset: string; mode: "all" | "debt" | "search"; search?: string };

const PERIODS: Record<string, string> = {
  bugun: "today", kecha: "yesterday", hafta: "last_7d", "7": "last_7d", "14": "last_14d", "30": "last_30d", oy: "this_month",
};
const PERIOD_LABEL: Record<string, string> = {
  today: "bugun", yesterday: "kecha", last_7d: "oxirgi 7 kun", last_14d: "oxirgi 14 kun", last_30d: "oxirgi 30 kun",
  this_month: "shu oy", last_month: "o'tgan oy", maximum: "butun davr",
};

/** Oddiy matndagi savol ham buyruq sifatida qabul qilinadi: "reklama akkauntlarim holatini ko'rsat" */
export function isAdsQuestion(text: string): boolean {
  const t = text.toLowerCase();
  return /^\/reklama(@\w+)?(\s|$)/.test(t) || (/reklama|akkaunt/.test(t) && /holat|qarz|sarf|blok/.test(t));
}

/** "/reklama", "/reklama qarz", "/reklama bugun", "/reklama lamina", "/reklama qarz oy" */
export function parseAdsQuery(text: string): ReportQuery {
  const q: ReportQuery = { datePreset: "last_7d", mode: "all" };
  const cmd = text.trim().match(/^\/reklama(?:@\w+)?(?:\s+([\s\S]*))?$/i);
  if (!cmd) {
    // Erkin matn: faqat "qarz" so'zi ajratiladi, qolgani to'liq hisobot
    if (/qarz/i.test(text)) q.mode = "debt";
    return q;
  }
  const rest: string[] = [];
  for (const w of (cmd[1] ?? "").split(/\s+/).filter(Boolean)) {
    const lw = w.toLowerCase();
    if (PERIODS[lw]) q.datePreset = PERIODS[lw];
    else if (lw === "qarz" || lw === "muammo") q.mode = "debt";
    else rest.push(w);
  }
  if (rest.length) { q.mode = "search"; q.search = rest.join(" ").slice(0, 60); }
  return q;
}

const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** 1593.37 → "1 593,37" */
export function amount(n: number): string {
  const [int, frac] = Math.abs(n).toFixed(2).split(".");
  return `${n < 0 ? "-" : ""}${int.replace(/\B(?=(\d{3})+(?!\d))/g, " ")},${frac}`;
}
const sum = (n: number, cur: string) => `${amount(n)} ${cur}`;

/** Valyutalar bo'yicha jami: "1 810,80 USD + 250 000,00 UZS" */
function totals(rows: ReportAccount[], pick: (r: ReportAccount) => number | null): string {
  const by = new Map<string, number>();
  for (const r of rows) {
    const v = pick(r);
    if (v) by.set(r.valyuta, (by.get(r.valyuta) ?? 0) + v);
  }
  return [...by].map(([cur, v]) => sum(v, cur)).join(" + ") || "0";
}

const isProblem = (r: ReportAccount) => r.holat_kodi !== 1 || r.limit_tugayapti;
const owes = (r: ReportAccount) => r.holat_kodi === 3 || r.holat_kodi === 9;
const title = (r: ReportAccount) => `<b>${esc(r.name.trim())}</b>${r.biznes && r.biznes.trim() !== r.name.trim() ? ` (${esc(r.biznes.trim())})` : ""}`;

function problemLine(r: ReportAccount): string {
  const parts = [r.holat_kodi === 1 ? "Sarf limiti tugayapti" : r.holat + (r.bloklanish_sababi ? `: ${r.bloklanish_sababi}` : "")];
  if (owes(r) && r.tolanadigan_summa) parts.push(`to'lash kerak ${sum(r.tolanadigan_summa, r.valyuta)}`);
  if (r.limit_tugayapti && r.limitgacha_qoldi !== null) parts.push(`limitgacha ${sum(r.limitgacha_qoldi, r.valyuta)}`);
  if (r.davr_sarfi) parts.push(`sarf ${sum(r.davr_sarfi, r.valyuta)}`);
  return `- ${title(r)} — ${esc(parts.join(" · "))}`;
}

function detailLine(r: ReportAccount): string {
  const parts = [r.holat + (r.bloklanish_sababi ? `: ${r.bloklanish_sababi}` : "")];
  if (r.tolanadigan_summa) parts.push(`${owes(r) ? "to'lash kerak" : "joriy hisob"} ${sum(r.tolanadigan_summa, r.valyuta)}`);
  parts.push(r.davr_sarfi === null ? "sarf olinmadi" : `sarf ${sum(r.davr_sarfi, r.valyuta)}`);
  if (r.limitgacha_qoldi !== null) parts.push(`limitgacha ${sum(r.limitgacha_qoldi, r.valyuta)}`);
  return `- ${title(r)} — ${esc(parts.join(" · "))}\n  <code>${esc(r.id)}</code>`;
}

/** Hisobot matni (Telegram HTML). */
export function formatAdsReport(data: ReportData, q: ReportQuery): string {
  const all = data.akkauntlar;
  const period = PERIOD_LABEL[data.davr] ?? data.davr;
  const lines: string[] = [];

  if (q.mode === "search") {
    lines.push(`<b>Reklama akkauntlari</b> · "${esc(q.search ?? "")}" · ${period}`, "");
    if (!all.length) lines.push("Bunday akkaunt topilmadi. Nomi, ID yoki biznes nomi bo'yicha qidiring.");
    else lines.push(...all.map(detailLine));
  } else if (q.mode === "debt") {
    const debt = all.filter(owes);
    lines.push(`<b>Qarzdor akkauntlar</b> · ${debt.length} ta`, "");
    if (!debt.length) lines.push("To'lanmagan qarzi bor akkaunt yo'q.");
    else {
      lines.push(...[...debt].sort((a, b) => (b.tolanadigan_summa ?? 0) - (a.tolanadigan_summa ?? 0)).map(problemLine));
      lines.push("", `Jami to'lash kerak: ${totals(debt, (r) => r.tolanadigan_summa)}`);
    }
  } else {
    const problems = all.filter(isProblem);
    const active = all.filter((r) => r.holat_kodi === 1);
    const spending = active.filter((r) => r.davr_sarfi).sort((a, b) => (b.davr_sarfi ?? 0) - (a.davr_sarfi ?? 0));
    const debt = all.filter(owes);
    lines.push(
      `<b>Reklama akkauntlari</b> · ${period}`,
      `Jami ${all.length} · faol ${active.length} · muammoli ${problems.length}`,
      `Davr sarfi: ${totals(all, (r) => r.davr_sarfi)}`,
    );
    if (debt.length) lines.push(`To'lanmagan qarz: ${totals(debt, (r) => r.tolanadigan_summa)} (${debt.length} ta akkaunt)`);
    if (problems.length) lines.push("", `<b>Muammoli (${problems.length})</b>`, ...problems.map(problemLine));
    if (spending.length) lines.push("", "<b>Sarf bo'lgan faol akkauntlar</b>", ...spending.map((r) => `- ${title(r)} — ${sum(r.davr_sarfi!, r.valyuta)}`));
    const idle = active.filter((r) => r.davr_sarfi === 0 && !r.limit_tugayapti).length;
    if (idle) lines.push("", `Sarfsiz faol akkauntlar: ${idle} ta`);
    lines.push("", "Batafsil: /reklama qarz · /reklama bugun · /reklama <akkaunt nomi>".replace(/</g, "&lt;").replace(/>/g, "&gt;"));
  }

  if (data.eslatma) lines.push("", "Meta limiti tufayli ba'zi akkauntlar sarfi olinmadi. Holatlar to'liq.");
  if (data.korilmagan_portfellar?.length) lines.push("", `Ko'rib bo'lmagan biznes portfellar: ${data.korilmagan_portfellar.length} ta`);
  return lines.join("\n");
}

/** Telegram bitta xabarda 4096 belgidan ortiq qabul qilmaydi — qatorlar bo'yicha bo'linadi. */
export function splitMessage(text: string, max = 3900): string[] {
  const out: string[] = [];
  let cur = "";
  for (const line of text.split("\n")) {
    if (cur && cur.length + line.length + 1 > max) { out.push(cur); cur = ""; }
    cur = cur ? `${cur}\n${line}` : line.slice(0, max);
  }
  if (cur) out.push(cur);
  return out;
}
