import { NextResponse } from "next/server";
import { recomputeRanks } from "@/lib/rank";
import { remindStaleBloggerStats, sendWeeklyDigest } from "@/lib/digest";

/**
 * Kunlik vazifalar (Vercel Cron yoki tashqi cron): TOP reytingi, bloger statistikasi eslatmasi,
 * dushanba kunlari haftalik statistika.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await recomputeRanks();
  const reminders = await remindStaleBloggerStats();
  // Toshkent vaqti bo'yicha dushanba (UTC+5)
  const isMonday = new Date(Date.now() + 5 * 3_600_000).getUTCDay() === 1;
  const digests = isMonday ? await sendWeeklyDigest() : 0;
  return NextResponse.json({ ok: true, reminders, digests });
}
