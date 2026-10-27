import "server-only";
import crypto from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { botUsername, ensureWebhook } from "./telegram";
import { SITE } from "./site";

const TTL_MIN = 10;
const sha = (v: string) => crypto.createHash("sha256").update(v).digest("hex");

/**
 * Kirish yoki ulash uchun token. `secret` faqat shu brauzerga qaytariladi:
 * botdagi havolani boshqa birov ko'rsa ham, tokenni ishlata olmaydi.
 */
export async function createTelegramToken(purpose: "login" | "link", userId?: number, returnPath?: string) {
  const bot = await botUsername();
  if (!bot) return null;
  await ensureWebhook(SITE.url);
  const db = await getDb();
  const tokenValue = crypto.randomBytes(16).toString("hex");
  const secret = crypto.randomBytes(24).toString("hex");
  await db.insert(s.telegramTokens).values({
    token: tokenValue, secretHash: sha(secret), purpose, userId: userId ?? null, returnPath: safePath(returnPath),
    expiresAt: new Date(Date.now() + TTL_MIN * 60_000),
  });
  return { token: tokenValue, secret, url: `https://t.me/${bot}?start=${purpose}_${tokenValue}` };
}

/** Brauzer so'raydi: token tasdiqlanganmi? Tasdiqlangan bo'lsa bir martalik ishlatiladi. */
export async function claimTelegramToken(tokenValue: string, secret: string) {
  const db = await getDb();
  const [t] = await db.select().from(s.telegramTokens)
    .where(and(eq(s.telegramTokens.token, tokenValue), gt(s.telegramTokens.expiresAt, new Date()))).limit(1);
  if (!t || t.secretHash !== sha(secret)) return { status: "expired" as const };
  if (t.status === "pending") return { status: "pending" as const };
  if (t.status === "used") return { status: "expired" as const };
  // Poyga holatida ikki marta ishlatilmasligi uchun shartli yangilash
  const [claimed] = await db.update(s.telegramTokens).set({ status: "used" })
    .where(and(eq(s.telegramTokens.token, tokenValue), eq(s.telegramTokens.status, "confirmed"))).returning();
  if (!claimed) return { status: "expired" as const };
  return { status: "confirmed" as const, token: claimed };
}

/** Bot /start login_xxx yoki link_xxx olganda: tokenni shu chatga bog'laydi. */
export async function attachChat(purpose: "login" | "link", tokenValue: string, chatId: string, telegramId: string) {
  const db = await getDb();
  const [t] = await db.update(s.telegramTokens).set({ chatId, telegramId })
    .where(and(
      eq(s.telegramTokens.token, tokenValue), eq(s.telegramTokens.purpose, purpose),
      eq(s.telegramTokens.status, "pending"), gt(s.telegramTokens.expiresAt, new Date()),
    )).returning();
  return t ?? null;
}

/** Shu chatdagi oxirgi kutilayotgan kirish tokeni (kontakt kelganda). */
export async function pendingLoginForChat(chatId: string) {
  const db = await getDb();
  const rows = await db.select().from(s.telegramTokens).where(and(
    eq(s.telegramTokens.chatId, chatId), eq(s.telegramTokens.purpose, "login"),
    eq(s.telegramTokens.status, "pending"), gt(s.telegramTokens.expiresAt, new Date()),
  ));
  return rows.sort((a, b) => +b.createdAt - +a.createdAt)[0] ?? null;
}

export async function confirmToken(tokenValue: string, patch: { phone?: string } = {}) {
  const db = await getDb();
  await db.update(s.telegramTokens).set({ status: "confirmed", ...patch }).where(eq(s.telegramTokens.token, tokenValue));
}

/** Faqat sayt ichidagi yo'l ("/..."); boshqa saytga yo'naltirish mumkin emas. */
export function safePath(p: string | null | undefined): string | null {
  return p && /^\/(?!\/)[^\s\\]{0,199}$/.test(p) ? p : null;
}

const finishSig = (tokenValue: string) =>
  crypto.createHmac("sha256", process.env.TELEGRAM_BOT_TOKEN ?? "").update(`finish:${tokenValue}`).digest("hex").slice(0, 32);

/** Botdagi "Saytga qaytish" havolasi: imzolangan, faqat shu token uchun. */
export const finishUrl = (tokenValue: string) => `${SITE.url}/api/v1/auth/telegram/finish?t=${tokenValue}&s=${finishSig(tokenValue)}`;

/**
 * "Saytga qaytish" bosilganda: tasdiqlangan kirish tokeni (30 daqiqa ichida) shu brauzerda ham sessiya ochadi.
 * Asl sahifa ham o'z tokeni bilan kiraveradi — ikkalasi bir-biriga xalaqit bermaydi.
 */
export async function finishToken(tokenValue: string, sig: string) {
  const want = finishSig(tokenValue);
  if (!/^[a-f0-9]{32}$/.test(tokenValue) || sig.length !== want.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return null;
  const db = await getDb();
  const [t] = await db.select().from(s.telegramTokens).where(and(
    eq(s.telegramTokens.token, tokenValue), eq(s.telegramTokens.purpose, "login"),
    gt(s.telegramTokens.createdAt, new Date(Date.now() - 30 * 60_000)),
  )).limit(1);
  if (!t || t.status === "pending" || !t.phone || !t.telegramId) return null;
  return t;
}
