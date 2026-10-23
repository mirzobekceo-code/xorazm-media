"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export default function SortSelect({ value }: { value: string }) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  return (
    <select className="inp" style={{ width: "auto" }} aria-label="Saralash" defaultValue={value} onChange={(e) => {
      const q = new URLSearchParams(sp.toString());
      q.delete("sahifa");
      if (e.target.value === "top") q.delete("saralash"); else q.set("saralash", e.target.value);
      router.push(q.size ? `${path}?${q}` : path);
    }}>
      <option value="top">Avval TOP</option>
      <option value="new">Avval yangilar</option>
      <option value="cheap">Narx: arzonidan</option>
      <option value="views">Ko‘p ko‘rilgan</option>
    </select>
  );
}
