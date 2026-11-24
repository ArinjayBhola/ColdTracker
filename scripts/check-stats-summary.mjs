// Compare the real aggregate query against the existing record-based analytics.
// All fixtures and temporary tables are inside one rollback-only transaction.
import "dotenv/config";
import assert from "node:assert/strict";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import createLoader from "./reliability-test-loader.cjs";

const client = postgres(process.env.DATABASE_URL, { prepare: false, max: 1, onnotice() {} });
const rollback = new Error("ROLLBACK_STATS_CHECK");
try {
  await client.begin(async pg => {
    await pg`SET LOCAL statement_timeout = '20s'`;
    for (const table of ["user", "outreach", "goals"]) {
      await pg.unsafe(`CREATE TEMP TABLE "${table}" (LIKE public."${table}" INCLUDING DEFAULTS INCLUDING INDEXES) ON COMMIT DROP`);
    }
    await pg`SET LOCAL search_path TO pg_temp, public`;
    await pg`INSERT INTO "user" (id, email) VALUES ('stats-owner', 'stats@example.invalid'), ('stats-empty', 'empty@example.invalid'), ('stats-scale', 'scale@example.invalid')`;
    await pg`INSERT INTO goals (user_id, daily_target, weekly_target) VALUES ('stats-owner', 7, 30), ('stats-scale', 3, 10)`;
    const statuses = ["DRAFT", "SENT", "REPLIED", "INTERVIEW", "OFFER", "REJECTED", "GHOSTED", "CLOSED"];
    const times = ["2026-11-24T00:01:00Z", "2026-11-23T23:59:00Z", "2026-11-18T05:00:00Z", "2026-10-25T12:00:00Z", "2026-08-26T12:00:00Z", "2026-01-01T00:30:00Z", "2025-12-31T23:30:00Z", "2024-02-29T12:00:00Z", "2026-03-08T06:59:00Z", "2026-03-08T07:01:00Z", "2026-11-01T05:59:00Z", "2026-11-01T06:01:00Z", "2026-11-24T15:00:00Z", "2027-01-01T00:00:00Z"];
    const fixtures = Array.from({ length: 112 }, (_, index) => {
      const sent = times[index % times.length];
      const contacts = index % 7 === 0 ? [] : [{ personName: "Synthetic contact", contactMethod: index % 4 === 0 ? "LINKEDIN" : "EMAIL", messageSentAt: sent, followUpDueAt: "2026-11-23T23:00:00Z",
        ...(index % 3 === 0 ? { followUpSentAt: sent, followUp2DueAt: "2026-11-25T00:00:00Z" } : {}),
        ...(index % 5 === 0 ? { followUp2SentAt: sent } : {}) }];
      if (index % 4 === 0) contacts.push({ personName: "Second contact", contactMethod: "EMAIL", messageSentAt: "2027-02-01T00:00:00Z", followUpDueAt: "2026-11-22T10:00:00Z" });
      return { userId: "stats-owner", company_name: `Fixture ${index}`, role_targeted: "Engineer", status: statuses[index % statuses.length],
        created_at: times[(index + 3) % times.length], contacts,
        status_history: (index % 3 === 0 ? ["SENT", "REPLIED", "INTERVIEW", "OFFER", "OFFER"] : index % 3 === 1 ? ["SENT", "REPLIED"] : []).map(status => ({ status, at: sent, source: "observed" })) };
    });
    for (const invalid of ["not-a-date", "infinity", "tomorrow", ""]) fixtures.push({
      userId: "stats-owner", company_name: `Invalid date ${invalid}`, role_targeted: "Engineer", status: "SENT",
      created_at: "2026-11-23T12:00:00Z", contacts: [{ personName: "Legacy", contactMethod: "EMAIL", messageSentAt: invalid, followUpDueAt: invalid }], status_history: [],
    });
    await pg`INSERT INTO outreach ${pg(fixtures)}`;
    await pg`INSERT INTO outreach ("userId", company_name, role_targeted, status, contacts, status_history, created_at)
      SELECT 'stats-scale', 'Synthetic ' || g, 'Engineer', 'SENT', jsonb_build_array(
        jsonb_build_object('personName','First','contactMethod','EMAIL','messageSentAt', to_char(now()-(g%365)*interval '1 day','YYYY-MM-DD"T"HH24:MI:SS"Z"')),
        jsonb_build_object('personName','Second','contactMethod','EMAIL','messageSentAt', to_char(now()-(g%365)*interval '1 day','YYYY-MM-DD"T"HH24:MI:SS"Z"')),
        jsonb_build_object('personName','Third','contactMethod','LINKEDIN','messageSentAt', to_char(now()-(g%365)*interval '1 day','YYYY-MM-DD"T"HH24:MI:SS"Z"'))),
        jsonb_build_array(jsonb_build_object('status','SENT','at',now(),'source','baseline')), now()-(g%365)*interval '1 day'
      FROM generate_series(1,10000) g`;
    pg.options = client.options;
    const schema = createLoader()("db/schema.ts");
    const db = drizzle(pg, { schema });
    let owner = "stats-owner", zone = "UTC", now = "2026-11-24T12:00:00.000Z";
    const load = createLoader({ "@/db": { db }, "@/lib/auth": { auth: async () => ({ user: { id: owner } }) },
      "@/lib/user-time-zone": { getUserTimeZone: async () => zone, getUserDayBounds: async () => load("lib/user-calendar.ts").userDayBounds(zone, new Date(now)) } });
    const { readStatsSnapshot } = load("lib/stats-query.ts");
    const { getOutreachAnalyticsRecords } = load("actions/analytics.ts");
    const { getDashboardGoalsData } = load("actions/goals.ts");
    const { buildOutreachAnalytics } = load("lib/outreach-analytics.ts");
    const { buildActivityHeatmap, buildCountHeatmap } = load("lib/outreach-heatmap.ts");
    const records = await getOutreachAnalyticsRecords();
    for (zone of ["UTC", "Asia/Kolkata", "America/New_York", "Pacific/Kiritimati"]) {
      for (now of ["2026-11-24T12:00:00.000Z", "2026-03-08T07:00:00.000Z", "2026-11-01T06:00:00.000Z"]) {
        const snapshot = await readStatsSnapshot(owner, zone, now);
        for (const range of ["7", "30", "90", "all"]) assert.deepEqual(snapshot.analytics[range], buildOutreachAnalytics(records, range, now, zone), `${zone} ${now} ${range}: analytics parity`);
        for (const year of [2024, 2025, 2026]) for (const week of [0, 1]) {
          assert.deepEqual(buildCountHeatmap(snapshot.heatmap.counts, year, now, zone, week), buildActivityHeatmap(records, year, now, zone, week), `${zone} ${year}: heatmap parity`);
        }
        assert.deepEqual(snapshot.goals, await getDashboardGoalsData(), `${zone}: goals/streak parity`);
        assert.ok(Date.parse(snapshot.nextUpdateAt) > Date.parse(now));
      }
    }
    owner = "stats-empty";
    const empty = await readStatsSnapshot(owner, "UTC", now);
    assert.equal(empty.totalRecords, 0);
    assert.equal(empty.analytics.all.sent, 0);
    assert.equal(empty.goals.daily.target, 3);
    assert.equal(empty.goals.weekly.target, 10);
    assert.equal((await pg`SELECT id FROM goals WHERE user_id = 'stats-empty'`).length, 0, "opening Stats must not create a goal");
    owner = "stats-scale"; zone = "UTC"; now = new Date().toISOString();
    const raw = await getOutreachAnalyticsRecords();
    const rawBytes = Buffer.byteLength(JSON.stringify(raw));
    const clientStart = performance.now();
    buildOutreachAnalytics(raw, "30", now, zone);
    buildActivityHeatmap(raw, new Date(now).getUTCFullYear(), now, zone);
    const oldClientMs = performance.now() - clientStart;
    const started = performance.now();
    const snapshot = await readStatsSnapshot(owner, zone, now);
    const queryMs = performance.now() - started;
    const summaryBytes = Buffer.byteLength(JSON.stringify(snapshot));
    const newStart = performance.now();
    buildCountHeatmap(snapshot.heatmap.counts, new Date(now).getUTCFullYear(), now, zone);
    const newClientMs = performance.now() - newStart;
    assert.deepEqual(snapshot.analytics["30"], buildOutreachAnalytics(raw, "30", now, zone));
    assert.ok(summaryBytes < rawBytes / 10, "browser payload should shrink by at least 90% at 10,000 rows");
    console.log(JSON.stringify({ outreach: 10000, rawBytes, summaryBytes, aggregateQueryMs: +queryMs.toFixed(1), oldClientMs: +oldClientMs.toFixed(1), newClientMs: +newClientMs.toFixed(1) }));
    console.log("Stats parity checks passed: all ranges, stage history, contacts, future sends, DST, leap years, heatmaps, goals, defaults, and account isolation.");
    throw rollback;
  });
} catch (error) {
  if (error !== rollback) throw error;
} finally {
  await client.end();
  console.log("Temporary Stats fixtures rolled back.");
}
