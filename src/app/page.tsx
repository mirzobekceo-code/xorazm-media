import Link from "next/link";
import { getDistricts, getProfessions, searchProfiles } from "@/lib/queries";
import ProfileCard from "@/components/ProfileCard";
import { ProfIcon } from "@/components/Icons";
import Ad from "@/components/Ad";
import HeroSearch from "./HeroSearch";
import Tile from "@/components/Tile";

const HERO_LABELS = ["Bloger", "Operator", "Brand Face", "Montajor"];
/**
 * Bosh sahifa kollaji rasmlari (public/hero/). Ro'yxat bo'sh yoki rasm yetishmasa — koshin naqshi.
 * Vercel'da public/ server funksiyasiga kirmaydi, shuning uchun ro'yxat qo'lda yuritiladi.
 */
const HERO_IMAGES: string[] = [];

export const dynamic = "force-dynamic";

export default async function Home() {
  const [profs, dists, top] = await Promise.all([getProfessions(), getDistricts(), searchProfiles({ sort: "top" })]);
  const total = profs.reduce((a, p) => a + p.count, 0);
  const items = top.items.slice(0, 7);
  return (
    <div className="view">
      <div className="hero-x">
        <div>
          <span className="free">Hammasi bepul — kontaktlar ochiq</span>
          <h1>Xorazmdagi media mutaxassislar <em>bir joyda</em></h1>
          <p className="lead">Bloger, brand face, operator, fotograf, montajor, dizayner, targetolog va SMM manager toping. Profilni ko‘ring va to‘g‘ridan-to‘g‘ri bog‘laning. To‘lov yo‘q, vositachi yo‘q.</p>
          <HeroSearch profs={profs.map((p) => [p.slug, p.nameUz])} dists={dists.map((d) => [d.slug, d.nameUz])} />
          <div className="stats">
            <div><b className="num">{total}</b><span>tasdiqlangan profil</span></div>
            <div><b className="num">{dists.length}</b><span>shahar va tuman</span></div>
            <div><b className="num">0 so‘m</b><span>kontakt ochish</span></div>
          </div>
        </div>
        <div className="collage" aria-hidden="true">
          {HERO_LABELS.map((label, i) => (
            <div className="arch" key={label}>
              {HERO_IMAGES[i] ? <img src={HERO_IMAGES[i]} alt="" /> : <Tile seed={i} scale={1.4} />}
              <span className="label">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <section>
        <div className="sec-head"><h2>Yo‘nalishlar</h2></div>
        <div className="cats">
          {profs.map((p) => (
            <Link key={p.slug} className="cat" href={`/mutaxassislar/${p.slug}`}>
              <ProfIcon svg={p.icon} />
              <div><h3>{p.nameUz}</h3><p>{p.description}</p></div>
              <span className="c num">{p.count} ta profil →</span>
            </Link>
          ))}
        </div>
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
        ) : <div className="empty">Hozircha tasdiqlangan profil yo‘q. Birinchi bo‘ling — <Link className="link" href="/qoshilish">profil oching</Link>.</div>}
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

      <section>
        <div className="sec-head"><h2>Tumanlar bo‘yicha</h2></div>
        <div className="tumans">
          {dists.map((d) => <Link key={d.slug} href={`/mutaxassislar?tuman=${d.slug}`}>{d.nameUz}<span className="num">{d.count}</span></Link>)}
        </div>
      </section>

      <div className="join">
        <div>
          <p className="eyebrow">Mutaxassislar uchun</p>
          <h2>Profilingizni oching. Mijozlar o‘zi topadi.</h2>
          <ul>
            <li>Ro‘yxatdan o‘tish va joylashish bepul</li>
            <li>Moderator 24 soat ichida tekshiradi, ✓ belgisi beriladi</li>
            <li>Portfolio, narxlar va auditoriya statistikangizni joylang</li>
          </ul>
        </div>
        <div className="stack" style={{ alignItems: "flex-start" }}>
          <Link className="btn" href="/qoshilish">Profil ochish</Link>
          <p className="muted small">5 qadam · taxminan 3 daqiqa</p>
        </div>
      </div>
    </div>
  );
}
