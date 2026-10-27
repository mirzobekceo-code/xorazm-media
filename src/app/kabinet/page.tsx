import Link from "next/link";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { getOwnProfile } from "@/lib/profiles";
import { getProfessions, professionPlace, profileInsights, profileStats, searchProfiles } from "@/lib/queries";
import { SITE } from "@/lib/site";
import ShareBox from "./ShareBox";
import InsightsChart from "./InsightsChart";
import { getDb, schema as s } from "@/db";
import { deleteAccountAction, logoutAction } from "@/app/actions";
import { prettyPhone } from "@/lib/format";
import { countPortfolio, portfolioRule } from "@/lib/portfolio-rules";
import ProfileCard from "@/components/ProfileCard";
import CabinetToggles from "./CabinetToggles";
import DeleteAccount from "./DeleteAccount";
import TelegramLink from "./TelegramLink";
import { botEnabled, botUsername } from "@/lib/telegram";

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

const SOURCE_LABEL: Record<string, string> = {
  catalog: "Sayt katalogi", ig: "Instagram", qr: "QR-kod", tg: "Telegram", wa: "WhatsApp", link: "Ulashilgan havola", direct: "To‘g‘ridan-to‘g‘ri", other: "Boshqa",
};
const CHANNEL_LABEL: Record<string, string> = { phone: "Telefon", telegram: "Telegram", instagram: "Instagram" };

/** Kategoriyalar bo'yicha gorizontal ustunlar (bitta rang — miqdor). */
function Breakdown({ rows, empty }: { rows: [string, number][]; empty: string }) {
  const total = rows.reduce((a, [, n]) => a + n, 0);
  if (!total) return <p className="muted small">{empty}</p>;
  const max = Math.max(...rows.map(([, n]) => n));
  return (
    <ul className="brk">
      {rows.sort((a, b) => b[1] - a[1]).map(([k, n]) => (
        <li key={k}>
          <span>{k}</span>
          <span className="brk-bar"><i style={{ width: `${(n / max) * 100}%` }} /></span>
          <b className="num">{n}</b>
        </li>
      ))}
    </ul>
  );
}

type Item = { label: string; detail?: string; done: boolean; required: boolean; href: string; gain?: string };

export default async function Cabinet({ searchParams }: { searchParams: Promise<{ yuborildi?: string }> }) {
  const { yuborildi } = await searchParams;
  const user = await requireUser();
  const p = await getOwnProfile(user.id);
  if (!p) {
    return (
      <div className="form" style={{ maxWidth: 560 }}>
        <h2>Profil hali yo‘q</h2>
        <p className="muted">{prettyPhone(user.phone)} raqami bilan kirdingiz. Portfoliongizni qo‘shing — bepul.</p>
        <div className="row"><Link className="btn" href="/qoshilish">Portfolio qo‘shish</Link><form action={logoutAction}><button className="btn ghost">Chiqish</button></form></div>
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
  const c = countPortfolio(live.map((m) => ({ type: m.type, isCover: m.cover, isStatScreenshot: m.stat })), links);
  const items: Item[] = [
    { label: "Saytdagi profil rasmi", done: c.hasCover, required: true, href: edit(4), detail: c.hasCover ? "yuklangan" : "yo‘q" },
    ...(rule.minWorks > 0 ? [{ label: "Portfolio: rasm yoki video", detail: `${c.works} / ${rule.minWorks}`, done: c.works >= rule.minWorks, required: true, href: edit(4) }] : []),
    ...(rule.minVideos > 0 ? [{ label: rule.videoLabel, detail: `${c.videos + c.links} / ${rule.minVideos}`, done: c.videos + c.links >= rule.minVideos, required: true, href: edit(4) }] : []),
    ...(rule.proof?.required ? [{ label: rule.proof.label, detail: proofs ? `${proofs} ta` : "yo‘q", done: proofs > 0, required: true, href: edit(4) }] : []),
    { label: "Portfolio ishlari", detail: `${c.works} ta`, done: c.works >= Math.max(4, rule.minWorks), required: false, href: edit(4), gain: images < 5 ? "har rasm +2 reyting" : undefined },
    { label: "O‘zingiz haqingizda", detail: p.bio.length ? `${p.bio.length} belgi` : "bo‘sh", done: p.bio.length >= 40, required: false, href: edit(1), gain: "+5 reyting" },
    { label: "Narx ko‘rsatilgan", done: p.price != null, required: false, href: edit(2), gain: "+5 reyting" },
    ...(rule.minVideos === 0 ? [{ label: "Video yoki ish havolasi", detail: `${c.videos + links} ta`, done: c.videos + links > 0, required: false, href: edit(4), gain: "+5 reyting" }] : []),
    ...(!isBlogger ? [{ label: "Telegram kontakti", done: !!contact?.telegram, required: false, href: edit(3), detail: "mijozlar ko‘pincha shu yerga yozadi" }] : []),
    ...(botEnabled() ? [{ label: "Telegram bot ulangan", done: !!user.telegramId, required: false, href: "#telegram", detail: "tasdiqlash natijasi va statistika" }] : []),
  ];
  const done = items.filter((i) => i.done).length;
  const pct = Math.round((done / items.length) * 100);
  const missingRequired = items.filter((i) => i.required && !i.done);

  const [stats30, place, insights] = inCatalog
    ? await Promise.all([profileStats(p.id, 30), professionPlace(p.professionId, p.rankScore), profileInsights(p.id, 30)])
    : [null, null, null];
  const share = <ShareBox site={SITE.url} slug={p.slug} name={p.fullName} approved={inCatalog} bot={botEnabled() ? await botUsername() : null} />;
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

      {inCatalog && share}

      {insights && (
        <section className="box">
          <h3>Kim qiziqdi · 30 kun</h3>
          <InsightsChart series={insights.series} />
          <div className="cab-grid two">
            <div>
              <p className="eyebrow" style={{ marginBottom: 8 }}>Qayerdan kelishdi</p>
              <Breakdown rows={Object.entries(insights.sources).map(([k, n]) => [SOURCE_LABEL[k] ?? k, n])} empty="Hali ko‘rishlar yo‘q. Havolangizni Instagram bio’ga qo‘ying." />
            </div>
            <div>
              <p className="eyebrow" style={{ marginBottom: 8 }}>Qaysi kontaktni ochishdi</p>
              <Breakdown rows={Object.entries(insights.channels).map(([k, n]) => [CHANNEL_LABEL[k] ?? k, n])} empty="Hali kontakt bosishlar yo‘q." />
            </div>
          </div>
        </section>
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

      {!inCatalog && share}

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
