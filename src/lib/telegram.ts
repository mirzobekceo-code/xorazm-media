import "server-only";
import crypto from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { getDb, schema as s } from "@/db";

const token = () => process.env.TELEGRAM_BOT_TOKEN ?? "";
/** Bot API manzili: odatda api.telegram.org (o'z Bot API serveri yoki sinov uchun almashtiriladi). */
const apiBase = () => process.env.TELEGRAM_API_URL ?? "https://api.telegram.org";
export const botEnabled = () => !!token();

/** Bot API chaqiruvi. Token bo'lmasa yoki xato bo'lsa null (sayt ishlashda davom etadi). */
export async function tg<T = unknown>(method: string, body: Record<string, unknown> = {}): Promise<T | null> {
  if (!botEnabled()) return null;
  try {
    const res = await fetch(`${apiBase()}/bot${token()}/${method}`, {
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

/** Fayl yuborish (sendDocument): multipart/form-data. Yetkazilsa true. */
export async function tgDocument(chatId: string, file: Buffer, filename: string, caption: string): Promise<boolean> {
  if (!botEnabled()) return false;
  const form = new FormData();
  form.set("chat_id", chatId);
  form.set("caption", caption.slice(0, 1000));
  form.set("document", new Blob([new Uint8Array(file)], { type: "application/gzip" }), filename);
  try {
    const res = await fetch(`${apiBase()}/bot${token()}/sendDocument`, { method: "POST", body: form });
    const json = (await res.json()) as { ok: boolean; description?: string };
    if (!json.ok) console.error("Telegram sendDocument:", json.description);
    return json.ok;
  } catch (e) {
    console.error("Telegram sendDocument", e);
    return false;
  }
}

let username: string | null = null;
/** Bot username (deep link uchun). TELEGRAM_BOT_USERNAME yoki getMe orqali. */
export async function botUsername(): Promise<string | null> {
  if (process.env.TELEGRAM_BOT_USERNAME) return process.env.TELEGRAM_BOT_USERNAME.replace(/^@/, "");
  if (!username) username = (await tg<{ username: string }>("getMe"))?.username ?? null;
  return username;
}

let webhookChecked = false;
/**
 * Webhook o'rnatilmagan yoki boshqa manzilda bo'lsa, o'rnatadi (birinchi kirish urinishida).
 * Shunda bot tokeni qo'shilgach, admin panelga kirmasdan ham Telegram orqali kirish ishlaydi.
 */
export async function ensureWebhook(siteUrl: string) {
  if (webhookChecked || !botEnabled() || !siteUrl.startsWith("https://")) return;
  const url = `${siteUrl}/api/telegram/webhook`;
  const info = await tg<{ url: string; allowed_updates?: string[] }>("getWebhookInfo");
  // Moderator tugmalari (callback_query) ham kelishi kerak
  if (info && (info.url !== url || (info.allowed_updates && !info.allowed_updates.includes("callback_query")))) {
    await tg("setWebhook", { url, secret_token: webhookSecret(), allowed_updates: ["message", "callback_query"] });
  }
  webhookChecked = !!info;
}

export const BOT_TEXT = {
  description: "Xorazm Digital HUB — Xorazmdagi digital va media mutaxassislari bitta joyda: brand face, operator, mobilograf, montajor, targetolog, SMM manager, bloger, fotograf, dizayner, suhandon, studiya va texnika ijarasi. Kontaktlar bepul.",
  short: "Xorazmdagi digital va media mutaxassislari bitta joyda",
};

let menuChecked = false;
/**
 * Pastdagi menyu tugmasi butun saytni Mini App sifatida ochsin. Har instance'da bir marta tekshiriladi:
 * domen o'zgarsa (masalan, xorazmdigital.uz ulanganda) tugma o'zi yangilanadi.
 */
export async function ensureBotMenu(siteUrl: string) {
  if (menuChecked || !botEnabled() || !siteUrl.startsWith("https://")) return;
  const url = `${siteUrl}/`;
  const cur = await tg<{ type: string; web_app?: { url: string } }>("getChatMenuButton");
  if (cur && cur.web_app?.url !== url) {
    await tg("setChatMenuButton", { menu_button: { type: "web_app", text: "Ochish", web_app: { url } } });
    await tg("setMyDescription", { description: BOT_TEXT.description });
    await tg("setMyShortDescription", { short_description: BOT_TEXT.short });
  }
  menuChecked = !!cur;
}

/** Webhook so'rovlari haqiqatan Telegram'dan kelganini tekshirish uchun sir (bot tokenidan olinadi). */
export function webhookSecret(): string {
  return crypto.createHmac("sha256", token()).update("xm-webhook").digest("hex").slice(0, 48);
}

/** Xabar yuboradi; yetkazilgan bo'lsa true. */
export async function send(chatId: string, text: string, extra: Record<string, unknown> = {}): Promise<boolean> {
  return !!(await tg("sendMessage", { chat_id: chatId, text, disable_web_page_preview: true, ...extra }));
}

/** Foydalanuvchiga Telegram xabari; yetkazilsa true (Telegram ulanmagan bo'lsa false). */
export async function notifyUser(userId: number, text: string): Promise<boolean> {
  const db = await getDb();
  const [u] = await db.select({ tg: s.users.telegramId }).from(s.users).where(eq(s.users.id, userId)).limit(1);
  return u?.tg ? send(u.tg, text) : false;
}

export async function notifyStaff(text: string) {
  const db = await getDb();
  const staff = await db.select({ tg: s.users.telegramId }).from(s.users).where(inArray(s.users.role, ["moderator", "admin"]));
  await Promise.all(staff.filter((x) => x.tg).map((x) => send(x.tg!, text)));
}

export { verifyInitData, type WebAppUser } from "./tg-verify";
