/** Maxsus hodisalar: GA4 (gtag) va Yandex Metrika (ym) — ulangan bo'lsa yuboriladi, bo'lmasa jim. */
type W = Window & { gtag?: (...a: unknown[]) => void; ym?: (...a: unknown[]) => void; __ymId?: number };

export function track(event: string, params: Record<string, string | number> = {}) {
  if (typeof window === "undefined") return;
  const w = window as W;
  try {
    w.gtag?.("event", event, params);
    if (w.ym && w.__ymId) w.ym(w.__ymId, "reachGoal", event, params);
  } catch { /* analitika saytni buzmasligi kerak */ }
}
