import type { Metadata } from "next";
import { getUser } from "@/lib/auth";
import { getDistricts, getProfessions } from "@/lib/queries";
import { REQUEST_DEADLINES } from "@/lib/requests";
import { prettyPhone } from "@/lib/format";
import RequestForm from "./RequestForm";

export const metadata: Metadata = {
  title: "So‘rov qoldirish — mutaxassis topish",
  description: "Nima kerakligini yozing — Xorazmdagi mos mutaxassislar o‘zi Telegram orqali bog‘lanadi. Bepul.",
};
export const dynamic = "force-dynamic";

export default async function NewRequest({ searchParams }: { searchParams: Promise<{ kasb?: string }> }) {
  const [{ kasb }, user, profs, dists] = await Promise.all([searchParams, getUser(), getProfessions(), getDistricts()]);
  const auth = !user ? "none" : !user.telegramId ? "nolink" : "ok";
  return (
    <div className="view" style={{ gap: 24 }}>
      <div>
        <p className="eyebrow">Bizneslar uchun · bepul</p>
        <h1 style={{ fontSize: "clamp(30px,4vw,44px)" }}>So‘rov qoldiring — mutaxassislar o‘zi yozadi</h1>
        <ol className="muted" style={{ margin: "10px 0 0", paddingLeft: 20, lineHeight: 1.7 }}>
          <li>Nima kerakligini yozing</li>
          <li>Moderator tekshiradi va mos mutaxassislarga Telegram orqali yuboradi</li>
          <li>Qiziqqanlar profili va portfoliosi bilan sizga botda keladi — eng mosini tanlaysiz</li>
        </ol>
      </div>
      {/* key: kirgandan keyin forma yangi qiymatlar (raqam) bilan qayta quriladi */}
      <RequestForm key={auth}
        professions={profs.map((p) => ({ slug: p.slug, nameUz: p.nameUz }))}
        districts={dists.map((d) => ({ slug: d.slug, nameUz: d.nameUz }))}
        deadlines={REQUEST_DEADLINES} auth={auth} phone={user ? prettyPhone(user.phone) : ""}
        initialProfession={profs.some((p) => p.slug === kasb) ? kasb! : ""}
      />
    </div>
  );
}
