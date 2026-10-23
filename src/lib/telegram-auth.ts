import "server-only";
import crypto from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { botUsername } from "./telegram";

const TTL_MIN = 10;
const sha = (v: string) => crypto.createHash("sha256").update(v).digest("hex");

/**
 * Kirish yoki ulash uchun token. `secret` faqat shu brauzerga qaytariladi:
 * botdagi havolani boshqa birov ko'rsa ham, tokenni ishlata olmaydi.
 */
export async function createTelegramToken(purpose: "login" | "link", userId?: number) {
  const bot = await botUsername();
  if (!bot) return null;
  const db = await getDb();
  const tokenValue = crypto.randomBytes(16).toString("hex");
  const secret = crypto.randomBytes(24).toString("hex");
  await db.insert(s.telegramTokens).values({
    token: tokenValue, secretHash: sha(secret), purpose, userId: userId ?? null,
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
