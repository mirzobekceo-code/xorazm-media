import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { getOwnProfile } from "@/lib/profiles";
import { profileToInput, wizardRefs } from "@/lib/profile-form";
import ProfileWizard from "@/components/ProfileWizard";

export const metadata: Metadata = { title: "Profil ochish — bepul", description: "Xorazm Media'da mutaxassis profilini 5 qadamda oching. Bepul." };
export const dynamic = "force-dynamic";

export default async function Join() {
  const user = await getUser();
  const profile = user ? await getOwnProfile(user.id) : null;
  // Yuborilgan profil tahrirlash sahifasida; qoralama shu yerda davom etadi
  // (4-qadamda saqlash sahifani qayta render qiladi, forma holati saqlanishi kerak)
  if (profile && profile.status !== "draft") redirect("/kabinet/tahrir");
  const [refs, existing] = await Promise.all([wizardRefs(), profile ? profileToInput(profile.id) : null]);
  return <ProfileWizard mode="signup" {...refs} initial={existing?.input ?? null} loggedIn={!!user} media={existing?.media ?? []} />;
}
