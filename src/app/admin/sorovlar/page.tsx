import Link from "next/link";
import { asc, desc, eq } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { prettyPhone } from "@/lib/format";
import { budgetText, REQUEST_REJECT_REASONS } from "@/lib/requests";
import { approveRequestAdmin, advertoRequestAdmin, rejectRequestAdmin } from "../actions";

export const dynamic = "force-dynamic";

const STATUS: Record<string, string> = {
  pending: "Tekshiruvda", open: "Mutaxassislarga yuborilgan", adverto: "Adverto oldi", closed: "Yopilgan", rejected: "Rad etilgan", expired: "Muddati tugagan",
};

export default async function AdminRequests() {
  const db = await getDb();
  const [rows, profs] = await Promise.all([
    db.select({ r: s.requests, dist: s.districts.nameUz }).from(s.requests)
      .leftJoin(s.districts, eq(s.districts.id, s.requests.districtId))
      .orderBy(desc(s.requests.createdAt)).limit(200),
    db.select({ id: s.professions.id, nameUz: s.professions.nameUz }).from(s.professions).where(eq(s.professions.isActive, true)).orderBy(asc(s.professions.sortOrder)),
  ]);
  const names = (ids: number[]) => ids.map((id) => profs.find((p) => p.id === id)?.nameUz).filter(Boolean).join(", ");
  return (
    <>
      <h1 style={{ fontSize: 36 }}>So‘rovlar</h1>
      <p className="muted">Yangi so‘rovlar Telegram’ga ham keladi: “Adverto oladi” yoki kasblarni belgilab mutaxassislarga yuborish mumkin.</p>
      {rows.length ? (
        <div className="tbl-wrap"><table className="tbl">
          <thead><tr><th>Sana</th><th>So‘rov</th><th>Kontakt</th><th>Holat</th><th /></tr></thead>
          <tbody>{rows.map(({ r, dist }) => (
            <tr key={r.id}>
              <td className="num">{new Date(r.createdAt).toLocaleDateString("uz-UZ")}</td>
              <td style={{ maxWidth: 420 }}>
                <Link className="link" href={`/sorovlar/${r.id}`}><b>#{r.id}</b></Link>
                <p className="small" style={{ whiteSpace: "pre-wrap" }}>{r.description.slice(0, 400)}</p>
                <p className="muted small">{r.remote ? "Masofaviy" : dist ?? "Butun Xorazm"} · {budgetText(r)}{r.professionIds.length ? ` · ${names(r.professionIds)}` : ""}</p>
              </td>
              <td className="small"><a className="link" href={`tel:${r.contactPhone}`}>{prettyPhone(r.contactPhone)}</a>{r.contactTelegram && <><br />{r.contactTelegram}</>}{r.businessName && <><br />{r.businessName}</>}</td>
              <td>{STATUS[r.status]}{r.status === "open" && <p className="muted small">{r.notifiedCount} ta mutaxassisga</p>}{r.rejectReason && <p className="muted small">{r.rejectReason}</p>}</td>
              <td>{r.status === "pending" && (
                <div className="stack" style={{ gap: 8, minWidth: 220 }}>
                  <form action={advertoRequestAdmin.bind(null, r.id)}><button className="copy">🏢 Adverto oladi</button></form>
                  <form action={approveRequestAdmin.bind(null, r.id)} className="stack" style={{ gap: 4 }}>
                    <details><summary className="small">👥 Mutaxassislarga yuborish</summary>
                      <div className="stack" style={{ gap: 2, marginTop: 6 }}>
                        {profs.map((p) => <label key={p.id} className="small"><input type="checkbox" name="prof" value={p.id} defaultChecked={r.professionIds.includes(p.id)} /> {p.nameUz}</label>)}
                        <button className="copy">📤 Yuborish</button>
                      </div>
                    </details>
                  </form>
                  <form action={rejectRequestAdmin.bind(null, r.id)} className="row" style={{ gap: 4 }}>
                    <select className="inp" name="reason" style={{ padding: "4px 8px", fontSize: 13, height: 32 }}>
                      {REQUEST_REJECT_REASONS.map((x) => <option key={x}>{x}</option>)}
                    </select>
                    <button className="copy">Rad etish</button>
                  </form>
                </div>
              )}</td>
            </tr>
          ))}</tbody>
        </table></div>
      ) : <div className="empty">So‘rov yo‘q.</div>}
    </>
  );
}
