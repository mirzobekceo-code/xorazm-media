import { cache } from "react";
import { and, eq, gte, isNull, lte, or, sql } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import type { Slot } from "./reference";

export type Creative = typeof s.adCreatives.$inferSelect;
type Candidate = { creative: Creative; campaign: typeof s.adCampaigns.$inferSelect };
export type AdContext = { profession?: string; district?: string };

/** Qidiruv matnidan kasbni topadi ("mobilograf", "smm", "montaj" ...). */
export function professionFromQuery(q: string | undefined, profs: { slug: string; nameUz: string }[]): string | undefined {
  const t = q?.trim().toLowerCase();
  if (!t || t.length < 3) return undefined;
  return profs.find((p) => p.slug.startsWith(t) || p.nameUz.toLowerCase().startsWith(t) || t.startsWith(p.slug.slice(0, 5)))?.slug;
}

/** Sahifa manzilidan reklama konteksti: /mutaxassislar/<kasb>, ?q=..., ?tuman=..., /m/<profil>. */
export async function adContextFromUrl(url: string | null, profs: { id: number; slug: string; nameUz: string }[]): Promise<AdContext> {
  if (!url) return {};
  const u = new URL(url, "http://x");
  const parts = u.pathname.split("/").filter(Boolean);
  const district = u.searchParams.get("tuman") ?? undefined;
  if (parts[0] === "mutaxassislar") {
    const profession = profs.find((p) => p.slug === parts[1])?.slug ?? professionFromQuery(u.searchParams.get("q") ?? undefined, profs);
    return { profession, district };
  }
  if (parts[0] === "m" && parts[1]) {
    const db = await getDb();
    const [p] = await db.select({ pid: s.profiles.professionId }).from(s.profiles).where(eq(s.profiles.slug, decodeURIComponent(parts[1]))).limit(1);
    return { profession: profs.find((x) => x.id === p?.pid)?.slug };
  }
  return {};
}

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
