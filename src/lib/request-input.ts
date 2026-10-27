import { z } from "zod";

/** Tezkor so'rov ("Muammoni yozing") — brauzer va server uchun umumiy. */
export const QUICK_PLACES = [
  { value: "urganch-shahri", label: "Urganch" },
  { value: "xiva-shahri", label: "Xiva" },
  { value: "masofaviy", label: "Masofaviy" },
] as const;
export const QUICK_BUDGETS = ["50$ gacha", "100$", "100$ – 300$", "300$ dan yuqori"] as const;
export const REMOTE = "masofaviy";

export const QuickRequestInput = z.object({
  text: z.string().trim().min(10, "Muammoni biroz batafsilroq yozing (kamida 10 belgi)").max(1000, "Ko‘pi bilan 1000 belgi"),
  /** tuman slug'i yoki "masofaviy"; bo'sh — butun Xorazm */
  place: z.string().trim().max(60).default(""),
  budget: z.string().trim().max(40, "Budjet juda uzun").default(""),
  phone: z.string().trim().min(9, "Aloqa raqamingizni yozing"),
  /** Bot-to'ldirgichlarga tuzoq: odam ko'rmaydigan maydon bo'sh bo'lishi kerak */
  website: z.string().max(0).optional().default(""),
});
export type QuickRequestInputT = z.input<typeof QuickRequestInput>;

/** Sarlavha: matnning birinchi qatori, 80 belgigacha (so'z o'rtasida kesilmaydi). */
export function requestTitle(text: string): string {
  const line = text.trim().split(/\n/)[0].trim();
  if (line.length <= 80) return line;
  const cut = line.slice(0, 80);
  return cut.slice(0, Math.max(cut.lastIndexOf(" "), 50)).replace(/[,.;:–-]+$/, "") + "…";
}
