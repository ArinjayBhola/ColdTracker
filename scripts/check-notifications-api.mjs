// Run against a local dev server using the same .env database. Only synthetic
// test users are created; their records are removed in finally. No email sends.
import "dotenv/config";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { encode } from "next-auth/jwt";
import postgres from "postgres";
import createLoader from "./reliability-test-loader.cjs";

const { notificationRevision, oldestNotification } = createLoader()("lib/notifications.ts");

const base = process.env.NOTIFICATION_TEST_URL || "http://localhost:3000";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw new Error("Tests require a local server");
const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
if (!secret || !process.env.DATABASE_URL) throw new Error("App auth secret and DATABASE_URL are required");
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
const owners = [`notification-api-test-${randomUUID()}`, `notification-api-test-${randomUUID()}`];
const cookieName = new URL(base).protocol === "https:" ? "__Secure-authjs.session-token" : "authjs.session-token";
const cookies = await Promise.all(owners.map(async sub => `${cookieName}=${await encode({ token: { sub }, secret, salt: cookieName, maxAge: 600 })}`));
async function request(path = "", account = 0, body, extraHeaders = {}) {
  return fetch(`${base}/api/notifications${path}`, {
    method: body ? "PATCH" : "GET",
    headers: { ...(account === null ? {} : { Cookie: cookies[account] }), ...(body ? { "Content-Type": "application/json", Origin: base } : {}), ...extraHeaders },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
async function inbox(account = 0, path = "") {
  const response = await request(path, account);
  assert.equal(response.status, 200, `inbox request failed: ${await response.clone().text()}`);
  return response.json();
}
async function status(body, account = 0) {
  assert.equal((await request("", account, body)).status, 200);
}
async function summary(items, account = 0) {
  const oldest = oldestNotification(items);
  const params = new URLSearchParams({ summary: "1" });
  if (oldest) { params.set("oldestAt", oldest.createdAt); params.set("oldestId", oldest.id); }
  return inbox(account, `?${params}`);
}
try {
  const messages = await sql.begin(async tx => {
    const ids = [];
    for (const [index, owner] of owners.entries()) {
      await tx`INSERT INTO public."user" (id, email) VALUES (${owner}, ${owner + "@example.invalid"})`;
      const [outreach] = await tx`INSERT INTO public.outreach ("userId", company_name, role_targeted, contacts)
        VALUES (${owner}, 'Notification API test', 'Test', ${tx.json([{ personName: "Test Contact", emailAddress: "recipient@example.invalid" }])}) RETURNING id`;
      const [message] = await tx`INSERT INTO public.outreach_email_messages
        (user_id, outreach_id, attempt_id, sender_hash, recipient, subject, kind, token_hash, delivery_state, provider_id, sent_at)
        VALUES (${owner}, ${outreach.id}, ${randomBytes(16).toString("hex")}, ${randomBytes(32).toString("hex")},
          'recipient@example.invalid', 'Notification API test', 'initial', ${randomBytes(32).toString("hex")}, 'accepted', 'test-provider', now()) RETURNING id`;
      ids.push(message.id);
      for (let i = 1; i <= (index === 0 ? 35 : 1); i++) {
        const event = randomUUID();
        await tx`INSERT INTO public.outreach_email_open_events (id, message_id) VALUES (${event}, ${message.id})`;
        // Multiple rows inside the same millisecond expose lossy Date cursors.
        await tx`UPDATE public.notifications SET created_at = '2026-01-01T00:00:00.123000Z'::timestamptz + ${i} * interval '1 microsecond' WHERE id = ${event}`;
      }
    }
    return ids;
  });

  assert.equal((await request("", null)).status, 401, "authentication is required");
  assert.equal((await request("?cursor=invalid")).status, 400, "malformed cursors are rejected");
  assert.equal((await request("?summary=1", null)).status, 401, "summary requires authentication");
  assert.equal((await request("?summary=1&oldestAt=invalid&oldestId=invalid")).status, 400, "summary ranges are validated");
  assert.equal((await request("?summary=1&oldestAt=2026-01-01T00:00:00Z")).status, 400, "summary range fields must be paired");
  const first = await inbox();
  assert.equal(first.unreadCount, 35);
  assert.equal(first.items.length, 30);
  assert.equal(first.items[0].personName, "Test Contact");
  const second = await inbox(0, `?cursor=${encodeURIComponent(first.nextCursor)}`);
  assert.equal(second.items.length, 5);
  assert.equal(new Set([...first.items, ...second.items].map(item => item.id)).size, 35, "pagination preserves microseconds without gaps");
  assert.equal(second.nextCursor, null);
  const loaded = [...first.items, ...second.items];
  assert.equal((await summary(first.items)).revision, await notificationRevision(first.items), "first-page fingerprint matches PostgreSQL exactly");
  const baseline = await summary(loaded);
  assert.equal(baseline.revision, await notificationRevision(loaded), "loaded-window fingerprint preserves microsecond boundaries");
  assert.equal(baseline.unreadCount, 35);
  assert.equal((await summary(loaded)).revision, baseline.revision, "unchanged polls have stable revisions");
  assert.notEqual((await summary(loaded, 1)).revision, baseline.revision, "summary is account-scoped");
  const id = first.items[0].id;
  assert.equal((await request("", 0, { action: "read", id }, { Origin: "https://other.example" })).status, 403);
  assert.equal((await request("", 0, { action: "read", id: "invalid" })).status, 400);
  await status({ action: "read", id }, 1);
  assert.equal((await inbox()).unreadCount, 35, "another account cannot mark a notification read");
  await status({ action: "read", id });
  await status({ action: "read", id });
  assert.notEqual((await summary(loaded)).revision, baseline.revision, "read changes invalidate cached history");
  assert.equal((await inbox()).unreadCount, 34, "mark read is persisted and idempotent");
  await status({ action: "unread", id }, 1);
  assert.equal((await inbox()).unreadCount, 34, "another account cannot mark a notification unread");
  await status({ action: "unread", id });
  assert.equal((await summary(loaded)).revision, baseline.revision, "restoring unread state restores the same visible fingerprint");
  assert.equal((await inbox()).unreadCount, 35, "mark unread is persisted");
  const snapshot = await inbox();
  await sql`INSERT INTO public.outreach_email_open_events (id, message_id) VALUES (${randomUUID()}, ${messages[0]})`;
  assert.equal((await inbox()).unreadCount, 36, "new events appear without restarting the app");
  await status({ action: "read_all", through: snapshot.through });
  assert.equal((await inbox()).unreadCount, 1, "mark all read preserves arrivals newer than the displayed snapshot");
  assert.equal((await inbox(1)).unreadCount, 1, "accounts remain isolated");
  const latest = (await inbox()).items[0];
  await status({ action: "clear", id: latest.id }, 1);
  assert.equal((await inbox()).unreadCount, 1, "another account cannot clear a notification");
  await status({ action: "clear", id: latest.id });
  await status({ action: "clear", id: latest.id });
  assert.equal((await inbox()).unreadCount, 0, "clearing unread notifications updates the badge and is idempotent");
  await status({ action: "unread", id: latest.id });
  assert.equal((await inbox()).items.some(item => item.id === latest.id), false, "cleared notifications cannot be restored by a stale unread action");
  assert.equal((await sql`SELECT id FROM public.outreach_email_open_events WHERE id = ${latest.id}`).length, 1, "clearing notifications preserves email activity");
  const clearSnapshot = await inbox();
  await sql`INSERT INTO public.outreach_email_open_events (id, message_id) VALUES (${randomUUID()}, ${messages[0]})`;
  await status({ action: "clear_all", through: clearSnapshot.through });
  assert.equal((await inbox()).items.length, 1, "clear all preserves newer arrivals");
  assert.equal((await inbox(1)).unreadCount, 1, "clear all preserves the other account's inbox");
  await sql`UPDATE public.outreach_email_messages SET delivery_state = 'ambiguous' WHERE id = ${messages[0]}`;
  await sql`UPDATE public.outreach_email_messages SET delivery_state = 'accepted' WHERE id = ${messages[0]}`;
  assert.equal((await inbox()).items.length, 1, "replayed triggers cannot bring cleared notifications back");
  // Check three loaded pages and an arrival burst larger than one page.
  const [ownedOutreach] = await sql`SELECT outreach_id FROM public.outreach_email_messages WHERE id = ${messages[0]}`;
  await sql`INSERT INTO public.notifications (id, user_id, outreach_id, recipient, subject, observed_at, created_at)
    SELECT gen_random_uuid(), ${owners[0]}, ${ownedOutreach.outreach_id}, 'recipient@example.invalid', 'Polling history check', now(),
      now() - g * interval '1 second' FROM generate_series(1,95) g`;
  const pages = [await inbox()];
  for (let i = 0; i < 2; i++) pages.push(await inbox(0, `?cursor=${encodeURIComponent(pages.at(-1).nextCursor)}`));
  const history = pages.flatMap(page => page.items);
  assert.equal(history.length, 90);
  const historySummary = await summary(history);
  assert.equal(historySummary.revision, await notificationRevision(history));
  const timings = { historyPageMs: [], revisionMs: [] };
  for (let i = 0; i < 3; i++) {
    let started = performance.now();
    await inbox();
    timings.historyPageMs.push(Math.round(performance.now() - started));
    started = performance.now();
    await summary(history);
    timings.revisionMs.push(Math.round(performance.now() - started));
  }
  console.log(JSON.stringify({ notificationTiming: timings, revisionBytes: Buffer.byteLength(JSON.stringify(historySummary)) }));
  const older = history.at(-1);
  await status({ action: "read", id: older.id });
  assert.notEqual((await summary(history)).revision, historySummary.revision, "changes on page three are detected");
  await status({ action: "clear", id: older.id });
  assert.notEqual((await summary(history)).revision, historySummary.revision, "clears on page three are detected");
  await sql`UPDATE public.outreach SET contacts = ${sql.json([{ personName: "Renamed Contact", emailAddress: "recipient@example.invalid" }])}, updated_at = now() WHERE id = ${ownedOutreach.outreach_id}`;
  const renamed = await inbox();
  assert.equal(renamed.items[0].personName, "Renamed Contact");
  assert.notEqual((await summary(history)).revision, await notificationRevision(history), "contact edits invalidate cached display names");
  const beforeBurst = await summary(history);
  await sql`INSERT INTO public.notifications (id, user_id, outreach_id, recipient, subject, observed_at)
    SELECT gen_random_uuid(), ${owners[0]}, ${ownedOutreach.outreach_id}, 'recipient@example.invalid', 'Burst check', now()
    FROM generate_series(1,35)`;
  assert.notEqual((await summary(history)).revision, beforeBurst.revision, "bursts larger than a page trigger pagination refresh");
  const emptySummary = await summary([], 1);
  assert.equal(emptySummary.unreadCount, 1, "empty-cache checks still discover existing notifications");
  console.log("Notification HTTP checks passed: authentication, pagination, live events, read/unread, clearing, replay protection, and account isolation.");
  console.log("Revision checks passed: stable polling, loaded-page boundaries, historical status/clear changes, contact edits, bursts, and account isolation.");
} finally {
  await sql`DELETE FROM public."user" WHERE id IN ${sql(owners)}`;
  await sql.end();
  console.log("Synthetic notification API accounts removed.");
}
