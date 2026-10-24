import Link from "next/link";
import { ProfIcon } from "./Icons";

type Prof = { slug: string; nameUz: string; description: string; icon: string; count: number };

/** Xizmatlar (kasblar) plitkalari: oq-qora, minimal chiziqli ikonkalar. */
export default function ServiceGrid({ profs }: { profs: Prof[] }) {
  return (
    <div className="cats">
      {profs.map((p) => (
        <Link key={p.slug} className="cat" href={`/mutaxassislar/${p.slug}`}>
          <ProfIcon svg={p.icon} />
          <div><h3>{p.nameUz}</h3><p>{p.description}</p></div>
          <span className="c num">{p.count} ta profil →</span>
        </Link>
      ))}
      <Link className="cat all" href="/mutaxassislar">
        <span className="arrow" aria-hidden="true">↗</span>
        <div><h3>Barcha mutaxassislar</h3><p>Hudud, narx va tajriba bo‘yicha saralang</p></div>
      </Link>
    </div>
  );
}
