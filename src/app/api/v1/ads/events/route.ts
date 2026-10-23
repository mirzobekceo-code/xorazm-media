import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, schema as s } from "@/db";
import { clientIp, isBot, rateLimit } from "@/lib/http";

const Body = z.object({
  events: z.array(z.object({ creativeId: z.number().int(), slot: z.string().max(8), page: z.string().max(200) })).max(20),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new NextResponse(null, { status: 400 });
  if (isBot(req.headers.get("user-agent")) || !rateLimit(`adimp:${await clientIp()}`, 120, 60_000)) {
    return new NextResponse(null, { status: 204 });
  }
  const db = await getDb();
  if (parsed.data.events.length) {
    await db.insert(s.adEvents).values(parsed.data.events.map((e) => ({ ...e, type: "impression" as const }))).catch(() => {});
  }
  return new NextResponse(null, { status: 204 });
}
