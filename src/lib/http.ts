import crypto from "node:crypto";
import { headers } from "next/headers";

/** Oddiy xotiradagi limit (bitta server nusxasi uchun). Ko'p nusxada Redis'ga almashtiriladi. */
const hits = new Map<string, { n: number; reset: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const h = hits.get(key);
  if (!h || h.reset < now) {
    hits.set(key, { n: 1, reset: now + windowMs });
    if (hits.size > 50_000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
    return true;
  }
  h.n++;
  return h.n <= limit;
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "0.0.0.0";
}

/** Shaxsni saqlamasdan takroriy hodisalarni ajratish uchun: IP + brauzer + kun. */
export async function sessionHash(): Promise<string> {
  const h = await headers();
  const day = new Date().toISOString().slice(0, 10);
  return crypto.createHash("sha256").update(`${await clientIp()}|${h.get("user-agent") ?? ""}|${day}`).digest("hex");
}

export function isBot(ua: string | null): boolean {
  return !ua || /bot|crawl|spider|slurp|preview|facebookexternalhit|headless/i.test(ua);
}
