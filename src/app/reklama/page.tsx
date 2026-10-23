import { SITE } from "@/lib/site";
import { SLOTS } from "@/lib/reference";

export const metadata = { title: "Reklama joylashtirish", description: "Xorazm Media sahifalarida reklama joylashtirish — Adverto orqali." };

export default function Advertise() {
  return (
    <div className="prose">
      <h1>Reklama joylashtirish</h1>
      <p>Xorazm Media’ga media mutaxassis qidirgan biznes egalari keladi. Sahifalardagi reklama joylarini Adverto agentligi boshqaradi.</p>
      <h2>Reklama joylari</h2>
      <ul>{Object.entries(SLOTS).map(([k, v]) => <li key={k}><b>{k}</b> — {v}</li>)}</ul>
      <p>Reklamani faqat ma’lum yo‘nalish (masalan, faqat blogerlar katalogida) yoki tumanda ko‘rsatish mumkin.</p>
      <p><a className="btn" href={SITE.telegram} target="_blank" rel="noopener">Telegram orqali yozish</a></p>
    </div>
  );
}
