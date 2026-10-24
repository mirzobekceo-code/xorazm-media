import "server-only";
import { eq } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { botEnabled, send } from "./telegram";

/**
 * Tasdiqlash kodini Telegram orqali yetkazadi (SMS ishlatilmaydi):
 *  1) raqam botga avval ulangan bo'lsa — botimiz yuboradi (bepul);
 *  2) aks holda Telegram Gateway — raqamning Telegram akkauntiga "Verification Codes" chatiga ($0.01, yetib bormasa qaytariladi);
 *  3) OTP_DEV_LOG=1 yoki dev rejimida — server konsoliga (faqat lokal sinov uchun).
 */
export type Channel = "bot" | "gateway" | "dev";

const GATEWAY = process.env.TELEGRAM_GATEWAY_URL ?? "https://gatewayapi.telegram.org";
export const gatewayEnabled = () => !!process.env.TELEGRAM_GATEWAY_TOKEN;
const devLog = () => process.env.OTP_DEV_LOG === "1" || process.env.NODE_ENV !== "production";

/** Kod olish varianti saytda ko'rsatiladimi: botga ulangan raqamlar uchun bot, qolganlar uchun Gateway. */
export const codeLoginAvailable = () => botEnabled() || gatewayEnabled() || devLog();
/** Yangi foydalanuvchi (ro'yxatdan o'tish) kod bilan tasdiqlay oladimi: faqat Gateway yoki dev. */
export const codeSignupAvailable = () => gatewayEnabled() || devLog();

export async function deliverCode(phone: string, code: string, ttlSec: number): Promise<Channel | null> {
  const db = await getDb();
  const [u] = await db.select({ tg: s.users.telegramId }).from(s.users).where(eq(s.users.phone, phone)).limit(1);
  if (u?.tg && botEnabled()) {
    const ok = await send(u.tg, `Xorazm Digital HUB: kirish kodi ${code}\n\nKodni hech kimga bermang. ${Math.round(ttlSec / 60)} daqiqa amal qiladi.`);
    if (ok) return "bot";
  }
  if (gatewayEnabled()) {
    try {
      const res = await fetch(`${GATEWAY}/sendVerificationMessage`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${process.env.TELEGRAM_GATEWAY_TOKEN}` },
        body: JSON.stringify({ phone_number: phone, code, ttl: ttlSec }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (json.ok) return "gateway";
      // PHONE_NUMBER_INVALID, raqamda Telegram yo'q va h.k.
      console.error("Telegram Gateway:", json.error);
    } catch (e) {
      console.error("Telegram Gateway", e);
    }
  }
  if (devLog()) {
    console.log(`[OTP dev] ${phone}: Xorazm Digital HUB: tasdiqlash kodi ${code}`);
    return "dev";
  }
  return null;
}
