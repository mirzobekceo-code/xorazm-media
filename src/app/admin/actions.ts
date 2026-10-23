"use server";
import { revalidatePath } from "next/cache";
import { and, desc, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema as s } from "@/db";
import { requireStaff } from "@/lib/auth";
import { normalizePhone } from "@/lib/format";
import { notifyUser } from "@/lib/telegram";
import { SLOTS } from "@/lib/reference";
import { recomputeRanks } from "@/lib/rank";

async function log(profileId: number | null, moderatorId: number, action: string, reason?: string, mediaId?: number) {
  const db = await getDb();
  await db.insert(s.moderationLog).values({ profileId, moderatorId, action, reason: reason ?? null, mediaId: mediaId ?? null });
}

export async function moderateMedia(mediaId: number, approve: boolean, reason?: string) {
  const me = await requireStaff();
  const db = await getDb();
  const [m] = await db.update(s.media).set({ moderationStatus: approve ? "approved" : "rejected", rejectReason: approve ? null : reason ?? null })
    .where(eq(s.media.id, mediaId)).returning();
  if (m) await log(m.profileId, me.id, approve ? "media_approve" : "media_reject", reason, mediaId);
  revalidatePath(`/admin/moderatsiya/${m?.profileId}`);
}

/** Profilni tasdiqlash: kutilayotgan barcha media ham tasdiqlanadi, bloger statistikasi belgilanadi. */
export async function approveProfile(profileId: number, form: FormData) {
  const me = await requireStaff();
  const db = await getDb();
  const verifyStats = form.get("verifyStats") === "on";
  await db.update(s.media).set({ moderationStatus: "approved" })
    .where(and(eq(s.media.profileId, profileId), eq(s.media.moderationStatus, "pending")));
  const [p] = await db.update(s.profiles).set({ status: "approved", rejectReason: null, verifiedAt: new Date(), updatedAt: new Date() })
    .where(eq(s.profiles.id, profileId)).returning();
  if (verifyStats) {
    const [last] = await db.select().from(s.bloggerStats).where(eq(s.bloggerStats.profileId, profileId)).orderBy(desc(s.bloggerStats.createdAt)).limit(1);
    if (last) await db.update(s.bloggerStats).set({ verifiedAt: new Date(), verifiedBy: me.id }).where(eq(s.bloggerStats.id, last.id));
  }
  await log(profileId, me.id, "approve", verifyStats ? "statistika tasdiqlandi" : undefined);
  if (p) await notifyUser(p.userId, "✓ Profilingiz tasdiqlandi va katalogda ko‘rinmoqda.");
  await recomputeRanks(profileId);
  revalidatePath("/admin/moderatsiya");
}

export async function rejectProfile(profileId: number, form: FormData) {
  const me = await requireStaff();
  const reasons = form.getAll("reason").map(String).filter(Boolean);
  const note = String(form.get("note") ?? "").trim();
  const reason = [...reasons, note].filter(Boolean).join(". ");
  if (!reason) return;
  const db = await getDb();
  const [p] = await db.update(s.profiles).set({ status: "rejected", rejectReason: reason, updatedAt: new Date() })
    .where(eq(s.profiles.id, profileId)).returning();
  await log(profileId, me.id, "reject", reason);
  if (p) await notifyUser(p.userId, `Profilingiz rad etildi: ${reason}. Tuzatib, kabinetdan qayta yuboring.`);
  revalidatePath("/admin/moderatsiya");
}

export async function setProfileState(profileId: number, change: "block" | "unblock" | "feature" | "unfeature") {
  const me = await requireStaff();
  const db = await getDb();
  const set =
    change === "block" ? { status: "blocked" as const } :
    change === "unblock" ? { status: "approved" as const } :
    { isFeatured: change === "feature" };
  await db.update(s.profiles).set(set).where(eq(s.profiles.id, profileId));
  await log(profileId, me.id, change);
  if (change === "feature" || change === "unfeature") await recomputeRanks(profileId);
  revalidatePath("/admin/mutaxassislar");
}

export async function setReportStatus(reportId: number, status: "reviewing" | "closed") {
  const me = await requireStaff();
  const db = await getDb();
  await db.update(s.reports).set({ status, resolvedBy: status === "closed" ? me.id : null }).where(eq(s.reports.id, reportId));
  revalidatePath("/admin/shikoyatlar");
}

const CampaignForm = z.object({
  name: z.string().trim().min(2).max(120),
  advertiser: z.string().trim().min(1).max(120),
  slots: z.array(z.enum(Object.keys(SLOTS) as [string, ...string[]])).min(1),
  professions: z.array(z.string()),
  districts: z.array(z.string()),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  weight: z.coerce.number().int().min(1).max(100),
});

export async function createCampaign(form: FormData) {
  await requireStaff("admin");
  const parsed = CampaignForm.safeParse({
    name: form.get("name"), advertiser: form.get("advertiser"), slots: form.getAll("slots"),
    professions: form.getAll("professions"), districts: form.getAll("districts"),
    startsAt: form.get("startsAt") || undefined, endsAt: form.get("endsAt") || undefined, weight: form.get("weight") || 1,
  });
  if (!parsed.success) return;
  const d = parsed.data;
  const db = await getDb();
  await db.insert(s.adCampaigns).values({
    ...d, startsAt: d.startsAt ? new Date(d.startsAt) : null, endsAt: d.endsAt ? new Date(d.endsAt + "T23:59:59") : null, status: "draft",
  });
  revalidatePath("/admin/reklama");
}

export async function setCampaignStatus(id: number, status: "active" | "paused" | "ended") {
  await requireStaff("admin");
  const db = await getDb();
  await db.update(s.adCampaigns).set({ status, updatedAt: new Date() }).where(eq(s.adCampaigns.id, id));
  revalidatePath("/admin/reklama");
}

const CreativeForm = z.object({
  campaignId: z.coerce.number().int(),
  type: z.enum(["text", "image", "video"]),
  title: z.string().trim().min(2).max(60),
  body: z.string().trim().max(120).default(""),
  cta: z.string().trim().min(1).max(24),
  url: z.string().url(),
  imageDesktop: z.string().optional(),
  imageMobile: z.string().optional(),
  video: z.string().optional(),
});

export async function createCreative(form: FormData) {
  await requireStaff("admin");
  const raw = Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string" && v !== ""));
  const parsed = CreativeForm.safeParse(raw);
  if (!parsed.success) return;
  const db = await getDb();
  await db.insert(s.adCreatives).values(parsed.data);
  revalidatePath("/admin/reklama");
}

export async function toggleCreative(id: number, isActive: boolean) {
  await requireStaff("admin");
  const db = await getDb();
  await db.update(s.adCreatives).set({ isActive }).where(eq(s.adCreatives.id, id));
  revalidatePath("/admin/reklama");
}

export async function setStaffRole(form: FormData) {
  const me = await requireStaff("admin");
  const phone = normalizePhone(String(form.get("phone") ?? ""));
  const role = z.enum(["specialist", "moderator", "admin"]).safeParse(form.get("role"));
  if (!phone || !role.success) return;
  const db = await getDb();
  await db.insert(s.users).values({ phone, role: role.data })
    .onConflictDoUpdate({ target: s.users.phone, set: { role: role.data }, setWhere: ne(s.users.id, me.id) });
  revalidatePath("/admin/xodimlar");
}
