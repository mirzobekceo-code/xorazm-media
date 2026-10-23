import Link from "next/link";

export const metadata = { title: "Savollar", description: "Xorazm Media haqida ko‘p so‘raladigan savollar." };

const FAQ: [string, string][] = [
  ["Xorazm Media nima?", "Xorazmdagi media mutaxassislar katalogi: bloger, brand face, operator, fotograf, montajor, dizayner, targetolog va SMM manager. Bizneslar ularni topib, to‘g‘ridan-to‘g‘ri bog‘lanadi."],
  ["Kontakt ochish pullikmi?", "Yo‘q. Katalog, profillar va kontaktlar hammaga bepul. Ro‘yxatdan o‘tish ham shart emas."],
  ["Platforma qanday ishlaydi, agar bepul bo‘lsa?", "Sahifalardagi reklama joylari hisobiga. Reklama “Reklama” yozuvi bilan belgilanadi va kontentni yopmaydi."],
  ["Profil ochish qancha turadi?", "Bepul. 5 qadamli formani to‘ldirasiz, telefon SMS bilan tasdiqlanadi, moderator 24 soat ichida tekshiradi."],
  ["Profillarni kim tekshiradi?", "Har bir profil va har bir yangi rasm yoki video moderatordan o‘tadi. Tasdiqlangan profillar ✓ belgisi bilan ko‘rinadi."],
  ["Bloger statistikasi qanchalik to‘g‘ri?", "Bloger Instagram Insights skrinshotlarini yuklaydi, moderator raqamlarni solishtiradi. Statistika 60 kundan eskirsa, tasdiq belgisi o‘chadi."],
  ["TOP qanday aniqlanadi?", "Pul bilan emas: profil to‘liqligi, tasdiqlangan statistika, ko‘rishlar va murojaatlar soni asosida avtomatik hisoblanadi."],
  ["Firibgarlikka duch kelsam?", "Profil sahifasidagi “Shikoyat qilish” tugmasini bosing. Moderator 24 soat ichida ko‘rib chiqadi, shikoyat anonim qoladi."],
  ["Profilimni qanday o‘chiraman?", "Kabinetda “Profil va akkauntni o‘chirish” tugmasi bor. Ma’lumotlar darhol o‘chiriladi."],
];

export default function Faq() {
  return (
    <div className="prose">
      <h1>Ko‘p so‘raladigan savollar</h1>
      {FAQ.map(([q, a]) => <details key={q} className="box"><summary style={{ cursor: "pointer", fontWeight: 600 }}>{q}</summary><p className="muted" style={{ marginTop: 8 }}>{a}</p></details>)}
      <p className="muted">Javob topilmadimi? <Link className="link" href="/reklama">Biz bilan bog‘laning</Link>.</p>
    </div>
  );
}
