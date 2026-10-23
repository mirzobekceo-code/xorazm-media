import Link from "next/link";
import { and, desc, eq, ilike, type SQL } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { setProfileState } from "../actions";

const STATUSES = ["", "approved", "pending", "draft", "rejected", "hidden", "blocked"] as const;

export default async function Specialists({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const sp = await searchParams;
  const db = await getDb();
  const where: SQL[] = [];
  if (sp.q) where.push(ilike(s.profiles.fullName, `%${sp.q.replace(/[%_]/g, "")}%`));
  const st = STATUSES.find((x) => x && x === sp.status);
  if (st) where.push(eq(s.profiles.status, st));
  const rows = await db.select({
    id: s.profiles.id, slug: s.profiles.slug, name: s.profiles.fullName, status: s.profiles.status, featured: s.profiles.isFeatured,
    rank: s.profiles.rankScore, prof: s.professions.nameUz, created: s.profiles.createdAt,
  }).from(s.profiles).innerJoin(s.professions, eq(s.professions.id, s.profiles.professionId))
    .where(where.length ? and(...where) : undefined).orderBy(desc(s.profiles.createdAt)).limit(200);
  return (
    <>
      <h1 style={{ fontSize: 36 }}>Mutaxassislar</h1>
      <form className="row" method="get">
        <input className="inp" style={{ maxWidth: 260 }} name="q" placeholder="Ism bo‘yicha" defaultValue={sp.q ?? ""} />
        <select className="inp" style={{ width: "auto" }} name="status" defaultValue={sp.status ?? ""}>
          {STATUSES.map((x) => <option key={x} value={x}>{x || "Barcha holatlar"}</option>)}
        </select>
        <button className="btn ghost sm">Qidirish</button>
      </form>
      <div className="tbl-wrap"><table className="tbl">
        <thead><tr><th>Ism</th><th>Yo‘nalish</th><th>Holat</th><th>Reyting</th><th>Amallar</th></tr></thead>
        <tbody>{rows.map((r) => (
          <tr key={r.id}>
            <td><Link className="link" href={`/m/${r.slug}`}>{r.name}</Link>{r.featured && " · TOP"}</td>
            <td>{r.prof}</td>
            <td><span className={`pill ${r.status}`}>{r.status}</span></td>
            <td className="num">{r.rank.toFixed(0)}</td>
            <td><div className="row" style={{ gap: 4 }}>
              <Link className="copy" href={`/admin/moderatsiya/${r.id}`}>Ko‘rish</Link>
              {r.status === "approved" && <form action={setProfileState.bind(null, r.id, r.featured ? "unfeature" : "feature")}><button className="copy">{r.featured ? "TOPdan olish" : "TOPga"}</button></form>}
              {r.status === "blocked"
                ? <form action={setProfileState.bind(null, r.id, "unblock")}><button className="copy">Blokdan chiqarish</button></form>
                : <form action={setProfileState.bind(null, r.id, "block")}><button className="copy">Bloklash</button></form>}
            </div></td>
          </tr>
        ))}</tbody>
      </table></div>
    </>
  );
}
