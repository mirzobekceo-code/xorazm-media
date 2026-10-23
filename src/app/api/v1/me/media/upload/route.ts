import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getUser } from "@/lib/auth";
import { getOwnProfile } from "@/lib/profiles";
import { videoMaxBytes } from "@/lib/storage";
import { uploadLimits } from "@/lib/limits";

/**
 * Videoni brauzerdan to'g'ridan-to'g'ri Vercel Blob'ga yuklash uchun token beradi
 * (server orqali 4.5 MB dan katta fayl o'tmaydi). Yozuv bazaga registerVideoAction orqali tushadi.
 */
export async function POST(req: Request) {
  const body = (await req.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        const user = await getUser();
        const profile = user && (await getOwnProfile(user.id));
        if (!profile) throw new Error("Avval kiring");
        if (!pathname.startsWith(`uploads/p/${profile.id}/`)) throw new Error("Noto‘g‘ri yo‘l");
        if (uploadLimits().videos === 0) throw new Error("Video yuklash o‘chirilgan — havola qo‘shing");
        return { allowedContentTypes: ["video/mp4", "video/quicktime"], maximumSizeInBytes: videoMaxBytes(), addRandomSuffix: true };
      },
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(json);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Yuklab bo‘lmadi" }, { status: 400 });
  }
}
