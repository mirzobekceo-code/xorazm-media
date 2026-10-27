import type { Metadata } from "next";
import { getUser } from "@/lib/auth";
import { getDistricts } from "@/lib/queries";
import { prettyPhone } from "@/lib/format";
import QuickRequest from "@/components/QuickRequest";

export const metadata: Metadata = {
  title: "So‘rov qoldirish — mutaxassis topish",
  description: "Kimni tanlashni bilmayapsizmi? Muammoni yozing — Xorazmdagi mos mutaxassislar o‘zi bog‘lanadi. Bepul.",
};
export const dynamic = "force-dynamic";

export default async function NewRequest() {
  const [user, dists] = await Promise.all([getUser(), getDistricts()]);
  return (
    <div className="view" style={{ gap: 20 }}>
      <section className="qr-wrap">
        <QuickRequest districts={dists.map((d) => ({ slug: d.slug, nameUz: d.nameUz }))} phone={user ? prettyPhone(user.phone) : ""} />
      </section>
      <ol className="muted" style={{ margin: "0 auto", maxWidth: 560, paddingLeft: 20, lineHeight: 1.7 }}>
        <li>Muammoingizni yozasiz — kirish va ro‘yxatdan o‘tish shart emas</li>
        <li>Jamoamiz ko‘rib chiqadi va mos mutaxassislarga Telegram orqali yuboradi</li>
        <li>Qiziqqan mutaxassislar sizga o‘zi qo‘ng‘iroq qiladi yoki yozadi</li>
      </ol>
    </div>
  );
}
