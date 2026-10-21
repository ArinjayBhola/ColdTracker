"use server";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { outreach } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { AnalyticsRecord } from "@/lib/outreach-analytics";

function iso(value: string | Date | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

export async function getOutreachAnalyticsRecords(): Promise<AnalyticsRecord[]> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Please sign in again.");
  const rows = await db.select({
    id: outreach.id, status: outreach.status, contacts: outreach.contacts,
    createdAt: outreach.createdAt, followUpSentAt: outreach.followUpSentAt,
    followUp2DueAt: outreach.followUp2DueAt, followUp2SentAt: outreach.followUp2SentAt,
  }).from(outreach).where(eq(outreach.userId, session.user.id));
  return rows.map(row => {
    const sentDates = row.contacts.map(contact => iso(contact.messageSentAt)).filter((date): date is string => date !== null).sort();
    const dueDates = row.contacts.map(contact => iso(contact.followUpDueAt)).filter((date): date is string => date !== null).sort();
    const methods = new Set(row.contacts.map(contact => contact.contactMethod).filter(Boolean));
    const channel = methods.size > 1 ? "Mixed" : methods.has("EMAIL") ? "Email" : methods.has("LINKEDIN") ? "LinkedIn" : "Unspecified";
    return {
      id: row.id, status: row.status, createdAt: row.createdAt.toISOString(),
      sentAt: sentDates[0] ?? row.createdAt.toISOString(), channel,
      followUpDueAt: row.followUpSentAt ? row.followUp2SentAt ? null : iso(row.followUp2DueAt) : dueDates[0] ?? null,
    };
  });
}
