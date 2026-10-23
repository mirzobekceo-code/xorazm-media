const LATIN: Record<string, string> = { "‘": "", "’": "", "'": "", "ʻ": "", "ʼ": "", "`": "" };

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[‘’'ʻʼ`]/g, (c) => LATIN[c] ?? "")
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** 1250000 → "1 250 000" */
export function money(n: number | null | undefined): string {
  if (n == null) return "—";
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/** 48200 → "48.2K" */
export function kfmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

/** Har xil yozilgan raqamni +998XXXXXXXXX ko'rinishiga keltiradi; noto'g'ri bo'lsa null. */
export function normalizePhone(input: string): string | null {
  const d = input.replace(/\D/g, "");
  const local = d.length === 12 && d.startsWith("998") ? d.slice(3) : d.length === 9 ? d : null;
  return local ? "+998" + local : null;
}

/** +998901234567 → "+998 90 123 45 67" */
export function prettyPhone(p: string): string {
  const m = p.match(/^\+998(\d{2})(\d{3})(\d{2})(\d{2})$/);
  return m ? `+998 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : p;
}

export function initials(name: string): string {
  return name.split(/\s+/).map((w) => w[0] ?? "").slice(0, 2).join("").toUpperCase();
}

export function ageFrom(year: number | null): number | null {
  return year ? new Date().getFullYear() - year : null;
}

export const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram", telegram: "Telegram", tiktok: "TikTok", youtube: "YouTube",
};

export function totalFollowers(f: Record<string, number> | undefined): number {
  return f ? Object.values(f).reduce((a, b) => a + (b || 0), 0) : 0;
}

export function audienceBucket(total: number): "s" | "m" | "l" {
  return total < 10_000 ? "s" : total < 50_000 ? "m" : "l";
}
