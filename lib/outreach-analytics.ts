import { calendarKey, calendarMidnight, userDayBounds } from "@/lib/user-calendar";
export type AnalyticsRecord = {
  id: string;
  status: string;
  createdAt: string;
  sentAt: string;
  channel: "Email" | "LinkedIn" | "Mixed" | "Unspecified";
  followUpDueAt: string | null;
};
export type AnalyticsRange = "7" | "30" | "90" | "all";
export const ANALYTICS_STATUSES = ["DRAFT", "SENT", "REPLIED", "INTERVIEW", "OFFER", "REJECTED", "GHOSTED", "CLOSED"] as const;
const DAY = 86_400_000;
const responses = new Set(["REPLIED", "INTERVIEW", "OFFER"]);
const interviews = new Set(["INTERVIEW", "OFFER"]);
export const percent = (part: number, total: number) => total ? part / total * 100 : 0;
const dayStart = (date: Date, zone: string) => Date.parse(`${calendarKey(date, zone)}T00:00:00Z`);

function summarize(records: AnalyticsRecord[], now: number, timeZone: string) {
  const sent = records.filter(record => record.status !== "DRAFT");
  return {
    sent: sent.length,
    responded: sent.filter(record => responses.has(record.status)).length,
    interviews: sent.filter(record => interviews.has(record.status)).length,
    offers: sent.filter(record => record.status === "OFFER").length,
    drafts: records.filter(record => record.status === "DRAFT").length,
    awaiting: sent.filter(record => record.status === "SENT" || record.status === "GHOSTED").length,
    overdue: sent.filter(record => (record.status === "SENT" || record.status === "GHOSTED") && record.followUpDueAt && Date.parse(record.followUpDueAt) < userDayBounds(timeZone, new Date(now)).start.getTime()).length,
  };
}

export function buildOutreachAnalytics(records: AnalyticsRecord[], range: AnalyticsRange, asOf: string, timeZone: string) {
  const now = Date.parse(asOf);
  const today = dayStart(new Date(now), timeZone);
  const days = range === "all" ? null : Number(range);
  const start = days === null ? null : today - (days - 1) * DAY;
  const instant = (record: AnalyticsRecord) => Date.parse(record.status === "DRAFT" ? record.createdAt : record.sentAt);
  const recordDate = (record: AnalyticsRecord) => dayStart(new Date(instant(record)), timeZone);
  const current = records.filter(record => instant(record) <= now && (start === null || recordDate(record) >= start));
  const previous = days !== null && start !== null
    ? summarize(records.filter(record => recordDate(record) >= start - days * DAY && recordDate(record) < start), now, timeZone)
    : null;
  const summary = summarize(current, now, timeZone);
  const sentRecords = current.filter(record => record.status !== "DRAFT");
  const firstDate = sentRecords.reduce((earliest, record) => Math.min(earliest, dayStart(new Date(record.sentAt), timeZone)), today);
  const chartStart = start ?? firstDate;
  const span = Math.max(1, Math.round((today - chartStart) / DAY) + 1);
  // At most eight readable buckets, with complete day boundaries in the user timezone.
  const bucketDays = Math.max(7, Math.ceil(span / 8 / 7) * 7);
  const buckets = Array.from({ length: Math.ceil(span / bucketDays) }, (_, index) => ({
    start: calendarMidnight(new Date(chartStart + index * bucketDays * DAY).toISOString().slice(0, 10), timeZone).toISOString(),
    end: new Date(calendarMidnight(new Date(Math.min(today + DAY, chartStart + (index + 1) * bucketDays * DAY)).toISOString().slice(0, 10), timeZone).getTime() - 1).toISOString(),
    sent: 0, responded: 0, responseRate: 0,
  }));
  for (const record of sentRecords) {
    const index = Math.floor((dayStart(new Date(record.sentAt), timeZone) - chartStart) / (bucketDays * DAY));
    if (buckets[index]) {
      buckets[index].sent++;
      if (responses.has(record.status)) buckets[index].responded++;
    }
  }
  for (const bucket of buckets) bucket.responseRate = percent(bucket.responded, bucket.sent);
  const channels = (["Email", "LinkedIn", "Mixed", "Unspecified"] as const).map(channel => {
    const summary = summarize(current.filter(record => record.channel === channel), now, timeZone);
    return { channel, ...summary, responseRate: percent(summary.responded, summary.sent) };
  }).filter(channel => channel.sent > 0);
  return {
    ...summary, previous, buckets, bucketDays, channels,
    responseRate: percent(summary.responded, summary.sent),
    interviewRate: percent(summary.interviews, summary.sent),
    offerRate: percent(summary.offers, summary.sent),
    interviewToOfferRate: percent(summary.offers, summary.interviews),
    statuses: ANALYTICS_STATUSES.map(status => ({ status, count: current.filter(record => record.status === status).length })),
  };
}
export type OutreachAnalytics = ReturnType<typeof buildOutreachAnalytics>;
