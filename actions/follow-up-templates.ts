"use server";

import { createHash } from "node:crypto";
import { db } from "@/db";
import { messageTemplates } from "@/db/schema";
import { auth } from "@/lib/auth";
import { and, eq, inArray } from "drizzle-orm";
import { DEFAULT_FOLLOW_UP_TEMPLATES, type FollowUpTemplate } from "@/lib/follow-up-templates";

function slotId(userId: string, stage: number, variant: string) {
  const hash = createHash("sha256").update(JSON.stringify(["follow-up-template-v1", userId, stage, variant])).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

export async function getFollowUpTemplates(): Promise<(FollowUpTemplate & { id: string })[]> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;
  const ids = DEFAULT_FOLLOW_UP_TEMPLATES.map(t => slotId(userId, t.stage, t.variant));
  const saved = await db.select().from(messageTemplates).where(and(eq(messageTemplates.userId, userId), inArray(messageTemplates.id, ids)));
  return DEFAULT_FOLLOW_UP_TEMPLATES.flatMap(t => {
    const custom = saved.find(row => row.id === slotId(userId, t.stage, t.variant));
    return custom ? [{ ...t, id: custom.id, subject: custom.subject, body: custom.body }] : [];
  });
}
