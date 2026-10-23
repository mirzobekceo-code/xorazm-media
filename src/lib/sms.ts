import "server-only";

/**
 * SMS yuborish. ESKIZ_EMAIL va ESKIZ_PASSWORD berilsa Eskiz.uz orqali,
 * aks holda (dev yoki SMS_DEV_LOG=1) kod server konsoliga chiqadi.
 */
let token: { value: string; at: number } | null = null;
const ESKIZ = "https://notify.eskiz.uz/api";

async function eskizToken(): Promise<string> {
  if (token && Date.now() - token.at < 25 * 86_400_000) return token.value;
  const body = new FormData();
  body.set("email", process.env.ESKIZ_EMAIL!);
  body.set("password", process.env.ESKIZ_PASSWORD!);
  const res = await fetch(`${ESKIZ}/auth/login`, { method: "POST", body });
  if (!res.ok) throw new Error(`Eskiz login: ${res.status}`);
  const json = (await res.json()) as { data?: { token?: string } };
  if (!json.data?.token) throw new Error("Eskiz login: token yo'q");
  token = { value: json.data.token, at: Date.now() };
  return token.value;
}

/**
 * SMS orqali kirishni foydalanuvchiga ko'rsatish kerakmi: provayder ulangan bo'lsa yoki dev rejimida.
 * (SMS_DEV_LOG kodni faqat logga yozadi — oddiy foydalanuvchiga foydasiz, shuning uchun hisobga olinmaydi.)
 */
export const smsVisible = () => !!(process.env.ESKIZ_EMAIL && process.env.ESKIZ_PASSWORD) || process.env.NODE_ENV !== "production";

export async function sendSms(phone: string, text: string): Promise<boolean> {
  if (!process.env.ESKIZ_EMAIL || !process.env.ESKIZ_PASSWORD) {
    if (process.env.NODE_ENV === "production" && process.env.SMS_DEV_LOG !== "1") {
      console.error("SMS provayder sozlanmagan");
      return false;
    }
    console.log(`[SMS dev] ${phone}: ${text}`);
    return true;
  }
  try {
    const body = new FormData();
    body.set("mobile_phone", phone.replace(/^\+/, ""));
    body.set("message", text);
    body.set("from", process.env.ESKIZ_FROM ?? "4546");
    const res = await fetch(`${ESKIZ}/message/sms/send`, {
      method: "POST", body, headers: { Authorization: `Bearer ${await eskizToken()}` },
    });
    if (res.status === 401) token = null;
    return res.ok;
  } catch (e) {
    console.error("SMS xatosi", e);
    return false;
  }
}
