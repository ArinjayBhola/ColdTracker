"use server";
import { createHash } from "node:crypto";
import { db } from "@/db";
import { outreach, messageTemplates, extensionLeads, startupTracking, startups, users, goals } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, inArray, sql, getTableColumns } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { readBackup } from "@/lib/backup";
import { parsePreferences } from "@/lib/preferences";
import { defaultShortcutPreferences, shortcutPreferencesSchema } from "@/lib/keyboard-shortcuts";
import { revalidatePath } from "next/cache";

function excluded(table: PgTable) {
  return Object.fromEntries(Object.entries(getTableColumns(table)).filter(([key]) => !["id", "userId"].includes(key)).map(([key, column]) => [key, sql.raw(`excluded."${column.name}"`)]));
}
function chunks<T>(rows: T[]) { return Array.from({ length: Math.ceil(rows.length / 100) }, (_, index) => rows.slice(index * 100, index * 100 + 100)); }
function restoreId(owner: string, original: string, owned: Set<string>) {
  if (owned.has(original)) return original;
  // Stable per-account IDs make repeated imports idempotent and prevent foreign ID collisions.
  const hash = createHash("sha256").update(`${owner}:${original}`).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}
const asDate = (value: string | null) => value ? new Date(value) : null;

export async function exportAccountBackup() {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Please sign in again.");
    const userId = session.user.id;
    const data = await db.transaction(async tx => {
      const [records, templates, leads, tracking, user, goal] = await Promise.all([
        tx.select().from(outreach).where(eq(outreach.userId, userId)),
        tx.select().from(messageTemplates).where(eq(messageTemplates.userId, userId)),
        tx.select().from(extensionLeads).where(eq(extensionLeads.userId, userId)),
        tx.select().from(startupTracking).where(eq(startupTracking.userId, userId)),
        tx.query.users.findFirst({ where: eq(users.id, userId), columns: { preferences: true, keyboardShortcuts: true, notificationEmail: true, receiveNotifications: true, reminderTime: true } }),
        tx.query.goals.findFirst({ where: eq(goals.userId, userId) }),
      ]);
      if (!user) throw new Error("Account not found.");
      const shortcuts = shortcutPreferencesSchema.safeParse(user.keyboardShortcuts);
      return { format: "coldtrack-backup", version: 1, exportedAt: new Date().toISOString(), outreach: records, templates, extensionLeads: leads, startupTracking: tracking,
        settings: { preferences: parsePreferences(user.preferences), keyboardShortcuts: shortcuts.success ? shortcuts.data : defaultShortcutPreferences, notificationEmail: user.notificationEmail, receiveNotifications: user.receiveNotifications ?? true, reminderTime: user.reminderTime, goals: goal ? { dailyTarget: goal.dailyTarget, weeklyTarget: goal.weeklyTarget } : null } };
    }, { isolationLevel: "repeatable read", accessMode: "read only" });
    // Schema strips ownership fields; credentials and OAuth tokens are never exported.
    return { success: true as const, data: readBackup(JSON.parse(JSON.stringify(data))) };
  } catch (error) {
    console.error("Account backup export failed", error);
    const message = error instanceof Error ? error.message : "";
    return { success: false as const, error: message.startsWith("Invalid backup:") || message.startsWith("Backup exceeds") || message === "Please sign in again." || message === "Account not found."
      ? message : "Could not prepare your backup. Please try again." };
  }
}

export async function restoreAccountBackup(input: unknown, includeSettings: boolean) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Please sign in again.");
  const backup = readBackup(input);
  const userId = session.user.id;
  const skipped = await db.transaction(async tx => {
    await tx.execute(sql`SELECT id FROM "user" WHERE id = ${userId} FOR UPDATE`);
    const [existingOutreach, existingTemplates, existingLeads, existingTracking] = await Promise.all([
      tx.select({ id: outreach.id }).from(outreach).where(eq(outreach.userId, userId)),
      tx.select({ id: messageTemplates.id }).from(messageTemplates).where(eq(messageTemplates.userId, userId)),
      tx.select({ id: extensionLeads.id }).from(extensionLeads).where(eq(extensionLeads.userId, userId)),
      tx.select({ id: startupTracking.id }).from(startupTracking).where(eq(startupTracking.userId, userId)),
    ]);
    const owned = (rows: { id: string }[]) => new Set(rows.map(row => row.id));
    const outreachIds = owned(existingOutreach), templateIds = owned(existingTemplates), leadIds = owned(existingLeads), trackingIds = owned(existingTracking);
    const records = backup.outreach.map(row => ({ ...row,
      contacts: row.contacts.map((contact, index) => index === 0 && contact.followUpSentAt === undefined ? {
        ...contact, followUpSentAt: row.followUpSentAt, followUp2DueAt: row.followUp2DueAt, followUp2SentAt: row.followUp2SentAt,
      } : contact),
      id: restoreId(userId, row.id, outreachIds), userId, createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt), followUpSentAt: asDate(row.followUpSentAt), followUp2DueAt: asDate(row.followUp2DueAt), followUp2SentAt: asDate(row.followUp2SentAt) }));
    for (const batch of chunks(records)) await tx.insert(outreach).values(batch).onConflictDoUpdate({ target: outreach.id, set: excluded(outreach), setWhere: eq(outreach.userId, userId) });
    const templates = backup.templates.map(row => ({ ...row, id: restoreId(userId, row.id, templateIds), userId, createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt) }));
    for (const batch of chunks(templates)) await tx.insert(messageTemplates).values(batch).onConflictDoUpdate({ target: messageTemplates.id, set: excluded(messageTemplates), setWhere: eq(messageTemplates.userId, userId) });
    const leads = backup.extensionLeads.map(row => ({ ...row, id: restoreId(userId, row.id, leadIds), userId, createdAt: new Date(row.createdAt), outreachDate: new Date(row.outreachDate), followUpDate: asDate(row.followUpDate) }));
    for (const batch of chunks(leads)) await tx.insert(extensionLeads).values(batch).onConflictDoUpdate({ target: extensionLeads.id, set: excluded(extensionLeads), setWhere: eq(extensionLeads.userId, userId) });
    const catalog = backup.startupTracking.length ? await tx.select({ id: startups.id }).from(startups).where(inArray(startups.id, backup.startupTracking.map(row => row.startupId))) : [];
    const catalogIds = owned(catalog);
    const tracking = backup.startupTracking.filter(row => catalogIds.has(row.startupId)).map(row => ({ ...row, id: restoreId(userId, row.id, trackingIds), userId, createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt), followUpDate: asDate(row.followUpDate) }));
    for (const batch of chunks(tracking)) await tx.insert(startupTracking).values(batch).onConflictDoUpdate({ target: [startupTracking.userId, startupTracking.startupId], set: { outreachDone: sql`excluded.outreach_done`, notes: sql`excluded.notes`, followUpDate: sql`excluded.follow_up_date`, updatedAt: sql`excluded.updated_at` } });
    if (includeSettings === true) {
      const settings = backup.settings;
      await tx.update(users).set({ preferences: settings.preferences, keyboardShortcuts: settings.keyboardShortcuts, notificationEmail: settings.notificationEmail, receiveNotifications: settings.receiveNotifications, ...(settings.reminderTime ? { reminderTime: settings.reminderTime } : {}) }).where(eq(users.id, userId));
      if (settings.goals) {
        const goal = await tx.query.goals.findFirst({ where: eq(goals.userId, userId) });
        if (goal) await tx.update(goals).set({ ...settings.goals, updatedAt: new Date() }).where(eq(goals.userId, userId));
        else await tx.insert(goals).values({ userId, ...settings.goals });
      }
    }
    return backup.startupTracking.length - tracking.length;
  });
  revalidatePath("/", "layout");
  return { success: true, skippedStartupTracking: skipped };
}
