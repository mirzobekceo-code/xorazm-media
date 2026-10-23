import { test } from "node:test";
import assert from "node:assert/strict";
import { audienceBucket, kfmt, money, normalizePhone, prettyPhone, slugify } from "../src/lib/format";

test("normalizePhone har xil yozuvni +998 ko'rinishiga keltiradi", () => {
  assert.equal(normalizePhone("+998 90 123 45 67"), "+998901234567");
  assert.equal(normalizePhone("998901234567"), "+998901234567");
  assert.equal(normalizePhone("90-123-45-67"), "+998901234567");
  assert.equal(normalizePhone("12345"), null);
  assert.equal(normalizePhone("+7 900 123 45 67"), null);
});

test("prettyPhone", () => assert.equal(prettyPhone("+998901234567"), "+998 90 123 45 67"));

test("slugify o'zbek tutuq belgilarini olib tashlaydi", () => {
  assert.equal(slugify("Kamola Xo‘jayeva"), "kamola-xojayeva");
  assert.equal(slugify("Ulug'bek  Rahimov!"), "ulugbek-rahimov");
});

test("money va kfmt", () => {
  assert.equal(money(1250000), "1 250 000");
  assert.equal(money(null), "—");
  assert.equal(kfmt(48200), "48.2K");
  assert.equal(kfmt(126000), "126K");
  assert.equal(kfmt(1_500_000), "1.5M");
  assert.equal(kfmt(950), "950");
});

test("audienceBucket chegaralari", () => {
  assert.equal(audienceBucket(9_999), "s");
  assert.equal(audienceBucket(10_000), "m");
  assert.equal(audienceBucket(50_000), "l");
});
