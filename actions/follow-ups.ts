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
import { revalidatePath } from "next/cache";

type FollowUpResult = { success?: boolean; error?: string; item?: typeof outreach.$inferSelect; updatedCount?: number };
class ContactUpdateError extends Error {}

async function mutateContact(id: string, contactId: string, mutate: (contact: OutreachContact) => OutreachContact): Promise<FollowUpResult> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  if (!contactId) return { error: "Select a contact and try again." };
  try {
    const userId = session.user.id;
    const item = await db.transaction(async tx => {
      const [existing] = await tx.select().from(outreach)
        .where(and(eq(outreach.id, id), eq(outreach.userId, userId))).for("update");
      if (!existing) throw new ContactUpdateError("Outreach not found");
      const index = existing.contacts.findIndex(contact => contact.id === contactId);
      if (index < 0) throw new ContactUpdateError("Contact no longer exists. Refresh and try again.");
      const contacts = [...existing.contacts];
      contacts[index] = mutate(contacts[index]);
      const [updated] = await tx.update(outreach).set({ contacts, updatedAt: new Date() })
        .where(and(eq(outreach.id, id), eq(outreach.userId, userId))).returning();
      return updated;
    });
    for (const path of ["/dashboard", "/follow-ups", "/stats", `/outreach/${id}`]) revalidatePath(path);
    return { success: true, item };
  } catch (error) {
    console.error("Contact follow-up update failed:", error);
    return { error: error instanceof ContactUpdateError ? error.message : "Could not update follow-up. Please try again." };
  }
}

export async function toggleFollowUpSentAction(id: string, isSent: boolean, sentAt?: Date, contactId?: string, stage?: 1 | 2): Promise<FollowUpResult> {
  if (!stage || ![1, 2].includes(stage)) return { error: "Select a follow-up stage." };
  if (sentAt && !Number.isFinite(new Date(sentAt).getTime())) return { error: "Invalid sent date" };
  const timeZone = await getUserTimeZone();
  if (!timeZone) return { error: "Please reload so we can detect your device timezone." };
  const rules = (await getAccountPreferences())?.preferences?.followUp ?? DEFAULT_PREFERENCES.followUp;
  return mutateContact(id, contactId ?? "", contact => {
    if (stage === 2 && !contact.followUpSentAt) throw new ContactUpdateError("Mark follow-up 1 sent first.");
    if (stage === 1 && contact.followUp2SentAt) throw new ContactUpdateError("Revert follow-up 2 before changing follow-up 1.");
    const field = stage === 1 ? "followUpSentAt" : "followUp2SentAt";
    // A repeated request must never advance a contact to the next stage.
    if ((isSent && contact[field] && !sentAt) || (!isSent && !contact[field])) return contact;
    const date = isSent ? new Date(sentAt ?? new Date()).toISOString() : null;
    return {
      ...contact, [field]: date,
      ...(stage === 1 ? { followUp2DueAt: date ? scheduleFollowUp(new Date(date), rules.secondDelay, timeZone, rules.skipWeekends).toISOString() : null } : {}),
      followUpHistory: [...(contact.followUpHistory ?? []), { stage, action: isSent ? "sent" : "reverted", at: new Date().toISOString(), date }],
    };
  });
}

export async function updateFollowUpDateAction(id: string, newDate: Date, contactId?: string, stage?: 1 | 2): Promise<FollowUpResult> {
  if (!stage || ![1, 2].includes(stage) || !Number.isFinite(new Date(newDate).getTime())) return { error: "Invalid follow-up date or stage" };
  return mutateContact(id, contactId ?? "", contact => {
    if (stage === 2 && !contact.followUpSentAt) throw new ContactUpdateError("Mark follow-up 1 sent first.");
    if ((stage === 1 && contact.followUpSentAt) || (stage === 2 && contact.followUp2SentAt)) throw new ContactUpdateError("This follow-up is already sent. Refresh and try again.");
    const date = new Date(newDate).toISOString();
    return {
      ...contact, [stage === 1 ? "followUpDueAt" : "followUp2DueAt"]: date,
      followUpHistory: [...(contact.followUpHistory ?? []), { stage, action: "rescheduled", at: new Date().toISOString(), date }],
    };
  });
}

export async function markAllFollowUpsSentAction(id: string, stage: 1 | 2): Promise<FollowUpResult> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  if (stage !== 1 && stage !== 2) return { error: "Select a follow-up stage." };
  const timeZone = await getUserTimeZone();
  if (!timeZone) return { error: "Please reload so we can detect your device timezone." };
  const rules = (await getAccountPreferences())?.preferences?.followUp ?? DEFAULT_PREFERENCES.followUp;
  try {
    const userId = session.user.id;
    const result = await db.transaction(async tx => {
      const [existing] = await tx.select().from(outreach)
        .where(and(eq(outreach.id, id), eq(outreach.userId, userId))).for("update");
      if (!existing) throw new ContactUpdateError("Outreach not found");
      if (existing.contacts.length < 2) throw new ContactUpdateError("This action needs more than one contact.");
      const now = new Date();
      const date = now.toISOString();
      let updatedCount = 0;
      const contacts = existing.contacts.map(contact => {
        // Apply exactly the requested stage. Repeated requests cannot advance
        // contacts or overwrite dates/history that have already been saved.
        if (stage === 1 ? !!contact.followUpSentAt : !contact.followUpSentAt || !!contact.followUp2SentAt) return contact;
        updatedCount++;
        return {
          ...contact,
          [stage === 1 ? "followUpSentAt" : "followUp2SentAt"]: date,
          ...(stage === 1 ? { followUp2DueAt: scheduleFollowUp(now, rules.secondDelay, timeZone, rules.skipWeekends).toISOString() } : {}),
          followUpHistory: [...(contact.followUpHistory ?? []), { stage, action: "sent" as const, at: date, date }],
        };
      });
      if (!updatedCount) return { item: existing, updatedCount };
      const [item] = await tx.update(outreach).set({ contacts, updatedAt: now })
        .where(and(eq(outreach.id, id), eq(outreach.userId, userId))).returning();
      return { item, updatedCount };
    });
    for (const path of ["/dashboard", "/follow-ups", "/stats", `/outreach/${id}`]) revalidatePath(path);
    return { success: true, ...result };
  } catch (error) {
    console.error("Bulk contact follow-up update failed:", error);
    return { error: error instanceof ContactUpdateError ? error.message : "Could not update contact follow-ups. Please try again." };
  }
}

export async function getPaginatedFollowUpItemsAction(
  category: "OVERDUE" | "TODAY" | "UPCOMING" | "SENT" | "ALL_ACTIVE",
  page = 1, limit = 15, stage: "ALL" | "1" | "2" = "ALL", timeZone?: string, browserDay?: BrowserDay,
) {
  const session = await auth();
  if (!session?.user?.id) return { items: [], hasMore: false };
  return getFollowUpPage(session.user.id, category, page, limit, stage, timeZone, browserDay);
}
