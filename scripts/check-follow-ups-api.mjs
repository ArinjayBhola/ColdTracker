// Disposable-account checks against a local production/dev server. No emails.
import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import postgres from "postgres";
import { encode } from "next-auth/jwt";
import createLoader from "./reliability-test-loader.cjs";

const base = process.env.FOLLOW_UP_TEST_URL || "http://localhost:3000";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw new Error("Tests require a local server");
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1, onnotice() {} });
const owners = [`follow-up-http-${randomUUID()}`, `follow-up-http-${randomUUID()}`];
const day = createLoader()("lib/user-calendar.ts").userDayBounds("Asia/Calcutta");
const browserDay = { key: day.key, start: day.start.toISOString(), end: day.end.toISOString() };
const cookies = await Promise.all(owners.map(async sub => `authjs.session-token=${await encode({ token: { sub }, secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET, salt: "authjs.session-token", maxAge: 600 })}; coldtrack-time-zone=Asia%2FCalcutta; coldtrack-day=${encodeURIComponent(JSON.stringify(browserDay))}`));
async function request(route, account = 0) { return fetch(base + route, { headers: account === null ? {} : { Cookie: cookies[account] } }); }
const queuePath = (category = "ALL_ACTIVE", stage = "ALL", page = 1, filters = {}) => "/api/follow-ups?" + new URLSearchParams({ category, stage, page: String(page), timeZone: "Asia/Calcutta", ...filters });
async function queue(category = "ALL_ACTIVE", stage = "ALL", page = 1, filters = {}) {
  const response = await request(queuePath(category, stage, page, filters));
  assert.equal(response.status, 200); return response.json();
}
try {
  await sql`INSERT INTO public."user" (id,email,receive_notifications) VALUES
    (${owners[0]},${owners[0]+"@example.invalid"},false), (${owners[1]},${owners[1]+"@example.invalid"},false)`;
  const yesterday = new Date(+day.start - 86400000).toISOString();
  const today = new Date(+day.start + 3600000).toISOString();
  const sent = new Date().toISOString();
  await sql`INSERT INTO public.outreach ("userId",company_name,role_targeted,status,contacts)
    SELECT ${owners[0]},'Synthetic follow-up '||g,'Engineer','SENT',jsonb_build_array(
      jsonb_build_object('id',md5(g::text||'-first'),'personName','First','contactMethod','EMAIL','followUpDueAt',${yesterday}::text),
      jsonb_build_object('id',md5(g::text||'-second'),'personName','Second','contactMethod','LINKEDIN','followUpSentAt',${sent}::text,'followUp2DueAt',${today}::text),
      jsonb_build_object('id',md5(g::text||'-done'),'personName','Done','contactMethod','EMAIL','followUpSentAt',${sent}::text,'followUp2DueAt',${today}::text,'followUp2SentAt',${sent}::text))
    FROM generate_series(1,1000)g`;
  const [sample] = await sql`SELECT id FROM public.outreach WHERE "userId"=${owners[0]} ORDER BY id LIMIT 1`;
  const fingerprint = async () => (await sql`SELECT md5(string_agg(id::text || contacts::text || status_history::text || updated_at::text, E'\n' ORDER BY id)) AS value FROM public.outreach WHERE "userId"=${owners[0]}`)[0].value;
  const before = await fingerprint();
  // Exercise actual backfill batches against populated fixtures, including one
  // deliberately missing synthetic projection. No source row is edited.
  await sql`DELETE FROM public.outreach_follow_up_lookup WHERE outreach_id=${sample.id} AND user_id=${owners[0]}`;
  execFileSync(process.execPath, ["scripts/migrate-follow-up-lookup.mjs"], { encoding: "utf8", timeout: 60000, stdio: ["ignore", "pipe", "pipe"] });
  assert.equal(await fingerprint(), before, "migration/backfill must not alter source contacts/history/timestamps");
  assert.equal((await sql`SELECT count(*)::int AS count FROM public.outreach_follow_up_lookup WHERE user_id=${owners[0]}`)[0].count, 3000);
  assert.equal((await request(queuePath(), null)).status, 401);
  assert.equal((await request("/api/follow-ups?category=BAD&page=1&stage=ALL&timeZone=UTC")).status, 400);
  assert.equal((await (await request(queuePath(), 1)).json()).items.length, 0, "other accounts cannot read the queue");
  const first = await queue(); const second = await queue("ALL_ACTIVE", "ALL", 2);
  assert.equal(first.items.length, 15); assert.equal(first.hasMore, true);
  assert.equal(new Set([...first.items, ...second.items].map(item => item.id + ":" + item.contactId)).size, 30);
  assert.ok((await queue("OVERDUE", "1")).items.every(item => item.personName === "First"));
  assert.ok((await queue("TODAY", "2")).items.every(item => item.personName === "Second"));
  assert.ok((await queue("SENT", "2")).items.every(item => item.personName === "Done"));
  assert.equal((await queue("UPCOMING")).items.length, 0);
  const timings = [];
  for (const route of [queuePath(), "/dashboard", "/follow-ups"]) {
    const samples = [];
    for (let index = 0; index < 4; index++) {
      const started = performance.now(); const response = await request(route); const body = await response.text();
      assert.equal(response.status, 200);
      if (route === "/dashboard") assert.match(body, /<strong[^>]*>2000<\/strong><span[^>]*>follow-ups to check/);
      if (index) samples.push(Math.round(performance.now() - started));
    }
    timings.push({ route, outreach: 1000, contacts: 3000, warmSamplesMs: samples });
  }
  await sql`UPDATE public.outreach SET status='REPLIED' WHERE id=${sample.id} AND "userId"=${owners[0]}`;
  assert.ok(!(await queue()).items.some(item => item.id === sample.id), "external status writes immediately remove active follow-ups");
  assert.ok((await queue("SENT")).items.some(item => item.id === sample.id), "completed history remains visible after replies");
  await sql`UPDATE public.outreach SET status='SENT', contacts=jsonb_set(contacts,'{0,followUpSentAt}',to_jsonb(${sent}::text)) WHERE id=${sample.id} AND "userId"=${owners[0]}`;
  assert.ok(!(await queue("OVERDUE", "1")).items.some(item => item.id === sample.id), "external contact writes immediately update stage membership");
  const [hidden] = await sql`SELECT f.outreach_id FROM public.outreach_follow_up_lookup f
    WHERE f.user_id=${owners[0]} AND f.active AND f.pending AND f.stage=1 AND f.due_at IS NOT NULL
    ORDER BY f.due_at, f.outreach_id, f.contact_id OFFSET 500 LIMIT 1`;
  assert.ok(!first.items.some(item => item.id === hidden.outreach_id));
  const literalCompany = "Literal %_\\ Needle Company";
  await sql`UPDATE public.outreach SET company_name=${literalCompany}, status='GHOSTED',
    contacts=jsonb_set(jsonb_set(contacts,'{0,personName}','"Queue Search Needle"'::jsonb),'{0,contactMethod}','"LINKEDIN"'::jsonb)
    WHERE id=${hidden.outreach_id} AND "userId"=${owners[0]}`;
  const found = await queue("ALL_ACTIVE", "ALL", 1, { q: "queue search needle" });
  assert.equal(found.items.length, 1, "search finds contacts beyond the initially loaded pages");
  assert.equal(found.items[0].id, hidden.outreach_id);
  assert.equal(found.hasMore, false);
  assert.equal((await queue("ALL_ACTIVE", "ALL", 1, { q: "%_\\" })).items.length, 2, "SQL wildcard characters remain literal company search text");
  assert.equal((await queue("OVERDUE", "1", 1, { q: "Needle", method: "LINKEDIN", status: "GHOSTED" })).items.length, 1, "filters combine before pagination");
  assert.equal((await queue("ALL_ACTIVE", "ALL", 1, { q: "queue search needle", method: "EMAIL" })).items.length, 0);
  assert.equal((await queue("ALL_ACTIVE", "ALL", 1, { q: "queue search needle", status: "SENT" })).items.length, 0);
  assert.equal((await queue("ALL_ACTIVE", "ALL", 2, { q: "queue search needle" })).items.length, 0);
  for (const filters of [{ method: "BAD" }, { status: "BAD" }, { q: "x".repeat(201) }]) assert.equal((await request(queuePath("ALL_ACTIVE", "ALL", 1, filters))).status, 400);
  assert.equal((await (await request(queuePath("ALL_ACTIVE", "ALL", 1, { q: "Needle" }), 1)).json()).items.length, 0, "search remains account-scoped");
  console.log(JSON.stringify({ followUpProduction: timings }));
  console.log("Full-queue filter checks passed: hidden matches, literal wildcard characters, combined filters, filtered pagination, validation, and account isolation.");
  console.log("Follow-up HTTP checks passed: populated/rerunnable backfill, source preservation, authentication, stages/categories, pagination, dashboard counts, and external writes.");
} finally {
  try {
    await sql`DELETE FROM public."user" WHERE id IN ${sql(owners)}`;
    assert.equal((await sql`SELECT count(*)::int AS count FROM public.outreach_follow_up_lookup WHERE user_id IN ${sql(owners)}`)[0].count, 0);
    console.log("Disposable follow-up accounts, outreach, and lookup rows removed.");
  } finally { await sql.end(); }
}
