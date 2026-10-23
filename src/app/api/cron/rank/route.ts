import { NextResponse } from "next/server";
import { recomputeRanks } from "@/lib/rank";

/** Har soatda: TOP reytingini qayta hisoblash (Vercel Cron yoki tashqi cron). */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await recomputeRanks();
  return NextResponse.json({ ok: true });
}
