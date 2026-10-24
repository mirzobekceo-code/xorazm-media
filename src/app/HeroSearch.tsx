"use client";
import { useRouter } from "next/navigation";

export default function HeroSearch({ profs, dists }: { profs: [string, string][]; dists: [string, string][] }) {
  const router = useRouter();
  return (
    <form className="search" aria-label="Qidiruv" onSubmit={(e) => {
      e.preventDefault();
      const f = new FormData(e.currentTarget);
      const kasb = String(f.get("kasb") ?? "");
      const tuman = String(f.get("tuman") ?? "");
      router.push(`/mutaxassislar${kasb ? `/${kasb}` : ""}${tuman ? `?tuman=${tuman}` : ""}`);
    }}>
      <label htmlFor="hs-kasb"><span>Xizmatlar</span>
        <select id="hs-kasb" name="kasb" defaultValue="">
          <option value="">Barcha xizmatlar</option>
          {profs.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </label>
      <label htmlFor="hs-tuman"><span>Hudud</span>
        <select id="hs-tuman" name="tuman" defaultValue="">
          <option value="">Butun Xorazm</option>
          {dists.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </label>
      <button className="btn" type="submit">Izlash</button>
    </form>
  );
}
