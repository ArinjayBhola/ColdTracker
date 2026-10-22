// Calendar dates always belong to a user's IANA timezone, never the host server.
export function validTimeZone(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 100) return false;
  try { new Intl.DateTimeFormat("en", { timeZone: value }).format(); return true; } catch { return false; }
}

export function calendarKey(value: Date | string, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value));
  return ["year", "month", "day"].map(type => parts.find(part => part.type === type)!.value).join("-");
}

export function shiftCalendarKey(key: string, days: number) {
  const date = new Date(`${key}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function calendarMidnight(key: string, timeZone: string) {
  const target = Date.parse(`${key}T00:00:00Z`);
  let instant = target;
  for (let i = 0; i < 4; i++) {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date(instant));
    const n = (type: string) => Number(parts.find(part => part.type === type)!.value);
    const represented = Date.UTC(n("year"), n("month") - 1, n("day"), n("hour"), n("minute"), n("second"));
    const difference = target - represented;
    instant += difference;
    if (!difference) break;
  }
  return new Date(instant);
}

export function userDayBounds(timeZone: string, now = new Date()) {
  const key = calendarKey(now, timeZone);
  return { key, start: calendarMidnight(key, timeZone), end: calendarMidnight(shiftCalendarKey(key, 1), timeZone) };
}

export function addUserCalendarDays(value: Date, days: number, timeZone: string) {
  return calendarMidnight(shiftCalendarKey(calendarKey(value, timeZone), days), timeZone);
}

export type BrowserDay = { key: string; start: string; end: string };

export function validBrowserDay(value: BrowserDay | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value.key)) return false;
  const duration = Date.parse(value.end) - Date.parse(value.start);
  return Number.isFinite(duration) && duration >= 22 * 3_600_000 && duration <= 26 * 3_600_000;
}

export function isBeforeLocalToday(value: Date | string) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return new Date(value).getTime() < start.getTime();
}
