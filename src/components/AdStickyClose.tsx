"use client";
import { useEffect, useState } from "react";

const KEY = "xm-a4-closed";

/** A4 yopilsa, shu tashrif davomida qayta chiqmaydi. */
export default function AdStickyClose() {
  const [closed, setClosed] = useState(false);
  useEffect(() => {
    let was = false;
    try { was = sessionStorage.getItem(KEY) === "1"; } catch {}
    if (was) setClosed(true);
    else document.body.classList.add("has-sticky");
  }, []);
  useEffect(() => {
    if (!closed) return;
    const el = document.querySelector<HTMLElement>(".ad-sticky");
    if (el) el.hidden = true;
    document.body.classList.remove("has-sticky");
  }, [closed]);
  return (
    <button className="x" aria-label="Yopish" onClick={() => {
      try { sessionStorage.setItem(KEY, "1"); } catch {}
      setClosed(true);
    }}>×</button>
  );
}
