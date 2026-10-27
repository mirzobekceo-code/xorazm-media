"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { ProfIcon } from "./Icons";

type Prof = { slug: string; nameUz: string; icon: string; count: number };

/**
 * Telefonda xizmatlar bir qatorda: o'zi sekin o'ngdan chapga suriladi, barmoq bilan ham suriladi,
 * tegilganda to'xtaydi. Ro'yxat ikki marta chiziladi — oxiriga yetganda sezdirmay boshiga qaytadi.
 */
export default function ServiceStrip({ profs }: { profs: Prof[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let paused = false, resume: ReturnType<typeof setTimeout> | undefined, raf = 0, last = 0, pos = el.scrollLeft;
    const hold = () => { paused = true; clearTimeout(resume); };
    const release = () => { clearTimeout(resume); resume = setTimeout(() => { paused = false; pos = el.scrollLeft; }, 2500); };
    const tick = (t: number) => {
      const dt = last ? Math.min(t - last, 64) : 16;
      last = t;
      if (!paused && el.offsetParent) {
        const half = el.scrollWidth / 2;
        pos += dt * 0.03; // ~30 px/s
        if (pos >= half) pos -= half;
        el.scrollLeft = pos;
      }
      raf = requestAnimationFrame(tick);
    };
    const onScroll = () => { if (paused) { const half = el.scrollWidth / 2; if (el.scrollLeft >= half) el.scrollLeft -= half; } };
    el.addEventListener("touchstart", hold, { passive: true });
    el.addEventListener("touchend", release);
    el.addEventListener("pointerenter", hold);
    el.addEventListener("pointerleave", release);
    el.addEventListener("scroll", onScroll, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(resume);
      el.removeEventListener("touchstart", hold);
      el.removeEventListener("touchend", release);
      el.removeEventListener("pointerenter", hold);
      el.removeEventListener("pointerleave", release);
      el.removeEventListener("scroll", onScroll);
    };
  }, []);
  const item = (p: Prof, dup: boolean) => (
    <Link key={(dup ? "d-" : "") + p.slug} className="strip-item" href={`/mutaxassislar/${p.slug}`} tabIndex={dup ? -1 : undefined} aria-hidden={dup || undefined}>
      <ProfIcon svg={p.icon} />
      <b>{p.nameUz.replace(/ \(.*\)/, "")}</b>
      <span className="num">{p.count} ta</span>
    </Link>
  );
  return (
    <div className="svc-strip" ref={ref} aria-label="Xizmatlar">
      {profs.map((p) => item(p, false))}
      {profs.map((p) => item(p, true))}
    </div>
  );
}
