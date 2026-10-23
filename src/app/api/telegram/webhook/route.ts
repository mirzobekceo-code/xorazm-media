import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { handleUpdate, type Update } from "@/lib/bot";
import { botEnabled, webhookSecret } from "@/lib/telegram";

/** Telegram bot webhook. setWebhook paytida berilgan secret_token bilan himoyalangan. */
export async function POST(req: Request) {
  if (!botEnabled()) return new NextResponse(null, { status: 404 });
  const got = req.headers.get("x-telegram-bot-api-secret-token") ?? "";
  const want = webhookSecret();
  if (got.length !== want.length || !crypto.timingSafeEqual(Buffer.from(got), Buffer.from(want))) {
    return new NextResponse(null, { status: 401 });
  }
  const update = (await req.json().catch(() => null)) as Update | null;
  if (update) {
    // Xato bo'lsa ham 200: aks holda Telegram bir xil xabarni qayta-qayta yuboradi
    await handleUpdate(update).catch((e) => console.error("bot", e));
  }
  return NextResponse.json({ ok: true });
}
