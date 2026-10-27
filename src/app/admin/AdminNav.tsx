"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminNav({ isAdmin }: { isAdmin: boolean }) {
  const path = usePathname();
  const links: [string, string][] = [
    ["/admin", "Dashboard"], ["/admin/moderatsiya", "Moderatsiya"], ["/admin/sorovlar", "So‘rovlar"], ["/admin/mutaxassislar", "Mutaxassislar"], ["/admin/shikoyatlar", "Shikoyatlar"],
    ...(isAdmin ? ([["/admin/reklama", "Reklama"], ["/admin/xodimlar", "Xodimlar"], ["/admin/sozlamalar", "Sozlamalar"]] as [string, string][]) : []),
  ];
  return (
    <nav className="admin-nav" aria-label="Admin">
      {links.map(([href, label]) => (
        <Link key={href} href={href} aria-current={(href === "/admin" ? path === href : path.startsWith(href)) ? "page" : undefined}>{label}</Link>
      ))}
    </nav>
  );
}
