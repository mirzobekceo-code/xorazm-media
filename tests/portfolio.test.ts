import { test } from "node:test";
import assert from "node:assert/strict";
import { countPortfolio, experienceFallback, formatPriceList, isBusiness, parsePriceList, portfolioProblem } from "../src/lib/portfolio-rules";

test("narxli ro'yxat: yozish va o'qish bir xil", () => {
  const rows = [{ name: "Sony FX3", price: 350000 }, { name: "Canon 24-105", price: 0 }, { name: "", price: 5 }];
  const text = formatPriceList(rows);
  assert.equal(text, "Sony FX3 — 350000\nCanon 24-105 — 0");
  assert.deepEqual(parsePriceList(text), rows.slice(0, 2));
});

test("narxli ro'yxat: qo'lda yozilgan va narxsiz qatorlar", () => {
  assert.deepEqual(parsePriceList("DJI Mini 4 - 200 000\nSvet"), [{ name: "DJI Mini 4", price: 200000 }, { name: "Svet", price: 0 }]);
});

test("portfolio talablari kasbga qarab", () => {
  const c = (o: Partial<{ hasCover: boolean; works: number; videos: number; links: number; proofs: number }>) =>
    ({ hasCover: true, works: 0, videos: 0, links: 0, proofs: 0, ...o });
  assert.match(portfolioProblem("fotograf", c({ hasCover: false, works: 9 })), /profil uchun rasm/);
  assert.match(portfolioProblem("fotograf", c({ works: 5 })), /kamida 6 ta rasm yoki video/);
  assert.equal(portfolioProblem("fotograf", c({ works: 6 })), "");
  // Mobilograf: 3 ta video — yuklangan video ham, havola ham hisoblanadi
  assert.match(portfolioProblem("mobilograf", c({ videos: 1, links: 1 })), /kamida 3 ta/);
  assert.equal(portfolioProblem("mobilograf", c({ videos: 2, links: 1 })), "");
  assert.equal(portfolioProblem("mobilograf", c({ videos: 3 })), "");
  assert.match(portfolioProblem("targetolog", c({})), /skrinshot/);
  assert.equal(portfolioProblem("noma'lum", c({})), "");
});

test("sanoq: profil rasmi alohida, eski profillarda birinchi rasm profil rasmi", () => {
  const m = (type: string, isCover = false, isStatScreenshot = false) => ({ type, isCover, isStatScreenshot });
  assert.deepEqual(countPortfolio([m("image", true), m("image"), m("video"), m("image", false, true)], 2),
    { hasCover: true, works: 2, videos: 1, links: 2, proofs: 1 });
  assert.deepEqual(countPortfolio([m("image"), m("image")], 0), { hasCover: true, works: 1, videos: 0, links: 0, proofs: 0 });
  assert.deepEqual(countPortfolio([m("video")], 0), { hasCover: false, works: 1, videos: 1, links: 0, proofs: 0 });
});

test("studiya va texnika ijarasi — kompaniya", () => {
  assert.ok(isBusiness("studiya") && isBusiness("texnika-ijarasi"));
  assert.ok(!isBusiness("operator") && !isBusiness(undefined));
});

test("marketolog: 3 yildan kam tajriba — SMM manager", () => {
  assert.equal(experienceFallback("marketolog", 2), "smm");
  assert.equal(experienceFallback("marketolog", 0), "smm");
  assert.equal(experienceFallback("marketolog", 3), null);
  assert.equal(experienceFallback("smm", 0), null);
  assert.equal(experienceFallback(undefined, 0), null);
});
