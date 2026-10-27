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
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: ["/((?!api|_next|uploads|hero|brand|favicon|icon).*)"] };
