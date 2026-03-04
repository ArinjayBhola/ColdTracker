/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { sentEmails, outreach } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getValidAccessToken, getConnectedEmailProvider } from "@/lib/email/token-refresh";
import { prepareEmailBody } from "@/lib/email/tracking";
import { sendViaGmail } from "@/lib/email/gmail";
import { sendViaOutlook } from "@/lib/email/outlook";
import { revalidatePath } from "next/cache";

type SendEmailInput = {
  outreachId: string;
  contactIndex: number;
  to: string;
  subject: string;
  body: string;
};

export async function sendEmailAction(input: SendEmailInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  const { outreachId, contactIndex, to, subject, body } = input;

  // Get valid access token
  const tokenResult = await getValidAccessToken(session.user.id);
  if (!tokenResult) {
    return {
      success: false,
      error: "No connected email account. Please connect Gmail or Outlook in Settings.",
    };
  }

  // Generate tracking ID and prepare email body
  const trackingId = crypto.randomUUID();
  const htmlBody = prepareEmailBody(body, trackingId);

  // Send via the appropriate provider
  const sendResult =
    tokenResult.provider === "gmail"
      ? await sendViaGmail({
          accessToken: tokenResult.accessToken,
          to,
          subject,
          htmlBody,
        })
      : await sendViaOutlook({
          accessToken: tokenResult.accessToken,
          to,
          subject,
          htmlBody,
        });

  if (!sendResult.success) {
    return { success: false, error: sendResult.error };
  }

  // Insert into sentEmails table
  await db.insert(sentEmails).values({
    outreachId,
    userId: session.user.id,
    contactIndex,
    to,
    subject,
    body,
    trackingId,
    provider: tokenResult.provider,
  });

  // Update outreach contact's messageSentAt
  const outreachRecord = await db.query.outreach.findFirst({
    where: and(eq(outreach.id, outreachId), eq(outreach.userId, session.user.id)),
  });

  if (outreachRecord) {
    const contacts = (outreachRecord.contacts as any[]) || [];
    if (contacts[contactIndex]) {
      contacts[contactIndex].messageSentAt = new Date().toISOString();
    }

    const updates: Record<string, any> = {
      contacts,
      updatedAt: new Date(),
    };

    // If status is DRAFT, update to SENT
    if (outreachRecord.status === "DRAFT") {
      updates.status = "SENT";
    }

    await db.update(outreach).set(updates).where(eq(outreach.id, outreachId));
  }

  revalidatePath(`/outreach/${outreachId}`);

  return { success: true };
}

export async function getEmailAccountStatus() {
  const session = await auth();
  if (!session?.user?.id) return { connected: false, provider: null };

  const provider = await getConnectedEmailProvider(session.user.id);
  return { connected: !!provider, provider };
}

export async function getSentEmailsForOutreach(outreachId: string) {
  const session = await auth();
  if (!session?.user?.id) return [];

  return db
    .select()
    .from(sentEmails)
    .where(and(eq(sentEmails.outreachId, outreachId), eq(sentEmails.userId, session.user.id)))
    .orderBy(desc(sentEmails.sentAt));
}
