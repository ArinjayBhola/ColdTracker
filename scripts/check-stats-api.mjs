// Local production/dev measurements with disposable records and automatic cleanup.
import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { encode } from "next-auth/jwt";
import postgres from "postgres";

const base = process.env.STATS_TEST_URL || "http://localhost:3000";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw new Error("Tests require a local server");
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1, onnotice() {} });
const owners = [`stats-http-test-${randomUUID()}`, `stats-http-test-${randomUUID()}`];
const cookies = await Promise.all(owners.map(async sub => `authjs.session-token=${await encode({ token: { sub }, secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET, salt: "authjs.session-token", maxAge: 600 })}; coldtrack-time-zone=Asia%2FCalcutta`));
const path = "/api/stats?timeZone=Asia%2FCalcutta";
const request = (route, account = 0) => fetch(base + route, { headers: account === null ? {} : { Cookie: cookies[account] } });
try {
  await sql`INSERT INTO public."user" (id, email, receive_notifications) VALUES
    (${owners[0]}, ${owners[0] + "@example.invalid"}, false), (${owners[1]}, ${owners[1] + "@example.invalid"}, false)`;
  await sql`INSERT INTO public.goals (user_id, daily_target, weekly_target) VALUES (${owners[0]}, 7, 21)`;
  await sql`INSERT INTO public.outreach ("userId", company_name, role_targeted, status, contacts, created_at)
    SELECT ${owners[0]}, 'Synthetic Stats ' || g, 'Engineer', (CASE WHEN g % 8 = 0 THEN 'DRAFT' ELSE 'SENT' END)::public.status,
      jsonb_build_array(
        jsonb_build_object('personName','STATS_PRIVATE_CONTACT_MARKER','contactMethod','EMAIL','messageSentAt',to_char(now()-(g%365)*interval '1 day','YYYY-MM-DD"T"HH24:MI:SS"Z"')),
        jsonb_build_object('personName','Second','contactMethod','EMAIL','messageSentAt',to_char(now()-(g%365)*interval '1 day','YYYY-MM-DD"T"HH24:MI:SS"Z"')),
        jsonb_build_object('personName','Third','contactMethod','LINKEDIN','messageSentAt',to_char(now()-(g%365)*interval '1 day','YYYY-MM-DD"T"HH24:MI:SS"Z"'))),
      now()-(g%365)*interval '1 day' FROM generate_series(1,1000) g`;
  assert.equal((await request(path, null)).status, 401);
  assert.equal((await request("/api/stats?timeZone=invalid")).status, 400);
  assert.equal((await (await request(path, 1)).json()).totalRecords, 0, "accounts remain isolated");
  const measurements = [];
  for (const route of [path, "/stats"]) {
    const samples = []; let bytes;
    for (let i = 0; i < 4; i++) {
      const started = performance.now();
      const response = await request(route);
      const text = await response.text();
      assert.equal(response.status, 200);
      assert.doesNotMatch(text, /STATS_PRIVATE_CONTACT_MARKER/);
      bytes = Buffer.byteLength(text);
      if (route === path) {
        const data = JSON.parse(text);
        assert.equal(response.headers.get("cache-control"), "private, no-store");
        assert.equal(data.totalRecords, 1000);
        assert.equal(data.analytics.all.sent, 875);
        assert.equal(data.analytics.all.drafts, 125);
        assert.equal(data.goals.daily.target, 7);
        assert.equal(data.goals.weekly.target, 21);
        assert.equal(data.timeZone, "Asia/Calcutta");
      } else {
        assert.match(text, /Summary metrics/);
        assert.match(text, /Statistics date range/);
      }
      if (i) samples.push(Math.round(performance.now() - started));
    }
    measurements.push({ route, outreach: 1000, decodedBytes: bytes, warmSamplesMs: samples });
  }
  console.log(JSON.stringify({ statsProduction: measurements }));
  console.log("Stats HTTP checks passed: authentication, timezone validation, account isolation, totals, targets, and server-rendered charts.");
} finally {
  try {
    await sql`DELETE FROM public."user" WHERE id IN ${sql(owners)}`;
    assert.equal((await sql`SELECT count(*)::int AS count FROM public.outreach WHERE "userId" IN ${sql(owners)}`)[0].count, 0);
    console.log("Disposable Stats HTTP accounts and outreach removed.");
  } finally { await sql.end(); }
}
