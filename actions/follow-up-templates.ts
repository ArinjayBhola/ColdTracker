"use server";

import { db } from "@/db";
import { messageTemplates } from "@/db/schema";
import { auth } from "@/lib/auth";
import { and, eq, inArray } from "drizzle-orm";
import { DEFAULT_FOLLOW_UP_TEMPLATES, type FollowUpTemplate } from "@/lib/follow-up-templates";
import { followUpTemplateId } from "@/lib/follow-up-template-slots";
import { ensureFollowUpTemplates } from "@/lib/follow-up-template-store";

export async function getFollowUpTemplates(): Promise<(FollowUpTemplate & { id: string })[]> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;
  await ensureFollowUpTemplates(userId);
  const ids = DEFAULT_FOLLOW_UP_TEMPLATES.map(t => followUpTemplateId(userId, t.stage));
  const saved = await db.select().from(messageTemplates).where(and(eq(messageTemplates.userId, userId), inArray(messageTemplates.id, ids)));
  return DEFAULT_FOLLOW_UP_TEMPLATES.flatMap(t => {
    const custom = saved.find(row => row.id === followUpTemplateId(userId, t.stage));
    return custom ? [{ ...t, id: custom.id, subject: custom.subject, body: custom.body }] : [];
  });
}
