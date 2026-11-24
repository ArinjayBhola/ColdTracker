import { auth } from "@/lib/auth";
import { db } from "@/db";
import { outreach, outreachEmailMessages, outreachEmailOpenEvents } from "@/db/schema";
import { and, eq, desc, sql } from "drizzle-orm";
import { z } from "zod";
import { missingTrackingSchema } from "@/lib/email-tracking-store";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Sign in required" }, { status: 401, headers });
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return Response.json({ error: "Invalid outreach" }, { status: 400, headers });
  const owner = session.user.id;
  try {
    const owned = await db.select({ id: outreach.id }).from(outreach).where(and(eq(outreach.id, id), eq(outreach.userId, owner))).limit(1);
    if (!owned.length) return Response.json({ error: "Outreach not found" }, { status: 404, headers });
    const messages = await db.select({ id: outreachEmailMessages.id, recipient: outreachEmailMessages.recipient,
      subject: outreachEmailMessages.subject, kind: outreachEmailMessages.kind, deliveryState: outreachEmailMessages.deliveryState,
      trackingEnabled: outreachEmailMessages.trackingEnabled, sentAt: outreachEmailMessages.sentAt,
      createdAt: outreachEmailMessages.createdAt, firstOpenAt: outreachEmailMessages.firstOpenAt,
      lastOpenAt: outreachEmailMessages.lastOpenAt, openCount: outreachEmailMessages.openCount,
    }).from(outreachEmailMessages).where(and(eq(outreachEmailMessages.userId, owner), eq(outreachEmailMessages.outreachId, id)))
      .orderBy(desc(outreachEmailMessages.sentAt), desc(outreachEmailMessages.createdAt)).limit(50);
    const acceptedIds = messages.filter(message => message.deliveryState === "accepted").map(message => message.id);
    const events = acceptedIds.length ? await db.execute<{ messageId: string; observedAt: string | Date }>(sql`
      SELECT selected.message_id AS "messageId", recent.observed_at AS "observedAt"
      FROM unnest(${`{${acceptedIds.join(",")}}`}::uuid[]) AS selected(message_id)
      CROSS JOIN LATERAL (
        SELECT ${outreachEmailOpenEvents.observedAt} AS observed_at FROM ${outreachEmailOpenEvents}
        WHERE ${outreachEmailOpenEvents.messageId} = selected.message_id
        ORDER BY ${outreachEmailOpenEvents.observedAt} DESC LIMIT 20
      ) recent
      ORDER BY selected.message_id, recent.observed_at DESC
    `) : [];
    const eventsByMessage = new Map<string, { observedAt: Date }[]>();
    for (const event of events) {
      const recent = eventsByMessage.get(event.messageId) ?? [];
      recent.push({ observedAt: new Date(event.observedAt) });
      eventsByMessage.set(event.messageId, recent);
    }
    const rows = messages.map(message => ({ ...message,
      collectionExpired: Date.now() - +message.createdAt > 90 * 86400000,
      firstOpenAt: message.deliveryState === "accepted" ? message.firstOpenAt : null,
      lastOpenAt: message.deliveryState === "accepted" ? message.lastOpenAt : null,
      openCount: message.deliveryState === "accepted" ? message.openCount : null,
      recentEvents: eventsByMessage.get(message.id) ?? [],
    }));
    return Response.json({ available: true, collectionEnabled: process.env.EMAIL_OPEN_TRACKING_ENABLED === "true", messages: rows,
      limit: 50, expiresAfterDays: 90 }, { headers });
  } catch (error) {
    if (missingTrackingSchema(error) || typeof error === "object" && error !== null && "cause" in error && missingTrackingSchema(error.cause)) {
      return Response.json({ available: false, reason: "not_configured", messages: [] }, { headers });
    }
    return Response.json({ error: "Email activity temporarily unavailable" }, { status: 503, headers });
  }
}
