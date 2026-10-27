import { NextResponse } from "next/server";
import { createTelegramToken } from "@/lib/telegram-auth";
import { clientIp, rateLimit } from "@/lib/http";

/** Telegram orqali kirish tokeni: brauzer botga deep link ochadi va natijani /claim orqali kutadi. */
export async function POST(req: Request) {
  if (!rateLimit(`tg-login:${await clientIp()}`, 10, 600_000)) {
    return NextResponse.json({ error: "Juda ko‘p urinish. Birozdan keyin qayta urinib ko‘ring." }, { status: 429 });
  }
  // Qaytish manzili: tasdiqlangach botdagi "Saytga qaytish" tugmasi shu sahifaga olib boradi
  const body = (await req.json().catch(() => null)) as { next?: string } | null;
  const t = await createTelegramToken("login", undefined, body?.next);
  if (!t) return NextResponse.json({ error: "Telegram orqali kirish hozircha ishlamayapti." }, { status: 503 });
  return NextResponse.json(t, { headers: { "cache-control": "no-store" } });
}
