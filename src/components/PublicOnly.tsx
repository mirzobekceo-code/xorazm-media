"use client";
import { usePathname } from "next/navigation";

/** Reklama joylari ichki sahifalarda (admin) ko'rsatilmaydi. */
export default function PublicOnly({ children }: { children: React.ReactNode }) {
  return usePathname().startsWith("/admin") ? null : <>{children}</>;
}
