/**
 * Zaxira nusxadan bazani tiklash (kunlik nusxa adminlarga Telegram'da keladi).
 *   DATABASE_URL=... npx tsx scripts/restore.ts xorazmdigital-2026-10-27.json.gz --yes
 * DATABASE_URL bo'lmasa — lokal PGlite (PGLITE_DIR). DIQQAT: bazadagi joriy ma'lumotlar o'chirib yoziladi.
 * Avval migratsiyalar qo'llangan bo'lishi kerak (npm run build yoki scripts/migrate.ts).
 */
import fs from "node:fs";
import { getDb } from "@/db";
import { restoreBackup } from "@/lib/backup";

async function main() {
  const file = process.argv[2];
  if (!file || !fs.existsSync(file)) throw new Error("Foydalanish: npx tsx scripts/restore.ts <fayl.json.gz> --yes");
  if (!process.argv.includes("--yes")) throw new Error("Bazadagi ma'lumotlar almashtiriladi. Tasdiqlash uchun --yes qo'shing.");
  const db = await getDb();
  const counts = await restoreBackup(fs.readFileSync(file), (q) => db.execute(q));
  console.table(counts);
  console.log("Tiklandi.");
  process.exit(0);
}

main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
