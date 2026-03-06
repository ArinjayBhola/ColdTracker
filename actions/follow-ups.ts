"use server";

import { db } from "@/db";
import { outreach, users } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, asc, desc, not, sql } from "drizzle-orm";
import { startOfDay, endOfDay, addDays } from "date-fns";
import { syncOutreachToCalendar } from "@/actions/calendar";

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

  const activeItems = allItems.filter(i => !i.followUp2SentAt);
  const sent = allItems.filter(i => !!i.followUp2SentAt).map(i => ({
      ...i,
      followUpDueAt: i.followUp2DueAt || (i.contacts as any[])[0]?.followUpDueAt || i.updatedAt
  }));

  const today = activeItems.filter(i => {
      const dueAt = i.followUpSentAt ? i.followUp2DueAt : (i.contacts as any[])[0]?.followUpDueAt;
      const d = new Date(dueAt);
      return d >= startOfToday && d <= endOfToday;
  }).map(i => ({ 
      ...i, 
      followUpDueAt: i.followUpSentAt ? i.followUp2DueAt : (i.contacts as any[])[0]?.followUpDueAt 
  }));

  const overdue = allItems.filter(i => {
      const dueAt = i.followUpSentAt ? i.followUp2DueAt : (i.contacts as any[])[0]?.followUpDueAt;
      const d = new Date(dueAt);
      const isSent = i.followUpSentAt ? !!i.followUp2SentAt : !!i.followUpSentAt;
      return d < startOfToday && !isSent;
  }).map(i => ({ 
      ...i, 
      followUpDueAt: i.followUpSentAt ? i.followUp2DueAt : (i.contacts as any[])[0]?.followUpDueAt 
  }));

  const upcoming = activeItems.filter(i => {
      const dueAt = i.followUpSentAt ? i.followUp2DueAt : (i.contacts as any[])[0]?.followUpDueAt;
      const d = new Date(dueAt);
      return d > endOfToday;
  }).map(i => ({ 
      ...i, 
      followUpDueAt: i.followUpSentAt ? i.followUp2DueAt : (i.contacts as any[])[0]?.followUpDueAt 
  }));

  return { today, overdue, upcoming, sent };
}

export async function toggleFollowUpSentAction(id: string, isSent: boolean, sentAt?: Date) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  try {
    const existing = await db.query.outreach.findFirst({
        where: and(eq(outreach.id, id), eq(outreach.userId, session.user.id))
    });

    if (!existing) return { error: "Not found" };

    const updateData: any = { updatedAt: new Date() };

    if (isSent) {
        // Marking as SENT
        const effectiveSentDate = sentAt || new Date();
        if (!existing.followUpSentAt) {
            updateData.followUpSentAt = effectiveSentDate;
            updateData.followUp2DueAt = addDays(effectiveSentDate, 10);
        } else if (!existing.followUp2SentAt) {
            updateData.followUp2SentAt = effectiveSentDate;
        }
    } else {
        // Marking as UNSENT (Reverting)
        if (existing.followUp2SentAt) {
            updateData.followUp2SentAt = null;
        } else if (existing.followUpSentAt) {
            updateData.followUpSentAt = null;
            updateData.followUp2DueAt = null;
        }
    }

    await db.update(outreach)
      .set(updateData)
      .where(
        and(
          eq(outreach.id, id),
          eq(outreach.userId, session.user.id)
        )
      );

    // Auto-sync to calendar if enabled
    if (isSent) {
      const user = await db.query.users.findFirst({
        where: eq(users.id, session.user.id),
      });
      if (user?.calendarSyncEnabled) {
        syncOutreachToCalendar(id).catch(() => {});
      }
    }

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

    const updateData: any = { updatedAt: new Date() };

    if (existing.followUpSentAt) {
        // Update 2nd follow-up date
        updateData.followUp2DueAt = newDate;
    } else {
        // Update 1st follow-up date (stored in contacts[0])
        const updatedContacts = [...existing.contacts];
        if (updatedContacts[0]) {
            updatedContacts[0] = {
                ...updatedContacts[0],
                followUpDueAt: newDate
            };
        }
        updateData.contacts = updatedContacts;
    }

    await db.update(outreach)
      .set(updateData)
      .where(eq(outreach.id, id));

    // Auto-sync updated date to calendar if enabled
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    });
    if (user?.calendarSyncEnabled) {
      syncOutreachToCalendar(id).catch(() => {});
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to update follow-up date:", error);
    return { error: "Database error" };
  }
}

export async function getPaginatedFollowUpItemsAction(
  category: "OVERDUE" | "TODAY" | "UPCOMING" | "SENT" | "ALL_ACTIVE",
  page: number = 1,
  limit: number = 15,
  stage: "ALL" | "1" | "2" = "ALL"
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
    const dueAt = item.followUpSentAt 
        ? (item.followUp2DueAt ? new Date(item.followUp2DueAt) : null)
        : (firstContact ? new Date(firstContact.followUpDueAt) : null);
    
    // Stage filtering logic
    if (stage === "1" && item.followUpSentAt) return false;
    if (stage === "2" && (!item.followUpSentAt || item.followUp2SentAt)) return false;

    if (category === "SENT") {
        return !!item.followUp2SentAt;
    }

    const isMatch = !item.followUp2SentAt && 
           !["REPLIED", "REJECTED", "OFFER", "CLOSED"].includes(item.status);

    if (!isMatch) return false;

    if (!dueAt) return false;

    switch (category) {
        case "OVERDUE": return dueAt < startOfToday;
        case "TODAY": return dueAt >= startOfToday && dueAt <= endOfToday;
        case "UPCOMING": return dueAt > endOfToday;
        case "ALL_ACTIVE": return true;
        default: return false;
    }
  });

  // Sort by due date for these categories
  if (category !== "SENT") {
      filteredRaw.sort((a, b) => {
          const tA = new Date(a.followUpSentAt ? a.followUp2DueAt : (a.contacts as any[])[0]?.followUpDueAt).getTime();
          const tB = new Date(b.followUpSentAt ? b.followUp2DueAt : (b.contacts as any[])[0]?.followUpDueAt).getTime();
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
    followUpDueAt: item.followUpSentAt ? item.followUp2DueAt : (item.contacts as any[])[0]?.followUpDueAt,
    contactMethod: (item.contacts as any[])[0]?.contactMethod || "EMAIL",
    followUpSentAt: item.followUpSentAt,
    followUp2SentAt: item.followUp2SentAt,
    contacts: item.contacts,
  }));

  return { items, hasMore };
}
