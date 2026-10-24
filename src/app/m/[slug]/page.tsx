import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProfile, getSimilar } from "@/lib/queries";
import { getUser } from "@/lib/auth";
import { ageFrom, kfmt, money, PLATFORM_LABELS, totalFollowers } from "@/lib/format";
import { LANGUAGES } from "@/lib/reference";
import { SITE } from "@/lib/site";
import { linkLabel, youtubeId } from "@/lib/limits";
import ProfileCard, { Placeholder } from "@/components/ProfileCard";
import Ad from "@/components/Ad";
import Bars from "@/components/Bars";
import { Verified } from "@/components/Icons";
import Contacts from "./Contacts";
import ReportButton from "./ReportButton";
import ViewBeacon from "./ViewBeacon";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  const user = await getUser();
  const p = await getProfile(slug, { includeUnapproved: true });
  if (!p) return null;
  const canPreview = !!user && (user.id === p.userId || user.role !== "specialist");
  if (p.status !== "approved" && !canPreview) return null;
  return p;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await load((await params).slug);
  if (!p) return {};
  const where = p.districts[0]?.nameUz ?? "Xorazm";
  return {
    title: `${p.fullName} — ${p.profession.nameUz.toLowerCase()}, ${where}`,
    description: p.bio.slice(0, 160) || `${p.profession.nameUz}, ${where}. Portfolio, narx va kontaktlar.`,
    alternates: { canonical: `/m/${p.slug}` },
    openGraph: { images: p.media.find((m) => m.type === "image")?.url ? [p.media.find((m) => m.type === "image")!.url] : undefined },
    robots: p.status === "approved" ? undefined : { index: false },
  };
}

export default async function ProfilePage({ params }: Props) {
  const p = await load((await params).slug);
  if (!p) notFound();
  const isBlogger = p.profession.slug === "bloger";
  const cover = p.media.find((m) => m.type === "image");
  const similar = await getSimilar(p.id, p.profession.slug, 3);
  const b = p.blogger;
  const plats = b ? Object.entries(b.followers).filter(([, v]) => v > 0) : [];
  const age = ageFrom(p.birthYear);
  const langs = p.languages.map((l) => LANGUAGES.find(([k]) => k === l)?.[1] ?? l).join(", ");
  const ctx = { profession: p.profession.slug, district: p.districts[0]?.slug };
  const statFresh = b?.statDate && Date.now() - new Date(b.statDate).getTime() < 60 * 86_400_000;

  const jsonLd = {
    "@context": "https://schema.org", "@type": "Person", name: p.fullName, jobTitle: p.profession.nameUz,
    address: { "@type": "PostalAddress", addressRegion: "Xorazm", addressLocality: p.districts[0]?.nameUz },
    url: `${SITE.url}/m/${p.slug}`, image: cover ? `${SITE.url}${cover.url}` : undefined,
  };

  return (
    <div className="view" style={{ gap: 28 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {p.status === "approved" ? <ViewBeacon profileId={p.id} /> : (
        <div className="notice">Bu profil hozir <b>{p.status === "pending" ? "tekshiruvda" : p.status}</b> — katalogda ko‘rinmaydi. Ko‘rinish faqat sizga.</div>
      )}
      <div className="crumbs">
        <Link className="link" href="/mutaxassislar">Mutaxassislar</Link> / <Link className="link" href={`/mutaxassislar/${p.profession.slug}`}>{p.profession.nameUz}</Link>
      </div>
      <div className="pf">
        <div className="pf-main">
          <div className="pf-head">
            <div className="ph">
              {cover ? <img src={cover.url} alt={p.fullName} /> : <Placeholder id={p.id} name={p.fullName} big />}
              {p.isFeatured && <span className="top">TOP</span>}
            </div>
            <div className="stack" style={{ gap: 10 }}>
              <p className="eyebrow">{p.profession.nameUz}{p.extraProfession ? ` · ${p.extraProfession.nameUz}` : ""} · {p.districts.map((d) => d.nameUz).join(", ")}</p>
              <h1>{p.fullName} {p.verifiedAt && <Verified />}</h1>
              {!p.isAvailable && <p className="busy">Hozir band — keyinroq murojaat qiling</p>}
              <p className="muted" style={{ maxWidth: "60ch" }}>{p.bio}</p>
              <div className="tags">{p.tags.map((t) => <span key={t} className="tg">{t}</span>)}</div>
            </div>
          </div>

          {isBlogger && b ? (
            <>
              <div className="kv">
                <div><span>Jami obunachi</span><b className="num">{kfmt(totalFollowers(b.followers))}</b><span>{plats.length} ta platforma</span></div>
                <div><span>ER (faollik)</span><b className="num">{b.er ?? "—"}%</b><span>oxirgi 30 kun</span></div>
                <div><span>O‘rtacha reels</span><b className="num">{b.avgViews ? kfmt(b.avgViews) : "—"}</b><span>ko‘rish</span></div>
                <div><span>Stories qamrovi</span><b className="num">{b.storiesReach ? kfmt(b.storiesReach) : "—"}</b><span>bitta stories</span></div>
              </div>
              <section className="box">
                <h3>Auditoriya</h3>
                <div className="plats">{plats.map(([k, v]) => <div key={k}><span>{PLATFORM_LABELS[k] ?? k}</span><b className="num">{kfmt(v)}</b></div>)}</div>
                {b.audience && (
                  <div className="aud3">
                    <div><p className="eyebrow">Jins</p><Bars rows={[["Ayollar", b.audience.gender.f], ["Erkaklar", b.audience.gender.m]]} /></div>
                    <div><p className="eyebrow">Yosh</p><Bars rows={b.audience.ages} /></div>
                    <div><p className="eyebrow">Shaharlar</p><Bars rows={b.audience.cities} /></div>
                  </div>
                )}
                <p className="muted small">
                  {b.verifiedAt && statFresh ? "✓ Statistika moderator tomonidan skrinshotlar bilan solishtirilgan" : "Statistika bloger tomonidan kiritilgan, tasdiqlanmagan"}
                  {b.statDate ? `, ${new Date(b.statDate).toLocaleDateString("uz-UZ")} holatiga.` : "."}
                </p>
              </section>
              {b.rates.length > 0 && (
                <section className="box">
                  <h3>Reklama narxlari</h3>
                  <dl className="spec">{b.rates.flatMap(([k, v]) => [<dt key={k + "t"}>{k}</dt>, <dd key={k + "d"} className="num">{money(v)} so‘m</dd>])}</dl>
                  <p className="muted small">{b.topics && `Mavzular: ${b.topics}.`}{b.noAds && ` Reklama qilmaydi: ${b.noAds}.`}</p>
                </section>
              )}
            </>
          ) : (
            <>
              <div className="kv">
                <div><span>Narx</span><b className="num">{p.price ? money(p.price) : "Kelishiladi"}</b><span>{p.price ? `so‘m / ${p.profession.unit}${p.priceNegotiable ? ", kelishiladi" : ""}` : ""}</span></div>
                <div><span>Tajriba</span><b className="num">{p.experienceYears} yil</b><span>{age ? `${age} yosh` : ""}</span></div>
                <div><span>Tillar</span><b style={{ fontSize: 16 }}>{langs || "—"}</b><span /></div>
                <div><span>Hudud</span><b style={{ fontSize: 16 }}>{p.districts.length} ta tuman</b><span /></div>
              </div>
              {p.profession.fieldsSchema.some((f) => p.extra[f.key]) && (
                <section className="box">
                  <h3>Ma’lumotlar</h3>
                  <dl className="spec">
                    {p.profession.fieldsSchema.filter((f) => p.extra[f.key]).map((f) => (
                      [<dt key={f.key + "t"}>{f.label}</dt>,
                       <dd key={f.key + "d"}>{f.type === "url" ? <a className="link" href={p.extra[f.key]} target="_blank" rel="noopener nofollow">{p.extra[f.key]}</a> : p.extra[f.key]}</dd>]
                    ))}
                  </dl>
                </section>
              )}
            </>
          )}

          {p.media.length > 0 && (
            <section className="box">
              <h3>{isBlogger ? "Reklama namunalari" : "Portfolio"}</h3>
              <div className="port">
                {p.media.map((m) => m.type === "image"
                  ? <a key={m.id} href={m.url} target="_blank" rel="noopener"><img src={m.thumbUrl ?? m.url} alt="" loading="lazy" /></a>
                  : <video key={m.id} src={m.url} controls preload="none" playsInline />)}
              </div>
            </section>
          )}

          {p.videoLinks.length > 0 && (
            <section className="box">
              <h3>{isBlogger ? "Reklama videolari" : "Showreel va ishlar"}</h3>
              <div className="vids">
                {p.videoLinks.map((url) => {
                  const yt = youtubeId(url);
                  return yt ? (
                    <iframe key={url} src={`https://www.youtube-nocookie.com/embed/${yt}`} title="YouTube video" loading="lazy"
                      allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                  ) : null;
                })}
              </div>
              <div className="row">
                {p.videoLinks.filter((u) => !youtubeId(u)).map((url) => (
                  <a key={url} className="btn ghost sm" href={url} target="_blank" rel="noopener nofollow">{linkLabel(url)}da ko‘rish ↗</a>
                ))}
              </div>
            </section>
          )}

          <Ad slot="A3b" variant="banner" ctx={ctx} />

          {similar.length > 0 && (
            <section>
              <div className="sec-head"><h2 style={{ fontSize: 28 }}>O‘xshash profillar</h2></div>
              <div className="grid three">{similar.map((s) => <ProfileCard key={s.id} p={s} />)}</div>
            </section>
          )}
        </div>

        <div className="side">
          <section className="box">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <h3>{isBlogger ? "Reklama uchun adminlar" : "Kontaktlar"}</h3><span className="tg" style={{ fontWeight: 600 }}>Bepul</span>
            </div>
            {p.status === "approved" ? <Contacts profileId={p.id} /> : <p className="muted small">Kontaktlar profil tasdiqlangach ko‘rinadi.</p>}
            <p className="muted small">Murojaat qilganda “Xorazm Media orqali topdim” deb yozing.</p>
            <ReportButton profileId={p.id} />
          </section>
          <Ad slot="A3" variant="side" ctx={ctx} />
        </div>
      </div>
    </div>
  );
}
