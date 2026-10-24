"use client";
import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { openExternal, webApp, type TgWebApp } from "@/lib/client/tg";

const BG = "#0f1615";

/**
 * Sayt Telegram Mini App sifatida ochilganda: to'liq ekran, ranglar, "Orqaga" tugmasi,
 * tashqi havolalarni Telegram orqali ochish, start_param bo'yicha sahifa va avtomatik kirish.
 */
export default function TelegramMiniApp({ loggedIn }: { loggedIn: boolean }) {
  const router = useRouter();
  const path = usePathname();
  const wa = useRef<TgWebApp | null>(null);

  // Bir martalik sozlash (telegram-web-app.js async yuklanadi — bir necha marta tekshiramiz)
  useEffect(() => {
    let tries = 0;
    const id = setInterval(() => {
      const w = webApp();
      if (w || ++tries > 15) clearInterval(id);
      if (!w?.initData) return;
      wa.current = w;
      document.documentElement.classList.add("tg-app");
      w.ready?.();
      w.expand?.();
      w.setHeaderColor?.(BG);
      w.setBackgroundColor?.(BG);
      if (w.isVersionAtLeast?.("7.10")) w.setBottomBarColor?.(BG);
      // Sahifani pastga surganda ilova yopilib qolmasin
      if (w.isVersionAtLeast?.("7.7")) w.disableVerticalSwipes?.();

      // start_param faqat ilova ochilganda bir marta: sahifa yangilansa qayta yo'naltirmaymiz
      let start = "";
      try {
        if (!sessionStorage.getItem("tg-start")) { start = w.initDataUnsafe?.start_param ?? ""; sessionStorage.setItem("tg-start", "1"); }
      } catch {}
      const m = start.match(/^m_([a-z0-9-]{3,80})$/);
      if (m) router.replace(`/m/${m[1]}?s=tg`);
      else if (start === "kabinet") router.replace("/kabinet");
      else if (start === "qoshilish") router.replace("/qoshilish");

      if (!loggedIn) {
        fetch("/api/v1/auth/telegram/webapp", {
          method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ initData: w.initData }),
        }).then((r) => r.json()).then((r) => { if (r.status === "ok") router.refresh(); }).catch(() => {});
      }
    }, 200);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tashqi havolalar Telegram ichida to'g'ri ochilsin (aks holda WebView ichida qolib ketadi)
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!wa.current || e.defaultPrevented || e.button !== 0) return;
      const a = (e.target as HTMLElement).closest?.("a");
      const href = a?.getAttribute("href");
      if (!a || !href || !/^https?:/.test(a.href)) return;
      if (new URL(a.href).origin === location.origin) return; // ichki havolalar ilova ichida ochiladi
      e.preventDefault();
      openExternal(a.href);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // "Orqaga" tugmasi: bosh sahifadan boshqa joyda ko'rinadi
  useEffect(() => {
    const bb = (wa.current ?? webApp())?.BackButton;
    if (!bb || !webApp()?.initData) return;
    const back = () => (history.length > 1 ? router.back() : router.push("/"));
    if (path === "/") bb.hide(); else bb.show();
    bb.onClick(back);
    return () => bb.offClick(back);
  }, [path, router]);

  return null;
}
