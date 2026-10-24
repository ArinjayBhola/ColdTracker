"use server";

import { type BrowserDay } from "@/lib/user-calendar";

import { db } from "@/db";
import { outreach, type OutreachContact } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
import { getUserTimeZone } from "@/lib/user-time-zone";
import { scheduleFollowUp } from "@/lib/follow-up-rules";
import { getAccountPreferences } from "@/actions/preferences";
import { getFollowUpPage } from "@/lib/follow-up-query";
import { DEFAULT_PREFERENCES } from "@/lib/preferences";

export async function toggleFollowUpSentAction(id: string, isSent: boolean, sentAt?: Date) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  try {
    const existing = await db.query.outreach.findFirst({
        where: and(eq(outreach.id, id), eq(outreach.userId, session.user.id))
    });

    if (!existing) return { error: "Not found" };

    const updateData: Partial<typeof outreach.$inferInsert> = { updatedAt: new Date() };

    if (isSent) {
        // Marking as SENT
        const timeZone = await getUserTimeZone();
        if (!timeZone) return { error: "Please reload so we can detect your device timezone." };
    const rules = (await getAccountPreferences())?.preferences?.followUp ?? DEFAULT_PREFERENCES.followUp;
        const effectiveSentDate = sentAt || new Date();
        if (!existing.followUpSentAt) {
            updateData.followUpSentAt = effectiveSentDate;
            updateData.followUp2DueAt = scheduleFollowUp(effectiveSentDate, rules.secondDelay, timeZone, rules.skipWeekends);
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

    const [item] = await db.update(outreach)
      .set(updateData)
      .where(
        and(
          eq(outreach.id, id),
          eq(outreach.userId, session.user.id)
        )
      ).returning();

    if (!item) return { error: "Outreach not found" };
    return { success: true, item };
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

    const updateData: Partial<typeof outreach.$inferInsert> = { updatedAt: new Date() };

    if (existing.followUpSentAt) {
        // Update 2nd follow-up date
        updateData.followUp2DueAt = newDate;
    } else {
        // Update 1st follow-up date (stored in contacts[0])
        const updatedContacts = [...(existing.contacts as OutreachContact[])];
        if (updatedContacts[0]) {
            updatedContacts[0] = {
                ...updatedContacts[0],
                followUpDueAt: newDate
            };
        }
        updateData.contacts = updatedContacts;
    }

    const [item] = await db.update(outreach)
      .set(updateData)
      .where(and(eq(outreach.id, id), eq(outreach.userId, session.user.id))).returning();

    if (!item) return { error: "Outreach not found" };
    return { success: true, item };
  } catch (error) {
    console.error("Failed to update follow-up date:", error);
    return { error: "Database error" };
  }
}

export async function getPaginatedFollowUpItemsAction(
  category: "OVERDUE" | "TODAY" | "UPCOMING" | "SENT" | "ALL_ACTIVE",
  page = 1, limit = 15, stage: "ALL" | "1" | "2" = "ALL", timeZone?: string, browserDay?: BrowserDay
) {
  const session = await auth();
  if (!session?.user?.id) return { items: [], hasMore: false };
  return getFollowUpPage(session.user.id, category, page, limit, stage, timeZone, browserDay);
}
