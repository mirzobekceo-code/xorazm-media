import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import LoginForm from "./LoginForm";
import { botEnabled } from "@/lib/telegram";
import { smsVisible } from "@/lib/sms";

export const metadata = { title: "Kirish", robots: { index: false } };

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string; sms?: string }> }) {
  const { next, sms } = await searchParams;
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : undefined;
  const user = await getUser();
  if (user) redirect(safeNext ?? (user.role === "specialist" ? "/kabinet" : "/admin"));
  return (
    <div style={{ maxWidth: 440, margin: "24px auto" }}>
      {/* ?sms=1 — zaxira yo'l (masalan, admin kodni logdan oladi) */}
      <LoginForm next={safeNext} telegram={botEnabled()} sms={smsVisible() || sms === "1" || !botEnabled()} />
    </div>
  );
}
