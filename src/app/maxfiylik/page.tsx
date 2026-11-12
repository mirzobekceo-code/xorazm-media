export const metadata = { title: "Maxfiylik siyosati" };

export default function Privacy() {
  return (
    <div className="prose">
      <h1>Maxfiylik siyosati</h1>
      <p className="muted">Oxirgi yangilanish: 2026-yil noyabr. Platformani Adverto marketing agentligi yuritadi.</p>
      <h2>Qanday ma’lumot saqlanadi</h2>
      <ul>
        <li>Mutaxassislar: telefon raqam, ism, tug‘ilgan yil (sana emas), profil ma’lumotlari, rasm va videolar.</li>
        <li>Rasmlardan joylashuv (GPS) va boshqa EXIF ma’lumotlari yuklashda o‘chiriladi.</li>
        <li>Tashrif buyuruvchilar: shaxsni aniqlamaydigan statistika (profil ko‘rishlari, kontakt bosishlari) — IP manzil saqlanmaydi, faqat bir kunlik xesh.</li>
        <li>So‘rov qoldirgan bizneslar: so‘rov matni, hudud, budjet va telefon raqam — moderator, Adverto jamoasi va so‘rov yuborilgan mos mutaxassislarga ko‘rinadi; so‘rov 14 kundan keyin yopiladi.</li>
        <li>Mutaxassis kontaktini ochganlar: telefon raqam, Telegram akkaunt (ID va @username) hamda qaysi mutaxassis va xizmatga qiziqqani — platformani yaxshilash va Adverto xizmatlari bo‘yicha taklif yuborish uchun.</li>
        <li>Portfolio sahifasidan buyurtma qoldirganlar: ism, telefon va izoh — shu mutaxassisga va platforma administratorlariga.</li>
        <li>Saytga birinchi marta qayerdan kelganingiz (masalan, Instagram yoki Telegram) — 30 kunlik cookie’da, ro‘yxatdan o‘tganda akkauntga yoziladi.</li>
        <li>Google Analytics va Yandex Metrika — saytdan foydalanish statistikasi (sahifalar, qurilma turi) uchun; ular o‘z cookie’laridan foydalanadi.</li>
      </ul>
      <h2>Kimga ko‘rinadi</h2>
      <p>Profil, portfolio va narxlar — hammaga. Mutaxassis kontaktlari — raqamini Telegram orqali tasdiqlagan tashrif buyuruvchilarga (mutaxassis roziligi bilan). Bloger statistikasi skrinshotlari — faqat moderatorlarga.</p>
      <h2>Ma’lumot qayerda saqlanadi</h2>
      <p>Ma’lumotlar bazasi, rasm va videolar bulutli xizmatlarda (Neon, Vercel, Cloudflare) saqlanadi; hisobotlar uchun Google Sheets ishlatiladi. Ma’lumotlar uchinchi shaxslarga sotilmaydi.</p>
      <h2>Zaxira nusxa</h2>
      <p>Ma’lumotlar bazasining shifrlangan aloqa orqali olingan kunlik zaxira nusxasi faqat sayt administratorlariga yuboriladi va faqat tiklash uchun ishlatiladi.</p>
      <h2>O‘chirish</h2>
      <p>Kabinetdagi tugma orqali profil, fayllar va statistika butunlay o‘chiriladi. So‘rov yoki kontaktlaringizni o‘chirishni <a className="link" href="/aloqa">aloqa</a> orqali so‘rashingiz mumkin.</p>
    </div>
  );
}
