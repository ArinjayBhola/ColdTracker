import "dotenv/config";
import { readFile } from "node:fs/promises";
import postgres from "postgres";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
try {
  const migration = await readFile(new URL("../drizzle/0009_user_time_zone.sql", import.meta.url), "utf8");
  await sql.unsafe(migration);
  await sql`SELECT time_zone FROM "user" LIMIT 0`;
  console.log("User timezone database migration applied.");
} finally {
  await sql.end();
}
