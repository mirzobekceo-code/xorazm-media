import type { FieldDef } from "@/db/schema";
import { money } from "@/lib/format";
import { parsePriceList } from "@/lib/portfolio-rules";

/** Kasbga oid maydon qiymati: turiga qarab havola, xarita tugmasi, narxli ro'yxat yoki matn. */
export default function ExtraValue({ f, value }: { f: FieldDef; value: string }) {
  const safeUrl = /^https:\/\//.test(value) ? value : null;
  if ((f.type === "url" || f.type === "map") && safeUrl) {
    return <a className="link" href={safeUrl} target="_blank" rel="noopener nofollow">{f.type === "map" ? "Xaritada ochish ↗" : value}</a>;
  }
  if (f.type === "pricelist") {
    return (
      <table className="plist"><tbody>
        {parsePriceList(value).map((r, i) => (
          <tr key={i}><td>{r.name}</td><td className="num">{r.price ? `${money(r.price)} so‘m` : "kelishiladi"}</td></tr>
        ))}
      </tbody></table>
    );
  }
  return <span style={{ whiteSpace: "pre-line" }}>{value}</span>;
}
