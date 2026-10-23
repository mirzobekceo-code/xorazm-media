import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { getOwnProfile } from "@/lib/profiles";
import { profileStats } from "@/lib/queries";
import { getDb, schema as s } from "@/db";
import { deleteAccountAction, logoutAction } from "@/app/actions";
import { prettyPhone } from "@/lib/format";
import CabinetToggles from "./CabinetToggles";
import DeleteAccount from "./DeleteAccount";
import TelegramLink from "./TelegramLink";
import { botEnabled } from "@/lib/telegram";

export const metadata = { title: "Kabinet", robots: { index: false } };
export const dynamic = "force-dynamic";

const STATUS: Record<string, [string, string]> = {
  draft: ["Qoralama", "Profil hali tekshiruvga yuborilmagan. Rasm yuklab, yuboring."],
  pending: ["Tekshiruvda", "Moderator 24 soat ichida tekshiradi."],
  approved: ["Tasdiqlangan", "Profilingiz katalogda ko‘rinadi."],
  rejected: ["Rad etilgan", "Sababini tuzatib, qayta yuboring."],
  hidden: ["Yashirilgan", "Profil katalogda ko‘rinmaydi. Istalgan payt qayta ochishingiz mumkin."],
  blocked: ["Bloklangan", "Qoidalar buzilgani uchun bloklangan. Admin bilan bog‘laning."],
};

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
  const [stats30, pendingMedia] = await Promise.all([
    profileStats(p.id, 30),
    db.select({ id: s.media.id }).from(s.media).where(and(eq(s.media.profileId, p.id), eq(s.media.moderationStatus, "pending"))),
  ]);
  const [label, hint] = STATUS[p.status];
  return (
    <div className="view" style={{ gap: 28 }}>
      <div className="sec-head" style={{ marginBottom: 0 }}>
        <div><p className="eyebrow">Kabinet · {prettyPhone(user.phone)}</p><h1 style={{ fontSize: "clamp(30px,4vw,44px)" }}>{p.fullName}</h1></div>
        <div className="row">
          <Link className="btn ghost" href={`/m/${p.slug}`}>Profilni ko‘rish</Link>
          <Link className="btn" href="/kabinet/tahrir">Tahrirlash</Link>
        </div>
      </div>

      {yuborildi && p.status === "pending" && (
        <div className="notice"><b>Profil tekshiruvga yuborildi.</b> Moderator 24 soat ichida tekshiradi; tasdiqlangach profilingiz katalogda ✓ belgisi bilan chiqadi.</div>
      )}
      <div className="box">
        <div className="row"><span className={`pill ${p.status}`}>{label}</span><span className="muted">{hint}</span></div>
        {p.status === "rejected" && p.rejectReason && <p className="err">Sabab: {p.rejectReason}</p>}
        {pendingMedia.length > 0 && p.status === "approved" && <p className="muted small">{pendingMedia.length} ta yangi fayl tekshiruvda — tasdiqlangach profilda chiqadi.</p>}
        {(p.status === "draft" || p.status === "rejected") && <div><Link className="btn sm" href="/kabinet/tahrir">Davom ettirish va yuborish</Link></div>}
      </div>

      <div className="tiles">
        <div className="tile"><b className="num">{stats30.views}</b><span>profil ko‘rishlari, 30 kun</span></div>
        <div className="tile"><b className="num">{stats30.contacts}</b><span>kontakt bosishlar, 30 kun</span></div>
        <div className="tile"><b className="num">{p.rankScore.toFixed(0)}</b><span>reyting bali</span></div>
        <div className="tile"><b>{p.isAvailable ? "Bo‘sh" : "Band"}</b><span>joriy holat</span></div>
      </div>

      <CabinetToggles isAvailable={p.isAvailable} hidden={p.status === "hidden"} canHide={p.status === "approved" || p.status === "hidden"} />

      <div className="box">
        <h3>Telegram bildirishnomalari</h3>
        {user.telegramId
          ? <p className="ok">✓ Telegram ulangan. Tasdiqlash natijasi va haftalik statistika botga keladi.</p>
          : botEnabled()
            ? <><p className="muted small">Tasdiqlash natijasi va haftalik statistikani Telegram orqali oling.</p><TelegramLink /></>
            : <p className="muted small">Telegram bot tez orada ulanadi.</p>}
      </div>

      <div className="row" style={{ justifyContent: "space-between" }}>
        <form action={logoutAction}><button className="btn ghost">Chiqish</button></form>
        <DeleteAccount action={deleteAccountAction} />
      </div>
    </div>
  );
}
