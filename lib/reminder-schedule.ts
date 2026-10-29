import { calendarKey, validTimeZone } from "@/lib/user-calendar";

export const validReminderTime = (value: unknown): value is string =>
  typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

export function reminderDay(timeZone: string | null, time: string, now = new Date(), mode: "daily" | "frequent" = "frequent") {
  if (!validTimeZone(timeZone) || !validReminderTime(time)) return null;
  // With one invocation per day, a later saved time must not skip this user
  // forever. Daily scheduling processes each user's current local calendar day.
  if (mode === "daily") return calendarKey(now, timeZone);
  const localTime = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now);
  return localTime >= time ? calendarKey(now, timeZone) : null;
}
