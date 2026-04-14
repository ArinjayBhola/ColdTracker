"use server";

import { db } from "@/db";
import { goals, dailyActivity, outreach, users } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, desc, gte, lte, sql, count } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { startOfWeek, endOfWeek, format, subDays, differenceInCalendarDays } from "date-fns";

export async function getOrCreateGoal() {
  const session = await auth();
  if (!session?.user?.id) return null;

  let goal = await db.query.goals.findFirst({
    where: eq(goals.userId, session.user.id),
  });

  if (!goal) {
    // Verify user exists before creating a goal to avoid FK violation
    const userExists = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      columns: { id: true }
    });

    if (!userExists) return null;

    const [newGoal] = await db
      .insert(goals)
      .values({ userId: session.user.id, dailyTarget: 3, weeklyTarget: 10 })
      .returning();
    goal = newGoal;
  }

  return goal;
}

export async function updateDailyTarget(target: number) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  if (target < 1 || target > 50) return { error: "Target must be between 1 and 50" };

  const existing = await db.query.goals.findFirst({
    where: eq(goals.userId, session.user.id),
  });

  if (existing) {
    await db.update(goals).set({ dailyTarget: target, updatedAt: new Date() }).where(eq(goals.id, existing.id));
  } else {
    // Verify user exists before inserting
    const userExists = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      columns: { id: true }
    });
    if (!userExists) return { error: "User record not found" };

    await db.insert(goals).values({ userId: session.user.id, dailyTarget: target });
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function getDailyProgress() {
  const session = await auth();
  if (!session?.user?.id) return { target: 3, current: 0, percentage: 0 };

  const goal = await getOrCreateGoal();
  const target = goal?.dailyTarget ?? 3;

  const today = format(new Date(), "yyyy-MM-dd");

  const activity = await db.query.dailyActivity.findFirst({
    where: and(eq(dailyActivity.userId, session.user.id), eq(dailyActivity.date, today)),
  });

  const current = activity?.outreachCount ?? 0;
  const percentage = Math.min(Math.round((current / target) * 100), 100);

  return { target, current, percentage };
}

export async function updateWeeklyTarget(target: number) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  if (target < 1 || target > 100) return { error: "Target must be between 1 and 100" };

  const existing = await db.query.goals.findFirst({
    where: eq(goals.userId, session.user.id),
  });

  if (existing) {
    await db.update(goals).set({ weeklyTarget: target, updatedAt: new Date() }).where(eq(goals.id, existing.id));
  } else {
    // Verify user exists before inserting
    const userExists = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      columns: { id: true }
    });
    if (!userExists) return { error: "User record not found" };

    await db.insert(goals).values({ userId: session.user.id, weeklyTarget: target });
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function getWeeklyProgress() {
  const session = await auth();
  if (!session?.user?.id) return { target: 10, current: 0, percentage: 0 };

  const goal = await getOrCreateGoal();
  const target = goal?.weeklyTarget ?? 10;

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const weekStartStr = format(weekStart, "yyyy-MM-dd");
  const weekEndStr = format(weekEnd, "yyyy-MM-dd");

  const result = await db
    .select({ total: sql<number>`coalesce(sum(${dailyActivity.outreachCount}), 0)` })
    .from(dailyActivity)
    .where(
      and(
        eq(dailyActivity.userId, session.user.id),
        gte(dailyActivity.date, weekStartStr),
        lte(dailyActivity.date, weekEndStr),
      ),
    );

  const current = Number(result[0]?.total ?? 0);
  const percentage = Math.min(Math.round((current / target) * 100), 100);

  return { target, current, percentage };
}

export async function getStreakData() {
  const session = await auth();
  if (!session?.user?.id) return { currentStreak: 0, longestStreak: 0, todayCount: 0 };

  const today = format(new Date(), "yyyy-MM-dd");

  // Get all activity days sorted descending
  const activities = await db
    .select({ date: dailyActivity.date, outreachCount: dailyActivity.outreachCount })
    .from(dailyActivity)
    .where(and(eq(dailyActivity.userId, session.user.id), gte(dailyActivity.outreachCount, 1)))
    .orderBy(desc(dailyActivity.date));

  if (activities.length === 0) return { currentStreak: 0, longestStreak: 0, todayCount: 0 };

  const todayActivity = activities.find((a) => a.date === today);
  const todayCount = todayActivity?.outreachCount ?? 0;

  // Calculate current streak (consecutive days ending today or yesterday)
  const activeDates = new Set(activities.map((a) => a.date));
  let currentStreak = 0;
  let checkDate = new Date();

  // If no activity today, start from yesterday
  if (!activeDates.has(format(checkDate, "yyyy-MM-dd"))) {
    checkDate = subDays(checkDate, 1);
    if (!activeDates.has(format(checkDate, "yyyy-MM-dd"))) {
      // No activity today or yesterday — streak is broken
      return { currentStreak: 0, longestStreak: calculateLongestStreak(activities), todayCount };
    }
  }

  while (activeDates.has(format(checkDate, "yyyy-MM-dd"))) {
    currentStreak++;
    checkDate = subDays(checkDate, 1);
  }

  const longestStreak = calculateLongestStreak(activities);

  return { currentStreak, longestStreak: Math.max(currentStreak, longestStreak), todayCount };
}

function calculateLongestStreak(activities: { date: string; outreachCount: number }[]) {
  if (activities.length === 0) return 0;

  const sortedDates = [...new Set(activities.map((a) => a.date))].sort();
  let longest = 1;
  let current = 1;

  for (let i = 1; i < sortedDates.length; i++) {
    const prev = new Date(sortedDates[i - 1]);
    const curr = new Date(sortedDates[i]);
    if (differenceInCalendarDays(curr, prev) === 1) {
      current++;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }

  return longest;
}

export async function recordDailyActivity() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const today = format(new Date(), "yyyy-MM-dd");

  // Count today's actual outreach from the outreach table
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const result = await db
    .select({ count: count() })
    .from(outreach)
    .where(
      and(eq(outreach.userId, session.user.id), gte(outreach.createdAt, todayStart), lte(outreach.createdAt, todayEnd)),
    );

  const todayCount = Number(result[0]?.count ?? 0);

  try {
    // Upsert daily activity
    const existing = await db.query.dailyActivity.findFirst({
      where: and(eq(dailyActivity.userId, session.user.id), eq(dailyActivity.date, today)),
    });

    if (existing) {
      await db.update(dailyActivity).set({ outreachCount: todayCount }).where(eq(dailyActivity.id, existing.id));
    } else {
      // Verify user exists before creating activity to avoid FK violation
      const userExists = await db.query.users.findFirst({
        where: eq(users.id, session.user.id),
        columns: { id: true }
      });

      if (!userExists) return { error: "User record not found" };

      await db.insert(dailyActivity).values({
        userId: session.user.id,
        date: today,
        outreachCount: todayCount,
      });
    }

    return { success: true, count: todayCount };
  } catch (error) {
    console.error("Failed to record daily activity:", error);
    return { error: "Database error" };
  }
}

export async function syncActivityHistory() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  // Sync last 30 days of activity from outreach table
  const thirtyDaysAgo = subDays(new Date(), 30);

  const dailyCounts = await db
    .select({
      date: sql<string>`to_char(${outreach.createdAt}, 'YYYY-MM-DD')`,
      count: count(),
    })
    .from(outreach)
    .where(and(eq(outreach.userId, session.user.id), gte(outreach.createdAt, thirtyDaysAgo)))
    .groupBy(sql`to_char(${outreach.createdAt}, 'YYYY-MM-DD')`);

  // Verify user exists once before the loop
  const userExists = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      columns: { id: true }
  });

  if (!userExists) return { error: "User record not found" };

  for (const day of dailyCounts) {
    const existing = await db.query.dailyActivity.findFirst({
      where: and(eq(dailyActivity.userId, session.user.id), eq(dailyActivity.date, day.date)),
    });

    if (existing) {
      await db
        .update(dailyActivity)
        .set({ outreachCount: Number(day.count) })
        .where(eq(dailyActivity.id, existing.id));
    } else {
      await db.insert(dailyActivity).values({
        userId: session.user.id,
        date: day.date,
        outreachCount: Number(day.count),
      });
    }
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function getLast7DaysActivity() {
  const session = await auth();
  if (!session?.user?.id) return [];

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const date = subDays(new Date(), i);
    days.push(format(date, "yyyy-MM-dd"));
  }

  const activities = await db
    .select()
    .from(dailyActivity)
    .where(
      and(
        eq(dailyActivity.userId, session.user.id),
        gte(dailyActivity.date, days[0]),
        lte(dailyActivity.date, days[6]),
      ),
    );

  const activityMap = new Map(activities.map((a) => [a.date, a.outreachCount]));

  return days.map((date) => ({
    date,
    day: format(new Date(date), "EEE"),
    count: activityMap.get(date) ?? 0,
  }));
}
