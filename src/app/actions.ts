"use server";
import { portfolioRule, VIDEO_SECONDS, videoLimit } from "@/lib/portfolio-rules";
import { cfEnabled, cfRef, createVideoUpload, videoStatus } from "@/lib/cloudflare";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, count, desc, eq } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { getUser, logout, sendOtp, verifyOtp } from "@/lib/auth";
import { normalizePhone } from "@/lib/format";
import { clientIp, rateLimit } from "@/lib/http";
import { firstError, ProfileInput, type ProfileInputT } from "@/lib/profile-input";
import { getOwnProfile, submitForReview, upsertProfile } from "@/lib/profiles";
import { kindOf, removeFile, saveImage, saveVideo } from "@/lib/storage";
import { uploadLimits, type UploadLimits } from "@/lib/limits";
import { head } from "@vercel/blob";
import { createTelegramToken } from "@/lib/telegram-auth";
import { closeRequest, createRequest, RequestInput, respondToRequest, type RequestInputT } from "@/lib/requests";

/** Video qayerga yuklanadi: Cloudflare Stream (cfVideo) yoki to'g'ridan-to'g'ri Blob (directVideo). */
export async function uploadModeAction(): Promise<{ directVideo: boolean; cfVideo: boolean; profileId: number | null; limits: UploadLimits }> {
  const user = await getUser();
  const p = user && (await getOwnProfile(user.id));
  return { directVideo: !!process.env.BLOB_READ_WRITE_TOKEN, cfVideo: cfEnabled(), profileId: p?.id ?? null, limits: uploadLimits() };
}

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

export async function requestCodeAction(rawPhone: string): Promise<Result<{ channel: "bot" | "gateway" | "dev" }>> {
  const phone = normalizePhone(rawPhone);
  if (!phone) return { ok: false, error: "Telefon raqamini +998 XX XXX XX XX ko‘rinishida yozing" };
  if (!rateLimit(`otp-ip:${await clientIp()}`, 10, 3_600_000)) return { ok: false, error: "Juda ko‘p urinish. Keyinroq qayta urinib ko‘ring." };
  return sendOtp(phone);
}

export async function verifyCodeAction(rawPhone: string, code: string): Promise<Result<{ hasProfile: boolean; role: string }>> {
  const phone = normalizePhone(rawPhone);
  if (!phone || !/^\d{6}$/.test(code.trim())) return { ok: false, error: "6 xonali kodni kiriting" };
  const r = await verifyOtp(phone, code);
  if (!r.ok) return r;
  const db = await getDb();
  const [u] = await db.select({ role: s.users.role }).from(s.users).where(eq(s.users.id, r.userId)).limit(1);
  return { ok: true, hasProfile: !!(await getOwnProfile(r.userId)), role: u.role };
}

export async function saveProfileAction(input: ProfileInputT): Promise<Result<{ profileId: number }>> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Telefon raqamingizni tasdiqlang" };
  const parsed = ProfileInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  // revalidatePath yo'q: joriy sahifa qayta render bo'lsa forma holati yo'qoladi; kabinet baribir dinamik
  return upsertProfile(user.id, user.phone, parsed.data);
}


export async function uploadMediaAction(form: FormData): Promise<Result<{ id: number; url: string; thumbUrl: string | null; type: "image" | "video" }>> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Avval kiring" };
  const profile = await getOwnProfile(user.id);
  if (!profile) return { ok: false, error: "Avval profil ma’lumotlarini saqlang" };
  const file = form.get("file");
  const isStat = form.get("stat") === "1";
  /** Saytdagi profil rasmi: bittagina, yangisi eskisining o'rniga keladi */
  const isCover = form.get("cover") === "1" && !isStat;
  if (!(file instanceof File) || !file.size) return { ok: false, error: "Fayl tanlanmadi" };
  const kind = kindOf(file);
  if (!kind || ((isStat || isCover) && kind !== "image")) return { ok: false, error: "Faqat JPG, PNG, WEBP, HEIC rasm yoki MP4, MOV video" };

  const db = await getDb();
  const [{ n }] = await db.select({ n: count() }).from(s.media).where(and(
    eq(s.media.profileId, profile.id), eq(s.media.isStatScreenshot, isStat), ...(isStat ? [] : [eq(s.media.type, kind)]),
  ));
  const L = uploadLimits();
  if (kind === "video" && L.videos === 0) return { ok: false, error: "Video yuklash hozircha o‘chirilgan — YouTube yoki Instagram havolasini qo‘shing" };
  const [pr] = await db.select({ slug: s.professions.slug }).from(s.professions).where(eq(s.professions.id, profile.professionId));
  const limit = isStat ? L.screenshots : kind === "image" ? Math.max(L.images, portfolioRule(pr?.slug ?? "").minWorks + 1) : L.videos;
  if (n >= limit && !isCover) return { ok: false, error: `Ko‘pi bilan ${limit} ta ${isStat ? "skrinshot" : kind === "image" ? "rasm" : "video"}` };

  try {
    const saved = kind === "image" ? await saveImage(profile.id, file) : await saveVideo(profile.id, file);
    if (isCover) {
      // Eski profil rasmi o'chiriladi (fayli bilan)
      const old = await db.delete(s.media).where(and(eq(s.media.profileId, profile.id), eq(s.media.isCover, true))).returning();
      await Promise.all(old.flatMap((m) => [removeFile(m.url), removeFile(m.thumbUrl)]));
    }
    const [row] = await db.insert(s.media).values({
      profileId: profile.id, type: kind, url: saved.url, thumbUrl: saved.thumbUrl, sizeBytes: saved.sizeBytes, isStatScreenshot: isStat,
      isCover, sortOrder: isCover ? -1 : n,
    }).returning();
    if (isStat) {
      // Skrinshot oxirgi statistika qatoriga ham yoziladi — moderator shu bilan solishtiradi
      const [last] = await db.select().from(s.bloggerStats).where(eq(s.bloggerStats.profileId, profile.id)).orderBy(desc(s.bloggerStats.createdAt)).limit(1);
      if (last) await db.update(s.bloggerStats).set({ screenshots: [...last.screenshots, saved.url] }).where(eq(s.bloggerStats.id, last.id));
    }
    return { ok: true, id: row.id, url: row.url, thumbUrl: row.thumbUrl, type: kind };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Fayl saqlanmadi" };
  }
}

/** Portfolio havolalari (Instagram, YouTube…) — 5-qadamda, ixtiyoriy. */
export async function saveLinksAction(raw: string): Promise<Result> {
  const user = await getUser();
  const profile = user && (await getOwnProfile(user.id));
  if (!profile) return { ok: false, error: "Ruxsat yo‘q" };
  const parsed = ProfileInput.shape.videoLinks.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const db = await getDb();
  await db.update(s.profiles).set({ videoLinks: parsed.data, updatedAt: new Date() }).where(eq(s.profiles.id, profile.id));
  return { ok: true };
}

/** Brauzerdan Blob'ga yuklangan videoni profilga yozadi. */
export async function registerVideoAction(url: string): Promise<Result<{ id: number; url: string; thumbUrl: string | null; type: "image" | "video" }>> {
  const user = await getUser();
  const profile = user && (await getOwnProfile(user.id));
  if (!profile) return { ok: false, error: "Avval kiring" };
  let u: URL;
  try { u = new URL(url); } catch { return { ok: false, error: "Noto‘g‘ri manzil" }; }
  if (!u.hostname.endsWith(".public.blob.vercel-storage.com") || !u.pathname.startsWith(`/uploads/p/${profile.id}/`)) {
    return { ok: false, error: "Noto‘g‘ri manzil" };
  }
  const db = await getDb();
  const [{ n }] = await db.select({ n: count() }).from(s.media).where(and(eq(s.media.profileId, profile.id), eq(s.media.type, "video")));
  const L = uploadLimits();
  if (n >= L.videos) { await removeFile(url); return { ok: false, error: `Ko‘pi bilan ${L.videos} ta video` }; }
  const size = await head(url).then((h) => h.size, () => 0);
  const [row] = await db.insert(s.media).values({ profileId: profile.id, type: "video", url, sizeBytes: size, sortOrder: n }).returning();
  return { ok: true, id: row.id, url: row.url, thumbUrl: null, type: "video" };
}

/**
 * Cloudflare Stream: bazada video yozuvini ochadi va brauzer to'g'ridan-to'g'ri yuklashi uchun bir martalik manzil beradi.
 * Davomiylik limitini Cloudflare o'zi ham tekshiradi (maxDurationSeconds).
 */
export async function createVideoUploadAction(): Promise<Result<{ id: number; uploadURL: string; url: string; thumbUrl: string }>> {
  if (!cfEnabled()) return { ok: false, error: "Video yuklash hozircha o‘chirilgan — havola qo‘shing" };
  const user = await getUser();
  const profile = user && (await getOwnProfile(user.id));
  if (!profile) return { ok: false, error: "Avval profil ma’lumotlarini saqlang" };
  const db = await getDb();
  const [pr] = await db.select({ slug: s.professions.slug }).from(s.professions).where(eq(s.professions.id, profile.professionId));
  const limit = videoLimit(pr?.slug);
  const [{ n }] = await db.select({ n: count() }).from(s.media).where(and(eq(s.media.profileId, profile.id), eq(s.media.type, "video")));
  if (n >= limit) return { ok: false, error: `Ko‘pi bilan ${limit} ta video` };
  if (!rateLimit(`video:${profile.id}`, 10, 3_600_000)) return { ok: false, error: "Juda ko‘p urinish. Birozdan keyin qayta urinib ko‘ring." };
  const up = await createVideoUpload(VIDEO_SECONDS, { profileId: String(profile.id) });
  const [row] = await db.insert(s.media).values({ profileId: profile.id, type: "video", url: up.url, thumbUrl: up.thumbUrl, sortOrder: 100 + n }).returning();
  return { ok: true, id: row.id, uploadURL: up.uploadURL, url: up.url, thumbUrl: up.thumbUrl };
}

/** Yuklangan video Cloudflare'da tayyor bo'ldimi (o'girish bir necha soniya-daqiqa oladi). */
export async function videoStatusAction(mediaId: number): Promise<Result<{ ready: boolean; state: string; error?: string }>> {
  const user = await getUser();
  const profile = user && (await getOwnProfile(user.id));
  if (!profile) return { ok: false, error: "Ruxsat yo‘q" };
  const db = await getDb();
  const [m] = await db.select().from(s.media).where(and(eq(s.media.id, mediaId), eq(s.media.profileId, profile.id)));
  const ref = m && cfRef(m.url);
  if (!m || ref?.kind !== "video") return { ok: false, error: "Video topilmadi" };
  const st = await videoStatus(ref.id).catch(() => null);
  if (!st) return { ok: true, ready: false, state: "unknown" }; // tarmoq xatosi — keyingi so'rovda qayta
  if (st.state === "error") {
    // Cloudflare rad etdi (60 soniyadan uzun yoki fayl buzilgan) — yozuv ham, fayl ham o'chiriladi
    await db.delete(s.media).where(eq(s.media.id, m.id));
    await removeFile(m.url);
    const long = st.duration > VIDEO_SECONDS || /duration/i.test(st.error ?? "");
    return { ok: true, ready: false, state: "error", error: long ? `video ${VIDEO_SECONDS} soniyadan uzun` : "fayl o‘qilmadi yoki buzilgan" };
  }
  if (st.ready && st.size && !m.sizeBytes) await db.update(s.media).set({ sizeBytes: st.size }).where(eq(s.media.id, m.id));
  return { ok: true, ready: st.ready, state: st.state };
}

export async function deleteMediaAction(mediaId: number): Promise<Result> {
  const user = await getUser();
  const profile = user && (await getOwnProfile(user.id));
  if (!profile) return { ok: false, error: "Ruxsat yo‘q" };
  const db = await getDb();
  const [m] = await db.delete(s.media).where(and(eq(s.media.id, mediaId), eq(s.media.profileId, profile.id))).returning();
  if (m) await Promise.all([removeFile(m.url), removeFile(m.thumbUrl)]);
  revalidatePath("/kabinet");
  return { ok: true };
}

export async function setCoverAction(mediaId: number): Promise<Result> {
  const user = await getUser();
  const profile = user && (await getOwnProfile(user.id));
  if (!profile) return { ok: false, error: "Ruxsat yo‘q" };
  const db = await getDb();
  await db.update(s.media).set({ isCover: false }).where(eq(s.media.profileId, profile.id));
  await db.update(s.media).set({ isCover: true }).where(and(eq(s.media.id, mediaId), eq(s.media.profileId, profile.id)));
  return { ok: true };
}

export async function submitAction(): Promise<Result> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Avval kiring" };
  return submitForReview(user.id);
}

export async function setFlagsAction(flags: { isAvailable?: boolean; hidden?: boolean }): Promise<Result> {
  const user = await getUser();
  const p = user && (await getOwnProfile(user.id));
  if (!p) return { ok: false, error: "Profil topilmadi" };
  const db = await getDb();
  const set: Partial<typeof s.profiles.$inferInsert> = {};
  if (flags.isAvailable !== undefined) set.isAvailable = flags.isAvailable;
  if (flags.hidden === true && p.status === "approved") set.status = "hidden";
  if (flags.hidden === false && p.status === "hidden") set.status = "approved";
  if (Object.keys(set).length) await db.update(s.profiles).set(set).where(eq(s.profiles.id, p.id));
  revalidatePath("/kabinet");
  return { ok: true };
}

export async function deleteAccountAction(): Promise<void> {
  const user = await getUser();
  if (!user) redirect("/");
  const db = await getDb();
  const p = await getOwnProfile(user.id);
  if (p) {
    const files = await db.select({ url: s.media.url, thumb: s.media.thumbUrl }).from(s.media).where(eq(s.media.profileId, p.id));
    await Promise.all(files.flatMap((f) => [removeFile(f.url), removeFile(f.thumb)]));
  }
  await logout();
  await db.delete(s.users).where(eq(s.users.id, user.id)); // cascade: profil, kontaktlar, media, statistika
  redirect("/");
}

/** Kabinetdan Telegramni ulash: bot shu foydalanuvchiga bog'lanadi. */
export async function createTelegramLinkAction(): Promise<Result<{ url: string; token: string; secret: string }>> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Avval kiring" };
  const t = await createTelegramToken("link", user.id);
  return t ? { ok: true, ...t } : { ok: false, error: "Telegram bot hali sozlanmagan" };
}

export async function logoutAction(): Promise<void> {
  await logout();
  redirect("/");
}

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/;

/** Profil manzilini o'zgartiradi (xorazmdigital.uz/m/<manzil>). Eski manzil yangisiga yo'naltiriladi. */
export async function changeSlugAction(raw: string): Promise<Result<{ slug: string }>> {
  const user = await getUser();
  const p = user && (await getOwnProfile(user.id));
  if (!p) return { ok: false, error: "Profil topilmadi" };
  const slug = raw.trim().toLowerCase().replace(/\s+/g, "-");
  if (!SLUG_RE.test(slug) || slug.includes("--")) {
    return { ok: false, error: "3–30 belgi: lotin harflari, raqamlar va chiziqcha (-). Masalan: javohir-operator" };
  }
  if (slug === p.slug) return { ok: true, slug };
  const db = await getDb();
  const [taken] = await db.select({ id: s.profiles.id }).from(s.profiles).where(eq(s.profiles.slug, slug)).limit(1);
  const [old] = await db.select({ profileId: s.profileSlugs.profileId }).from(s.profileSlugs).where(eq(s.profileSlugs.slug, slug)).limit(1);
  if (taken || (old && old.profileId !== p.id)) return { ok: false, error: "Bu manzil band. Boshqasini tanlang." };
  if (old) await db.delete(s.profileSlugs).where(eq(s.profileSlugs.slug, slug));
  await db.insert(s.profileSlugs).values({ slug: p.slug, profileId: p.id }).onConflictDoNothing();
  await db.update(s.profiles).set({ slug }).where(eq(s.profiles.id, p.id));
  revalidatePath("/kabinet");
  return { ok: true, slug };
}

/** Biznes egasining so'rovi: Telegram orqali kirgan bo'lishi shart (natijalar botga keladi). */
export async function createRequestAction(input: RequestInputT): Promise<Result<{ id: number }>> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Avval Telegram orqali kiring" };
  if (!user.telegramId) return { ok: false, error: "Telegram ulanmagan — javoblar botga keladi. Avval Telegram’ni ulang." };
  if (!rateLimit(`req:${user.id}`, 5, 3_600_000)) return { ok: false, error: "Juda ko‘p urinish. Keyinroq qayta urinib ko‘ring." };
  const parsed = RequestInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const r = await createRequest(user.id, parsed.data);
  if (r.ok) revalidatePath("/kabinet");
  return r;
}

/** Mutaxassisning "Qiziqaman" tugmasi: faqat tasdiqlangan profil egasi. */
export async function respondRequestAction(requestId: number): Promise<Result<{ first: boolean }>> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Avval kiring" };
  const p = await getOwnProfile(user.id);
  if (!p || p.status !== "approved") return { ok: false, error: "Javob berish uchun profilingiz tasdiqlangan bo‘lishi kerak" };
  const r = await respondToRequest(requestId, p);
  if (r.ok) revalidatePath(`/sorovlar/${requestId}`);
  return r;
}

export async function closeRequestAction(requestId: number): Promise<void> {
  const user = await getUser();
  if (!user) redirect("/kirish");
  await closeRequest(requestId, user.id);
  revalidatePath(`/sorovlar/${requestId}`);
  revalidatePath("/kabinet");
}
