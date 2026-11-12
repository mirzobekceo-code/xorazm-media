import Link from "next/link";

export const metadata = { title: "Savollar", description: "Xorazm Digital HUB haqida ko‘p so‘raladigan savollar." };

const FAQ: [string, string][] = [
  ["Xorazm Digital HUB nima?", "Xorazmdagi digital va media mutaxassislari katalogi: brand face, operator, mobilograf, montajor, ssenarist, marketolog, targetolog, SMM manager, bloger, fotograf, grafik dizayner, suhandon, shuningdek studiya va texnika ijarasi. Bizneslar ularni topib, to‘g‘ridan-to‘g‘ri bog‘lanadi."],
  ["Kontakt ochish pullikmi?", "Yo‘q, bepul. Katalog, portfolio va narxlarni hamma ko‘radi. Mutaxassisning raqami va Telegram’i esa “Raqamni ko‘rish” tugmasi orqali, raqamingizni Telegram botda bir marta tasdiqlaganingizdan keyin ochiladi — bu mutaxassislarni spam va soxta qo‘ng‘iroqlardan himoya qiladi."],
  ["Kimni tanlashni bilmasam-chi?", "“So‘rov qoldirish” bo‘limida muammoingizni yozing, hudud va budjetni belgilang, raqamingizni qoldiring. Jamoamiz so‘rovni ko‘rib chiqadi va mos mutaxassislarga yuboradi — ular sizga o‘zi bog‘lanadi. Bepul."],
  ["Mutaxassisga buyurtma qanday beraman?", "Mutaxassis sahifasidagi “Bog‘lanish / Buyurtma berish” tugmasini bosib, ismingiz va raqamingizni qoldiring — mutaxassis o‘zi qo‘ng‘iroq qiladi. Yoki kontaktlarini ochib, to‘g‘ridan-to‘g‘ri yozing."],
  ["Platforma qanday ishlaydi, agar bepul bo‘lsa?", "Platformani Adverto marketing agentligi yuritadi va sahifalardagi reklama joylari hisobiga ishlaydi. Reklama kontentni yopmaydi."],
  ["Portfolio qo‘shish qancha turadi?", "Bepul. 5 qadamli formani to‘ldirasiz, telefon raqam Telegram orqali tasdiqlanadi, moderator 24 soat ichida tekshiradi."],
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
      <p className="muted">Javob topilmadimi? <Link className="link" href="/aloqa">Biz bilan bog‘laning</Link>.</p>
    </div>
  );
}
