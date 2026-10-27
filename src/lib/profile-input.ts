import { z } from "zod";
import { isVideoLink } from "./limits";

/** Ro'yxatdan o'tish va tahrirlash formasining umumiy sxemasi (klient va server). */
const pct = z.coerce.number<number>().min(0).max(100);
const count = z.coerce.number<number>().int().min(0).max(100_000_000).default(0);
const handle = z.string().trim().max(64).regex(/^@?[A-Za-z0-9_.]*$/, "Faqat lotin harflari, raqam, _ va .").transform((v) => (v ? (v.startsWith("@") ? v : "@" + v) : ""));

export const RATE_LABELS = ["Stories (1 ta)", "Post", "Reels", "Integratsiya (video ichida)"] as const;
export const AGE_GROUPS = ["13–17", "18–24", "25–34", "35+"] as const;
export const PLATFORMS = ["instagram", "telegram", "tiktok", "youtube"] as const;

export const BloggerInput = z.object({
  followers: z.object(Object.fromEntries(PLATFORMS.map((p) => [p, count])) as Record<(typeof PLATFORMS)[number], typeof count>),
  er: z.coerce.number<number>().min(0).max(100).optional(),
  avgViews: z.coerce.number<number>().int().min(0).optional(),
  storiesReach: z.coerce.number<number>().int().min(0).optional(),
  genderF: pct,
  ages: z.array(pct).length(4),
  cities: z.array(z.tuple([z.string().trim().max(30), pct])).max(4),
  rates: z.array(z.coerce.number<number>().int().min(0)).length(RATE_LABELS.length),
  topics: z.string().trim().max(200).default(""),
  noAds: z.string().trim().max(200).default(""),
  admins: z.array(z.object({
    name: z.string().trim().min(2, "Admin ismi kerak").max(60),
    role: z.string().trim().max(60).default("Reklama bo‘yicha admin"),
    phone: z.string().trim().min(9, "Admin telefoni kerak"),
    telegram: handle,
  })).min(1, "Kamida bitta admin kiriting").max(3),
});

export const ProfileInput = z.object({
  profession: z.string().min(1, "Yo‘nalishni tanlang"),
  extraProfession: z.string().optional().default(""),
  fullName: z.string().trim().min(3, "To‘liq ismni yozing").max(80),
  /** Studiya va texnika ijarasida so'ralmaydi (isBusiness) */
  birthYear: z.preprocess((v) => (v === "" || v == null ? undefined : v),
    z.coerce.number<number>().int().min(1940).max(new Date().getFullYear() - 14, "Yosh kamida 14").optional()),
  gender: z.enum(["f", "m"]).optional(),
  languages: z.array(z.enum(["uz", "ru", "en"])).min(1, "Kamida bitta til"),
  districts: z.array(z.string()).min(1, "Kamida bitta tuman tanlang").max(14),
  bio: z.string().trim().max(500).default(""),
  experienceYears: z.coerce.number<number>().int().min(0).max(60),
  price: z.coerce.number<number>().int().min(0).max(1_000_000_000).optional(),
  priceNegotiable: z.boolean().default(false),
  tags: z.string().max(200).default("").transform((v) => v.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 5)),
  extra: z.record(z.string(), z.string().trim().max(1000)).default({}),
  /** Har qatorda bitta havola (YouTube, Instagram, TikTok, Vimeo, Telegram, Google Drive) */
  videoLinks: z.string().max(2000).default("")
    .transform((v) => v.split(/\s+/).map((x) => x.trim()).filter(Boolean))
    .refine((a) => a.length <= 5, "Ko‘pi bilan 5 ta video havola")
    .refine((a) => a.every(isVideoLink), "Havola YouTube, Instagram, TikTok, Vimeo, Telegram, Google Drive yoki SoundCloud’dan bo‘lsin (https://...)"),
  contacts: z.object({ phone: z.string().trim().optional().default(""), telegram: handle.default(""), instagram: handle.default("") }),
  blogger: BloggerInput.optional(),
  consent: z.literal(true, { error: "Kontaktlar ochiq ko‘rinishiga rozilik kerak" }),
});

export type ProfileInputT = z.input<typeof ProfileInput>;
export type ProfileParsed = z.output<typeof ProfileInput>;

export function emptyInput(): ProfileInputT {
  return {
    profession: "", extraProfession: "", fullName: "", birthYear: "" as unknown as number, gender: "f",
    languages: ["uz"], districts: [], bio: "", experienceYears: 0, price: undefined, priceNegotiable: false,
    tags: "", extra: {}, videoLinks: "", contacts: { phone: "", telegram: "", instagram: "" }, consent: false as unknown as true,
    blogger: undefined,
  };
}

export function emptyBlogger(): z.input<typeof BloggerInput> {
  return {
    followers: { instagram: 0, telegram: 0, tiktok: 0, youtube: 0 }, er: undefined, avgViews: undefined, storiesReach: undefined,
    genderF: 50, ages: [10, 40, 35, 15], cities: [["Urganch", 50], ["Xiva", 20], ["Boshqa", 30]],
    rates: [0, 0, 0, 0], topics: "", noAds: "", admins: [{ name: "", role: "Reklama bo‘yicha admin", phone: "", telegram: "" }],
  };
}

/** Birinchi xatoni foydalanuvchiga ko'rsatiladigan matnga aylantiradi. */
export function firstError(e: z.ZodError): string {
  const i = e.issues[0];
  return i ? i.message : "Ma’lumotlarni tekshiring";
}
