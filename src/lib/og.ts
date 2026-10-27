import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

/** Muqova rasmini (webp) satori o'qiy oladigan JPEG data URL'ga aylantiradi. */
export async function coverData(url: string | undefined, width: number, height: number): Promise<string | null> {
  if (!url) return null;
  try {
    const buf = url.startsWith("/")
      ? await fs.readFile(path.join(process.cwd(), "public", url))
      : Buffer.from(await (await fetch(url)).arrayBuffer());
    const jpg = await sharp(buf).resize(width, height, { fit: "cover", position: "attention" }).jpeg({ quality: 82 }).toBuffer();
    return `data:image/jpeg;base64,${jpg.toString("base64")}`;
  } catch {
    return null;
  }
}

