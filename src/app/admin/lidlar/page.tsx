import Link from "next/link";
import { prettyPhone } from "@/lib/format";
import { recentLeads } from "@/lib/leads";
import { sendLeadReportNow } from "../actions";

export const dynamic = "force-dynamic";

const KIND: Record<string, string> = { contact: "Kontakt ochdi", order: "Buyurtma" };

export default async function Leads({ searchParams }: { searchParams: Promise<{ yuborildi?: string }> }) {
  const [{ yuborildi }, rows] = await Promise.all([searchParams, recentLeads()]);
  return (
    <>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1 style={{ fontSize: 36 }}>Lidlar</h1>
        <form action={sendLeadReportNow}><button className="btn ghost sm">Haftalik hisobotni hozir yuborish</button></form>
      </div>
      {yuborildi && <div className="notice">{yuborildi}</div>}
      <p className="muted">Mutaxassis kontaktini Telegram orqali ochganlar va portfolio sahifasidan buyurtma qoldirganlar. Har shanba 20:00 da Google Sheets’ga va Telegram’ingizga hisobot boradi.</p>
      {rows.length ? (
        <div className="tbl-wrap"><table className="tbl">
          <thead><tr><th>Sana</th><th>Turi</th><th>Kim</th><th>Xizmat · mutaxassis</th><th>Manba</th></tr></thead>
          <tbody>{rows.map(({ l, specialist, slug, profession, tgUser }) => {
            const u = l.telegramUsername ?? tgUser;
            return (
              <tr key={l.id}>
                <td className="num">{new Date(l.createdAt).toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent", dateStyle: "short", timeStyle: "short" })}</td>
                <td>{KIND[l.kind]}</td>
                <td className="small">
                  {l.name && <><b>{l.name}</b><br /></>}
                  {l.phone && <a className="link" href={`tel:${l.phone}`}>{prettyPhone(l.phone)}</a>}
                  {u && <><br /><a className="link" href={`https://t.me/${u}`} target="_blank" rel="noopener">@{u}</a></>}
                  {l.message && <p className="muted">{l.message}</p>}
                </td>
                <td className="small">{profession} · <Link className="link" href={`/m/${slug}`}>{specialist}</Link></td>
                <td className="small">{l.source ?? "—"}</td>
              </tr>
            );
          })}</tbody>
        </table></div>
      ) : <div className="empty">Hali lid yo‘q.</div>}
    </>
  );
}
