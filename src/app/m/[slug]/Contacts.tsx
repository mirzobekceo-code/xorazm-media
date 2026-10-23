"use client";
import { useEffect, useState } from "react";
import { prettyPhone } from "@/lib/format";

type Data = {
  phone: string | null; telegram: string | null; instagram: string | null;
  admins: { name: string; role: string; phone: string; telegram: string | null }[];
};

function track(profileId: number, channel: string) {
  const body = JSON.stringify({ type: "contact_click", channel });
  navigator.sendBeacon?.(`/api/v1/profiles/${profileId}/events`, new Blob([body], { type: "application/json" }));
}

/** Kontaktlar HTML ichida emas, alohida so'rov bilan keladi (avtomatik yig'ishdan himoya). */
export default function Contacts({ profileId }: { profileId: number }) {
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState(false);
  const [toast, setToast] = useState("");
  useEffect(() => {
    fetch(`/api/v1/profiles/${profileId}/contacts`).then((r) => (r.ok ? r.json() : Promise.reject())).then(setData, () => setErr(true));
  }, [profileId]);

  const copy = (v: string, channel: string) => {
    track(profileId, channel);
    navigator.clipboard?.writeText(v).then(() => say("Nusxa olindi: " + v), () => say("Matnni belgilab nusxa oling"));
  };
  const say = (m: string) => { setToast(m); setTimeout(() => setToast(""), 1800); };

  if (err) return <p className="err">Kontaktlarni yuklab bo‘lmadi. Sahifani yangilang.</p>;
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
