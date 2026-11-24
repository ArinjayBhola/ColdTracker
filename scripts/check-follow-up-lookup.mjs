// Real PostgreSQL trigger/query checks in a private rollback-only schema.
import "dotenv/config";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import createLoader from "./reliability-test-loader.cjs";

const client = postgres(process.env.DATABASE_URL, { prepare: false, max: 1, onnotice() {} });
const namespace = `follow_up_check_${randomUUID().replaceAll("-", "")}`;
const rollback = new Error("ROLLBACK_FOLLOW_UP_LOOKUP");
try {
  await client.begin(async pg => {
    await pg`SET LOCAL statement_timeout = '30s'`;
    await pg.unsafe(`CREATE SCHEMA "${namespace}"; SET LOCAL search_path TO "${namespace}", pg_catalog`);
    for (const table of ["user", "outreach", "goals"]) await pg.unsafe(`CREATE TABLE "${table}" (LIKE public."${table}" INCLUDING DEFAULTS INCLUDING INDEXES)`);
    const history = (await readFile("drizzle/0016_outreach_history_reminders.sql", "utf8")).replace(/\bpublic\b/g, namespace);
    await pg.unsafe(history);
    await pg`INSERT INTO "user" (id, email) VALUES ('owner','owner@example.invalid'), ('other','other@example.invalid'), ('scale','scale@example.invalid')`;
    await pg`INSERT INTO goals (user_id,daily_target,weekly_target) VALUES ('owner',7,21)`;
    const states = ["DRAFT", "SENT", "REPLIED", "INTERVIEW", "OFFER", "REJECTED", "GHOSTED", "CLOSED"];
    for (let index = 0; index < 24; index++) {
      const contacts = [
        { id: "first", personName: "First", contactMethod: "EMAIL", followUpDueAt: "2026-11-01T00:00:00Z" },
        { id: "second", personName: "Second", contactMethod: "LINKEDIN", followUpDueAt: "2026-11-24T12:00:00+05:30" },
        { id: "third", personName: "Third", followUpSentAt: "2026-11-20T10:00:00Z", followUp2DueAt: "2026-11-25T00:00:00Z" },
        { id: "fourth", personName: "Fourth", followUpSentAt: "2026-11-20T10:00:00Z", followUp2DueAt: "2026-11-21T10:00:00Z", followUp2SentAt: "2026-11-22T10:00:00Z" },
        { id: "empty", personName: "Empty", followUpDueAt: "", followUpSentAt: "", followUp2DueAt: null, followUp2SentAt: "" },
      ];
      await pg`INSERT INTO outreach ("userId",company_name,role_targeted,status,contacts,created_at)
        VALUES (${index === 23 ? "other" : "owner"}, ${"Fixture " + index}, 'Engineer', ${states[index % 8]}, ${pg.json(contacts)}, '2026-11-24T10:00:00Z')`;
    }
    const before = await pg`SELECT id, contacts::text AS contacts, status_history::text AS history, updated_at::text AS updated FROM outreach ORDER BY id`;
    const migration = (await readFile("drizzle/0018_follow_up_lookup.sql", "utf8")).replace(/\bpublic\b/g, namespace);
    await pg.unsafe(migration);
    assert.equal((await pg`SELECT count(*)::int AS count FROM outreach_follow_up_lookup`)[0].count, 0);
    await pg.unsafe(`SELECT "${namespace}".coldtrack_sync_follow_up_lookup(id,"userId",status::text,contacts) FROM outreach`);
    await pg.unsafe(migration);
    await pg.unsafe(`SELECT "${namespace}".coldtrack_sync_follow_up_lookup(id,"userId",status::text,contacts) FROM outreach`);
    assert.deepEqual(await pg`SELECT id, contacts::text AS contacts, status_history::text AS history, updated_at::text AS updated FROM outreach ORDER BY id`, before, "installation/backfill never changes source records");
    assert.equal((await pg`SELECT count(*)::int AS count FROM outreach_follow_up_lookup`)[0].count, 120, "reruns must not duplicate contacts");
    console.log("Lookup install/backfill checks passed.");

    pg.options = client.options;
    const schema = createLoader()("db/schema.ts");
    const database = drizzle(pg, { schema });
    let captured;
    const db = new Proxy(database, { get(target, property) {
      if (property === "execute") return query => { captured = query; return target.execute(query); };
      const value = target[property]; return typeof value === "function" ? value.bind(target) : value;
    } });
    let owner = "owner", zone = "UTC", day;
    const load = createLoader({ "@/db": { db }, "@/lib/auth": { auth: async () => ({ user: { id: owner } }) },
      "@/lib/user-time-zone": { getUserTimeZone: async () => zone, getUserDayBounds: async () => ({ key: day.key, start: new Date(day.start), end: new Date(day.end) }) } });
    const { userDayBounds, calendarMidnight, shiftCalendarKey } = load("lib/user-calendar.ts");
    const { getFollowUpPage } = load("lib/follow-up-query.ts");
    const { getDashboardFocus } = load("actions/dashboard-focus.ts");
    function setDay(timeZone, asOf) {
      zone = timeZone; const bounds = userDayBounds(zone, new Date(asOf));
      day = { key: bounds.key, start: bounds.start.toISOString(), end: bounds.end.toISOString() };
    }
    // The pre-optimization SQL is retained as an independent correctness/plan baseline.
    async function legacyPage(category, page = 1, limit = 15, stage = "ALL") {
      const due = sql`CASE WHEN nullif(c->>'followUpSentAt','') IS NOT NULL THEN nullif(c->>'followUp2DueAt','')::timestamptz ELSE nullif(c->>'followUpDueAt','')::timestamptz END`;
      const conditions = [sql`o."userId" = ${owner}`];
      if (stage === "1") conditions.push(sql`nullif(c->>'followUpSentAt','') IS NULL`);
      if (stage === "2") conditions.push(sql`nullif(c->>'followUpSentAt','') IS NOT NULL`);
      if (category === "SENT") conditions.push(sql`nullif(c->>'followUp2SentAt','') IS NOT NULL`);
      else {
        conditions.push(sql`o.status NOT IN ('DRAFT','REPLIED','INTERVIEW','REJECTED','OFFER','CLOSED') AND nullif(c->>'followUp2SentAt','') IS NULL AND ${due} IS NOT NULL`);
        if (category === "OVERDUE") conditions.push(sql`${due} < ${day.start}::timestamptz`);
        if (category === "TODAY") conditions.push(sql`${due} >= ${day.start}::timestamptz AND ${due} < ${day.end}::timestamptz`);
        if (category === "UPCOMING") conditions.push(sql`${due} >= ${day.end}::timestamptz`);
      }
      return db.execute(sql`SELECT o.id, o.company_name AS "companyName", o.role_targeted AS "roleTargeted", o.status,
        c AS contact, ${due} AS "effectiveDue" FROM outreach o CROSS JOIN LATERAL jsonb_array_elements(o.contacts) c
        WHERE ${sql.join(conditions, sql` AND `)}
        ORDER BY ${category === "SENT" ? sql`(c->>'followUp2SentAt')::timestamptz DESC` : sql`${due} ASC`}, o.id, c->>'id'
        LIMIT ${limit + 1} OFFSET ${(page - 1) * limit}`);
    }
    async function compare(category, stage, page = 1) {
      const old = await legacyPage(category, page, 7, stage);
      const actual = await getFollowUpPage(owner, category, page, 7, stage, zone, day);
      assert.equal(actual.hasMore, old.length > 7);
      assert.deepEqual(actual.items.map(item => ({ id: item.id, contactId: item.contactId, companyName: item.companyName, roleTargeted: item.roleTargeted, status: item.status, personName: item.personName, due: item.followUpDueAt, contacts: item.contacts })), old.slice(0, 7).map(row => ({ id: row.id, contactId: row.contact.id, companyName: row.companyName, roleTargeted: row.roleTargeted, status: row.status, personName: row.contact.personName || "No Contact", due: row.effectiveDue, contacts: [row.contact] })), `${zone} ${category} ${stage} page ${page}`);
    }
    async function compareFocus() {
      const weekday = (new Date(day.key + "T12:00:00Z").getUTCDay() + 6) % 7;
      const week = calendarMidnight(shiftCalendarKey(day.key, -weekday), zone).toISOString();
      const weekEnd = calendarMidnight(shiftCalendarKey(day.key, 7 - weekday), zone).toISOString();
      const [old] = await db.execute(sql`SELECT
        count(*) FILTER (WHERE created_at >= ${day.start}::timestamptz AT TIME ZONE 'UTC' AND created_at < ${day.end}::timestamptz AT TIME ZONE 'UTC')::int AS daily,
        count(*) FILTER (WHERE created_at >= ${week}::timestamptz AT TIME ZONE 'UTC' AND created_at < ${weekEnd}::timestamptz AT TIME ZONE 'UTC')::int AS weekly,
        coalesce(sum(CASE WHEN status NOT IN ('DRAFT','REPLIED','INTERVIEW','REJECTED','OFFER','CLOSED') THEN
          (SELECT count(*) FROM jsonb_array_elements(contacts) c WHERE nullif(c->>'followUp2SentAt','') IS NULL AND
            (CASE WHEN nullif(c->>'followUpSentAt','') IS NOT NULL THEN nullif(c->>'followUp2DueAt','')::timestamptz ELSE nullif(c->>'followUpDueAt','')::timestamptz END) < ${day.end}::timestamptz) ELSE 0 END),0)::int AS due,
        coalesce((SELECT daily_target FROM goals WHERE user_id = ${owner} LIMIT 1),3) AS "dailyTarget",
        coalesce((SELECT weekly_target FROM goals WHERE user_id = ${owner} LIMIT 1),10) AS "weeklyTarget" FROM outreach WHERE "userId" = ${owner}`);
      assert.deepEqual(await getDashboardFocus(), old, "dashboard summary parity");
    }
    setDay("UTC", "2026-11-24T12:00:00Z");
    for (const category of ["ALL_ACTIVE", "OVERDUE", "TODAY", "UPCOMING", "SENT"]) for (const stage of ["ALL", "1", "2"]) {
      await compare(category, stage); await compare(category, stage, 2);
    }
    console.log("Category, stage, and pagination parity passed.");
    for (const [timeZone, now] of [["Asia/Kolkata", "2026-11-24T20:00:00Z"], ["America/New_York", "2026-11-01T06:00:00Z"], ["America/New_York", "2026-03-08T07:00:00Z"]]) {
      setDay(timeZone, now);
      for (const category of ["OVERDUE", "TODAY", "UPCOMING"]) await compare(category, "ALL");
      await compareFocus();
    }
    owner = "other"; await compare("SENT", "ALL"); await compareFocus();
    console.log("Timezone, DST, ownership, and dashboard summary parity passed.");
    owner = "owner";
    const [sample] = await pg`SELECT id, contacts FROM outreach WHERE "userId" = 'owner' AND status = 'SENT' LIMIT 1`;
    for (const status of states) {
      await pg`UPDATE outreach SET status = ${status} WHERE id = ${sample.id}`;
      await compare("ALL_ACTIVE", "ALL"); await compare("SENT", "ALL"); await compareFocus();
    }
    const changed = [sample.contacts[3], sample.contacts[0], { ...sample.contacts[2], id: sample.contacts[0].id, followUp2DueAt: "2026-11-26T00:00:00Z" }];
    await pg`UPDATE outreach SET contacts = ${JSON.stringify(changed)}::jsonb, status = 'SENT' WHERE id = ${sample.id}`;
    await compare("ALL_ACTIVE", "ALL"); await compare("SENT", "ALL");
    assert.equal((await pg`SELECT count(*)::int AS count FROM outreach_follow_up_lookup WHERE outreach_id = ${sample.id}`)[0].count, 3, "removed contacts disappear and duplicate IDs remain distinct by position");
    const versions = await pg`SELECT contact_index, ctid::text AS version FROM outreach_follow_up_lookup WHERE outreach_id = ${sample.id} ORDER BY contact_index`;
    await pg`UPDATE outreach SET notes = 'Unrelated note', contacts = jsonb_set(contacts, '{0,personName}', '"Renamed"'::jsonb) WHERE id = ${sample.id}`;
    assert.deepEqual(await pg`SELECT contact_index, ctid::text AS version FROM outreach_follow_up_lookup WHERE outreach_id = ${sample.id} ORDER BY contact_index`, versions, "unrelated contact/details edits do not rewrite lookup rows");
    await compare("SENT", "ALL");
    await pg`UPDATE outreach SET contacts = '[]'::jsonb WHERE id = ${sample.id}`;
    assert.equal((await pg`SELECT count(*)::int AS count FROM outreach_follow_up_lookup WHERE outreach_id = ${sample.id}`)[0].count, 0, "clearing all contacts removes derived rows");
    await pg`UPDATE outreach SET contacts = ${JSON.stringify(changed)}::jsonb WHERE id = ${sample.id}`;
    await pg`UPDATE outreach SET "userId" = 'other' WHERE id = ${sample.id}`;
    await compare("ALL_ACTIVE", "ALL"); owner = "other"; await compare("ALL_ACTIVE", "ALL");
    await pg`DELETE FROM outreach WHERE id = ${sample.id}`;
    assert.equal((await pg`SELECT count(*)::int AS count FROM outreach_follow_up_lookup WHERE outreach_id = ${sample.id}`)[0].count, 0, "outreach deletion cascades");
    console.log("Source mutation and cascade checks passed. Starting scale fixture.");

    // Representative scale measurement, including contact history that reads
    // should leave in JSONB until the indexed page has been selected.
    await pg`INSERT INTO outreach ("userId",company_name,role_targeted,status,contacts,created_at)
      SELECT 'scale','Scale '||g,'Engineer','SENT', (SELECT jsonb_agg(jsonb_build_object('id',g||'-'||c,
        'personName','Synthetic','contactMethod','EMAIL','followUpDueAt',to_char(now()+(g%30-15)*interval '1 day','YYYY-MM-DD"T"HH24:MI:SS"Z"'),
        'followUpHistory',(SELECT jsonb_agg(jsonb_build_object('stage',1,'action','rescheduled','at',now(),'date',now())) FROM generate_series(1,15))))
        FROM generate_series(1,3)c),now()-(g%365)*interval '1 day' FROM generate_series(1,10000)g`;
    owner = "scale"; setDay("UTC", new Date().toISOString());
    const dialect = new PgDialect();
    async function plan(query) {
      const compiled = dialect.sqlToQuery(query);
      const [result] = await pg.unsafe("EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) " + compiled.sql, compiled.params);
      return result["QUERY PLAN"][0];
    }
    await legacyPage("ALL_ACTIVE"); const beforePlan = await plan(captured);
    await getFollowUpPage(owner, "ALL_ACTIVE", 1, 15, "ALL", zone, day); const afterPlan = await plan(captured);
    const nodes = [];
    function visit(node) { nodes.push(node); for (const child of node.Plans || []) visit(child); }
    visit(afterPlan.Plan);
    assert.ok(nodes.some(node => node["Index Name"]?.includes("follow_up_lookup_owner_due")), "default page must use the due index");
    assert.ok(!nodes.some(node => node["Node Type"] === "Function Scan"), "reading pages must not expand JSON contact arrays");
    await getFollowUpPage(owner, "ALL_ACTIVE", 1, 15, "1", zone, day); const stagePlan = await plan(captured);
    assert.match(JSON.stringify(stagePlan), /follow_up_lookup_owner_stage_due_idx/);
    await compareFocus(); const focusPlan = await plan(captured);
    assert.doesNotMatch(JSON.stringify(focusPlan), /jsonb_array_elements/);
    console.log(JSON.stringify({ outreach: 10000, contacts: 30000, beforePageDatabaseMs: beforePlan["Execution Time"], afterPageDatabaseMs: afterPlan["Execution Time"], focusDatabaseMs: focusPlan["Execution Time"] }));
    console.log("Follow-up lookup checks passed: reruns, unchanged source data, categories/stages, pagination, timezone/DST, ownership, status changes, contact reorder/removal, duplicate IDs, deletion, and index plans.");
    throw rollback;
  });
} catch (error) {
  if (error !== rollback) throw error;
} finally { await client.end(); console.log("Private follow-up fixtures rolled back."); }
