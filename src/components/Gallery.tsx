"use client";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

export type GalleryItem = {
  id: number; type: "image" | "video"; url: string; thumbUrl: string | null; stream: boolean;
  /** Bo'lim galereyasida: ish kimniki va profil havolasi */
  caption?: string; sub?: string; href?: string;
};

/**
 * Portfolio galereyasi: ishlar to'r (grid) ko'rinishida, bosilganda to'liq ekranda ochiladi.
 * To'liq ekranda ◀ ▶, klaviatura (← → Esc), telefonda surish (swipe) va pastda kichik ko'rinishlar.
 * `feature` — birinchi ish kattaroq (profil sahifasi uchun).
 */
export default function Gallery({ items, title, feature = true }: { items: GalleryItem[]; title: string; feature?: boolean }) {
  const [open, setOpen] = useState<number | null>(null);
  const n = items.length;
  if (!n) return null;
  const big = feature && n >= 3;
  // Oxirgi qatorda bo'sh katak qolmasin: oxirgi ish qolgan joyni egallaydi (har bir ekran kengligi uchun alohida)
  const fill = (cols: number) => {
    const cells = n + (big ? 3 : 0); // katta ish 2×2 = 4 katak
    const rem = cells % cols;
    return rem ? cols - rem + 1 : 1;
  };
  const lastStyle = { "--s4": fill(4), "--s3": fill(3), "--s2": fill(2) } as CSSProperties;
  return (
    <>
      <div className={`gal-grid${big ? " has-feature" : ""}${n < 3 ? ` few-${n}` : ""}`}>
        {items.map((m, k) => (
          <button key={m.id} type="button" className={`gal-tile${big && k === 0 ? " feature" : ""}${k === n - 1 && n >= 3 ? " last" : ""}`}
            style={k === n - 1 && n >= 3 ? lastStyle : undefined} onClick={() => setOpen(k)}
            aria-label={`${m.type === "video" ? "Video" : "Rasm"} ${k + 1} — kattalashtirish${m.caption ? `, ${m.caption}` : ""}`}>
            <Thumb m={m} />
            {m.type === "video" && <span className="vplay" aria-hidden="true">▶</span>}
            {m.caption && <span className="gal-cap"><b>{m.caption}</b>{m.sub && <span>{m.sub}</span>}</span>}
          </button>
        ))}
      </div>
      {open !== null && <Lightbox items={items} start={open} title={title} onClose={() => setOpen(null)} />}
    </>
  );
}

function Thumb({ m }: { m: GalleryItem }) {
  if (m.thumbUrl) return <img src={m.thumbUrl} alt="" loading="lazy" />;
  if (m.type === "image") return <img src={m.url} alt="" loading="lazy" />;
  // Muqovasi yo'q video: birinchi kadr ko'rsatiladi
  if (!m.stream) return <video src={`${m.url}#t=0.1`} muted playsInline preload="metadata" tabIndex={-1} />;
  return <span className="gal-v">Video</span>;
}

function Lightbox({ items, start, title, onClose }: { items: GalleryItem[]; start: number; title: string; onClose: () => void }) {
  const [i, setI] = useState(start);
  const n = items.length;
  const go = useCallback((d: number) => setI((x) => (x + d + n) % n), [n]);
  const closeRef = useRef<HTMLButtonElement>(null);
  const thumbsRef = useRef<HTMLDivElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
    };
  }, [go, onClose]);

  // Faol kichik ko'rinish doim ko'rinib tursin
  useEffect(() => {
    thumbsRef.current?.querySelector<HTMLElement>(".on")?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [i]);

  const cur = items[i];
  return (
    <div className="lb" role="dialog" aria-modal="true" aria-label={`${title} — portfolio`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onTouchStart={(e) => { const t = e.touches[0]; touch.current = { x: t.clientX, y: t.clientY }; }}
      onTouchEnd={(e) => {
        const s = touch.current; touch.current = null;
        if (!s || n < 2) return;
        const t = e.changedTouches[0]; const dx = t.clientX - s.x; const dy = t.clientY - s.y;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
      }}>
      <div className="lb-top">
        <span className="num">{i + 1} / {n}</span>
        <button ref={closeRef} type="button" className="lb-x" aria-label="Yopish" onClick={onClose}>×</button>
      </div>
      <div className="lb-stage" onClick={(e) => e.target === e.currentTarget && onClose()}>
        {cur.type === "image" ? (
          <img key={cur.id} src={cur.url} alt={`${cur.caption ?? title} — ${i + 1}`} />
        ) : cur.stream ? (
          <iframe key={cur.id} src={`${cur.url}?autoplay=true&poster=${encodeURIComponent(cur.thumbUrl ?? "")}`} title={`${cur.caption ?? title} — video`}
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture" allowFullScreen />
        ) : (
          <video key={cur.id} src={cur.url} controls autoPlay playsInline preload="metadata" />
        )}
        {n > 1 && (
          <>
            <button type="button" className="gal-nav prev" aria-label="Oldingi" onClick={() => go(-1)}>‹</button>
            <button type="button" className="gal-nav next" aria-label="Keyingi" onClick={() => go(1)}>›</button>
          </>
        )}
      </div>
      {(cur.caption || cur.href) && (
        <div className="lb-cap">
          <div>{cur.caption && <b>{cur.caption}</b>}{cur.sub && <span className="muted"> · {cur.sub}</span>}</div>
          {cur.href && <a className="btn sm" href={cur.href}>Profilni ko‘rish →</a>}
        </div>
      )}
      {n > 1 && (
        <div className="lb-thumbs" ref={thumbsRef}>
          {items.map((m, k) => (
            <button key={m.id} type="button" className={k === i ? "on" : ""} aria-label={`${m.type === "video" ? "Video" : "Rasm"} ${k + 1}`}
              aria-current={k === i ? "true" : undefined} onClick={() => setI(k)}>
              <Thumb m={m} />
              {m.type === "video" && <span className="vplay" aria-hidden="true">▶</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
