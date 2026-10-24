"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { changeSlugAction } from "@/app/actions";
import { copyText, openExternal, webApp } from "@/lib/client/tg";

/** Profil — mutaxassisning shaxsiy sahifasi: havola, manzil, Instagram bio, ulashish va QR. */
export default function ShareBox({ site, slug, name, approved, bot }: { site: string; slug: string; name: string; approved: boolean; bot: string | null }) {
  const router = useRouter();
  const [edit, setEdit] = useState(false);
  const [value, setValue] = useState(slug);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [pending, start] = useTransition();
  const host = site.replace(/^https?:\/\//, "");
  const url = (src?: string) => `${site}/m/${slug}${src ? `?s=${src}` : ""}`;
  const say = (m: string) => { setToast(m); setTimeout(() => setToast(""), 1800); };
  const copy = async (src?: string) => say((await copyText(url(src))) ? "Havola nusxalandi" : "Nusxa olinmadi — matnni belgilang");
  const text = `${name} — Xorazm Digital HUB’dagi sahifam: portfolio, narxlar va kontaktlar`;

  function save() {
    setError("");
    start(async () => {
      const r = await changeSlugAction(value);
      if (!r.ok) return setError(r.error);
      setEdit(false);
      say("Manzil saqlandi. Eski havola ham ishlayveradi.");
      router.refresh();
    });
  }

  async function share() {
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (nav.share && !webApp()?.initData) {
      try { await nav.share({ title: name, text, url: url("link") }); } catch {}
    } else {
      openExternal(`https://t.me/share/url?url=${encodeURIComponent(url("tg"))}&text=${encodeURIComponent(text)}`);
    }
  }

  function downloadQr() {
    const wa = webApp();
    const file = `${location.origin}/api/v1/me/qr?download=1`;
    if (wa?.initData && wa.downloadFile && wa.isVersionAtLeast?.("8.0")) wa.downloadFile({ url: file, file_name: `${slug}-qr.png` });
    else location.href = file;
  }

  return (
    <section className="box share" id="ulashish">
      <div>
        <h3>Sizning sahifangiz</h3>
        <p className="muted small">Bu havolani Instagram bio, Telegram kanal yoki vizitkaga qo‘ying — mijoz portfolio, narx va kontaktlaringizni bir joyda ko‘radi.{!approved && " Sahifa moderator tasdiqlagach hammaga ochiladi."}</p>
      </div>

      {!edit ? (
        <div className="share-link">
          <span className="url"><span className="muted">{host}/m/</span><b>{slug}</b></span>
          <div className="row" style={{ gap: 6, flexWrap: "nowrap" }}>
            <button type="button" className="btn sm" onClick={() => copy()}>Nusxa</button>
            <button type="button" className="btn ghost sm" onClick={() => setEdit(true)}>O‘zgartirish</button>
          </div>
        </div>
      ) : (
        <div className="stack" style={{ gap: 8 }}>
          <label htmlFor="slug-in" className="small muted">Yangi manzil (lotin harflari, raqam, chiziqcha)</label>
          <div className="share-edit">
            <span className="muted">{host}/m/</span>
            <input id="slug-in" className="inp" value={value} maxLength={30} autoCapitalize="none" autoCorrect="off" spellCheck={false}
              onChange={(e) => setValue(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""))} />
          </div>
          {error && <p className="err">{error}</p>}
          <div className="row" style={{ gap: 6 }}>
            <button type="button" className="btn sm" disabled={pending} onClick={save}>{pending ? "Saqlanmoqda…" : "Saqlash"}</button>
            <button type="button" className="btn ghost sm" onClick={() => { setEdit(false); setValue(slug); setError(""); }}>Bekor qilish</button>
          </div>
        </div>
      )}

      <div className="share-grid">
        <div className="share-card">
          <b>Instagram bio uchun</b>
          <p className="muted small">Instagram → Profilni tahrirlash → Havolalar → Tashqi havola qo‘shish. Shu havoladan kelganlar statistikada “Instagram” bo‘lib ko‘rinadi.</p>
          <button type="button" className="btn ghost sm" onClick={() => copy("ig")}>Instagram havolasini nusxalash</button>
        </div>
        <div className="share-card">
          <b>Ulashish</b>
          <p className="muted small">Mijozga yoki kanalingizga yuboring. Havola chiroyli rasm bilan ochiladi.</p>
          <div className="row" style={{ gap: 6 }}>
            <button type="button" className="btn ghost sm" onClick={() => openExternal(`https://t.me/share/url?url=${encodeURIComponent(url("tg"))}&text=${encodeURIComponent(text)}`)}>Telegram</button>
            <button type="button" className="btn ghost sm" onClick={() => openExternal(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url("wa")}`)}`)}>WhatsApp</button>
            <button type="button" className="btn ghost sm" onClick={share}>Boshqa…</button>
          </div>
          {bot && (
            <button type="button" className="link small" onClick={async () => say((await copyText(`https://t.me/${bot}?start=m_${slug}`)) ? "Telegram ilova havolasi nusxalandi" : "Nusxa olinmadi")}>
              Telegram ichida ochiladigan havola
            </button>
          )}
        </div>
        <div className="share-card qr">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/v1/me/qr?format=svg&v=${slug}`} alt={`${host}/m/${slug} QR-kodi`} width={120} height={120} />
          <div className="stack" style={{ gap: 6 }}>
            <b>QR-kod</b>
            <p className="muted small">Vizitka, banner yoki studiya eshigiga. Skanerlashlar alohida hisoblanadi.</p>
            <button type="button" className="btn ghost sm" onClick={downloadQr}>PNG yuklab olish</button>
          </div>
        </div>
      </div>
      {toast && <div className="toast" role="status">{toast}</div>}
    </section>
  );
}
