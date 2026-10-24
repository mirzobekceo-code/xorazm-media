import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/site";
import { botUsername } from "@/lib/telegram";

export const metadata: Metadata = { title: "Aloqa", description: "Xorazm Digital HUB bilan bog‘lanish." };
export const dynamic = "force-dynamic";

export default async function Contact() {
  const bot = await botUsername();
  return (
    <div className="view">
      <div className="page-head">
        <h1>Aloqa</h1>
        <p className="lead">Savol, taklif yoki hamkorlik bo‘yicha yozing. Odatda bir necha soat ichida javob beramiz.</p>
      </div>
      <div className="contacts">
        <a className="cat" href={SITE.telegram} target="_blank" rel="noopener">
          <span className="arrow" aria-hidden="true">↗</span>
          <div><h3>Telegram</h3><p>Platforma bo‘yicha savollar va takliflar</p></div>
        </a>
        {bot && (
          <a className="cat" href={`https://t.me/${bot}`} target="_blank" rel="noopener">
            <span className="arrow" aria-hidden="true">↗</span>
            <div><h3>@{bot}</h3><p>Kirish kodlari, profil holati va xabarnomalar</p></div>
          </a>
        )}
        <Link className="cat" href="/reklama">
          <span className="arrow" aria-hidden="true">→</span>
          <div><h3>Reklama joylashtirish</h3><p>Sayt sahifalaridagi reklama joylari — Adverto orqali</p></div>
        </Link>
        <Link className="cat" href="/qoshilish">
          <span className="arrow" aria-hidden="true">→</span>
          <div><h3>Mutaxassis bo‘lish</h3><p>Profilingizni bepul oching, moderator 24 soatda tekshiradi</p></div>
        </Link>
      </div>
      <p className="muted small">Profilda noto‘g‘ri ma’lumot ko‘rsangiz, profil sahifasidagi “Shikoyat qilish” tugmasidan foydalaning.</p>
    </div>
  );
}
