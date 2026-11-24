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
    WITH goal AS (SELECT daily_target, weekly_target FROM goals WHERE user_id = ${userId} LIMIT 1)
    SELECT (SELECT count(*)::int FROM outreach WHERE "userId" = ${userId}
      AND created_at >= ${day.start.toISOString()}::timestamptz AT TIME ZONE 'UTC'
      AND created_at < ${day.end.toISOString()}::timestamptz AT TIME ZONE 'UTC') AS daily,
      (SELECT count(*)::int FROM outreach WHERE "userId" = ${userId}
        AND created_at >= ${week}::timestamptz AT TIME ZONE 'UTC' AND created_at < ${weekEnd}::timestamptz AT TIME ZONE 'UTC') AS weekly,
      (SELECT count(*)::int FROM outreach_follow_up_lookup
        WHERE user_id = ${userId} AND active AND pending AND due_at IS NOT NULL AND due_at < ${day.end.toISOString()}::timestamptz) AS due,
      coalesce((SELECT daily_target FROM goal), 3) AS "dailyTarget",
      coalesce((SELECT weekly_target FROM goal), 10) AS "weeklyTarget"
  `);
  return row;
}
