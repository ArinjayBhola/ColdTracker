import { db } from "@/db";
import { sentEmails, emailEvents } from "@/db/schema";
import { eq, isNull, and } from "drizzle-orm";
import { NextRequest } from "next/server";

// 1x1 transparent GIF
const TRANSPARENT_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ trackingId: string }> }
) {
  const { trackingId } = await params;

  try {
    // Find the sent email by tracking ID
    const email = await db.query.sentEmails.findFirst({
      where: eq(sentEmails.trackingId, trackingId),
    });

    if (email) {
      // Update openedAt only on first open
      if (!email.openedAt) {
        await db
          .update(sentEmails)
          .set({ openedAt: new Date() })
          .where(
            and(eq(sentEmails.trackingId, trackingId), isNull(sentEmails.openedAt))
          );
      }

      // Always log the event
      await db.insert(emailEvents).values({
        sentEmailId: email.id,
        trackingId,
        type: "open",
        userAgent: req.headers.get("user-agent") || undefined,
        ip:
          req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          undefined,
      });
    }
  } catch {
    // Silently fail - don't break the tracking pixel
  }

  return new Response(TRANSPARENT_GIF, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
