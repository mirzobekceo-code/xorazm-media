import Link from "next/link";
import type { ProfileCard as Card } from "@/lib/queries";
import { initials, kfmt, money } from "@/lib/format";
import { Verified } from "./Icons";
import Tile from "./Tile";

/** Rasmi yo'q profil uchun: Xiva koshini naqshi va ism harflari. */
export function Placeholder({ id, name, big }: { id: number; name: string; big?: boolean }) {
  return (
    <>
      <Tile seed={id} scale={big ? 1.6 : 1.8} />
      <span className={`ini${big ? " big" : ""}`}>{initials(name)}</span>
    </>
  );
}

/** verified=false — kabinetdagi oldindan ko'rish (hali tasdiqlanmagan profil) */
export default function ProfileCard({ p, verified = true }: { p: Card; verified?: boolean }) {
  const isBlogger = p.profession.slug === "bloger";
  const meta = isBlogger
    ? `${kfmt(p.followers)} obunachi${p.er ? ` · ER ${p.er}%` : ""}`
    : `${p.districts[0] ?? "Xorazm"}${p.districts.length > 1 ? ` +${p.districts.length - 1}` : ""} · ${p.experienceYears} yil tajriba`;
  return (
    <Link className="card" href={`/m/${p.slug}`}>
      <div className="ph">
        {p.cover ? <img src={p.cover} alt="" loading="lazy" /> : <Placeholder id={p.id} name={p.fullName} />}
        <span className="chip">{p.profession.nameUz}</span>
        {p.isFeatured && <span className="top">TOP</span>}
      </div>
      {p.thumbs.length > 0 && (
        <div className="strip">
          {p.thumbs.map((t) => <img key={t} src={t} alt="" loading="lazy" />)}
          {Array.from({ length: 3 - p.thumbs.length }, (_, i) => <span key={i} />)}
        </div>
      )}
      <div className="b">
        <span className="nm">{p.fullName} {verified && <Verified />}</span>
        <span className="meta">{meta}</span>
        <div className="tags">{p.tags.slice(0, 3).map((t) => <span key={t} className="tg">{t}</span>)}</div>
        <div className="pr">
          <span className="muted">{p.isAvailable ? (isBlogger ? p.districts[0] : "Bo‘sh") : <span className="busy">Band</span>}</span>
          <b className="num">{p.price ? `${money(p.price)} / ${p.profession.unit}` : "Kelishiladi"}</b>
        </div>
      </div>
    </Link>
  );
}
