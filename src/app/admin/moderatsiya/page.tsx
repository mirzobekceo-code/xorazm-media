import Link from "next/link";
import { sql } from "drizzle-orm";
import { query } from "@/db";

export default async function Queue() {
  const rows = await query<{ id: number; full_name: string; status: string; updated_at: string; profession: string; pending_media: number }>(sql`
    select p.id, p.full_name, p.status, p.updated_at, pr.name_uz as profession,
      (select count(*)::int from media m where m.profile_id = p.id and m.moderation_status = 'pending') as pending_media
    from profiles p join professions pr on pr.id = p.profession_id
    where p.status = 'pending'
       or (p.status = 'approved' and exists (select 1 from media m where m.profile_id = p.id and m.moderation_status = 'pending'))
    order by p.updated_at asc
  `);
  return (
    <>
      <h1 style={{ fontSize: 36 }}>Moderatsiya navbati</h1>
      <p className="muted">Eng eskisi birinchi. Maqsad — 24 soat ichida javob.</p>
      {rows.length ? (
        <div className="tbl-wrap"><table className="tbl">
          <thead><tr><th>Profil</th><th>Yo‘nalish</th><th>Nima</th><th>Kutmoqda</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id}>
              <td><Link className="link" href={`/admin/moderatsiya/${r.id}`}>{r.full_name}</Link></td>
              <td>{r.profession}</td>
              <td>{r.status === "pending" ? "Profil" : `${r.pending_media} ta yangi fayl`}</td>
              <td className="num">{Math.round((Date.now() - new Date(r.updated_at).getTime()) / 3_600_000)} soat</td>
            </tr>
          ))}</tbody>
        </table></div>
      ) : <div className="empty">Navbat bo‘sh.</div>}
    </>
  );
}
