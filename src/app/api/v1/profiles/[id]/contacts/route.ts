import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getContacts } from "@/lib/queries";
import { clientIp, rateLimit } from "@/lib/http";
import { getUser } from "@/lib/auth";
import { recordContactLead } from "@/lib/leads";

/**
 * Mutaxassis kontaktlari faqat kirgan (Telegram orqali raqami tasdiqlangan) foydalanuvchiga.
 * Kim qaysi mutaxassis kontaktini ochgani lid sifatida yoziladi.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!rateLimit(`contacts:${await clientIp()}`, 30, 60_000)) {
    return NextResponse.json({ error: "Juda ko‘p so‘rov. Bir daqiqadan keyin urinib ko‘ring." }, { status: 429 });
  }
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "login_required" }, { status: 401, headers: { "cache-control": "private, no-store" } });
  const c = await getContacts(id);
  if (!c) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const src = new URL(req.url).searchParams.get("src") || (await cookies()).get("xm_src")?.value || null;
  await recordContactLead(user, id, src).catch((e) => console.error("lead", e));
  return NextResponse.json(c, { headers: { "cache-control": "private, no-store", "x-robots-tag": "noindex" } });
}
