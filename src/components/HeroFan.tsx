import Link from "next/link";
import type { ProfileCard as Card } from "@/lib/queries";
import { kfmt, money } from "@/lib/format";
import { ProfIcon, Verified } from "./Icons";
import { Placeholder } from "./ProfileCard";
import Tile from "./Tile";

/** m — telefonda o'rni: l (chap), c (markaz), r (o'ng); berilmasa telefonda ko'rsatilmaydi. */
export type FanItem = { label: string; href: string; src: string; pos?: string; m?: "l" | "c" | "r" };

type Prof = { slug: string; nameUz: string; icon: string };

/** Bosh sahifa: yelpig'ichdek og'gan kartochkalar, markazda to'liq telefon maketi. */
export default function HeroFan({ items, top, profs }: { items: FanItem[]; top: Card[]; profs: Prof[] }) {
  const half = Math.ceil(items.length / 2);
  const card = (h: FanItem, d: number) => (
    <Link key={h.label} className={`fan-card${h.m ? ` m-${h.m}` : " m-x"}`} href={h.href}
      style={{ "--rot": `${d * 4.5}deg`, "--y": `${Math.abs(d) === 1 ? 6 : 52}px` } as React.CSSProperties}>
      <img src={h.src} alt="" style={{ objectPosition: h.pos }} fetchPriority={Math.abs(d) === 1 ? "high" : undefined} />
      <span className="pill">{h.label}</span>
    </Link>
  );
  return (
    <div className="fan">
      {items.slice(0, half).map((h, i) => card(h, i - half))}
      <Phone top={top} profs={profs} />
      {items.slice(half).map((h, i) => card(h, i + 1))}
    </div>
  );
}

function Phone({ top, profs }: { top: Card[]; profs: Prof[] }) {
  const pick = top[0];
  const cats = ["studiya", "texnika-ijarasi", "mobilograf", "suhandon"].map((s) => profs.find((p) => p.slug === s)).filter(Boolean) as Prof[];
  return (
    <div className="phone">
      <div className="screen">
        <div className="ph-status"><span>9:41</span><span className="island" /><span className="sig" aria-hidden="true"><i /><i /><i /><b /></span></div>
        <div className="ph-top">
          <span className="ph-loc">Xorazm ▾</span>
          <Link className="ph-ic" href="/mutaxassislar" aria-label="Qidirish">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          </Link>
        </div>
        <Link className="ph-hl" href="/mutaxassislar/studiya">
          <span className="ph-badge">YANGI</span>
          <b>Studiya va texnika ijarasi</b>
          <span>Kamera, svet va dronni ijaraga oling</span>
        </Link>
        <div className="ph-row"><b>Siz uchun tavsiya</b><Link href="/mutaxassislar">Hammasi</Link></div>
        {pick ? (
          <Link className="ph-pick" href={`/m/${pick.slug}`}>
            <div className="ph ph-img">
              {pick.cover ? <img src={pick.cover} alt="" /> : <Placeholder id={pick.id} name={pick.fullName} />}
              <span className="ph-chip">{pick.profession.nameUz}</span>
            </div>
            <div className="ph-b">
              <span className="nm">{pick.fullName} <Verified size={13} /></span>
              <span className="muted small">
                {pick.profession.slug === "bloger" ? `${kfmt(pick.followers)} obunachi` : `${pick.experienceYears} yil tajriba`}
                {pick.price ? ` · ${money(pick.price)} so‘m` : ""}
              </span>
            </div>
          </Link>
        ) : (
          <Link className="ph-pick" href="/qoshilish">
            <div className="ph ph-img"><Tile seed={5} scale={1.3} /><span className="ph-chip">Siz</span></div>
            <div className="ph-b"><span className="nm">Birinchi bo‘ling</span><span className="muted small">Portfolio qo‘shish bepul</span></div>
          </Link>
        )}
        <div className="ph-cats">
          {cats.map((p) => <Link key={p.slug} href={`/mutaxassislar/${p.slug}`}><ProfIcon svg={p.icon} />{p.nameUz.replace(/ \(.*\)/, "")}</Link>)}
        </div>
        <nav className="ph-tabbar" aria-hidden="true">
          <span className="on"><svg viewBox="0 0 24 24"><path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z" /></svg>Asosiy</span>
          <span><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>Qidiruv</span>
          <span><svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-9.3A3.9 3.9 0 0 1 12 8.3a3.9 3.9 0 0 1 7 2.4c0 4.9-7 9.3-7 9.3z" /></svg>Saqlangan</span>
          <span><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>Profil</span>
        </nav>
        <span className="home-bar" aria-hidden="true" />
      </div>
    </div>
  );
}
