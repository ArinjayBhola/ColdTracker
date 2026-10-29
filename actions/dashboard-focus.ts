"use server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { getUserDayBounds, getUserTimeZone } from "@/lib/user-time-zone";
import { calendarMidnight, shiftCalendarKey } from "@/lib/user-calendar";

export async function getDashboardFocus() {
  const [session, day, zone] = await Promise.all([auth(), getUserDayBounds(), getUserTimeZone()]);
  if (!session?.user?.id || !day || !zone) return { daily: 0, dailyTarget: 3, weekly: 0, weeklyTarget: 10, due: 0 };
  const userId = session.user.id;
  const weekday = (new Date(`${day.key}T12:00:00Z`).getUTCDay() + 6) % 7;
  const week = calendarMidnight(shiftCalendarKey(day.key, -weekday), zone).toISOString();
  const weekEnd = calendarMidnight(shiftCalendarKey(day.key, 7 - weekday), zone).toISOString();
  const [row] = await db.execute<{ daily: number; weekly: number; due: number; dailyTarget: number; weeklyTarget: number }>(sql`
    SELECT count(*) FILTER (WHERE created_at >= ${day.start.toISOString()}::timestamptz AT TIME ZONE 'UTC' AND created_at < ${day.end.toISOString()}::timestamptz AT TIME ZONE 'UTC')::int AS daily,
      count(*) FILTER (WHERE created_at >= ${week}::timestamptz AT TIME ZONE 'UTC' AND created_at < ${weekEnd}::timestamptz AT TIME ZONE 'UTC')::int AS weekly,
      coalesce(sum(CASE WHEN status NOT IN ('DRAFT','REPLIED','INTERVIEW','REJECTED','OFFER','CLOSED') THEN
        (SELECT count(*) FROM jsonb_array_elements(contacts) c WHERE nullif(c->>'followUp2SentAt', '') IS NULL AND
          (CASE WHEN nullif(c->>'followUpSentAt', '') IS NOT NULL THEN nullif(c->>'followUp2DueAt', '')::timestamptz
           ELSE nullif(c->>'followUpDueAt', '')::timestamptz END) < ${day.end.toISOString()}::timestamptz)
        ELSE 0 END), 0)::int AS due,
      coalesce((SELECT daily_target FROM goals WHERE user_id = ${userId} LIMIT 1), 3) AS "dailyTarget",
      coalesce((SELECT weekly_target FROM goals WHERE user_id = ${userId} LIMIT 1), 10) AS "weeklyTarget"
    FROM outreach WHERE "userId" = ${userId}
  `);
  return row;
}
