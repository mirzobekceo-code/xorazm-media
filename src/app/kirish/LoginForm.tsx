"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { requestCodeAction, verifyCodeAction } from "@/app/actions";
import TelegramButton from "@/components/TelegramButton";
import { CHANNEL_HINT } from "@/lib/channel-hint";

export default function LoginForm({ next, telegram, code: codeEnabled }: { next?: string; telegram: boolean; code: boolean }) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const go = (r: { role?: string; hasProfile?: boolean }) => {
    router.push(next ?? (r.role && r.role !== "specialist" ? "/admin" : r.hasProfile ? "/kabinet" : "/qoshilish"));
    router.refresh();
  };

  return (
    <form className="form" onSubmit={async (e) => {
      e.preventDefault();
      setError("");
      setBusy(true);
      if (!sent) {
        const r = await requestCodeAction(phone);
        setBusy(false);
        if (!r.ok) return setError(r.error);
        setSent(r.channel);
        return;
      }
      const r = await verifyCodeAction(phone, code);
      setBusy(false);
      if (!r.ok) return setError(r.error);
      go(r);
    }}>
      <div><h2>Kirish</h2><p className="muted" style={{ marginTop: 6 }}>Telegram orqali. Parol kerak emas.</p></div>
      {telegram && <TelegramButton mode="login" onDone={go} />}
      {codeEnabled && (
        <>
          {telegram && <p className="muted small" style={{ textAlign: "center" }}>yoki raqamingizga Telegram orqali kod oling</p>}
          <div className="field">
            <label htmlFor="l-phone">Telefon raqam</label>
            <input className="inp" id="l-phone" type="tel" autoComplete="tel" placeholder="+998 90 123 45 67" value={phone} disabled={!!sent} onChange={(e) => setPhone(e.target.value)} />
          </div>
          {sent && (
            <div className="field">
              <label htmlFor="l-code">Telegram’dagi kod</label>
              <input className="inp" id="l-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
              <small>{CHANNEL_HINT[sent]} 5 daqiqa amal qiladi. <button type="button" className="link" onClick={() => { setSent(""); setCode(""); }}>Raqamni o‘zgartirish</button></small>
            </div>
          )}
        </>
      )}
      {error && <p className="err" role="alert">{error}</p>}
      {codeEnabled && <button className="btn ghost" disabled={busy}>{sent ? "Kirish" : "Telegram’ga kod olish"}</button>}
    </form>
  );
}
