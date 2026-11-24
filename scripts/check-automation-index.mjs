// Uses transaction-local temporary tables; application records are never changed.
import "dotenv/config";
import assert from "node:assert/strict";
import fs from "node:fs";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { PgDialect } from "drizzle-orm/pg-core";
import createLoader from "./reliability-test-loader.cjs";

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  const client = postgres(process.env.DATABASE_URL, { prepare: false, max: 1, onnotice() {} });
  const rollback = new Error("ROLLBACK_PERFORMANCE_CHECK");
  try {
    await client.begin(async pg => {
      await pg`SET LOCAL statement_timeout = '15s'`;
      for (const table of ["user", "outreach", "automation_outreach_events"]) {
        const indexes = table === "automation_outreach_events" ? "" : " INCLUDING INDEXES";
        await pg.unsafe(`CREATE TEMP TABLE "${table}" (LIKE public."${table}" INCLUDING DEFAULTS${indexes}) ON COMMIT DROP`);
      }
      // The real query uses unqualified tables, so pg_temp shadows public here.
      await pg`SET LOCAL search_path TO pg_temp, public`;
      const preferences = { table: { pageSize: 10, defaultMethod: "ALL" } };
      await pg`INSERT INTO "user" (id, email, preferences) VALUES ('audit-owner', 'audit@example.invalid', ${pg.json(preferences)}), ('audit-other', 'other@example.invalid', ${pg.json(preferences)})`;
      await pg`INSERT INTO outreach ("userId", company_name, role_targeted, status, contacts, created_at)
        SELECT 'audit-owner', 'Audit ' || g, 'Engineer', 'SENT',
          jsonb_build_array(jsonb_build_object('personName', 'Audit contact', 'contactMethod', 'EMAIL', 'messageSentAt', '2026-11-01T12:00:00Z')),
          timestamp '2026-11-01' + g * interval '1 second'
        FROM generate_series(1, 10000) g`;
      await pg`INSERT INTO automation_outreach_events (event_key, user_id, outreach_id, payload_sha256, result, message_sent_at)
        SELECT 'event-' || id, 'audit-owner', id, repeat('a',64), 'created', now() FROM outreach WHERE company_name LIKE '%0'`;
      const [manual] = await pg`SELECT id FROM outreach WHERE company_name = 'Audit 9999'`;
      const [automated] = await pg`SELECT id FROM outreach WHERE company_name = 'Audit 10000'`;
      // Another owner's ledger entry must not mark this owner's outreach automated.
      await pg`INSERT INTO automation_outreach_events (event_key, user_id, outreach_id, payload_sha256, result, message_sent_at)
        VALUES ('foreign-event', 'audit-other', ${manual.id}, repeat('b',64), 'created', now()),
          ('duplicate-event', 'audit-owner', ${automated.id}, repeat('c',64), 'merged', now())`;

      // Keep parser changes scoped to the harness rather than the real client.
      pg.options = { parsers: {}, serializers: {} };
      const database = drizzle(pg);
      let lastQuery;
      const db = { execute(query) { lastQuery = query; return database.execute(query); } };
      const readPage = createLoader({ "@/db": { db } })("lib/dashboard-query.ts").readDashboardPage;
      const dialect = new PgDialect();
      async function explain() {
        const query = dialect.sqlToQuery(lastQuery);
        const [row] = await pg.unsafe("EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) " + query.sql, query.params);
        return row["QUERY PLAN"][0];
      }
      const before = await readPage("audit-owner", 1, "ALL", { origin: "AUTOMATED" });
      const beforePlan = await explain();
      // Production uses CONCURRENTLY; temporary tables require ordinary creation.
      const migration = fs.readFileSync("drizzle/0017_automation_outreach_lookup.sql", "utf8")
        .replace("CREATE INDEX CONCURRENTLY", "CREATE INDEX").replace("ON public.", "ON pg_temp.");
      await pg.unsafe(migration);
      await pg.unsafe(migration); // Rerunnable, without duplicate indexes.
      for (const [origin, expected] of [["AUTOMATED", 1000], ["MANUAL", 9000], [undefined, 10000]]) {
        const page = await readPage("audit-owner", 1, "ALL", { origin });
        assert.equal(page.totalCount, expected, `${origin || "ALL"}: correct count`);
        assert.equal(page.items.length, 10);
        assert.equal(new Set(page.items.map(item => item.id)).size, 10, "ledger duplicates must not duplicate outreach");
        if (origin) assert.ok(page.items.every(item => item.isAutomated === (origin === "AUTOMATED")));
      }
      const after = await readPage("audit-owner", 1, "ALL", { origin: "AUTOMATED" });
      const afterPlan = await explain();
      assert.deepEqual(after, before, "index must preserve dashboard results exactly");
      const nodes = [];
      function visit(node) { nodes.push(node); for (const child of node.Plans || []) visit(child); }
      visit(afterPlan.Plan);
      assert.ok(nodes.some(node => node["Index Name"] === "automation_outreach_events_owner_outreach_idx"), "query should use the new lookup index");
      assert.ok(!nodes.some(node => node["Relation Name"] === "automation_outreach_events" && node["Node Type"] === "Seq Scan" && node["Actual Loops"] > 100), "must not repeatedly scan the ledger");
      const manualPage = await readPage("audit-owner", 1, "ALL", { origin: "MANUAL", q: "Audit 9999" });
      assert.equal(manualPage.totalCount, 1, "foreign ledger entry must not affect origin");
      assert.equal((await readPage("audit-other", 1, "ALL")).totalCount, 0, "account isolation");
      assert.equal((await readPage("audit-owner", 99999, "ALL", { origin: "AUTOMATED" })).currentPage, 100, "page clamping");
      console.log(JSON.stringify({ outreach: 10000, automated: 1000, beforeDatabaseMs: beforePlan["Execution Time"], afterDatabaseMs: afterPlan["Execution Time"], assertions: "passed" }));
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  } finally {
    await client.end();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
