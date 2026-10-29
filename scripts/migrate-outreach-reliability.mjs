import "dotenv/config";
import { readFile } from "node:fs/promises";
import postgres from "postgres";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
try {
  const migration = await readFile(new URL("../drizzle/0016_outreach_history_reminders.sql", import.meta.url), "utf8");
  await sql.begin(tx => tx.unsafe(migration));
  console.log("Outreach history, contact follow-ups, and reminder delivery log installed.");
} finally { await sql.end(); }
