import "server-only";
import { and, eq, ne } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { normalizePhone } from "./format";
import { SITE } from "./site";
import { send } from "./telegram";
import { attachChat, confirmToken, pendingLoginForChat } from "./telegram-auth";

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

function menu() {
  const https = SITE.url.startsWith("https://");
  return {
    reply_markup: {
      inline_keyboard: [
        [https ? { text: "Mutaxassis topish", web_app: { url: `${SITE.url}/mutaxassislar` } } : { text: "Mutaxassis topish", url: `${SITE.url}/mutaxassislar` }],
        [{ text: "Profil ochish — bepul", url: `${SITE.url}/qoshilish` }, { text: "Kabinet", url: `${SITE.url}/kabinet` }],
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
      await send(chatId, "Kirish so‘rovi topilmadi yoki eskirgan. Saytda “Telegram orqali kirish” tugmasini qayta bosing.", REMOVE_KB);
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
    await send(chatId, "Xorazm Media’ga kirish uchun pastdagi tugma orqali telefon raqamingizni ulashing.", {
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
    await send(chatId, `Kabinet: ${SITE.url}/kabinet`);
    return;
  }
  await send(chatId, "Xorazm Media — Xorazmdagi bloger, operator, montajor, fotograf, dizayner, targetolog va SMM managerlar katalogi. Kontaktlar bepul.", menu());
}
