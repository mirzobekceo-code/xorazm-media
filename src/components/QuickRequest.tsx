"use client";
import { useState } from "react";
import { createQuickRequestAction } from "@/app/actions";
import { QUICK_BUDGETS, QUICK_PLACES } from "@/lib/request-input";
import { track } from "@/lib/client/analytics";

type Opt = { slug: string; nameUz: string };

/** "Kimni tanlashni bilmayapsizmi? Muammoni yozing!" — kirishsiz tezkor so'rov. */
export default function QuickRequest({ districts, phone = "" }: { districts: Opt[]; phone?: string }) {
  const [text, setText] = useState("");
  const [place, setPlace] = useState("");
  const [other, setOther] = useState(false);
  const [budget, setBudget] = useState("");
  const [custom, setCustom] = useState(false);
  const [tel, setTel] = useState(phone);
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="qr-card qr-done" role="status">
        <span className="qr-badge">✓ Yuborildi</span>
        <h2>Mutaxassislarga sizning e’loningiz yuborildi.</h2>
        <p className="muted">Tez orada aloqaga chiqishadi. Telefoningiz yoningizda bo‘lsin.</p>
        <button type="button" className="btn ghost sm" onClick={() => { setDone(false); setText(""); }}>Yana so‘rov yozish</button>
      </div>
    );
  }

  const chip = (on: boolean, label: string, onClick: () => void, icon?: boolean) => (
    <button key={label} type="button" className="qr-chip" aria-pressed={on} onClick={onClick}>
      {on && icon && <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" /></svg>}
      {label}
    </button>
  );

  return (
    <form className="qr-card" onSubmit={async (e) => {
      e.preventDefault();
      setError("");
      setBusy(true);
      const r = await createQuickRequestAction({ text, place, budget, phone: tel, website });
      setBusy(false);
      if (!r.ok) return setError(r.error);
      track("request_created", { place: place || "xorazm", budget: budget || "-" });
      setDone(true);
    }}>
      <span className="qr-badge">Bepul saralash xizmati</span>
      <h2>Kimni tanlashni bilmayapsizmi?<br /><em>Muammoni yozing!</em></h2>
      <p className="muted small">Mutaxassislarning o‘zi sizga bog‘lanadi.</p>
      <label className="sr-only" htmlFor="qr-text">Muammo</label>
      <textarea id="qr-text" className="inp" rows={3} maxLength={1000} required value={text} onChange={(e) => setText(e.target.value)}
        placeholder="Masalan: 4 ta target uchun reels olish kerak. Ssenariy va montaji ham ichida bo‘lsin." />
      <div className="qr-cols">
        <div>
          <p className="qr-label">Manzil</p>
          <div className="qr-chips">
            {QUICK_PLACES.map((p) => chip(place === p.value, p.label, () => { setOther(false); setPlace(place === p.value ? "" : p.value); }, true))}
            {chip(other, "Boshqa tuman", () => { setOther(!other); setPlace(""); })}
          </div>
          {other && (
            <select className="inp qr-small" aria-label="Tuman" value={place} onChange={(e) => setPlace(e.target.value)}>
              <option value="">Tumanni tanlang</option>
              {districts.filter((d) => !QUICK_PLACES.some((p) => p.value === d.slug)).map((d) => <option key={d.slug} value={d.slug}>{d.nameUz}</option>)}
            </select>
          )}
        </div>
        <div>
          <p className="qr-label">Budjet</p>
          <div className="qr-chips">
            {QUICK_BUDGETS.map((b) => chip(!custom && budget === b, b, () => { setCustom(false); setBudget(budget === b ? "" : b); }))}
            {chip(custom, "O‘zim yozaman", () => { setCustom(!custom); setBudget(""); })}
          </div>
          {custom && <input className="inp qr-small" aria-label="Budjet" maxLength={40} autoFocus placeholder="Masalan: 2 mln so‘m" value={budget} onChange={(e) => setBudget(e.target.value)} />}
        </div>
      </div>
      <input className="qr-hp" tabIndex={-1} autoComplete="off" aria-hidden="true" value={website} onChange={(e) => setWebsite(e.target.value)} name="website" />
      <div className="qr-send">
        <label className="sr-only" htmlFor="qr-phone">Aloqa raqami</label>
        <input id="qr-phone" className="inp" type="tel" inputMode="tel" autoComplete="tel" required placeholder="+998 90 123 45 67" value={tel} onChange={(e) => setTel(e.target.value)} />
        <button className="btn" disabled={busy}>{busy ? "Yuborilmoqda…" : "Yuborish"}</button>
      </div>
      {error && <p className="err" role="alert">{error}</p>}
    </form>
  );
}
