"use server";

import { db } from "@/db";
import { outreach, users, accounts } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, isNotNull, not } from "drizzle-orm";
import { getValidAccessToken } from "@/lib/email/token-refresh";
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from "@/lib/calendar/google-calendar";

function buildEventSummary(companyName: string, roleTargeted: string, stage: string) {
  return `[ColdTrack] ${stage} - ${companyName} (${roleTargeted})`;
}

function buildEventDescription(item: any, stage: string) {
  const contact = (item.contacts as any[])?.[0];
  const lines = [
    `Company: ${item.companyName}`,
    `Role: ${item.roleTargeted}`,
    `Stage: ${stage}`,
  ];
  if (contact?.personName) lines.push(`Contact: ${contact.personName}`);
  if (contact?.email) lines.push(`Email: ${contact.email}`);
  if (item.notes) lines.push(`\nNotes: ${item.notes}`);
  return lines.join("\n");
}

export async function getCalendarSyncStatus() {
  const session = await auth();
  if (!session?.user?.id) return { enabled: false, hasGoogle: false };

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  const userAccounts = await db
    .select({ provider: accounts.provider })
    .from(accounts)
    .where(eq(accounts.userId, session.user.id));

  const hasGoogle = userAccounts.some((a) => a.provider === "google");

  return {
    enabled: user?.calendarSyncEnabled ?? false,
    hasGoogle,
  };
}

export async function toggleCalendarSync(enabled: boolean) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  await db
    .update(users)
    .set({ calendarSyncEnabled: enabled })
    .where(eq(users.id, session.user.id));

  return { success: true };
}

export async function syncOutreachToCalendar(outreachId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const tokenResult = await getValidAccessToken(session.user.id);
  if (!tokenResult || tokenResult.provider !== "gmail") {
    return { error: "Google account not connected" };
  }

  const item = await db.query.outreach.findFirst({
    where: and(eq(outreach.id, outreachId), eq(outreach.userId, session.user.id)),
  });

  if (!item) return { error: "Outreach not found" };

  const firstContact = (item.contacts as any[])?.[0];
  const followUp1DueAt = firstContact?.followUpDueAt
    ? new Date(firstContact.followUpDueAt)
    : null;
  const followUp2DueAt = item.followUp2DueAt;

  const updateData: any = { calendarSynced: true, updatedAt: new Date() };

  // Sync 1st follow-up event
  if (followUp1DueAt && !item.followUpSentAt) {
    const summary = buildEventSummary(item.companyName, item.roleTargeted, "1st Follow-up");
    const description = buildEventDescription(item, "1st Follow-up");

    if (item.calendarEventId) {
      await updateCalendarEvent({
        accessToken: tokenResult.accessToken,
        eventId: item.calendarEventId,
        summary,
        description,
        date: followUp1DueAt,
      });
    } else {
      const result = await createCalendarEvent({
        accessToken: tokenResult.accessToken,
        summary,
        description,
        date: followUp1DueAt,
      });
      if (result.eventId) updateData.calendarEventId = result.eventId;
      if (result.error) return { error: result.error };
    }
  }

  // Sync 2nd follow-up event
  if (followUp2DueAt && !item.followUp2SentAt) {
    const summary = buildEventSummary(item.companyName, item.roleTargeted, "2nd Follow-up");
    const description = buildEventDescription(item, "2nd Follow-up");

    if (item.calendarEventId2) {
      await updateCalendarEvent({
        accessToken: tokenResult.accessToken,
        eventId: item.calendarEventId2,
        summary,
        description,
        date: followUp2DueAt,
      });
    } else {
      const result = await createCalendarEvent({
        accessToken: tokenResult.accessToken,
        summary,
        description,
        date: followUp2DueAt,
      });
      if (result.eventId) updateData.calendarEventId2 = result.eventId;
      if (result.error) return { error: result.error };
    }
  }

  await db.update(outreach).set(updateData).where(eq(outreach.id, outreachId));

  return { success: true };
}

export async function removeOutreachFromCalendar(outreachId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const tokenResult = await getValidAccessToken(session.user.id);
  if (!tokenResult || tokenResult.provider !== "gmail") {
    return { error: "Google account not connected" };
  }

  const item = await db.query.outreach.findFirst({
    where: and(eq(outreach.id, outreachId), eq(outreach.userId, session.user.id)),
  });

  if (!item) return { error: "Outreach not found" };

  if (item.calendarEventId) {
    await deleteCalendarEvent(tokenResult.accessToken, item.calendarEventId);
  }
  if (item.calendarEventId2) {
    await deleteCalendarEvent(tokenResult.accessToken, item.calendarEventId2);
  }

  await db
    .update(outreach)
    .set({
      calendarSynced: false,
      calendarEventId: null,
      calendarEventId2: null,
      updatedAt: new Date(),
    })
    .where(eq(outreach.id, outreachId));

  return { success: true };
}

export async function syncAllFollowUpsToCalendar() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const tokenResult = await getValidAccessToken(session.user.id);
  if (!tokenResult || tokenResult.provider !== "gmail") {
    return { error: "Google account not connected" };
  }

  const activeItems = await db.query.outreach.findMany({
    where: and(
      eq(outreach.userId, session.user.id),
      not(eq(outreach.status, "REPLIED")),
      not(eq(outreach.status, "REJECTED")),
      not(eq(outreach.status, "OFFER")),
      not(eq(outreach.status, "CLOSED"))
    ),
  });

  let synced = 0;
  let errors = 0;

  for (const item of activeItems) {
    const firstContact = (item.contacts as any[])?.[0];
    const followUp1DueAt = firstContact?.followUpDueAt
      ? new Date(firstContact.followUpDueAt)
      : null;

    const hasFollowUpDue =
      (followUp1DueAt && !item.followUpSentAt) ||
      (item.followUp2DueAt && !item.followUp2SentAt);

    if (!hasFollowUpDue) continue;

    const result = await syncOutreachToCalendar(item.id);
    if (result.success) synced++;
    else errors++;
  }

  return { success: true, synced, errors };
}

export async function getCalendarEvents() {
  const session = await auth();
  if (!session?.user?.id) return { events: [] };

  // Fetch outreach items that have follow-up dates
  const items = await db.query.outreach.findMany({
    where: and(
      eq(outreach.userId, session.user.id),
      not(eq(outreach.status, "CLOSED"))
    ),
  });

  const events: Array<{
    id: string;
    title: string;
    date: string;
    type: "follow-up-1" | "follow-up-2" | "interview";
    status: string;
    companyName: string;
    roleTargeted: string;
    outreachId: string;
    synced: boolean;
  }> = [];

  for (const item of items) {
    const firstContact = (item.contacts as any[])?.[0];

    // 1st follow-up
    if (firstContact?.followUpDueAt && !item.followUpSentAt) {
      const d = new Date(firstContact.followUpDueAt);
      events.push({
        id: `${item.id}-f1`,
        title: `Follow-up: ${item.companyName}`,
        date: d.toISOString().split("T")[0],
        type: "follow-up-1",
        status: item.status,
        companyName: item.companyName,
        roleTargeted: item.roleTargeted,
        outreachId: item.id,
        synced: !!item.calendarEventId,
      });
    }

    // 2nd follow-up
    if (item.followUp2DueAt && !item.followUp2SentAt) {
      events.push({
        id: `${item.id}-f2`,
        title: `2nd Follow-up: ${item.companyName}`,
        date: item.followUp2DueAt.toISOString().split("T")[0],
        type: "follow-up-2",
        status: item.status,
        companyName: item.companyName,
        roleTargeted: item.roleTargeted,
        outreachId: item.id,
        synced: !!item.calendarEventId2,
      });
    }

    // Interview status items
    if (item.status === "INTERVIEW") {
      const interviewDate = firstContact?.followUpDueAt || item.followUp2DueAt;
      if (interviewDate) {
        const d = new Date(interviewDate);
        events.push({
          id: `${item.id}-int`,
          title: `Interview: ${item.companyName}`,
          date: d.toISOString().split("T")[0],
          type: "interview",
          status: item.status,
          companyName: item.companyName,
          roleTargeted: item.roleTargeted,
          outreachId: item.id,
          synced: !!item.calendarEventId,
        });
      }
    }
  }

  return { events };
}
