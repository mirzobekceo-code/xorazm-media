import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";

/**
 * Fayl xotirasi. Hozir lokal disk (public/uploads); production'da S3/Supabase Storage
 * adapteri shu ikki funksiya imzosini saqlagan holda almashtiriladi.
 */
const ROOT = path.join(process.cwd(), "public", "uploads");

export const IMAGE_MAX = 10 * 1024 * 1024;
export const VIDEO_MAX = 100 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const VIDEO_TYPES = ["video/mp4", "video/quicktime"];

export function kindOf(file: File): "image" | "video" | null {
  if (IMAGE_TYPES.includes(file.type)) return "image";
  if (VIDEO_TYPES.includes(file.type)) return "video";
  return null;
}

async function put(rel: string, data: Buffer) {
  const abs = path.join(ROOT, rel);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, data);
  return `/uploads/${rel}`;
}

/** Rasmni WEBP'ga o'giradi, EXIF (GPS) ni olib tashlaydi, ikki o'lcham saqlaydi. */
export async function saveImage(profileId: number, file: File) {
  if (file.size > IMAGE_MAX) throw new Error("Rasm 10 MB dan katta");
  const input = Buffer.from(await file.arrayBuffer());
  const id = crypto.randomBytes(8).toString("hex");
  const base = sharp(input, { failOn: "none" }).rotate(); // rotate() EXIF orientatsiyani qo'llaydi; metadata saqlanmaydi
  const [full, thumb] = await Promise.all([
    base.clone().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer(),
    base.clone().resize({ width: 600, height: 760, fit: "cover" }).webp({ quality: 78 }).toBuffer(),
  ]);
  return {
    url: await put(`p/${profileId}/${id}.webp`, full),
    thumbUrl: await put(`p/${profileId}/${id}-t.webp`, thumb),
  };
}

export async function saveVideo(profileId: number, file: File) {
  if (file.size > VIDEO_MAX) throw new Error("Video 100 MB dan katta");
  const ext = file.type === "video/quicktime" ? "mov" : "mp4";
  const id = crypto.randomBytes(8).toString("hex");
  return { url: await put(`p/${profileId}/${id}.${ext}`, Buffer.from(await file.arrayBuffer())), thumbUrl: null };
}

export async function removeFile(url: string | null) {
  if (!url?.startsWith("/uploads/")) return;
  await fs.rm(path.join(ROOT, url.slice("/uploads/".length)), { force: true });
}
