import { z } from "zod";
import { preferencesSchema } from "@/lib/preferences";
import { shortcutPreferencesSchema } from "@/lib/keyboard-shortcuts";
export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;
const date = z.string().datetime({ offset: true });
const text = z.string().max(100_000);
const nullableText = text.nullable();
// Older records may contain bare domains, just as the outreach form accepts.
const url = z.string().max(4096).transform(value => {
  const trimmed = value.trim();
  return trimmed && !/^[a-z][a-z\d+.-]*:/i.test(trimmed) ? `https://${trimmed}` : trimmed;
}).refine(value => { if (!value) return true; try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; } }, "Use an HTTP or HTTPS URL.");
const nullableUrl = url.nullable();
const base = { id: z.string().uuid(), createdAt: date };
const contact = z.object({ personName: z.string().max(500), personRole: z.string().max(500), contactMethod: z.enum(["EMAIL", "LINKEDIN"]), emailAddress: nullableText.optional(), linkedinProfileUrl: nullableUrl.optional(), emailThreadUrl: nullableUrl.optional(), messageSentAt: date.optional(), followUpDueAt: date.optional() });
const uniqueRows = <T extends z.ZodType<{ id: string }>>(schema: T) => z.array(schema).max(5000).refine(rows => new Set(rows.map(row => row.id)).size === rows.length, "Duplicate record IDs in backup.");
export const backupSchema = z.object({
  format: z.literal("coldtrack-backup"), version: z.literal(1), exportedAt: date,
  outreach: uniqueRows(z.object({ ...base, companyName: z.string().max(255), companyLink: nullableUrl, roleTargeted: z.string().max(255), applicationSource: text, applicationUrl: nullableUrl, applicationStatus: text, status: z.enum(["DRAFT", "SENT", "REPLIED", "GHOSTED", "INTERVIEW", "REJECTED", "OFFER", "CLOSED"]), notes: nullableText, contacts: z.array(contact).max(100), followUpSentAt: date.nullable(), followUp2DueAt: date.nullable(), followUp2SentAt: date.nullable(), updatedAt: date })),
  templates: uniqueRows(z.object({ ...base, title: z.string().max(200), subject: z.string().max(500), body: text, category: z.string().max(80), tags: z.array(z.string().max(100)).max(100), characterLimit: z.number().int().positive().nullable(), favorite: z.boolean(), pinned: z.boolean(), updatedAt: date })),
  extensionLeads: uniqueRows(z.object({ ...base, profileUrl: url, personName: z.string().max(255), companyName: z.string().max(255).nullable(), companyUrl: nullableUrl, position: z.string().max(255).nullable(), personRole: nullableText, contactMethod: z.enum(["EMAIL", "LINKEDIN"]), emailAddress: z.string().max(255).nullable(), outreachDate: date, followUpDate: date.nullable(), notes: nullableText })),
  startupTracking: uniqueRows(z.object({ ...base, startupId: z.string().uuid(), outreachDone: z.boolean(), followUpDate: date.nullable(), notes: nullableText, updatedAt: date })),
  settings: z.object({ preferences: preferencesSchema, keyboardShortcuts: shortcutPreferencesSchema, notificationEmail: z.string().email().nullable(), receiveNotifications: z.boolean(), goals: z.object({ dailyTarget: z.number().int().min(1).max(50), weeklyTarget: z.number().int().min(1).max(100) }).nullable() }),
});
export type AccountBackup = z.infer<typeof backupSchema>;
export function readBackup(value: unknown) {
  if (new TextEncoder().encode(JSON.stringify(value)).length > MAX_BACKUP_BYTES) throw new Error("Backup exceeds the 5 MB limit.");
  const result = backupSchema.safeParse(value);
  if (!result.success) throw new Error(`Invalid backup: ${result.error.issues[0].path.join(".")} ${result.error.issues[0].message}`);
  return result.data;
}
