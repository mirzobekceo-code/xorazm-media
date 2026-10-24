import type { Metadata } from "next";
import { getProfessions } from "@/lib/queries";
import ServiceGrid from "@/components/ServiceGrid";
import Ad from "@/components/Ad";

export const metadata: Metadata = { title: "Xizmatlar", description: "Xorazmdagi digital va media xizmatlar: brand face, operator, montajor, targetolog, SMM, bloger, fotograf, dizayner, suhandon, studiya va texnika ijarasi." };
export const dynamic = "force-dynamic";

export default async function Services() {
  const profs = await getProfessions();
  return (
    <div className="view">
      <div className="page-head">
        <h1>Xizmatlar</h1>
        <p className="lead">Kerakli yo‘nalishni tanlang. Profillarni ko‘ring va mutaxassis bilan to‘g‘ridan-to‘g‘ri bog‘laning.</p>
      </div>
      <ServiceGrid profs={profs} />
      <Ad slot="A5" variant="banner" />
    </div>
  );
}
