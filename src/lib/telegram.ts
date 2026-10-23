import "server-only";
import { eq, inArray } from "drizzle-orm";
import { getDb, schema as s } from "@/db";

/** Telegram bot orqali xabar. Token yoki chat id bo'lmasa jim o'tadi. */
async function send(chatId: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  }).catch((e) => console.error("Telegram", e));
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
