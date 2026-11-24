import { calendarKey, calendarMidnight, shiftCalendarKey } from "@/lib/user-calendar";
import { ANALYTICS_STATUSES, percent, type AnalyticsRange, type AnalyticsRecord, type OutreachAnalytics } from "@/lib/outreach-analytics";
import type { AppPreferences } from "@/lib/preferences";
import type { buildGoalProgress } from "@/lib/goal-progress";

const fields = ["sent", "responded", "interviews", "offers", "drafts", "awaiting", "overdue"] as const;
type Counts = Record<typeof fields[number], number>;
export type StatsCohort = Counts & { day: string; channel: AnalyticsRecord["channel"]; statuses: Record<string, number>; selectable: number };
export type StatsSnapshot = {
  asOf: string;
  timeZone: string;
  nextUpdateAt: string;
  preferences: AppPreferences["stats"];
  analytics: Record<AnalyticsRange, OutreachAnalytics>;
  heatmap: { counts: { day: string; count: number }[]; years: number[] };
  goals: ReturnType<typeof buildGoalProgress>;
  totalRecords: number;
};

function sum(rows: StatsCohort[]): Counts {
  const result = { sent: 0, responded: 0, interviews: 0, offers: 0, drafts: 0, awaiting: 0, overdue: 0 };
  for (const row of rows) for (const field of fields) result[field] += row[field];
  return result;
}

export function buildCohortAnalytics(cohorts: StatsCohort[], range: AnalyticsRange, asOf: string, timeZone: string): OutreachAnalytics {
  const today = calendarKey(asOf, timeZone);
  const days = range === "all" ? null : Number(range);
  const start = days === null ? null : shiftCalendarKey(today, 1 - days);
  const current = cohorts.filter(row => start === null || row.day >= start);
  const previous = start && days ? sum(cohorts.filter(row => row.day >= shiftCalendarKey(start, -days) && row.day < start)) : null;
  const summary = sum(current);
  const first = current.filter(row => row.sent > 0).reduce((earliest, row) => row.day < earliest ? row.day : earliest, today);
  const chartStart = start ?? first;
  const span = Math.max(1, Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${chartStart}T00:00:00Z`)) / 86400000) + 1);
  const bucketDays = Math.max(7, Math.ceil(span / 8 / 7) * 7);
  const buckets = Array.from({ length: Math.ceil(span / bucketDays) }, (_, index) => ({
    start: calendarMidnight(shiftCalendarKey(chartStart, index * bucketDays), timeZone).toISOString(),
    end: new Date(+calendarMidnight(shiftCalendarKey(chartStart, Math.min(span, (index + 1) * bucketDays)), timeZone) - 1).toISOString(),
    sent: 0, responded: 0, responseRate: 0,
  }));
  for (const row of current) {
    const index = Math.floor((Date.parse(`${row.day}T00:00:00Z`) - Date.parse(`${chartStart}T00:00:00Z`)) / 86400000 / bucketDays);
    if (buckets[index]) { buckets[index].sent += row.sent; buckets[index].responded += row.responded; }
  }
  for (const bucket of buckets) bucket.responseRate = percent(bucket.responded, bucket.sent);
  const channels = (["Email", "LinkedIn", "Mixed", "Unspecified"] as const).map(channel => {
    const totals = sum(current.filter(row => row.channel === channel));
    return { channel, ...totals, responseRate: percent(totals.responded, totals.sent) };
  }).filter(channel => channel.sent > 0);
  return {
    ...summary, previous, buckets, bucketDays, channels,
    responseRate: percent(summary.responded, summary.sent), interviewRate: percent(summary.interviews, summary.sent),
    offerRate: percent(summary.offers, summary.sent), interviewToOfferRate: percent(summary.offers, summary.interviews),
    statuses: ANALYTICS_STATUSES.map(status => ({ status, count: current.reduce((count, row) => count + (row.statuses[status] ?? 0), 0) })),
  };
}
