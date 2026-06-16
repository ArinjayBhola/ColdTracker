/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { sentEmails, outreach, accounts, users } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getValidAccessToken, getConnectedEmailProvider } from "@/lib/email/token-refresh";
import { prepareEmailBody } from "@/lib/email/tracking";
import { sendViaGmail } from "@/lib/email/gmail";
import { sendViaOutlook } from "@/lib/email/outlook";
import { revalidatePath } from "next/cache";

export async function sendEmailAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  const outreachId = formData.get("outreachId") as string;
  const contactIndex = parseInt(formData.get("contactIndex") as string, 10);
  const to = formData.get("to") as string;
  const subject = formData.get("subject") as string;
  const body = formData.get("body") as string;

  const rawFiles = formData.getAll("attachments") as File[];
  const attachments: { name: string; type: string; content: string }[] = [];

  for (const file of rawFiles) {
    if (file && file.size > 0) {
      const arrayBuffer = await file.arrayBuffer();
      const content = Buffer.from(arrayBuffer).toString("base64");
      attachments.push({
        name: file.name,
        type: file.type || "application/octet-stream",
        content,
      });
    }
  }

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
          attachments,
        })
      : await sendViaOutlook({
          accessToken: tokenResult.accessToken,
          to,
          subject,
          htmlBody,
          attachments,
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

  return db.query.sentEmails.findMany({
    where: and(
      eq(sentEmails.outreachId, outreachId),
      eq(sentEmails.userId, session.user.id)
    ),
    orderBy: desc(sentEmails.sentAt),
    with: {
      events: {
        orderBy: (events, { asc }) => asc(events.timestamp),
      },
    },
  });
}

export async function deleteSentEmailAction(sentEmailId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  // Scope the delete to the owner; emailEvents cascade-delete via FK.
  const deleted = await db
    .delete(sentEmails)
    .where(
      and(eq(sentEmails.id, sentEmailId), eq(sentEmails.userId, session.user.id))
    )
    .returning({ id: sentEmails.id, outreachId: sentEmails.outreachId });

  if (deleted.length === 0) {
    return { success: false, error: "Email not found" };
  }

  revalidatePath(`/outreach/${deleted[0].outreachId}`);
  return { success: true };
}

export async function checkHasPassword() {
  const session = await auth();
  if (!session?.user?.id) return { hasPassword: false };

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: { password: true },
  });

  return { hasPassword: !!user?.password };
}

export async function disconnectEmailAccountAction(provider: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Not authenticated" };

  // Map our internal provider string to the NextAuth provider ID
  const nextAuthProviderId = provider === "gmail" ? "google" : "microsoft-entra-id";

  try {
    await db.delete(accounts).where(
      and(
        eq(accounts.userId, session.user.id),
        eq(accounts.provider, nextAuthProviderId)
      )
    );
    
    // We should not delete the user account, just the OAuth connection
    return { success: true };
  } catch (error) {
    console.error("Failed to disconnect account:", error);
    return { success: false, error: "Database error while disconnecting account" };
  }
}
