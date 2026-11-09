import { accountDetails, DATE_PRESETS, listAdAccounts, listCampaigns, MetaError, problemAds, spendReport } from "@/lib/meta-ads";
import { daysLeft, getToken, loginConfigured } from "@/lib/meta-token";
import { mcpAuthorized } from "@/lib/mcp-auth";

/**
 * Claude uchun "custom connector" (MCP, Streamable HTTP, holatsiz): Meta reklama akkauntlarini FAQAT O'QISH.
 * Manzil: https://<sayt>/api/mcp/<MCP_SECRET> — maxfiy kalit manzilning o'zida (Claude custom connector shunday ulanadi).
 * MCP_SECRET o'rnatilmagan bo'lsa yoki kalit noto'g'ri bo'lsa — 404 (endpoint borligi ham bilinmaydi).
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PROTOCOLS = ["2025-06-18", "2025-03-26", "2024-11-05"];
const SERVER = { name: "adverto-meta-ads", title: "Meta Ads (faqat o'qish)", version: "1.0.0" };


const datePreset = { type: "string", enum: [...DATE_PRESETS], description: "Davr: today (bugun), yesterday, last_7d, last_14d, last_30d, this_month, last_month, maximum. Standart: last_7d." };
const accountId = { type: "string", description: "Reklama akkaunt ID, masalan act_1234567890 (list_ad_accounts natijasidagi id)" };
const ro = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true };

/** Ulanish holati: kim ulangan, qachon tugaydi, qayta ulash havolasi */
async function connectionStatus(_: unknown, ctx: Ctx2) {
  const t = await getToken();
  const left = daysLeft(t);
  return {
    ulangan: !!t,
    usul: t?.source === "login" ? "Facebook orqali ulash" : t?.source === "env" ? "META_ACCESS_TOKEN (Vercel)" : null,
    profil: t?.userName ?? null,
    ulangan_sana: t?.connectedAt?.toISOString().slice(0, 10) ?? null,
    tugash_sanasi: t?.expiresAt?.toISOString().slice(0, 10) ?? null,
    qolgan_kun: left,
    ulash_havolasi: loginConfigured() ? ctx.connectUrl : null,
    eslatma: !t ? "Meta hali ulanmagan — ulash_havolasi orqali Facebook bilan ulaning."
      : left !== null && left <= 10 ? `Ulanish ${left} kundan keyin tugaydi — ulash_havolasi orqali qayta ulaning.` : "Ulanish ishlayapti.",
  };
}
type Ctx2 = { connectUrl: string };

const TOOLS = [
  {
    name: "connection_status",
    title: "Meta ulanish holati",
    description: "Meta (Facebook) ulanishi: qaysi profil ulangan, qachon tugaydi, necha kun qoldi va qayta ulash havolasi. Ulanish xatosi bo'lsa yoki foydalanuvchi qayta ulamoqchi bo'lsa — shuni chaqiring va havolani bering.",
    inputSchema: { type: "object", properties: {} },
    annotations: { title: "Meta ulanish holati", ...ro },
    run: connectionStatus,
  },
  {
    name: "list_ad_accounts",
    title: "Reklama akkauntlari holati",
    description: "Barcha Meta reklama akkauntlari: holati (faol, bloklangan, qarz bor, to'lov kutilmoqda…), bloklanish sababi, to'lanadigan summa, sarf limiti va qolgani, tanlangan davrdagi sarf. Muammolilar birinchi turadi.",
    inputSchema: {
      type: "object",
      properties: {
        date_preset: datePreset,
        search: { type: "string", description: "Akkaunt nomi, ID yoki biznes nomi bo'yicha qidiruv" },
        only_problems: { type: "boolean", description: "true — faqat muammoli akkauntlar (faol emas yoki sarf limiti tugayapti)" },
      },
    },
    annotations: { title: "Reklama akkauntlari holati", ...ro },
    run: listAdAccounts,
  },
  {
    name: "get_ad_account",
    title: "Bitta akkaunt tafsiloti",
    description: "Bitta reklama akkaunti: holat, bloklanish sababi, qarz, limit va davr bo'yicha natijalar (sarf, ko'rishlar, kliklar, CTR, CPC, lidlar, yozishmalar).",
    inputSchema: { type: "object", properties: { account_id: accountId, date_preset: datePreset }, required: ["account_id"] },
    annotations: { title: "Bitta akkaunt tafsiloti", ...ro },
    run: accountDetails,
  },
  {
    name: "list_campaigns",
    title: "Kampaniyalar",
    description: "Akkauntdagi kampaniyalar: holati, maqsadi, kunlik/umumiy budjeti, qolgan budjet, Meta ko'rsatgan muammolar va davr natijalari.",
    inputSchema: {
      type: "object",
      properties: { account_id: accountId, date_preset: datePreset, only_active: { type: "boolean", description: "true — faqat faol, muammoli va tekshiruvdagi kampaniyalar" } },
      required: ["account_id"],
    },
    annotations: { title: "Kampaniyalar", ...ro },
    run: listCampaigns,
  },
  {
    name: "find_problem_ads",
    title: "Rad etilgan va muammoli reklamalar",
    description: "Rad etilgan (DISAPPROVED), muammoli (WITH_ISSUES) va tekshiruvdagi reklamalar va Meta ko'rsatgan sabablar. account_id berilmasa — barcha faol akkauntlar tekshiriladi (sekinroq).",
    inputSchema: { type: "object", properties: { account_id: accountId } },
    annotations: { title: "Rad etilgan va muammoli reklamalar", ...ro },
    run: problemAds,
  },
  {
    name: "spend_report",
    title: "Sarf va natijalar hisoboti",
    description: "Sarf va natijalar. account_id bo'lmasa — barcha akkauntlar sarfi (ko'pdan kamga). account_id bilan — shu akkaunt; by_campaign=true bo'lsa kampaniyalarga bo'lib.",
    inputSchema: {
      type: "object",
      properties: { account_id: accountId, date_preset: datePreset, by_campaign: { type: "boolean", description: "true — kampaniyalar kesimida (faqat account_id bilan)" } },
    },
    annotations: { title: "Sarf va natijalar hisoboti", ...ro },
    run: spendReport,
  },
] as const;

const INSTRUCTIONS =
  "Meta (Facebook/Instagram) reklama akkauntlarini faqat o'qish uchun connector. Avval list_ad_accounts bilan akkauntlar va ID'larni oling. Ulanish xatosi bo'lsa connection_status bilan qayta ulash havolasini bering. " +
  "Pul summalari akkaunt valyutasida. Bu connector reklamani o'zgartira olmaydi — o'zgartirish so'ralsa, Ads Manager'da qo'lda qilishni tavsiya qiling.";

type Rpc = { jsonrpc?: string; id?: string | number | null; method?: string; params?: Record<string, unknown> };
const ok = (id: Rpc["id"], result: unknown) => ({ jsonrpc: "2.0", id, result });
const fail = (id: Rpc["id"], code: number, message: string) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });

async function handle(msg: Rpc, ctx: Ctx2) {
  const id = msg.id;
  switch (msg.method) {
    case "initialize": {
      const asked = String(msg.params?.protocolVersion ?? "");
      return ok(id, {
        protocolVersion: PROTOCOLS.includes(asked) ? asked : PROTOCOLS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER,
        instructions: INSTRUCTIONS,
      });
    }
    case "ping":
      return ok(id, {});
    case "tools/list":
      return ok(id, { tools: TOOLS.map(({ run: _run, ...t }) => t) });
    case "tools/call": {
      const name = String(msg.params?.name ?? "");
      const tool = TOOLS.find((t) => t.name === name);
      if (!tool) return fail(id, -32602, `Noma'lum asbob: ${name}`);
      try {
        const args = (msg.params?.arguments ?? {}) as Record<string, unknown>;
        const data = await (tool.run as (a: Record<string, unknown>, c: Ctx2) => Promise<unknown>)(args, ctx);
        // Ulanish tugashiga oz qolgan bo'lsa — har javobda ogohlantirish
        const left = tool.name === "connection_status" ? null : daysLeft(await getToken());
        const warn = left !== null && left <= 10 ? { ogohlantirish: `Meta ulanishi ${left} kundan keyin tugaydi. Qayta ulash: ${ctx.connectUrl}` } : {};
        return ok(id, { content: [{ type: "text", text: JSON.stringify({ ...warn, ...(data as object) }) }] });
      } catch (e) {
        const text = e instanceof MetaError ? e.message : "Meta'dan ma'lumot olishda kutilmagan xato. Birozdan keyin qayta urinib ko'ring.";
        if (!(e instanceof MetaError)) console.error("mcp tool", name, e);
        return ok(id, { isError: true, content: [{ type: "text", text }] });
      }
    }
    default:
      return fail(id, -32601, `Qo'llab-quvvatlanmaydigan metod: ${msg.method}`);
  }
}

type Ctx = { params: Promise<{ key: string }> };
const notFound = () => new Response("Not found", { status: 404 });

export async function POST(req: Request, { params }: Ctx) {
  const key = (await params).key;
  if (!mcpAuthorized(key)) return notFound();
  const ctx: Ctx2 = { connectUrl: `${new URL(req.url).origin}/api/mcp/${key}/connect` };
  let body: Rpc | Rpc[];
  try {
    body = await req.json();
  } catch {
    return Response.json(fail(null, -32700, "Parse error"), { status: 400 });
  }
  const list = Array.isArray(body) ? body : [body];
  // Bildirishnomalar (id yo'q) javob talab qilmaydi
  const replies = (await Promise.all(list.map((m) => (m && m.id !== undefined && m.id !== null ? handle(m, ctx) : null)))).filter(Boolean);
  if (!replies.length) return new Response(null, { status: 202 });
  return Response.json(Array.isArray(body) ? replies : replies[0], { headers: { "cache-control": "no-store" } });
}

/** Holatsiz server: SSE oqimi va sessiyalar yo'q */
export async function GET(_req: Request, { params }: Ctx) {
  if (!mcpAuthorized((await params).key)) return notFound();
  return new Response("Method Not Allowed", { status: 405, headers: { allow: "POST" } });
}
export const DELETE = GET;
