"use server";

import { db } from "@/db";
import { sentEmails, emailEvents, outreach } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, count, sql, desc } from "drizzle-orm";

export type EngagementAnalytics = {
  totalSent: number;
  opened: number;
  clicked: number;
  openRate: number;
  clickRate: number;
  totalOpenEvents: number;
  totalClickEvents: number;
  avgSecondsToOpen: number | null;
  bestSendHour: { hour: number; openRate: number; sent: number } | null;
  sendHourBuckets: { hour: number; sent: number; opened: number; openRate: number }[];
  openHourBuckets: { hour: number; opens: number }[];
  topCompanies: { companyName: string; sent: number; opened: number; openRate: number }[];
  lastOpenedAt: string | null;
};

const EMPTY: EngagementAnalytics = {
  totalSent: 0,
  opened: 0,
  clicked: 0,
  openRate: 0,
  clickRate: 0,
  totalOpenEvents: 0,
  totalClickEvents: 0,
  avgSecondsToOpen: null,
  bestSendHour: null,
  sendHourBuckets: [],
  openHourBuckets: [],
  topCompanies: [],
  lastOpenedAt: null,
};

// Convert a stored UTC timestamp to the hour-of-day in IST (the app's timezone).
const istHourOfSent = sql<number>`extract(hour from (${sentEmails.sentAt} at time zone 'UTC' at time zone 'Asia/Kolkata'))::int`;
const istHourOfEvent = sql<number>`extract(hour from (${emailEvents.timestamp} at time zone 'UTC' at time zone 'Asia/Kolkata'))::int`;

/**
 * Aggregate email-engagement metrics for the current user from the open/click
 * tracking tables. All math is done in SQL so it stays fast as volume grows.
 */
export async function getEngagementAnalytics(): Promise<EngagementAnalytics> {
  const session = await auth();
  if (!session?.user?.id) return EMPTY;
  const userId = session.user.id;

  const [totalsRows, sendHourRows, openHourRows, eventRows, topCompanyRows] =
    await Promise.all([
      // Headline totals: sent / unique opens / unique clicks / avg time-to-open.
      db
        .select({
          totalSent: count(),
          opened: sql<number>`count(*) filter (where ${sentEmails.openedAt} is not null)`,
          clicked: sql<number>`count(*) filter (where ${sentEmails.clickedAt} is not null)`,
          avgSecondsToOpen: sql<number | null>`avg(extract(epoch from (${sentEmails.openedAt} - ${sentEmails.sentAt}))) filter (where ${sentEmails.openedAt} is not null)`,
          lastOpenedAt: sql<string | null>`max(${sentEmails.openedAt})`,
        })
        .from(sentEmails)
        .where(eq(sentEmails.userId, userId)),

      // Open rate grouped by the IST hour the email was sent — answers "when
      // should I send so they get opened".
      db
        .select({
          hour: istHourOfSent,
          sent: count(),
          opened: sql<number>`count(*) filter (where ${sentEmails.openedAt} is not null)`,
        })
        .from(sentEmails)
        .where(eq(sentEmails.userId, userId))
        .groupBy(istHourOfSent),

      // When recipients actually open (by IST hour) across all open events.
      db
        .select({ hour: istHourOfEvent, opens: count() })
        .from(emailEvents)
        .innerJoin(sentEmails, eq(emailEvents.sentEmailId, sentEmails.id))
        .where(and(eq(sentEmails.userId, userId), eq(emailEvents.type, "open")))
        .groupBy(istHourOfEvent),

      // Raw event volume (repeat opens/clicks, not just first-touch).
      db
        .select({ type: emailEvents.type, c: count() })
        .from(emailEvents)
        .innerJoin(sentEmails, eq(emailEvents.sentEmailId, sentEmails.id))
        .where(eq(sentEmails.userId, userId))
        .groupBy(emailEvents.type),

      // Most-engaged companies by number of opened emails.
      db
        .select({
          companyName: outreach.companyName,
          sent: count(),
          opened: sql<number>`count(*) filter (where ${sentEmails.openedAt} is not null)`,
        })
        .from(sentEmails)
        .innerJoin(outreach, eq(sentEmails.outreachId, outreach.id))
        .where(eq(sentEmails.userId, userId))
        .groupBy(outreach.companyName)
        .orderBy(
          desc(sql`count(*) filter (where ${sentEmails.openedAt} is not null)`),
          desc(count())
        )
        .limit(6),
    ]);

  const totals = totalsRows[0];
  const totalSent = Number(totals?.totalSent ?? 0);
  if (totalSent === 0) return EMPTY;

  const opened = Number(totals?.opened ?? 0);
  const clicked = Number(totals?.clicked ?? 0);

  const sendHourBuckets = sendHourRows
    .map((r) => {
      const sent = Number(r.sent);
      const o = Number(r.opened);
      return { hour: Number(r.hour), sent, opened: o, openRate: sent > 0 ? (o / sent) * 100 : 0 };
    })
    .sort((a, b) => a.hour - b.hour);

  // Best send hour: highest open rate among hours with enough volume to matter.
  const candidates = sendHourBuckets.filter((b) => b.opened > 0 && b.sent >= 2);
  const pool = candidates.length > 0 ? candidates : sendHourBuckets.filter((b) => b.opened > 0);
  const bestSendHour =
    pool.length > 0
      ? pool.reduce((best, b) =>
          b.openRate > best.openRate || (b.openRate === best.openRate && b.sent > best.sent) ? b : best
        )
      : null;

  const openHourBuckets = openHourRows
    .map((r) => ({ hour: Number(r.hour), opens: Number(r.opens) }))
    .sort((a, b) => a.hour - b.hour);

  let totalOpenEvents = 0;
  let totalClickEvents = 0;
  for (const e of eventRows) {
    if (e.type === "open") totalOpenEvents = Number(e.c);
    if (e.type === "click") totalClickEvents = Number(e.c);
  }

  const topCompanies = topCompanyRows.map((r) => {
    const sent = Number(r.sent);
    const o = Number(r.opened);
    return { companyName: r.companyName, sent, opened: o, openRate: sent > 0 ? (o / sent) * 100 : 0 };
  });

  return {
    totalSent,
    opened,
    clicked,
    openRate: totalSent > 0 ? (opened / totalSent) * 100 : 0,
    clickRate: totalSent > 0 ? (clicked / totalSent) * 100 : 0,
    totalOpenEvents,
    totalClickEvents,
    avgSecondsToOpen: totals?.avgSecondsToOpen != null ? Number(totals.avgSecondsToOpen) : null,
    bestSendHour: bestSendHour
      ? { hour: bestSendHour.hour, openRate: bestSendHour.openRate, sent: bestSendHour.sent }
      : null,
    sendHourBuckets,
    openHourBuckets,
    topCompanies,
    lastOpenedAt: totals?.lastOpenedAt ? new Date(totals.lastOpenedAt).toISOString() : null,
  };
}
