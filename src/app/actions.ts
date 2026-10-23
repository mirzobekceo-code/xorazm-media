"use server";
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

/** Video brauzerdan to'g'ridan-to'g'ri Blob'ga yuklanadimi (production). */
export async function uploadModeAction(): Promise<{ directVideo: boolean; profileId: number | null }> {
  const user = await getUser();
  const p = user && (await getOwnProfile(user.id));
  return { directVideo: !!process.env.BLOB_READ_WRITE_TOKEN, profileId: p?.id ?? null };
}

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

export async function requestCodeAction(rawPhone: string): Promise<Result> {
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

const LIMITS = { image: 20, video: 6, screenshot: 6 };

export async function uploadMediaAction(form: FormData): Promise<Result<{ id: number; url: string; thumbUrl: string | null; type: "image" | "video" }>> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Avval kiring" };
  const profile = await getOwnProfile(user.id);
  if (!profile) return { ok: false, error: "Avval profil ma’lumotlarini saqlang" };
  const file = form.get("file");
  const isStat = form.get("stat") === "1";
  if (!(file instanceof File) || !file.size) return { ok: false, error: "Fayl tanlanmadi" };
  const kind = kindOf(file);
  if (!kind || (isStat && kind !== "image")) return { ok: false, error: "Faqat JPG, PNG, WEBP, HEIC rasm yoki MP4, MOV video" };

  const db = await getDb();
  const [{ n }] = await db.select({ n: count() }).from(s.media).where(and(
    eq(s.media.profileId, profile.id), eq(s.media.isStatScreenshot, isStat), ...(isStat ? [] : [eq(s.media.type, kind)]),
  ));
  const limit = isStat ? LIMITS.screenshot : LIMITS[kind];
  if (n >= limit) return { ok: false, error: `Ko‘pi bilan ${limit} ta ${isStat ? "skrinshot" : kind === "image" ? "rasm" : "video"}` };

  try {
    const saved = kind === "image" ? await saveImage(profile.id, file) : await saveVideo(profile.id, file);
    const [row] = await db.insert(s.media).values({
      profileId: profile.id, type: kind, url: saved.url, thumbUrl: saved.thumbUrl, isStatScreenshot: isStat, sortOrder: n,
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
  if (n >= LIMITS.video) { await removeFile(url); return { ok: false, error: `Ko‘pi bilan ${LIMITS.video} ta video` }; }
  const [row] = await db.insert(s.media).values({ profileId: profile.id, type: "video", url, sortOrder: n }).returning();
  return { ok: true, id: row.id, url: row.url, thumbUrl: null, type: "video" };
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

export async function logoutAction(): Promise<void> {
  await logout();
  redirect("/");
}
