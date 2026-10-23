import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema as s } from "@/db";
import { clientIp, rateLimit } from "@/lib/http";
import { REPORT_REASONS } from "@/lib/reference";
import { notifyStaff } from "@/lib/telegram";

const Body = z.object({
  profileId: z.number().int(),
  reason: z.enum(REPORT_REASONS as [string, ...string[]]),
  text: z.string().max(1000).optional().nullable(),
  website: z.string().optional().nullable(), // honeypot
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  if (parsed.data.website) return new NextResponse(null, { status: 204 });
  if (!rateLimit(`report:${await clientIp()}`, 5, 3_600_000)) return NextResponse.json({ error: "limit" }, { status: 429 });
  const db = await getDb();
  const [p] = await db.select({ id: s.profiles.id, name: s.profiles.fullName }).from(s.profiles).where(eq(s.profiles.id, parsed.data.profileId)).limit(1);
  if (!p) return NextResponse.json({ error: "not_found" }, { status: 404 });
  await db.insert(s.reports).values({ profileId: p.id, reason: parsed.data.reason, text: parsed.data.text ?? "" });
  await notifyStaff(`Yangi shikoyat: ${p.name} — ${parsed.data.reason}`);
  return new NextResponse(null, { status: 204 });
}
