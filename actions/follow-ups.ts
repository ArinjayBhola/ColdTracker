"use server";

import { validBrowserDay, validTimeZone, type BrowserDay } from "@/lib/user-calendar";

import { db } from "@/db";
import { outreach, type OutreachContact } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, desc, asc, sql, notInArray, isNotNull, isNull, lt, gte, type SQL } from "drizzle-orm";
import { getUserTimeZone } from "@/lib/user-time-zone";
import { addUserCalendarDays } from "@/lib/user-calendar";

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
        const effectiveSentDate = sentAt || new Date();
        if (!existing.followUpSentAt) {
            updateData.followUpSentAt = effectiveSentDate;
            updateData.followUp2DueAt = addUserCalendarDays(effectiveSentDate, 10, timeZone);
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

    await db.update(outreach)
      .set(updateData)
      .where(eq(outreach.id, id));


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
  stage: "ALL" | "1" | "2" = "ALL",
  timeZone?: string,
  browserDay?: BrowserDay
) {
  const session = await auth();
  if (!session?.user?.id) return { items: [], hasMore: false };

  const userId = session.user.id;
  const offset = (page - 1) * limit;
  if (!validTimeZone(timeZone) || !validBrowserDay(browserDay)) return { items: [], hasMore: false };
  const startOfToday = new Date(browserDay!.start);
  const endOfToday = new Date(browserDay!.end);

  // The "effective due date" is the 2nd follow-up date once the 1st has been sent,
  // otherwise the earliest pending contact due date (JSONB). Computed in
  // SQL so we can filter/sort/paginate at the database instead of in memory.
  const contactDate = sql`(contact->>'followUpDueAt')::timestamptz`;
  const contactDateFilter = category === "TODAY" ? sql`${contactDate} >= ${startOfToday.toISOString()} AND ${contactDate} < ${endOfToday.toISOString()}`
    : category === "OVERDUE" ? sql`${contactDate} < ${startOfToday.toISOString()}`
    : category === "UPCOMING" ? sql`${contactDate} >= ${endOfToday.toISOString()}` : sql`true`;
  const effectiveDue = sql<Date>`
    CASE WHEN ${outreach.followUpSentAt} IS NOT NULL
         THEN (${outreach.followUp2DueAt} AT TIME ZONE 'UTC')
         ELSE (SELECT MIN((contact->>'followUpDueAt')::timestamptz)
               FROM jsonb_array_elements(${outreach.contacts}) AS contact
               WHERE NULLIF(contact->>'followUpDueAt', '') IS NOT NULL AND ${contactDateFilter}) END
  `;

  const conditions: SQL[] = [eq(outreach.userId, userId)];

  // Stage filtering
  if (stage === "1") conditions.push(isNull(outreach.followUpSentAt));
  if (stage === "2") conditions.push(and(isNotNull(outreach.followUpSentAt), isNull(outreach.followUp2SentAt))!);

  if (category === "SENT") {
    conditions.push(isNotNull(outreach.followUp2SentAt));
  } else {
    // Active follow-ups: not fully completed and not in a terminal status.
    conditions.push(isNull(outreach.followUp2SentAt));
    conditions.push(notInArray(outreach.status, ["REPLIED", "REJECTED", "OFFER", "CLOSED"]));
    conditions.push(sql`${effectiveDue} IS NOT NULL`);

    if (category === "OVERDUE") conditions.push(lt(effectiveDue, startOfToday.toISOString()));
    if (category === "TODAY") conditions.push(and(gte(effectiveDue, startOfToday.toISOString()), lt(effectiveDue, endOfToday.toISOString()))!);
    if (category === "UPCOMING") conditions.push(gte(effectiveDue, endOfToday.toISOString()));
    // ALL_ACTIVE adds no extra date predicate.
  }

  const orderBy =
    category === "SENT"
      ? desc(sql`${outreach.contacts}->0->>'messageSentAt'`)
      : asc(effectiveDue);

  // Fetch one extra row to determine hasMore without a separate count query.
  const rows = await db
    .select({
      id: outreach.id,
      companyName: outreach.companyName,
      roleTargeted: outreach.roleTargeted,
      status: outreach.status,
      followUpSentAt: outreach.followUpSentAt,
      followUp2SentAt: outreach.followUp2SentAt,
      contacts: outreach.contacts,
      effectiveDue,
    })
    .from(outreach)
    .where(and(...conditions))
    .orderBy(orderBy)
    .limit(limit + 1)
    .offset(offset);

  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit).map((item) => {
    const contact = !item.followUpSentAt
      ? item.contacts.find(contact => contact.followUpDueAt && new Date(contact.followUpDueAt).getTime() === new Date(item.effectiveDue).getTime()) ?? item.contacts[0]
      : item.contacts[0];
    return {
      id: item.id,
      companyName: item.companyName,
      personName: contact?.personName || "No Contact",
      roleTargeted: item.roleTargeted,
      status: item.status,
      followUpDueAt: item.effectiveDue,
      contactMethod: contact?.contactMethod || "EMAIL",
      followUpSentAt: item.followUpSentAt,
      followUp2SentAt: item.followUp2SentAt,
      contacts: item.contacts,
    };
  });

  return { items, hasMore };
}
