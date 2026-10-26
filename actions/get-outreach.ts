"use server";

import { db } from "@/db";
import { outreach, automationOutreachEvents } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export async function getOutreachById(id: string) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const item = await db.query.outreach.findFirst({
    where: and(
        eq(outreach.id, id),
        eq(outreach.userId, session.user.id)
    )
  });

  if (!item) return null;
  const event = await db.query.automationOutreachEvents.findFirst({
    columns: { eventKey: true },
    where: and(eq(automationOutreachEvents.userId, session.user.id), eq(automationOutreachEvents.outreachId, id)),
  });
  return { ...item, isAutomated: !!event };
}
