import type { Metadata } from "next";
import Link from "next/link";
import { getProfessions } from "@/lib/queries";
import { budgetText, listOpenRequests } from "@/lib/requests";

export const metadata: Metadata = {
  title: "Bizneslar so‘rovlari",
  description: "Xorazmdagi bizneslar qidirayotgan mutaxassislar: SMM, mobilograf, montajor, fotograf va boshqalar. Mos so‘rovga javob bering.",
};
export const dynamic = "force-dynamic";

const ago = (d: Date | null) => {
  if (!d) return "";
  const h = Math.floor((Date.now() - new Date(d).getTime()) / 3_600_000);
  return h < 1 ? "hozirgina" : h < 24 ? `${h} soat oldin` : `${Math.floor(h / 24)} kun oldin`;
};

export default async function Requests({ searchParams }: { searchParams: Promise<{ kasb?: string }> }) {
  const { kasb } = await searchParams;
  const [profs, rows] = await Promise.all([getProfessions(), listOpenRequests(kasb)]);
  return (
    <div className="view" style={{ gap: 20 }}>
      <div className="sec-head" style={{ marginBottom: 0 }}>
        <div>
          <p className="eyebrow">Ochiq so‘rovlar</p>
          <h1 style={{ fontSize: "clamp(30px,4vw,44px)" }}>Bizneslar kimni qidiryapti</h1>
          <p className="muted">Mos so‘rovga “Qiziqaman” bosing — biznes egasi profilingizni Telegram’da oladi.</p>
        </div>
        <Link className="btn" href="/sorov">So‘rov qoldirish</Link>
      </div>
      <nav className="chips" aria-label="Yo‘nalish">
        <Link href="/sorovlar" aria-current={!kasb ? "true" : undefined}>Barchasi</Link>
        {profs.map((p) => <Link key={p.slug} href={`/sorovlar?kasb=${p.slug}`} aria-current={kasb === p.slug ? "true" : undefined}>{p.nameUz}</Link>)}
      </nav>
      {rows.length ? (
        <div className="req-list">
          {rows.map((r) => (
            <Link key={r.id} href={`/sorovlar/${r.id}`} className="box req-card">
              <p className="eyebrow">{r.profession ? `${r.profession} · ` : ""}{r.district}</p>
              <h3>{r.title}</h3>
              <p className="muted small">{budgetText(r)} · {ago(r.approvedAt)}{r.responses ? ` · ${r.responses} ta javob` : ""}</p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty">Hozircha ochiq so‘rov yo‘q. <Link className="link" href="/sorov">Birinchi bo‘lib so‘rov qoldiring</Link></div>
      )}
    </div>
  );
}
