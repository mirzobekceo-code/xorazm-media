import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { verifyInitData } from "../src/lib/tg-verify";

const BOT = "123456:TEST-token";

/** Telegram qanday imzolasa, xuddi shunday initData yasaydi. */
function sign(fields: Record<string, string>, token = BOT) {
  const check = Object.entries(fields).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join("\n");
  const secret = crypto.createHmac("sha256", "WebAppData").update(token).digest();
  const hash = crypto.createHmac("sha256", secret).update(check).digest("hex");
  return new URLSearchParams({ ...fields, hash }).toString();
}
const now = () => String(Math.floor(Date.now() / 1000));
const user = JSON.stringify({ id: 777, first_name: "Test" });

test("to'g'ri imzolangan initData qabul qilinadi", () => {
  assert.equal(verifyInitData(sign({ auth_date: now(), user, query_id: "q1" }), BOT)?.id, 777);
});

test("o'zgartirilgan ma'lumot rad etiladi", () => {
  const data = sign({ auth_date: now(), user }).replace("777", "778");
  assert.equal(verifyInitData(data, BOT), null);
});

test("boshqa bot tokeni bilan imzo rad etiladi", () => {
  assert.equal(verifyInitData(sign({ auth_date: now(), user }, "999:OTHER"), BOT), null);
});

test("eskirgan initData (1 kundan ortiq) rad etiladi", () => {
  const old = String(Math.floor(Date.now() / 1000) - 2 * 86_400);
  assert.equal(verifyInitData(sign({ auth_date: old, user }), BOT), null);
});

test("hash yo'q yoki token bo'sh bo'lsa null", () => {
  assert.equal(verifyInitData("auth_date=1&user=x", BOT), null);
  assert.equal(verifyInitData(sign({ auth_date: now(), user }), ""), null);
});
