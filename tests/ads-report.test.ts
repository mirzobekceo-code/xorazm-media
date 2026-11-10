import { test } from "node:test";
import assert from "node:assert/strict";
import { amount, formatAdsReport, isAdsQuestion, parseAdsQuery, splitMessage, type ReportAccount } from "../src/lib/ads-report";

const acc = (o: Partial<ReportAccount>): ReportAccount => ({
  id: "act_1", name: "A", biznes: null, holat: "Faol", holat_kodi: 1, bloklanish_sababi: null, valyuta: "USD",
  tolanadigan_summa: 0, limit_tugayapti: false, limitgacha_qoldi: null, davr_sarfi: 0, ...o,
});
const DATA = {
  davr: "last_7d",
  akkauntlar: [
    acc({ id: "act_2", name: "Akbar <b>", biznes: "repetitor", holat: "To'lanmagan qarz bor", holat_kodi: 3, tolanadigan_summa: 136.75, davr_sarfi: 210.19 }),
    acc({ id: "act_3", name: "Sarapalto", holat: "O'chirilgan (bloklangan)", holat_kodi: 2, bloklanish_sababi: "Reklama qoidalari buzilgan (Ads Integrity)", tolanadigan_summa: 0.03 }),
    acc({ id: "act_4", name: "Avtochexol", tolanadigan_summa: 237, davr_sarfi: 1593.37 }),
    acc({ id: "act_5", name: "Bo'sh" }),
  ],
};

test("summa formati", () => {
  assert.equal(amount(1593.37), "1 593,37");
  assert.equal(amount(0.5), "0,50");
  assert.equal(amount(1234567), "1 234 567,00");
});

test("buyruq va erkin matn taniladi", () => {
  assert.ok(isAdsQuestion("/reklama"));
  assert.ok(isAdsQuestion("/reklama qarz"));
  assert.ok(isAdsQuestion("Barcha reklama akkauntlarimning holatini ko'rsat"));
  assert.ok(!isAdsQuestion("/reklamalar"));
  assert.ok(!isAdsQuestion("Salom, reklama bermoqchiman"));
  assert.ok(!isAdsQuestion("/kabinet"));
});

test("buyruq parametrlari", () => {
  assert.deepEqual(parseAdsQuery("/reklama"), { datePreset: "last_7d", mode: "all" });
  assert.deepEqual(parseAdsQuery("/reklama qarz oy"), { datePreset: "this_month", mode: "debt" });
  assert.deepEqual(parseAdsQuery("/reklama bugun Lamina Uz"), { datePreset: "today", mode: "search", search: "Lamina Uz" });
  assert.deepEqual(parseAdsQuery("reklama akkauntlarida qarz bormi"), { datePreset: "last_7d", mode: "debt" });
});

test("umumiy hisobot: jami, qarz, muammolilar, sarf", () => {
  const t = formatAdsReport(DATA, parseAdsQuery("/reklama"));
  assert.match(t, /Jami 4 · faol 2 · muammoli 2/);
  assert.match(t, /Davr sarfi: 1 803,56 USD/);
  assert.match(t, /To'lanmagan qarz: 136,75 USD \(1 ta akkaunt\)/);
  assert.match(t, /Akbar &lt;b&gt;<\/b> \(repetitor\) — To'lanmagan qarz bor · to'lash kerak 136,75 USD · sarf 210,19 USD/);
  assert.match(t, /Sarapalto<\/b> — O'chirilgan \(bloklangan\): Reklama qoidalari buzilgan/);
  // Faol akkauntning joriy hisobi qarz emas
  assert.doesNotMatch(t, /237/);
  assert.match(t, /Avtochexol<\/b> — 1 593,37 USD/);
  assert.match(t, /Sarfsiz faol akkauntlar: 1 ta/);
});

test("qarz va qidiruv rejimlari", () => {
  const debt = formatAdsReport(DATA, parseAdsQuery("/reklama qarz"));
  assert.match(debt, /Qarzdor akkauntlar<\/b> · 1 ta/);
  assert.match(debt, /Jami to'lash kerak: 136,75 USD/);
  assert.doesNotMatch(debt, /Sarapalto/);
  const found = formatAdsReport({ davr: "today", akkauntlar: [DATA.akkauntlar[2]] }, parseAdsQuery("/reklama bugun avto"));
  assert.match(found, /joriy hisob 237,00 USD · sarf 1 593,37 USD/);
  assert.match(found, /<code>act_4<\/code>/);
  assert.match(formatAdsReport({ davr: "last_7d", akkauntlar: [] }, parseAdsQuery("/reklama yoq")), /topilmadi/);
});

test("uzun xabar qatorlar bo'yicha bo'linadi", () => {
  const parts = splitMessage(Array.from({ length: 300 }, (_, i) => `qator ${i} ${"x".repeat(40)}`).join("\n"));
  assert.ok(parts.length > 1);
  assert.ok(parts.every((p) => p.length <= 3900));
  assert.equal(parts.join("\n").split("\n").length, 300);
});
