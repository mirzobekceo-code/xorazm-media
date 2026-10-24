import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getOwnProfile } from "@/lib/profiles";
import { profileToInput, wizardRefs } from "@/lib/profile-form";
import ProfileWizard from "@/components/ProfileWizard";

export const metadata = { title: "Profilni tahrirlash", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Edit({ searchParams }: { searchParams: Promise<{ qadam?: string }> }) {
  const { qadam } = await searchParams;
  const user = await requireUser("/kabinet/tahrir");
  const p = await getOwnProfile(user.id);
  if (!p) redirect("/qoshilish");
  const [refs, { input, media }] = await Promise.all([wizardRefs(), profileToInput(p.id)]);
  return <ProfileWizard mode="edit" {...refs} initial={input} loggedIn media={media} submitOnFinish={p.status === "draft" || p.status === "rejected"} startStep={Number(qadam) || 1} />;
}
