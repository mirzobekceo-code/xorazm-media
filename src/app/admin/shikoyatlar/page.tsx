import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { setReportStatus } from "../actions";

export default async function Reports() {
  const db = await getDb();
  const rows = await db.select({ r: s.reports, name: s.profiles.fullName, slug: s.profiles.slug, pid: s.profiles.id })
    .from(s.reports).innerJoin(s.profiles, eq(s.profiles.id, s.reports.profileId)).orderBy(desc(s.reports.createdAt)).limit(200);
  return (
    <>
      <h1 style={{ fontSize: 36 }}>Shikoyatlar</h1>
      {rows.length ? (
        <div className="tbl-wrap"><table className="tbl">
          <thead><tr><th>Sana</th><th>Profil</th><th>Sabab</th><th>Holat</th><th /></tr></thead>
          <tbody>{rows.map(({ r, name, slug, pid }) => (
            <tr key={r.id}>
              <td className="num">{new Date(r.createdAt).toLocaleDateString("uz-UZ")}</td>
              <td><Link className="link" href={`/m/${slug}`}>{name}</Link></td>
              <td><b>{r.reason}</b>{r.text && <p className="muted small">{r.text}</p>}</td>
              <td>{r.status}</td>
              <td><div className="row" style={{ gap: 4 }}>
                <Link className="copy" href={`/admin/moderatsiya/${pid}`}>Profil</Link>
                {r.status === "new" && <form action={setReportStatus.bind(null, r.id, "reviewing")}><button className="copy">Ko‘rilmoqda</button></form>}
                {r.status !== "closed" && <form action={setReportStatus.bind(null, r.id, "closed")}><button className="copy">Yopish</button></form>}
              </div></td>
            </tr>
          ))}</tbody>
        </table></div>
      ) : <div className="empty">Shikoyat yo‘q.</div>}
    </>
  );
}
