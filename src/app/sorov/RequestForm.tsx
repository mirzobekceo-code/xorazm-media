"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createRequestAction } from "@/app/actions";
import TelegramButton from "@/components/TelegramButton";
import { track } from "@/lib/client/analytics";
import type { RequestInputT } from "@/lib/requests";

type Opt = { slug: string; nameUz: string };
type Props = {
  professions: Opt[]; districts: Opt[]; deadlines: readonly string[];
  auth: "none" | "nolink" | "ok"; phone: string; initialProfession: string;
};

export default function RequestForm({ professions, districts, deadlines, auth, phone, initialProfession }: Props) {
  const router = useRouter();
  const [v, setV] = useState({
    profession: initialProfession, district: "", title: "", description: "", budget: "", deadline: "",
    businessName: "", contactPhone: phone, contactTelegram: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value });

  if (auth !== "ok") {
    return (
      <div className="form" style={{ maxWidth: 560 }}>
        <h2>{auth === "none" ? "Telegram orqali kiring" : "Telegram’ni ulang"}</h2>
        <p className="muted">So‘rov botimiz orqali tasdiqlanadi va qiziqqan mutaxassislar sizga <b>Telegram’da</b> yoziladi. Parol kerak emas.</p>
        <TelegramButton mode={auth === "none" ? "login" : "link"} onDone={() => router.refresh()} label={auth === "none" ? "Telegram orqali davom etish" : undefined} />
      </div>
    );
  }

  return (
    <form className="form" style={{ maxWidth: 640 }} onSubmit={async (e) => {
      e.preventDefault();
      setError("");
      setBusy(true);
      const r = await createRequestAction(v as RequestInputT);
      setBusy(false);
      if (!r.ok) return setError(r.error);
      track("request_created", { profession: v.profession });
      router.push(`/sorovlar/${r.id}?yangi=1`);
    }}>
      <div className="field">
        <label htmlFor="r-prof">Qaysi mutaxassis kerak? *</label>
        <select className="inp" id="r-prof" value={v.profession} onChange={set("profession")} required>
          <option value="">Tanlang</option>
          {professions.map((p) => <option key={p.slug} value={p.slug}>{p.nameUz}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="r-title">Nima kerak? (qisqacha) *</label>
        <input className="inp" id="r-title" maxLength={120} placeholder="Masalan: Kafe uchun 5 ta reels suratga olish" value={v.title} onChange={set("title")} required />
      </div>
      <div className="field">
        <label htmlFor="r-desc">Batafsil</label>
        <textarea className="inp" id="r-desc" rows={4} maxLength={1000} placeholder="Biznesingiz, maqsad, hajm, qayerda bo‘ladi…" value={v.description} onChange={set("description")} />
        <small>{v.description.length} / 1000</small>
      </div>
      <div className="grid-2" style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
        <div className="field">
          <label htmlFor="r-dist">Hudud</label>
          <select className="inp" id="r-dist" value={v.district} onChange={set("district")}>
            <option value="">Butun Xorazm</option>
            {districts.map((d) => <option key={d.slug} value={d.slug}>{d.nameUz}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="r-dl">Muddat *</label>
          <select className="inp" id="r-dl" value={v.deadline} onChange={set("deadline")} required>
            <option value="">Tanlang</option>
            {deadlines.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="r-budget">Budjet (so‘m)</label>
          <input className="inp" id="r-budget" inputMode="numeric" placeholder="Bo‘sh qoldirsangiz — kelishiladi" value={v.budget}
            onChange={(e) => setV({ ...v, budget: e.target.value.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, " ") })} />
        </div>
        <div className="field">
          <label htmlFor="r-biz">Biznes nomi</label>
          <input className="inp" id="r-biz" maxLength={80} placeholder="Ixtiyoriy" value={v.businessName} onChange={set("businessName")} />
        </div>
        <div className="field">
          <label htmlFor="r-phone">Bog‘lanish raqami *</label>
          <input className="inp" id="r-phone" type="tel" placeholder="+998 90 123 45 67" value={v.contactPhone} onChange={set("contactPhone")} required />
        </div>
        <div className="field">
          <label htmlFor="r-tg">Telegram</label>
          <input className="inp" id="r-tg" placeholder="@username" value={v.contactTelegram} onChange={set("contactTelegram")} />
        </div>
      </div>
      <p className="muted small">Kontaktlaringiz faqat tasdiqlangan mutaxassislarga ko‘rinadi. So‘rov moderatsiyadan so‘ng 14 kun ochiq turadi.</p>
      {error && <p className="err" role="alert">{error}</p>}
      <button className="btn" disabled={busy}>{busy ? "Yuborilmoqda…" : "So‘rovni yuborish"}</button>
    </form>
  );
}
