import type { FieldDef } from "@/db/schema";

/** Boshlang'ich kasblar. Keyin admin paneldan o'zgartiriladi. */
export const PROFESSIONS: {
  slug: string; nameUz: string; nameRu: string; description: string; unit: string; icon: string; fields: FieldDef[];
}[] = [
  { slug: "brand-face", nameUz: "Brand Face", nameRu: "Бренд-фейс", description: "Model, aktyor, reklama yuzi", unit: "video",
    icon: '<circle cx="20" cy="14" r="7"/><path d="M6 36c2-8 8-12 14-12s12 4 14 12"/>',
    fields: [
      { key: "height", label: "Bo‘y (sm)", type: "number", placeholder: "168" },
      { key: "weight", label: "Vazn (kg)", type: "number", placeholder: "55" },
      { key: "brands", label: "Ishlagan brendlar", type: "text", placeholder: "Masalan: Xiva Café" },
      { key: "industries", label: "Sohalar", type: "text", placeholder: "Beauty, avto, klinika" },
    ] },
  { slug: "operator", nameUz: "Operator", nameRu: "Оператор", description: "Videograf, mobilograf, dron", unit: "smena",
    icon: '<rect x="4" y="11" width="22" height="18" rx="3"/><path d="M26 17l10-5v16l-10-5"/><circle cx="15" cy="20" r="4"/>',
    fields: [
      { key: "camera", label: "Kamera va obyektivlar", type: "text", placeholder: "Sony FX3, 24-70", required: true },
      { key: "gear", label: "Qo‘shimcha texnika", type: "text", placeholder: "Dron, svet, mikrofon" },
      { key: "formats", label: "Formatlar", type: "text", placeholder: "Reklama, tadbir, podkast" },
    ] },
  { slug: "mobilograf", nameUz: "Mobilograf", nameRu: "Мобилограф", description: "Telefonda Reels, TikTok, stories", unit: "video",
    icon: '<rect x="11" y="4" width="18" height="32" rx="4"/><circle cx="20" cy="18" r="4.5"/><path d="M17 30h6"/>',
    fields: [
      { key: "device", label: "Telefon va jihozlar", type: "text", placeholder: "iPhone 15 Pro, gimbal, mikrofon", required: true },
      { key: "formats", label: "Formatlar", type: "text", placeholder: "Reels, TikTok, stories" },
      { key: "editing", label: "Montaj ham qilasizmi", type: "text", placeholder: "Ha, CapCut" },
    ] },
  { slug: "montajor", nameUz: "Montajor", nameRu: "Монтажёр", description: "Reels, reklama, YouTube", unit: "video",
    icon: '<rect x="4" y="9" width="13" height="8" rx="2"/><rect x="21" y="9" width="15" height="8" rx="2"/><rect x="4" y="23" width="19" height="8" rx="2"/><rect x="27" y="23" width="9" height="8" rx="2"/><path d="M19 4v32"/>',
    fields: [
      { key: "software", label: "Dasturlar", type: "text", placeholder: "Premiere Pro, CapCut", required: true },
      { key: "formats", label: "Formatlar", type: "text", placeholder: "Reels, reklama, YouTube" },
      { key: "turnaround", label: "Topshirish muddati", type: "text", placeholder: "24 soat" },
      { key: "extras", label: "Qo‘shimcha xizmatlar", type: "text", placeholder: "Subtitr, rang to‘g‘rilash, sound design" },
    ] },
  { slug: "marketolog", nameUz: "Marketolog", nameRu: "Маркетолог", description: "Strategiya, brend, savdo voronkasi · 3+ yil tajriba", unit: "oy",
    icon: '<path d="M6 34V24M14 34V18M22 34V22M30 34V12"/><path d="M5 15l8-6 8 5 13-9"/><path d="M28 5h6v6"/>',
    fields: [
      { key: "services", label: "Xizmatlar", type: "text", placeholder: "Marketing strategiya, brend, savdo voronkasi", required: true },
      { key: "industries", label: "Sohalar", type: "text", placeholder: "Klinika, ta’lim, savdo" },
      { key: "case", label: "Eng yaxshi keys (raqamlar bilan)", type: "textarea", placeholder: "Klinika: 6 oyda murojaatlar 2,4 barobar oshdi", required: true },
      { key: "team", label: "Jamoangiz", type: "text", placeholder: "Targetolog, dizayner, mobilograf" },
    ] },
  { slug: "targetolog", nameUz: "Targetolog", nameRu: "Таргетолог", description: "Meta, Telegram Ads, Google", unit: "oy",
    icon: '<circle cx="20" cy="20" r="12.5" stroke-width="5"/><circle cx="20" cy="20" r="4.5" fill="currentColor" stroke="none"/>',
    fields: [
      { key: "platforms", label: "Platformalar", type: "text", placeholder: "Meta, Telegram Ads", required: true },
      { key: "industries", label: "Sohalar", type: "text", placeholder: "Klinika, ta’lim" },
      { key: "case", label: "Eng yaxshi keys (raqamlar bilan)", type: "textarea", placeholder: "O‘quv markaz: 30 kunda 410 ta lid, lid narxi 9 000 so‘m", required: true },
      { key: "minBudget", label: "Minimal reklama budjeti", type: "text", placeholder: "Oyiga 3 mln so‘m" },
    ] },
  { slug: "smm", nameUz: "SMM manager", nameRu: "SMM-менеджер", description: "Kontent reja, sahifa yuritish", unit: "oy",
    icon: '<rect x="10" y="4" width="20" height="32" rx="4"/><path d="M20 25.5s-6-3.6-6-7.6a3.3 3.3 0 0 1 6-1.9 3.3 3.3 0 0 1 6 1.9c0 4-6 7.6-6 7.6z"/>',
    fields: [
      { key: "package", label: "Xizmat paketi", type: "text", placeholder: "12 post + 30 stories", required: true },
      { key: "pages", label: "Yuritgan sahifalar", type: "text", placeholder: "@sahifa1, @sahifa2" },
      { key: "reporting", label: "Hisobot davriyligi", type: "text", placeholder: "Har hafta" },
    ] },
  { slug: "bloger", nameUz: "Bloger", nameRu: "Блогер", description: "Instagram, Telegram, TikTok", unit: "stories",
    icon: '<circle cx="20" cy="20" r="16" stroke-dasharray="7 3.5"/><circle cx="20" cy="16.5" r="5"/><path d="M11.5 30c2-4 5-6 8.5-6s6.5 2 8.5 6"/>',
    fields: [] },
  { slug: "fotograf", nameUz: "Fotograf", nameRu: "Фотограф", description: "Mahsulot, portret, tadbir", unit: "soat",
    icon: '<rect x="4" y="12" width="32" height="22" rx="3"/><path d="M14 12l3-5h6l3 5"/><circle cx="20" cy="23" r="6"/>',
    fields: [
      { key: "camera", label: "Kamera", type: "text", placeholder: "Canon R6, 24-105", required: true },
      { key: "genres", label: "Janrlar", type: "text", placeholder: "Mahsulot, portret, tadbir" },
      { key: "studio", label: "Studiya", type: "text", placeholder: "Bor, Urganch markazida" },
    ] },
  { slug: "dizayner", nameUz: "Grafik dizayner", nameRu: "Дизайнер", description: "Logotip, SMM dizayn, banner", unit: "ish",
    icon: '<path d="M20 4l10 15-10 17-10-17z"/><path d="M20 4v12"/><circle cx="20" cy="19" r="3"/>',
    fields: [
      { key: "software", label: "Dasturlar", type: "text", placeholder: "Figma, Photoshop", required: true },
      { key: "focus", label: "Yo‘nalish", type: "text", placeholder: "Logotip, SMM, banner" },
      { key: "portfolio", label: "Behance yoki portfolio", type: "url", placeholder: "https://behance.net/" },
    ] },
  { slug: "suhandon", nameUz: "Suhandon (diktor)", nameRu: "Диктор", description: "Ovoz berish, diktorlik, boshlovchi", unit: "rolik",
    icon: '<rect x="14" y="4" width="12" height="20" rx="6"/><path d="M8 18a12 12 0 0 0 24 0M20 30v6M14 36h12"/>',
    fields: [
      { key: "voice", label: "Ovoz turi", type: "text", placeholder: "Bariton, yumshoq ayol ovozi", required: true },
      { key: "languages", label: "Tillar", type: "text", placeholder: "O‘zbek, rus" },
      { key: "studio", label: "Yozib olish", type: "text", placeholder: "Uy studiyasi bor" },
    ] },
  { slug: "studiya", nameUz: "Studiya", nameRu: "Студия", description: "Foto va video studiya ijarasi", unit: "soat",
    icon: '<path d="M8 5h24l-5 13H13z"/><path d="M20 18v13M12 36l8-5 8 5"/>',
    fields: [
      { key: "area", label: "Maydoni (m²)", type: "number", placeholder: "60" },
      { key: "equipment", label: "Jihozlar", type: "text", placeholder: "Siklorama, 4 ta svet, fonlar", required: true },
      { key: "address", label: "Manzil", type: "text", placeholder: "Urganch, Al-Xorazmiy ko‘chasi", required: true },
      { key: "hours", label: "Ish vaqti", type: "text", placeholder: "Har kuni 09:00–21:00" },
      { key: "map", label: "Xaritadagi lokatsiya", type: "map", placeholder: "https://maps.app.goo.gl/...", hint: "Google yoki Yandex xaritadan “Ulashish” havolasi" },
    ] },
  { slug: "texnika-ijarasi", nameUz: "Texnika ijarasi", nameRu: "Аренда техники", description: "Kamera, svet, dron, mikrofon", unit: "kun",
    icon: '<rect x="10" y="5" width="20" height="12" rx="2"/><circle cx="20" cy="11" r="3"/><path d="M20 17v5M20 22l-9 14M20 22l9 14M20 22v14"/>',
    fields: [
      { key: "items", label: "Texnikalar va kunlik narxi", type: "pricelist", required: true, hint: "Har bir texnika alohida qatorda" },
      { key: "terms", label: "Ijara shartlari", type: "text", placeholder: "Pasport yoki zalog bilan" },
      { key: "delivery", label: "Yetkazib berish", type: "text", placeholder: "Urganch bo‘ylab bepul" },
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
