import crypto from "node:crypto";
import { mcpAuthorized } from "@/lib/mcp-auth";
import { loginConfigured, loginUrl } from "@/lib/meta-token";

/** "Facebook orqali ulash": maxfiy kalitli manzil → Meta login sahifasi. */
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  if (!mcpAuthorized((await params).key)) return new Response("Not found", { status: 404 });
  if (!loginConfigured()) {
    return new Response("Vercel'da META_APP_ID va META_APP_SECRET o'zgaruvchilari yo'q.", { status: 500, headers: { "content-type": "text/plain; charset=utf-8" } });
  }
  const state = crypto.randomBytes(24).toString("base64url");
  return new Response(null, {
    status: 302,
    headers: {
      location: loginUrl(state),
      "set-cookie": `meta_oauth_state=${state}; Path=/api/meta-callback; Max-Age=600; HttpOnly; Secure; SameSite=Lax`,
      "cache-control": "no-store",
    },
  });
}
