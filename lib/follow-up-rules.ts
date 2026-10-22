import { addUserCalendarDays, calendarKey, calendarMidnight, shiftCalendarKey } from "@/lib/user-calendar";
export function scheduleFollowUp(sentAt: Date, delay: number, timeZone: string, skipWeekends: boolean) {
  const due = addUserCalendarDays(sentAt, delay, timeZone);
  if (!skipWeekends) return due;
  const key = calendarKey(due, timeZone);
  const weekday = new Date(`${key}T12:00:00Z`).getUTCDay();
  return weekday === 0 || weekday === 6 ? calendarMidnight(shiftCalendarKey(key, weekday === 6 ? 2 : 1), timeZone) : due;
}
