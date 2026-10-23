import { inArray } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { requireStaff } from "@/lib/auth";
import { prettyPhone } from "@/lib/format";
import { setStaffRole } from "../actions";

export default async function Staff() {
  await requireStaff("admin");
  const db = await getDb();
  const staff = await db.select().from(s.users).where(inArray(s.users.role, ["moderator", "admin"]));
  return (
    <>
      <h1 style={{ fontSize: 36 }}>Xodimlar</h1>
      <div className="tbl-wrap"><table className="tbl">
        <thead><tr><th>Telefon</th><th>Rol</th><th>Oxirgi kirish</th></tr></thead>
        <tbody>{staff.map((u) => (
          <tr key={u.id}><td className="num">{prettyPhone(u.phone)}</td><td>{u.role}</td><td className="num">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString("uz-UZ") : "—"}</td></tr>
        ))}</tbody>
      </table></div>
      <form className="box" action={setStaffRole}>
        <h3>Rol berish</h3>
        <div className="fields">
          <div className="field"><label htmlFor="st-phone">Telefon</label><input className="inp" id="st-phone" name="phone" type="tel" required placeholder="+998 90 123 45 67" /></div>
          <div className="field"><label htmlFor="st-role">Rol</label><select className="inp" id="st-role" name="role"><option value="moderator">Moderator</option><option value="admin">Admin</option><option value="specialist">Rolni olib tashlash</option></select></div>
        </div>
        <div><button className="btn">Saqlash</button></div>
      </form>
    </>
  );
}
