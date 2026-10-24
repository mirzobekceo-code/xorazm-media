import { NextResponse } from "next/server";
import { and, eq, gt } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema as s } from "@/db";
import { isBot, sessionHash } from "@/lib/http";

const Body = z.object({
  type: z.enum(["view", "contact_click"]),
  channel: z.enum(["phone", "telegram", "instagram"]).optional(),
  source: z.enum(["catalog", "ig", "qr", "tg", "wa", "link", "direct", "other"]).optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!Number.isInteger(id) || !parsed.success) return new NextResponse(null, { status: 400 });
  if (isBot(req.headers.get("user-agent"))) return new NextResponse(null, { status: 204 });

  const db = await getDb();
  const hash = await sessionHash();
  const { type, channel, source } = parsed.data;
  // Bir sessiyadan 30 daqiqa ichidagi takror hisoblanmaydi
  const [dup] = await db.select({ id: s.events.id }).from(s.events).where(and(
    eq(s.events.profileId, id), eq(s.events.type, type), eq(s.events.sessionHash, hash),
    gt(s.events.createdAt, new Date(Date.now() - 30 * 60_000)),
    ...(channel ? [eq(s.events.channel, channel)] : []),
  )).limit(1);
  if (!dup) {
    await db.insert(s.events).values({ profileId: id, type, channel: channel ?? null, source: source ?? null, sessionHash: hash }).catch(() => {});
  }
  return new NextResponse(null, { status: 204 });
}
