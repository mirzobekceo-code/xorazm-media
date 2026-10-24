/**
 * Har bir kasb uchun portfolio talablari: tekshiruvga yuborishdan oldin shular bajarilishi kerak.
 * Klient (forma) va server (submitForReview) bir xil qoidani ishlatadi.
 */
export type PortfolioRule = {
  /** Kamida nechta rasm (muqova ham hisoblanadi) */
  minImages: number;
  /** Rasmlar uchun ko'rsatma */
  imageHint: string;
  /** Kamida nechta havola (video, ovoz yoki sahifa) */
  minLinks: number;
  linkLabel: string;
  linkHint: string;
  /** Natija yoki statistika skrinshoti: faqat moderator ko'radi */
  proof?: { label: string; hint: string; required: boolean };
};

const DEFAULT: PortfolioRule = {
  minImages: 1, imageHint: "Ishlaringizdan rasmlar",
  minLinks: 0, linkLabel: "Ishlaringiz havolalari", linkHint: "YouTube, Instagram, TikTok, Telegram yoki Google Drive",
};

export const PORTFOLIO: Record<string, PortfolioRule> = {
  "brand-face": {
    minImages: 4, imageHint: "Yuz yaqindan, to‘liq bo‘y va reklama kadri — kamida 4 ta",
    minLinks: 1, linkLabel: "Showreel yoki reklama videolaringiz", linkHint: "Ishtirok etgan reklamangiz yoki Reels havolasi",
  },
  operator: {
    minImages: 3, imageHint: "Suratga olgan kadrlaringiz — kamida 3 ta",
    minLinks: 1, linkLabel: "Showreel havolasi", linkHint: "Eng yaxshi ishlaringiz jamlangan video (YouTube, Instagram, Drive)",
  },
  mobilograf: {
    minImages: 1, imageHint: "Muqova uchun rasm",
    minLinks: 3, linkLabel: "Reels yoki TikTok havolalari", linkHint: "O‘zingiz olgan kamida 3 ta video",
  },
  montajor: {
    minImages: 1, imageHint: "Muqova uchun rasm yoki ishingizdan kadr",
    minLinks: 2, linkLabel: "Montaj qilgan videolaringiz", linkHint: "Kamida 2 ta video havola",
  },
  targetolog: {
    minImages: 1, imageHint: "Muqova uchun rasm",
    minLinks: 0, linkLabel: "Keys yoki sahifa havolalari", linkHint: "Ixtiyoriy: natijalar haqida post yoki keys",
    proof: { label: "Reklama kabinetidan natija skrinshoti", hint: "Lidlar soni, narxi va budjet ko‘rinsin. Faqat moderator ko‘radi.", required: true },
  },
  smm: {
    minImages: 1, imageHint: "Muqova uchun rasm yoki ishingizdan namuna",
    minLinks: 2, linkLabel: "Yuritgan sahifalaringiz", linkHint: "Kamida 2 ta Instagram yoki Telegram sahifa havolasi",
  },
  bloger: {
    minImages: 1, imageHint: "Reklama namunalari va muqova",
    minLinks: 0, linkLabel: "Reklama namunalari havolalari", linkHint: "Oldingi reklamalaringiz (Reels, stories highlights)",
    proof: { label: "Instagram Insights skrinshotlari", hint: "Auditoriya (jins, yosh, shaharlar) va oxirgi 30 kun qamrovi. Faqat moderator ko‘radi.", required: true },
  },
  fotograf: {
    minImages: 6, imageHint: "Eng yaxshi suratlaringiz — kamida 6 ta",
    minLinks: 0, linkLabel: "Portfolio havolasi", linkHint: "Ixtiyoriy: Instagram yoki Drive albom",
  },
  dizayner: {
    minImages: 4, imageHint: "Ishlaringiz: logotip, post, banner — kamida 4 ta",
    minLinks: 0, linkLabel: "Qo‘shimcha ishlar havolasi", linkHint: "Ixtiyoriy",
  },
  suhandon: {
    minImages: 1, imageHint: "Muqova uchun rasm",
    minLinks: 1, linkLabel: "Ovoz namunasi", linkHint: "Telegram post, Google Drive, SoundCloud yoki YouTube havolasi",
  },
  studiya: {
    minImages: 4, imageHint: "Studiyaning umumiy ko‘rinishi, fonlar, svetlar — kamida 4 ta",
    minLinks: 0, linkLabel: "Studiyada olingan ishlar", linkHint: "Ixtiyoriy: video tur yoki namunalar",
  },
  "texnika-ijarasi": {
    minImages: 2, imageHint: "Texnikalaringiz rasmi — kamida 2 ta",
    minLinks: 0, linkLabel: "Qo‘shimcha havola", linkHint: "Ixtiyoriy: Telegram kanal yoki katalog",
  },
};

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

/** Profil tekshiruvga yuborilishidan oldin portfolio talablarini tekshiradi; muammo bo'lsa matn qaytaradi. */
export function portfolioProblem(slug: string, counts: { images: number; links: number; proofs: number }): string {
  const r = portfolioRule(slug);
  if (counts.images < r.minImages) return `Kamida ${r.minImages} ta rasm yuklang (hozir ${counts.images} ta)`;
  if (counts.links < r.minLinks) return `“${r.linkLabel}”: kamida ${r.minLinks} ta havola qo‘shing (3-qadam)`;
  if (r.proof?.required && counts.proofs < 1) return `${r.proof.label}ni yuklang`;
  return "";
}
