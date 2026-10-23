import type { FieldDef } from "@/db/schema";

/** Boshlang'ich kasblar. Keyin admin paneldan o'zgartiriladi. */
export const PROFESSIONS: {
  slug: string; nameUz: string; nameRu: string; description: string; unit: string; icon: string; fields: FieldDef[];
}[] = [
  { slug: "brand-face", nameUz: "Brand Face", nameRu: "Бренд-фейс", description: "Model, aktyor, reklama yuzi", unit: "video",
    icon: '<circle cx="20" cy="15" r="7"/><path d="M6 36c2-8 8-12 14-12s12 4 14 12"/>',
    fields: [
      { key: "height", label: "Bo‘y (sm)", type: "number", placeholder: "168" },
      { key: "weight", label: "Vazn (kg)", type: "number", placeholder: "55" },
      { key: "brands", label: "Ishlagan brendlar", type: "text", placeholder: "Masalan: Xiva Café" },
      { key: "industries", label: "Sohalar", type: "text", placeholder: "Beauty, avto, klinika" },
    ] },
  { slug: "bloger", nameUz: "Bloger", nameRu: "Блогер", description: "Instagram, Telegram, TikTok", unit: "stories",
    icon: '<rect x="14" y="4" width="12" height="20" rx="6"/><path d="M8 18a12 12 0 0 0 24 0M20 30v6M14 36h12"/>',
    fields: [] },
  { slug: "operator", nameUz: "Operator", nameRu: "Оператор", description: "Videograf, mobilograf, dron", unit: "smena",
    icon: '<rect x="4" y="11" width="22" height="18" rx="3"/><path d="M26 17l10-5v16l-10-5"/><circle cx="15" cy="20" r="4"/>',
    fields: [
      { key: "camera", label: "Kamera va obyektivlar", type: "text", placeholder: "Sony FX3, 24-70", required: true },
      { key: "gear", label: "Qo‘shimcha texnika", type: "text", placeholder: "Dron, svet, mikrofon" },
      { key: "showreel", label: "Showreel havolasi", type: "url", placeholder: "https://" },
    ] },
  { slug: "fotograf", nameUz: "Fotograf", nameRu: "Фотограф", description: "Mahsulot, portret, tadbir", unit: "soat",
    icon: '<rect x="4" y="12" width="32" height="22" rx="3"/><path d="M14 12l3-5h6l3 5"/><circle cx="20" cy="23" r="6"/>',
    fields: [
      { key: "camera", label: "Kamera", type: "text", placeholder: "Canon R6, 24-105", required: true },
      { key: "genres", label: "Janrlar", type: "text", placeholder: "Mahsulot, portret, tadbir" },
      { key: "studio", label: "Studiya", type: "text", placeholder: "Bor, Urganch markazida" },
    ] },
  { slug: "montajor", nameUz: "Montajor", nameRu: "Монтажёр", description: "Reels, reklama, YouTube", unit: "video",
    icon: '<rect x="4" y="8" width="32" height="24" rx="3"/><path d="M4 26h32M12 26v6M20 26v6M28 26v6"/><path d="M16 13l8 5-8 5z"/>',
    fields: [
      { key: "software", label: "Dasturlar", type: "text", placeholder: "Premiere Pro, CapCut", required: true },
      { key: "formats", label: "Formatlar", type: "text", placeholder: "Reels, reklama, YouTube" },
      { key: "turnaround", label: "Topshirish muddati", type: "text", placeholder: "24 soat" },
    ] },
  { slug: "dizayner", nameUz: "Dizayner", nameRu: "Дизайнер", description: "Logotip, SMM dizayn, banner", unit: "ish",
    icon: '<rect x="5" y="5" width="13" height="13" rx="2"/><circle cx="28.5" cy="11.5" r="6.5"/><path d="M11.5 22l7 12h-14z"/><rect x="22" y="22" width="12" height="12" rx="2"/>',
    fields: [
      { key: "software", label: "Dasturlar", type: "text", placeholder: "Figma, Photoshop", required: true },
      { key: "focus", label: "Yo‘nalish", type: "text", placeholder: "Logotip, SMM, banner" },
      { key: "portfolio", label: "Behance yoki portfolio", type: "url", placeholder: "https://behance.net/" },
    ] },
  { slug: "targetolog", nameUz: "Targetolog", nameRu: "Таргетолог", description: "Meta, Telegram Ads, Google", unit: "oy",
    icon: '<circle cx="20" cy="20" r="15"/><circle cx="20" cy="20" r="9"/><circle cx="20" cy="20" r="3"/>',
    fields: [
      { key: "platforms", label: "Platformalar", type: "text", placeholder: "Meta, Telegram Ads", required: true },
      { key: "industries", label: "Sohalar", type: "text", placeholder: "Klinika, ta’lim" },
      { key: "case", label: "Eng yaxshi keys", type: "text", placeholder: "O‘quv markaz: 30 kunda 410 ta lid" },
    ] },
  { slug: "smm", nameUz: "SMM manager", nameRu: "SMM-менеджер", description: "Kontent reja, sahifa yuritish", unit: "oy",
    icon: '<rect x="9" y="4" width="22" height="32" rx="4"/><path d="M15 12h10M15 18h10M15 24h6"/>',
    fields: [
      { key: "package", label: "Xizmat paketi", type: "text", placeholder: "12 post + 30 stories", required: true },
      { key: "pages", label: "Yuritgan sahifalar", type: "text", placeholder: "@sahifa1, @sahifa2" },
      { key: "reporting", label: "Hisobot davriyligi", type: "text", placeholder: "Har hafta" },
    ] },
];

export const DISTRICTS: { slug: string; nameUz: string; nameRu: string }[] = [
  { slug: "urganch-shahri", nameUz: "Urganch shahri", nameRu: "г. Ургенч" },
  { slug: "xiva-shahri", nameUz: "Xiva shahri", nameRu: "г. Хива" },
  { slug: "urganch-tumani", nameUz: "Urganch tumani", nameRu: "Ургенчский р-н" },
  { slug: "xiva-tumani", nameUz: "Xiva tumani", nameRu: "Хивинский р-н" },
  { slug: "xonqa", nameUz: "Xonqa", nameRu: "Ханка" },
  { slug: "hazorasp", nameUz: "Hazorasp", nameRu: "Хазарасп" },
  { slug: "bogot", nameUz: "Bog‘ot", nameRu: "Багат" },
  { slug: "gurlan", nameUz: "Gurlan", nameRu: "Гурлен" },
  { slug: "shovot", nameUz: "Shovot", nameRu: "Шават" },
  { slug: "yangiariq", nameUz: "Yangiariq", nameRu: "Янгиарык" },
  { slug: "yangibozor", nameUz: "Yangibozor", nameRu: "Янгибазар" },
  { slug: "qoshkopir", nameUz: "Qo‘shko‘pir", nameRu: "Кошкупыр" },
  { slug: "tuproqqala", nameUz: "Tuproqqal’a", nameRu: "Тупроккала" },
  { slug: "pitnak", nameUz: "Pitnak", nameRu: "Питнак" },
];

export const SLOTS = {
  A1: "Header banner",
  A2: "Lenta ichidagi kartochka",
  A3: "Profil yon paneli",
  A3b: "Profil ichidagi banner",
  A4: "Mobil sticky",
  A5: "Sahifa o‘rtasi",
  A6: "Footer banner",
} as const;
export type Slot = keyof typeof SLOTS;

export const REPORT_REASONS = [
  "Soxta profil", "Noto‘g‘ri kontakt", "Firibgarlik", "Nomaqbul kontent", "Boshqa",
];

export const REJECT_REASONS = [
  "Rasm sifati past yoki yuz ko‘rinmaydi",
  "Ma’lumotlar to‘liq emas",
  "Kontaktlar ishlamaydi",
  "Statistika skrinshot bilan mos emas",
  "Qoidaga zid kontent",
];

export const LANGUAGES: [string, string][] = [["uz", "O‘zbekcha"], ["ru", "Ruscha"], ["en", "Inglizcha"]];
