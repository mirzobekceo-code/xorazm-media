import { test } from "node:test";
import assert from "node:assert/strict";
import { BloggerInput, emptyBlogger, firstError, ProfileInput } from "../src/lib/profile-input";

const base = {
  profession: "operator", fullName: "Javohir Sobirov", birthYear: "1999", gender: "m", languages: ["uz"], districts: ["urganch-shahri"],
  experienceYears: "5", price: "700000", tags: "Sony FX3, Dron ,, Svet", extra: { camera: "FX3" },
  videoLinks: "https://youtube.com/watch?v=abc\n https://instagram.com/reel/x ", contacts: { phone: "", telegram: "javohir", instagram: "" }, consent: true,
};

test("to'g'ri forma: qiymatlar keltiriladi va standartlar qo'yiladi", () => {
  const r = ProfileInput.safeParse(base);
  assert.ok(r.success, r.success ? "" : firstError(r.error));
  assert.equal(r.data.birthYear, 1999);
  assert.equal(r.data.experienceYears, 5);
  assert.equal(r.data.price, 700000);
  assert.deepEqual(r.data.tags, ["Sony FX3", "Dron", "Svet"]);
  assert.deepEqual(r.data.videoLinks, ["https://youtube.com/watch?v=abc", "https://instagram.com/reel/x"]);
  assert.equal(r.data.contacts.telegram, "@javohir");
  assert.equal(r.data.bio, "");
  assert.equal(r.data.priceNegotiable, false);
});

test("bo'sh maydonlar: teglar, havolalar, extra standart qiymat oladi", () => {
  const { tags, videoLinks, extra, ...rest } = base;
  const r = ProfileInput.safeParse(rest);
  assert.ok(r.success);
  assert.deepEqual([r.data.tags, r.data.videoLinks, r.data.extra], [[], [], {}]);
});

test("kompaniya uchun tug'ilgan yil bo'sh bo'lishi mumkin", () => {
  const r = ProfileInput.safeParse({ ...base, birthYear: "", gender: undefined });
  assert.ok(r.success);
  assert.equal(r.data.birthYear, undefined);
});

test("xato xabarlari o'zbekcha qoladi", () => {
  const msg = (patch: object) => { const r = ProfileInput.safeParse({ ...base, ...patch }); return r.success ? "" : firstError(r.error); };
  assert.equal(msg({ consent: false }), "Kontaktlar ochiq ko‘rinishiga rozilik kerak");
  assert.match(msg({ videoLinks: "https://example.com/x" }), /YouTube, Instagram/);
  assert.equal(msg({ fullName: "Ab" }), "To‘liq ismni yozing");
  assert.equal(msg({ districts: [] }), "Kamida bitta tuman tanlang");
  assert.match(msg({ contacts: { telegram: "kirill ism" } }), /lotin/);
});

test("bloger statistikasi: obunachilar raqamga keltiriladi, admin majburiy", () => {
  const ok = BloggerInput.safeParse({ ...emptyBlogger(), followers: { instagram: "12000" }, admins: [{ name: "Ali", phone: "+998901234567", telegram: "" }] });
  assert.ok(ok.success, ok.success ? "" : firstError(ok.error));
  assert.deepEqual(ok.data.followers, { instagram: 12000, telegram: 0, tiktok: 0, youtube: 0 });
  const bad = BloggerInput.safeParse({ ...emptyBlogger(), admins: [] });
  assert.equal(bad.success ? "" : firstError(bad.error), "Kamida bitta admin kiriting");
});
