import Link from "next/link";
import type { ProfileCard as Card } from "@/lib/queries";
import { kfmt, money } from "@/lib/format";
import { Verified } from "./Icons";
import { Placeholder } from "./ProfileCard";

export type FanItem = { label: string; href: string; src: string; pos?: string };

/** Bosh sahifa: yelpig'ichdek og'gan kartochkalar, markazda telefon (ikki chap, ikki o'ng). */
export default function HeroFan({ items, top, profs }: { items: FanItem[]; top: Card[]; profs: { slug: string; nameUz: string }[] }) {
  const half = Math.ceil(items.length / 2);
  const pick = top[0];
  const card = (h: FanItem, d: number) => (
    <Link key={h.label} className="fan-card" href={h.href} style={{ "--rot": `${d * 4.5}deg`, "--y": `${Math.abs(d) === 1 ? 6 : 52}px` } as React.CSSProperties}>
      <img src={h.src} alt="" style={{ objectPosition: h.pos }} fetchPriority={Math.abs(d) === 1 ? "high" : undefined} />
      <span className="pill">{h.label}</span>
    </Link>
  );
  return (
    <div className="fan">
      {items.slice(0, half).map((h, i) => card(h, i - half))}
      <div className="phone">
        <div className="ph-top">
          <span className="ph-loc">Xorazm ▾</span>
          <Link className="ph-ic" href="/mutaxassislar" aria-label="Qidirish">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          </Link>
        </div>
        <Link className="ph-hl" href="/mutaxassislar/studiya">
          <span className="ph-badge">YANGI</span>
          <b>Studiya va texnika ijarasi</b>
          <span>Kamera, svet va dronni ijaraga oling</span>
        </Link>
        <div className="ph-tabs">
          <Link href="/mutaxassislar" className="on">Hammasi</Link>
          {profs.slice(0, 2).map((p) => <Link key={p.slug} href={`/mutaxassislar/${p.slug}`}>{p.nameUz}</Link>)}
        </div>
        <div className="ph-row"><b>Siz uchun tavsiya</b><Link href="/mutaxassislar">Hammasi</Link></div>
        {pick ? (
          <Link className="ph-pick" href={`/m/${pick.slug}`}>
            <div className="ph ph-img">
              {pick.cover ? <img src={pick.cover} alt="" /> : <Placeholder id={pick.id} name={pick.fullName} />}
              <span className="ph-chip">{pick.profession.nameUz}</span>
            </div>
            <div className="ph-b">
              <span className="nm">{pick.fullName} <Verified size={14} /></span>
              <span className="muted small">
                {pick.profession.slug === "bloger" ? `${kfmt(pick.followers)} obunachi` : `${pick.experienceYears} yil tajriba`}
                {pick.districts[0] ? ` · ${pick.districts[0]}` : ""}
              </span>
              {pick.price ? <span className="pr num">{money(pick.price)} so‘m</span> : null}
            </div>
          </Link>
        ) : (
          <Link className="ph-pick" href="/qoshilish">
            <div className="ph-b"><span className="nm">Birinchi bo‘ling</span><span className="muted small">Profil ochish bepul</span></div>
          </Link>
        )}
      </div>
      {items.slice(half).map((h, i) => card(h, i + 1))}
    </div>
  );
}
