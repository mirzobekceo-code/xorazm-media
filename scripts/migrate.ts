/** DATABASE_URL bo'lsa migratsiyalarni qo'llaydi (build bosqichida). Bo'lmasa hech narsa qilmaydi. */
import path from "node:path";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    if (process.env.VERCEL) throw new Error("DATABASE_URL o'rnatilmagan");
    console.log("DATABASE_URL yo'q — lokal PGlite runtime'da migratsiya qilinadi.");
    return;
  }
  const client = postgres(url, { max: 1 });
  await migrate(drizzle(client), { migrationsFolder: path.join(process.cwd(), "drizzle") });
  await client.end();
  console.log("Migratsiyalar qo'llandi.");
}

main().catch((e) => { console.error(e); process.exit(1); });
