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
      if (existing.outreachCount !== todayCount) {
        await db.update(dailyActivity).set({ outreachCount: todayCount }).where(eq(dailyActivity.id, existing.id));

      }
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

  await db.update(dailyActivity)
    .set({ outreachCount: 0 })
    .where(
      and(
        eq(dailyActivity.userId, session.user.id),
        gte(dailyActivity.date, format(thirtyDaysAgo, 'yyyy-MM-dd'))
      )
    );

  if (dailyCounts.length > 0) {
    const valuesToInsert = dailyCounts.map(day => ({
      userId: session.user.id,
      date: day.date,
      outreachCount: Number(day.count),
    }));

    await db.insert(dailyActivity)
      .values(valuesToInsert)
      .onConflictDoUpdate({
        target: [dailyActivity.userId, dailyActivity.date],
        set: {
          outreachCount: sql`excluded.outreach_count`,
        }
      });
  }

  revalidatePath("/dashboard");
  return { success: true };
}

// Consolidated dashboard fetch: authenticates once, reads the goal once, and
// pulls all activity rows a single time, then derives daily/weekly/streak/last-7
// in memory. Replaces 4 separate actions that each re-ran auth() and re-fetched
// the goal (getDailyProgress + getWeeklyProgress each called getOrCreateGoal).
export async function getDashboardGoalsData() {
  const session = await auth();
  const emptyDaily = { target: 3, current: 0, percentage: 0 };
  const emptyWeekly = { target: 10, current: 0, percentage: 0 };
  const emptyStreak = { currentStreak: 0, longestStreak: 0, todayCount: 0 };
  if (!session?.user?.id) {
    return { daily: emptyDaily, weekly: emptyWeekly, streak: emptyStreak, last7Days: [] as { date: string; day: string; count: number }[] };
  }

  const userId = session.user.id;
  const now = new Date();
  const today = format(now, "yyyy-MM-dd");
  const weekStartStr = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekEndStr = format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");

  // One goal read + one activity read, in parallel.
  const [goal, activities] = await Promise.all([
    getOrCreateGoal(),
    db
      .select({ date: dailyActivity.date, outreachCount: dailyActivity.outreachCount })
      .from(dailyActivity)
      .where(eq(dailyActivity.userId, userId))
      .orderBy(desc(dailyActivity.date)),
  ]);

  const dailyTarget = goal?.dailyTarget ?? 3;
  const weeklyTarget = goal?.weeklyTarget ?? 10;

  // Daily
  const todayCount = activities.find((a) => a.date === today)?.outreachCount ?? 0;
  const daily = {
    target: dailyTarget,
    current: todayCount,
    percentage: Math.min(Math.round((todayCount / dailyTarget) * 100), 100),
  };

  // Weekly
  const weeklyTotal = activities
    .filter((a) => a.date >= weekStartStr && a.date <= weekEndStr)
    .reduce((sum, a) => sum + a.outreachCount, 0);
  const weekly = {
    target: weeklyTarget,
    current: weeklyTotal,
    percentage: Math.min(Math.round((weeklyTotal / weeklyTarget) * 100), 100),
  };

  // Streak: only days with >= 1 outreach count.
  const activeDays = activities.filter((a) => a.outreachCount >= 1);
  const activeDates = new Set(activeDays.map((a) => a.date));
  let currentStreak = 0;
  let checkDate = new Date();
  if (!activeDates.has(format(checkDate, "yyyy-MM-dd"))) {
    checkDate = subDays(checkDate, 1);
  }
  while (activeDates.has(format(checkDate, "yyyy-MM-dd"))) {
    currentStreak++;
    checkDate = subDays(checkDate, 1);
  }
  const longestStreak = calculateLongestStreak(activeDays);
  const streak = {
    currentStreak,
    longestStreak: Math.max(currentStreak, longestStreak),
    todayCount,
  };

  // Last 7 days
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const d = format(subDays(now, i), "yyyy-MM-dd");
    last7Days.push({
      date: d,
      day: format(new Date(d), "EEE"),
      count: activities.find((a) => a.date === d)?.outreachCount ?? 0,
    });
  }

  return { daily, weekly, streak, last7Days };
}
