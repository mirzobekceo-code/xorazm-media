import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";
import { put as blobPut, del as blobDel } from "@vercel/blob";
import { uploadLimits } from "./limits";

/**
 * Fayl xotirasi. BLOB_READ_WRITE_TOKEN bo'lsa Vercel Blob (production),
 * aks holda lokal disk (public/uploads) — dev uchun.
 */
const ROOT = path.join(process.cwd(), "public", "uploads");
const useBlob = () => !!process.env.BLOB_READ_WRITE_TOKEN;

export const IMAGE_MAX = 10 * 1024 * 1024;
export const videoMaxBytes = () => uploadLimits().videoMb * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const VIDEO_TYPES = ["video/mp4", "video/quicktime"];

export function kindOf(file: File): "image" | "video" | null {
  if (IMAGE_TYPES.includes(file.type)) return "image";
  if (VIDEO_TYPES.includes(file.type)) return "video";
  return null;
}

async function put(rel: string, data: Buffer, contentType: string) {
  if (useBlob()) {
    const res = await blobPut(`uploads/${rel}`, data, { access: "public", contentType, addRandomSuffix: false });
    return res.url;
  }
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
    url: await put(`p/${profileId}/${id}.webp`, full, "image/webp"),
    thumbUrl: await put(`p/${profileId}/${id}-t.webp`, thumb, "image/webp"),
    sizeBytes: full.length + thumb.length,
  };
}

export async function saveVideo(profileId: number, file: File) {
  const { videoMb } = uploadLimits();
  if (file.size > videoMaxBytes()) throw new Error(`Video ${videoMb} MB dan katta`);
  const ext = file.type === "video/quicktime" ? "mov" : "mp4";
  const id = crypto.randomBytes(8).toString("hex");
  return { url: await put(`p/${profileId}/${id}.${ext}`, Buffer.from(await file.arrayBuffer()), file.type), thumbUrl: null, sizeBytes: file.size };
}

export async function removeFile(url: string | null) {
  if (!url) return;
  if (url.startsWith("https://") && url.includes(".blob.vercel-storage.com/")) {
    if (useBlob()) await blobDel(url).catch(() => {});
    return;
  }
  if (!url.startsWith("/uploads/")) return;
  await fs.rm(path.join(ROOT, url.slice("/uploads/".length)), { force: true });
}
