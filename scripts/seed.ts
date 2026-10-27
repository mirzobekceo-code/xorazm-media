/**
 * Ma'lumotnomalar va standart Adverto reklamasini yozadi.
 *   npm run db:seed           — kasblar, tumanlar, reklama
 *   npm run db:seed -- --demo — qo'shimcha namuna profillar (faqat lokal sinov uchun)
 */
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { getDb, schema as s } from "../src/db";
import { PROFESSIONS, DISTRICTS } from "../src/lib/reference";
import { slugify } from "../src/lib/format";

async function main() {
  const db = await getDb();

  for (const [i, p] of PROFESSIONS.entries()) {
    await db.insert(s.professions).values({
      slug: p.slug, nameUz: p.nameUz, nameRu: p.nameRu, description: p.description,
      unit: p.unit, icon: p.icon, fieldsSchema: p.fields, sortOrder: i,
    }).onConflictDoUpdate({
      target: s.professions.slug,
      set: { nameUz: p.nameUz, nameRu: p.nameRu, description: p.description, unit: p.unit, icon: p.icon, fieldsSchema: p.fields, sortOrder: i },
    });
  }
  for (const [i, d] of DISTRICTS.entries()) {
    await db.insert(s.districts).values({ ...d, sortOrder: i })
      .onConflictDoUpdate({ target: s.districts.slug, set: { nameUz: d.nameUz, nameRu: d.nameRu, sortOrder: i } });
  }

  const AD = {
    title: "Biznesingiz uchun sotib olishga tayyor mijozlar kerakmi?",
    body: "Adverto — Xorazmdagi bizneslar uchun mas’uliyatli marketing jamoasi",
    cta: "Bog‘lanish", url: "https://t.me/mirzobek_bozorov",
  };
  const [fallback] = await db.select().from(s.adCampaigns).where(eq(s.adCampaigns.isFallback, true)).limit(1);
  if (!fallback) {
    const [c] = await db.insert(s.adCampaigns).values({
      name: "Adverto — standart", advertiser: "Adverto", isFallback: true, status: "active",
      slots: ["A1", "A2", "A3", "A3b", "A5", "A6"],
    }).returning();
    await db.insert(s.adCreatives).values({ campaignId: c.id, ...AD });
  } else {
    // Eski standart matnlar yangisiga almashtiriladi (admin o'zgartirgan kreativlarga tegilmaydi)
    const OLD = ["Biznesingizga lidlar oqimi kerakmi?", "Offer + 4 ta unikal video + reklama", "Shu platformadagi jamoa bilan ishlaymiz"];
    const old = await db.select().from(s.adCreatives)
      .where(and(eq(s.adCreatives.campaignId, fallback.id), inArray(s.adCreatives.title, OLD))).orderBy(asc(s.adCreatives.id));
    for (const [i, c] of old.entries()) {
      await db.update(s.adCreatives).set(i === 0 ? { ...AD, isActive: true } : { isActive: false }).where(eq(s.adCreatives.id, c.id));
    }
  }

  await seedTargetedAds();

  if (process.argv.includes("--demo")) await seedDemo();
  console.log("Seed tayyor.");
}

/**
 * Kasbga qarab avtomatik chiqadigan Adverto reklamalari. Nomi bo'yicha bir marta yaratiladi;
 * keyin admin panelda tahrirlanadi (seed ularga qayta tegmaydi).
 */
async function seedTargetedAds() {
  const db = await getDb();
  const url = "https://t.me/mirzobek_bozorov";
  const VIDEO = ["operator", "mobilograf", "montajor", "ssenarist"];
  const campaigns = [
    {
      name: "Adverto Marketing — target va SMM", professions: ["marketolog", "targetolog", "smm"],
      slots: ["A1", "A3", "A3b", "A5", "A6"],
      creatives: [{ style: "marketing", badge: "Kafolatlangan natija", title: "Reklamani natija uchun ishlaydigan jamoaga topshiring",
        body: "Strategiya, target va SMM bitta jamoada — har oy aniq hisobot bilan.", cta: "Bepul konsultatsiya", url }],
    },
    {
      name: "Adverto Production — video", professions: VIDEO,
      slots: ["A1", "A3", "A3b", "A5", "A6"],
      creatives: [{ style: "production", badge: "Tayyor kontent", title: "Videoni Instagram’ga tayyor holda topshiramiz",
        body: "Ssenariy, suratga olish, montaj va joylash — Adverto Production jamoasi.", cta: "Narxini bilish", url }],
    },
    {
      name: "Adverto Production — Rasmiy jamoa (lenta)", professions: VIDEO, slots: ["A2"],
      creatives: [{ style: "production", badge: "Rasmiy jamoa", title: "Adverto Production",
        body: "Operator, mobilograf va montajor bir jamoada: ssenariydan Instagram’ga joylashgacha.", cta: "Jamoa bilan bog‘lanish", url }],
    },
  ];
  for (const c of campaigns) {
    const [exists] = await db.select({ id: s.adCampaigns.id, professions: s.adCampaigns.professions }).from(s.adCampaigns).where(eq(s.adCampaigns.name, c.name)).limit(1);
    if (exists) {
      // Yangi kasb qo'shilganda (masalan, marketolog) mavjud kampaniyaga ham qo'shiladi
      const missing = c.professions.filter((p) => !exists.professions.includes(p));
      if (missing.length) await db.update(s.adCampaigns).set({ professions: [...exists.professions, ...missing] }).where(eq(s.adCampaigns.id, exists.id));
      continue;
    }
    const [row] = await db.insert(s.adCampaigns).values({
      name: c.name, advertiser: "Adverto", status: "active", slots: c.slots, professions: c.professions,
    }).returning();
    await db.insert(s.adCreatives).values(c.creatives.map((k) => ({ ...k, campaignId: row.id })));
  }
}

/** Prototipdagi namuna profillar. Production bazaga yozilmasin. */
async function seedDemo() {
  if (process.env.DATABASE_URL && !process.argv.includes("--force")) {
    throw new Error("Demo profillar faqat lokal bazaga yoziladi (--force bilan majburlash mumkin).");
  }
  const db = await getDb();
  const profs = Object.fromEntries((await db.select().from(s.professions)).map((p) => [p.slug, p.id]));
  const dists = Object.fromEntries((await db.select().from(s.districts)).map((d) => [d.nameUz, d.id]));

  type Demo = {
    prof: string; name: string; g: "f" | "m"; year: number; tumans: string[]; exp: number; price: number;
    bio: string; tags: string[]; extra?: Record<string, string>; featured?: boolean;
    blog?: { followers: Record<string, number>; er: number; avgViews: number; storiesReach: number; gender: [number, number];
      ages: [string, number][]; cities: [string, number][]; rates: [string, number][]; topics: string; noAds: string;
      admins: { name: string; role: string; phone: string; telegram: string }[] };
  };
  const demos: Demo[] = [
    { prof: "brand-face", name: "Dilnoza Ro‘zmetova", g: "f", year: 2003, tumans: ["Urganch shahri", "Xiva shahri"], exp: 3, price: 400000, featured: true,
      bio: "Kosmetika, kiyim va restoran reklamalarida suratga tushaman. Kamera oldida erkin gapiraman.", tags: ["Beauty", "Fashion", "Food"],
      extra: { height: "168", weight: "54", brands: "Namuna Cosmetics, Xiva Café", industries: "Beauty, kiyim, restoran" } },
    { prof: "operator", name: "Javohir Sobirov", g: "m", year: 1999, tumans: ["Urganch shahri", "Urganch tumani", "Xonqa"], exp: 5, price: 700000, featured: true,
      bio: "Reklama roliklari, tadbir va podkast suratga olish. O‘z texnikam va svetim bor, dron bilan ishlayman.", tags: ["Sony FX3", "Dron", "Svet"],
      extra: { camera: "Sony FX3, Sigma 24-70, DJI RS3", gear: "Dron, 3 ta svet, radio mikrofon" } },
    { prof: "montajor", name: "Sardor Matyoqubov", g: "m", year: 2005, tumans: ["Urganch shahri"], exp: 2, price: 150000,
      bio: "Reels va TikTok uchun dinamik montaj. Subtitr, sound design, rang to‘g‘rilash.", tags: ["Premiere Pro", "CapCut", "After Effects"],
      extra: { software: "Premiere Pro, After Effects, CapCut", formats: "Reels, reklama, YouTube", turnaround: "24 soat" } },
    { prof: "targetolog", name: "Madina Otajonova", g: "f", year: 2000, tumans: ["Urganch shahri", "Xiva shahri"], exp: 4, price: 2500000, featured: true,
      bio: "Xorazm bizneslari uchun lid generatsiya. Klinika, o‘quv markaz va ko‘chmas mulk keyslari bor.", tags: ["Meta Ads", "Telegram Ads"],
      extra: { platforms: "Meta, Telegram Ads", industries: "Klinika, ta’lim, ko‘chmas mulk", case: "O‘quv markaz: 30 kunda 410 ta lid" } },
    { prof: "smm", name: "Gulnoza Yusupova", g: "f", year: 2002, tumans: ["Urganch shahri", "Gurlan"], exp: 3, price: 1800000,
      bio: "Instagram va Telegram sahifalarni noldan yuritaman: kontent reja, ssenariy, stories, dizayn.", tags: ["Instagram", "Telegram"],
      extra: { package: "12 post + 30 stories + 8 reels / oy", pages: "5 ta faol loyiha", reporting: "Har hafta" } },
    { prof: "fotograf", name: "Islom Davletov", g: "m", year: 1997, tumans: ["Urganch shahri"], exp: 6, price: 300000,
      bio: "Mahsulot va menyu fotosurati, studiyam bor. Marketpleys uchun oq fonda suratlar.", tags: ["Mahsulot", "Studiya"],
      extra: { camera: "Canon R6, 100mm macro", genres: "Mahsulot, menyu, marketpleys", studio: "Bor, Urganch markazida" } },
    { prof: "dizayner", name: "Ravshan Masharipov", g: "m", year: 1999, tumans: ["Urganch shahri"], exp: 5, price: 200000,
      bio: "Logotip, brendbuk va SMM uchun post shablonlari.", tags: ["Figma", "Logotip", "Brendbuk"],
      extra: { software: "Figma, Illustrator, Photoshop", focus: "Logotip, brendbuk, SMM shablon" } },
    { prof: "bloger", name: "Kamola Xo‘jayeva", g: "f", year: 1999, tumans: ["Urganch shahri"], exp: 4, price: 250000, featured: true,
      bio: "Oilaviy lifestyle va Xorazm taomlari haqida bloger. Auditoriyam asosan Urganch va Xivadagi yosh oilalar.", tags: ["Lifestyle", "Oila", "Taomlar"],
      blog: { followers: { instagram: 48200, telegram: 12400 }, er: 4.1, avgViews: 21000, storiesReach: 6500, gender: [72, 28],
        ages: [["13–17", 8], ["18–24", 41], ["25–34", 36], ["35+", 15]], cities: [["Urganch", 46], ["Xiva", 18], ["Toshkent", 12], ["Boshqa", 24]],
        rates: [["Stories (1 ta)", 250000], ["Post", 600000], ["Reels", 900000], ["Integratsiya", 1500000]],
        topics: "lifestyle, oila, taomlar", noAds: "kazino, mikroqarz",
        admins: [{ name: "Shohruh", role: "Reklama bo‘yicha admin", phone: "+998900001017", telegram: "@kamola_admin_namuna" }] } },
    { prof: "bloger", name: "Otabek Yo‘ldoshev", g: "m", year: 2001, tumans: ["Urganch shahri", "Xiva shahri"], exp: 5, price: 600000,
      bio: "Xorazm shevasidagi hazil va skechlar.", tags: ["Yumor", "Skech", "TikTok"],
      blog: { followers: { instagram: 126000, tiktok: 84000 }, er: 6.3, avgViews: 95000, storiesReach: 18000, gender: [45, 55],
        ages: [["13–17", 14], ["18–24", 48], ["25–34", 28], ["35+", 10]], cities: [["Urganch", 38], ["Toshkent", 20], ["Xiva", 14], ["Boshqa", 28]],
        rates: [["Stories (1 ta)", 600000], ["Post", 1500000], ["Reels", 2500000], ["Integratsiya", 4000000]],
        topics: "yumor, avto, fast food", noAds: "kazino, siyosat",
        admins: [
          { name: "Dilshod", role: "Reklama menejeri", phone: "+998900001018", telegram: "@otabek_reklama_namuna" },
          { name: "Nodira", role: "Ikkinchi admin", phone: "+998900002018", telegram: "@otabek_admin2_namuna" },
        ] } },
  ];

  for (const [i, d] of demos.entries()) {
    const phone = `+9989000000${String(i + 1).padStart(2, "0")}`;
    const [u] = await db.insert(s.users).values({ phone }).onConflictDoNothing().returning();
    if (!u) continue;
    const [p] = await db.insert(s.profiles).values({
      userId: u.id, slug: slugify(d.name) + "-" + u.id, professionId: profs[d.prof], fullName: d.name,
      birthYear: d.year, gender: d.g, languages: ["uz", "ru"], bio: d.bio, experienceYears: d.exp, price: d.price,
      tags: d.tags, status: "approved", extra: d.extra ?? {}, isFeatured: !!d.featured, verifiedAt: new Date(), consentAt: new Date(),
    }).returning();
    await db.insert(s.profileDistricts).values(d.tumans.map((t) => ({ profileId: p.id, districtId: dists[t] })));
    const handle = slugify(d.name).split("-")[0] + "_namuna";
    await db.insert(s.profileContacts).values({ profileId: p.id, phone, telegram: "@" + handle, instagram: "@" + handle });
    if (d.blog) {
      const b = d.blog;
      await db.insert(s.bloggerStats).values({
        profileId: p.id, followers: b.followers, er: b.er, avgViews: b.avgViews, storiesReach: b.storiesReach,
        audience: { gender: { f: b.gender[0], m: b.gender[1] }, ages: b.ages, cities: b.cities },
        rates: b.rates, topics: b.topics, noAds: b.noAds, statDate: new Date(), verifiedAt: new Date(),
      });
      await db.insert(s.bloggerAdmins).values(b.admins.map((a, j) => ({ profileId: p.id, ...a, sortOrder: j })));
    }
  }
  await db.execute(sql`update profiles set rank_score = (case when is_featured then 50 else 0 end) + experience_years`);
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
