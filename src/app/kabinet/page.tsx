import Link from "next/link";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { getOwnProfile } from "@/lib/profiles";
import { getProfessions, professionPlace, profileStats, searchProfiles } from "@/lib/queries";
import { getDb, schema as s } from "@/db";
import { deleteAccountAction, logoutAction } from "@/app/actions";
import { prettyPhone } from "@/lib/format";
import { portfolioRule } from "@/lib/portfolio-rules";
import ProfileCard from "@/components/ProfileCard";
import CabinetToggles from "./CabinetToggles";
import DeleteAccount from "./DeleteAccount";
import TelegramLink from "./TelegramLink";
import { botEnabled } from "@/lib/telegram";

export const metadata = { title: "Kabinet", robots: { index: false } };
export const dynamic = "force-dynamic";

const STATUS: Record<string, [string, string]> = {
  draft: ["Qoralama", "Profil hali tekshiruvga yuborilmagan."],
  pending: ["Tekshiruvda", "Moderator 24 soat ichida tekshiradi. Natija Telegram’ga keladi."],
  approved: ["Tasdiqlangan", "Profilingiz katalogda ✓ belgisi bilan ko‘rinadi."],
  rejected: ["Rad etilgan", "Sababini tuzatib, qayta yuboring."],
  hidden: ["Yashirilgan", "Profil katalogda ko‘rinmaydi. Istalgan payt qayta ochishingiz mumkin."],
  blocked: ["Bloklangan", "Qoidalar buzilgani uchun bloklangan. Admin bilan bog‘laning."],
};

/** Holat yo'lagi: qoralama → tekshiruv → katalogda. */
const TRACK = ["Qoralama", "Tekshiruvda", "Katalogda"];
const trackIndex = (st: string) => (st === "pending" ? 1 : st === "approved" || st === "hidden" ? 2 : 0);

type Item = { label: string; detail?: string; done: boolean; required: boolean; href: string; gain?: string };

export default async function Cabinet({ searchParams }: { searchParams: Promise<{ yuborildi?: string }> }) {
  const { yuborildi } = await searchParams;
  const user = await requireUser();
  const p = await getOwnProfile(user.id);
  if (!p) {
    return (
      <div className="form" style={{ maxWidth: 560 }}>
        <h2>Profil hali yo‘q</h2>
        <p className="muted">{prettyPhone(user.phone)} raqami bilan kirdingiz. Mutaxassis profilini oching — bepul.</p>
        <div className="row"><Link className="btn" href="/qoshilish">Profil ochish</Link><form action={logoutAction}><button className="btn ghost">Chiqish</button></form></div>
      </div>
    );
  }

  const db = await getDb();
  const [profs, media, [contact], preview] = await Promise.all([
    getProfessions(),
    db.select({ type: s.media.type, stat: s.media.isStatScreenshot, cover: s.media.isCover, mod: s.media.moderationStatus })
      .from(s.media).where(eq(s.media.profileId, p.id)),
    db.select({ telegram: s.profileContacts.telegram }).from(s.profileContacts).where(eq(s.profileContacts.profileId, p.id)),
    searchProfiles({ onlyId: p.id }),
  ]);
  const prof = profs.find((x) => x.id === p.professionId)!;
  const rule = portfolioRule(prof.slug);
  const live = media.filter((m) => m.mod !== "rejected");
  const images = live.filter((m) => m.type === "image" && !m.stat).length;
  const proofs = live.filter((m) => m.stat).length;
  const rejectedMedia = media.filter((m) => m.mod === "rejected").length;
  const pendingMedia = media.filter((m) => m.mod === "pending").length;
  const links = p.videoLinks.length;
  const isBlogger = prof.slug === "bloger";
  const inCatalog = p.status === "approved" || p.status === "hidden";

  const edit = (step: number) => `/kabinet/tahrir?qadam=${step}`;
  const items: Item[] = [
    { label: "Rasmlar", detail: `${images} / ${rule.minImages}`, done: images >= rule.minImages, required: true, href: edit(4), gain: images < 5 ? "har rasm +2 reyting" : undefined },
    ...(rule.minLinks > 0 ? [{ label: rule.linkLabel, detail: `${links} / ${rule.minLinks}`, done: links >= rule.minLinks, required: true, href: edit(2) }] : []),
    ...(rule.proof?.required ? [{ label: rule.proof.label, detail: proofs ? `${proofs} ta` : "yo‘q", done: proofs > 0, required: true, href: edit(4) }] : []),
    { label: "Muqova rasmi tanlangan", done: live.some((m) => m.cover), required: false, href: edit(4), detail: "★ bilan tanlanadi" },
    { label: "O‘zingiz haqingizda", detail: p.bio.length ? `${p.bio.length} belgi` : "bo‘sh", done: p.bio.length >= 40, required: false, href: edit(1), gain: "+5 reyting" },
    { label: "Narx ko‘rsatilgan", done: p.price != null, required: false, href: edit(2), gain: "+5 reyting" },
    ...(rule.minLinks === 0 ? [{ label: "Video yoki ish havolasi", detail: `${links} ta`, done: links > 0, required: false, href: edit(2), gain: "+5 reyting" }] : []),
    ...(!isBlogger ? [{ label: "Telegram kontakti", done: !!contact?.telegram, required: false, href: edit(3), detail: "mijozlar ko‘pincha shu yerga yozadi" }] : []),
    ...(botEnabled() ? [{ label: "Telegram bot ulangan", done: !!user.telegramId, required: false, href: "#telegram", detail: "tasdiqlash natijasi va statistika" }] : []),
  ];
  const done = items.filter((i) => i.done).length;
  const pct = Math.round((done / items.length) * 100);
  const missingRequired = items.filter((i) => i.required && !i.done);

  const [stats30, place] = inCatalog
    ? await Promise.all([profileStats(p.id, 30), professionPlace(p.professionId, p.rankScore)])
    : [null, null];
  const [label, hint] = STATUS[p.status];
  const t = trackIndex(p.status);

  return (
    <div className="view cab" style={{ gap: 24 }}>
      <div className="sec-head" style={{ marginBottom: 0 }}>
        <div>
          <p className="eyebrow">Kabinet · {prettyPhone(user.phone)}</p>
          <h1 style={{ fontSize: "clamp(30px,4vw,44px)" }}>{p.fullName}</h1>
          <p className="muted">{prof.nameUz}</p>
        </div>
        <div className="row">
          <Link className="btn ghost" href={`/m/${p.slug}`}>Profilni ko‘rish</Link>
          <Link className="btn" href="/kabinet/tahrir">Tahrirlash</Link>
        </div>
      </div>

      {yuborildi && p.status === "pending" && (
        <div className="notice"><b>Profil tekshiruvga yuborildi.</b> Moderator 24 soat ichida tekshiradi; tasdiqlangach profilingiz katalogda ✓ belgisi bilan chiqadi.</div>
      )}

      <section className="box">
        <div className="track" aria-label="Profil holati">
          {TRACK.map((x, i) => (
            <div key={x} className={i < t ? "done" : i === t ? "on" : ""}><i>{i < t || (i === 2 && t === 2) ? "✓" : i + 1}</i><span>{x}</span></div>
          ))}
        </div>
        <div className="row"><span className={`pill ${p.status}`}>{label}</span><span className="muted">{hint}</span></div>
        {p.status === "rejected" && p.rejectReason && <p className="err">Sabab: {p.rejectReason}</p>}
        {pendingMedia > 0 && inCatalog && <p className="muted small">{pendingMedia} ta yangi fayl tekshiruvda — tasdiqlangach profilda chiqadi.</p>}
        {rejectedMedia > 0 && <p className="muted small">{rejectedMedia} ta fayl moderator tomonidan rad etilgan — o‘rniga boshqasini yuklang.</p>}
        {(p.status === "draft" || p.status === "rejected") && (
          missingRequired.length
            ? <p className="muted small">Yuborish uchun: {missingRequired.map((i) => `${i.label.toLowerCase()} (${i.detail})`).join(", ")}.</p>
            : null
        )}
        {(p.status === "draft" || p.status === "rejected") && (
          <div><Link className="btn sm" href={missingRequired[0]?.href ?? edit(4)}>{missingRequired.length ? "To‘ldirish" : "Tekshiruvga yuborish"}</Link></div>
        )}
      </section>

      {inCatalog && stats30 && place && (
        <div className="tiles">
          <div className="tile"><b className="num">{stats30.views}</b><span>profil ko‘rishlari, 30 kun</span></div>
          <div className="tile"><b className="num">{stats30.contacts}</b><span>kontakt bosishlar, 30 kun</span></div>
          <div className="tile"><b className="num">{place.place}<small> / {place.total}</small></b><span>{prof.nameUz} orasida o‘rningiz</span></div>
          <div className="tile"><b>{p.isAvailable ? "Bo‘sh" : "Band"}</b><span>joriy holat</span></div>
        </div>
      )}

      <div className="cab-grid">
        <section className="box">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <h3>{p.status === "draft" || p.status === "rejected" ? "Tekshiruvga tayyorlik" : "Profil to‘liqligi"}</h3>
            <b className="num">{pct}%</b>
          </div>
          <div className="meter" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${pct}%` }} /></div>
          <ul className="checklist">
            {items.map((i) => (
              <li key={i.label} className={i.done ? "ok" : i.required ? "need" : ""}>
                <span className="mark-i" aria-hidden="true">{i.done ? "✓" : i.required ? "!" : "+"}</span>
                <div>
                  <b>{i.label}</b>{i.detail && <span className="muted small"> · {i.detail}</span>}
                  {!i.done && <span className="small tag-req">{i.required ? "majburiy" : i.gain ?? "tavsiya"}</span>}
                </div>
                {!i.done && <Link className="link small" href={i.href}>{i.href.startsWith("#") ? "Ulash" : "Tuzatish"}</Link>}
              </li>
            ))}
          </ul>
          <p className="muted small">Katalogdagi o‘rin to‘liqlik, rasmlar, ko‘rishlar va kontakt bosishlarga qarab har kuni yangilanadi.</p>
        </section>

        <section className="stack" style={{ gap: 10 }}>
          <h3>Katalogda shunday ko‘rinasiz</h3>
          {preview.items[0] ? <div className="cab-card"><ProfileCard p={preview.items[0]} verified={inCatalog} /></div> : null}
          <p className="muted small">Kartochkada faqat moderator tasdiqlagan rasmlar chiqadi.</p>
        </section>
      </div>

      <CabinetToggles isAvailable={p.isAvailable} hidden={p.status === "hidden"} canHide={inCatalog} />

      <section className="box" id="telegram">
        <h3>Telegram bildirishnomalari</h3>
        {user.telegramId
          ? <p className="ok">✓ Telegram ulangan. Tasdiqlash natijasi va haftalik statistika botga keladi.</p>
          : botEnabled()
            ? <><p className="muted small">Tasdiqlash natijasi va haftalik statistikani Telegram orqali oling.</p><TelegramLink /></>
            : <p className="muted small">Telegram bot tez orada ulanadi.</p>}
      </section>

      <div className="row" style={{ justifyContent: "space-between" }}>
        <form action={logoutAction}><button className="btn ghost">Chiqish</button></form>
        <DeleteAccount action={deleteAccountAction} />
      </div>
    </div>
  );
}
