import "dotenv/config";
import { readFile } from "node:fs/promises";
import postgres from "postgres";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1, onnotice: () => {} });
try {
  for (const file of ["0013_in_app_notifications.sql", "0014_notification_clearing.sql"]) {
    const migration = await readFile(new URL(`../drizzle/${file}`, import.meta.url), "utf8");
    await sql.unsafe(migration);
  }
  await sql`SELECT id, read_at, cleared_at FROM public.notifications LIMIT 0`;
  console.log("In-app notifications migration applied, including tracking triggers.");
} finally {
  await sql.end();
}
