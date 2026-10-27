import { ImageResponse } from "next/og";
import QRCode from "qrcode";
import { getProfile } from "@/lib/queries";
import { initials } from "@/lib/format";
import { SITE } from "@/lib/site";
import { coverData } from "@/lib/og";

export const runtime = "nodejs";

/**
 * QR-vizitka: Instagram Story o'lchamidagi (1080×1920) to'q firuza kartochka — foto, ism, kasb va
 * sahifaga olib boradigan QR-kod (?s=qr — skanerlashlar statistikada alohida ko'rinadi).
 */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const p = await getProfile((await params).slug);
  if (!p) return new Response("Topilmadi", { status: 404 });
  const link = `${SITE.url}/m/${p.slug}`;
  const qr = await QRCode.toDataURL(`${link}?s=qr`, { margin: 1, width: 560, color: { dark: "#0b1716", light: "#ffffff" }, errorCorrectionLevel: "M" });
  const cover = await coverData(p.media.find((m) => m.type === "image")?.url, 520, 520);
  const where = p.districts.map((d) => d.nameUz).slice(0, 2).join(", ") || "Xorazm";
  const img = new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", height: "100%", padding: "150px 90px 120px",
        background: "linear-gradient(170deg, #0f1615 0%, #10302f 55%, #0f1615 100%)", color: "#f2ebdf" }}>
        <div style={{ display: "flex", width: 380, height: 380, borderRadius: 190, overflow: "hidden", border: "8px solid #3cc2cb", background: "#163a3c", alignItems: "center", justifyContent: "center" }}>
          {cover ? <img src={cover} width={380} height={380} style={{ objectFit: "cover" }} alt="" /> : <div style={{ display: "flex", fontSize: 150 }}>{initials(p.fullName)}</div>}
        </div>
        <div style={{ display: "flex", marginTop: 56, fontSize: p.fullName.length > 20 ? 74 : 90, fontWeight: 700, textAlign: "center", lineHeight: 1.05 }}>
          {p.fullName}{p.verifiedAt ? " ✓" : ""}
        </div>
        <div style={{ display: "flex", marginTop: 26, fontSize: 44, color: "#74d8de", textTransform: "uppercase", letterSpacing: 4 }}>{p.profession.nameUz}</div>
        <div style={{ display: "flex", marginTop: 14, fontSize: 36, color: "#a59d90" }}>{where}</div>
        <div style={{ display: "flex", marginTop: 80, padding: 26, borderRadius: 40, background: "#ffffff", boxShadow: "0 0 90px rgba(60,194,203,0.55)" }}>
          <img src={qr} width={520} height={520} alt="" />
        </div>
        <div style={{ display: "flex", marginTop: 44, fontSize: 38 }}>Portfolio va narxlar — QR orqali</div>
        <div style={{ display: "flex", marginTop: "auto", fontSize: 34, color: "#a59d90" }}>{link.replace(/^https?:\/\//, "")}</div>
      </div>
    ),
    { width: 1080, height: 1920 },
  );
  const headers = new Headers(img.headers);
  headers.set("cache-control", "public, max-age=600");
  if (new URL(req.url).searchParams.get("download") === "1") headers.set("content-disposition", `attachment; filename="${p.slug}-vizitka.png"`);
  return new Response(img.body, { headers });
}
