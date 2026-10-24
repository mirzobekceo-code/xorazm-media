import "server-only";
import { and, eq, ne } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { normalizePhone } from "./format";
import { SITE } from "./site";
import { BOT_TEXT, send } from "./telegram";
import { attachChat, confirmToken, pendingLoginForChat } from "./telegram-auth";
import { upsertUserByPhone } from "./auth";

type TgUser = { id: number; first_name?: string };
export type Update = {
  update_id: number;
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

function menu() {
  return {
    reply_markup: {
      inline_keyboard: [
        [appBtn("Mutaxassis topish", "/mutaxassislar")],
        [appBtn("Mutaxassis bo‘lish", "/qoshilish"), appBtn("Kabinet", "/kabinet")],
      ],
    },
  };
}

/** Bot xabarlarini qayta ishlaydi (webhook'dan). Faqat shaxsiy chatlar. */
export async function handleUpdate(u: Update): Promise<void> {
  const m = u.message;
  if (!m || m.chat.type !== "private" || !m.from) return;
  const chatId = String(m.chat.id);
  const tgId = String(m.from.id);

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
    await send(chatId, "✓ Raqam tasdiqlandi. Saytga qayting — avtomatik kirasiz.\n\nTasdiqlash natijalari va statistika shu yerga keladi.", REMOVE_KB);
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
    await send(chatId, "✓ Telegram ulandi. Profil tasdiqlanishi va haftalik statistika shu yerga keladi.");
    return;
  }
  if (text === "/kabinet") {
    await send(chatId, "Kabinetingiz: statistika, sahifa havolasi va QR-kod.", { reply_markup: { inline_keyboard: [[appBtn("Kabinetni ochish", "/kabinet")]] } });
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
  await send(chatId, BOT_TEXT.description, menu());
}
