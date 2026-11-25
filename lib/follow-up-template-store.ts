import { db } from "@/db";
import { messageTemplates } from "@/db/schema";
import { DEFAULT_FOLLOW_UP_TEMPLATES } from "@/lib/follow-up-templates";
import { followUpTemplateId } from "@/lib/follow-up-template-slots";
import { and, eq, inArray } from "drizzle-orm";

export async function ensureFollowUpTemplates(userId: string, knownIds?: readonly string[]) {
  const expected=DEFAULT_FOLLOW_UP_TEMPLATES.map(template=>followUpTemplateId(userId,template.stage));
  const existing=knownIds ?? (await db.select({id:messageTemplates.id}).from(messageTemplates)
    .where(and(eq(messageTemplates.userId,userId),inArray(messageTemplates.id,expected)))).map(row=>row.id);
  const missing=DEFAULT_FOLLOW_UP_TEMPLATES.filter(template=>!existing.includes(followUpTemplateId(userId,template.stage)));
  if(!missing.length)return false;
  await db.insert(messageTemplates).values(missing.map(template => ({
    id: followUpTemplateId(userId, template.stage), userId,
    title: `Follow-up ${template.stage}`, subject: template.subject, body: template.body,
    category: "Follow-ups", tags: ["follow-up", `stage-${template.stage}`],
  }))).onConflictDoNothing();
  return true;
}
