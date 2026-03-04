import { db } from "@/db";
import { sentEmails, emailEvents } from "@/db/schema";
import { eq, isNull, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ trackingId: string }> }
) {
  const { trackingId } = await params;
  const url = req.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  try {
    const email = await db.query.sentEmails.findFirst({
      where: eq(sentEmails.trackingId, trackingId),
    });

    if (email) {
      // Update clickedAt only on first click
      if (!email.clickedAt) {
        await db
          .update(sentEmails)
          .set({ clickedAt: new Date() })
          .where(
            and(
              eq(sentEmails.trackingId, trackingId),
              isNull(sentEmails.clickedAt)
            )
          );
      }

      // Log the click event
      await db.insert(emailEvents).values({
        sentEmailId: email.id,
        trackingId,
        type: "click",
        url,
        userAgent: req.headers.get("user-agent") || undefined,
        ip:
          req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          undefined,
      });
    }
  } catch {
    // Silently fail - still redirect
  }

  return NextResponse.redirect(url);
}
