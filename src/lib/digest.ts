import "server-only";
import { sql } from "drizzle-orm";
import { query } from "@/db";
import { send } from "./telegram";
import { SITE } from "./site";

/** Dushanba kunlari: Telegram'i ulangan mutaxassislarga 7 kunlik statistika. */
export async function sendWeeklyDigest() {
  const rows = await query<{ tg: string; name: string; slug: string; views: number; contacts: number }>(sql`
    select u.telegram_id as tg, p.full_name as name, p.slug,
      (select count(*)::int from events e where e.profile_id = p.id and e.type = 'view' and e.created_at > now() - interval '7 days') as views,
      (select count(*)::int from events e where e.profile_id = p.id and e.type = 'contact_click' and e.created_at > now() - interval '7 days') as contacts
    from profiles p join users u on u.id = p.user_id
    where p.status = 'approved' and u.telegram_id is not null
  `);
  for (const r of rows) {
    await send(r.tg, `📊 Haftalik statistika, ${r.name}\n\nProfil ko‘rishlari: ${r.views}\nKontakt bosishlar: ${r.contacts}\n\n${SITE.url}/m/${r.slug}`);
  }
  return rows.length;
}

/** Bloger statistikasi 60 kunga to'lganda yangilash eslatmasi (shu kuni bir marta). */
export async function remindStaleBloggerStats() {
  const rows = await query<{ tg: string }>(sql`
    select u.telegram_id as tg
    from profiles p join users u on u.id = p.user_id
    join lateral (select stat_date from blogger_stats b where b.profile_id = p.id order by created_at desc limit 1) b on true
    where p.status = 'approved' and u.telegram_id is not null and b.stat_date::date = (now() - interval '60 days')::date
  `);
  for (const r of rows) {
    await send(r.tg, `Auditoriya statistikangiz 60 kunlik bo‘ldi va “tasdiqlangan” belgisi o‘chdi. Yangi Insights skrinshotlarini yuklang: ${SITE.url}/kabinet/tahrir`);
  }
  return rows.length;
}
