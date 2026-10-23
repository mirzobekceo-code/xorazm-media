import { NextResponse } from "next/server";
import { createTelegramToken } from "@/lib/telegram-auth";
import { clientIp, rateLimit } from "@/lib/http";

/** Telegram orqali kirish tokeni: brauzer botga deep link ochadi va natijani /claim orqali kutadi. */
export async function POST() {
  if (!rateLimit(`tg-login:${await clientIp()}`, 10, 600_000)) {
    return NextResponse.json({ error: "Juda ko‘p urinish. Birozdan keyin qayta urinib ko‘ring." }, { status: 429 });
  }
  const t = await createTelegramToken("login");
  if (!t) return NextResponse.json({ error: "Telegram orqali kirish hozircha ishlamayapti." }, { status: 503 });
  return NextResponse.json(t, { headers: { "cache-control": "no-store" } });
}
