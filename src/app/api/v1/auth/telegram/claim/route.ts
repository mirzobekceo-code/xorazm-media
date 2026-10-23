import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { getUser, loginByPhone } from "@/lib/auth";
import { claimTelegramToken } from "@/lib/telegram-auth";
import { getOwnProfile } from "@/lib/profiles";

const Body = z.object({ token: z.string().regex(/^[a-f0-9]{32}$/), secret: z.string().regex(/^[a-f0-9]{48}$/) });

/** Brauzer har 2 soniyada so'raydi; tasdiqlangan bo'lsa sessiya ochiladi (kirish) yoki ulanadi (link). */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ status: "expired" }, { status: 400 });
  const r = await claimTelegramToken(parsed.data.token, parsed.data.secret);
  if (r.status !== "confirmed") return NextResponse.json({ status: r.status });

  const t = r.token;
  if (t.purpose === "link") {
    const me = await getUser();
    return NextResponse.json({ status: me && me.id === t.userId ? "ok" : "expired" });
  }
  if (!t.phone || !t.telegramId) return NextResponse.json({ status: "expired" });
  const userId = await loginByPhone(t.phone, { telegramId: t.telegramId });
  const db = await getDb();
  const [u] = await db.select({ role: s.users.role }).from(s.users).where(eq(s.users.id, userId));
  return NextResponse.json({ status: "ok", role: u.role, hasProfile: !!(await getOwnProfile(userId)) });
}
