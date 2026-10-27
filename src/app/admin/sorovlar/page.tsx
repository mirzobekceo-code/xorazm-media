import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { prettyPhone } from "@/lib/format";
import { budgetText, REQUEST_REJECT_REASONS } from "@/lib/requests";
import { approveRequestAdmin, rejectRequestAdmin } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminRequests() {
  const db = await getDb();
  const rows = await db.select({ r: s.requests, prof: s.professions.nameUz, dist: s.districts.nameUz })
    .from(s.requests).innerJoin(s.professions, eq(s.professions.id, s.requests.professionId))
    .leftJoin(s.districts, eq(s.districts.id, s.requests.districtId))
    .orderBy(desc(s.requests.createdAt)).limit(200);
  return (
    <>
      <h1 style={{ fontSize: 36 }}>So‘rovlar</h1>
      <p className="muted">Yangi so‘rovlar Telegram’ga ham keladi — u yerdan tugma bilan tasdiqlash mumkin.</p>
      {rows.length ? (
        <div className="tbl-wrap"><table className="tbl">
          <thead><tr><th>Sana</th><th>So‘rov</th><th>Kontakt</th><th>Holat</th><th /></tr></thead>
          <tbody>{rows.map(({ r, prof, dist }) => (
            <tr key={r.id}>
              <td className="num">{new Date(r.createdAt).toLocaleDateString("uz-UZ")}</td>
              <td>
                <Link className="link" href={`/sorovlar/${r.id}`}><b>{r.title}</b></Link>
                <p className="muted small">{prof} · {dist ?? "Butun Xorazm"} · {budgetText(r.budget)} · {r.deadline}</p>
                {r.description && <p className="small">{r.description.slice(0, 300)}</p>}
              </td>
              <td className="small">{prettyPhone(r.contactPhone)}{r.contactTelegram && <><br />{r.contactTelegram}</>}{r.businessName && <><br />{r.businessName}</>}</td>
              <td>{r.status}{r.status !== "pending" && r.status !== "rejected" && <p className="muted small">{r.notifiedCount} ga yuborilgan</p>}{r.rejectReason && <p className="muted small">{r.rejectReason}</p>}</td>
              <td>{r.status === "pending" && (
                <div className="stack" style={{ gap: 6 }}>
                  <form action={approveRequestAdmin.bind(null, r.id)}><button className="copy">✓ E’lon qilish</button></form>
                  <form action={rejectRequestAdmin.bind(null, r.id)} className="row" style={{ gap: 4 }}>
                    <select className="inp" name="reason" style={{ padding: "4px 8px", fontSize: 13 }}>
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
