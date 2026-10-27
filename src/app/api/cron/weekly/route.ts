import { NextResponse } from "next/server";
import { sendWeeklyLeadReport } from "@/lib/leads";

export const maxDuration = 60;

/** Har shanba 20:00 (Toshkent): haftalik lidlar hisoboti — Google Sheets va adminlarga Telegram. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await sendWeeklyLeadReport());
}
