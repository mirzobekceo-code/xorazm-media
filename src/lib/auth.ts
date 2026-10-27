import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import crypto from "node:crypto";
import { and, eq, gt, isNull, desc, ne, sql } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { deliverCode, type Channel } from "./otp-delivery";

const COOKIE = "xm_session";
const SESSION_DAYS = 30;
const OTP_TTL_MIN = 5;
const OTP_MAX_ATTEMPTS = 3;
const OTP_PER_DAY = 5;

const sha = (v: string) => crypto.createHash("sha256").update(v).digest("hex");

export type OtpResult = { ok: true; channel: Channel } | { ok: false; error: string };

export async function sendOtp(phone: string): Promise<OtpResult> {
  const db = await getDb();
  const [{ today, lastMin }] = await db.select({
    today: sql<number>`count(*) filter (where ${s.otpCodes.createdAt} > now() - interval '1 day')::int`,
    lastMin: sql<number>`count(*) filter (where ${s.otpCodes.createdAt} > now() - interval '1 minute')::int`,
  }).from(s.otpCodes).where(eq(s.otpCodes.phone, phone));
  if (lastMin > 0) return { ok: false, error: "Kodni 1 daqiqadan keyin qayta so‘rang." };
  if (today >= OTP_PER_DAY) return { ok: false, error: "Bugun bu raqamga juda ko‘p kod yuborildi. Ertaga urinib ko‘ring." };

  const code = String(crypto.randomInt(100000, 1000000));
  const [row] = await db.insert(s.otpCodes).values({
    phone, codeHash: sha(phone + code), expiresAt: new Date(Date.now() + OTP_TTL_MIN * 60_000),
  }).returning({ id: s.otpCodes.id });
  const channel = await deliverCode(phone, code, OTP_TTL_MIN * 60);
  // Yetkazilmagan kod limitlarga hisoblanmasin
  if (!channel) await db.delete(s.otpCodes).where(eq(s.otpCodes.id, row.id));
  return channel
    ? { ok: true, channel }
    : { ok: false, error: "Bu raqamga Telegram orqali kod yuborib bo‘lmadi. “Telegram orqali kirish” tugmasini bosing." };
}

/** Kod to'g'ri bo'lsa foydalanuvchini yaratadi (yoki topadi) va sessiya ochadi. */
export async function verifyOtp(phone: string, code: string): Promise<{ ok: true; userId: number } | { ok: false; error: string }> {
  const db = await getDb();
  const [otp] = await db.select().from(s.otpCodes)
    .where(and(eq(s.otpCodes.phone, phone), isNull(s.otpCodes.usedAt), gt(s.otpCodes.expiresAt, new Date())))
    .orderBy(desc(s.otpCodes.createdAt)).limit(1);
  if (!otp) return { ok: false, error: "Kod eskirgan. Yangi kod so‘rang." };
  if (otp.attempts >= OTP_MAX_ATTEMPTS) return { ok: false, error: "Urinishlar tugadi. Yangi kod so‘rang." };
  if (otp.codeHash !== sha(phone + code.trim())) {
    await db.update(s.otpCodes).set({ attempts: otp.attempts + 1 }).where(eq(s.otpCodes.id, otp.id));
    return { ok: false, error: "Kod noto‘g‘ri." };
  }
  await db.update(s.otpCodes).set({ usedAt: new Date() }).where(eq(s.otpCodes.id, otp.id));
  return { ok: true, userId: await loginByPhone(phone) };
}

/**
 * Tasdiqlangan raqam bo'yicha foydalanuvchini topadi yoki yaratadi va sessiya ochadi.
 * Raqam Telegram'ga yuborilgan kod yoki botda "kontakt ulashish" orqali tasdiqlangan bo'lishi shart.
 */
/** Foydalanuvchini raqam bo'yicha topadi yoki yaratadi; Telegram akkauntini bog'laydi (sessiya ochmaydi). */
export async function upsertUserByPhone(phone: string, opts: { telegramId?: string } = {}): Promise<number> {
  const db = await getDb();
  const adminPhones = (process.env.ADMIN_PHONES ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  if (opts.telegramId) {
    // Bitta Telegram akkaunti faqat bitta foydalanuvchiga ulanadi
    await db.update(s.users).set({ telegramId: null }).where(and(eq(s.users.telegramId, opts.telegramId), ne(s.users.phone, phone)));
  }
  const [existing] = await db.select().from(s.users).where(eq(s.users.phone, phone)).limit(1);
  if (existing) {
    const patch = {
      ...(opts.telegramId ? { telegramId: opts.telegramId } : {}),
      ...(adminPhones.includes(phone) && existing.role === "specialist" ? { role: "admin" as const } : {}),
    };
    if (Object.keys(patch).length) await db.update(s.users).set(patch).where(eq(s.users.id, existing.id));
    return existing.id;
  }
  const [u] = await db.insert(s.users).values({
    phone, telegramId: opts.telegramId ?? null, role: adminPhones.includes(phone) ? "admin" : "specialist",
  }).returning();
  return u.id;
}

export async function loginByPhone(phone: string, opts: { telegramId?: string } = {}): Promise<number> {
  const userId = await upsertUserByPhone(phone, opts);
  const db = await getDb();
  await db.update(s.users).set({ lastLoginAt: new Date() }).where(eq(s.users.id, userId));
  // Manba faqat yangi ro'yxatdan o'tganlarga yoziladi (eski akkauntlarga hozirgi tashrif manbasi noto'g'ri bo'ladi)
  const src = (await cookies()).get("xm_src")?.value;
  if (src) await db.update(s.users).set({ signupSource: src.slice(0, 80) })
    .where(and(eq(s.users.id, userId), isNull(s.users.signupSource), gt(s.users.createdAt, new Date(Date.now() - 86_400_000))));
  await createSession(userId);
  return userId;
}

async function createSession(userId: number) {
  const db = await getDb();
  const id = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.insert(s.sessions).values({ id: sha(id), userId, expiresAt });
  (await cookies()).set(COOKIE, id, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", expires: expiresAt,
  });
}

export async function logout() {
  const jar = await cookies();
  const id = jar.get(COOKIE)?.value;
  if (id) {
    const db = await getDb();
    await db.delete(s.sessions).where(eq(s.sessions.id, sha(id)));
  }
  jar.delete(COOKIE);
}

export const getUser = cache(async () => {
  const id = (await cookies()).get(COOKIE)?.value;
  if (!id) return null;
  const db = await getDb();
  const [row] = await db.select({ user: s.users }).from(s.sessions)
    .innerJoin(s.users, eq(s.users.id, s.sessions.userId))
    .where(and(eq(s.sessions.id, sha(id)), gt(s.sessions.expiresAt, new Date()))).limit(1);
  return row?.user ?? null;
});

export async function requireUser(next = "/kabinet") {
  const u = await getUser();
  if (!u) redirect(`/kirish?next=${encodeURIComponent(next)}`);
  return u;
}

export async function requireStaff(minRole: "moderator" | "admin" = "moderator") {
  const u = await requireUser("/admin");
  const ok = minRole === "admin" ? u.role === "admin" : u.role === "admin" || u.role === "moderator";
  if (!ok) redirect("/");
  return u;
}
