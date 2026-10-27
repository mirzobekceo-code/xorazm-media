import "server-only";
import { and, asc, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { money, prettyPhone } from "./format";
import { recomputeRanks } from "./rank";
import { REJECT_REASONS } from "./reference";
import { SITE } from "./site";
import { notifyUser, tg } from "./telegram";
import { parsePriceList } from "./portfolio-rules";

export async function logModeration(profileId: number | null, moderatorId: number, action: string, reason?: string, mediaId?: number) {
  const db = await getDb();
  await db.insert(s.moderationLog).values({ profileId, moderatorId, action, reason: reason ?? null, mediaId: mediaId ?? null });
}

/** Profilni tasdiqlash: kutilayotgan media ham tasdiqlanadi; xohlansa bloger statistikasi belgilanadi. */
export async function approveProfileCore(profileId: number, staffId: number, opts: { verifyStats?: boolean } = {}) {
  const db = await getDb();
  await db.update(s.media).set({ moderationStatus: "approved" })
    .where(and(eq(s.media.profileId, profileId), eq(s.media.moderationStatus, "pending")));
  const [p] = await db.update(s.profiles).set({ status: "approved", rejectReason: null, verifiedAt: new Date(), updatedAt: new Date() })
    .where(eq(s.profiles.id, profileId)).returning();
  if (opts.verifyStats) {
    const [last] = await db.select().from(s.bloggerStats).where(eq(s.bloggerStats.profileId, profileId)).orderBy(desc(s.bloggerStats.createdAt)).limit(1);
    if (last) await db.update(s.bloggerStats).set({ verifiedAt: new Date(), verifiedBy: staffId }).where(eq(s.bloggerStats.id, last.id));
  }
  await logModeration(profileId, staffId, "approve", opts.verifyStats ? "statistika tasdiqlandi" : undefined);
  const notified = p ? await notifyUser(p.userId, `✓ Profilingiz tasdiqlandi va katalogda ko‘rinmoqda.\n\nSahifangiz: ${SITE.url}/m/${p.slug}`) : false;
  await recomputeRanks(profileId);
  return p ? { ...p, notified } : null;
}

export async function rejectProfileCore(profileId: number, staffId: number, reason: string) {
  const db = await getDb();
  const [p] = await db.update(s.profiles).set({ status: "rejected", rejectReason: reason, updatedAt: new Date() })
    .where(eq(s.profiles.id, profileId)).returning();
  await logModeration(profileId, staffId, "reject", reason);
  const notified = p ? await notifyUser(p.userId, `Profilingiz rad etildi: ${reason}.\n\nTuzatib, kabinetdan qayta yuboring: ${SITE.url}/kabinet`) : false;
  return p ? { ...p, notified } : null;
}

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Telegram'dagi tugmalar: tasdiqlash, rad etish (sabab tanlanadi), saytda ochish. */
export function cardButtons(profileId: number) {
  return {
    inline_keyboard: [
      [{ text: "✓ Tasdiqlash", callback_data: `mod:a:${profileId}` }, { text: "✕ Rad etish", callback_data: `mod:r:${profileId}` }],
      [{ text: "Saytda batafsil", url: `${SITE.url}/admin/moderatsiya/${profileId}` }],
    ],
  };
}

export function reasonButtons(profileId: number) {
  return {
    inline_keyboard: [
      ...REJECT_REASONS.map((r, i) => [{ text: r, callback_data: `mod:x:${profileId}:${i}` }]),
      [{ text: "← Orqaga", callback_data: `mod:b:${profileId}` }],
    ],
  };
}

/** Moderator uchun profil matni (HTML). */
export async function moderationText(profileId: number, kind: "new" | "changed") {
  const db = await getDb();
  const [p] = await db.select().from(s.profiles).where(eq(s.profiles.id, profileId));
  if (!p) return null;
  const [profs, dists, [c], [b], admins, media] = await Promise.all([
    db.select().from(s.professions),
    db.select({ name: s.districts.nameUz }).from(s.profileDistricts).innerJoin(s.districts, eq(s.districts.id, s.profileDistricts.districtId))
      .where(eq(s.profileDistricts.profileId, p.id)).orderBy(asc(s.districts.sortOrder)),
    db.select().from(s.profileContacts).where(eq(s.profileContacts.profileId, p.id)),
    db.select().from(s.bloggerStats).where(eq(s.bloggerStats.profileId, p.id)).orderBy(desc(s.bloggerStats.createdAt)).limit(1),
    db.select().from(s.bloggerAdmins).where(eq(s.bloggerAdmins.profileId, p.id)).orderBy(asc(s.bloggerAdmins.sortOrder)),
    db.select().from(s.media).where(and(eq(s.media.profileId, p.id), inArray(s.media.moderationStatus, ["pending", "approved"])))
      .orderBy(desc(s.media.isCover), asc(s.media.sortOrder)),
  ]);
  const prof = profs.find((x) => x.id === p.professionId);
  const extraProf = profs.find((x) => x.id === p.extraProfessionId);
  const lines: string[] = [
    kind === "new" ? "🆕 <b>Yangi profil tekshiruvga keldi</b>" : "♻️ <b>Tasdiqlangan profil o‘zgardi — qayta tekshiruv</b>",
    "",
    `<b>${esc(p.fullName)}</b> — ${esc(prof?.nameUz ?? "")}${extraProf ? ` + ${esc(extraProf.nameUz)}` : ""}`,
    `📍 ${esc(dists.map((d) => d.name).join(", ") || "—")}`,
  ];
  const contact = [c?.phone && prettyPhone(c.phone), c?.telegram, c?.instagram && `IG ${c.instagram}`].filter(Boolean).join(" · ");
  if (contact) lines.push(`📞 ${esc(contact)}`);
  lines.push(`Tajriba: ${p.experienceYears} yil · Narx: ${p.price ? `${money(p.price)} so‘m / ${esc(prof?.unit ?? "")}` : "kelishiladi"}`);
  if (p.birthYear) lines.push(`Tug‘ilgan yil: ${p.birthYear}`);
  if (p.bio) lines.push("", `<i>${esc(p.bio.slice(0, 500))}</i>`);
  const fields = (prof?.fieldsSchema ?? []).filter((f) => p.extra[f.key]);
  if (fields.length) {
    lines.push("");
    for (const f of fields) {
      const v = f.type === "pricelist"
        ? parsePriceList(p.extra[f.key]).map((r) => `\n   • ${esc(r.name)} — ${r.price ? `${money(r.price)} so‘m` : "kelishiladi"}`).join("")
        : esc(p.extra[f.key]);
      lines.push(`<b>${esc(f.label)}:</b> ${v}`);
    }
  }
  if (b) {
    const fol = Object.entries(b.followers).map(([k, n]) => `${k} ${n}`).join(", ");
    lines.push("", `<b>Statistika:</b> ${esc(fol)}${b.er != null ? ` · ER ${b.er}%` : ""}${b.avgViews ? ` · reels ${b.avgViews}` : ""}`);
    if (admins.length) lines.push(`<b>Adminlar:</b> ${esc(admins.map((a) => `${a.name} ${prettyPhone(a.phone)}`).join("; "))}`);
  }
  if (p.videoLinks.length) lines.push("", "<b>Havolalar:</b>", ...p.videoLinks.map((u) => esc(u)));
  const images = media.filter((m) => m.type === "image" && !m.isStatScreenshot).length;
  const proofs = media.filter((m) => m.isStatScreenshot).length;
  lines.push("", `🖼 Rasmlar: ${images}${proofs ? ` · isbot skrinshotlari: ${proofs}` : ""}`);
  return { text: lines.join("\n").slice(0, 4000), media, status: p.status };
}

/**
 * Yangi yoki o'zgargan profilni Telegram'i ulangan barcha moderator va adminlarga yuboradi:
 * rasmlar albom bo'lib, ostida ma'lumot va "Tasdiqlash / Rad etish" tugmalari.
 */
export async function sendModerationCard(profileId: number, kind: "new" | "changed") {
  const db = await getDb();
  const staff = await db.select({ tg: s.users.telegramId }).from(s.users)
    .where(and(inArray(s.users.role, ["moderator", "admin"]), isNotNull(s.users.telegramId)));
  if (!staff.length) return;
  const card = await moderationText(profileId, kind);
  if (!card) return;
  // Telegram faqat ochiq https manzildagi rasmni oladi (lokal /uploads emas)
  const photos = card.media.filter((m) => m.type === "image" && m.url.startsWith("https://")).slice(0, 10)
    .map((m) => ({ type: "photo", media: m.url, ...(m.isStatScreenshot ? { caption: "Isbot skrinshoti" } : {}) }));
  await Promise.all(staff.map(async ({ tg: chatId }) => {
    if (photos.length > 1) await tg("sendMediaGroup", { chat_id: chatId, media: photos });
    else if (photos.length === 1) await tg("sendPhoto", { chat_id: chatId, photo: photos[0].media });
    await tg("sendMessage", {
      chat_id: chatId, text: card.text, parse_mode: "HTML", disable_web_page_preview: true, reply_markup: cardButtons(profileId),
    });
  }));
}
