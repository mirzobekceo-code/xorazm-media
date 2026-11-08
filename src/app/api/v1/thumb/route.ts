import { thumbSource } from "@/lib/limits";

/**
 * Havola-video muqovasi (Instagram Reels, Telegram post). Ularning rasmlari boshqa saytda to'g'ridan-to'g'ri
 * ochilmaydi (Instagram: cross-origin-resource-policy), shuning uchun server rasmni olib, o'zi beradi.
 * Faqat embedFor ruxsat bergan havolalar; javob CDN'da 1 kun keshlanadi. Topilmasa 404 — sahifa rangli kartochka ko'rsatadi.
 */
export const revalidate = 86400;
const MAX_BYTES = 5 * 1024 * 1024;
const notFound = () => new Response(null, { status: 404, headers: { "cache-control": "public, s-maxage=3600" } });

async function imageUrl(src: { kind: "instagram" | "telegram"; url: string }): Promise<string | null> {
  if (src.kind === "instagram") return src.url; // 302 → rasm (fetch o'zi yo'naltirishga ergashadi)
  // Telegram posti: video muqovasi yoki rasm background-image ichida
  const res = await fetch(src.url, { signal: AbortSignal.timeout(5000), next: { revalidate: 86400 } });
  if (!res.ok) return null;
  const html = await res.text();
  const m = html.match(/tgme_widget_message_(?:video_thumb|photo_wrap|roundvideo_thumb)[^>]*background-image:url\('(https:\/\/[^']+)'\)/);
  return m ? m[1] : null;
}

export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("u") ?? "";
  const src = raw.length < 500 ? thumbSource(raw) : null;
  if (!src) return notFound();
  try {
    const url = await imageUrl(src);
    if (!url) return notFound();
    const img = await fetch(url, { signal: AbortSignal.timeout(6000) });
    const type = img.headers.get("content-type") ?? "";
    if (!img.ok || !type.startsWith("image/")) return notFound();
    const buf = await img.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) return notFound();
    return new Response(buf, {
      headers: { "content-type": type, "cache-control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800", "x-robots-tag": "noindex" },
    });
  } catch {
    return notFound();
  }
}
