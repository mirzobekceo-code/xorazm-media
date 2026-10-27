import "server-only";
import { and, eq, inArray, isNull, ne, or } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { normalizePhone } from "./format";
import { SITE } from "./site";
import { BOT_TEXT, send, tg } from "./telegram";
import { approveProfileCore, cardButtons, reasonButtons, rejectProfileCore } from "./moderation";
import { REJECT_REASONS } from "./reference";
import { attachChat, confirmToken, finishUrl, pendingLoginForChat } from "./telegram-auth";
import { upsertUserByPhone } from "./auth";
import { getContacts } from "./queries";
import { recordContactLead } from "./leads";
import { prettyPhone } from "./format";
import { approveRequest, getRequest, rejectRequest, REQUEST_REJECT_REASONS, requestModButtons, requestProfessionButtons, requestReasonButtons, takeByAdverto, toggleRequestProfession } from "./requests";

type TgUser = { id: number; first_name?: string; username?: string };
type CallbackQuery = { id: string; from: TgUser; data?: string; message?: { chat: { id: number }; message_id: number } };
export type Update = {
  update_id: number;
  callback_query?: CallbackQuery;
  message?: {
    chat: { id: number; type: string };
    from?: TgUser;
    text?: string;
    contact?: { phone_number: string; user_id?: number };
  };
};

const REMOVE_KB = { reply_markup: { remove_keyboard: true } };

/** Tugma: https bo'lsa sahifa Telegram ichida (Mini App) ochiladi. */
const appBtn = (text: string, path: string) =>
  SITE.url.startsWith("https://") ? { text, web_app: { url: `${SITE.url}${path}` } } : { text, url: `${SITE.url}${path}` };

/** Asosiy tugmalar. Kabinet faqat portfolio qo'shganlarga (profili borlarga) ko'rinadi. */
function menu(hasProfile: boolean) {
  return {
    reply_markup: {
      inline_keyboard: [
        [appBtn("Mutaxassis topish", "/")],
        [appBtn("So‘rov qoldirish", "/sorov")],
        [hasProfile ? appBtn("Kabinet", "/kabinet") : appBtn("Portfolio qo‘shish", "/qoshilish")],
      ],
    },
  };
}

async function hasProfile(tgId: string): Promise<boolean> {
  const db = await getDb();
  const [r] = await db.select({ id: s.profiles.id }).from(s.profiles)
    .innerJoin(s.users, eq(s.users.id, s.profiles.userId)).where(eq(s.users.telegramId, tgId)).limit(1);
  return !!r;
}

/** Moderator tugmalari: mod:a:<id> tasdiqlash, mod:r:<id> sabablar, mod:x:<id>:<n> rad etish, mod:b:<id> orqaga. */
async function handleCallback(q: CallbackQuery): Promise<void> {
  const answer = (text?: string) => tg("answerCallbackQuery", { callback_query_id: q.id, ...(text ? { text } : {}) });
  const m = (q.data ?? "").match(/^(mod|rq):(a|r|b|x|v|p|t|s):(\d+)(?::(\d+))?$/);
  if (!m || !q.message) { await answer(); return; }
  const db = await getDb();
  const [staff] = await db.select({ id: s.users.id }).from(s.users)
    .where(and(eq(s.users.telegramId, String(q.from.id)), inArray(s.users.role, ["moderator", "admin"]))).limit(1);
  if (!staff) { await answer("Ruxsat yo‘q"); return; }
  const [act, idRaw, n] = [m[2], Number(m[3]), m[4]];
  const markup = (reply_markup: unknown) => tg("editMessageReplyMarkup", { chat_id: q.message!.chat.id, message_id: q.message!.message_id, reply_markup });
  if (m[1] === "rq") return requestCallback(act, idRaw, n, answer, markup);
  const [p] = await db.select({ status: s.profiles.status, slug: s.profiles.slug }).from(s.profiles).where(eq(s.profiles.id, idRaw)).limit(1);
  if (!p) { await answer("Profil topilmadi (o‘chirilgan bo‘lishi mumkin)"); await markup({ inline_keyboard: [] }); return; }
  if (act === "r") { await markup(reasonButtons(idRaw)); await answer(); return; }
  if (act === "b") { await markup(cardButtons(idRaw)); await answer(); return; }
  if (p.status !== "pending") {
    await answer(`Allaqachon ko‘rib chiqilgan: ${p.status}`);
    await markup({ inline_keyboard: [[{ text: `Holati: ${p.status}`, url: `${SITE.url}/admin/moderatsiya/${idRaw}` }]] });
    return;
  }
  if (act === "a") {
    const r = await approveProfileCore(idRaw, staff.id);
    await markup({ inline_keyboard: [[{ text: "✓ Tasdiqlandi — sahifani ochish", url: `${SITE.url}/m/${p.slug}` }]] });
    await answer(r?.notified ? "✓ Tasdiqlandi, mutaxassisga xabar yuborildi" : "✓ Tasdiqlandi (mutaxassis Telegram’ni ulamagan — natijani kabinetda ko‘radi)");
    return;
  }
  const reason = REJECT_REASONS[Number(n)];
  if (!reason) { await answer(); return; }
  const r = await rejectProfileCore(idRaw, staff.id, reason);
  await markup({ inline_keyboard: [[{ text: `✕ Rad etildi: ${reason}`, url: `${SITE.url}/admin/moderatsiya/${idRaw}` }]] });
  await answer(r?.notified ? "Rad etildi, mutaxassisga sababi yuborildi" : "Rad etildi (mutaxassis sababni kabinetda ko‘radi)");
}

/**
 * So'rov moderatsiyasi: rq:v Adverto oladi, rq:p kasblarni tanlash, rq:t:<id>:<kasb> belgilash,
 * rq:s tanlanganlarga yuborish, rq:r sabablar, rq:x:<id>:<n> rad etish, rq:b orqaga.
 */
async function requestCallback(act: string, id: number, n: string | undefined, answer: (t?: string) => Promise<unknown>, markup: (m: unknown) => Promise<unknown>) {
  const r = await getRequest(id);
  if (!r) { await answer("So‘rov topilmadi"); await markup({ inline_keyboard: [] }); return; }
  const done = (text: string) => markup({ inline_keyboard: [[{ text, url: `${SITE.url}/sorovlar/${id}` }]] });
  if (r.status !== "pending") { await answer(`Allaqachon ko‘rib chiqilgan: ${r.status}`); await done(`Holati: ${r.status}`); return; }
  if (act === "r") { await markup(requestReasonButtons(id)); await answer(); return; }
  if (act === "b") { await markup(requestModButtons(id)); await answer(); return; }
  if (act === "p") { await markup(await requestProfessionButtons(id)); await answer("Kimlarga yuborilsin? Belgilang va “Yuborish”ni bosing"); return; }
  if (act === "t") {
    await toggleRequestProfession(id, Number(n));
    await markup(await requestProfessionButtons(id));
    await answer();
    return;
  }
  if (act === "v") {
    await takeByAdverto(id);
    await markup({ inline_keyboard: [[{ text: "🏢 Adverto oldi — mijozga qo‘ng‘iroq qiling", url: `${SITE.url}/admin/sorovlar` }]] });
    await answer("Adverto oldi. Mutaxassislarga yuborilmaydi.");
    return;
  }
  if (act === "s" || act === "a") {
    // Telegram callback'ga tez javob kutadi; yuborish uzoq cho'zilishi mumkin
    if (!r.professionIds.length && !r.professionId) { await answer("Kamida bitta kasbni belgilang"); return; }
    await answer("Yuborilmoqda…");
    const sent = await approveRequest(id);
    await done(`✓ Yuborildi · ${sent ?? 0} ta mutaxassisga`);
    return;
  }
  const reason = REQUEST_REJECT_REASONS[Number(n)];
  if (!reason) { await answer(); return; }
  await rejectRequest(id, reason);
  await done(`✕ Rad etildi: ${reason}`);
  await answer("Rad etildi");
}

/** Biznes egasi raqamini tasdiqlagach: mutaxassis kontaktlari botda, lid yoziladi, saytga qaytish tugmalari. */
async function sendProfileContacts(chatId: string, slug: string, phone: string, tgId: string, username: string | undefined, finish: string) {
  const db = await getDb();
  const [p] = await db.select({ id: s.profiles.id, name: s.profiles.fullName, prof: s.professions.nameUz, profSlug: s.professions.slug })
    .from(s.profiles).innerJoin(s.professions, eq(s.professions.id, s.profiles.professionId))
    .where(and(eq(s.profiles.slug, slug), eq(s.profiles.status, "approved"))).limit(1);
  const c = p && (await getContacts(p.id));
  if (!p || !c) return false;
  const userId = await upsertUserByPhone(phone, { telegramId: tgId });
  if (username) await db.update(s.users).set({ telegramUsername: username.slice(0, 64) }).where(eq(s.users.id, userId));
  const [u] = await db.select().from(s.users).where(eq(s.users.id, userId));
  if (u) await recordContactLead(u, p.id, "telegram_gate").catch(() => {});
  const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const lines = [`✓ Raqamingiz tasdiqlandi. <b>${esc(p.name)}</b> — ${esc(p.prof)} kontaktlari:`, ""];
  for (const a of c.admins) lines.push(`👤 ${esc(a.name)} (${esc(a.role)}): ${prettyPhone(a.phone)}${a.telegram ? ` · ${esc(a.telegram)}` : ""}`);
  if (c.phone) lines.push(`📞 ${prettyPhone(c.phone)}`);
  if (c.telegram) lines.push(`✈️ ${esc(c.telegram)}`);
  if (c.instagram) lines.push(`📷 instagram.com/${esc(c.instagram.replace(/^@/, ""))}`);
  lines.push("", "Murojaat qilganda “Xorazm Digital HUB orqali topdim” deb yozing.");
  await send(chatId, lines.join("\n"), {
    parse_mode: "HTML", disable_web_page_preview: true,
    reply_markup: { inline_keyboard: [
      [{ text: "↩ Saytga qaytish", url: finish }],
      [appBtn("Boshqa mutaxassislarni ko‘rish", `/mutaxassislar/${p.profSlug}`)],
    ] },
  });
  return true;
}

/** Bot xabarlarini qayta ishlaydi (webhook'dan). Faqat shaxsiy chatlar. */
export async function handleUpdate(u: Update): Promise<void> {
  if (u.callback_query) return handleCallback(u.callback_query);
  const m = u.message;
  if (!m || m.chat.type !== "private" || !m.from) return;
  const chatId = String(m.chat.id);
  const tgId = String(m.from.id);
  // @username haftalik lidlar hisoboti uchun (foydalanuvchi uni o'zgartirishi mumkin — har safar yangilanadi)
  if (m.from.username) {
    const db = await getDb();
    await db.update(s.users).set({ telegramUsername: m.from.username.slice(0, 64) })
      .where(and(eq(s.users.telegramId, tgId), or(isNull(s.users.telegramUsername), ne(s.users.telegramUsername, m.from.username))));
  }

  if (m.contact) {
    if (m.contact.user_id !== m.from.id) {
      await send(chatId, "Faqat o‘zingizning raqamingizni ulashing — pastdagi tugmani bosing.");
      return;
    }
    const phone = normalizePhone(m.contact.phone_number);
    if (!phone) {
      await send(chatId, "Hozircha faqat O‘zbekiston raqamlari (+998) qabul qilinadi.", REMOVE_KB);
      return;
    }
    const t = await pendingLoginForChat(chatId);
    if (!t || t.telegramId !== tgId) {
      // Mini App ichidan "raqamni ulashish" (requestContact): raqam shu Telegram akkauntga bog'lanadi,
      // ilova keyin initData orqali avtomatik kiradi. Telegram kontaktning egasi shu foydalanuvchi ekanini kafolatlaydi.
      await upsertUserByPhone(phone, { telegramId: tgId });
      await send(chatId, "✓ Raqam tasdiqlandi. Ilovaga qayting — avtomatik kirasiz.", REMOVE_KB);
      return;
    }
    await confirmToken(t.token, { phone });
    // Mutaxassis sahifasidan "Raqamni ko'rish" orqali kelgan bo'lsa — kontaktlar shu yerda ham beriladi
    const fromProfile = t.returnPath?.match(/^\/m\/([a-z0-9-]{3,80})/);
    if (fromProfile && (await sendProfileContacts(chatId, fromProfile[1], phone, tgId, m.from.username, finishUrl(t.token)))) return;
    await send(chatId, "✓ Raqamingiz tasdiqlandi. Pastdagi tugma orqali saytga qayting va to‘ldirishni davom ettiring.\n\nProfil tasdiqlanishi va statistika shu yerga keladi.", {
      reply_markup: { inline_keyboard: [[{ text: "↩ Saytga qaytish", url: finishUrl(t.token) }]] },
    });
    return;
  }

  const text = (m.text ?? "").trim();
  const start = text.match(/^\/start(?:\s+(login|link)_([a-f0-9]{32}))?$/);
  if (start?.[1] === "login") {
    const t = await attachChat("login", start[2], chatId, tgId);
    if (!t) {
      await send(chatId, "Havola eskirgan. Saytda “Telegram orqali kirish” tugmasini qayta bosing.");
      return;
    }
    await send(chatId, "Xorazm Digital HUB’ga kirish uchun pastdagi tugma orqali telefon raqamingizni ulashing.", {
      reply_markup: { keyboard: [[{ text: "📱 Raqamni ulashish", request_contact: true }]], resize_keyboard: true, one_time_keyboard: true },
    });
    return;
  }
  if (start?.[1] === "link") {
    const t = await attachChat("link", start[2], chatId, tgId);
    if (!t?.userId) {
      await send(chatId, "Havola eskirgan. Kabinetda “Telegramni ulash” tugmasini qayta bosing.");
      return;
    }
    const db = await getDb();
    await db.update(s.users).set({ telegramId: null }).where(and(eq(s.users.telegramId, tgId), ne(s.users.id, t.userId)));
    await db.update(s.users).set({ telegramId: tgId }).where(eq(s.users.id, t.userId));
    await confirmToken(t.token);
    await send(chatId, "✓ Telegram ulandi. Profil tasdiqlanishi va haftalik statistika shu yerga keladi.", {
      reply_markup: { inline_keyboard: [[{ text: "↩ Kabinetga qaytish", url: `${SITE.url}/kabinet` }]] },
    });
    return;
  }
  if (text === "/kabinet") {
    if (await hasProfile(tgId)) {
      await send(chatId, "Kabinetingiz: statistika, sahifa havolasi va QR-kod.", { reply_markup: { inline_keyboard: [[appBtn("Kabinetni ochish", "/kabinet")]] } });
    } else {
      await send(chatId, "Kabinet portfolio qo‘shgan mutaxassislar uchun. Portfoliongizni bepul qo‘shing:", { reply_markup: { inline_keyboard: [[appBtn("Portfolio qo‘shish", "/qoshilish")]] } });
    }
    return;
  }
  // Ulashilgan havola: t.me/<bot>?start=m_<manzil> — profilni Telegram ichida ochish tugmasi
  const prof = text.match(/^\/start m_([a-z0-9-]{3,80})$/);
  if (prof) {
    const db = await getDb();
    const [p] = await db.select({ name: s.profiles.fullName, slug: s.profiles.slug }).from(s.profiles)
      .where(and(eq(s.profiles.slug, prof[1]), eq(s.profiles.status, "approved"))).limit(1);
    if (p) {
      await send(chatId, `${p.name} — Xorazm Digital HUB’dagi sahifasi: portfolio, narxlar va kontaktlar.`, {
        reply_markup: { inline_keyboard: [[appBtn("Sahifani ochish", `/m/${p.slug}?s=tg`)]] },
      });
      return;
    }
  }
  await send(chatId, BOT_TEXT.description, menu(await hasProfile(tgId)));
}
