import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDistricts, getProfessions, searchProfiles, type CatalogFilters } from "@/lib/queries";
import ProfileCard from "@/components/ProfileCard";
import Ad from "@/components/Ad";
import { professionFromQuery } from "@/lib/ads";
import SortSelect from "./SortSelect";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug?: string[] }>; searchParams: Promise<Record<string, string | undefined>> };

async function resolve({ params, searchParams }: Props) {
  const [{ slug = [] }, sp, profs, dists] = await Promise.all([params, searchParams, getProfessions(), getDistricts()]);
  if (slug.length > 2) return null;
  const prof = slug[0] ? profs.find((p) => p.slug === slug[0]) : undefined;
  if (slug[0] && !prof) return null;
  const distSlug = slug[1] ?? sp.tuman;
  const dist = distSlug ? dists.find((d) => d.slug === distSlug) : undefined;
  if (slug[1] && !dist) return null;
  const num = (v?: string) => (v && /^\d+$/.test(v) ? Number(v) : undefined);
  const filters: CatalogFilters = {
    profession: prof?.slug,
    district: dist?.slug,
    q: sp.q?.slice(0, 80) || undefined,
    exp: num(sp.tajriba),
    priceMin: num(sp.narx_min),
    priceMax: num(sp.narx_max),
    gender: prof?.slug === "brand-face" && (sp.jins === "f" || sp.jins === "m") ? sp.jins : undefined,
    audience: prof?.slug === "bloger" && (sp.auditoriya === "s" || sp.auditoriya === "m" || sp.auditoriya === "l") ? sp.auditoriya : undefined,
    sort: (["top", "new", "cheap", "views"] as const).find((x) => x === sp.saralash) ?? "top",
    page: num(sp.sahifa) ?? 1,
  };
  return { prof, dist, profs, dists, filters, sp };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const r = await resolve(props);
  if (!r) return {};
  const res = await searchProfiles({ profession: r.prof?.slug, district: r.dist?.slug });
  const what = r.prof ? r.prof.nameUz.toLowerCase() : "media mutaxassislar";
  const where = r.dist ? r.dist.nameUz.replace(/ shahri$/, "") + "da" : "Xorazmda";
  return {
    title: `${where} ${what} — ${res.total} ta profil, narxlar`,
    description: `${where} ${what}: portfolio, narxlar va kontaktlar. Bepul, vositachisiz.`,
    alternates: { canonical: `/mutaxassislar${r.prof ? `/${r.prof.slug}${r.dist ? `/${r.dist.slug}` : ""}` : ""}` },
  };
}

export default async function Catalog(props: Props) {
  const r = await resolve(props);
  if (!r) notFound();
  const { prof, dist, profs, dists, filters, sp } = r;
  const res = await searchProfiles(filters);
  const adCtx = { profession: prof?.slug ?? professionFromQuery(filters.q, profs), district: dist?.slug };

  // Filtr havolalari: joriy holatni saqlab, bitta qiymatni almashtiradi
  const href = (o: { kasb?: string | null; tuman?: string | null; [k: string]: string | null | undefined }) => {
    const kasb = o.kasb === undefined ? prof?.slug : o.kasb ?? undefined;
    const tuman = o.tuman === undefined ? dist?.slug : o.tuman ?? undefined;
    const q = new URLSearchParams();
    for (const k of ["q", "tajriba", "narx_min", "narx_max", "jins", "auditoriya", "saralash"]) {
      const v = k in o ? o[k] : sp[k];
      if (v) q.set(k, v);
    }
    if (o.kasb !== undefined) { q.delete("jins"); q.delete("auditoriya"); }
    if (o.sahifa && o.sahifa !== "1") q.set("sahifa", o.sahifa);
    let path = "/mutaxassislar";
    if (kasb) path += `/${kasb}`;
    if (kasb && tuman) path += `/${tuman}`;
    else if (tuman) q.set("tuman", tuman);
    const qs = q.toString();
    return qs ? `${path}?${qs}` : path;
  };
  const chip = (label: string, to: string, on: boolean) => <Link key={label} href={to} aria-current={on ? "true" : undefined}>{label}</Link>;

  const items = res.items;
  return (
    <div className="cat-layout">
      <aside className="filters" aria-label="Filtrlar">
        <form className="fgroup" action={href({})} method="get">
          <span>Qidiruv</span>
          <input className="inp" id="f-q" name="q" type="search" placeholder="Ism yoki ko‘nikma" defaultValue={filters.q ?? ""} />
          {["tajriba", "jins", "auditoriya", "saralash"].map((k) => sp[k] ? <input key={k} type="hidden" name={k} value={sp[k]} /> : null)}
          {!prof && dist && <input type="hidden" name="tuman" value={dist.slug} />}
          <div className="row" style={{ flexWrap: "nowrap" }}>
            <input className="inp" id="f-min" name="narx_min" inputMode="numeric" placeholder="Narx dan" defaultValue={sp.narx_min ?? ""} />
            <input className="inp" id="f-max" name="narx_max" inputMode="numeric" placeholder="gacha" defaultValue={sp.narx_max ?? ""} />
          </div>
          <button className="btn ghost sm" type="submit">Qo‘llash</button>
        </form>
        <div className="fgroup"><span>Yo‘nalish</span>
          <div className="chips">{[chip("Hammasi", href({ kasb: null }), !prof), ...profs.map((p) => chip(p.nameUz, href({ kasb: p.slug }), prof?.slug === p.slug))]}</div>
        </div>
        <div className="fgroup"><span>Tuman</span>
          <div className="chips">{[chip("Butun Xorazm", href({ tuman: null }), !dist), ...dists.filter((d) => d.count > 0 || d.slug === dist?.slug).map((d) => chip(d.nameUz, href({ tuman: d.slug }), dist?.slug === d.slug))]}</div>
        </div>
        {prof?.slug === "bloger" && (
          <div className="fgroup"><span>Auditoriya</span>
            <div className="chips">{([["", "Hammasi"], ["s", "10K gacha"], ["m", "10K–50K"], ["l", "50K+"]] as const).map(([v, l]) => chip(l, href({ auditoriya: v || null }), (sp.auditoriya ?? "") === v))}</div>
          </div>
        )}
        {prof?.slug === "brand-face" && (
          <div className="fgroup"><span>Jins</span>
            <div className="chips">{([["", "Hammasi"], ["f", "Ayol"], ["m", "Erkak"]] as const).map(([v, l]) => chip(l, href({ jins: v || null }), (sp.jins ?? "") === v))}</div>
          </div>
        )}
        <div className="fgroup"><span>Tajriba</span>
          <div className="chips">{([["", "Farqi yo‘q"], ["1", "1+ yil"], ["3", "3+ yil"], ["5", "5+ yil"]] as const).map(([v, l]) => chip(l, href({ tajriba: v || null }), (sp.tajriba ?? "") === v))}</div>
        </div>
        <Link className="link" href="/mutaxassislar">Filtrlarni tozalash</Link>
      </aside>

      <div style={{ minWidth: 0 }}>
        <div className="cat-top">
          <div>
            <h1>{prof ? prof.nameUz : "Barcha mutaxassislar"}{dist ? ` · ${dist.nameUz}` : ""}</h1>
            <p className="muted num">{res.total} ta profil · kontaktlar bepul</p>
          </div>
          <SortSelect value={filters.sort ?? "top"} />
        </div>
        {items.length ? (
          <div className="grid three">
            {items.flatMap((p, i) => {
              const card = <ProfileCard key={p.id} p={p} />;
              return i === 4 ? [card, <Ad key="ad" slot="A2" variant="card" ctx={adCtx} />] : [card];
            })}
            {items.length <= 4 && <Ad slot="A2" variant="card" ctx={adCtx} />}
          </div>
        ) : (
          <>
            <div className="empty">Bu filtr bo‘yicha hozircha profil yo‘q. Tumanni “Butun Xorazm” qilib ko‘ring.</div>
            <div className="grid three"><Ad slot="A2" variant="card" ctx={adCtx} /></div>
          </>
        )}
        {res.pages > 1 && (
          <nav className="pager" aria-label="Sahifalar">
            {Array.from({ length: res.pages }, (_, i) => i + 1).map((n) =>
              n === res.page ? <span key={n} className="num">{n}</span> : <Link key={n} className="num" href={href({ sahifa: String(n) })}>{n}</Link>)}
          </nav>
        )}
      </div>
    </div>
  );
}
