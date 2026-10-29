import { calendarKey, validTimeZone } from "@/lib/user-calendar";

export const validReminderTime = (value: unknown): value is string =>
  typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

export function reminderDay(timeZone: string | null, time: string, now = new Date()) {
  if (!validTimeZone(timeZone) || !validReminderTime(time)) return null;
  const localTime = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now);
  return localTime >= time ? calendarKey(now, timeZone) : null;
}
