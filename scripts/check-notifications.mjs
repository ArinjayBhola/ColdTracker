// Exercises the real PostgreSQL triggers inside a transaction that ALWAYS rolls
// back. Synthetic users only; no real messages, accounts or email sends touched.
import "dotenv/config";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import postgres from "postgres";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
const rollback = new Error("notification-check-rollback");
try {
  await sql.begin(async tx => {
    const owner = `notification-test-${randomUUID()}`;
    const stranger = `notification-test-${randomUUID()}`;
    await tx`INSERT INTO public."user" (id, email) VALUES (${owner}, ${owner + "@example.invalid"}), (${stranger}, ${stranger + "@example.invalid"})`;
    const [outreach] = await tx`INSERT INTO public.outreach ("userId", company_name, role_targeted) VALUES (${owner}, 'Notification test', 'Test') RETURNING id`;
    const [otherOutreach] = await tx`INSERT INTO public.outreach ("userId", company_name, role_targeted) VALUES (${stranger}, 'Other account test', 'Test') RETURNING id`;
    async function message(user, outreachId, state) {
      const [row] = await tx`INSERT INTO public.outreach_email_messages
        (user_id, outreach_id, attempt_id, sender_hash, recipient, subject, kind, token_hash, delivery_state, provider_id, sent_at)
        VALUES (${user}, ${outreachId}, ${randomBytes(16).toString("hex")}, ${randomBytes(32).toString("hex")},
          'recipient@example.invalid', 'Notification test', 'initial', ${randomBytes(32).toString("hex")}, ${state},
          ${state === "accepted" ? "test-provider" : null}, ${state === "accepted" ? new Date() : null}) RETURNING id`;
      return row.id;
    }
    async function event(messageId, id = randomUUID()) {
      await tx`INSERT INTO public.outreach_email_open_events (id, message_id) VALUES (${id}, ${messageId}) ON CONFLICT DO NOTHING`;
      return id;
    }
    const accepted = await message(owner, outreach.id, "accepted");
    const first = await event(accepted);
    let rows = await tx`SELECT * FROM public.notifications WHERE id = ${first}`;
    assert.equal(rows.length, 1, "an accepted email open creates one notification");
    assert.equal(rows[0].user_id, owner);
    assert.equal(rows[0].read_at, null);
    await event(accepted, first);
    rows = await tx`SELECT id FROM public.notifications WHERE id = ${first}`;
    assert.equal(rows.length, 1, "duplicate events do not duplicate notifications");

    const prepared = await message(owner, outreach.id, "prepared");
    const early = await event(prepared);
    assert.equal((await tx`SELECT id FROM public.notifications WHERE id = ${early}`).length, 0, "prepared email opens are withheld");
    await tx`UPDATE public.outreach_email_messages SET delivery_state = 'accepted', provider_id = 'test-provider', sent_at = now() WHERE id = ${prepared}`;
    assert.equal((await tx`SELECT id FROM public.notifications WHERE id = ${early}`).length, 1, "early opens publish after acceptance");

    const unlinked = await message(owner, null, "accepted");
    const unlinkedEvent = await event(unlinked);
    assert.equal((await tx`SELECT id FROM public.notifications WHERE id = ${unlinkedEvent}`).length, 0);
    await tx`UPDATE public.outreach_email_messages SET outreach_id = ${outreach.id} WHERE id = ${unlinked}`;
    assert.equal((await tx`SELECT id FROM public.notifications WHERE id = ${unlinkedEvent}`).length, 1, "late ERP links publish earlier opens");

    const mismatch = await message(stranger, outreach.id, "accepted");
    const mismatchEvent = await event(mismatch);
    assert.equal((await tx`SELECT id FROM public.notifications WHERE id = ${mismatchEvent}`).length, 0, "mismatched message/outreach ownership is never published");
    const failed = await message(owner, outreach.id, "failed");
    const failedEvent = await event(failed);
    assert.equal((await tx`SELECT id FROM public.notifications WHERE id = ${failedEvent}`).length, 0, "failed sends do not notify");

    const otherMessage = await message(stranger, otherOutreach.id, "accepted");
    const otherEvent = await event(otherMessage);
    await tx`UPDATE public.notifications SET read_at = now() WHERE id = ${first} AND user_id = ${stranger}`;
    assert.equal((await tx`SELECT read_at FROM public.notifications WHERE id = ${first}`)[0].read_at, null, "foreign account cannot mark another notification read");
    await tx`UPDATE public.notifications SET read_at = now() WHERE id = ${first} AND user_id = ${owner}`;
    assert.ok((await tx`SELECT read_at FROM public.notifications WHERE id = ${first}`)[0].read_at, "read status is persisted");
    await tx`UPDATE public.notifications SET read_at = NULL WHERE id = ${first} AND user_id = ${stranger}`;
    assert.ok((await tx`SELECT read_at FROM public.notifications WHERE id = ${first}`)[0].read_at, "foreign account cannot mark another notification unread");
    await tx`UPDATE public.notifications SET read_at = NULL WHERE id = ${first} AND user_id = ${owner}`;
    assert.equal((await tx`SELECT read_at FROM public.notifications WHERE id = ${first}`)[0].read_at, null, "notifications can be marked unread again");

    const [clock] = await tx`SELECT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS through`;
    const later = await event(accepted);
    await tx`UPDATE public.notifications SET created_at = now() + interval '1 second' WHERE id = ${later}`;
    await tx`UPDATE public.notifications SET read_at = now() WHERE user_id = ${owner} AND read_at IS NULL AND created_at <= ${clock.through}::timestamptz`;
    assert.equal((await tx`SELECT read_at FROM public.notifications WHERE id = ${later}`)[0].read_at, null, "mark all read preserves newer arrivals");
    assert.equal((await tx`SELECT read_at FROM public.notifications WHERE id = ${otherEvent}`)[0].read_at, null, "mark all read leaves other accounts untouched");

    await tx`DELETE FROM public.outreach_email_open_events WHERE id = ${first}`;
    assert.equal((await tx`SELECT id FROM public.notifications WHERE id = ${first}`).length, 1, "raw-event retention does not erase inbox history");
    await tx`DELETE FROM public.outreach WHERE id = ${outreach.id}`;
    assert.equal((await tx`SELECT id FROM public.notifications WHERE user_id = ${owner}`).length, 0, "deleting an outreach removes its notification links");
    console.log("Notification integration checks passed (creation, deduplication, delayed linkage, ownership, read state, retention, deletion).");
    throw rollback;
  });
} catch (error) {
  if (error !== rollback) throw error;
  console.log("All test records rolled back.");
} finally {
  await sql.end();
}
