"use client";
import { useEffect, useRef, useState } from "react";
import { createTelegramLinkAction } from "@/app/actions";

type Done = { role?: string; hasProfile?: boolean };
import { webApp } from "@/lib/client/tg";

/**
 * Telegram orqali kirish (login) yoki kabinetda ulash (link).
 * Bot ochiladi → foydalanuvchi raqamini ulashadi → bu komponent natijani kutib oladi.
 */
export default function TelegramButton({ mode, onDone, label }: { mode: "login" | "link"; onDone: (r: Done) => void; label?: string }) {
  const [state, setState] = useState<"idle" | "waiting" | "error">("idle");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  /**
   * Mini App ichida botga o'tmasdan: kirishda Telegram'ning "raqamni ulashish" oynasi (raqam botga keladi va
   * akkauntga bog'lanadi, so'ng initData bilan kiramiz); ulashda esa imzolangan initData yetarli.
   */
  async function startInApp(): Promise<boolean> {
    const wa = webApp();
    if (!wa?.initData) return false;
    const post = (path: string) => fetch(path, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ initData: wa.initData }),
    }).then((r) => r.json()).catch(() => ({ status: "error" }));
    if (mode === "link") {
      const r = await post("/api/v1/auth/telegram/webapp/link");
      if (r.status === "ok") { onDone({}); return true; }
      return false;
    }
    // Avval tekshiramiz: balki raqam allaqachon ulangan
    if ((await post("/api/v1/auth/telegram/webapp")).status === "ok") { onDone({}); return true; }
    if (!wa.requestContact || !wa.isVersionAtLeast?.("6.9")) return false;
    setState("waiting");
    wa.requestContact(async (shared) => {
      if (!shared) { setState("idle"); setError("Raqam ulashilmadi."); return; }
      // Bot raqamni qabul qilib bog'lagunicha bir necha soniya kutamiz
      for (let i = 0; i < 12; i++) {
        await new Promise((r) => setTimeout(r, 1200));
        if ((await post("/api/v1/auth/telegram/webapp")).status === "ok") { setState("idle"); onDone({}); return; }
      }
      setState("error");
      setError("Tasdiqlash kechikdi. Qayta urinib ko‘ring.");
    });
    return true;
  }

  async function start() {
    setError("");
    // Mini App'da yangi oyna ochilmaydi; oddiy brauzerda esa window.open bosish paytida (await'dan oldin) bo'lishi shart
    if (webApp()?.initData && (await startInApp())) return;
    const wa = webApp();
    // Popup bloklanmasligi uchun oyna bosish paytida ochiladi, manzil keyin beriladi
    const win = wa?.initData ? null : window.open("about:blank", "_blank");
    let t: { url: string; token: string; secret: string } | null = null;
    if (mode === "login") {
      const res = await fetch("/api/v1/auth/telegram", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (res.ok) t = json; else setError(json.error ?? "Xatolik");
    } else {
      const r = await createTelegramLinkAction();
      if (r.ok) t = r; else setError(r.error);
    }
    if (!t) { win?.close(); setState("error"); return; }
    setUrl(t.url);
    if (wa?.initData && wa.openTelegramLink) wa.openTelegramLink(t.url);
    else if (win) win.location.href = t.url;
    setState("waiting");
    poll(t.token, t.secret, Date.now());
  }

  function poll(token: string, secret: string, started: number) {
    timer.current = setTimeout(async () => {
      const res = await fetch("/api/v1/auth/telegram/claim", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, secret }),
      }).then((r) => r.json()).catch(() => ({ status: "pending" }));
      if (res.status === "ok") { setState("idle"); onDone(res); return; }
      if (res.status === "expired" || Date.now() - started > 10 * 60_000) {
        setState("error"); setError("Vaqt tugadi. Qayta urinib ko‘ring."); return;
      }
      poll(token, secret, started);
    }, 2000);
  }

  if (state === "waiting" && !url) {
    return <p className="muted">Telegram oynasida “Raqamni ulashish”ni tasdiqlang…</p>;
  }
  if (state === "waiting") {
    return (
      <div className="stack" style={{ gap: 8 }}>
        <p><b>Telegram’da botga o‘ting</b> va “📱 Raqamni ulashish” tugmasini bosing. Shu sahifa o‘zi yangilanadi.</p>
        <div className="row">
          <a className="btn ghost sm" href={url} target="_blank" rel="noopener">Telegram ochilmadimi? Shu yerni bosing</a>
          <button type="button" className="link small" onClick={() => { if (timer.current) clearTimeout(timer.current); setState("idle"); }}>Bekor qilish</button>
        </div>
      </div>
    );
  }
  return (
    <div className="stack" style={{ gap: 6 }}>
      <button type="button" className="btn tg" onClick={start}>
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21.9 4.3 18.7 19.4c-.2 1-.9 1.3-1.7.8l-4.8-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.9 8.9-8c.4-.3-.1-.5-.6-.2l-11 6.9-4.7-1.5c-1-.3-1-1 .2-1.5L20.5 3c.9-.3 1.6.2 1.4 1.3z"/></svg>
        {label ?? (mode === "login" ? "Telegram orqali kirish" : "Telegramni ulash")}
      </button>
      {error && <p className="err">{error}</p>}
    </div>
  );
}
