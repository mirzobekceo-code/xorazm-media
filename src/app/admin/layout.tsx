import { requireStaff } from "@/lib/auth";
import AdminNav from "./AdminNav";

export const metadata = { title: "Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await requireStaff();
  return (
    <div className="admin-layout">
      <AdminNav isAdmin={me.role === "admin"} />
      <div className="stack" style={{ gap: 24, minWidth: 0 }}>{children}</div>
    </div>
  );
}
