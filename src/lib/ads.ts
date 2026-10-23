import { cache } from "react";
import { and, eq, gte, isNull, lte, or, sql } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import type { Slot } from "./reference";

export type Creative = typeof s.adCreatives.$inferSelect;
type Candidate = { creative: Creative; campaign: typeof s.adCampaigns.$inferSelect };
export type AdContext = { profession?: string; district?: string };

/**
 * Bitta so'rov davomida (layout + sahifa) umumiy reklama tanlovchi:
 * bir sahifada bir xil kreativ ikki marta chiqmaydi.
 */
export const getAdPicker = cache(async () => {
  const db = await getDb();
  const now = new Date();
  const rows = await db.select({ creative: s.adCreatives, campaign: s.adCampaigns })
    .from(s.adCreatives)
    .innerJoin(s.adCampaigns, eq(s.adCampaigns.id, s.adCreatives.campaignId))
    .where(and(
      eq(s.adCreatives.isActive, true),
      eq(s.adCampaigns.status, "active"),
      or(isNull(s.adCampaigns.startsAt), lte(s.adCampaigns.startsAt, now)),
      or(isNull(s.adCampaigns.endsAt), gte(s.adCampaigns.endsAt, now)),
    ));
  const used = new Set<number>();
  return (slot: Slot, ctx: AdContext = {}): Creative | null => pick(rows, used, slot, ctx);
});

export function pick(rows: Candidate[], used: Set<number>, slot: Slot, ctx: AdContext): Creative | null {
  const fits = (r: Candidate) =>
    r.campaign.slots.includes(slot) &&
    (!r.campaign.professions.length || (!!ctx.profession && r.campaign.professions.includes(ctx.profession))) &&
    (!r.campaign.districts.length || (!!ctx.district && r.campaign.districts.includes(ctx.district)));
  const paid = rows.filter((r) => !r.campaign.isFallback && fits(r));
  const fallback = rows.filter((r) => r.campaign.isFallback && fits(r));
  for (const pool of [paid, fallback]) {
    const fresh = pool.filter((r) => !used.has(r.creative.id));
    const choice = weighted(fresh.length ? fresh : pool);
    if (choice) {
      used.add(choice.creative.id);
      return choice.creative;
    }
  }
  return null;
}

function weighted(pool: Candidate[]): Candidate | null {
  if (!pool.length) return null;
  const total = pool.reduce((a, r) => a + Math.max(1, r.campaign.weight), 0);
  let x = Math.random() * total;
  for (const r of pool) {
    x -= Math.max(1, r.campaign.weight);
    if (x <= 0) return r;
  }
  return pool[pool.length - 1];
}

export async function adStats(days = 30) {
  const db = await getDb();
  return db.select({
    creativeId: s.adEvents.creativeId,
    slot: s.adEvents.slot,
    impressions: sql<number>`count(*) filter (where ${s.adEvents.type} = 'impression')::int`,
    clicks: sql<number>`count(*) filter (where ${s.adEvents.type} = 'click')::int`,
  }).from(s.adEvents)
    .where(sql`${s.adEvents.createdAt} > now() - make_interval(days => ${days})`)
    .groupBy(s.adEvents.creativeId, s.adEvents.slot);
}
