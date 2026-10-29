// Uses a private schema inside one transaction, always rolled back. It never
// migrates application tables, modifies real accounts, or sends an email.
require("dotenv/config");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs");
const postgres = require("postgres");
const { drizzle } = require("drizzle-orm/postgres-js");
const createLoader = require("./reliability-test-loader.cjs");

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  const client = postgres(process.env.DATABASE_URL, { prepare: false, max: 1, onnotice() {} });
  const rollback = new Error("ROLLBACK_SYNTHETIC_TESTS");
  const namespace = `coldtrack_check_${randomUUID().replaceAll("-", "")}`;
  try {
    await client.begin(async pg => {
      await pg.unsafe(`CREATE SCHEMA "${namespace}"`);
      await pg.unsafe(`SET LOCAL search_path TO "${namespace}", pg_catalog`);
      await pg.unsafe(`CREATE TABLE "user" (id text PRIMARY KEY, email text, name text, time_zone text,
        notification_email text, receive_notifications boolean DEFAULT true);
        CREATE TABLE outreach (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "userId" text REFERENCES "user"(id),
          company_name text NOT NULL, company_link text, role_targeted text NOT NULL, application_source text DEFAULT 'DIRECT_EMAIL',
          application_url text, application_status text DEFAULT 'SENT', status text NOT NULL DEFAULT 'DRAFT', notes text,
          contacts jsonb NOT NULL DEFAULT '[]', follow_up_sent_at timestamp, follow_up_2_due_at timestamp,
          follow_up_2_sent_at timestamp, created_at timestamp NOT NULL DEFAULT now(), updated_at timestamp NOT NULL DEFAULT now());`);
      await pg`INSERT INTO "user" (id, email, time_zone) VALUES ('owner', 'synthetic@example.com', 'UTC'), ('other', 'other@example.com', 'UTC')`;
      const contacts = [{ personName: "First", personRole: "HR", contactMethod: "EMAIL", followUpDueAt: "2026-10-27T00:00:00Z" },
        { personName: "Second", personRole: "HR", contactMethod: "LINKEDIN", followUpDueAt: "2026-10-28T00:00:00Z" }];
      const [legacy] = await pg`INSERT INTO outreach ("userId", company_name, role_targeted, status, contacts, follow_up_sent_at, follow_up_2_due_at)
        VALUES ('owner', 'Synthetic', 'Engineer', 'SENT', ${pg.json(contacts)}, '2026-10-28', '2026-10-29') RETURNING id`;
      const migration = fs.readFileSync("drizzle/0016_outreach_history_reminders.sql", "utf8")
        .replace(/^BEGIN;\s*/m, "").replace(/^COMMIT;\s*/m, "").replace(/\bpublic\b/g, namespace);
      await pg.unsafe(migration);
      const [beforeRerun] = await pg`SELECT * FROM outreach WHERE id = ${legacy.id}`;
      await pg.unsafe(migration);
      const [afterRerun] = await pg`SELECT * FROM outreach WHERE id = ${legacy.id}`;
      assert.deepEqual(afterRerun.contacts, beforeRerun.contacts, "migration must preserve IDs and follow-ups on rerun");
      assert.equal(afterRerun.status_history.length, 1);
      assert.equal(afterRerun.status_history[0].source, "baseline");
      assert.ok(afterRerun.contacts[0].followUpSentAt);
      assert.equal(afterRerun.contacts[1].followUpSentAt, undefined, "legacy completion must not be copied to every contact");
      assert.notEqual(afterRerun.contacts[0].id, afterRerun.contacts[1].id);
      await pg`UPDATE outreach SET status = 'REPLIED' WHERE id = ${legacy.id}`;
      await pg`UPDATE outreach SET status = 'INTERVIEW' WHERE id = ${legacy.id}`;
      await pg`UPDATE outreach SET status = 'REJECTED' WHERE id = ${legacy.id}`;
      await pg`UPDATE outreach SET notes = 'unrelated edit', status_history = '[]' WHERE id = ${legacy.id}`;
      const [historical] = await pg`SELECT status_history FROM outreach WHERE id = ${legacy.id}`;
      assert.deepEqual(historical.status_history.map(event => event.status), ["SENT", "REPLIED", "INTERVIEW", "REJECTED"]);
      assert.equal(historical.status_history.filter(event => event.source === "observed").length, 3);
      await pg`UPDATE outreach SET status = 'SENT' WHERE id = ${legacy.id}`;

      const schema = createLoader()("db/schema.ts");
      pg.options = client.options;
      const db = drizzle(pg, { schema });
      // postgres-js scoped clients expose savepoint rather than begin. Bind
      // action transactions to real savepoints inside the rollback-only scope.
      db.transaction = callback => pg.savepoint(scoped => {
        scoped.options = client.options;
        return callback(drizzle(scoped, { schema }));
      });
      let deliveries = [];
      let failProvider = false;
      const mocks = {
        "@/db": { db }, "@/db/schema": schema,
        "@/lib/auth": { auth: async () => ({ user: { id: "owner" } }) },
        "@/lib/user-time-zone": { getUserTimeZone: async () => "UTC" },
        "@/actions/preferences": { getAccountPreferences: async () => ({ preferences: { followUp: { firstDelay: 3, secondDelay: 3, skipWeekends: false } } }) },
        "next/cache": { revalidatePath() {} },
        "@/lib/resend": {
          buildReminderEmail: (kind, to, name, pendingCount) => ({ from: "test@example.com", to: [to], subject: kind, html: `${name}:${pendingCount}` }),
          sendReminderEmail: async (payload, key) => {
            deliveries.push({ payload, key });
            if (failProvider) throw new Error("Simulated provider timeout");
            return { data: { id: "synthetic-provider-id" }, error: null };
          },
        },
      };
      const load = createLoader(mocks);
      const { getOutreachAnalyticsRecords } = load("actions/analytics.ts");
      const analyticsRows = await getOutreachAnalyticsRecords();
      assert.equal(analyticsRows.length, 1);
      assert.ok(analyticsRows[0].statusHistory.some(event => event.status === "REPLIED"));
      assert.equal(analyticsRows[0].followUpDueAt, "2026-10-28T00:00:00.000Z");
      const { getFollowUpPage } = load("lib/follow-up-query.ts");
      const browserDay = { key: "2026-10-29", start: "2026-10-29T00:00:00Z", end: "2026-10-30T00:00:00Z" };
      const page1 = await getFollowUpPage("owner", "ALL_ACTIVE", 1, 1, "ALL", "UTC", browserDay);
      const page2 = await getFollowUpPage("owner", "ALL_ACTIVE", 2, 1, "ALL", "UTC", browserDay);
      assert.equal(page1.hasMore, true);
      assert.equal(page2.hasMore, false);
      assert.notEqual(page1.items[0].contactId, page2.items[0].contactId);
      assert.equal((await getFollowUpPage("other", "ALL_ACTIVE", 1, 10, "ALL", "UTC", browserDay)).items.length, 0);
      assert.equal((await getFollowUpPage("owner", "OVERDUE", 1, 10, "1", "UTC", browserDay)).items[0].personName, "Second");
      assert.equal((await getFollowUpPage("owner", "TODAY", 1, 10, "2", "UTC", browserDay)).items[0].personName, "First");

      const followUps = load("actions/follow-ups.ts");
      const contactId = afterRerun.contacts[1].id;
      const firstContact = afterRerun.contacts[0];
      const sentDate = new Date("2026-10-29T10:00:00Z");
      assert.equal((await followUps.toggleFollowUpSentAction(legacy.id, true, sentDate, contactId, 1)).success, true);
      assert.equal((await followUps.toggleFollowUpSentAction(legacy.id, true, undefined, contactId, 1)).success, true);
      let [updated] = await pg`SELECT contacts FROM outreach WHERE id = ${legacy.id}`;
      assert.deepEqual(updated.contacts[0], firstContact);
      assert.equal(updated.contacts[1].followUpHistory.length, 1, "retry must not advance stage or append a second send");
      assert.equal(updated.contacts[1].followUp2SentAt, undefined);
      assert.equal((await followUps.updateFollowUpDateAction(legacy.id, new Date("2026-11-02"), contactId, 2)).success, true);
      assert.equal((await followUps.toggleFollowUpSentAction(legacy.id, true, sentDate, contactId, 2)).success, true);
      const sentQueue = await getFollowUpPage("owner", "SENT", 1, 10, "ALL", "UTC", browserDay);
      assert.equal(sentQueue.items.length, 1);
      assert.equal(sentQueue.items[0].contactId, contactId);
      assert.equal((await followUps.toggleFollowUpSentAction(legacy.id, false, undefined, contactId, 2)).success, true);
      assert.equal((await followUps.toggleFollowUpSentAction(legacy.id, false, undefined, contactId, 1)).success, true);
      [updated] = await pg`SELECT contacts FROM outreach WHERE id = ${legacy.id}`;
      assert.equal(updated.contacts[1].followUpSentAt, null);
      assert.equal(updated.contacts[1].followUp2DueAt, null);
      assert.equal(updated.contacts[1].followUpHistory.length, 5);

      const mixedStage = await followUps.markAllFollowUpsSentAction(legacy.id, 2);
      assert.equal(mixedStage.updatedCount, 1, "stage 2 only applies to contacts with stage 1 recorded");
      assert.equal(mixedStage.item.contacts[1].followUp2SentAt, null, "stage 2 must not skip an unsent first follow-up");
      const completedFirst = mixedStage.item.contacts[0];
      const bulkFirst = await followUps.markAllFollowUpsSentAction(legacy.id, 1);
      assert.equal(bulkFirst.success, true);
      assert.equal(bulkFirst.updatedCount, 1, "only the remaining first follow-up is marked sent");
      assert.deepEqual(bulkFirst.item.contacts[0], completedFirst, "already completed contact dates/history are unchanged");
      assert.equal((await followUps.markAllFollowUpsSentAction(legacy.id, 1)).updatedCount, 0, "bulk retries do not advance to stage 2");
      const bulkSecond = await followUps.markAllFollowUpsSentAction(legacy.id, 2);
      assert.equal(bulkSecond.updatedCount, 1);
      assert.ok(bulkSecond.item.contacts.every(contact => contact.followUp2SentAt));
      assert.equal((await followUps.markAllFollowUpsSentAction(legacy.id, 2)).updatedCount, 0);
      const signedOut = createLoader({ ...mocks, "@/lib/auth": { auth: async () => null } })("actions/follow-ups.ts");
      assert.equal((await signedOut.markAllFollowUpsSentAction(legacy.id, 1)).error, "Unauthorized");

      const { deliverReminder } = load("lib/reminder-delivery.ts");
      const outcomes = await Promise.all([deliverReminder("owner", "2026-10-29", "daily", "synthetic@example.com", "Test"),
        deliverReminder("owner", "2026-10-29", "daily", "synthetic@example.com", "Test")]);
      assert.deepEqual(outcomes.sort(), ["sent", "skipped"]);
      assert.equal(deliveries.length, 1);
      failProvider = true;
      await assert.rejects(deliverReminder("owner", "2026-10-29", "follow_up", "synthetic@example.com", "Test", 2));
      const failedAttempt = deliveries.at(-1);
      await pg`UPDATE reminder_deliveries SET attempted_at = now() - interval '6 minutes' WHERE kind = 'follow_up'`;
      failProvider = false;
      await deliverReminder("owner", "2026-10-29", "follow_up", "changed@example.com", "Changed", 999);
      assert.deepEqual(deliveries.at(-1), failedAttempt, "retry must freeze recipient, content, and idempotency key");
      const [delivery] = await pg`SELECT * FROM reminder_deliveries WHERE kind = 'follow_up'`;
      assert.equal(delivery.state, "sent");
      assert.equal(delivery.attempts, 2);
      assert.equal(delivery.provider_id, "synthetic-provider-id");
      await pg`UPDATE reminder_deliveries SET state = 'failed', created_at = now() - interval '24 hours', attempted_at = now() - interval '6 minutes' WHERE kind = 'follow_up'`;
      const sentCount = deliveries.length;
      assert.equal(await deliverReminder("owner", "2026-10-29", "follow_up", "synthetic@example.com", "Test", 2), "skipped");
      assert.equal(deliveries.length, sentCount, "never retry after the idempotency window");
      await pg`UPDATE "user" SET reminder_time = '00:00'`;
      const previousSecret = process.env.CRON_SECRET;
      process.env.CRON_SECRET = "synthetic-cron-secret";
      try {
        const calendar = load("lib/user-calendar.ts");
        const scheduler = createLoader({ ...mocks,
          "@/lib/reminder-delivery": { deliverReminder },
          "@/lib/reminder-schedule": { reminderDay: () => "2026-10-29" },
          "@/lib/user-calendar": { ...calendar, userDayBounds: () => ({ key: browserDay.key, start: new Date(browserDay.start), end: new Date(browserDay.end) }) },
        })("app/api/cron/notifications/route.ts");
        const request = () => new Request("http://localhost/api/cron/notifications", { headers: { authorization: "Bearer synthetic-cron-secret" } });
        assert.equal((await scheduler.GET(request())).status, 200);
        const countAfterFirstRun = deliveries.length;
        assert.equal((await scheduler.GET(request())).status, 200);
        assert.equal(deliveries.length, countAfterFirstRun, "repeated scheduler requests must not send again");
        const [expired] = await pg`SELECT state FROM reminder_deliveries WHERE user_id = 'owner' AND kind = 'follow_up'`;
        assert.equal(expired.state, "expired");
      } finally {
        if (previousSecret === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = previousSecret;
      }
      console.log("Passed: rerunnable migration, status history, contact queues and mutations, reminder claims and frozen retries. Rolling back all synthetic objects.");
      throw rollback;
    });
  } catch (error) { if (error !== rollback) throw error; }
  finally { await client.end(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
