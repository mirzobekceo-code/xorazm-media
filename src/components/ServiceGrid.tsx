import Link from "next/link";
import { ProfIcon } from "./Icons";

type Prof = { slug: string; nameUz: string; description: string; icon: string; count: number };

/** Xizmatlar (kasblar) plitkalari: oq-qora, minimal chiziqli ikonkalar. */
export default function ServiceGrid({ profs }: { profs: Prof[] }) {
  return (
    <div className="cats">
      {profs.map((p) => (
        // Profil hali yo'q bo'lsa "0 ta profil" o'rniga so'rov qoldirishga yo'naltiradi (sayt bo'sh ko'rinmasin)
        <Link key={p.slug} className="cat" href={p.count ? `/mutaxassislar/${p.slug}` : `/sorov?kasb=${p.slug}`}>
          <ProfIcon svg={p.icon} />
          <div><h3>{p.nameUz}</h3><p>{p.description}</p></div>
          <span className="c num">{p.count ? `${p.count} ta profil →` : "So‘rov qoldirish →"}</span>
        </Link>
      ))}
      <Link className="cat all" href="/mutaxassislar">
        <span className="arrow" aria-hidden="true">↗</span>
        <div><h3>Barcha mutaxassislar</h3><p>Hudud, narx va tajriba bo‘yicha saralang</p></div>
      </Link>
    </div>
  );
}
