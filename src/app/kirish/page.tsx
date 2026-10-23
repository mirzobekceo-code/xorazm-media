import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import LoginForm from "./LoginForm";
import { botEnabled } from "@/lib/telegram";
import { codeLoginAvailable } from "@/lib/otp-delivery";

export const metadata = { title: "Kirish", robots: { index: false } };

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : undefined;
  const user = await getUser();
  if (user) redirect(safeNext ?? (user.role === "specialist" ? "/kabinet" : "/admin"));
  return (
    <div style={{ maxWidth: 440, margin: "24px auto" }}>
      <LoginForm next={safeNext} telegram={botEnabled()} code={codeLoginAvailable()} />
    </div>
  );
}
