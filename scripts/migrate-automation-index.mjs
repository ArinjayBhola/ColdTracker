import "dotenv/config";
import { readFile } from "node:fs/promises";
import postgres from "postgres";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const sql = postgres(process.env.DATABASE_URL, {
  prepare: false,
  max: 1,
  onnotice: () => {},
  connection: { lock_timeout: "5s", statement_timeout: "120s" },
});
try {
  const migration = await readFile(new URL("../drizzle/0017_automation_outreach_lookup.sql", import.meta.url), "utf8");
  // CREATE INDEX CONCURRENTLY cannot run inside Drizzle's migration transaction.
  await sql.unsafe(migration);
  const [index] = await sql`
    SELECT i.indisvalid AS valid, i.indisready AS ready,
      pg_get_indexdef(i.indexrelid, 1, true) AS first_column,
      pg_get_indexdef(i.indexrelid, 2, true) AS second_column,
      i.indnatts AS columns, i.indrelid = 'public.automation_outreach_events'::regclass AS correct_table,
      i.indpred IS NULL AS unfiltered
    FROM pg_index i
    WHERE i.indexrelid = to_regclass('public.automation_outreach_events_owner_outreach_idx')
  `;
  if (!index?.valid || !index.ready || !index.correct_table || !index.unfiltered ||
      index.columns !== 2 || index.first_column !== "user_id" || index.second_column !== "outreach_id") {
    throw new Error("Automation lookup index is invalid or has an unexpected definition. Inspect it before retrying; no existing index was removed.");
  }
  console.log("Automation lookup index is valid and ready.");
} finally {
  await sql.end();
}
