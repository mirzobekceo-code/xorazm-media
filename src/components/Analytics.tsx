"use client";
import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";

const GA = process.env.NEXT_PUBLIC_GA_ID ?? "";
const YM = Number(process.env.NEXT_PUBLIC_YM_ID ?? 0);
type W = Window & { gtag?: (...a: unknown[]) => void; ym?: (...a: unknown[]) => void };

/**
 * Google Analytics 4 va Yandex Metrika — ID'lar Vercel'da berilgan bo'lsagina yuklanadi.
 * Sahifalar orasida o'tish (SPA) ham alohida ko'rish sifatida yuboriladi.
 */
export default function Analytics() {
  const path = usePathname();
  const search = useSearchParams();
  const first = useRef(true);
  useEffect(() => {
    // Birinchi ko'rishni skriptlarning o'zi yuboradi
    if (first.current) { first.current = false; return; }
    const url = path + (search.size ? `?${search}` : "");
    const w = window as W;
    w.gtag?.("event", "page_view", { page_location: location.origin + url, page_path: url });
    if (YM) w.ym?.(YM, "hit", url);
  }, [path, search]);

  if (!GA && !YM) return null;
  return (
    <>
      {GA && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA}`} strategy="afterInteractive" />
          <Script id="ga-init" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;gtag('js',new Date());gtag('config','${GA}');`}</Script>
        </>
      )}
      {YM > 0 && (
        <Script id="ym-init" strategy="afterInteractive">{`(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");window.__ymId=${YM};ym(${YM},"init",{clickmap:true,trackLinks:true,accurateTrackBounce:true,webvisor:false});`}</Script>
      )}
    </>
  );
}
