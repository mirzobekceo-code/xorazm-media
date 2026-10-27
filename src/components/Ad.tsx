import { getAdPicker, type AdContext, type Creative } from "@/lib/ads";
import type { Slot } from "@/lib/reference";
import AdBeacon from "./AdBeacon";

type Variant = "banner" | "card" | "side";

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
  const cta = <a className="cta" href={href} target="_blank" rel="noopener sponsored">{c.cta}</a>;

  if (c.type === "image" && c.imageDesktop) {
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
  const brand = <Brand style={c.style} />;
  const badge = c.badge ? <span className="badge">{c.badge}</span> : null;
  const cls = `ad s-${c.style}`;

  if (variant === "banner") {
    return (
      <aside className={`${cls} ad-banner`} aria-label="Reklama" data-slot={slot}>
        <span className="ad-target" />
        {brand}
        <div className="txt">{badge}<h3>{c.title}</h3><p>{c.body}</p></div>
        {cta}
      </aside>
    );
  }
  if (variant === "card" && c.style === "production" && c.type === "text") {
    // Lenta ichidagi "Rasmiy jamoa" kartochkasi: mutaxassis kartochkalari orasida firuza ramka bilan
    return (
      <aside className={`${cls} ad-card ad-vip`} aria-label="Reklama" data-slot={slot}>
        <span className="vip-badge"><svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2.2" /></svg>{c.badge ?? "Rasmiy jamoa"}</span>
        {brand}
        <div className="stack" style={{ gap: 8 }}><h3>{c.title}</h3><p>{c.body}</p></div>
        <div className="vip-roles">{["Operator", "Mobilograf", "Montajor", "Ssenariy"].map((r) => <span key={r}>{r}</span>)}</div>
        <div>{cta}</div>
      </aside>
    );
  }
  if (variant === "card") {
    return (
      <aside className={`${cls} ad-card`} aria-label="Reklama" data-slot={slot}>
        <span className="ad-target" />
        {brand}
        {c.type === "video" && c.video
          ? <video src={c.video} muted autoPlay loop playsInline style={{ width: "100%", borderRadius: 10 }} />
          : <div className="stack" style={{ gap: 8 }}>{badge}<h3>{c.title}</h3><p>{c.body}</p></div>}
        <div>{cta}</div>
      </aside>
    );
  }
  return (
    <aside className={`${cls} ad-side`} aria-label="Reklama" data-slot={slot}>
      <span className="ad-target" />
      {brand}
      {badge}
      <h3>{c.title}</h3>
      <p>{c.body}</p>
      <div>{cta}</div>
    </aside>
  );
}

/** Adverto logotipi; marketing va production yo'nalishlarida ostida belgi bilan nomi. */
function Brand({ style }: { style: string }) {
  if (style !== "marketing" && style !== "production") return <img className="logo" src={LOGO} alt="adverto" />;
  return (
    <div className="ad-brand">
      <img className="logo" src={LOGO} alt="adverto" />
      <span className="kick">
        {style === "marketing"
          ? <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><path d="M2 12l4-4 3 3 5-6M10 5h4v4" fill="none" stroke="currentColor" strokeWidth="1.8" /></svg>
          : <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M6.5 5.3l4.2 2.7-4.2 2.7z" fill="currentColor" /></svg>}
        {style}
      </span>
    </div>
  );
}
