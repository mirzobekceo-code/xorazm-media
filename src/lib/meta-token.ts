import "server-only";
import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { SITE } from "./site";

/**
 * Meta Ads connector tokeni. Asosiy yo'l — "Facebook orqali ulash" (foydalanuvchi tokeni, ~60 kun):
 * egasi ko'radigan BARCHA reklama akkauntlari, keyin ochiladiganlari ham, o'zi kiradi.
 * Token bazada (settings jadvali) AES-256-GCM bilan shifrlangan holda saqlanadi.
 * Zaxira: META_ACCESS_TOKEN muhit o'zgaruvchisi (masalan, tizim foydalanuvchisi tokeni).
 *
 * Muhit: META_APP_ID, META_APP_SECRET (ulash uchun), ixtiyoriy META_LOGIN_CONFIG_ID (Facebook Login for Business).
 */
const KEY = "meta_ads_token";
export const META_VERSION = () => process.env.META_API_VERSION || "v23.0";
export const GRAPH = () => (process.env.META_GRAPH_URL || "https://graph.facebook.com").replace(/\/$/, "");
export const callbackUrl = () => `${SITE.url.replace(/\/$/, "")}/api/meta-callback`;
export const loginConfigured = () => !!(process.env.META_APP_ID && process.env.META_APP_SECRET);
export const SCOPES = "ads_read,business_management";

type Stored = { iv: string; tag: string; data: string; expiresAt: string | null; userName: string; connectedAt: string };
export type MetaToken = { token: string; source: "login" | "env"; expiresAt: Date | null; userName: string | null; connectedAt: Date | null };

function cipherKey(): Buffer {
  const secret = process.env.META_APP_SECRET;
  if (!secret) throw new Error("META_APP_SECRET yo'q");
  return crypto.createHash("sha256").update(`meta-ads-token:${secret}`).digest();
}

export async function saveToken(token: string, expiresAt: Date | null, userName: string) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", cipherKey(), iv);
  const data = Buffer.concat([c.update(token, "utf8"), c.final()]);
  const value: Stored = {
    iv: iv.toString("base64"), tag: c.getAuthTag().toString("base64"), data: data.toString("base64"),
    expiresAt: expiresAt?.toISOString() ?? null, userName, connectedAt: new Date().toISOString(),
  };
  const db = await getDb();
  await db.insert(s.settings).values({ key: KEY, value }).onConflictDoUpdate({ target: s.settings.key, set: { value } });
}

/** Amaldagi token: avval "Facebook orqali ulash", u bo'lmasa yoki muddati o'tgan bo'lsa — META_ACCESS_TOKEN. */
export async function getToken(): Promise<MetaToken | null> {
  try {
    const db = await getDb();
    const [row] = await db.select().from(s.settings).where(eq(s.settings.key, KEY)).limit(1);
    const v = row?.value as Stored | undefined;
    if (v && process.env.META_APP_SECRET) {
      const expiresAt = v.expiresAt ? new Date(v.expiresAt) : null;
      if (!expiresAt || expiresAt.getTime() > Date.now()) {
        const d = crypto.createDecipheriv("aes-256-gcm", cipherKey(), Buffer.from(v.iv, "base64"));
        d.setAuthTag(Buffer.from(v.tag, "base64"));
        const token = Buffer.concat([d.update(Buffer.from(v.data, "base64")), d.final()]).toString("utf8");
        return { token, source: "login", expiresAt, userName: v.userName, connectedAt: new Date(v.connectedAt) };
      }
    }
  } catch (e) {
    console.error("meta token o'qilmadi", e);
  }
  const env = process.env.META_ACCESS_TOKEN;
  return env ? { token: env, source: "env", expiresAt: null, userName: null, connectedAt: null } : null;
}

export const daysLeft = (t: { expiresAt: Date | null } | null) =>
  t?.expiresAt ? Math.max(0, Math.floor((t.expiresAt.getTime() - Date.now()) / 86_400_000)) : null;

/** Meta login sahifasiga havola (state — CSRF himoyasi uchun cookie bilan solishtiriladi) */
export function loginUrl(state: string): string {
  const u = new URL(`https://www.facebook.com/${META_VERSION()}/dialog/oauth`);
  u.searchParams.set("client_id", process.env.META_APP_ID ?? "");
  u.searchParams.set("redirect_uri", callbackUrl());
  u.searchParams.set("state", state);
  u.searchParams.set("response_type", "code");
  const config = process.env.META_LOGIN_CONFIG_ID;
  if (config) u.searchParams.set("config_id", config);
  else u.searchParams.set("scope", SCOPES);
  return u.toString();
}

async function oauth(params: Record<string, string>): Promise<{ access_token: string; expires_in?: number }> {
  const u = new URL(`${GRAPH()}/${META_VERSION()}/oauth/access_token`);
  for (const [k, v] of Object.entries({ client_id: process.env.META_APP_ID ?? "", client_secret: process.env.META_APP_SECRET ?? "", ...params })) u.searchParams.set(k, v);
  const res = await fetch(u, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
  const json = (await res.json().catch(() => null)) as { access_token?: string; expires_in?: number; error?: { message?: string } } | null;
  if (!res.ok || !json?.access_token) throw new Error(json?.error?.message ?? `HTTP ${res.status}`);
  return { access_token: json.access_token, expires_in: json.expires_in };
}

/** Kodni uzoq muddatli tokenga almashtiradi va saqlaydi. */
export async function finishLogin(code: string) {
  const short = await oauth({ redirect_uri: callbackUrl(), code });
  const long = await oauth({ grant_type: "fb_exchange_token", fb_exchange_token: short.access_token }).catch(() => short);
  const me = await fetch(`${GRAPH()}/${META_VERSION()}/me?fields=id,name`, { headers: { authorization: `Bearer ${long.access_token}` }, cache: "no-store" })
    .then((r) => r.json() as Promise<{ name?: string }>).catch(() => ({ name: undefined }));
  // Muddat ko'rsatilmasa — Meta'ning uzoq muddatli tokeni odatda 60 kun
  const expiresAt = new Date(Date.now() + (long.expires_in ?? 60 * 86_400) * 1000);
  await saveToken(long.access_token, expiresAt, me.name ?? "");
  return { userName: me.name ?? "", expiresAt };
}

/** Kunlik cron: Facebook ulanishi tugashiga 10, 3, 1 yoki 0 kun qolganda adminlarga Telegram eslatma (havolasiz — maxfiy kalit tarqalmasin). */
export async function remindMetaExpiry(): Promise<string> {
  const t = await getToken();
  if (t?.source !== "login") return "skip";
  const left = daysLeft(t);
  if (left === null || ![10, 3, 1, 0].includes(left)) return `ok (${left} kun)`;
  const { send } = await import("./telegram");
  const { inArray } = await import("drizzle-orm");
  const db = await getDb();
  const admins = await db.select({ tg: s.users.telegramId }).from(s.users).where(inArray(s.users.role, ["admin"]));
  const text = `⚠️ Claude'dagi Meta Ads connector ulanishi ${left ? `${left} kundan keyin` : "bugun"} tugaydi (${t.userName || "Facebook profili"}).\n\nClaude'da "Meta ulanish holatini ko'rsat" deb so'rang va berilgan havola orqali Facebook bilan qayta ulaning.`;
  await Promise.all(admins.filter((a) => a.tg).map((a) => send(a.tg!, text)));
  return `eslatildi (${left} kun)`;
}
