/**
 * DATABASE_URL bo'lsa: migratsiyalar, so'ng ma'lumotnomalar (kasblar, tumanlar, standart reklama).
 * Build bosqichida ishlaydi. DATABASE_URL bo'lmasa hech narsa qilmaydi (lokal PGlite runtime'da).
 */
import path from "node:path";
import { execFileSync } from "node:child_process";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

async function main() {
  // Pooler (PgBouncer) emas, to'g'ridan-to'g'ri ulanish — DDL uchun ishonchliroq
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!url) {
    if (process.env.VERCEL) throw new Error("DATABASE_URL o'rnatilmagan");
    console.log("DATABASE_URL yo'q — lokal PGlite runtime'da migratsiya qilinadi.");
    return;
  }
  const client = postgres(url, { max: 1 });
  await migrate(drizzle(client), { migrationsFolder: path.join(process.cwd(), "drizzle") });
  await client.end();
  console.log("Migratsiyalar qo'llandi.");
  if (process.argv.includes("--seed")) {
    execFileSync(process.execPath, [require.resolve("tsx/cli"), "scripts/seed.ts"], { stdio: "inherit", env: process.env });
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
