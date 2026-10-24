import { NextResponse, type NextRequest } from "next/server";

/** Layout'dagi reklama sahifa kontekstini (kasb) bilishi uchun so'rov manzilini uzatadi. */
export function middleware(req: NextRequest) {
  const headers = new Headers(req.headers);
  headers.set("x-url", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: ["/((?!api|_next|uploads|hero|brand|favicon|icon).*)"] };
