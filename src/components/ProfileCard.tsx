import Link from "next/link";
import type { ProfileCard as Card } from "@/lib/queries";
import { initials, kfmt, money } from "@/lib/format";
import { Verified } from "./Icons";

export default function ProfileCard({ p }: { p: Card }) {
  const isBlogger = p.profession.slug === "bloger";
  const meta = isBlogger
    ? `${kfmt(p.followers)} obunachi${p.er ? ` · ER ${p.er}%` : ""}`
    : `${p.districts[0] ?? "Xorazm"}${p.districts.length > 1 ? ` +${p.districts.length - 1}` : ""} · ${p.experienceYears} yil tajriba`;
  return (
    <Link className="card" href={`/m/${p.slug}`}>
      <div className="ph">
        {p.cover ? <img src={p.cover} alt="" loading="lazy" /> : <span className="ini">{initials(p.fullName)}</span>}
        <span className="chip">{p.profession.nameUz}</span>
        {p.isFeatured && <span className="top">TOP</span>}
      </div>
      <div className="b">
        <span className="nm">{p.fullName} <Verified /></span>
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
