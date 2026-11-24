import "dotenv/config";
import { readFile } from "node:fs/promises";
import postgres from "postgres";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const sql = postgres(process.env.DATABASE_URL, {
  prepare: false, max: 1, onnotice() {},
  connection: { lock_timeout: "5s", statement_timeout: "60s" },
});
try {
  const migration = await readFile(new URL("../drizzle/0018_follow_up_lookup.sql", import.meta.url), "utf8");
  await sql.begin(tx => tx.unsafe(migration));
  let cursor = null, processed = 0;
  for (;;) {
    // Lock each source row while deriving its lookup so a concurrent contact
    // update cannot be overwritten by an older backfill snapshot. Locks last
    // for at most one batch; the outreach records themselves are never updated.
    const rows = await sql.begin(tx => tx`
      WITH batch AS MATERIALIZED (
        SELECT id, "userId", status, contacts FROM public.outreach
        WHERE ${cursor}::uuid IS NULL OR id > ${cursor}::uuid ORDER BY id LIMIT 250 FOR UPDATE
      )
      SELECT id, public.coldtrack_sync_follow_up_lookup(id, "userId", status::text, contacts) FROM batch ORDER BY id
    `);
    if (!rows.length) break;
    processed += rows.length;
    cursor = rows.at(-1).id;
  }
  const [check] = await sql`
    SELECT (SELECT count(*) FROM public.outreach_follow_up_lookup)::int AS projected,
      (SELECT coalesce(sum(jsonb_array_length(contacts)), 0) FROM public.outreach)::int AS expected,
      (SELECT count(*) FROM public.outreach_follow_up_lookup f JOIN public.outreach o ON o.id = f.outreach_id
       WHERE f.user_id <> o."userId" OR f.contact_index >= jsonb_array_length(o.contacts)
         OR f.contact_id IS DISTINCT FROM (o.contacts->f.contact_index->>'id'))::int AS mismatched
  `;
  if (check.projected !== check.expected || check.mismatched) throw new Error("Follow-up lookup validation failed. Rerun the migration before deploying the query changes.");
  console.log(JSON.stringify({ processedOutreach: processed, projectedContacts: check.projected, verified: true }));
} finally {
  await sql.end();
}
