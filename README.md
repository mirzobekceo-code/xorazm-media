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

## Buyruqlar

| Buyruq | Vazifasi |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` | TypeScript tekshiruvi |
| `npm test` | Unit testlar (format, reklama tanlash) |
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
scripts/seed.ts             boshlang'ich ma'lumotlar
```

## Asosiy qarorlar

- **Kontaktlar** HTML ichida emas, `/api/v1/profiles/:id/contacts` orqali keladi; bitta IP'dan daqiqasiga 30 so'rov. Blogerda shaxsiy raqam emas, adminlar ko'rsatiladi.
- **Moderatsiya:** profil `draft → pending → approved/rejected`. Tasdiqlangan profilda ism, kasb yoki bloger statistikasi o'zgarsa, profil qayta tekshiruvga tushadi. Yangi rasm va video alohida tekshiriladi.
- **Bloger statistikasi** har o'zgarishda yangi qator sifatida yoziladi (tarix saqlanadi). Moderator uni Insights skrinshoti bilan solishtiradi. 60 kundan eski statistika "tasdiqlanmagan" deb ko'rsatiladi.
- **Reklama:** bitta so'rov ichida umumiy tanlovchi ishlaydi, shuning uchun bir sahifada bir kreativ ikki marta chiqmaydi. Pullik kampaniya standartdan oldin tanlanadi, kasb va tuman bo'yicha nishonlash mumkin. Standart Adverto kampaniyasi bor, shuning uchun slot hech qachon bo'sh qolmaydi.
- **TOP** bepul va avtomatik: `src/lib/rank.ts`, har kuni 03:15 UTC da `/api/cron/rank` (Vercel Hobby faqat kunlik cron beradi; Pro tarifda soatlik qilish mumkin) (`Authorization: Bearer $CRON_SECRET`).
- **Fayllar:** `BLOB_READ_WRITE_TOKEN` bo'lsa Vercel Blob, aks holda `public/uploads`. Vercel'da so'rov hajmi 4.5 MB bilan cheklangan, shuning uchun rasm brauzerda kichraytiriladi (2000px, WEBP), server esa yana WEBP'ga o'girib EXIF'ni olib tashlaydi. Video brauzerdan to'g'ridan-to'g'ri Blob'ga yuklanadi (`/api/v1/me/media/upload`).
- **Migratsiyalar:** PostgreSQL'da `npm run build` ichida (`scripts/migrate.ts`), PGlite'da birinchi so'rovda.

## Hali qilinmagan (TZ bo'yicha keyingi ishlar)

- Telegram Login, botni foydalanuvchiga ulash (`users.telegram_id`) va haftalik hisobot. Bildirishnoma yuborish kodi tayyor: `src/lib/telegram.ts`.
- Videoga avtomatik muqova (thumbnail).
- Cloudflare Turnstile (botlardan himoya), admin uchun ikki bosqichli kirish.
- Rate limit hozir bitta server xotirasida; bir nechta nusxada Redis kerak.
- Reklama kreativi uchun rasm yuklash (hozir URL bilan kiritiladi).
- Rus tili (2-versiya).
