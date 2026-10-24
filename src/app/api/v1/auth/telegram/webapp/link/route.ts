import { NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { getUser } from "@/lib/auth";
import { verifyInitData } from "@/lib/telegram";

/** Mini App ichida kabinetdan "Telegramni ulash": imzolangan initData'dagi akkaunt joriy foydalanuvchiga bog'lanadi. */
export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ status: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { initData?: string } | null;
  const tgUser = verifyInitData(body?.initData ?? "");
  if (!tgUser) return NextResponse.json({ status: "invalid" }, { status: 401 });
  const db = await getDb();
  const tgId = String(tgUser.id);
  await db.update(s.users).set({ telegramId: null }).where(and(eq(s.users.telegramId, tgId), ne(s.users.id, user.id)));
  await db.update(s.users).set({ telegramId: tgId }).where(eq(s.users.id, user.id));
  return NextResponse.json({ status: "ok" });
}
