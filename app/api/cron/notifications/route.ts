import { db } from "@/db";
import { outreach, users } from "@/db/schema";
import { sendDailyOutreachReminder, sendFollowUpReminder } from "@/lib/resend";
import { eq, and, sql, gte, lt, not, exists } from "drizzle-orm";
import { NextResponse } from "next/server";

// IST is UTC+5:30
// To run at 5 PM IST, the cron should trigger at 11:30 AM UTC.
// This route handles the logic when triggered.

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

    const now = new Date();
    // IST adjustment (not needed for logic if we just check "today" in IST)
    // However, the database usually stores in UTC.
    // We need "start of today" and "end of today" in IST but converted to UTC.
    
    // IST start of today: 00:00:00 IST = Yesterday 18:30:00 UTC
    // IST end of today: 23:59:59 IST = Today 18:29:59 UTC
    
    const istOffset = 5.5 * 60 * 60 * 1000;
    const todayIST = new Date(now.getTime() + istOffset);
    todayIST.setUTCHours(0, 0, 0, 0);
    const startOfTodayUTC = new Date(todayIST.getTime() - istOffset);
    
    const tomorrowIST = new Date(todayIST.getTime() + 24 * 60 * 60 * 1000);
    const endOfTodayUTC = new Date(tomorrowIST.getTime() - istOffset);

    for (const user of activeUsers) {
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
          lt(sql`(${outreach.contacts}->0->>'followUpDueAt')::timestamp`, endOfTodayUTC),
          sql`${outreach.followUpSentAt} IS NULL`,
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
