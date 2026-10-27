import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { getUser } from "@/lib/auth";
import { getOwnProfile } from "@/lib/profiles";
import { prettyPhone } from "@/lib/format";
import { budgetText, getRequest, requestResponders } from "@/lib/requests";
import { closeRequestAction } from "@/app/actions";
import RespondButton from "./RespondButton";

export const dynamic = "force-dynamic";

const STATUS: Record<string, [string, string]> = {
  pending: ["Tekshiruvda", "pending"], open: ["Ochiq", "approved"], closed: ["Yopilgan", "hidden"],
  rejected: ["Rad etilgan", "rejected"], expired: ["Muddati tugagan", "hidden"],
};

type P = { params: Promise<{ id: string }>; searchParams: Promise<{ yangi?: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const r = await getRequest(Number((await params).id) || 0);
  if (!r || r.status === "pending" || r.status === "rejected") return { title: "So‘rov", robots: { index: false } };
  return { title: `${r.title} — ${r.profession}`, description: `${r.profession} kerak · ${r.district} · ${budgetText(r.budget)}`, robots: { index: r.status === "open" } };
}

export default async function RequestPage({ params, searchParams }: P) {
  const [{ id: raw }, { yangi }] = await Promise.all([params, searchParams]);
  const r = await getRequest(Number(raw) || 0);
  if (!r) notFound();
  const user = await getUser();
  const owner = user?.id === r.userId;
  const staff = user?.role === "admin" || user?.role === "moderator";
  if ((r.status === "pending" || r.status === "rejected") && !owner && !staff) notFound();
  const profile = user && !owner ? await getOwnProfile(user.id) : null;
  const specialist = profile?.status === "approved";
  const seeContacts = owner || staff || specialist;

  const db = await getDb();
  const responders = owner || staff ? await requestResponders(r.id) : [];
  const people = responders.length ? await db.select({ id: s.profiles.id, name: s.profiles.fullName, slug: s.profiles.slug, prof: s.professions.nameUz })
    .from(s.profiles).innerJoin(s.professions, eq(s.professions.id, s.profiles.professionId))
    .where(inArray(s.profiles.id, responders.map((x) => x.profileId))) : [];
  const responded = specialist ? (await db.select({ id: s.requestResponses.id }).from(s.requestResponses)
    .where(and(eq(s.requestResponses.requestId, r.id), eq(s.requestResponses.profileId, profile!.id))).limit(1)).length > 0 : false;
  const [label, cls] = STATUS[r.status];
  const tgHandle = r.contactTelegram?.replace(/^@/, "");

  return (
    <div className="view" style={{ gap: 20, maxWidth: 760 }}>
      <p className="small"><Link className="link" href="/sorovlar">← Barcha so‘rovlar</Link></p>
      {yangi && owner && (
        <div className="notice"><b>So‘rov yuborildi.</b> Moderator tekshirgach, mos mutaxassislarga Telegram orqali boradi. Natija va javoblar botga keladi.</div>
      )}
      {owner && r.status === "rejected" && <div className="notice">Rad etildi: {r.rejectReason}. <Link className="link" href="/sorov">Yangi so‘rov yuborish</Link></div>}
      <div className="box">
        <p className="eyebrow">{r.profession} · {r.district}</p>
        <h1 style={{ fontSize: "clamp(26px,3.4vw,36px)" }}>{r.title}</h1>
        <div className="row" style={{ gap: 8 }}><span className={`pill ${cls}`}>{label}</span>{r.businessName && <span className="muted small">{r.businessName}</span>}</div>
        <dl className="req-dl">
          <div><dt>Budjet</dt><dd>{budgetText(r.budget)}</dd></div>
          <div><dt>Muddat</dt><dd>{r.deadline}</dd></div>
          {r.expiresAt && r.status === "open" && <div><dt>Ochiq</dt><dd>{new Date(r.expiresAt).toLocaleDateString("uz-UZ")} gacha</dd></div>}
        </dl>
        {r.description && <p style={{ whiteSpace: "pre-wrap" }}>{r.description}</p>}
      </div>

      {seeContacts ? (
        <div className="box">
          <h3>Kontaktlar</h3>
          <div className="row">
            <a className="btn ghost" href={`tel:${r.contactPhone}`}>📞 {prettyPhone(r.contactPhone)}</a>
            {tgHandle && <a className="btn ghost" href={`https://t.me/${tgHandle}`} target="_blank" rel="noopener">Telegram: @{tgHandle}</a>}
          </div>
        </div>
      ) : r.status === "open" && (
        <div className="notice owner">
          Kontaktlar va “Qiziqaman” tugmasi faqat tasdiqlangan mutaxassislarga. {user ? (profile ? "Profilingiz tasdiqlangach ochiladi." : "") : <><Link className="link" href={`/kirish?next=/sorovlar/${r.id}`}>Kiring</Link> yoki </>}
          {!profile && <Link className="link" href="/qoshilish">portfolio qo‘shing — bepul</Link>}
        </div>
      )}

      {specialist && r.status === "open" && <RespondButton id={r.id} done={responded} />}

      {(owner || staff) && (
        <div className="box">
          <h3>Qiziqqan mutaxassislar · {people.length}</h3>
          {r.status !== "pending" && <p className="muted small">So‘rov {r.notifiedCount} ta mos mutaxassisga Telegram’da yuborilgan.</p>}
          {people.length ? (
            <ul className="req-people">
              {people.map((p) => <li key={p.id}><Link className="link" href={`/m/${p.slug}`}><b>{p.name}</b></Link> <span className="muted">· {p.prof}</span></li>)}
            </ul>
          ) : <p className="muted">Hozircha javob yo‘q. Javob kelsa, Telegram’ga xabar keladi.</p>}
          {owner && (r.status === "open" || r.status === "pending") && (
            <form action={closeRequestAction.bind(null, r.id)}><button className="btn ghost sm">Mutaxassis topildi — so‘rovni yopish</button></form>
          )}
        </div>
      )}
    </div>
  );
}
