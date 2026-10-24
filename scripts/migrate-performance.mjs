import "dotenv/config";
import { readFile } from "node:fs/promises";
import postgres from "postgres";
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
try {
  const migration = await readFile(new URL("../drizzle/0011_latency_indexes.sql", import.meta.url), "utf8");
  await sql.begin(async tx => { await tx`SET LOCAL lock_timeout = '5s'`; await tx`SET LOCAL statement_timeout = '30s'`; await tx.unsafe(migration); });
  console.log("Performance indexes applied.");
} finally { await sql.end(); }
