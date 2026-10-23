# Xorazm Media

Xorazmdagi media mutaxassislar katalogi: bloger, brand face, operator, fotograf, montajor, dizayner, targetolog va SMM manager. Katalog va kontaktlar bepul, daromad esa sahifalardagi Adverto reklama joylaridan keladi.

Texnik topshiriq: [Xorazm Media — TZ](https://claude.ai/artifact/Hw1uU8T7A4i2BBfCdr3c6T) · Prototip: [Xorazm Media prototipi](https://claude.ai/artifact/74C9k2YDPjCH4uxTyr4Gyx)

## Ishga tushirish

```bash
npm install
cp .env.example .env.local      # kerak bo'lsa to'ldiring
npm run db:seed -- --demo       # kasblar, tumanlar, reklama + namuna profillar
npm run dev                     # http://localhost:3000
```

`DATABASE_URL` bo'sh bo'lsa, lokal PGlite (`.data/pglite`) ishlatiladi: o'rnatiladigan PostgreSQL, alohida server shart emas. Migratsiyalar birinchi so'rovda avtomatik qo'llanadi. Bitta PGlite papkasini bir vaqtda faqat bitta jarayon ochishi mumkin, shuning uchun seed'ni server to'xtab turganda ishga tushiring.

Dev rejimida SMS kod server konsoliga chiqadi (`[SMS dev] +998...: ... kodi 123456`). `ADMIN_PHONES` dagi raqam bilan kirgan foydalanuvchi admin bo'ladi.

## Hosting

Kod ikki xil joylashtirishga tayyor, o'zgartirish shart emas.

**Vercel** (hozirgi): GitHub'ga push → avtomatik deploy. Kerakli o'zgaruvchilar: `DATABASE_URL` (Neon), `BLOB_READ_WRITE_TOKEN` (Vercel Blob ulaganda o'zi qo'shiladi), `CRON_SECRET`, `NEXT_PUBLIC_SITE_URL`, `ADMIN_PHONES`, SMS va Telegram kalitlari. Vercel Hobby tarifi tijoriy saytga rasman ruxsat bermaydi va Blob 1 GB bilan cheklangan — rasmiy ishga tushirishdan oldin Pro'ga o'tish yoki VPS.

**VPS (O'zbekistondagi server)** — Docker bilan:

```bash
git clone https://github.com/mirzobekceo-code/xorazm-media && cd xorazm-media
cp .env.example .env     # DOMAIN, POSTGRES_PASSWORD, ADMIN_PHONES, ESKIZ_*, TELEGRAM_BOT_TOKEN, CRON_SECRET
docker compose up -d --build
```

Uch xizmat ishga tushadi: `db` (PostgreSQL 16), `app` (har ishga tushishda migratsiya + ma'lumotnomalar, keyin server), `caddy` (domen uchun avtomatik HTTPS). Fayllar `uploads` volume'ida, baza `pgdata` volume'ida. Domenning A yozuvi serverga yo'naltirilgan bo'lishi kerak.

VPS'da TOP reytingi uchun cron (masalan, har soat):

```cron
0 * * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://DOMEN/api/cron/rank
```

Zaxira nusxa: `docker compose exec db pg_dump -U xm xm | gzip > backup-$(date +%F).sql.gz` va `uploads` volume'ini nusxalash.

**Vercel'dan VPS'ga ko'chish:** `pg_dump` bilan Neon bazasini olib VPS bazasiga tiklash; Blob'dagi fayllar manzili bazada to'liq URL bo'lib saqlangani uchun ular ishlashda davom etadi (yoki skript bilan diskka ko'chiriladi).

## Telegram bot

Bot uchta vazifani bajaradi:
- **Kirish va ro'yxatdan o'tish (SMS'siz):** saytda "Telegram orqali kirish" → botda "Raqamni ulashish". Telegram raqam egasini o'zi tasdiqlaydi.
- **Bildirishnomalar:** profil tasdiqlandi yoki rad etildi, dushanba kunlari haftalik statistika, bloger statistikasi 60 kunlik bo'lganda eslatma. Moderatorlarga yangi profil va shikoyatlar.
- **Mini App:** bot menyusidagi "Mutaxassislar" tugmasi saytni Telegram ichida ochadi. Telegram'i ulangan foydalanuvchi avtomatik kiradi.

Sozlash:
1. @BotFather → `/newbot` → tokenni hostingda `TELEGRAM_BOT_TOKEN` ga yozing (ixtiyoriy: `TELEGRAM_BOT_USERNAME`).
2. Admin panel → **Sozlamalar** → "Botni sozlash" (webhook, buyruqlar, menyu tugmasi). Domen o'zgarsa, qayta bosing.

Xavfsizlik: webhook `secret_token` bilan himoyalangan (tokendan hosil qilinadi). Kirish tokeni 10 daqiqa amal qiladi, bir martalik va faqat uni yaratgan brauzer ishlata oladi. Kontakt faqat yuboruvchining o'z raqami bo'lsa qabul qilinadi. Mini App `initData` imzosi tekshiriladi (`src/lib/tg-verify.ts`).

## Yuklash limitlari

`.env` orqali sozlanadi, kodni o'zgartirish shart emas:

| O'zgaruvchi | Standart | Ma'nosi |
| --- | --- | --- |
| `MAX_IMAGES` | 10 | Profilga rasm (brauzerda 2000px gacha kichraytiriladi) |
| `MAX_VIDEOS` | 3 | Profilga video fayl; `0` — faqat havola |
| `MAX_VIDEO_MB` / `MAX_VIDEO_SECONDS` | 50 / 60 | Bitta video hajmi va davomiyligi (davomiylik brauzerda tekshiriladi) |
| `MAX_SCREENSHOTS` | 6 | Bloger statistikasi skrinshotlari |
| `STORAGE_LIMIT_MB` | 1024 | Admin dashboarddagi xotira hisoblagichi chegarasi |

Showreel va uzun videolar uchun profilda 5 tagacha havola (YouTube, Instagram, TikTok, Vimeo, Telegram, Google Drive) — xotira sarflamaydi; YouTube profil ichida ochiladi.

## Buyruqlar

| Buyruq | Vazifasi |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` | TypeScript tekshiruvi |
| `npm test` | Unit testlar (format, reklama tanlash, Telegram imzosi) |
| `npm run db:migrate` | Migratsiyalarni `DATABASE_URL` bazasiga qo'llash (`build` buni avtomatik bajaradi) |
| `npm run db:generate` | `src/db/schema.ts` o'zgargandan keyin yangi migratsiya |
| `npm run db:seed` | Ma'lumotnomalar va standart reklama; `-- --demo` namuna profillar (faqat lokal) |

## Tuzilma

```
src/app/                    sahifalar (App Router)
  page.tsx                  bosh sahifa
  mutaxassislar/[[...slug]] katalog: /mutaxassislar/[kasb]/[tuman]
  m/[slug]                  profil
  qoshilish, kabinet        ro'yxatdan o'tish (5 qadam), kabinet, tahrirlash
  admin/                    moderatsiya, mutaxassislar, shikoyatlar, reklama, xodimlar
  api/v1/                   kontaktlar, hodisalar, reklama ko'rishlari, shikoyatlar
  r/[id]                    reklama bosishi → UTM bilan yo'naltirish
  actions.ts                server amallari (kirish, profil, fayllar)
src/components/             Ad (A1–A6), ProfileWizard, ProfileCard...
src/db/                     Drizzle sxema va ulanish (PostgreSQL / PGlite)
src/lib/                    so'rovlar, auth (SMS OTP), sms (Eskiz), storage, ads, rank
drizzle/                    SQL migratsiyalar
scripts/                    migrate.ts, seed.ts
Dockerfile, docker-compose.yml, Caddyfile   VPS uchun
```

## Asosiy qarorlar

- **Kontaktlar** HTML ichida emas, `/api/v1/profiles/:id/contacts` orqali keladi; bitta IP'dan daqiqasiga 30 so'rov. Blogerda shaxsiy raqam emas, adminlar ko'rsatiladi.
- **Moderatsiya:** profil `draft → pending → approved/rejected`. Tasdiqlangan profilda ism, kasb yoki bloger statistikasi o'zgarsa, profil qayta tekshiruvga tushadi. Yangi rasm va video alohida tekshiriladi.
- **Bloger statistikasi** har o'zgarishda yangi qator sifatida yoziladi (tarix saqlanadi). Moderator uni Insights skrinshoti bilan solishtiradi. 60 kundan eski statistika "tasdiqlanmagan" deb ko'rsatiladi.
- **Reklama:** bitta so'rov ichida umumiy tanlovchi ishlaydi, shuning uchun bir sahifada bir kreativ ikki marta chiqmaydi. Pullik kampaniya standartdan oldin tanlanadi, kasb va tuman bo'yicha nishonlash mumkin. Standart Adverto kampaniyasi bor, shuning uchun slot hech qachon bo'sh qolmaydi.
- **TOP** bepul va avtomatik: `src/lib/rank.ts`, `/api/cron/rank` (`Authorization: Bearer $CRON_SECRET`). Vercel'da har kuni 03:15 UTC (Hobby faqat kunlik cron beradi), VPS'da crontab orqali.
- **Fayllar:** `BLOB_READ_WRITE_TOKEN` bo'lsa Vercel Blob, aks holda `public/uploads` (`/uploads/...` route orqali beriladi). Vercel'da so'rov hajmi 4.5 MB bilan cheklangan, shuning uchun rasm brauzerda kichraytiriladi (2000px, WEBP), server esa yana WEBP'ga o'girib EXIF'ni olib tashlaydi. Video brauzerdan to'g'ridan-to'g'ri Blob'ga yuklanadi (`/api/v1/me/media/upload`).
- **Migratsiyalar:** PostgreSQL'da `npm run build` ichida (`scripts/migrate.ts`), PGlite'da birinchi so'rovda.

## Hali qilinmagan (TZ bo'yicha keyingi ishlar)

- Videoga avtomatik muqova (thumbnail).
- Cloudflare Turnstile (botlardan himoya), admin uchun ikki bosqichli kirish.
- Rate limit hozir bitta server xotirasida; bir nechta nusxada Redis kerak.
- Reklama kreativi uchun rasm yuklash (hozir URL bilan kiritiladi).
- Rus tili (2-versiya).
