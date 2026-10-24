"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  ["/", "Bosh sahifa"],
  ["/xizmatlar", "Xizmatlar"],
  ["/mutaxassislar", "Mutaxassislar"],
  ["/qoshilish", "Mutaxassis bo‘lish"],
  ["/aloqa", "Aloqa"],
] as const;

export default function NavLinks({ account }: { account: { href: string; label: string } }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  const links = LINKS.map(([href, label]) => (
    <Link key={href} href={href} aria-current={(href === "/" ? path === "/" : path.startsWith(href)) ? "page" : undefined}>{label}</Link>
  ));
  return (
    <>
      <nav className="navlinks" aria-label="Asosiy">{links}</nav>
      <span className="sp" />
      <Link className="btn ghost sm acc-btn" href={account.href}>{account.label}</Link>
      <button type="button" className="burger" aria-label="Menyu" aria-expanded={open} onClick={() => setOpen(!open)}>
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>
      {open && <nav className="mnav" aria-label="Menyu">{links}<Link href={account.href}>{account.label}</Link></nav>}
    </>
  );
}
