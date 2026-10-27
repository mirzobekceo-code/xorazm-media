import Link from "next/link";
import { userRequests } from "@/lib/requests";

const LABEL: Record<string, [string, string]> = {
  pending: ["Tekshiruvda", "pending"], open: ["Ochiq", "approved"], closed: ["Yopilgan", "hidden"],
  rejected: ["Rad etilgan", "rejected"], expired: ["Muddati tugagan", "hidden"], adverto: ["Adverto jamoasi oldi", "approved"],
};

/** Kabinet: biznes egasi sifatida qoldirilgan so'rovlar. */
export default async function MyRequests({ userId, always }: { userId: number; always?: boolean }) {
  const rows = await userRequests(userId);
  if (!rows.length && !always) return null;
  return (
    <section className="box">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h3>Mening so‘rovlarim</h3>
        <Link className="btn sm" href="/sorov">+ Yangi so‘rov</Link>
      </div>
      {rows.length ? (
        <ul className="req-people" style={{ listStyle: "none", padding: 0, gap: 10 }}>
          {rows.map((r) => (
            <li key={r.id} className="row" style={{ gap: 8, justifyContent: "space-between" }}>
              <Link className="link" href={`/sorovlar/${r.id}`}>{r.title}</Link>
              <span className="row" style={{ gap: 8 }}>
                <span className="muted small">{r.responses} ta javob</span>
                <span className={`pill ${LABEL[r.status][1]}`}>{LABEL[r.status][0]}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : <p className="muted">Mutaxassis kerakmi? So‘rov qoldiring — mos mutaxassislar Telegram’da o‘zi yozadi.</p>}
    </section>
  );
}
