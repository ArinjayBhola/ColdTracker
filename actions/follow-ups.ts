"use server";

import { db } from "@/db";
import { outreach } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, asc, desc, not, sql } from "drizzle-orm";
import { startOfDay, endOfDay } from "date-fns";

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
    orderBy: [desc(outreach.updatedAt)],
  });

  const activeItems = allItems.filter(i => !i.followUpSentAt);
  const sent = allItems.filter(i => !!i.followUpSentAt).map(i => ({
      ...i,
      followUpDueAt: (i.contacts as any[])[0]?.followUpDueAt || i.updatedAt
  }));

  const today = activeItems.filter(i => {
      const d = new Date((i.contacts as any[])[0]?.followUpDueAt);
      return d >= startOfToday && d <= endOfToday;
  }).map(i => ({ ...i, followUpDueAt: (i.contacts as any[])[0]?.followUpDueAt }));

  const overdue = allItems.filter(i => {
      const d = new Date((i.contacts as any[])[0]?.followUpDueAt);
      return d < startOfToday && !i.followUpSentAt;
  }).map(i => ({ ...i, followUpDueAt: (i.contacts as any[])[0]?.followUpDueAt }));

  const upcoming = activeItems.filter(i => {
      const d = new Date((i.contacts as any[])[0]?.followUpDueAt);
      return d > endOfToday;
  }).map(i => ({ ...i, followUpDueAt: (i.contacts as any[])[0]?.followUpDueAt }));

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
    const existing = await db.query.outreach.findFirst({
        where: and(eq(outreach.id, id), eq(outreach.userId, session.user.id))
    });

    if (!existing) return { error: "Not found" };

    const updatedContacts = [...existing.contacts];
    if (updatedContacts[0]) {
        updatedContacts[0] = {
            ...updatedContacts[0],
            followUpDueAt: newDate
        };
    }

    await db.update(outreach)
      .set({
        contacts: updatedContacts,
        updatedAt: new Date()
      })
      .where(eq(outreach.id, id));
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

  const allItems = await db.query.outreach.findMany({
    where: and(eq(outreach.userId, userId)),
    orderBy: [desc(sql`${outreach.contacts}->0->>'messageSentAt'`)],
  });

  let filteredRaw = allItems.filter(item => {
    const firstContact = (item.contacts as any[])[0];
    const dueAt = firstContact ? new Date(firstContact.followUpDueAt) : null;
    
    if (category === "SENT") {
        return !!item.followUpSentAt;
    }

    const isMatch = !item.followUpSentAt && 
           !["REPLIED", "REJECTED", "OFFER", "CLOSED"].includes(item.status);

    if (!isMatch) return false;

    if (!dueAt) return false;

    switch (category) {
        case "OVERDUE": return dueAt < startOfToday;
        case "TODAY": return dueAt >= startOfToday && dueAt <= endOfToday;
        case "UPCOMING": return dueAt > endOfToday;
        default: return false;
    }
  });

  // Sort by due date for these categories
  if (category !== "SENT") {
      filteredRaw.sort((a, b) => {
          const tA = new Date((a.contacts as any[])[0]?.followUpDueAt).getTime();
          const tB = new Date((b.contacts as any[])[0]?.followUpDueAt).getTime();
          return tA - tB;
      });
  }

  const hasMore = filteredRaw.length > offset + limit;
  const items = filteredRaw.slice(offset, offset + limit).map(item => ({
    id: item.id,
    companyName: item.companyName,
    personName: (item.contacts as any[])[0]?.personName || "No Contact",
    roleTargeted: item.roleTargeted,
    status: item.status,
    followUpDueAt: (item.contacts as any[])[0]?.followUpDueAt,
    contactMethod: (item.contacts as any[])[0]?.contactMethod || "EMAIL",
    followUpSentAt: item.followUpSentAt,
    contacts: item.contacts,
  }));

  return { items, hasMore };
}
