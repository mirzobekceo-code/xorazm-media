import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { SITE } from "@/lib/site";
import { getProfessions } from "@/lib/queries";
import { getUser } from "@/lib/auth";
import NavLinks from "@/components/NavLinks";
import Ad from "@/components/Ad";
import PublicOnly from "@/components/PublicOnly";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name} — Xorazm media mutaxassislari`, template: `%s · ${SITE.name}` },
  description: SITE.description,
  openGraph: { siteName: SITE.name, locale: "uz_UZ", type: "website" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [profs, user] = await Promise.all([getProfessions(), getUser()]);
  return (
    <html lang="uz">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600&family=Inter:wght@400;500;600&display=swap" />
        <script src="https://telegram.org/js/telegram-web-app.js" async />
      </head>
      <body>
        <header className="top">
          <div className="wrap nav">
            <Link className="brand" href="/"><span className="mark" aria-hidden="true" />{SITE.name}</Link>
            <NavLinks />
            <span className="sp" />
            {user
              ? <Link className="btn ghost sm" href={user.role === "specialist" ? "/kabinet" : "/admin"}>{user.role === "specialist" ? "Kabinet" : "Admin"}</Link>
              : <Link className="btn ghost sm" href="/kirish">Kirish</Link>}
            <Link className="btn sm join-btn" href="/qoshilish">Profil ochish — bepul</Link>
          </div>
        </header>

        <main className="wrap">
          <PublicOnly><div style={{ marginBottom: 28 }}><Ad slot="A1" variant="banner" /></div></PublicOnly>
          {children}
        </main>

        <footer>
          <div className="wrap">
            <PublicOnly><div style={{ marginBottom: 36 }}><Ad slot="A6" variant="banner" /></div></PublicOnly>
            <div className="foot">
              <div>
                <Link className="brand" href="/"><span className="mark" aria-hidden="true" />{SITE.name}</Link>
                <p className="muted" style={{ marginTop: 10, maxWidth: "36ch" }}>Xorazm media bozori: brendlar va bizneslar uchun mutaxassislar katalogi. Bepul.</p>
                <div className="powered">Homiy va reklama hamkori <img src="/brand/adverto-white.png" alt="adverto" /></div>
              </div>
              <div><h4>Yo‘nalishlar</h4>{profs.map((p) => <Link key={p.slug} href={`/mutaxassislar/${p.slug}`}>{p.nameUz}</Link>)}</div>
              <div><h4>Platforma</h4>
                <Link href="/mutaxassislar">Mutaxassislar</Link>
                <Link href="/qoshilish">Profil ochish</Link>
                <Link href="/savollar">Savollar</Link>
                <Link href="/shartlar">Foydalanish shartlari</Link>
                <Link href="/maxfiylik">Maxfiylik siyosati</Link>
              </div>
              <div><h4>Aloqa</h4>
                <a href={SITE.telegram} target="_blank" rel="noopener">Telegram</a>
                <Link href="/reklama">Reklama joylashtirish</Link>
              </div>
            </div>
            <p className="muted small" style={{ marginTop: 28 }}>© {new Date().getFullYear()} {SITE.name} · Urganch</p>
          </div>
        </footer>
        <PublicOnly><Ad slot="A4" variant="sticky" /></PublicOnly>
      </body>
    </html>
  );
}
