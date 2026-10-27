import { NextResponse, type NextRequest } from "next/server";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "";

export function middleware(req: NextRequest) {
  // Production'dagi *.vercel.app manzillari asosiy domenga o'tadi (preview deploylar va /api — bot webhook'i — tegilmaydi)
  const host = req.headers.get("host") ?? "";
  if (process.env.VERCEL_ENV === "production" && host.endsWith(".vercel.app") && SITE.startsWith("https://") && !SITE.includes(host)) {
    return NextResponse.redirect(new URL(req.nextUrl.pathname + req.nextUrl.search, SITE), 308);
  }
  // Layout'dagi reklama sahifa kontekstini (kasb) bilishi uchun so'rov manzilini uzatadi
  const headers = new Headers(req.headers);
  headers.set("x-url", req.nextUrl.pathname + req.nextUrl.search);
  const res = NextResponse.next({ request: { headers } });
  // Birinchi tashrif manbasi (30 kun): utm_source, kelgan sayt yoki "direct" — ro'yxatdan o'tganda users.signup_source'ga yoziladi
  if (!req.cookies.has("xm_src")) {
    const utm = req.nextUrl.searchParams.get("utm_source");
    let ref = "";
    try { ref = new URL(req.headers.get("referer") ?? "").hostname.replace(/^www\./, ""); } catch { /* yo'q */ }
    const own = SITE && ref && SITE.includes(ref);
    const src = (utm || (ref && !own ? ref : "") || "direct").toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 60) || "direct";
    res.cookies.set("xm_src", src, { maxAge: 30 * 86_400, sameSite: "lax", path: "/" });
  }
  return res;
}

export const config = { matcher: ["/((?!api|_next|uploads|hero|brand|favicon|icon).*)"] };
