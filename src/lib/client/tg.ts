/** Telegram Mini App ichida ishlash uchun yordamchilar (oddiy brauzerda oddiy xatti-harakat). */
export type TgWebApp = {
  initData?: string;
  initDataUnsafe?: { start_param?: string };
  version?: string;
  platform?: string;
  ready?: () => void;
  expand?: () => void;
  isVersionAtLeast?: (v: string) => boolean;
  setHeaderColor?: (c: string) => void;
  setBackgroundColor?: (c: string) => void;
  setBottomBarColor?: (c: string) => void;
  disableVerticalSwipes?: () => void;
  enableClosingConfirmation?: () => void;
  openLink?: (url: string) => void;
  openTelegramLink?: (url: string) => void;
  downloadFile?: (p: { url: string; file_name: string }, cb?: (ok: boolean) => void) => void;
  requestContact?: (cb?: (ok: boolean) => void) => void;
  BackButton?: { show: () => void; hide: () => void; onClick: (f: () => void) => void; offClick: (f: () => void) => void };
  HapticFeedback?: { impactOccurred: (s: "light" | "medium") => void; notificationOccurred: (t: "success" | "error") => void };
};

export const webApp = (): TgWebApp | undefined =>
  typeof window === "undefined" ? undefined : (window as unknown as { Telegram?: { WebApp?: TgWebApp } }).Telegram?.WebApp;

/** Sayt Telegram ichida Mini App sifatida ochilganmi (initData imzolangan bo'ladi). */
export const inMiniApp = () => !!webApp()?.initData;

/** Tashqi havolani ochadi: Mini App'da Telegram vositasi bilan, aks holda yangi oynada. */
export function openExternal(url: string) {
  const wa = webApp();
  if (wa?.initData) {
    if (/^https:\/\/t\.me\//.test(url) && wa.openTelegramLink) return wa.openTelegramLink(url);
    if (wa.openLink) return wa.openLink(url);
  }
  window.open(url, "_blank", "noopener");
}

/** Nusxa olish: clipboard bo'lmasa (ba'zi WebView) — eski usul. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}
