"use server";

import { db } from "@/db";
import { outreach } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, asc, not, isNull, isNotNull, lt, gt, between, ilike, or, SQL } from "drizzle-orm";
import { startOfDay, endOfDay, parseISO } from "date-fns";

export async function getFollowUpItems() {
  const session = await auth();
  if (!session?.user?.id) return { today: [], overdue: [], upcoming: [], sent: [] };

  const userId = session.user.id;
  const now = new Date();
  const startOfToday = startOfDay(now);
  const endOfToday = endOfDay(now);

  const activeStatuses = ["SENT", "GHOSTED", "INTERVIEW"];

  const allItems = await db.query.outreach.findMany({
    where: and(
        eq(outreach.userId, userId),
        not(eq(outreach.status, "REPLIED")),
        not(eq(outreach.status, "REJECTED")),
        not(eq(outreach.status, "OFFER")),
        not(eq(outreach.status, "CLOSED"))
    ),
    orderBy: [asc(outreach.followUpDueAt)],
  });

  const activeItems = allItems.filter(i => !i.followUpSentAt);
  const sent = allItems.filter(i => !!i.followUpSentAt);

  const today = activeItems.filter(i => {
      const d = new Date(i.followUpDueAt);
      return d >= startOfToday && d <= endOfToday;
  });

  const overdue = allItems.filter(i => {
      const d = new Date(i.followUpDueAt);
      return d < startOfToday;
  });

  const upcoming = activeItems.filter(i => {
      const d = new Date(i.followUpDueAt);
      return d > endOfToday;
  });

  return { today, overdue, upcoming, sent };
}

export async function toggleFollowUpSentAction(id: string, isSent: boolean) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  try {
    await db.update(outreach)
      .set({
        followUpSentAt: isSent ? new Date() : null,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(outreach.id, id),
          eq(outreach.userId, session.user.id)
        )
      );
    return { success: true };
  } catch (error) {
    console.error("Failed to toggle follow-up sent status:", error);
    return { error: "Database error" };
  }
}

export async function updateFollowUpDateAction(id: string, newDate: Date) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  try {
    await db.update(outreach)
      .set({
        followUpDueAt: newDate,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(outreach.id, id),
          eq(outreach.userId, session.user.id)
        )
      );
    return { success: true };
  } catch (error) {
    console.error("Failed to update follow-up date:", error);
    return { error: "Database error" };
  }
}

export async function getPaginatedFollowUpItemsAction(
  category: "OVERDUE" | "TODAY" | "UPCOMING" | "SENT",
  page: number = 1,
  limit: number = 15
) {
  const session = await auth();
  if (!session?.user?.id) return { items: [], hasMore: false };

  const userId = session.user.id;
  const offset = (page - 1) * limit;
  const now = new Date();
  const startOfToday = startOfDay(now);
  const endOfToday = endOfDay(now);

  const andConditions = [eq(outreach.userId, userId)];

  // Category Logic
  switch (category) {
    case "OVERDUE":
      andConditions.push(
        lt(outreach.followUpDueAt, startOfToday),
        isNull(outreach.followUpSentAt),
        not(eq(outreach.status, "REPLIED")),
        not(eq(outreach.status, "REJECTED")),
        not(eq(outreach.status, "OFFER")),
        not(eq(outreach.status, "CLOSED"))
      );
      break;
    case "TODAY":
      andConditions.push(
        between(outreach.followUpDueAt, startOfToday, endOfToday),
        isNull(outreach.followUpSentAt),
        not(eq(outreach.status, "REPLIED")),
        not(eq(outreach.status, "REJECTED")),
        not(eq(outreach.status, "OFFER")),
        not(eq(outreach.status, "CLOSED"))
      );
      break;
    case "UPCOMING":
      andConditions.push(
        gt(outreach.followUpDueAt, endOfToday),
        isNull(outreach.followUpSentAt),
        not(eq(outreach.status, "REPLIED")),
        not(eq(outreach.status, "REJECTED")),
        not(eq(outreach.status, "OFFER")),
        not(eq(outreach.status, "CLOSED"))
      );
      break;
    case "SENT":
      andConditions.push(isNotNull(outreach.followUpSentAt));
      break;
  }

  const queryWhere = and(...(andConditions as [SQL, ...SQL[]])) as SQL;

  const items = await db.query.outreach.findMany({
    where: queryWhere,
    orderBy: [asc(outreach.followUpDueAt)],
    limit: limit + 1,
    offset: offset,
  });

  const hasMore = items.length > limit;
  const slicedItems = hasMore ? items.slice(0, limit) : (items as any[]);

  return { items: slicedItems, hasMore };
}
