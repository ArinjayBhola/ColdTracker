import { userDayBounds, validTimeZone } from "@/lib/user-calendar";
import { db } from "@/db";
import { outreach, users } from "@/db/schema";
import { sendDailyOutreachReminder, sendFollowUpReminder } from "@/lib/resend";
import { eq, and, sql, gte, lt, not } from "drizzle-orm";
import { NextResponse } from "next/server";

// Each recipient uses their browser-reported timezone. The scheduler controls delivery time.

export async function GET(request: Request) {
  // Optional: Add security check (e.g., CRON_SECRET)
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const activeUsers = await db.query.users.findMany({
      where: eq(users.receiveNotifications, true),
    });

    for (const user of activeUsers) {
      // The last browser-reported timezone lets reminders work while the app is closed.
      if (!validTimeZone(user.timeZone)) continue;
      const { start: startOfTodayUTC, end: endOfTodayUTC } = userDayBounds(user.timeZone);
      const emailTo = user.notificationEmail || user.email;
      if (!emailTo) continue;

      // 1. Check Daily Outreach
      const todayOutreach = await db.query.outreach.findFirst({
        where: and(
          eq(outreach.userId, user.id),
          gte(outreach.createdAt, startOfTodayUTC),
          lt(outreach.createdAt, endOfTodayUTC)
        ),
      });

      if (!todayOutreach) {
        await sendDailyOutreachReminder(emailTo, user.name || 'there');
      }

      // 2. Check Follow-ups
      // Due today or overdue, and not marked sent, and not in a "done" status
      const pendingFollowUps = await db.query.outreach.findMany({
        where: and(
          eq(outreach.userId, user.id),
          lt(sql`CASE WHEN ${outreach.followUpSentAt} IS NOT NULL THEN (${outreach.followUp2DueAt} AT TIME ZONE 'UTC')
            ELSE (SELECT MIN((contact->>'followUpDueAt')::timestamptz) FROM jsonb_array_elements(${outreach.contacts}) contact WHERE NULLIF(contact->>'followUpDueAt', '') IS NOT NULL) END`, endOfTodayUTC.toISOString()),
          sql`${outreach.followUp2SentAt} IS NULL`,
          not(sql`${outreach.status} IN ('REPLIED', 'REJECTED', 'OFFER', 'CLOSED')`)
        ),
      });

      if (pendingFollowUps.length > 0) {
        await sendFollowUpReminder(emailTo, user.name || 'there', pendingFollowUps.length);
      }
    }

    return NextResponse.json({ success: true, processed: activeUsers.length });
  } catch (error) {
    console.error('Cron error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
