"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [["/", "Bosh sahifa"], ["/mutaxassislar", "Mutaxassislar"], ["/qoshilish", "Qo‘shilish"]] as const;

export default function NavLinks() {
  const path = usePathname();
  return (
    <nav className="navlinks" aria-label="Asosiy">
      {LINKS.map(([href, label]) => (
        <Link key={href} href={href} aria-current={(href === "/" ? path === "/" : path.startsWith(href)) ? "page" : undefined}>{label}</Link>
      ))}
    </nav>
  );
}
