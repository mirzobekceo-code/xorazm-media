import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { isBot } from "@/lib/http";
import { SITE } from "@/lib/site";

/** Reklama bosishini yozib, UTM teglari bilan manzilga yo'naltiradi. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const slot = new URL(req.url).searchParams.get("s")?.slice(0, 8) ?? "?";
  const db = await getDb();
  const [c] = Number.isInteger(id) ? await db.select().from(s.adCreatives).where(eq(s.adCreatives.id, id)).limit(1) : [];
  if (!c) return NextResponse.redirect(new URL("/", SITE.url));
  if (!isBot(req.headers.get("user-agent"))) {
    await db.insert(s.adEvents).values({ creativeId: id, slot, type: "click", page: req.headers.get("referer")?.slice(0, 200) ?? null }).catch(() => {});
  }
  let target: URL;
  try { target = new URL(c.url); } catch { return NextResponse.redirect(new URL("/", SITE.url)); }
  if (target.protocol.startsWith("http")) {
    target.searchParams.set("utm_source", "xorazm-media");
    target.searchParams.set("utm_medium", "banner");
    target.searchParams.set("utm_campaign", String(c.campaignId));
    target.searchParams.set("utm_content", `${slot}-${c.id}`);
  }
  return NextResponse.redirect(target, 302);
}
