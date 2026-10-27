import { sql } from "drizzle-orm";
import { query } from "@/db";

export default async function Dashboard() {
  const [r] = await query<Record<string, number>>(sql`
    select
      (select count(*)::int from profiles where status = 'approved') as approved,
      (select count(*)::int from profiles where status = 'pending') as pending,
      (select count(*)::int from profiles where created_at > now() - interval '7 days') as new7,
      (select count(*)::int from reports where status <> 'closed') as reports,
      (select count(*)::int from requests where status = 'pending') as reqpending,
      (select count(*)::int from requests where status = 'open') as reqopen,
      (select count(*)::int from request_responses where created_at > now() - interval '7 days') as reqresp7,
      (select count(*)::int from users where created_at > now() - interval '7 days') as users7,
      (select count(*)::int from events where type = 'view' and created_at > now() - interval '1 day') as views1,
      (select count(*)::int from events where type = 'contact_click' and created_at > now() - interval '1 day') as contacts1,
      (select count(*)::int from ad_events where type = 'impression' and created_at > now() - interval '1 day') as adimp1,
      (select count(*)::int from ad_events where type = 'click' and created_at > now() - interval '1 day') as adclk1,
      (select coalesce(sum(size_bytes), 0)::bigint from media where url not like 'https://imagedelivery.net/%' and url not like 'https://iframe.videodelivery.net/%') as bytes
  `);
  // Ro'yxatdan o'tganlar qayerdan kelgan (birinchi tashrif manbasi), 30 kun
  const sources = await query<{ src: string; n: number }>(sql`
    select coalesce(signup_source, 'noma’lum') as src, count(*)::int as n from users
    where created_at > now() - interval '30 days' group by 1 order by 2 desc limit 15`);
  const maxSrc = Math.max(1, ...sources.map((x) => x.n));
  const tiles: [string, number][] = [
    ["Tasdiqlangan profillar", r.approved], ["Moderatsiya navbati", r.pending], ["Yangi profillar, 7 kun", r.new7], ["Ochiq shikoyatlar", r.reports],
    ["So‘rovlar: tekshiruvda", r.reqpending], ["So‘rovlar: ochiq", r.reqopen], ["So‘rovlarga javoblar, 7 kun", r.reqresp7], ["Yangi foydalanuvchilar, 7 kun", r.users7],
    ["Profil ko‘rishlari, 24 soat", r.views1], ["Kontakt bosishlar, 24 soat", r.contacts1], ["Reklama ko‘rishlari, 24 soat", r.adimp1], ["Reklama bosishlari, 24 soat", r.adclk1],
  ];
  // Fayl xotirasi limiti (Vercel Hobby: 1 GB); STORAGE_LIMIT_MB bilan o'zgartiriladi
  const limitMb = Number(process.env.STORAGE_LIMIT_MB ?? 1024);
  const usedMb = Number(r.bytes ?? 0) / 1024 / 1024;
  const pct = Math.round((usedMb / limitMb) * 100);
  return (
    <>
      <h1 style={{ fontSize: 36 }}>Dashboard</h1>
      <div className={pct >= 80 ? "notice" : "box"}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <b>Fayl xotirasi (Vercel)</b><span className="num">{usedMb.toFixed(0)} MB / {limitMb} MB · {pct}%</span>
        </div>
        <div className="bar" style={{ gridTemplateColumns: "1fr" }}><div className="track"><i style={{ width: `${Math.min(100, pct)}%` }} /></div></div>
        {pct >= 80 && <p className="small">Limitga yaqin. Video limitlarini kamaytiring yoki hosting tarifini oshiring.</p>}
        <p className="muted small">Cloudflare’dagi rasm va videolar bu yerda hisoblanmaydi — ularni Cloudflare panelidagi Images &amp; Stream bo‘limida ko‘ring.</p>
      </div>
      <div className="tiles">{tiles.map(([l, v]) => <div className="tile" key={l}><b className="num">{v ?? 0}</b><span>{l}</span></div>)}</div>
      <section className="box">
        <h3>Ro‘yxatdan o‘tganlar manbasi · 30 kun</h3>
        {sources.length ? (
          <ul className="brk">{sources.map((x) => (
            <li key={x.src}><span>{x.src}</span><span className="brk-bar"><i style={{ width: `${(x.n / maxSrc) * 100}%` }} /></span><b className="num">{x.n}</b></li>
          ))}</ul>
        ) : <p className="muted small">Hali ma’lumot yo‘q.</p>}
        <p className="muted small">utm_source, kelgan sayt (instagram.com, t.me…) yoki “tg_miniapp”. Batafsil tahlil — Google Analytics va Yandex Metrika’da.</p>
      </section>
    </>
  );
}
