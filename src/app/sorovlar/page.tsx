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

/** Ochiq so'rov bo'lmaganda ko'rsatiladigan namunalar (sahifada "Namuna" deb belgilangan). */
const SAMPLES = [
  { kasb: "mobilograf", profession: "Mobilograf", district: "Urganch shahri", title: "O‘quv markazi uchun oyiga 8 ta Reels", budget: "100$ – 300$" },
  { kasb: "smm", profession: "SMM manager", district: "Xiva shahri", title: "Mehmonxona Instagram sahifasini yuritish va target", budget: "300$ dan yuqori" },
  { kasb: "brand-face", profession: "Brand Face", district: "Urganch shahri", title: "Kiyim brendi reklamasi uchun brand face (ayol, 20–28 yosh)", budget: "100$" },
];

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
        <>
          <div className="notice">Hozircha ochiq so‘rov yo‘q. Quyida — so‘rovlar qanday ko‘rinishiga <b>namuna</b>. Haqiqiy so‘rov tushganda mos mutaxassislarga Telegram orqali ham xabar boradi.</div>
          {/* Namuna kartochkalar: haqiqiy buyurtma emas, aniq belgilangan va hech qayerga olib bormaydi */}
          <div className="req-list">
            {(SAMPLES.some((x) => x.kasb === kasb) ? SAMPLES.filter((x) => x.kasb === kasb) : SAMPLES).map((x) => (
              <div key={x.title} className="box req-card sample" aria-label={`Namuna: ${x.title}`}>
                <span className="sample-tag">Namuna</span>
                <p className="eyebrow">{x.profession} · {x.district}</p>
                <h3>{x.title}</h3>
                <p className="muted small">{x.budget}</p>
              </div>
            ))}
          </div>
          <div className="row">
            <Link className="btn" href="/qoshilish">Mutaxassis sifatida qo‘shilish</Link>
            <Link className="btn ghost" href="/sorov">Biznes sifatida so‘rov qoldirish</Link>
          </div>
        </>
      )}
    </div>
  );
}
