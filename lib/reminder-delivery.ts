import { db } from "@/db";
import { reminderDeliveries } from "@/db/schema";
import { sql, eq } from "drizzle-orm";
import { buildReminderEmail, sendReminderEmail } from "@/lib/resend";

// Persist the exact provider payload. Retries must reuse both payload and key.
// Resend retains keys for 24h; uncertain sends expire before that window closes.
export async function deliverReminder(userId: string, day: string, kind: "daily" | "follow_up", to: string, name: string, pendingCount = 0) {
  const payload = buildReminderEmail(kind, to, name, pendingCount);
  const [delivery] = await db.insert(reminderDeliveries).values({
    userId, day, kind, payload, state: "sending", attemptedAt: new Date(), attempts: 1,
  }).onConflictDoUpdate({
    target: [reminderDeliveries.userId, reminderDeliveries.day, reminderDeliveries.kind],
    set: { state: "sending", attemptedAt: new Date(), attempts: sql`${reminderDeliveries.attempts} + 1` },
    setWhere: sql`${reminderDeliveries.state} IN ('pending','failed','sending')
      AND (${reminderDeliveries.attemptedAt} IS NULL OR ${reminderDeliveries.attemptedAt} < now() - interval '5 minutes')
      AND ${reminderDeliveries.createdAt} > now() - interval '23 hours'`,
  }).returning();
  if (!delivery) return "skipped";
  try {
    const result = await sendReminderEmail(delivery.payload, `reminder/${delivery.id}`);
    if (result.error || !result.data?.id) throw new Error("Reminder provider did not accept the email");
    await db.update(reminderDeliveries).set({ state: "sent", providerId: result.data.id, sentAt: new Date() })
      .where(eq(reminderDeliveries.id, delivery.id));
    return "sent";
  } catch (error) {
    await db.update(reminderDeliveries).set({ state: "failed" }).where(eq(reminderDeliveries.id, delivery.id));
    throw error;
  }
}
