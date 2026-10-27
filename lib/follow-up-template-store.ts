import { db } from "@/db";
import { messageTemplates } from "@/db/schema";
import { DEFAULT_FOLLOW_UP_TEMPLATES } from "@/lib/follow-up-templates";
import { followUpTemplateId } from "@/lib/follow-up-template-slots";

export async function ensureFollowUpTemplates(userId: string) {
  await db.insert(messageTemplates).values(DEFAULT_FOLLOW_UP_TEMPLATES.map(template => ({
    id: followUpTemplateId(userId, template.stage), userId,
    title: `Follow-up ${template.stage}`, subject: template.subject, body: template.body,
    category: "Follow-ups", tags: ["follow-up", `stage-${template.stage}`],
  }))).onConflictDoNothing();
}
