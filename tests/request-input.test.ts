import { test } from "node:test";
import assert from "node:assert/strict";
import { QuickRequestInput, requestTitle } from "../src/lib/request-input";

test("tezkor so'rov: to'g'ri forma", () => {
  const r = QuickRequestInput.safeParse({ text: "4 ta target uchun reels kerak", place: "xiva-shahri", budget: "100$", phone: "+998 90 123 45 67" });
  assert.ok(r.success);
  assert.equal(r.data.website, "");
});

test("tezkor so'rov: qisqa matn va tuzoq maydoni rad etiladi", () => {
  assert.equal(QuickRequestInput.safeParse({ text: "reels", phone: "901234567" }).success, false);
  assert.equal(QuickRequestInput.safeParse({ text: "Reels kerak, 5 ta video", phone: "901234567", website: "spam" }).success, false);
});

test("sarlavha matndan olinadi va uzun bo'lsa so'z chegarasida kesiladi", () => {
  assert.equal(requestTitle("  Kafe uchun reels\nbatafsil"), "Kafe uchun reels");
  const t = requestTitle("Bizning restoranimiz uchun har hafta to‘rtta reels video, ssenariy va montaj bilan birga kerak bo‘ladi");
  assert.ok(t.length <= 81 && t.endsWith("…") && !t.includes(" …"));
});
