import { sendBackupToAdmins } from "@/lib/backup";
import { pushToSheets } from "@/lib/leads";
import { NextResponse } from "next/server";
import crypto from "node:crypto";
import sharp from "sharp";
import { and, eq, notLike } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import {
  cfCheck, cfEnabled, createVideoUpload, deleteImage, deleteVideo, ensureImageVariants, uploadImage, videoStatus,
} from "@/lib/cloudflare";
import { removeFile } from "@/lib/storage";

/**
 * Xizmat diagnostikasi va bir martalik amallar (faqat HEALTH_SECRET bilan; kalitsiz — 404).
 *   ?action=check            Cloudflare token va ruxsatlari
 *   ?action=setup            rasm variantlarini yaratish
 *   ?action=image-test       sinov rasmini yuklab, o'chirish
 *   ?action=video-create     sinov videosi uchun yuklash manzili
 *   ?action=video-status&uid=…  /  ?action=video-delete&uid=…
 *   ?action=sheets           Google Sheets ulanishini sinash (bitta sinov qatori)
 *   ?action=migrate&n=10     Blob'dagi rasmlarni Cloudflare Images'ga ko'chirish
 */
export async function GET(req: Request) {
  const want = process.env.HEALTH_SECRET ?? "";
  const url = new URL(req.url);
  const got = req.headers.get("x-health-key") ?? url.searchParams.get("key") ?? "";
  if (!want || got.length !== want.length || !crypto.timingSafeEqual(Buffer.from(got), Buffer.from(want))) {
    return new NextResponse(null, { status: 404 });
  }
  const action = url.searchParams.get("action") ?? "check";
  try {
    if (action === "backup") return NextResponse.json(await sendBackupToAdmins());
    if (action === "sheets") {
      // Ulanish tekshiruvi: "Haftalik" varag'iga bitta belgilangan sinov qatori
      const row = [new Date().toISOString().slice(0, 16).replace("T", " "), "SINOV", "", "", "", "", "", "", "diag", "Ulanish tekshiruvi — bu qatorni o‘chirib yuborishingiz mumkin"];
      return NextResponse.json({ configured: !!process.env.GOOGLE_SHEETS_WEBHOOK_URL, ok: await pushToSheets("weekly", [row]) });
    }
    if (action === "check") return NextResponse.json(await cfCheck());
    if (!cfEnabled()) return NextResponse.json({ error: "Cloudflare o'chiq (CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN yo'q)" }, { status: 400 });
    if (action === "setup") return NextResponse.json({ created: await ensureImageVariants() });
    if (action === "image-test") {
      await ensureImageVariants();
      const png = await sharp({ create: { width: 800, height: 1000, channels: 3, background: "#3cc2cb" } }).webp().toBuffer();
      const r = await uploadImage(png, "diag-test.webp", { test: "1" });
      const [full, thumb] = await Promise.all([r.url, r.thumbUrl].map((u) => fetch(u).then((x) => `${x.status} ${x.headers.get("content-type")}`)));
      await deleteImage(r.id);
      return NextResponse.json({ uploaded: r, full, thumb, deleted: true });
    }
    if (action === "video-create") return NextResponse.json(await createVideoUpload(60, { test: "1" }));
    const uid = url.searchParams.get("uid") ?? "";
    if (action === "video-status") return NextResponse.json(await videoStatus(uid));
    if (action === "video-delete") { await deleteVideo(uid); return NextResponse.json({ deleted: uid }); }
    if (action === "migrate") {
      const n = Math.min(50, Number(url.searchParams.get("n") ?? 10));
      const db = await getDb();
      const rows = await db.select().from(s.media)
        .where(and(eq(s.media.type, "image"), notLike(s.media.url, "https://imagedelivery.net/%"))).limit(n);
      await ensureImageVariants();
      const done: { id: number; ok: boolean; error?: string }[] = [];
      for (const m of rows) {
        try {
          if (!m.url.startsWith("https://")) throw new Error("ochiq https manzil emas");
          const buf = Buffer.from(await (await fetch(m.url)).arrayBuffer());
          const webp = await sharp(buf).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
          const r = await uploadImage(webp, `${m.profileId}-${m.id}.webp`, { profileId: String(m.profileId), migrated: "1" });
          await db.update(s.media).set({ url: r.url, thumbUrl: r.thumbUrl, sizeBytes: webp.length }).where(eq(s.media.id, m.id));
          await Promise.all([removeFile(m.url), removeFile(m.thumbUrl)]);
          done.push({ id: m.id, ok: true });
        } catch (e) {
          done.push({ id: m.id, ok: false, error: e instanceof Error ? e.message : String(e) });
        }
      }
      return NextResponse.json({ processed: done.length, done });
    }
    return NextResponse.json({ error: "noma'lum action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
