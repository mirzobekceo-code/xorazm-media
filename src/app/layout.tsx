import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { SITE } from "@/lib/site";
import { getProfessions } from "@/lib/queries";
import { getUser } from "@/lib/auth";
import { getOwnProfile } from "@/lib/profiles";
import { userRequests } from "@/lib/requests";
import NavLinks from "@/components/NavLinks";
import Logo from "@/components/Logo";
import Ad from "@/components/Ad";
import { headers } from "next/headers";
import { adContextFromUrl } from "@/lib/ads";
import PublicOnly from "@/components/PublicOnly";
import TelegramMiniApp from "@/components/TelegramMiniApp";
import Analytics from "@/components/Analytics";
import { Suspense } from "react";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name} — Xorazm media mutaxassislari`, template: `%s · ${SITE.name}` },
  description: SITE.description,
  openGraph: { siteName: SITE.name, locale: "uz_UZ", type: "website" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#0f1615", colorScheme: "dark" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [profs, user] = await Promise.all([getProfessions(), getUser()]);
  // Kabinet faqat portfolio qo'shganlarga; qolgan kirgan foydalanuvchiga — "Portfolio qo'shish"
  const ownProfile = user?.role === "specialist" ? await getOwnProfile(user.id) : null;
  // So'rov qoldirgan biznes egasi ham o'z so'rovlarini kabinetda ko'radi
  const hasRequests = user?.role === "specialist" && !ownProfile ? (await userRequests(user.id)).length > 0 : false;
  const account = !user ? { href: "/kirish", label: "Kirish" }
    : user.role !== "specialist" ? { href: "/admin", label: "Admin" }
    : ownProfile || hasRequests ? { href: "/kabinet", label: "Kabinet" } : { href: "/qoshilish", label: "Portfolio qo‘shish" };
  const url = (await headers()).get("x-url");
  const adCtx = await adContextFromUrl(url, profs);
  // Profil sahifasi mutaxassisning shaxsiy sahifasi (landing): tepada banner yo'q
  const landing = !!url?.startsWith("/m/");
  return (
    <html lang="uz" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400..600;1,9..144,400..600&family=Outfit:wght@400;500;600&family=Inter:wght@400;500;600&display=swap" />
        <script src="https://telegram.org/js/telegram-web-app.js" async />
      </head>
      <body>
        <header className="top">
          <div className="wrap nav">
            <Logo />
            <NavLinks account={account} />
          </div>
        </header>

        <main className="wrap">
          {!landing && <PublicOnly><div style={{ marginBottom: 28 }}><Ad slot="A1" variant="banner" ctx={adCtx} /></div></PublicOnly>}
          {children}
        </main>

        <footer>
          <div className="wrap">
            <PublicOnly><div style={{ marginBottom: 36 }}><Ad slot="A6" variant="banner" ctx={adCtx} /></div></PublicOnly>
            <div className="foot">
              <div>
                <Logo />
                <p className="muted" style={{ marginTop: 10, maxWidth: "36ch" }}>Xorazmdagi digital va media mutaxassislari bitta joyda. Bepul.</p>
                <div className="powered">Homiy va reklama hamkori <img src="/brand/adverto-white.png" alt="adverto" /></div>
              </div>
              <div><h4>Xizmatlar</h4>{profs.map((p) => <Link key={p.slug} href={`/mutaxassislar/${p.slug}`}>{p.nameUz}</Link>)}</div>
              <div><h4>Platforma</h4>
                <Link href="/xizmatlar">Xizmatlar</Link>
                <Link href="/mutaxassislar">Mutaxassislar</Link>
                <Link href="/sorov">So‘rov qoldirish</Link>
                <Link href="/sorovlar">Bizneslar so‘rovlari</Link>
                <Link href="/qoshilish">Mutaxassis bo‘lish</Link>
                <Link href="/savollar">Savollar</Link>
                <Link href="/shartlar">Foydalanish shartlari</Link>
                <Link href="/maxfiylik">Maxfiylik siyosati</Link>
              </div>
              <div><h4>Aloqa</h4>
                <Link href="/aloqa">Bog‘lanish</Link>
                <a href={SITE.telegram} target="_blank" rel="noopener">Telegram</a>
                <Link href="/reklama">Reklama joylashtirish</Link>
              </div>
            </div>
            <p className="muted small" style={{ marginTop: 28 }}>© {new Date().getFullYear()} {SITE.name} · Urganch</p>
          </div>
        </footer>
        <TelegramMiniApp loggedIn={!!user} />
        <Suspense><Analytics /></Suspense>
      </body>
    </html>
  );
}
