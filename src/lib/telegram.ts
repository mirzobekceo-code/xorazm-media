import "server-only";
import crypto from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { getDb, schema as s } from "@/db";

const token = () => process.env.TELEGRAM_BOT_TOKEN ?? "";
export const botEnabled = () => !!token();

/** Bot API chaqiruvi. Token bo'lmasa yoki xato bo'lsa null (sayt ishlashda davom etadi). */
export async function tg<T = unknown>(method: string, body: Record<string, unknown> = {}): Promise<T | null> {
  if (!botEnabled()) return null;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token()}/${method}`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
    });
    const json = (await res.json()) as { ok: boolean; result?: T; description?: string };
    if (!json.ok) console.error(`Telegram ${method}:`, json.description);
    return json.ok ? (json.result ?? null) : null;
  } catch (e) {
    console.error(`Telegram ${method}`, e);
    return null;
  }
}

let username: string | null = null;
/** Bot username (deep link uchun). TELEGRAM_BOT_USERNAME yoki getMe orqali. */
export async function botUsername(): Promise<string | null> {
  if (process.env.TELEGRAM_BOT_USERNAME) return process.env.TELEGRAM_BOT_USERNAME.replace(/^@/, "");
  if (!username) username = (await tg<{ username: string }>("getMe"))?.username ?? null;
  return username;
}

/** Webhook so'rovlari haqiqatan Telegram'dan kelganini tekshirish uchun sir (bot tokenidan olinadi). */
export function webhookSecret(): string {
  return crypto.createHmac("sha256", token()).update("xm-webhook").digest("hex").slice(0, 48);
}

export async function send(chatId: string, text: string, extra: Record<string, unknown> = {}) {
  await tg("sendMessage", { chat_id: chatId, text, disable_web_page_preview: true, ...extra });
}

export async function notifyUser(userId: number, text: string) {
  const db = await getDb();
  const [u] = await db.select({ tg: s.users.telegramId }).from(s.users).where(eq(s.users.id, userId)).limit(1);
  if (u?.tg) await send(u.tg, text);
}

export async function notifyStaff(text: string) {
  const db = await getDb();
  const staff = await db.select({ tg: s.users.telegramId }).from(s.users).where(inArray(s.users.role, ["moderator", "admin"]));
  await Promise.all(staff.filter((x) => x.tg).map((x) => send(x.tg!, text)));
}

export { verifyInitData, type WebAppUser } from "./tg-verify";
