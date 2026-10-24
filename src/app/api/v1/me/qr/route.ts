import QRCode from "qrcode";
import { getUser } from "@/lib/auth";
import { getOwnProfile } from "@/lib/profiles";
import { SITE } from "@/lib/site";

/** O'z profilining QR-kodi (?s=qr belgisi bilan — skanerlashlar statistikada alohida ko'rinadi). */
export async function GET(req: Request) {
  const user = await getUser();
  const p = user && (await getOwnProfile(user.id));
  if (!p) return new Response("Avval kiring", { status: 401 });
  const url = `${SITE.url}/m/${p.slug}?s=qr`;
  const opts = { margin: 2, color: { dark: "#0f1615", light: "#ffffff" }, errorCorrectionLevel: "M" as const };
  const download = new URL(req.url).searchParams.get("download") === "1";
  const headers: Record<string, string> = { "cache-control": "private, no-store" };
  if (new URL(req.url).searchParams.get("format") === "svg") {
    return new Response(await QRCode.toString(url, { ...opts, type: "svg" }), { headers: { ...headers, "content-type": "image/svg+xml" } });
  }
  const png = await QRCode.toBuffer(url, { ...opts, width: 1024 });
  if (download) headers["content-disposition"] = `attachment; filename="${p.slug}-qr.png"`;
  return new Response(new Uint8Array(png), { headers: { ...headers, "content-type": "image/png" } });
}
