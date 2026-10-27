import Link from "next/link";
import { getDistricts, getProfessions, searchProfiles } from "@/lib/queries";
import ProfileCard from "@/components/ProfileCard";
import ServiceGrid from "@/components/ServiceGrid";
import ServiceStrip from "@/components/ServiceStrip";
import HeroFan, { type FanItem } from "@/components/HeroFan";
import Ad from "@/components/Ad";
import HeroSearch from "./HeroSearch";
import QuickRequest from "@/components/QuickRequest";
import { getUser } from "@/lib/auth";
import { prettyPhone } from "@/lib/format";

/**
 * Bosh sahifa yelpig'ichi (public/hero/). Vercel'da public/ server funksiyasiga kirmaydi,
 * shuning uchun ro'yxat qo'lda yuritiladi. pos — yuz ko'rinib turishi uchun (object-position).
 */
const HERO: FanItem[] = [
  { label: "Blogerlar", href: "/mutaxassislar/bloger", src: "/hero/bloger.webp", pos: "center 30%", m: "c" },
  { label: "Operatorlar", href: "/mutaxassislar/operator", src: "/hero/operator.webp", pos: "center 30%", m: "l" },
  { label: "Brand Face", href: "/mutaxassislar/brand-face", src: "/hero/brandface.webp", pos: "center 20%", m: "r" },
  { label: "Montajorlar", href: "/mutaxassislar/montajor", src: "/hero/montajor.webp", pos: "center 30%" },
];

export const dynamic = "force-dynamic";

export default async function Home() {
  const [profs, dists, top, user] = await Promise.all([getProfessions(), getDistricts(), searchProfiles({ sort: "top" }), getUser()]);
  const total = profs.reduce((a, p) => a + p.count, 0);
  const items = top.items.slice(0, 7);
  return (
    <div className="view">
      <div className="hero-c">
        <h1>Xorazmdagi digital va media mutaxassislari <em>bitta joyda</em></h1>
        <p className="lead">Brand face, operator, montajor, targetolog, SMM manager, bloger va boshqa mutaxassislarni toping, studiya va texnikani ijaraga oling. To‘g‘ridan-to‘g‘ri bog‘laning — vositachisiz.</p>
        <HeroSearch profs={profs.map((p) => [p.slug, p.nameUz])} dists={dists.map((d) => [d.slug, d.nameUz])} />
        <div className="stats">
          <div><b className="num">{total}</b><span>tasdiqlangan profil</span></div>
          <div><b className="num">{profs.length}</b><span>xizmat turi</span></div>
          <div><b className="num">{dists.length}</b><span>shahar va tuman</span></div>
        </div>
      </div>

      <section>
        <div className="sec-head"><h2>Xizmatlar</h2><Link className="link" href="/xizmatlar">Barchasi</Link></div>
        <div className="svc-desktop"><ServiceGrid profs={profs} /></div>
        <ServiceStrip profs={profs} />
      </section>

      <div className="join">
        <div>
          <p className="eyebrow">Mutaxassislar uchun</p>
          <h2>Portfoliongizni qo‘shing. Mijozlar o‘zi topadi.</h2>
          <ul>
            <li>Ro‘yxatdan o‘tish va joylashish bepul</li>
            <li>Moderator 24 soat ichida tekshiradi, ✓ belgisi beriladi</li>
            <li>Shaxsiy sahifa, QR-kod va ko‘rishlar statistikasi</li>
          </ul>
        </div>
        <div className="stack" style={{ alignItems: "flex-start" }}>
          <Link className="btn" href="/qoshilish">Portfolio qo‘shish</Link>
          <p className="muted small">5 qadam · taxminan 3 daqiqa</p>
        </div>
      </div>

      <section>
        <div className="sec-head"><div><p className="eyebrow">Platformada</p><h2>Mutaxassislar</h2></div><Link className="link" href="/mutaxassislar">Hammasini ko‘rish</Link></div>
        <HeroFan items={HERO} top={items} profs={profs} />
      </section>

      <section className="qr-wrap" id="sorov">
        <QuickRequest districts={dists.map((d) => ({ slug: d.slug, nameUz: d.nameUz }))} phone={user ? prettyPhone(user.phone) : ""} />
      </section>

      <section>
        <div className="sec-head">
          <div><p className="eyebrow">Tavsiya</p><h2>TOP profillar</h2></div>
          <Link className="link" href="/mutaxassislar">Hammasini ko‘rish</Link>
        </div>
        {items.length ? (
          <div className="grid">
            {items.slice(0, 3).map((p) => <ProfileCard key={p.id} p={p} />)}
            <Ad slot="A2" variant="card" />
            {items.slice(3).map((p) => <ProfileCard key={p.id} p={p} />)}
          </div>
        ) : <div className="empty">Hozircha tasdiqlangan profil yo‘q. Birinchi bo‘ling — <Link className="link" href="/qoshilish">portfolio qo‘shing</Link>.</div>}
      </section>

      <section>
        <div className="sec-head"><h2>Qanday ishlaydi</h2></div>
        <div className="how">
          <div><span className="n">1-qadam</span><h3>Toping</h3><p>Yo‘nalish, tuman va narx bo‘yicha saralang. Ro‘yxatdan o‘tish shart emas.</p></div>
          <div><span className="n">2-qadam</span><h3>Ishlarini ko‘ring</h3><p>Portfolio, auditoriya statistikasi va narxlar profilda.</p></div>
          <div><span className="n">3-qadam</span><h3>Bog‘laning</h3><p>Telefon, Telegram va Instagram ochiq. Kelishuv to‘g‘ridan-to‘g‘ri siz bilan.</p></div>
        </div>
      </section>


      <Ad slot="A5" variant="banner" />

    </div>
  );
}
