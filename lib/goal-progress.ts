import { shiftCalendarKey } from "@/lib/user-calendar";

export function buildGoalProgress(activities: { date: string; outreachCount: number }[], goal: { dailyTarget: number; weeklyTarget: number } | null, today: string) {
  const dailyTarget = goal?.dailyTarget ?? 3;
  const weeklyTarget = goal?.weeklyTarget ?? 10;
  const weekStart = shiftCalendarKey(today, -((new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7));
  const weekEnd = shiftCalendarKey(weekStart, 6);
  const todayCount = Number(activities.find(activity => activity.date === today)?.outreachCount ?? 0);
  const weeklyCount = activities.filter(activity => activity.date >= weekStart && activity.date <= weekEnd)
    .reduce((sum, activity) => sum + Number(activity.outreachCount), 0);
  const dates = [...new Set(activities.filter(activity => activity.outreachCount >= 1).map(activity => activity.date))].sort();
  const active = new Set(dates);
  let currentStreak = 0;
  let check = active.has(today) ? today : shiftCalendarKey(today, -1);
  while (active.has(check)) { currentStreak++; check = shiftCalendarKey(check, -1); }
  let longestStreak = 0, consecutive = 0;
  for (let index = 0; index < dates.length; index++) {
    consecutive = index && shiftCalendarKey(dates[index - 1], 1) === dates[index] ? consecutive + 1 : 1;
    longestStreak = Math.max(longestStreak, consecutive);
  }
  return {
    daily: { target: dailyTarget, current: todayCount, percentage: Math.min(Math.round(todayCount / dailyTarget * 100), 100) },
    weekly: { target: weeklyTarget, current: weeklyCount, percentage: Math.min(Math.round(weeklyCount / weeklyTarget * 100), 100) },
    streak: { currentStreak, longestStreak: Math.max(currentStreak, longestStreak), todayCount },
    last7Days: Array.from({ length: 7 }, (_, index) => {
      const date = shiftCalendarKey(today, index - 6);
      return { date, day: new Date(`${date}T12:00:00Z`).toLocaleDateString("en", { weekday: "short", timeZone: "UTC" }), count: Number(activities.find(activity => activity.date === date)?.outreachCount ?? 0) };
    }),
  };
}
