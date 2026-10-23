"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Sayt Telegram Mini App sifatida ochilganda, Telegram'i ulangan foydalanuvchini avtomatik kiritadi. */
export default function TelegramWebAppLogin({ loggedIn }: { loggedIn: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (loggedIn) return;
    let tries = 0;
    // telegram-web-app.js async yuklanadi — bir necha marta tekshiramiz
    const id = setInterval(() => {
      const wa = (window as unknown as { Telegram?: { WebApp?: { initData?: string; ready?: () => void } } }).Telegram?.WebApp;
      if (wa || ++tries > 15) clearInterval(id);
      if (!wa?.initData) return;
      wa.ready?.();
      fetch("/api/v1/auth/telegram/webapp", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ initData: wa.initData }),
      }).then((r) => r.json()).then((r) => { if (r.status === "ok") router.refresh(); }).catch(() => {});
    }, 200);
    return () => clearInterval(id);
  }, [loggedIn, router]);
  return null;
}
