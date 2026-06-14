"use server";

import { db } from "@/db";
import { outreach, type OutreachContact } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, not } from "drizzle-orm";

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
  }> = [];

  for (const item of items) {
    const firstContact = (item.contacts as OutreachContact[])?.[0];

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
        });
      }
    }
  }

  return { events };
}

