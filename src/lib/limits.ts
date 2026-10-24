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
