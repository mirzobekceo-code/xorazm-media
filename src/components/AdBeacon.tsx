"use client";
import { useEffect, useRef } from "react";

const queue: { creativeId: number; slot: string; page: string }[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

function flush() {
  timer = null;
  if (!queue.length) return;
  const body = JSON.stringify({ events: queue.splice(0) });
  if (!navigator.sendBeacon?.("/api/v1/ads/events", new Blob([body], { type: "application/json" }))) {
    fetch("/api/v1/ads/events", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true }).catch(() => {});
  }
}

/** Ko'rish: banner yarmi kamida 1 soniya ekranda bo'lsa hisoblanadi. */
export default function AdBeacon({ creativeId, slot, children }: { creativeId: number; slot: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let t: ReturnType<typeof setTimeout> | null = null;
    let done = false;
    const io = new IntersectionObserver(([e]) => {
      if (done) return;
      if (e.isIntersecting) {
        t = setTimeout(() => {
          done = true;
          queue.push({ creativeId, slot, page: location.pathname });
          timer ??= setTimeout(flush, 2000);
          io.disconnect();
        }, 1000);
      } else if (t) clearTimeout(t);
    }, { threshold: 0.5 });
    io.observe(el);
    return () => { io.disconnect(); if (t) clearTimeout(t); };
  }, [creativeId, slot]);
  return <div ref={ref} style={{ display: "contents" }}>{children}</div>;
}
