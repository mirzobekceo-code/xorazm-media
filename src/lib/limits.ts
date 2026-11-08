/**
 * Yuklash limitlari. Muhit o'zgaruvchilari bilan sozlanadi: bepul hostingda qattiq,
 * keyin kodni o'zgartirmasdan bo'shatiladi.
 */
const int = (v: string | undefined, d: number) => (v && /^\d+$/.test(v) ? Number(v) : d);

export function uploadLimits() {
  return {
    images: int(process.env.MAX_IMAGES, 6),
    screenshots: int(process.env.MAX_SCREENSHOTS, 6),
    /** 0 = video yuklash o'chirilgan, faqat havola (YouTube, Instagram, TikTok) */
    videos: int(process.env.MAX_VIDEOS, 3),
    videoMb: int(process.env.MAX_VIDEO_MB, 50),
    videoSeconds: int(process.env.MAX_VIDEO_SECONDS, 60),
    videoLinks: 5,
  };
}
export type UploadLimits = ReturnType<typeof uploadLimits>;

/** Ruxsat etilgan video havolalari: brauzer ochadigan tashqi platformalar. */
const VIDEO_HOSTS = ["youtube.com", "youtu.be", "instagram.com", "tiktok.com", "vimeo.com", "t.me", "drive.google.com", "soundcloud.com"];

export function isVideoLink(raw: string): boolean {
  try {
    const u = new URL(raw);
    return u.protocol === "https:" && VIDEO_HOSTS.some((h) => u.hostname === h || u.hostname.endsWith("." + h));
  } catch {
    return false;
  }
}

/** YouTube havolasidan video ID (sahifaga joylash uchun); boshqalar uchun null. */
export function youtubeId(raw: string): string | null {
  try {
    const u = new URL(raw);
    if (u.hostname === "youtu.be") return u.pathname.slice(1).split("/")[0] || null;
    if (u.hostname.endsWith("youtube.com")) {
      if (u.pathname === "/watch") return u.searchParams.get("v");
      const m = u.pathname.match(/^\/(shorts|embed|live)\/([\w-]{6,})/);
      return m ? m[2] : null;
    }
  } catch {}
  return null;
}

export function linkLabel(raw: string): string {
  try {
    const h = new URL(raw).hostname.replace(/^www\./, "");
    if (h.includes("youtu")) return "YouTube";
    if (h.includes("instagram")) return "Instagram";
    if (h.includes("tiktok")) return "TikTok";
    if (h.includes("vimeo")) return "Vimeo";
    if (h === "t.me") return "Telegram";
    if (h.includes("drive.google")) return "Google Drive";
    if (h.includes("soundcloud")) return "SoundCloud";
    return h;
  } catch {
    return raw;
  }
}

/** Sayt ichida ochiladigan video (iframe). `vertical` — Reels/TikTok kabi tik format, `audio` — faqat pleyer qatori. */
export type Embed = { label: string; src: string; thumb: string | null; shape: "wide" | "vertical" | "post" | "audio" };

/**
 * Havoladan sayt ichida ochiladigan pleyer manzili: YouTube, Instagram (Reels/post), TikTok, Telegram post,
 * Vimeo, Google Drive fayl, SoundCloud. Profil, kanal yoki qisqa (vm.tiktok.com) havolalar uchun null —
 * ular tashqi tugma bo'lib qoladi.
 */
export function embedFor(raw: string): Embed | null {
  let u: URL;
  try { u = new URL(raw); } catch { return null; }
  if (u.protocol !== "https:") return null;
  const h = u.hostname.replace(/^(www|m)\./, "");
  const label = linkLabel(raw);
  const yt = youtubeId(raw);
  if (yt) {
    const shorts = u.pathname.startsWith("/shorts/");
    return { label, src: `https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&rel=0`, thumb: `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`, shape: shorts ? "vertical" : "wide" };
  }
  if (h === "instagram.com") {
    const m = u.pathname.match(/^\/(?:[\w.]+\/)?(reel|reels|p|tv)\/([\w-]+)/);
    if (!m) return null;
    const kind = m[1] === "reels" ? "reel" : m[1];
    return { label, src: `https://www.instagram.com/${kind}/${m[2]}/embed/`, thumb: null, shape: kind === "p" ? "post" : "vertical" };
  }
  if (h === "tiktok.com") {
    const m = u.pathname.match(/\/video\/(\d+)/);
    return m ? { label, src: `https://www.tiktok.com/embed/v2/${m[1]}`, thumb: null, shape: "vertical" } : null;
  }
  if (h === "t.me") {
    // Ochiq kanal posti: t.me/kanal/86 (yoki t.me/s/kanal/86)
    const m = u.pathname.match(/^\/(?:s\/)?([A-Za-z]\w{3,})\/(\d+)\/?$/);
    return m ? { label, src: `https://t.me/${m[1]}/${m[2]}?embed=1&mode=tme`, thumb: null, shape: "post" } : null;
  }
  if (h === "vimeo.com" || h === "player.vimeo.com") {
    const m = u.pathname.match(/(?:^|\/)(\d{5,})(?:\/|$)/);
    return m ? { label, src: `https://player.vimeo.com/video/${m[1]}?autoplay=1`, thumb: null, shape: "wide" } : null;
  }
  if (h === "drive.google.com") {
    const m = u.pathname.match(/\/file\/d\/([\w-]{10,})/) ?? (u.pathname === "/open" ? [null, u.searchParams.get("id")] : null);
    return m?.[1] ? { label, src: `https://drive.google.com/file/d/${m[1]}/preview`, thumb: null, shape: "wide" } : null;
  }
  if (h === "soundcloud.com" && u.pathname.split("/").filter(Boolean).length >= 2) {
    return { label, src: `https://w.soundcloud.com/player/?url=${encodeURIComponent(raw)}&auto_play=true&visual=true`, thumb: null, shape: "audio" };
  }
  return null;
}
