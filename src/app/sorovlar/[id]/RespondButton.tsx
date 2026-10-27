"use client";
import { useState } from "react";
import { respondRequestAction } from "@/app/actions";
import { track } from "@/lib/client/analytics";

export default function RespondButton({ id, done: initial }: { id: number; done: boolean }) {
  const [done, setDone] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (done) return <div className="notice owner">✓ Javobingiz yuborildi — biznes egasi profilingizni Telegram’da oldi. Yuqoridagi kontaktlar orqali o‘zingiz ham yozishingiz mumkin.</div>;
  return (
    <div className="stack" style={{ gap: 6 }}>
      <button type="button" className="btn" disabled={busy} onClick={async () => {
        setBusy(true);
        const r = await respondRequestAction(id);
        setBusy(false);
        if (!r.ok) return setError(r.error);
        track("request_response", { request: id });
        setDone(true);
      }}>{busy ? "Yuborilmoqda…" : "👋 Qiziqaman"}</button>
      <small className="muted">Biznes egasiga profilingiz havolasi Telegram’da yuboriladi.</small>
      {error && <p className="err">{error}</p>}
    </div>
  );
}
