import { sql } from "drizzle-orm";
import { getDb } from "@/db";

/**
 * TOP tartibi (bepul, avtomatik): profil to'liqligi + tasdiqlangan statistika +
 * oxirgi 30 kundagi ko'rishlar va kontakt bosishlar. Tahririyat tanlovi (is_featured) alohida saralanadi.
 */
export async function recomputeRanks(profileId?: number) {
  const db = await getDb();
  await db.execute(sql`
    update profiles p set rank_score =
        (case when p.bio <> '' then 5 else 0 end)
      + (case when p.price is not null then 5 else 0 end)
      + least(10, (select count(*) from media m where m.profile_id = p.id and m.moderation_status = 'approved' and not m.is_stat_screenshot) * 2)
      + (case when exists (select 1 from media m where m.profile_id = p.id and m.type = 'video' and m.moderation_status = 'approved') then 5 else 0 end)
      + (case when exists (select 1 from blogger_stats b where b.profile_id = p.id and b.verified_at is not null and b.verified_at > now() - interval '60 days') then 10 else 0 end)
      + least(30, (select count(*) from events e where e.profile_id = p.id and e.type = 'view' and e.created_at > now() - interval '30 days') / 10.0)
      + least(40, (select count(*) from events e where e.profile_id = p.id and e.type = 'contact_click' and e.created_at > now() - interval '30 days') * 2)
    where p.status = 'approved' ${profileId ? sql`and p.id = ${profileId}` : sql``}
  `);
}
