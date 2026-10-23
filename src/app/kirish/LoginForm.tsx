"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { requestCodeAction, verifyCodeAction } from "@/app/actions";
import TelegramButton from "@/components/TelegramButton";

export default function LoginForm({ next, telegram, sms }: { next?: string; telegram: boolean; sms: boolean }) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  return (
    <form className="form" onSubmit={async (e) => {
      e.preventDefault();
      setError("");
      setBusy(true);
      if (!sent) {
        const r = await requestCodeAction(phone);
        setBusy(false);
        if (!r.ok) return setError(r.error);
        setSent(true);
        return;
      }
      const r = await verifyCodeAction(phone, code);
      setBusy(false);
      if (!r.ok) return setError(r.error);
      router.push(next ?? (r.role !== "specialist" ? "/admin" : r.hasProfile ? "/kabinet" : "/qoshilish"));
      router.refresh();
    }}>
      <div><h2>Kirish</h2><p className="muted" style={{ marginTop: 6 }}>Parol kerak emas.</p></div>
      {telegram && (
        <>
          <TelegramButton mode="login" onDone={(r) => {
            router.push(next ?? (r.role && r.role !== "specialist" ? "/admin" : r.hasProfile ? "/kabinet" : "/qoshilish"));
            router.refresh();
          }} />
          {sms && <p className="muted small" style={{ textAlign: "center" }}>yoki SMS kod orqali</p>}
        </>
      )}
      {sms && <>
      <div className="field">
        <label htmlFor="l-phone">Telefon raqam</label>
        <input className="inp" id="l-phone" type="tel" autoComplete="tel" placeholder="+998 90 123 45 67" value={phone} disabled={sent} onChange={(e) => setPhone(e.target.value)} />
      </div>
      {sent && (
        <div className="field">
          <label htmlFor="l-code">SMS kod</label>
          <input className="inp" id="l-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
          <small>Kod 5 daqiqa amal qiladi. <button type="button" className="link" onClick={() => { setSent(false); setCode(""); }}>Raqamni o‘zgartirish</button></small>
        </div>
      )}
      </>}
      {error && <p className="err" role="alert">{error}</p>}
      {sms && <button className="btn" disabled={busy}>{sent ? "Kirish" : "Kod olish"}</button>}
    </form>
  );
}
