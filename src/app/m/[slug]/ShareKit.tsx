"use client";
import { useEffect, useState } from "react";
import { copyText, openExternal, webApp } from "@/lib/client/tg";
import { track } from "@/lib/client/analytics";

/** Ulashish qurollari: bio uchun havola va Instagram Story uchun QR-vizitka (1080×1920 PNG). */
export default function ShareKit({ url, slug, title }: { url: string; slug: string; title: string }) {
  const [toast, setToast] = useState("");
  const [qr, setQr] = useState(false);
  const say = (m: string) => { setToast(m); setTimeout(() => setToast(""), 1800); };
  useEffect(() => {
    if (!qr) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setQr(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [qr]);

  const card = `/m/${slug}/vizitka`;
  async function copy() {
    track("share", { method: "copy" });
    say((await copyText(`${url}?s=link`)) ? "Bio uchun link nusxalandi!" : "Nusxa olinmadi — manzilni belgilab oling");
  }
  async function shareCard() {
    track("share", { method: "qr_card" });
    const wa = webApp();
    if (wa?.initData && wa.downloadFile && wa.isVersionAtLeast?.("8.0")) {
      wa.downloadFile({ url: `${location.origin}${card}?download=1`, file_name: `${slug}-vizitka.png` });
      return;
    }
    // Telefonda: rasmni to'g'ridan-to'g'ri Instagram/Telegram'ga ulashish
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean; share?: (d: ShareData) => Promise<void> };
    try {
      const blob = await (await fetch(card)).blob();
      const file = new File([blob], `${slug}-vizitka.png`, { type: "image/png" });
      if (nav.canShare?.({ files: [file] }) && nav.share) { await nav.share({ files: [file], title }); return; }
    } catch { /* yuklab olishga o'tamiz */ }
    location.href = `${card}?download=1`;
  }

  return (
    <>
      <button type="button" className="btn ghost" onClick={copy}>🔗 Linkni nusxalash</button>
      <button type="button" className="btn ghost" onClick={() => setQr(true)}>📱 QR-vizitka</button>
      {qr && (
        <div className="modal-back" onClick={(e) => e.target === e.currentTarget && setQr(false)}>
          <div className="modal qr-modal" role="dialog" aria-modal="true" aria-label="QR-vizitka">
            <button type="button" className="modal-x" aria-label="Yopish" onClick={() => setQr(false)}>×</button>
            <h2>QR-vizitka</h2>
            <img src={card} alt={`${title} — QR-vizitka`} width={1080} height={1920} />
            <p className="muted small">Instagram Story yoki Telegram’ga qo‘ying — skanerlagan mijoz shu sahifaga tushadi.</p>
            <div className="row">
              <button type="button" className="btn" onClick={shareCard}>Yuklab olish / ulashish</button>
              {webApp()?.initData && <button type="button" className="btn ghost" onClick={() => openExternal(`https://t.me/share/url?url=${encodeURIComponent(`${url}?s=tg`)}&text=${encodeURIComponent(title)}`)}>Telegram’da ulashish</button>}
            </div>
          </div>
        </div>
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}
