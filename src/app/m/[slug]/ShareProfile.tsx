"use client";
import { useState } from "react";
import { copyText, openExternal, webApp } from "@/lib/client/tg";
import { track } from "@/lib/client/analytics";

/** Tashrif buyuruvchi uchun "Ulashish": telefonda tizim oynasi, Mini App'da Telegram, aks holda nusxa. */
export default function ShareProfile({ url, title }: { url: string; title: string }) {
  const [done, setDone] = useState(false);
  async function share() {
    const link = `${url}?s=link`;
    track("share", { url });
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (webApp()?.initData) return openExternal(`https://t.me/share/url?url=${encodeURIComponent(`${url}?s=tg`)}&text=${encodeURIComponent(title)}`);
    if (nav.share) { try { await nav.share({ title, url: link }); } catch {} return; }
    if (await copyText(link)) { setDone(true); setTimeout(() => setDone(false), 1600); }
  }
  return <button type="button" className="btn ghost" onClick={share}>{done ? "Nusxalandi ✓" : "Ulashish"}</button>;
}
