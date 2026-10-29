import { userDayBounds } from "@/lib/user-calendar";
import { reminderDay } from "@/lib/reminder-schedule";
import { deliverReminder } from "@/lib/reminder-delivery";
import { db } from "@/db";
import { users, reminderDeliveries } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "Scheduler authentication is not configured" }, { status: 503 });
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    // Never retry an uncertain send after the provider's idempotency window.
    await db.update(reminderDeliveries).set({ state: "expired" }).where(sql`
      ${reminderDeliveries.state} IN ('pending','sending','failed')
      AND ${reminderDeliveries.createdAt} <= now() - interval '23 hours'`);
    const activeUsers = await db.select({
      id: users.id, email: users.email, name: users.name, timeZone: users.timeZone,
      notificationEmail: users.notificationEmail, reminderTime: users.reminderTime,
    }).from(users).where(eq(users.receiveNotifications, true));
    let sent = 0;
    let failed = 0;
    for (const user of activeUsers) {
      const mode = process.env.REMINDER_SCHEDULE_MODE === "frequent" ? "frequent" : "daily";
      const day = reminderDay(user.timeZone, user.reminderTime, new Date(), mode);
      if (!day || !user.timeZone) continue;
      try {
        const bounds = userDayBounds(user.timeZone);
        const [counts] = await db.execute<{ sent: number; due: number }>(sql`
          SELECT
            count(*) FILTER (WHERE o.status <> 'DRAFT' AND EXISTS (
              SELECT 1 FROM jsonb_array_elements(o.contacts) c
              WHERE nullif(c->>'messageSentAt', '')::timestamptz >= ${bounds.start.toISOString()}::timestamptz
                AND nullif(c->>'messageSentAt', '')::timestamptz < ${bounds.end.toISOString()}::timestamptz
            ))::int AS sent,
            coalesce(sum(CASE WHEN o.status NOT IN ('DRAFT','REPLIED','INTERVIEW','REJECTED','OFFER','CLOSED')
              THEN (SELECT count(*) FROM jsonb_array_elements(o.contacts) c
                WHERE nullif(c->>'followUp2SentAt', '') IS NULL AND
                (CASE WHEN nullif(c->>'followUpSentAt', '') IS NOT NULL THEN nullif(c->>'followUp2DueAt', '')::timestamptz
                  ELSE nullif(c->>'followUpDueAt', '')::timestamptz END) < ${bounds.end.toISOString()}::timestamptz)
              ELSE 0 END), 0)::int AS due
          FROM outreach o WHERE o."userId" = ${user.id}
        `);
        // Resume a frozen attempt even if the live count has changed since it
        // reached the provider. The same key must always have the same payload.
        const attempts = await db.select({ kind: reminderDeliveries.kind }).from(reminderDeliveries)
          .where(sql`${reminderDeliveries.userId} = ${user.id} AND ${reminderDeliveries.day} = ${day}
            AND ${reminderDeliveries.state} IN ('pending','sending','failed')`);
        const retryKinds = new Set(attempts.map(attempt => attempt.kind));
        for (const kind of ["daily", "follow_up"] as const) {
          if (!retryKinds.has(kind) && (kind === "daily" ? counts.sent > 0 : counts.due === 0)) continue;
          try {
            const result = await deliverReminder(user.id, day, kind, user.notificationEmail || user.email, user.name || "there", counts.due);
            if (result === "sent") sent++;
          } catch (error) {
            failed++;
            console.error("Reminder delivery failed", user.id, kind, error instanceof Error ? error.message : "Unknown error");
          }
        }
      } catch (error) {
        failed++;
        console.error("Reminder processing failed", user.id, error instanceof Error ? error.message : "Unknown error");
      }
    }
    return NextResponse.json({ success: failed === 0, processed: activeUsers.length, sent, failed }, { status: failed ? 503 : 200 });
  } catch (error) {
    console.error("Reminder scheduler failed", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Reminder processing failed" }, { status: 500 });
  }
}
