import { desc } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { requireStaff } from "@/lib/auth";
import { adStats } from "@/lib/ads";
import { DISTRICTS, PROFESSIONS, SLOTS } from "@/lib/reference";
import { createCampaign, createCreative, setCampaignStatus, toggleCreative } from "../actions";

export default async function Ads() {
  await requireStaff("admin");
  const db = await getDb();
  const [campaigns, creatives, stats] = await Promise.all([
    db.select().from(s.adCampaigns).orderBy(desc(s.adCampaigns.isFallback), desc(s.adCampaigns.createdAt)),
    db.select().from(s.adCreatives),
    adStats(30),
  ]);
  const sum = (creativeId: number) => stats.filter((x) => x.creativeId === creativeId)
    .reduce((a, x) => ({ imp: a.imp + x.impressions, clk: a.clk + x.clicks }), { imp: 0, clk: 0 });
  const bySlot = Object.keys(SLOTS).map((slot) => {
    const rows = stats.filter((x) => x.slot === slot);
    const imp = rows.reduce((a, x) => a + x.impressions, 0), clk = rows.reduce((a, x) => a + x.clicks, 0);
    return { slot, imp, clk };
  });

  return (
    <>
      <h1 style={{ fontSize: 36 }}>Reklama</h1>
      <div className="box">
        <h3>Slotlar, 30 kun</h3>
        <div className="tbl-wrap"><table className="tbl">
          <thead><tr><th>Slot</th><th>Joyi</th><th>Ko‘rish</th><th>Bosish</th><th>CTR</th></tr></thead>
          <tbody>{bySlot.map((r) => (
            <tr key={r.slot}><td><b>{r.slot}</b></td><td>{SLOTS[r.slot as keyof typeof SLOTS]}</td><td className="num">{r.imp}</td><td className="num">{r.clk}</td>
              <td className="num">{r.imp ? ((r.clk / r.imp) * 100).toFixed(2) + "%" : "—"}</td></tr>
          ))}</tbody>
        </table></div>
      </div>

      {campaigns.map((c) => (
        <div className="box" key={c.id}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div><h3>{c.name}{c.isFallback && " (standart)"}</h3>
              <p className="muted small">{c.advertiser} · slotlar: {c.slots.join(", ")}{c.professions.length ? ` · kasblar: ${c.professions.join(", ")}` : ""}{c.districts.length ? ` · tumanlar: ${c.districts.join(", ")}` : ""} · og‘irlik {c.weight}
                {c.startsAt && ` · ${new Date(c.startsAt).toLocaleDateString("uz-UZ")}`}{c.endsAt && ` — ${new Date(c.endsAt).toLocaleDateString("uz-UZ")}`}</p></div>
            <div className="row" style={{ gap: 4 }}>
              <span className={`pill ${c.status === "active" ? "approved" : "draft"}`}>{c.status}</span>
              {c.status !== "active" && <form action={setCampaignStatus.bind(null, c.id, "active")}><button className="copy">Yoqish</button></form>}
              {c.status === "active" && !c.isFallback && <form action={setCampaignStatus.bind(null, c.id, "paused")}><button className="copy">To‘xtatish</button></form>}
            </div>
          </div>
          <div className="tbl-wrap"><table className="tbl">
            <thead><tr><th>Kreativ</th><th>Tur</th><th>Ko‘rish</th><th>Bosish</th><th>CTR</th><th /></tr></thead>
            <tbody>{creatives.filter((k) => k.campaignId === c.id).map((k) => {
              const st = sum(k.id);
              return (
                <tr key={k.id}>
                  <td><b>{k.title}</b><p className="muted small">{k.body} → {k.url}</p></td><td>{k.type}</td>
                  <td className="num">{st.imp}</td><td className="num">{st.clk}</td><td className="num">{st.imp ? ((st.clk / st.imp) * 100).toFixed(2) + "%" : "—"}</td>
                  <td><form action={toggleCreative.bind(null, k.id, !k.isActive)}><button className="copy">{k.isActive ? "O‘chirish" : "Yoqish"}</button></form></td>
                </tr>
              );
            })}</tbody>
          </table></div>
          <details>
            <summary className="link small">Kreativ qo‘shish</summary>
            <form action={createCreative} className="fields" style={{ marginTop: 12 }}>
              <input type="hidden" name="campaignId" value={c.id} />
              <div className="field"><label htmlFor={`cr-type-${c.id}`}>Tur</label><select className="inp" id={`cr-type-${c.id}`} name="type"><option value="text">Matnli</option><option value="image">Rasmli</option><option value="video">Video</option></select></div>
              <div className="field"><label htmlFor={`cr-title-${c.id}`}>Sarlavha (60)</label><input className="inp" id={`cr-title-${c.id}`} name="title" maxLength={60} required /></div>
              <div className="field"><label htmlFor={`cr-body-${c.id}`}>Matn (120)</label><input className="inp" id={`cr-body-${c.id}`} name="body" maxLength={120} /></div>
              <div className="field"><label htmlFor={`cr-cta-${c.id}`}>Tugma</label><input className="inp" id={`cr-cta-${c.id}`} name="cta" defaultValue="Batafsil" maxLength={24} /></div>
              <div className="field full"><label htmlFor={`cr-url-${c.id}`}>Havola</label><input className="inp" id={`cr-url-${c.id}`} name="url" type="url" required placeholder="https://" /></div>
              <div className="field"><label htmlFor={`cr-imgd-${c.id}`}>Rasm (desktop) URL</label><input className="inp" id={`cr-imgd-${c.id}`} name="imageDesktop" placeholder="/uploads/... yoki https://" /></div>
              <div className="field"><label htmlFor={`cr-imgm-${c.id}`}>Rasm (mobil) URL</label><input className="inp" id={`cr-imgm-${c.id}`} name="imageMobile" /></div>
              <div className="field"><label htmlFor={`cr-vid-${c.id}`}>Video URL (4–6 s, ovozsiz)</label><input className="inp" id={`cr-vid-${c.id}`} name="video" /></div>
              <div className="field" style={{ justifyContent: "end" }}><button className="btn sm">Qo‘shish</button></div>
            </form>
          </details>
        </div>
      ))}

      <form className="box" action={createCampaign}>
        <h3>Yangi kampaniya</h3>
        <div className="fields">
          <div className="field"><label htmlFor="cp-name">Nomi</label><input className="inp" id="cp-name" name="name" required /></div>
          <div className="field"><label htmlFor="cp-adv">Reklama beruvchi</label><input className="inp" id="cp-adv" name="advertiser" defaultValue="Adverto" required /></div>
          <div className="field full"><span>Slotlar</span><div className="checks">{Object.entries(SLOTS).map(([k, v]) => <label key={k}><input type="checkbox" name="slots" value={k} /> {k} · {v}</label>)}</div></div>
          <div className="field full"><span>Faqat shu kasblarda (bo‘sh = hammasi)</span><div className="checks">{PROFESSIONS.map((p) => <label key={p.slug}><input type="checkbox" name="professions" value={p.slug} /> {p.nameUz}</label>)}</div></div>
          <div className="field full"><span>Faqat shu tumanlarda (bo‘sh = hammasi)</span><div className="checks">{DISTRICTS.map((d) => <label key={d.slug}><input type="checkbox" name="districts" value={d.slug} /> {d.nameUz}</label>)}</div></div>
          <div className="field"><label htmlFor="cp-start">Boshlanish</label><input className="inp" id="cp-start" name="startsAt" type="date" /></div>
          <div className="field"><label htmlFor="cp-end">Tugash</label><input className="inp" id="cp-end" name="endsAt" type="date" /></div>
          <div className="field"><label htmlFor="cp-w">Og‘irlik (1–100)</label><input className="inp" id="cp-w" name="weight" type="number" min={1} max={100} defaultValue={1} /></div>
        </div>
        <div><button className="btn">Kampaniya yaratish</button></div>
        <p className="muted small">Kampaniya qoralama sifatida yaratiladi; kreativ qo‘shib, “Yoqish” bosing.</p>
      </form>
    </>
  );
}
