import zlib from "node:zlib";
import { sql } from "drizzle-orm";
import { and, eq, isNotNull } from "drizzle-orm";
import { getDb, query, schema as s } from "@/db";

/**
 * Bazaning to'liq nusxasi (JSON, gzip). Vaqtinchalik ma'lumotlar (sessiyalar, kirish kodlari,
 * Telegram tokenlari) kirmaydi. Tartib — tashqi kalitlar bo'yicha: tiklashda shu tartibda yoziladi.
 */
export const BACKUP_TABLES = [
  "users", "professions", "districts", "profiles", "profile_districts", "profile_contacts", "profile_slugs",
  "blogger_admins", "blogger_stats", "media", "moderation_log", "reports", "events",
  "ad_campaigns", "ad_creatives", "ad_events", "settings", "requests", "request_responses",
] as const;

export type Backup = { version: 1; createdAt: string; tables: Record<string, unknown[]> };

export async function createBackup(): Promise<{ file: Buffer; name: string; counts: Record<string, number> }> {
  const tables: Record<string, unknown[]> = {};
  for (const t of BACKUP_TABLES) tables[t] = await query(sql`select * from ${sql.identifier(t)}`);
  const data: Backup = { version: 1, createdAt: new Date().toISOString(), tables };
  const counts = Object.fromEntries(Object.entries(tables).map(([k, v]) => [k, v.length]));
  const day = new Date(Date.now() + 5 * 3_600_000).toISOString().slice(0, 10); // Toshkent sanasi
  return { file: zlib.gzipSync(JSON.stringify(data)), name: `xorazmdigital-${day}.json.gz`, counts };
}

/**
 * Nusxani bazaga tiklaydi: barcha jadvallar tozalanib, nusxadagi qatorlar yoziladi (bitta tranzaksiyada emas —
 * faqat bo'sh yoki zaxiradan tiklanadigan bazada ishlating). Tiklangan qatorlar soni qaytadi.
 */
export async function restoreBackup(gz: Buffer, run: (q: ReturnType<typeof sql>) => Promise<unknown>): Promise<Record<string, number>> {
  const data = JSON.parse(zlib.gunzipSync(gz).toString("utf8")) as Backup;
  if (data.version !== 1) throw new Error("Noma'lum zaxira formati");
  for (const t of [...BACKUP_TABLES].reverse()) await run(sql`delete from ${sql.identifier(t)}`);
  const restored: Record<string, number> = {};
  for (const t of BACKUP_TABLES) {
    const rows = data.tables[t] ?? [];
    restored[t] = rows.length;
    // Bo'laklab yoziladi: json_populate_recordset jadval ustunlari va turlariga (jsonb, massiv, enum) o'zi moslaydi
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = JSON.stringify(rows.slice(i, i + 500));
      await run(sql`insert into ${sql.identifier(t)} select * from json_populate_recordset(null::${sql.identifier(t)}, ${chunk}::json)`);
    }
    if (rows.length && Object.prototype.hasOwnProperty.call(rows[0], "id")) {
      await run(sql`select setval(pg_get_serial_sequence(${t}, 'id'), (select coalesce(max(id), 1) from ${sql.identifier(t)}))`);
    }
  }
  return restored;
}

/** Kunlik zaxira: Telegram'i ulangan adminlarga fayl bo'lib boradi. Nechta adminga yetgani qaytadi. */
export async function sendBackupToAdmins(): Promise<{ sent: number; bytes: number; counts: Record<string, number> }> {
  // telegram.ts "server-only" — tiklash skripti (tsx) bu faylni import qila olishi uchun shu yerda yuklanadi
  const { tgDocument } = await import("./telegram");
  const b = await createBackup();
  const db = await getDb();
  const admins = await db.select({ tg: s.users.telegramId }).from(s.users).where(and(eq(s.users.role, "admin"), isNotNull(s.users.telegramId)));
  const top = ["users", "profiles", "media", "requests"].map((t) => `${t}: ${b.counts[t] ?? 0}`).join(" · ");
  const caption = `🗄 Kunlik zaxira nusxa — ${b.name}\n${top}\n\nBu faylni saqlab qo‘ying. Tiklash: scripts/restore.ts`;
  let sent = 0;
  for (const a of admins) if (await tgDocument(a.tg!, b.file, b.name, caption)) sent++;
  return { sent, bytes: b.file.length, counts: b.counts };
}
