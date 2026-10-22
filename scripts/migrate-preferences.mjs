import "dotenv/config";
import { readFile } from "node:fs/promises";
import postgres from "postgres";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
try {
  const migration = await readFile(new URL("../drizzle/0010_account_preferences.sql", import.meta.url), "utf8");
  await sql.unsafe(migration);
  await sql`SELECT preferences FROM "user" LIMIT 0`;
  console.log("Account preferences database migration applied.");
} finally {
  await sql.end();
}
