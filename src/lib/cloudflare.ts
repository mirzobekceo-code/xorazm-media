import "server-only";

/**
 * Cloudflare Images (rasmlar) va Stream (video). CLOUDFLARE_ACCOUNT_ID va CLOUDFLARE_API_TOKEN bo'lmasa
 * o'chiq — fayllar avvalgidek Vercel Blob'ga yoziladi.
 * Token ruxsatlari: Account · Stream · Edit va Account · Cloudflare Images · Edit.
 */
const account = () => process.env.CLOUDFLARE_ACCOUNT_ID ?? "";
const token = () => process.env.CLOUDFLARE_API_TOKEN ?? "";
export const cfEnabled = () => !!(account() && token());

/** Odatda Cloudflare API; sinov uchun CLOUDFLARE_API_URL bilan almashtiriladi */
const API = process.env.CLOUDFLARE_API_URL ?? "https://api.cloudflare.com/client/v4";

type CfResponse<T> = { success: boolean; result: T; errors?: { code: number; message: string }[] };

async function cf<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}/accounts/${account()}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${token()}`, ...(init.body instanceof FormData ? {} : { "content-type": "application/json" }), ...init.headers },
  });
  const json = (await res.json().catch(() => null)) as CfResponse<T> | null;
  if (!json?.success) throw new Error(`Cloudflare ${path}: ${json?.errors?.map((e) => `${e.code} ${e.message}`).join("; ") ?? res.status}`);
  return json.result;
}

/** Rasm variantlari: to'liq (1600px gacha) va kartochka uchun kesilgan (600×760). */
export const IMAGE_VARIANTS = {
  full: { fit: "scale-down", width: 1600, height: 1600, metadata: "none" },
  thumb: { fit: "cover", width: 600, height: 760, metadata: "none" },
} as const;

/** Variantlar yo'q bo'lsa yaratadi (bir martalik sozlash; takror chaqirish xavfsiz). */
export async function ensureImageVariants(): Promise<string[]> {
  const cur = await cf<{ variants: Record<string, unknown> }>("/images/v1/variants");
  const made: string[] = [];
  for (const [id, options] of Object.entries(IMAGE_VARIANTS)) {
    if (cur.variants[id]) continue;
    await cf("/images/v1/variants", { method: "POST", body: JSON.stringify({ id, options, neverRequireSignedURLs: true }) });
    made.push(id);
  }
  return made;
}

/** Rasmni yuklaydi; to'liq va kichik nusxa manzillarini qaytaradi. */
export async function uploadImage(data: Buffer, filename: string, meta: Record<string, string> = {}) {
  const form = new FormData();
  form.set("file", new Blob([new Uint8Array(data)], { type: "image/webp" }), filename);
  form.set("metadata", JSON.stringify(meta));
  const r = await cf<{ id: string; variants: string[] }>("/images/v1", { method: "POST", body: form });
  // Manzil: https://imagedelivery.net/<hash>/<id>/<variant>
  const base = r.variants[0].replace(/\/[^/]+$/, "");
  return { id: r.id, url: `${base}/full`, thumbUrl: `${base}/thumb` };
}

export async function deleteImage(id: string) {
  await cf(`/images/v1/${id}`, { method: "DELETE" }).catch(() => {});
}

/** Brauzer videoni to'g'ridan-to'g'ri Cloudflare'ga yuklashi uchun bir martalik manzil. */
export async function createVideoUpload(maxDurationSeconds: number, meta: Record<string, string>) {
  const r = await cf<{ uploadURL: string; uid: string }>("/stream/direct_upload", {
    method: "POST", body: JSON.stringify({ maxDurationSeconds, meta, requireSignedURLs: false }),
  });
  return { uid: r.uid, uploadURL: r.uploadURL, ...videoUrls(r.uid) };
}

/** Pleer (iframe) va muqova manzillari — video tayyor bo'lmasa ham oldindan ma'lum. */
export const videoUrls = (uid: string) => ({
  url: `https://iframe.videodelivery.net/${uid}`,
  thumbUrl: `https://videodelivery.net/${uid}/thumbnails/thumbnail.jpg?time=1s&height=760`,
});

export type VideoState = { ready: boolean; state: string; duration: number; size: number; error?: string };

export async function videoStatus(uid: string): Promise<VideoState> {
  const r = await cf<{ readyToStream: boolean; status: { state: string; errorReasonText?: string }; duration: number; size: number }>(`/stream/${uid}`);
  return { ready: r.readyToStream, state: r.status.state, duration: r.duration, size: r.size, error: r.status.errorReasonText || undefined };
}

export async function deleteVideo(uid: string) {
  await cf(`/stream/${uid}`, { method: "DELETE" }).catch(() => {});
}

/** Fayl manzilidan Cloudflare obyektini aniqlaydi (o'chirish uchun). */
export function cfRef(url: string | null): { kind: "image" | "video"; id: string } | null {
  if (!url) return null;
  let m = url.match(/^https:\/\/imagedelivery\.net\/[^/]+\/([^/]+)\//);
  if (m) return { kind: "image", id: m[1] };
  m = url.match(/^https:\/\/(?:iframe\.)?videodelivery\.net\/([a-f0-9]{32})/);
  if (m) return { kind: "video", id: m[1] };
  return null;
}

export const isCfVideo = (url: string) => cfRef(url)?.kind === "video";

/** Token va ruxsatlarni tekshirish (diagnostika). */
export async function cfCheck() {
  const out: Record<string, unknown> = { enabled: cfEnabled() };
  if (!cfEnabled()) return out;
  const verify = await fetch(`${API}/user/tokens/verify`, { headers: { authorization: `Bearer ${token()}` } }).then((r) => r.json()).catch((e) => ({ error: String(e) }));
  out.token = (verify as { result?: { status?: string } }).result?.status ?? verify;
  out.stream = await cf<unknown[]>("/stream?limit=1").then((r) => `ok (${r.length} ta ko'rindi)`).catch((e) => String(e.message));
  out.images = await cf<{ count: { current: number; allowed: number } }>("/images/v1/stats").then((r) => r.count).catch((e) => String(e.message));
  out.variants = await cf<{ variants: Record<string, unknown> }>("/images/v1/variants").then((r) => Object.keys(r.variants)).catch((e) => String(e.message));
  return out;
}
