"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { prettyPhone } from "@/lib/format";
import TelegramButton from "@/components/TelegramButton";
import { track as trackGa } from "@/lib/client/analytics";

type Data = {
  phone: string | null; telegram: string | null; instagram: string | null;
  admins: { name: string; role: string; phone: string; telegram: string | null }[];
};

function track(profileId: number, channel: string) {
  const body = JSON.stringify({ type: "contact_click", channel });
  navigator.sendBeacon?.(`/api/v1/profiles/${profileId}/events`, new Blob([body], { type: "application/json" }));
  trackGa("contact_click", { channel, profile: profileId });
}

/**
 * Kontaktlar HTML ichida emas, alohida so'rov bilan keladi (avtomatik yig'ishdan himoya) va faqat
 * Telegram orqali kirganlarga ochiladi: kim qaysi mutaxassis bilan bog'langani lid sifatida yoziladi.
 */
export default function Contacts({ profileId, name, src }: { profileId: number; name: string; src?: string }) {
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [gated, setGated] = useState(false);
  const [modal, setModal] = useState(false);
  const [err, setErr] = useState(false);
  const [toast, setToast] = useState("");
  const load = useCallback(() => {
    fetch(`/api/v1/profiles/${profileId}/contacts${src ? `?src=${encodeURIComponent(src)}` : ""}`).then(async (r) => {
      if (r.status === 401) { setGated(true); return; }
      if (!r.ok) throw new Error();
      setGated(false); setModal(false);
      setData(await r.json());
    }).catch(() => setErr(true));
  }, [profileId, src]);
  useEffect(load, [load]);
  useEffect(() => {
    if (!modal) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setModal(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modal]);

  const copy = (v: string, channel: string) => {
    track(profileId, channel);
    navigator.clipboard?.writeText(v).then(() => say("Nusxa olindi: " + v), () => say("Matnni belgilab nusxa oling"));
  };
  const say = (m: string) => { setToast(m); setTimeout(() => setToast(""), 1800); };

  if (err) return <p className="err">Kontaktlarni yuklab bo‘lmadi. Sahifani yangilang.</p>;
  if (gated) {
    return (
      <>
        <button type="button" className="btn gate-btn" onClick={() => { setModal(true); trackGa("contact_gate_open", { profile: profileId }); }}>📞 Bog‘lanish / Raqamni ko‘rish</button>
        <p className="muted small">Raqam va Telegram bir marta Telegram orqali tasdiqlangach ochiladi — bot kontaktlarni sizga ham yuboradi.</p>
        {modal && (
          <div className="modal-back" onClick={(e) => e.target === e.currentTarget && setModal(false)}>
            <div className="modal" role="dialog" aria-modal="true" aria-labelledby="gate-h">
              <button type="button" className="modal-x" aria-label="Yopish" onClick={() => setModal(false)}>×</button>
              <span className="qr-badge">Bepul · 10 soniya</span>
              <h2 id="gate-h">Mutaxassis bilan bog‘lanish va kontaktlarni ochish uchun Telegram orqali davom eting</h2>
              <p className="muted small">Botga o‘tib “📱 Raqamni ulashish”ni bosasiz — {name} kontaktlari shu yerda ochiladi va Telegram’ga ham keladi. Parol kerak emas.</p>
              <TelegramButton mode="login" label="Telegram orqali ochish" onDone={() => { trackGa("contact_gate_done", { profile: profileId }); load(); router.refresh(); }} />
            </div>
          </div>
        )}
      </>
    );
  }
  if (!data) return <p className="muted small">Yuklanmoqda…</p>;

  const row = (label: string, value: string, channel: string, link?: string) => (
    <div className="crow" key={label + value}>
      <div><span>{label}</span><b className="num">{value}</b></div>
      <div className="row" style={{ gap: 6, flexWrap: "nowrap" }}>
        {link && <a className="copy" href={link} target="_blank" rel="noopener" onClick={() => track(profileId, channel)}>Ochish</a>}
        <button className="copy" onClick={() => copy(value, channel)}>Nusxa</button>
      </div>
    </div>
  );
  const tg = (h: string) => `https://t.me/${h.replace(/^@/, "")}`;
  const ig = (h: string) => `https://instagram.com/${h.replace(/^@/, "")}`;

  return (
    <div>
      {data.admins.length > 0 ? data.admins.map((a) => (
        <div className="admin-c" key={a.phone}>
          <h4>{a.name}<span>{a.role}</span></h4>
          {row("Telefon", prettyPhone(a.phone), "phone", `tel:${a.phone}`)}
          {a.telegram && row("Telegram", a.telegram, "telegram", tg(a.telegram))}
        </div>
      )) : (
        <>
          {data.phone && row("Telefon", prettyPhone(data.phone), "phone", `tel:${data.phone}`)}
          {data.telegram && row("Telegram", data.telegram, "telegram", tg(data.telegram))}
        </>
      )}
      {data.instagram && row(data.admins.length ? "Bloger sahifasi" : "Instagram", data.instagram, "instagram", ig(data.instagram))}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
