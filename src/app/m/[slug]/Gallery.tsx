"use client";
import { useEffect, useState } from "react";

export type GalleryItem = { id: number; type: "image" | "video"; url: string; thumbUrl: string | null; stream: boolean };

/** Portfolio: katta ko'rinish (rasm yoki video pleer) va pastda kichik ko'rinishlar; ◀ ▶ va klaviatura bilan. */
export default function Gallery({ items, title }: { items: GalleryItem[]; title: string }) {
  const [i, setI] = useState(0);
  const n = items.length;
  const go = (d: number) => setI((x) => (x + d + n) % n);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest?.("input, textarea, select")) return;
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);
  if (!n) return null;
  const cur = items[i];
  return (
    <div className="gal">
      <div className="gal-stage">
        {cur.type === "image" ? (
          <img key={cur.id} src={cur.url} alt={`${title} — ${i + 1}`} />
        ) : cur.stream ? (
          <iframe key={cur.id} src={`${cur.url}?preload=metadata&poster=${encodeURIComponent(cur.thumbUrl ?? "")}`} title={`${title} — video`}
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture" allowFullScreen loading="lazy" />
        ) : (
          <video key={cur.id} src={cur.url} controls playsInline preload="metadata" />
        )}
        {n > 1 && (
          <>
            <button type="button" className="gal-nav prev" aria-label="Oldingi" onClick={() => go(-1)}>‹</button>
            <button type="button" className="gal-nav next" aria-label="Keyingi" onClick={() => go(1)}>›</button>
            <span className="gal-count num">{i + 1} / {n}</span>
          </>
        )}
      </div>
      {n > 1 && (
        <div className="gal-thumbs">
          {items.map((m, k) => (
            <button key={m.id} type="button" className={k === i ? "on" : ""} aria-label={`${m.type === "video" ? "Video" : "Rasm"} ${k + 1}`} onClick={() => setI(k)}>
              {m.thumbUrl ? <img src={m.thumbUrl} alt="" loading="lazy" /> : <span className="gal-v">Video</span>}
              {m.type === "video" && <span className="vplay" aria-hidden="true">▶</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
