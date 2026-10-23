import { getAdPicker, type AdContext, type Creative } from "@/lib/ads";
import type { Slot } from "@/lib/reference";
import AdBeacon from "./AdBeacon";
import AdStickyClose from "./AdStickyClose";

type Variant = "banner" | "card" | "side" | "sticky";

const LOGO = "/brand/adverto-white.png";

/** Reklama joyi. Kreativ so'rov ichida umumiy tanlovchidan olinadi; slot hech qachon bo'sh qolmaydi (fallback). */
export default async function Ad({ slot, variant, ctx }: { slot: Slot; variant: Variant; ctx?: AdContext }) {
  const pick = await getAdPicker();
  const c = pick(slot, ctx);
  if (!c) return null;
  const href = `/r/${c.id}?s=${slot}`;
  return (
    <AdBeacon creativeId={c.id} slot={slot}>
      {render(variant, c, href, slot)}
    </AdBeacon>
  );
}

function render(variant: Variant, c: Creative, href: string, slot: Slot) {
  const label = <span className="tag">Reklama</span>;
  const cta = <a className="cta" href={href} target="_blank" rel="noopener sponsored">{c.cta}</a>;

  if (c.type === "image" && c.imageDesktop && variant !== "sticky") {
    return (
      <aside className="ad" aria-label="Reklama" data-slot={slot}>
        <a href={href} target="_blank" rel="noopener sponsored">
          <picture>
            {c.imageMobile && <source media="(max-width: 560px)" srcSet={c.imageMobile} />}
            <img className="img" src={c.imageDesktop} alt={c.title} />
          </picture>
        </a>
      </aside>
    );
  }
  if (variant === "sticky") {
    return (
      <aside className="ad ad-sticky" aria-label="Reklama" data-slot={slot}>
        <img className="logo" src={LOGO} alt="adverto" style={{ height: 16 }} />
        <span className="txt">{c.title}</span>
        <a className="cta" href={href} target="_blank" rel="noopener sponsored" style={{ height: 32, fontSize: 13 }}>{c.cta}</a>
        <AdStickyClose />
      </aside>
    );
  }
  if (variant === "banner") {
    return (
      <aside className="ad ad-banner" aria-label="Reklama" data-slot={slot}>
        <span className="ad-target" />
        <img className="logo" src={LOGO} alt="adverto" />
        <div className="txt">{label}<h3>{c.title}</h3><p>{c.body}</p></div>
        {cta}
      </aside>
    );
  }
  if (variant === "card") {
    return (
      <aside className="ad ad-card" aria-label="Reklama" data-slot={slot}>
        <span className="ad-target" />
        <div className="stack" style={{ gap: 12 }}><img className="logo" src={LOGO} alt="adverto" />{label}</div>
        {c.type === "video" && c.video
          ? <video src={c.video} muted autoPlay loop playsInline style={{ width: "100%", borderRadius: 10 }} />
          : <div className="stack" style={{ gap: 8 }}><h3>{c.title}</h3><p>{c.body}</p></div>}
        <div>{cta}</div>
      </aside>
    );
  }
  return (
    <aside className="ad ad-side" aria-label="Reklama" data-slot={slot}>
      <span className="ad-target" />
      <img className="logo" src={LOGO} alt="adverto" />
      {label}
      <h3>{c.title}</h3>
      <p>{c.body}</p>
      <div>{cta}</div>
    </aside>
  );
}
