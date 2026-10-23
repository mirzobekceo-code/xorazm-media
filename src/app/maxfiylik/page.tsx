export const metadata = { title: "Maxfiylik siyosati" };

export default function Privacy() {
  return (
    <div className="prose">
      <h1>Maxfiylik siyosati</h1>
      <p className="muted">Loyiha matni. Ishga tushishdan oldin yurist bilan kelishib yakunlanadi.</p>
      <h2>Qanday ma’lumot saqlanadi</h2>
      <ul>
        <li>Mutaxassislar: telefon raqam, ism, tug‘ilgan yil (sana emas), profil ma’lumotlari, rasm va videolar.</li>
        <li>Rasmlardan joylashuv (GPS) va boshqa EXIF ma’lumotlari yuklashda o‘chiriladi.</li>
        <li>Tashrif buyuruvchilar: shaxsni aniqlamaydigan statistika (profil ko‘rishlari, kontakt bosishlari) — IP manzil saqlanmaydi, faqat bir kunlik xesh.</li>
      </ul>
      <h2>Kimga ko‘rinadi</h2>
      <p>Profil va kontaktlar — hammaga (mutaxassis roziligi bilan). Bloger statistikasi skrinshotlari — faqat moderatorlarga.</p>
      <h2>O‘chirish</h2>
      <p>Kabinetdagi tugma orqali profil, fayllar va statistika butunlay o‘chiriladi.</p>
    </div>
  );
}
