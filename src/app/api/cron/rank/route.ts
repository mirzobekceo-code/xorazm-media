import { NextResponse } from "next/server";
import { recomputeRanks } from "@/lib/rank";
import { remindStaleBloggerStats, sendWeeklyDigest } from "@/lib/digest";
import { sendBackupToAdmins } from "@/lib/backup";
import { expireRequests } from "@/lib/requests";

export const maxDuration = 60;

/** Bitta vazifa xato bersa ham qolganlari (ayniqsa zaxira) bajarilsin. */
const safe = <T,>(f: () => Promise<T>) => f().catch((e) => ({ error: e instanceof Error ? e.message : String(e) }));

/**
 * Kunlik vazifalar (Vercel Cron yoki tashqi cron): TOP reytingi, bloger statistikasi eslatmasi,
 * dushanba kunlari haftalik statistika, muddati o'tgan so'rovlar va adminlarga zaxira nusxa.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const ranks = await safe(() => recomputeRanks().then(() => "ok"));
  const reminders = await safe(remindStaleBloggerStats);
  // Toshkent vaqti bo'yicha dushanba (UTC+5)
  const isMonday = new Date(Date.now() + 5 * 3_600_000).getUTCDay() === 1;
  const digests = isMonday ? await safe(sendWeeklyDigest) : 0;
  const expired = await safe(expireRequests);
  const backup = await safe(sendBackupToAdmins);
  return NextResponse.json({ ok: true, ranks, reminders, digests, expired, backup });
}
