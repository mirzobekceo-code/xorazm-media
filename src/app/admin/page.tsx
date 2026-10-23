import { sql } from "drizzle-orm";
import { query } from "@/db";

export default async function Dashboard() {
  const [r] = await query<Record<string, number>>(sql`
    select
      (select count(*)::int from profiles where status = 'approved') as approved,
      (select count(*)::int from profiles where status = 'pending') as pending,
      (select count(*)::int from profiles where created_at > now() - interval '7 days') as new7,
      (select count(*)::int from reports where status <> 'closed') as reports,
      (select count(*)::int from events where type = 'view' and created_at > now() - interval '1 day') as views1,
      (select count(*)::int from events where type = 'contact_click' and created_at > now() - interval '1 day') as contacts1,
      (select count(*)::int from ad_events where type = 'impression' and created_at > now() - interval '1 day') as adimp1,
      (select count(*)::int from ad_events where type = 'click' and created_at > now() - interval '1 day') as adclk1
  `);
  const tiles: [string, number][] = [
    ["Tasdiqlangan profillar", r.approved], ["Moderatsiya navbati", r.pending], ["Yangi profillar, 7 kun", r.new7], ["Ochiq shikoyatlar", r.reports],
    ["Profil ko‘rishlari, 24 soat", r.views1], ["Kontakt bosishlar, 24 soat", r.contacts1], ["Reklama ko‘rishlari, 24 soat", r.adimp1], ["Reklama bosishlari, 24 soat", r.adclk1],
  ];
  return (
    <>
      <h1 style={{ fontSize: 36 }}>Dashboard</h1>
      <div className="tiles">{tiles.map(([l, v]) => <div className="tile" key={l}><b className="num">{v ?? 0}</b><span>{l}</span></div>)}</div>
    </>
  );
}
