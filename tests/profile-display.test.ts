import { test } from "node:test";
import assert from "node:assert/strict";
import { districtSummary, packageName, publicFieldLabel, publicLinkTitle } from "../src/lib/portfolio-rules";

test("paket nomi: faqat raqam bo'lsa birlik qo'shiladi", () => {
  assert.equal(packageName("15", "ssenarist"), "15 ta ssenariy");
  assert.equal(packageName(" 4 ", "montajor"), "4 ta video/Reels");
  assert.equal(packageName("10", "fotograf"), "10 ta ish / paket");
  assert.equal(packageName("10 ta Reels paketi", "mobilograf"), "10 ta Reels paketi");
});

test("hudud: 1–2 tuman nomi, ko'pi +N, hammasi Butun Xorazm", () => {
  assert.equal(districtSummary(["Urganch shahri"], 14), "Urganch sh.");
  assert.equal(districtSummary(["Urganch shahri", "Xiva tumani"], 14), "Urganch sh., Xiva t.");
  assert.equal(districtSummary(["Urganch shahri", "Xiva shahri", "Xonqa", "Gurlan"], 14), "Urganch sh. +3 ta");
  assert.equal(districtSummary(Array.from({ length: 14 }, (_, i) => `T${i}`), 14), "Butun Xorazm");
});

test("mijoz tilidagi sarlavhalar", () => {
  assert.equal(publicFieldLabel("case", "Eng yaxshi ishingiz (natija bilan)"), "Tajriba va eng yirik keyslar");
  assert.equal(publicFieldLabel("camera", "Kamera"), "Kamera");
  assert.equal(publicLinkTitle("montajor"), "Video ishlar namunalari");
  assert.equal(publicLinkTitle("ssenarist"), "Video ishlar namunalari");
});
