import { calendarKey, shiftCalendarKey } from "@/lib/user-calendar";
import type { AnalyticsRecord } from "@/lib/outreach-analytics";
import { reachedStage, ANALYTICS_STATUSES } from "@/lib/outreach-analytics";
const sentStages = new Set<string>(ANALYTICS_STATUSES.filter(status => status !== "DRAFT"));

export function buildActivityHeatmap(records: AnalyticsRecord[], year: number, asOf: string, timeZone: string, weekStartsOn: 0 | 1 = 1) {
  const now = Date.parse(asOf);
  const today = calendarKey(asOf, timeZone);
  const counts = new Map<string, number>();
  for (const record of records) {
    const sent = Date.parse(record.sentAt);
    if (!reachedStage(record, sentStages) || !Number.isFinite(sent) || sent > now) continue;
    const key = calendarKey(record.sentAt, timeZone);
    if (Number(key.slice(0, 4)) === year) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const start = `${year}-01-01`;
  const end = `${year}-12-31`;
  const weekday = (new Date(`${start}T12:00:00Z`).getUTCDay() - weekStartsOn + 7) % 7;
  const gridStart = shiftCalendarKey(start, -weekday);
  const days: { key: string; count: number; available: boolean; inYear: boolean }[] = [];
  for (let key = gridStart; key <= end || days.length % 7 !== 0; key = shiftCalendarKey(key, 1)) {
    const inYear = key >= start && key <= end;
    days.push({ key, count: counts.get(key) ?? 0, available: inYear && key <= today, inYear });
  }
  const total = [...counts.values()].reduce((sum, count) => sum + count, 0);
  const busiest = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0].localeCompare(a[0]))[0];
  const max = busiest?.[1] ?? 0;
  const weeks = Array.from({ length: days.length / 7 }, (_, index) => days.slice(index * 7, index * 7 + 7));
  return { days, weeks, total, activeDays: counts.size, busiest, max };
}
