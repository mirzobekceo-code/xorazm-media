import fs from "node:fs/promises";
import path from "node:path";

/** Lokal xotiradagi fayllarni beradi (next start build'dan keyin public/ ga qo'shilgan fayllarni bermaydi). */
const ROOT = path.join(process.cwd(), "public", "uploads");
const TYPES: Record<string, string> = { ".webp": "image/webp", ".mp4": "video/mp4", ".mov": "video/quicktime" };

export async function GET(_: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const rel = (await params).path.join("/");
  const abs = path.join(ROOT, rel);
  if (!abs.startsWith(ROOT + path.sep)) return new Response(null, { status: 404 });
  try {
    const data = await fs.readFile(abs);
    return new Response(new Uint8Array(data), {
      headers: { "content-type": TYPES[path.extname(abs)] ?? "application/octet-stream", "cache-control": "public, max-age=31536000, immutable" },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
