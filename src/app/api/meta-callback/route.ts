import { cookies } from "next/headers";
import { finishLogin } from "@/lib/meta-token";

/** Meta login'dan qaytish: state tekshiriladi, kod uzoq muddatli tokenga almashtiriladi va shifrlab saqlanadi. */
export const dynamic = "force-dynamic";

const page = (title: string, body: string, status = 200) =>
  new Response(
    `<!doctype html><html lang="uz"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title>
<style>body{font-family:system-ui,sans-serif;background:#0f1615;color:#f2ebdf;display:grid;place-items:center;min-height:100vh;margin:0;padding:16px}
main{max-width:460px;background:#162120;border:1px solid #26332f;border-radius:16px;padding:28px}h1{font-size:22px;margin:0 0 12px}p{color:#a59d90;line-height:1.5}</style></head>
<body><main><h1>${title}</h1>${body}</main></body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } },
  );
const esc = (v: string) => v.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const jar = await cookies();
  const expected = jar.get("meta_oauth_state")?.value;
  const state = url.searchParams.get("state");
  if (url.searchParams.get("error")) {
    return page("Ulanmadi", `<p>Facebook ruxsat bermadi: ${esc(url.searchParams.get("error_description") ?? url.searchParams.get("error") ?? "")}. Ulash havolasini qayta oching.</p>`, 400);
  }
  if (!expected || !state || expected !== state) {
    return page("Havola eskirgan", "<p>Ulash sahifasini qaytadan oching (havola 10 daqiqa amal qiladi va faqat shu brauzerda ishlaydi).</p>", 400);
  }
  const code = url.searchParams.get("code");
  if (!code) return page("Ulanmadi", "<p>Facebook kod qaytarmadi. Qayta urinib ko'ring.</p>", 400);
  try {
    const r = await finishLogin(code);
    jar.delete({ name: "meta_oauth_state", path: "/api/meta-callback" });
    const until = r.expiresAt.toLocaleDateString("uz-UZ", { timeZone: "Asia/Tashkent" });
    return page("✓ Meta ulandi", `<p><b>${esc(r.userName || "Facebook profili")}</b> ulandi. Claude endi shu profil ko'radigan barcha reklama akkauntlarini ko'radi, yangi ochilganlari ham o'zi qo'shiladi.</p><p>Ulanish <b>${until}</b> gacha amal qiladi — undan oldin Claude va Telegram bot eslatadi.</p><p>Bu oynani yopishingiz mumkin.</p>`);
  } catch (e) {
    console.error("meta callback", e);
    return page("Ulanmadi", `<p>Meta tokenni bermadi: ${esc((e as Error).message)}. Meta ilovasi sozlamalarida "Valid OAuth Redirect URIs" ga shu manzil qo'shilganini tekshiring.</p>`, 500);
  }
}
