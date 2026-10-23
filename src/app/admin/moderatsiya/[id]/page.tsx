import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { getProfile } from "@/lib/queries";
import { kfmt, money, prettyPhone, totalFollowers } from "@/lib/format";
import { REJECT_REASONS } from "@/lib/reference";
import { approveProfile, moderateMedia, rejectProfile } from "../../actions";

export default async function Review({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const db = await getDb();
  const [row] = Number.isInteger(id) ? await db.select({ slug: s.profiles.slug }).from(s.profiles).where(eq(s.profiles.id, id)) : [];
  if (!row) notFound();
  const p = (await getProfile(row.slug, { includeUnapproved: true }))!;
  const [contacts, media, history, owner] = await Promise.all([
    db.select().from(s.profileContacts).where(eq(s.profileContacts.profileId, id)),
    db.select().from(s.media).where(eq(s.media.profileId, id)).orderBy(asc(s.media.sortOrder)),
    db.select().from(s.moderationLog).where(eq(s.moderationLog.profileId, id)).orderBy(desc(s.moderationLog.createdAt)).limit(10),
    db.select({ phone: s.users.phone }).from(s.users).where(eq(s.users.id, p.userId)),
  ]);
  const c = contacts[0];
  const b = p.blogger;
  const shots = media.filter((m) => m.isStatScreenshot);
  const port = media.filter((m) => !m.isStatScreenshot);

  return (
    <>
      <div className="crumbs"><Link className="link" href="/admin/moderatsiya">Navbat</Link> / {p.fullName}</div>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1 style={{ fontSize: 36 }}>{p.fullName}</h1>
        <span className={`pill ${p.status}`}>{p.status}</span>
      </div>

      <div className="box">
        <h3>Ma’lumotlar</h3>
        <dl className="spec">
          <dt>Yo‘nalish</dt><dd>{p.profession.nameUz}{p.extraProfession ? ` + ${p.extraProfession.nameUz}` : ""}</dd>
          <dt>Tug‘ilgan yil · jins</dt><dd>{p.birthYear ?? "—"} · {p.gender === "f" ? "ayol" : "erkak"}</dd>
          <dt>Tumanlar</dt><dd>{p.districts.map((d) => d.nameUz).join(", ")}</dd>
          <dt>Bio</dt><dd>{p.bio || "—"}</dd>
          <dt>Narx · tajriba</dt><dd>{money(p.price)} so‘m / {p.profession.unit} · {p.experienceYears} yil</dd>
          {p.profession.fieldsSchema.map((f) => [<dt key={f.key + "t"}>{f.label}</dt>, <dd key={f.key + "d"}>{p.extra[f.key] || "—"}</dd>])}
          <dt>Video havolalar</dt><dd>{p.videoLinks.length ? p.videoLinks.map((u) => <div key={u}><a className="link" href={u} target="_blank" rel="noopener nofollow">{u}</a></div>) : "—"}</dd>
          <dt>Tasdiqlangan raqam</dt><dd>{owner[0] ? prettyPhone(owner[0].phone) : "—"}</dd>
          <dt>Kontaktlar</dt><dd>{c ? [c.phone && prettyPhone(c.phone), c.telegram, c.instagram].filter(Boolean).join(" · ") : "—"}</dd>
          {p.admins.length > 0 && [<dt key="at">Adminlar</dt>, <dd key="ad">{p.admins.map((a) => `${a.name} (${a.role}) ${prettyPhone(a.phone)} ${a.telegram ?? ""}`).join("; ")}</dd>]}
        </dl>
      </div>

      {b && (
        <div className="box">
          <h3>Bloger statistikasi — skrinshot bilan solishtiring</h3>
          <dl className="spec">
            <dt>Obunachilar</dt><dd>{Object.entries(b.followers).map(([k, v]) => `${k}: ${kfmt(v)}`).join(" · ")} (jami {kfmt(totalFollowers(b.followers))})</dd>
            <dt>ER · reels · stories</dt><dd>{b.er ?? "—"}% · {b.avgViews ?? "—"} · {b.storiesReach ?? "—"}</dd>
            <dt>Auditoriya</dt><dd>Ayollar {b.audience?.gender.f}% · {b.audience?.ages.map(([g, v]) => `${g}: ${v}%`).join(", ")}</dd>
            <dt>Shaharlar</dt><dd>{b.audience?.cities.map(([g, v]) => `${g}: ${v}%`).join(", ")}</dd>
            <dt>Holat</dt><dd>{b.verifiedAt ? `Tasdiqlangan ${new Date(b.verifiedAt).toLocaleDateString("uz-UZ")}` : "Tasdiqlanmagan"}</dd>
          </dl>
          <div className="thumbs">{shots.map((m) => <a key={m.id} className="thumb" href={m.url} target="_blank" rel="noopener"><img src={m.thumbUrl ?? m.url} alt="Skrinshot" /></a>)}</div>
          {!shots.length && <p className="err">Skrinshot yuklanmagan.</p>}
        </div>
      )}

      <div className="box">
        <h3>Rasm va videolar</h3>
        <div className="thumbs">
          {port.map((m) => (
            <div key={m.id} className="stack" style={{ gap: 6 }}>
              <a className="thumb" href={m.url} target="_blank" rel="noopener">
                {m.type === "image" ? <img src={m.thumbUrl ?? m.url} alt="" /> : <video src={m.url} muted />}
                <span className="st">{m.moderationStatus}</span>
              </a>
              {m.moderationStatus === "pending" && (
                <div className="row" style={{ gap: 4 }}>
                  <form action={moderateMedia.bind(null, m.id, true, undefined)}><button className="copy">✓</button></form>
                  <form action={moderateMedia.bind(null, m.id, false, "Nomaqbul yoki sifatsiz")}><button className="copy">✕</button></form>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <form className="box" action={approveProfile.bind(null, id)}>
          <h3>Tasdiqlash</h3>
          <p className="muted small">Kutilayotgan barcha fayllar ham tasdiqlanadi.</p>
          {b && <div className="checks"><label><input type="checkbox" name="verifyStats" defaultChecked={shots.length > 0} /> Statistika skrinshot bilan mos</label></div>}
          <div><button className="btn">Tasdiqlash</button></div>
        </form>
        <form className="box" action={rejectProfile.bind(null, id)}>
          <h3>Rad etish</h3>
          <div className="checks" style={{ flexDirection: "column", alignItems: "flex-start" }}>
            {REJECT_REASONS.map((r) => <label key={r}><input type="checkbox" name="reason" value={r} /> {r}</label>)}
          </div>
          <textarea className="inp" name="note" rows={2} placeholder="Izoh (mutaxassisga ko‘rinadi)" />
          <div><button className="btn danger">Rad etish</button></div>
        </form>
      </div>

      {history.length > 0 && (
        <div className="box"><h3>Tarix</h3>
          {history.map((h) => <p key={h.id} className="small"><span className="muted num">{new Date(h.createdAt).toLocaleString("uz-UZ")}</span> — {h.action}{h.reason ? `: ${h.reason}` : ""}</p>)}
        </div>
      )}
    </>
  );
}
