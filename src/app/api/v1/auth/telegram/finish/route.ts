import { NextResponse } from "next/server";
import { loginByPhone } from "@/lib/auth";
import { finishToken } from "@/lib/telegram-auth";
import { getOwnProfile } from "@/lib/profiles";

/** Botdagi "Saytga qaytish" tugmasi: shu brauzerda kiritadi va kelgan sahifasiga qaytaradi. */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const t = await finishToken(u.searchParams.get("t") ?? "", u.searchParams.get("s") ?? "");
  if (!t) return NextResponse.redirect(new URL("/kirish?tg=eskirgan", req.url));
  const userId = await loginByPhone(t.phone!, { telegramId: t.telegramId! });
  const back = t.returnPath ?? ((await getOwnProfile(userId)) ? "/kabinet" : "/qoshilish");
  return NextResponse.redirect(new URL(back, req.url));
}
