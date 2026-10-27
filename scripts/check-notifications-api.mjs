// Run against a local dev server using the same .env database. Only synthetic
// test users are created; their records are removed in finally. No email sends.
import "dotenv/config";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { encode } from "next-auth/jwt";
import postgres from "postgres";

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
  const first = await inbox();
  assert.equal(first.unreadCount, 35);
  assert.equal(first.items.length, 30);
  assert.equal(first.items[0].personName, "Test Contact");
  const second = await inbox(0, `?cursor=${encodeURIComponent(first.nextCursor)}`);
  assert.equal(second.items.length, 5);
  assert.equal(new Set([...first.items, ...second.items].map(item => item.id)).size, 35, "pagination preserves microseconds without gaps");
  assert.equal(second.nextCursor, null);
  const id = first.items[0].id;
  assert.equal((await request("", 0, { action: "read", id }, { Origin: "https://other.example" })).status, 403);
  assert.equal((await request("", 0, { action: "read", id: "invalid" })).status, 400);
  await status({ action: "read", id }, 1);
  assert.equal((await inbox()).unreadCount, 35, "another account cannot mark a notification read");
  await status({ action: "read", id });
  await status({ action: "read", id });
  assert.equal((await inbox()).unreadCount, 34, "mark read is persisted and idempotent");
  await status({ action: "unread", id }, 1);
  assert.equal((await inbox()).unreadCount, 34, "another account cannot mark a notification unread");
  await status({ action: "unread", id });
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
  console.log("Notification HTTP checks passed: authentication, pagination, live events, read/unread, clearing, replay protection, and account isolation.");
} finally {
  await sql`DELETE FROM public."user" WHERE id IN ${sql(owners)}`;
  await sql.end();
  console.log("Synthetic notification API accounts removed.");
}
