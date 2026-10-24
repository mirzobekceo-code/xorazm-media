import Link from "next/link";
import type { ProfileCard as Card } from "@/lib/queries";
import { ProfIcon, Verified } from "./Icons";
import { Placeholder } from "./ProfileCard";
import Tile from "./Tile";

type Prof = { id: number; slug: string; nameUz: string; icon: string; count: number };

/** Kartochka yorlig'i (ko'plik) va bosh sahifa rasmi. Rasm bo'lmasa — TOP profil muqovasi yoki koshin naqshi. */
const LOOK: Record<string, { label: string; src?: string; pos?: string }> = {
  "brand-face": { label: "Brand Face", src: "/hero/brandface.webp", pos: "center 22%" },
  bloger: { label: "Blogerlar", src: "/hero/bloger.webp", pos: "center 35%" },
  operator: { label: "Operatorlar", src: "/hero/operator.webp", pos: "center 28%" },
  fotograf: { label: "Fotograflar" },
  montajor: { label: "Montajorlar", src: "/hero/montajor.webp", pos: "center 40%" },
  dizayner: { label: "Dizaynerlar" },
  targetolog: { label: "Targetologlar" },
  smm: { label: "SMM managerlar" },
};

/** Yelpig'ich: markazdan uzoqlashgan sari ko'proq og'adi va pastga tushadi. */
function fan(i: number, n: number) {
  const half = n / 2;
  const d = i < half ? i - half : i - half + 1; // -4..-1, 1..4
  return { "--rot": `${d * 3.2}deg`, "--y": `${Math.abs(d) * Math.abs(d) * 5}px` } as React.CSSProperties;
}

function FanCard({ p, cover, style }: { p: Prof; cover?: string | null; style: React.CSSProperties }) {
  const look = LOOK[p.slug] ?? { label: p.nameUz };
  const src = look.src ?? cover;
  return (
    <Link className="fan-card" href={`/mutaxassislar/${p.slug}`} style={style}>
      {src ? <img src={src} alt="" loading="lazy" style={{ objectPosition: look.pos }} /> : <><Tile seed={p.id} scale={1.5} /><ProfIcon svg={p.icon} className="fan-ic" /></>}
      <span className="pill">{look.label}<b className="num">{p.count}</b></span>
    </Link>
  );
}

export default function Showcase({ profs, top }: { profs: Prof[]; top: Card[] }) {
  const coverOf = (slug: string) => top.find((t) => t.profession.slug === slug && t.cover)?.cover;
  const n = profs.length;
  const left = profs.slice(0, Math.ceil(n / 2));
  const right = profs.slice(Math.ceil(n / 2));
  const pick = top[0];

  return (
    <section className="showcase">
      <p className="eyebrow">Mutaxassislar</p>
      <h2>Har bir loyiha uchun <em>o‘z mutaxassisi</em></h2>
      <div className="cta">
        <Link className="btn xl" href="/mutaxassislar">Mutaxassis topish <span aria-hidden="true">↗</span></Link>
        <Link className="btn xl dark" href="/qoshilish">Men mutaxassisman</Link>
      </div>

      <div className="fan">
        {left.map((p, i) => <FanCard key={p.slug} p={p} cover={coverOf(p.slug)} style={fan(i, n)} />)}
        <div className="phone" aria-label="Siz uchun tavsiya">
          <div className="notch" />
          <p className="ph-t">Siz uchun tavsiya</p>
          {pick ? (
            <Link className="ph-pick" href={`/m/${pick.slug}`}>
              <div className="ph-img">{pick.cover ? <img src={pick.cover} alt="" loading="lazy" /> : <Placeholder id={pick.id} name={pick.fullName} />}</div>
              <span className="nm">{pick.fullName} <Verified size={14} /></span>
              <span className="muted small">{pick.profession.nameUz}{pick.districts[0] ? ` · ${pick.districts[0]}` : ""}</span>
            </Link>
          ) : (
            <Link className="ph-pick" href="/qoshilish">
              <div className="ph-img"><Tile seed={3} scale={1.4} /></div>
              <span className="nm">Birinchi bo‘ling</span>
              <span className="muted small">Profil ochish bepul</span>
            </Link>
          )}
          <p className="ph-t">Yo‘nalishlar</p>
          <div className="ph-cats">
            {profs.slice(0, 4).map((p) => (
              <Link key={p.slug} href={`/mutaxassislar/${p.slug}`}><ProfIcon svg={p.icon} />{p.nameUz}</Link>
            ))}
          </div>
        </div>
        {right.map((p, i) => <FanCard key={p.slug} p={p} cover={coverOf(p.slug)} style={fan(i + left.length, n)} />)}
      </div>
    </section>
  );
}
