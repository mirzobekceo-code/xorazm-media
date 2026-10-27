import { test } from "node:test";
import assert from "node:assert/strict";
import { experienceFallback, formatPriceList, isBusiness, parsePriceList, portfolioProblem } from "../src/lib/portfolio-rules";

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
  assert.match(portfolioProblem("fotograf", { images: 5, links: 0, proofs: 0 }), /6 ta rasm/);
  assert.equal(portfolioProblem("fotograf", { images: 6, links: 0, proofs: 0 }), "");
  assert.match(portfolioProblem("mobilograf", { images: 1, links: 2, proofs: 0 }), /kamida 3 ta havola/);
  assert.match(portfolioProblem("targetolog", { images: 1, links: 0, proofs: 0 }), /skrinshot/);
  assert.equal(portfolioProblem("noma'lum", { images: 1, links: 0, proofs: 0 }), "");
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
