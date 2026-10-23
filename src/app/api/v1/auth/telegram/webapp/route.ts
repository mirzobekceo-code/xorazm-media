import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { getUser, loginByPhone } from "@/lib/auth";
import { verifyInitData } from "@/lib/telegram";

/**
 * Telegram Mini App ichida avtomatik kirish: Telegram imzolagan initData tekshiriladi.
 * Faqat avval raqamini ulashgan (telegram_id bog'langan) foydalanuvchi kiradi.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { initData?: string } | null;
  const tgUser = verifyInitData(body?.initData ?? "");
  if (!tgUser) return NextResponse.json({ status: "invalid" }, { status: 401 });
  if (await getUser()) return NextResponse.json({ status: "ok" });
  const db = await getDb();
  const [u] = await db.select().from(s.users).where(eq(s.users.telegramId, String(tgUser.id))).limit(1);
  if (!u) return NextResponse.json({ status: "unknown" });
  await loginByPhone(u.phone, { telegramId: String(tgUser.id) });
  return NextResponse.json({ status: "ok" });
}
