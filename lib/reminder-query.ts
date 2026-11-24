import { db } from "@/db";
import { users } from "@/db/schema";
import { and, asc, eq, gt, sql } from "drizzle-orm";

export const REMINDER_PAGE_SIZE = 50;
export async function readReminderUsers(after: string | null) {
  return db.select({ id: users.id, email: users.email, name: users.name, timeZone: users.timeZone,
    notificationEmail: users.notificationEmail, reminderTime: users.reminderTime,
  }).from(users).where(and(eq(users.receiveNotifications,true),after === null ? undefined : gt(users.id,after)))
    .orderBy(asc(users.id)).limit(REMINDER_PAGE_SIZE + 1);
}

export type ReminderWindow = { id: string; day: string; start: string; end: string };
export type ReminderSummary = { id: string; sent: boolean; due: number; attempts: { kind: string; state: string }[] };
export async function readReminderSummaries(windows: ReminderWindow[]) {
  if (!windows.length) return [];
  return db.execute<ReminderSummary>(sql`
    SELECT w.id,
      EXISTS(SELECT 1 FROM outreach o CROSS JOIN LATERAL jsonb_array_elements(o.contacts) c
        WHERE o."userId"=w.id AND o.status <> 'DRAFT' AND
          CASE WHEN pg_input_is_valid(nullif(c->>'messageSentAt',''),'timestamptz')
            THEN (c->>'messageSentAt')::timestamptz END >= w.start::timestamptz AND
          CASE WHEN pg_input_is_valid(nullif(c->>'messageSentAt',''),'timestamptz')
            THEN (c->>'messageSentAt')::timestamptz END < w.end::timestamptz) AS sent,
      (SELECT count(*)::int FROM outreach_follow_up_lookup f WHERE f.user_id=w.id
        AND f.active AND f.pending AND f.due_at < w.end::timestamptz) AS due,
      coalesce((SELECT jsonb_agg(jsonb_build_object('kind',d.kind,'state',d.state))
        FROM reminder_deliveries d WHERE d.user_id=w.id AND d.day=w.day),'[]'::jsonb) AS attempts
    FROM jsonb_to_recordset(${JSON.stringify(windows)}::jsonb) AS w(id text,day text,start text,"end" text)
  `);
}

export async function expireReminderAttempts() {
  // Bound writes and lock contention when old attempts accumulate.
  await db.execute(sql`WITH expired AS (
    SELECT id FROM reminder_deliveries WHERE state IN ('pending','sending','failed')
      AND created_at <= now() - interval '23 hours' ORDER BY created_at,id LIMIT 1000 FOR UPDATE SKIP LOCKED
  ) UPDATE reminder_deliveries d SET state='expired' FROM expired e WHERE d.id=e.id`);
}
