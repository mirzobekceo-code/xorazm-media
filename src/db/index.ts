import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import { drizzle as drizzleLite } from "drizzle-orm/pglite";
import { migrate as migratePg } from "drizzle-orm/postgres-js/migrator";
import { migrate as migrateLite } from "drizzle-orm/pglite/migrator";
import postgres from "postgres";
import path from "node:path";
import fs from "node:fs";
import type { SQL } from "drizzle-orm";
import * as schema from "./schema";

/**
 * DATABASE_URL bo'lsa haqiqiy PostgreSQL, bo'lmasa lokal PGlite (.data/pglite).
 * Ikkalasi ham PostgreSQL dialekti, shuning uchun so'rovlar bir xil.
 */
function create() {
  const url = process.env.DATABASE_URL;
  if (url) {
    const client = postgres(url, { max: 5, prepare: false });
    const db = drizzlePg(client, { schema });
    return { db, ready: migratePg(db, { migrationsFolder: path.join(process.cwd(), "drizzle") }) };
  }
  const dir = process.env.PGLITE_DIR ?? path.join(process.cwd(), ".data", "pglite");
  fs.mkdirSync(dir, { recursive: true });
  const db = drizzleLite(dir, { schema });
  return { db, ready: migrateLite(db, { migrationsFolder: path.join(process.cwd(), "drizzle") }) };
}

type Instance = ReturnType<typeof create>;
const g = globalThis as unknown as { __xmDb?: Instance };

export type DB = ReturnType<typeof drizzlePg<typeof schema>>;

/** Migratsiyalar tugaguncha kutib, bazani qaytaradi. */
export async function getDb(): Promise<DB> {
  // Ulanish birinchi chaqiruvda ochiladi (import paytida emas)
  const instance = (g.__xmDb ??= create());
  await instance.ready;
  return instance.db as unknown as DB;
}
/** Xom SQL: postgres-js massiv, PGlite esa { rows } qaytaradi — ikkalasini bir xil qiladi. */
export async function query<T>(q: SQL): Promise<T[]> {
  const db = await getDb();
  const res = (await db.execute(q)) as unknown;
  return (Array.isArray(res) ? res : (res as { rows: T[] }).rows) as T[];
}

export { schema };
