/**
 * Har bir kasb uchun portfolio talablari: tekshiruvga yuborishdan oldin shular bajarilishi kerak.
 * Klient (forma) va server (submitForReview) bir xil qoidani ishlatadi.
 */
export type PortfolioRule = {
  /** Profil rasmidan tashqari kamida nechta portfolio ishi (rasm yoki video) */
  minWorks: number;
  /** Portfolio uchun ko'rsatma */
  worksHint: string;
  /** Kamida nechta video ish — yuklangan video yoki havola hisoblanadi (video talab qiladigan kasblar) */
  minVideos: number;
  /** minVideos uchun nom: "Showreel", "Reels yoki TikTok videolari"… */
  videoLabel: string;
  /** Ixtiyoriy havolalar maydoni (Instagram, YouTube…) */
  linkLabel: string;
  linkHint: string;
  /** Natija yoki statistika skrinshoti: faqat moderator ko'radi */
  proof?: { label: string; hint: string; required: boolean };
};

const DEFAULT: PortfolioRule = {
  minWorks: 0, worksHint: "Ishlaringizdan rasm yoki video",
  minVideos: 0, videoLabel: "Video", linkLabel: "Ishlaringiz havolalari", linkHint: "YouTube, Instagram, TikTok, Telegram yoki Google Drive",
};

export const PORTFOLIO: Record<string, PortfolioRule> = {
  "brand-face": {
    minWorks: 3, worksHint: "Yuz yaqindan, to‘liq bo‘y, reklama kadri yoki showreel video",
    minVideos: 1, videoLabel: "Showreel yoki reklama videosi",
    linkLabel: "Reklama videolaringiz havolalari", linkHint: "Ishtirok etgan reklamangiz yoki Reels havolasi",
  },
  operator: {
    minWorks: 3, worksHint: "Suratga olgan kadrlaringiz va videolaringiz",
    minVideos: 1, videoLabel: "Showreel",
    linkLabel: "Showreel havolasi", linkHint: "Eng yaxshi ishlaringiz jamlangan video (YouTube, Instagram, Drive)",
  },
  mobilograf: {
    minWorks: 0, worksHint: "O‘zingiz olgan Reels va TikTok videolar",
    minVideos: 3, videoLabel: "Reels yoki TikTok videolari",
    linkLabel: "Reels yoki TikTok havolalari", linkHint: "Instagram yoki TikTok’dagi videolaringiz",
  },
  montajor: {
    minWorks: 0, worksHint: "Montaj qilgan videolaringiz",
    minVideos: 2, videoLabel: "Montaj qilgan videolar",
    linkLabel: "Montaj qilgan videolaringiz havolalari", linkHint: "YouTube, Instagram yoki Google Drive",
  },
  marketolog: {
    minWorks: 0, worksHint: "Keysdan slaydlar yoki natijalar",
    minVideos: 0, videoLabel: "Video",
    linkLabel: "Keys yoki taqdimot havolalari", linkHint: "Keys, taqdimot yoki loyiha sahifasi",
  },
  targetolog: {
    minWorks: 0, worksHint: "Reklama kreativlari yoki natijalar",
    minVideos: 0, videoLabel: "Video",
    linkLabel: "Keys yoki sahifa havolalari", linkHint: "Natijalar haqida post yoki keys",
    proof: { label: "Reklama kabinetidan natija skrinshoti", hint: "Lidlar soni, narxi va budjet ko‘rinsin. Faqat moderator ko‘radi.", required: true },
  },
  smm: {
    minWorks: 0, worksHint: "Postlar, stories yoki Reels namunalari",
    minVideos: 2, videoLabel: "Ish namunasi (video yoki yuritgan sahifangiz havolasi)",
    linkLabel: "Yuritgan sahifalaringiz", linkHint: "Instagram yoki Telegram sahifa havolalari",
  },
  bloger: {
    minWorks: 0, worksHint: "Reklama namunalari",
    minVideos: 0, videoLabel: "Video",
    linkLabel: "Reklama namunalari havolalari", linkHint: "Oldingi reklamalaringiz (Reels, stories highlights)",
    proof: { label: "Instagram Insights skrinshotlari", hint: "Auditoriya (jins, yosh, shaharlar) va oxirgi 30 kun qamrovi. Faqat moderator ko‘radi.", required: true },
  },
  fotograf: {
    minWorks: 6, worksHint: "Eng yaxshi suratlaringiz",
    minVideos: 0, videoLabel: "Video",
    linkLabel: "Portfolio havolasi", linkHint: "Instagram yoki Drive albom",
  },
  dizayner: {
    minWorks: 4, worksHint: "Ishlaringiz: logotip, post, banner",
    minVideos: 0, videoLabel: "Video",
    linkLabel: "Qo‘shimcha ishlar havolasi", linkHint: "Behance, Instagram yoki Drive",
  },
  suhandon: {
    minWorks: 0, worksHint: "Ovozingiz yangragan videolar",
    minVideos: 1, videoLabel: "Ovoz namunasi (video yoki havola)",
    linkLabel: "Ovoz namunasi havolasi", linkHint: "Telegram post, Google Drive, SoundCloud yoki YouTube",
  },
  studiya: {
    minWorks: 4, worksHint: "Studiyaning umumiy ko‘rinishi, fonlar, svetlar, video tur",
    minVideos: 0, videoLabel: "Video",
    linkLabel: "Studiyada olingan ishlar", linkHint: "Video tur yoki namunalar havolasi",
  },
  "texnika-ijarasi": {
    minWorks: 2, worksHint: "Texnikalaringiz rasmi yoki videosi",
    minVideos: 0, videoLabel: "Video",
    linkLabel: "Qo‘shimcha havola", linkHint: "Telegram kanal yoki katalog",
  },
};

/**
 * Minimal tajriba talab qilinadigan yo'nalishlar: kamroq bo'lsa profil boshqa yo'nalishga o'tkaziladi
 * (masalan, 3 yildan kam tajribali "marketolog" — SMM manager).
 */
export const MIN_EXPERIENCE: Record<string, { years: number; fallback: string }> = {
  marketolog: { years: 3, fallback: "smm" },
};

/** Tajriba yetmasa o'tkaziladigan yo'nalish, aks holda null. */
export function experienceFallback(slug: string | undefined, years: number): string | null {
  const r = slug ? MIN_EXPERIENCE[slug] : undefined;
  return r && years < r.years ? r.fallback : null;
}

/** Kompaniya bo'lishi mumkin bo'lgan xizmatlar: tug'ilgan yil va jins so'ralmaydi. */
export const BUSINESS = ["studiya", "texnika-ijarasi"];
export const isBusiness = (slug: string | undefined) => !!slug && BUSINESS.includes(slug);

export const portfolioRule = (slug: string): PortfolioRule => PORTFOLIO[slug] ?? DEFAULT;

/** Narxli ro'yxat: har qatorda "Nomi — narx". */
export type PriceRow = { name: string; price: number };

export function parsePriceList(raw: string | undefined): PriceRow[] {
  return (raw ?? "").split("\n").map((line) => {
    const m = line.match(/^(.*?)\s*[—–-]\s*([\d\s]+)\s*$/);
    return m ? { name: m[1].trim(), price: Number(m[2].replace(/\s/g, "")) } : { name: line.trim(), price: 0 };
  }).filter((r) => r.name);
}

export const formatPriceList = (rows: PriceRow[]) => rows.filter((r) => r.name.trim()).map((r) => `${r.name.trim()} — ${r.price || 0}`).join("\n");

export type PortfolioCounts = {
  /** Saytdagi profil rasmi (muqova) bormi */
  hasCover: boolean;
  /** Profil rasmidan tashqari portfolio: rasm va videolar */
  works: number;
  /** Yuklangan videolar */
  videos: number;
  /** Instagram/YouTube va boshqa havolalar */
  links: number;
  /** Isbot skrinshotlari */
  proofs: number;
};

/** Profil tekshiruvga yuborilishidan oldin portfolio talablarini tekshiradi; muammo bo'lsa matn qaytaradi. */
export function portfolioProblem(slug: string, c: PortfolioCounts): string {
  const r = portfolioRule(slug);
  if (!c.hasCover) return "Saytdagi profil uchun rasm yuklang";
  if (c.works < r.minWorks) return `Portfolio: kamida ${r.minWorks} ta rasm yoki video qo‘shing (hozir ${c.works} ta)`;
  if (c.videos + c.links < r.minVideos) {
    return `${r.videoLabel}: kamida ${r.minVideos} ta kerak — video yuklang yoki havola qo‘shing (hozir ${c.videos + c.links} ta)`;
  }
  if (r.proof?.required && c.proofs < 1) return `${r.proof.label}ni yuklang`;
  return "";
}

/** Media ro'yxatidan sanoq (profil rasmi aniq tanlanmagan eski profillarda birinchi rasm hisoblanadi). */
export function countPortfolio(media: { type: string; isCover: boolean; isStatScreenshot: boolean }[], links: number): PortfolioCounts {
  const own = media.filter((m) => !m.isStatScreenshot);
  const images = own.filter((m) => m.type === "image");
  const videos = own.filter((m) => m.type === "video").length;
  const hasCover = images.length > 0;
  const coverCounted = hasCover ? 1 : 0;
  return { hasCover, works: images.length - coverCounted + videos, videos, links, proofs: media.length - own.length };
}

/** Cloudflare Stream'ga yuklanadigan videolar soni (60 soniyagacha). Ro'yxatda yo'q kasblarga 1 ta. */
export const VIDEO_LIMITS: Record<string, number> = {
  "brand-face": 2, operator: 3, mobilograf: 3, montajor: 3, fotograf: 2, studiya: 2, bloger: 2, "texnika-ijarasi": 1,
};
export const VIDEO_SECONDS = 60;
export const videoLimit = (slug: string | undefined) => (slug ? VIDEO_LIMITS[slug] ?? 1 : 1);
