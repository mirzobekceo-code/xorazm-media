"use client";
import { useEffect, useState } from "react";
import { createOrderAction } from "@/app/actions";
import { track } from "@/lib/client/analytics";

/** "Bog'lanish / Buyurtma berish": mijoz ismi va raqamini qoldiradi — mutaxassis o'zi qo'ng'iroq qiladi. */
export default function OrderButton({ profileId, name }: { profileId: number; name: string }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState({ name: "", phone: "", message: "", website: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <div className="order-bar">
        <button type="button" className="btn" onClick={() => setOpen(true)}>Bog‘lanish / Buyurtma berish</button>
      </div>
      {open && (
        <div className="modal-back" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="order-h">
            <button type="button" className="modal-x" aria-label="Yopish" onClick={() => setOpen(false)}>×</button>
            {done ? (
              <>
                <span className="qr-badge">✓ Yuborildi</span>
                <h2 id="order-h">{name} sizga tez orada qo‘ng‘iroq qiladi</h2>
                <p className="muted small">Buyurtmangiz mutaxassisning Telegram’iga yuborildi.</p>
                <button type="button" className="btn ghost" onClick={() => setOpen(false)}>Yopish</button>
              </>
            ) : (
              <form className="stack" style={{ gap: 12 }} onSubmit={async (e) => {
                e.preventDefault();
                setError("");
                setBusy(true);
                const r = await createOrderAction(profileId, { ...v, ref: document.referrer });
                setBusy(false);
                if (!r.ok) return setError(r.error);
                track("order_created", { profile: profileId });
                setDone(true);
              }}>
                <h2 id="order-h">Buyurtma berish</h2>
                <p className="muted small">Ismingiz va raqamingizni qoldiring — {name} o‘zi bog‘lanadi.</p>
                <div className="field"><label htmlFor="o-name">Ismingiz *</label>
                  <input className="inp" id="o-name" autoComplete="name" required maxLength={80} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></div>
                <div className="field"><label htmlFor="o-phone">Telefon *</label>
                  <input className="inp" id="o-phone" type="tel" autoComplete="tel" required placeholder="+998 90 123 45 67" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} /></div>
                <div className="field"><label htmlFor="o-msg">Nima kerak?</label>
                  <textarea className="inp" id="o-msg" rows={3} maxLength={500} placeholder="Ixtiyoriy: xizmat, sana, joy…" value={v.message} onChange={(e) => setV({ ...v, message: e.target.value })} /></div>
                <input className="qr-hp" tabIndex={-1} autoComplete="off" aria-hidden="true" value={v.website} onChange={(e) => setV({ ...v, website: e.target.value })} />
                {error && <p className="err" role="alert">{error}</p>}
                <button className="btn" disabled={busy}>{busy ? "Yuborilmoqda…" : "Yuborish"}</button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
