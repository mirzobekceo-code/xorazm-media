import { test } from "node:test";
import assert from "node:assert/strict";
import { pick } from "../src/lib/ads";

type Row = Parameters<typeof pick>[0][number];
const camp = (o: Partial<Row["campaign"]>): Row["campaign"] => ({
  id: 1, name: "c", advertiser: "Adverto", slots: ["A1", "A2"], professions: [], districts: [], startsAt: null, endsAt: null,
  weight: 1, isFallback: false, status: "active", createdAt: new Date(), updatedAt: new Date(), ...o,
});
const cr = (id: number, campaign: Row["campaign"]): Row => ({
  campaign,
  creative: { id, campaignId: campaign.id, type: "text", title: `t${id}`, body: "", cta: "x", url: "https://a.uz", imageDesktop: null, imageMobile: null, video: null, style: "default", badge: null, isActive: true },
});

test("pullik kampaniya standartdan oldin tanlanadi", () => {
  const rows = [cr(1, camp({ id: 1, isFallback: true })), cr(2, camp({ id: 2 }))];
  assert.equal(pick(rows, new Set(), "A1", {})?.id, 2);
});

test("bir sahifada kreativ takrorlanmaydi, iloji bo'lsa", () => {
  const f = camp({ id: 1, isFallback: true });
  const rows = [cr(1, f), cr(2, f), cr(3, f)];
  const used = new Set<number>();
  const ids = [pick(rows, used, "A1", {}), pick(rows, used, "A2", {}), pick(rows, used, "A1", {})].map((c) => c?.id);
  assert.equal(new Set(ids).size, 3);
});

test("kasbga mo'ljallangan kampaniya boshqa kasbda chiqmaydi", () => {
  const rows = [cr(1, camp({ id: 1, isFallback: true })), cr(2, camp({ id: 2, professions: ["bloger"] }))];
  assert.equal(pick(rows, new Set(), "A2", { profession: "operator" })?.id, 1);
  assert.equal(pick(rows, new Set(), "A2", { profession: "bloger" })?.id, 2);
});

test("slotga mos kreativ bo'lmasa null", () => {
  assert.equal(pick([cr(1, camp({ slots: ["A1"] }))], new Set(), "A4", {}), null);
});
