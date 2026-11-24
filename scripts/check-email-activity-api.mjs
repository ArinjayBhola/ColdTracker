// Production/dev HTTP checks with disposable records, removed in finally.
// Synthetic accepted-message records do not send emails or call the collector.
import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { encode } from "next-auth/jwt";
import postgres from "postgres";

const base = process.env.EMAIL_ACTIVITY_TEST_URL || "http://localhost:3000";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw new Error("Tests require a local server");
const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
if (!secret || !process.env.DATABASE_URL) throw new Error("Auth secret and DATABASE_URL are required");
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1, onnotice() {} });
const owners = [`email-activity-test-${randomUUID()}`, `email-activity-test-${randomUUID()}`];
const name = "authjs.session-token";
const cookies = await Promise.all(owners.map(async sub => `${name}=${await encode({ token: { sub }, secret, salt: name, maxAge: 600 })}`));
async function request(id, account = 0) {
  return fetch(`${base}/api/outreach/${id}/email-activity`, { headers: account === null ? {} : { Cookie: cookies[account] } });
}
try {
  await sql`INSERT INTO public."user" (id, email, receive_notifications)
    VALUES (${owners[0]}, ${owners[0] + "@example.invalid"}, false), (${owners[1]}, ${owners[1] + "@example.invalid"}, false)`;
  const [outreach] = await sql`INSERT INTO public.outreach ("userId", company_name, role_targeted)
    VALUES (${owners[0]}, 'Disposable email activity check', 'Engineer') RETURNING id`;
  assert.equal((await request(outreach.id, null)).status, 401);
  assert.equal((await request(outreach.id, 1)).status, 404, "other accounts cannot view activity");
  assert.equal((await request("invalid")).status, 400);
  const timings = [];
  for (const messages of [0, 50]) {
    if (messages) {
      await sql`INSERT INTO public.outreach_email_messages
        (user_id, outreach_id, attempt_id, sender_hash, recipient, subject, kind, token_hash, delivery_state, provider_id, sent_at, created_at)
        SELECT ${owners[0]}, ${outreach.id}, md5(${owners[0]} || g), repeat('a',64), 'audit@example.invalid',
          'Synthetic message ' || g, 'initial', md5(${owners[0]} || g) || md5(g::text), 'accepted', 'synthetic-provider',
          now() - g * interval '1 second', now() - g * interval '1 second' FROM generate_series(1,50) g`;
    }
    const samples = [];
    for (let i = 0; i < 4; i++) {
      const started = performance.now();
      const response = await request(outreach.id);
      const data = await response.json();
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("cache-control"), "private, no-store");
      assert.equal(data.messages.length, messages);
      assert.ok(data.messages.every(message => message.recentEvents.length === 0));
      if (i) samples.push(Math.round(performance.now() - started));
    }
    timings.push({ messages, warmSamplesMs: samples });
  }
  const messages = await sql`SELECT id FROM public.outreach_email_messages WHERE user_id = ${owners[0]} ORDER BY sent_at DESC`;
  await sql`UPDATE public.outreach_email_messages SET delivery_state = 'prepared', sent_at = NULL, provider_id = NULL WHERE id = ${messages[0].id}`;
  await sql`UPDATE public.outreach_email_messages SET delivery_state = 'ambiguous', sent_at = NULL, provider_id = NULL WHERE id = ${messages[1].id}`;
  const eventMessages = [messages[0].id, messages[1].id, messages[2].id, messages[25].id, messages[49].id];
  await sql`INSERT INTO public.outreach_email_open_events (id, message_id, observed_at)
    SELECT gen_random_uuid(), m.id, timestamp with time zone '2026-11-01T12:00:00Z' + g * interval '1 second' + g * interval '1 microsecond'
    FROM unnest(${eventMessages}::uuid[]) m(id) CROSS JOIN generate_series(1,25) g`;
  const response = await request(outreach.id);
  const data = await response.json();
  assert.equal(response.status, 200);
  const referenceEvents = await sql`SELECT message_id, observed_at FROM public.outreach_email_open_events
    WHERE message_id = ANY(${eventMessages}::uuid[]) ORDER BY observed_at DESC`;
  for (const message of data.messages) {
    if (message.deliveryState !== "accepted") {
      assert.deepEqual(message.recentEvents, [], "unaccepted events remain private");
      assert.equal(message.firstOpenAt, null);
      assert.equal(message.lastOpenAt, null);
      assert.equal(message.openCount, null);
    } else {
      const expected = referenceEvents.filter(event => event.message_id === message.id).slice(0, 20);
      assert.deepEqual(message.recentEvents, expected.map(event => ({ observedAt: event.observed_at.toISOString() })), "batch preserves each message's newest 20 timestamps");
    }
  }
  assert.equal(data.messages.filter(message => message.recentEvents.length === 20).length, 3);
  // The endpoint must still cap messages, and never include another owner's row.
  await sql`INSERT INTO public.outreach_email_messages
    (user_id, outreach_id, attempt_id, sender_hash, recipient, subject, kind, token_hash, delivery_state, provider_id, sent_at, created_at)
    SELECT ${owners[0]}, ${outreach.id}, md5(${owners[0]} || 'extra' || g), repeat('b',64), 'audit@example.invalid',
      'Older synthetic message', 'initial', md5(${owners[0]} || 'extra' || g) || md5(g::text), 'accepted', 'synthetic-provider',
      now() - interval '1 day', now() - interval '1 day' FROM generate_series(1,2) g`;
  await sql`INSERT INTO public.outreach_email_messages
    (user_id, outreach_id, attempt_id, sender_hash, recipient, subject, kind, token_hash, delivery_state, provider_id, sent_at)
    VALUES (${owners[1]}, ${outreach.id}, md5(${owners[1]}), repeat('c',64), 'foreign@example.invalid',
      'Must not be returned', 'initial', md5(${owners[1]}) || repeat('d',32), 'accepted', 'synthetic-provider', now())`;
  const capped = await (await request(outreach.id)).json();
  assert.equal(capped.messages.length, 50);
  assert.deepEqual(capped.messages.map(message => message.id), data.messages.map(message => message.id));
  assert.ok(capped.messages.every(message => message.recipient !== "foreign@example.invalid"));
  assert.doesNotMatch(JSON.stringify(capped), /tokenHash|token_hash|senderHash|sender_hash|attemptId/);
  console.log(JSON.stringify({ emailActivityTimings: timings }));
  console.log("Email activity HTTP checks passed: ownership, message cap, per-message event limits/order, unaccepted-event privacy, and timestamp serialization.");
} finally {
  try {
    await sql`DELETE FROM public."user" WHERE id IN ${sql(owners)}`;
    const [remaining] = await sql`SELECT count(*)::int AS count FROM public.outreach_email_messages WHERE user_id IN ${sql(owners)}`;
    assert.equal(remaining.count, 0, "synthetic messages must be removed");
    console.log("Disposable email activity accounts and messages removed.");
  } finally {
    await sql.end();
  }
}
