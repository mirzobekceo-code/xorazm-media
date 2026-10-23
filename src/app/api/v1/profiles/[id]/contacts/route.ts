import { NextResponse } from "next/server";
import { getContacts } from "@/lib/queries";
import { clientIp, rateLimit } from "@/lib/http";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!rateLimit(`contacts:${await clientIp()}`, 30, 60_000)) {
    return NextResponse.json({ error: "Juda ko‘p so‘rov. Bir daqiqadan keyin urinib ko‘ring." }, { status: 429 });
  }
  const c = await getContacts(id);
  if (!c) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(c, { headers: { "cache-control": "private, no-store", "x-robots-tag": "noindex" } });
}
