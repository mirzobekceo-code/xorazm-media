import { ImageResponse } from "next/og";
import { getProfile } from "@/lib/queries";
import { initials, money } from "@/lib/format";
import { SITE } from "@/lib/site";
import { coverData } from "@/lib/og";

export const alt = "Xorazm Digital HUB profili";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";

/** Havola ulashilganda chiqadigan rasm: foto, ism, kasb, hudud va narx. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const p = await getProfile((await params).slug);
  const site = SITE.url.replace(/^https?:\/\//, "");
  if (!p) {
    return new ImageResponse(
      <div style={{ display: "flex", width: "100%", height: "100%", background: "#0f1615", color: "#f2ebdf", alignItems: "center", justifyContent: "center", fontSize: 64 }}>Xorazm Digital HUB</div>,
      size,
    );
  }
  const cover = await coverData(p.media.find((m) => m.type === "image")?.url, 480, 630);
  const where = p.districts.map((d) => d.nameUz).slice(0, 2).join(", ") || "Xorazm";
  const price = p.price ? `${money(p.price)} so‘m / ${p.profession.unit}` : "Narx kelishiladi";
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: "#0f1615", color: "#f2ebdf" }}>
        <div style={{ display: "flex", width: 480, height: 630, background: "#163a3c", alignItems: "center", justifyContent: "center" }}>
          {cover
            ? <img src={cover} width={480} height={630} style={{ objectFit: "cover" }} alt="" />
            : <div style={{ display: "flex", width: 220, height: 220, borderRadius: 110, background: "#0f1615", alignItems: "center", justifyContent: "center", fontSize: 88 }}>{initials(p.fullName)}</div>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "56px 60px", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 30, color: "#74d8de", letterSpacing: 2, textTransform: "uppercase" }}>{p.profession.nameUz}</div>
            <div style={{ display: "flex", fontSize: p.fullName.length > 22 ? 62 : 76, fontWeight: 700, lineHeight: 1.05, marginTop: 18 }}>{p.fullName}</div>
            <div style={{ display: "flex", fontSize: 30, color: "#a59d90", marginTop: 22 }}>{where}</div>
            <div style={{ display: "flex", fontSize: 36, marginTop: 30, padding: "10px 24px", borderRadius: 999, background: "#3cc2cb", color: "#0b1716", alignSelf: "flex-start" }}>{price}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", fontSize: 28 }}>
            <div style={{ display: "flex", width: 40, height: 40, borderRadius: 20, border: "9px solid #f2ebdf", alignItems: "center", justifyContent: "center", marginRight: 14 }}>
              <div style={{ display: "flex", width: 10, height: 10, borderRadius: 5, background: "#f2ebdf" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", whiteSpace: "nowrap" }}>Xorazm Digital HUB</div>
              <div style={{ display: "flex", color: "#a59d90", fontSize: 22, marginTop: 4 }}>{site}/m/{p.slug}</div>
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
