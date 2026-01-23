"use server";

import { db } from "@/db";
import { outreach } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, lte, asc, not } from "drizzle-orm";
import { addDays, startOfDay, endOfDay } from "date-fns";

export async function getFollowUpItems() {
  const session = await auth();
  if (!session?.user?.id) return { today: [], overdue: [], upcoming: [] };

  const userId = session.user.id;
  const now = new Date();
  const startOfToday = startOfDay(now);
  const endOfToday = endOfDay(now);

  // Statuses that require follow-up (i.e. not closed, replied, or rejected... arguably replied might need follow up but let's assume 'sent' or 'ghosted')
  // User said: "If overdue with no reply, visually suggest GHOSTED"
  // So we filter excludes: REPLIED, REJECTED, OFFER, CLOSED.
  // Actually, INTERVIEW might need follow up too? User said "Highlight follow-ups".
  // Let's stick to active statuses where we are waiting: SENT, GHOSTED, DRAFT? No, sent mainly.

  const activeStatuses = ["SENT", "GHOSTED", "INTERVIEW"];

  const allItems = await db.query.outreach.findMany({
    where: and(
        eq(outreach.userId, userId),
        // We can't easily filter by "status IN [...]" with drizzle query builder if we didn't use 'inArray'.
        // But we can filter in JS for simplicity or use simplified query.
        not(eq(outreach.status, "REPLIED")),
        not(eq(outreach.status, "REJECTED")),
        not(eq(outreach.status, "OFFER")),
        not(eq(outreach.status, "CLOSED"))
    ),
    orderBy: [asc(outreach.followUpDueAt)],
  });

  const today = allItems.filter(i => {
      const d = new Date(i.followUpDueAt);
      return d >= startOfToday && d <= endOfToday;
  });

  const overdue = allItems.filter(i => {
      const d = new Date(i.followUpDueAt);
      return d < startOfToday;
  });

  const upcoming = allItems.filter(i => {
      const d = new Date(i.followUpDueAt);
      return d > endOfToday;
  });

  return { today, overdue, upcoming };
}
