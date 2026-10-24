"use client";
import { useEffect } from "react";

const SOURCES = ["ig", "qr", "tg", "wa", "link"];

/** Ko'rish manbasi: ulashilgan havoladagi ?s=..., Mini App, yoki qaysi saytdan kelgani. */
function source(): string {
  const s = new URLSearchParams(location.search).get("s");
  if (s && SOURCES.includes(s)) return s;
  if ((window as unknown as { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp?.initData) return "tg";
  if (!document.referrer) return "direct";
  try {
    const h = new URL(document.referrer).hostname;
    if (h === location.hostname) return "catalog";
    if (h.includes("instagram")) return "ig";
    if (h === "t.me" || h.includes("telegram")) return "tg";
    if (h.includes("whatsapp")) return "wa";
  } catch {}
  return "other";
}

export default function ViewBeacon({ profileId }: { profileId: number }) {
  useEffect(() => {
    const body = JSON.stringify({ type: "view", source: source() });
    navigator.sendBeacon?.(`/api/v1/profiles/${profileId}/events`, new Blob([body], { type: "application/json" }));
  }, [profileId]);
  return null;
}
