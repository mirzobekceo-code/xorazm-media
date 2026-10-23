"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { FieldDef } from "@/db/schema";
import { LANGUAGES } from "@/lib/reference";
import { AGE_GROUPS, emptyBlogger, emptyInput, PLATFORMS, RATE_LABELS, type ProfileInputT } from "@/lib/profile-input";
import { PLATFORM_LABELS } from "@/lib/format";
import {
  deleteMediaAction, registerVideoAction, requestCodeAction, saveProfileAction, setCoverAction, submitAction, uploadMediaAction,
  uploadModeAction, verifyCodeAction,
} from "@/app/actions";
import { upload as blobUpload } from "@vercel/blob/client";
import { ProfIcon } from "./Icons";
import type { UploadLimits } from "@/lib/limits";
import TelegramButton from "./TelegramButton";

type Prof = { slug: string; nameUz: string; description: string; icon: string; unit: string; fieldsSchema: FieldDef[] };
type MediaItem = { id: number; url: string; thumbUrl: string | null; type: "image" | "video"; isCover: boolean; isStatScreenshot: boolean; moderationStatus: string };

const STEPS = ["Yo‘nalish", "Asosiy ma’lumot", "Kasbga oid", "Aloqa", "Portfolio"];
const DRAFT_KEY = "xm-signup-draft";
const MOD_LABEL: Record<string, string> = { pending: "Tekshiruvda", approved: "Tasdiqlangan", rejected: "Rad etilgan" };

export default function ProfileWizard(props: {
  mode: "signup" | "edit";
  professions: Prof[];
  districts: [string, string][];
  initial: ProfileInputT | null;
  loggedIn: boolean;
  media: MediaItem[];
  limits: UploadLimits;
  telegram: boolean;
  sms: boolean;
  /** Tahrirlashda: qoralama yoki rad etilgan profil oxirida tekshiruvga yuboriladi */
  submitOnFinish?: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState(props.mode === "edit" ? 1 : 0);
  const [v, setV] = useState<ProfileInputT>(props.initial ?? emptyInput());
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const [loggedIn, setLoggedIn] = useState(props.loggedIn);
  const [otp, setOtp] = useState<{ phone: string; sent: boolean; code: string }>({ phone: "", sent: false, code: "" });
  const [media, setMedia] = useState<MediaItem[]>(props.media);
  const [uploading, setUploading] = useState(0);

  const prof = useMemo(() => props.professions.find((p) => p.slug === v.profession), [v.profession, props.professions]);
  const isBlogger = v.profession === "bloger";

  // Ro'yxatdan o'tish qoralamasi brauzerda saqlanadi
  useEffect(() => {
    if (props.mode !== "signup" || props.initial) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) setV({ ...emptyInput(), ...JSON.parse(raw) });
    } catch {}
  }, [props.mode, props.initial]);
  useEffect(() => {
    if (props.mode !== "signup") return;
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(v)); } catch {}
  }, [v, props.mode]);

  const set = <K extends keyof ProfileInputT>(k: K, val: ProfileInputT[K]) => setV((x) => ({ ...x, [k]: val }));
  const b = v.blogger ?? emptyBlogger();
  const setB = (patch: Partial<typeof b>) => setV((x) => ({ ...x, blogger: { ...(x.blogger ?? emptyBlogger()), ...patch } }));

  function check(): string {
    if (step === 0 && !v.profession) return "Yo‘nalishni tanlang";
    if (step === 1) {
      if ((v.fullName ?? "").trim().length < 3) return "To‘liq ismni yozing";
      if (!v.birthYear) return "Tug‘ilgan yilni yozing";
      if (!v.districts?.length) return "Kamida bitta tuman tanlang";
      if (!v.languages?.length) return "Kamida bitta til tanlang";
    }
    if (step === 2) {
      for (const f of prof?.fieldsSchema ?? []) if (f.required && !v.extra?.[f.key]) return `“${f.label}” maydonini to‘ldiring`;
      if (isBlogger && !Object.values(b.followers).some((n) => Number(n) > 0)) return "Kamida bitta platformadagi obunachilar sonini yozing";
    }
    if (step === 3) {
      if (!v.consent) return "Kontaktlar ochiq ko‘rinishiga rozilik bering";
      if (isBlogger && !b.admins.every((a) => a.name && a.phone)) return "Admin ismi va telefonini yozing";
      if (!loggedIn) return "Telefon raqamingizni SMS kod bilan tasdiqlang";
    }
    return "";
  }

  function next() {
    const e = check();
    setError(e);
    if (e) return;
    if (step === 3) {
      start(async () => {
        const r = await saveProfileAction({ ...v, blogger: isBlogger ? b : undefined });
        if (!r.ok) return setError(r.error);
        if (props.mode === "signup") try { localStorage.removeItem(DRAFT_KEY); } catch {}
        setStep(4);
        window.scrollTo({ top: 0 });
      });
      return;
    }
    setStep((x) => x + 1);
    window.scrollTo({ top: 0 });
  }

  async function sendCode() {
    setError("");
    const r = await requestCodeAction(otp.phone);
    if (!r.ok) return setError(r.error);
    setOtp((o) => ({ ...o, sent: true }));
  }
  async function confirmCode() {
    setError("");
    const r = await verifyCodeAction(otp.phone, otp.code);
    if (!r.ok) return setError(r.error);
    setLoggedIn(true);
    if (!v.contacts?.phone) set("contacts", { ...v.contacts!, phone: otp.phone });
    router.refresh();
  }

  async function upload(files: FileList | null, stat = false) {
    if (!files?.length) return;
    setError("");
    const list = Array.from(files); // FileList input tozalanganda bo'shab qoladi — await'dan oldin nusxalash
    const mode = await uploadModeAction();
    for (const file of list) {
      setUploading((n) => n + 1);
      let r: Awaited<ReturnType<typeof uploadMediaAction>>;
      try {
        const vErr = file.type.startsWith("video/") ? await checkVideo(file, props.limits) : "";
        if (vErr) {
          r = { ok: false, error: vErr };
        } else if (file.type.startsWith("video/") && mode.directVideo && mode.profileId) {
          // Katta video server orqali o'tmaydi: to'g'ridan-to'g'ri Blob'ga
          const ext = file.type === "video/quicktime" ? "mov" : "mp4";
          const blob = await blobUpload(`uploads/p/${mode.profileId}/video.${ext}`, file, { access: "public", handleUploadUrl: "/api/v1/me/media/upload" });
          r = await registerVideoAction(blob.url);
        } else {
          const fd = new FormData();
          fd.set("file", file.type.startsWith("image/") ? await shrinkImage(file) : file);
          if (stat) fd.set("stat", "1");
          r = await uploadMediaAction(fd);
        }
      } catch (e) {
        r = { ok: false, error: e instanceof Error ? e.message : "Yuklab bo‘lmadi" };
      }
      setUploading((n) => n - 1);
      if (!r.ok) { setError(`${file.name}: ${r.error}`); continue; }
      setMedia((m) => [...m, { id: r.id, url: r.url, thumbUrl: r.thumbUrl, type: r.type, isCover: false, isStatScreenshot: stat, moderationStatus: "pending" }]);
    }
  }

  function finish() {
    setError("");
    start(async () => {
      if (props.mode === "edit" && !props.submitOnFinish) { router.push("/kabinet"); router.refresh(); return; }
      const r = await submitAction();
      if (!r.ok) return setError(r.error);
      try { localStorage.removeItem(DRAFT_KEY); } catch {}
      router.push("/kabinet?yuborildi=1");
      router.refresh();
    });
  }

  const field = (id: string, label: string, el: React.ReactNode, opts: { full?: boolean; hint?: string } = {}) => (
    <div className={`field${opts.full ? " full" : ""}`}>
      <label htmlFor={id}>{label}</label>{el}{opts.hint && <small>{opts.hint}</small>}
    </div>
  );
  const portfolio = media.filter((m) => !m.isStatScreenshot);
  const shots = media.filter((m) => m.isStatScreenshot);

  return (
    <div className="su">
      <div className="steps" aria-label="Qadamlar">
        {STEPS.map((s, i) => (
          <div key={s} className={i === step ? "on" : i < step ? "done" : ""}><i>{i < step ? "✓" : i + 1}</i><span>{s}</span></div>
        ))}
      </div>

      <form className="form" noValidate onSubmit={(e) => { e.preventDefault(); if (step < 4) next(); else finish(); }}>
        <div><p className="eyebrow">{step + 1} / 5</p><h2>{[
          "Qaysi yo‘nalishda ishlaysiz?", "Asosiy ma’lumot", isBlogger ? "Auditoriya va narxlar" : `${prof?.nameUz ?? ""} sifatida`,
          "Aloqa", isBlogger ? "Statistika va namunalar" : "Portfolio",
        ][step]}</h2></div>

        {step === 0 && (
          <div className="kasb">
            {props.professions.map((p) => (
              <label key={p.slug} htmlFor={`k-${p.slug}`}>
                <input type="radio" name="kasb" id={`k-${p.slug}`} value={p.slug} checked={v.profession === p.slug}
                  onChange={() => setV((x) => ({ ...x, profession: p.slug, extra: {}, blogger: p.slug === "bloger" ? x.blogger ?? emptyBlogger() : undefined }))} />
                <ProfIcon svg={p.icon} />
                <div><b>{p.nameUz}</b><br /><small>{p.description}</small></div>
              </label>
            ))}
          </div>
        )}

        {step === 1 && (
          <div className="fields">
            {field("s-name", "To‘liq ism *", <input className="inp" id="s-name" value={v.fullName} onChange={(e) => set("fullName", e.target.value)} autoComplete="name" />, { full: true })}
            {field("s-year", "Tug‘ilgan yil *", <input className="inp" id="s-year" inputMode="numeric" value={String(v.birthYear ?? "")} onChange={(e) => set("birthYear", e.target.value.replace(/\D/g, "").slice(0, 4) as unknown as number)} />, { hint: "Profilda faqat yosh ko‘rinadi" })}
            <div className="field"><span>Jins</span>
              <div className="checks">
                {([["f", "Ayol"], ["m", "Erkak"]] as const).map(([k, l]) => (
                  <label key={k}><input type="radio" name="gender" id={`s-g-${k}`} checked={v.gender === k} onChange={() => set("gender", k)} /> {l}</label>
                ))}
              </div>
            </div>
            <div className="field full"><span>Tillar *</span>
              <div className="checks">
                {LANGUAGES.map(([k, l]) => (
                  <label key={k}><input type="checkbox" id={`s-l-${k}`} checked={v.languages?.includes(k as "uz") ?? false}
                    onChange={(e) => set("languages", e.target.checked ? [...(v.languages ?? []), k as "uz"] : (v.languages ?? []).filter((x) => x !== k))} /> {l}</label>
                ))}
              </div>
            </div>
            <div className="field full"><span>Qaysi tumanlarda ishlaysiz? *</span>
              <div className="checks">
                {props.districts.map(([slug, name]) => (
                  <label key={slug}><input type="checkbox" id={`s-t-${slug}`} checked={v.districts?.includes(slug) ?? false}
                    onChange={(e) => set("districts", e.target.checked ? [...(v.districts ?? []), slug] : (v.districts ?? []).filter((x) => x !== slug))} /> {name}</label>
                ))}
              </div>
            </div>
            {field("s-bio", "O‘zingiz haqingizda", <textarea className="inp" id="s-bio" rows={3} maxLength={500} value={v.bio} onChange={(e) => set("bio", e.target.value)} />, { full: true, hint: `2–3 gap. Mijoz birinchi shuni o‘qiydi. ${(v.bio ?? "").length}/500` })}
            {field("s-tags", "Teglar", <input className="inp" id="s-tags" value={String(v.tags ?? "")} onChange={(e) => set("tags", e.target.value)} placeholder="Beauty, Reels, Dron" />, { hint: "Vergul bilan, 5 tagacha" })}
            {field("s-extra", "Qo‘shimcha yo‘nalish", (
              <select className="inp" id="s-extra" value={v.extraProfession ?? ""} onChange={(e) => set("extraProfession", e.target.value)}>
                <option value="">Yo‘q</option>
                {props.professions.filter((p) => p.slug !== v.profession && p.slug !== "bloger").map((p) => <option key={p.slug} value={p.slug}>{p.nameUz}</option>)}
              </select>
            ), { hint: "Masalan, operator ham montajor bo‘lsa" })}
          </div>
        )}

        {step === 2 && !isBlogger && (
          <div className="fields">
            {prof?.fieldsSchema.map((f) => field(`s-x-${f.key}`, f.label + (f.required ? " *" : ""), (
              <input className="inp" id={`s-x-${f.key}`} type={f.type === "number" ? "text" : f.type} inputMode={f.type === "number" ? "numeric" : undefined}
                placeholder={f.placeholder} value={v.extra?.[f.key] ?? ""} onChange={(e) => set("extra", { ...v.extra, [f.key]: e.target.value })} />
            )))}
            {field("s-exp", "Tajriba (yil)", <input className="inp" id="s-exp" inputMode="numeric" value={String(v.experienceYears ?? 0)} onChange={(e) => set("experienceYears", Number(e.target.value.replace(/\D/g, "") || 0))} />)}
            {field("s-price", `Narx (so‘m / ${prof?.unit})`, <input className="inp" id="s-price" inputMode="numeric" value={v.price ? String(v.price) : ""} onChange={(e) => set("price", (Number(e.target.value.replace(/\D/g, "")) || undefined) as number)} placeholder="Bo‘sh qoldirsangiz: kelishiladi" />)}
            <div className="field"><span>Narx kelishiladimi?</span>
              <div className="checks"><label><input type="checkbox" id="s-neg" checked={!!v.priceNegotiable} onChange={(e) => set("priceNegotiable", e.target.checked)} /> Ha, kelishiladi</label></div>
            </div>
          </div>
        )}

        {step === 2 && isBlogger && (
          <div className="stack" style={{ gap: 22 }}>
            <div className="fields">
              {PLATFORMS.map((p) => field(`b-f-${p}`, `${PLATFORM_LABELS[p]} obunachilar`, (
                <input className="inp" id={`b-f-${p}`} inputMode="numeric" value={b.followers[p] ? String(b.followers[p]) : ""}
                  onChange={(e) => setB({ followers: { ...b.followers, [p]: Number(e.target.value.replace(/\D/g, "")) || 0 } })} />
              )))}
              {field("b-er", "ER (faollik), %", <input className="inp" id="b-er" inputMode="decimal" value={b.er ?? ""} onChange={(e) => setB({ er: (e.target.value.replace(",", ".") || undefined) as unknown as number })} />, { hint: "Insights: oxirgi 30 kun" })}
              {field("b-views", "O‘rtacha reels ko‘rishi", <input className="inp" id="b-views" inputMode="numeric" value={b.avgViews ?? ""} onChange={(e) => setB({ avgViews: (Number(e.target.value.replace(/\D/g, "")) || undefined) as number })} />)}
              {field("b-reach", "Bitta stories qamrovi", <input className="inp" id="b-reach" inputMode="numeric" value={b.storiesReach ?? ""} onChange={(e) => setB({ storiesReach: (Number(e.target.value.replace(/\D/g, "")) || undefined) as number })} />)}
              {field("b-exp", "Blogerlik tajribasi (yil)", <input className="inp" id="b-exp" inputMode="numeric" value={String(v.experienceYears ?? 0)} onChange={(e) => set("experienceYears", Number(e.target.value.replace(/\D/g, "") || 0))} />)}
            </div>
            <div className="fields">
              {field("b-gf", `Auditoriya: ayollar ${b.genderF}% · erkaklar ${100 - Number(b.genderF)}%`,
                <input id="b-gf" type="range" min={0} max={100} value={b.genderF} onChange={(e) => setB({ genderF: Number(e.target.value) })} />, { full: true })}
              {AGE_GROUPS.map((g, i) => field(`b-age-${i}`, `Yosh ${g}, %`, (
                <input className="inp" id={`b-age-${i}`} inputMode="numeric" value={b.ages[i]} onChange={(e) => { const a = [...b.ages]; a[i] = Number(e.target.value.replace(/\D/g, "")) || 0; setB({ ages: a }); }} />
              )))}
              {b.cities.map(([c, n], i) => (
                <div className="field" key={i}>
                  <label htmlFor={`b-city-${i}`}>Shahar {i + 1} va %</label>
                  <div className="row" style={{ flexWrap: "nowrap" }}>
                    <input className="inp" id={`b-city-${i}`} value={c} onChange={(e) => { const x = b.cities.map((r) => [...r] as [string, number]); x[i][0] = e.target.value; setB({ cities: x }); }} />
                    <input className="inp" style={{ width: 80 }} aria-label="foiz" inputMode="numeric" value={n} onChange={(e) => { const x = b.cities.map((r) => [...r] as [string, number]); x[i][1] = Number(e.target.value.replace(/\D/g, "")) || 0; setB({ cities: x }); }} />
                  </div>
                </div>
              ))}
              {b.cities.length < 4 && <div className="field" style={{ justifyContent: "end" }}><button type="button" className="btn ghost sm" onClick={() => setB({ cities: [...b.cities, ["", 0]] })}>+ Shahar</button></div>}
            </div>
            <div className="fields">
              {RATE_LABELS.map((l, i) => field(`b-rate-${i}`, `${l}, so‘m`, (
                <input className="inp" id={`b-rate-${i}`} inputMode="numeric" value={b.rates[i] ? String(b.rates[i]) : ""}
                  onChange={(e) => { const r = [...b.rates]; r[i] = Number(e.target.value.replace(/\D/g, "")) || 0; setB({ rates: r }); if (i === 0) set("price", r[0] || undefined as unknown as number); }} />
              )))}
              {field("b-topics", "Mavzular", <input className="inp" id="b-topics" value={b.topics} onChange={(e) => setB({ topics: e.target.value })} placeholder="Lifestyle, oila, taomlar" />)}
              {field("b-noads", "Reklama qilmaydigan mavzular", <input className="inp" id="b-noads" value={b.noAds} onChange={(e) => setB({ noAds: e.target.value })} placeholder="Kazino, mikroqarz" />)}
            </div>
            <p className="muted small">Raqamlarni 5-qadamda yuklaydigan Instagram Insights skrinshotlari bilan moderator solishtiradi.</p>
          </div>
        )}

        {step === 2 && (
          <div className="field">
            <label htmlFor="s-vlinks">{isBlogger ? "Reklama namunalari havolalari" : "Showreel va ishlaringiz havolalari"}</label>
            <textarea className="inp" id="s-vlinks" rows={3} value={String(v.videoLinks ?? "")} onChange={(e) => set("videoLinks", e.target.value)}
              placeholder={"https://youtube.com/watch?v=...\nhttps://instagram.com/reel/..."} />
            <small>Har qatorda bitta havola, {props.limits.videoLinks} tagacha: YouTube, Instagram, TikTok, Vimeo, Telegram, Google Drive. YouTube videolari profilda shu yerning o‘zida ochiladi.</small>
          </div>
        )}

        {step === 3 && (
          <div className="stack" style={{ gap: 22 }}>
            <div className="fields">
              {!isBlogger && field("c-phone", "Kontakt telefoni", <input className="inp" id="c-phone" type="tel" value={v.contacts?.phone ?? ""} onChange={(e) => set("contacts", { ...v.contacts!, phone: e.target.value })} placeholder="+998 90 123 45 67" />, { hint: "Bo‘sh qolsa, tasdiqlangan raqam ishlatiladi" })}
              {!isBlogger && field("c-tg", "Telegram", <input className="inp" id="c-tg" value={v.contacts?.telegram ?? ""} onChange={(e) => set("contacts", { ...v.contacts!, telegram: e.target.value })} placeholder="@username" />)}
              {field("c-ig", isBlogger ? "Instagram sahifangiz" : "Instagram", <input className="inp" id="c-ig" value={v.contacts?.instagram ?? ""} onChange={(e) => set("contacts", { ...v.contacts!, instagram: e.target.value })} placeholder="@username" />)}
            </div>
            {isBlogger && (
              <div className="stack">
                <div><b>Reklama bo‘yicha adminlar</b><p className="muted small">Brendlar shu raqamlarga yozadi. Shaxsiy raqamingiz ko‘rsatilmaydi.</p></div>
                {b.admins.map((a, i) => (
                  <div className="fields" key={i} style={{ paddingTop: 12, borderTop: "1px solid var(--line)" }}>
                    {field(`a-name-${i}`, "Admin ismi *", <input className="inp" id={`a-name-${i}`} value={a.name} onChange={(e) => { const x = [...b.admins]; x[i] = { ...a, name: e.target.value }; setB({ admins: x }); }} />)}
                    {field(`a-role-${i}`, "Vazifasi", <input className="inp" id={`a-role-${i}`} value={a.role ?? ""} onChange={(e) => { const x = [...b.admins]; x[i] = { ...a, role: e.target.value }; setB({ admins: x }); }} />)}
                    {field(`a-phone-${i}`, "Telefon *", <input className="inp" id={`a-phone-${i}`} type="tel" value={a.phone} onChange={(e) => { const x = [...b.admins]; x[i] = { ...a, phone: e.target.value }; setB({ admins: x }); }} />)}
                    {field(`a-tg-${i}`, "Telegram", <input className="inp" id={`a-tg-${i}`} value={a.telegram ?? ""} onChange={(e) => { const x = [...b.admins]; x[i] = { ...a, telegram: e.target.value }; setB({ admins: x }); }} />)}
                    {b.admins.length > 1 && <div className="field"><button type="button" className="link small" onClick={() => setB({ admins: b.admins.filter((_, j) => j !== i) })}>Adminni olib tashlash</button></div>}
                  </div>
                ))}
                {b.admins.length < 3 && <div><button type="button" className="btn ghost sm" onClick={() => setB({ admins: [...b.admins, { name: "", role: "Reklama bo‘yicha admin", phone: "", telegram: "" }] })}>+ Admin qo‘shish</button></div>}
              </div>
            )}
            <div className="checks">
              <label><input type="checkbox" id="c-consent" checked={!!v.consent} onChange={(e) => set("consent", e.target.checked as true)} /> Kontaktlarim profilda hammaga ochiq ko‘rinishiga roziman. <a className="link" href="/shartlar" target="_blank">Shartlar</a></label>
            </div>
            {!loggedIn && (
              <div className="box" style={{ background: "var(--bg)" }}>
                <b>Telefon raqamingizni tasdiqlang</b>
                <p className="muted small">Shu raqam bilan keyin kabinetga kirasiz.</p>
                {props.telegram && (
                  <>
                    <TelegramButton mode="login" label="Telegram orqali tasdiqlash" onDone={() => { setLoggedIn(true); router.refresh(); }} />
                    {props.sms && <p className="muted small">yoki SMS kod orqali:</p>}
                  </>
                )}
                {(props.sms || !props.telegram) && <>
                <div className="row" style={{ flexWrap: "nowrap" }}>
                  <input className="inp" id="otp-phone" type="tel" autoComplete="tel" placeholder="+998 90 123 45 67" value={otp.phone} onChange={(e) => setOtp({ ...otp, phone: e.target.value })} />
                  <button type="button" className="btn ghost" onClick={sendCode}>{otp.sent ? "Qayta yuborish" : "Kod olish"}</button>
                </div>
                {otp.sent && (
                  <div className="row" style={{ flexWrap: "nowrap" }}>
                    <input className="inp" id="otp-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="6 xonali kod" value={otp.code} onChange={(e) => setOtp({ ...otp, code: e.target.value.replace(/\D/g, "") })} />
                    <button type="button" className="btn" onClick={confirmCode}>Tasdiqlash</button>
                  </div>
                )}
                </>}
              </div>
            )}
            {loggedIn && props.mode === "signup" && <p className="ok">✓ Telefon tasdiqlangan</p>}
          </div>
        )}

        {step === 4 && (
          <div className="stack" style={{ gap: 22 }}>
            {isBlogger && (
              <div className="stack">
                <b>Instagram Insights skrinshotlari</b>
                <p className="muted small">Auditoriya (jins, yosh, shaharlar) va oxirgi 30 kun qamrovi. Faqat moderator ko‘radi.</p>
                <Thumbs items={shots} onDelete={async (id) => { await deleteMediaAction(id); setMedia((m) => m.filter((x) => x.id !== id)); }} />
                <label className="btn ghost sm" htmlFor="up-stat" style={{ alignSelf: "flex-start" }}>Skrinshot yuklash</label>
                <input id="up-stat" type="file" accept="image/*" multiple hidden onChange={(e) => { upload(e.target.files, true); e.target.value = ""; }} />
              </div>
            )}
            <div className="drop">
              <b style={{ color: "var(--ink)" }}>{isBlogger ? "Reklama namunalari: rasm va video" : "Rasm va videolar"}</b>
              <span className="small">
                Rasm: {props.limits.images} tagacha, avtomatik kichraytiriladi · kamida 1 ta
                {props.limits.videos > 0
                  ? ` · Video: ${props.limits.videos} tagacha, ${props.limits.videoSeconds} soniya va ${props.limits.videoMb} MB gacha (MP4, MOV)`
                  : " · Videolarni 3-qadamda havola sifatida qo‘shing"}
              </span>
              <label className="btn ghost sm" htmlFor="up-media" style={{ cursor: "pointer" }}>Fayl tanlash</label>
              <input id="up-media" type="file" accept={props.limits.videos > 0 ? "image/*,video/mp4,video/quicktime" : "image/*"} multiple hidden onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
            </div>
            {uploading > 0 && <p className="muted small">Yuklanmoqda: {uploading} ta fayl…</p>}
            <Thumbs items={portfolio} onDelete={async (id) => { await deleteMediaAction(id); setMedia((m) => m.filter((x) => x.id !== id)); }}
              onCover={async (id) => { await setCoverAction(id); setMedia((m) => m.map((x) => ({ ...x, isCover: x.id === id }))); }} />
          </div>
        )}

        {error && <p className="err" role="alert">{error}</p>}
        <div className="act">
          <button type="button" className="btn ghost" style={{ visibility: step === 0 || (props.mode === "edit" && step === 1) ? "hidden" : "visible" }} onClick={() => { setError(""); setStep((x) => x - 1); }}>Orqaga</button>
          <button type="submit" className="btn" disabled={pending || uploading > 0}>
            {step < 3 ? "Davom etish" : step === 3 ? (pending ? "Saqlanmoqda…" : "Saqlash va davom etish") : props.mode === "edit" && !props.submitOnFinish ? "Tayyor" : pending ? "Yuborilmoqda…" : "Tekshiruvga yuborish"}
          </button>
        </div>
      </form>
    </div>
  );
}

/** Video davomiyligi va hajmini yuklashdan oldin tekshiradi. */
async function checkVideo(file: File, limits: UploadLimits): Promise<string> {
  if (limits.videos === 0) return "Video yuklash hozircha o‘chirilgan — YouTube yoki Instagram havolasini 3-qadamda qo‘shing";
  if (file.size > limits.videoMb * 1024 * 1024) return `video ${limits.videoMb} MB dan katta`;
  const seconds = await new Promise<number>((resolve) => {
    const el = document.createElement("video");
    el.preload = "metadata";
    el.onloadedmetadata = () => { resolve(el.duration); URL.revokeObjectURL(el.src); };
    el.onerror = () => resolve(0); // o'qib bo'lmasa (masalan, ba'zi MOV) hajm limiti yetarli
    el.src = URL.createObjectURL(file);
  });
  if (seconds > limits.videoSeconds + 1) return `video ${Math.round(seconds)} soniya, ko‘pi bilan ${limits.videoSeconds} soniya`;
  return "";
}

/**
 * Rasmni brauzerda 2000px gacha kichraytiradi (serverga so'rov hajmi cheklangan).
 * Brauzer o'qiy olmaydigan format (masalan, HEIC) bo'lsa, asl fayl yuboriladi.
 */
async function shrinkImage(file: File): Promise<File> {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 3_000_000) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/webp", 0.88));
    return blob ? new File([blob], file.name.replace(/\.\w+$/, "") + ".webp", { type: "image/webp" }) : file;
  } catch {
    return file;
  }
}

function Thumbs({ items, onDelete, onCover }: { items: MediaItem[]; onDelete: (id: number) => void; onCover?: (id: number) => void }) {
  if (!items.length) return null;
  return (
    <div className="thumbs">
      {items.map((m) => (
        <div className="thumb" key={m.id}>
          {m.type === "image" ? <img src={m.thumbUrl ?? m.url} alt="" /> : <video src={m.url} muted playsInline />}
          <span className="st">{m.isCover ? "Muqova" : MOD_LABEL[m.moderationStatus] ?? m.moderationStatus}</span>
          <button type="button" aria-label="O‘chirish" onClick={() => onDelete(m.id)}>×</button>
          {onCover && m.type === "image" && !m.isCover && (
            <button type="button" aria-label="Muqova qilish" title="Muqova qilish" style={{ right: 36 }} onClick={() => onCover(m.id)}>★</button>
          )}
        </div>
      ))}
    </div>
  );
}
