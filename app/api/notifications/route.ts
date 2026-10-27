import { auth } from "@/lib/auth";
import { db } from "@/db";
import { notifications, outreach } from "@/db/schema";
import { and, count, desc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
const cursorSchema = z.object({ at: z.iso.datetime({ offset: true }), id: z.uuid() });
const readSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("read"), id: z.uuid() }).strict(),
  z.object({ action: z.literal("unread"), id: z.uuid() }).strict(),
  z.object({ action: z.literal("clear"), id: z.uuid() }).strict(),
  z.object({ action: z.literal("read_all"), through: z.iso.datetime({ offset: true }) }).strict(),
  z.object({ action: z.literal("clear_all"), through: z.iso.datetime({ offset: true }) }).strict(),
]);

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Sign in required" }, { status: 401, headers });
  let cursor: z.infer<typeof cursorSchema> | undefined;
  const raw = new URL(request.url).searchParams.get("cursor");
  if (raw) {
    try {
      if (raw.length > 512) throw new Error("Invalid cursor");
      cursor = cursorSchema.parse(JSON.parse(Buffer.from(raw, "base64url").toString()));
    } catch {
      return Response.json({ error: "Invalid cursor" }, { status: 400, headers });
    }
  }
  const owner = session.user.id;
  try {
    const result = await db.transaction(async tx => {
      // Preserve PostgreSQL microseconds in cursors; converting through a JS Date
      // can skip notifications created within the same millisecond.
      const [clock] = await tx.select({ through: sql<string>`to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')` }).from(sql`(SELECT 1) AS clock`);
      const items = await tx.select({
        id: notifications.id, outreachId: notifications.outreachId,
        recipient: notifications.recipient, subject: notifications.subject,
        companyName: outreach.companyName,
        personName: sql<string | null>`(
          SELECT NULLIF(btrim(contact->>'personName'), '')
          FROM jsonb_array_elements(${outreach.contacts}) AS contact
          WHERE lower(btrim(contact->>'emailAddress')) = lower(btrim(${notifications.recipient}))
          LIMIT 1
        )`,
        observedAt: notifications.observedAt,
        createdAt: sql<string>`to_char(${notifications.createdAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`,
        readAt: notifications.readAt,
      }).from(notifications).innerJoin(outreach, and(eq(outreach.id, notifications.outreachId), eq(outreach.userId, owner)))
        .where(and(eq(notifications.userId, owner), isNull(notifications.clearedAt), cursor
          ? sql`(${notifications.createdAt}, ${notifications.id}) < (${cursor.at}::timestamptz, ${cursor.id}::uuid)`
          : undefined))
        .orderBy(desc(notifications.createdAt), desc(notifications.id)).limit(31);
      const [unread] = await tx.select({ value: count() }).from(notifications)
        .where(and(eq(notifications.userId, owner), isNull(notifications.readAt), isNull(notifications.clearedAt)));
      const page = items.slice(0, 30);
      const last = page.at(-1);
      return {
        items: page, unreadCount: unread.value,
        nextCursor: items.length > 30 && last ? Buffer.from(JSON.stringify({ at: last.createdAt, id: last.id })).toString("base64url") : null,
        through: clock.through,
      };
    }, { isolationLevel: "repeatable read", accessMode: "read only" });
    return Response.json(result, { headers });
  } catch {
    return Response.json({ error: "Notifications temporarily unavailable" }, { status: 503, headers });
  }
}

export async function PATCH(request: Request) {
  // Cookie-authenticated writes must come from this app, not an external site.
  const origin = request.headers.get("origin");
  if ((origin && origin !== new URL(request.url).origin) || request.headers.get("sec-fetch-site") === "cross-site") {
    return Response.json({ error: "Invalid origin" }, { status: 403, headers });
  }
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Sign in required" }, { status: 401, headers });
  const body = readSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return Response.json({ error: "Invalid notification update" }, { status: 400, headers });
  try {
    const action = body.data;
    const clearing = action.action === "clear" || action.action === "clear_all";
    await db.update(notifications).set({
      readAt: action.action === "unread" ? null : sql`now()`,
      ...(clearing ? { clearedAt: sql`now()` } : {}),
    }).where(and(
      eq(notifications.userId, session.user.id), isNull(notifications.clearedAt),
      action.action === "read" || action.action === "read_all" ? isNull(notifications.readAt) : undefined,
      "id" in action ? eq(notifications.id, action.id) : sql`${notifications.createdAt} <= ${action.through}::timestamptz`,
    ));
    return Response.json({ success: true }, { headers });
  } catch {
    return Response.json({ error: "Could not update notification status" }, { status: 503, headers });
  }
}
