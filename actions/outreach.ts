"use server";

import { db } from "@/db";
import { outreach } from "@/db/schema";
import { editOutreachSchema, outreachFormSchema, STATUSES } from "@/lib/validations";
import { auth } from "@/lib/auth";
import { eq, desc, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addDays } from "date-fns";
export type ActionState = {
  error?: string;
  success?: boolean;
  details?: Record<string, string[]>;
  outreachId?: string;
};

export async function createOutreachAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  // Helper to extract contacts from formData
  const contacts: any[] = [];
  let i = 0;
  while (formData.has(`contacts.${i}.personName`)) {
    contacts.push({
      personName: formData.get(`contacts.${i}.personName`),
      personRole: formData.get(`contacts.${i}.personRole`),
      contactMethod: formData.get(`contacts.${i}.contactMethod`),
      emailAddress: formData.get(`contacts.${i}.emailAddress`),
      linkedinProfileUrl: formData.get(`contacts.${i}.linkedinProfileUrl`),
    });
    i++;
  }

  const rawData = {
    companyName: formData.get("companyName"),
    companyLink: formData.get("companyLink"),
    roleTargeted: formData.get("roleTargeted"),
    status: formData.get("status"),
    notes: formData.get("notes"),
    messageSentAt: formData.get("messageSentAt"),
    followUpDueAt: formData.get("followUpDueAt"),
    contacts,
  };

  const parsed = outreachFormSchema.safeParse(rawData);
  
  if (!parsed.success) {
    console.error("Validation failed:", parsed.error.flatten().fieldErrors);
    return { 
        error: "Please check the form for errors", 
        details: parsed.error.flatten().fieldErrors as any
    };
  }

  const {
    companyName,
    roleTargeted,
    companyLink,
    notes,
    status,
    contacts: validatedContacts,
  } = parsed.data;

  const now = new Date();
  const sentAt = parsed.data.messageSentAt instanceof Date ? parsed.data.messageSentAt : now;
  const followUpDueAt = parsed.data.followUpDueAt instanceof Date ? parsed.data.followUpDueAt : addDays(sentAt, 5);

  // Validation: follow-up should be ahead of sent date
  if (followUpDueAt <= sentAt) {
    return { error: "Follow-up date must be after the sent date" };
  }

  let firstOutreachId: string | undefined;

  try {
    // Insert each contact as a separate outreach entry
    await db.transaction(async (tx) => {
      for (const contact of validatedContacts) {
        const result = await tx.insert(outreach).values({
          userId: session.user.id,
          companyName,
          roleTargeted,
          personName: contact.personName,
          personRole: contact.personRole,
          contactMethod: contact.contactMethod,
          companyLink: companyLink || null,
          emailAddress: contact.emailAddress || null,
          linkedinProfileUrl: contact.linkedinProfileUrl || null,
          status: status || "SENT", 
          messageSentAt: sentAt,
          followUpDueAt,
          notes,
        }).returning({ id: outreach.id });
        
        // Capture the first outreach ID for redirect
        if (!firstOutreachId && result[0]) {
          firstOutreachId = result[0].id;
        }
      }
    });
  } catch (error) {
    console.error("Failed to create outreach:", error);
    return { error: "Database error" };
  }

  revalidatePath("/dashboard");
  return { success: true, outreachId: firstOutreachId };
}

export async function getOutreachItems() {
  const session = await auth();
  if (!session?.user?.id) return [];

  // Sort by followUpDueAt ascending (closest first) by default for dashboard?
  // User asked for "Sort by follow-up due date by default"
  return await db.query.outreach.findMany({
    where: eq(outreach.userId, session.user.id),
    orderBy: [desc(outreach.followUpDueAt)], 
  });
}

// Helper to get stats
export async function getStats() {
    const session = await auth();
    if (!session?.user?.id) return { sent: 0, replies: 0, interviews: 0, offers: 0 };

    const items = await db.query.outreach.findMany({
        where: eq(outreach.userId, session.user.id),
    });

    return {
        sent: items.length, // Total items
        replies: items.filter(i => i.status === 'REPLIED').length,
        interviews: items.filter(i => i.status === 'INTERVIEW').length,
        offers: items.filter(i => i.status === 'OFFER').length,
    };
}

export async function getGroupedOutreachByCompany() {
  const session = await auth();
  if (!session?.user?.id) return [];

  const items = await db.query.outreach.findMany({
    where: eq(outreach.userId, session.user.id),
    orderBy: [desc(outreach.messageSentAt)],
  });

  // Group items by company name
  const groupedMap = new Map<string, {
    companyName: string;
    companyLink: string | null;
    roleTargeted: string;
    contactCount: number;
    contacts: typeof items;
    mostRecentContact: typeof items[0];
    statuses: string[];
    earliestMessageSentAt: Date;
    latestFollowUpDueAt: Date;
    latestFollowUpSentAt: Date | null;
  }>();

  for (const item of items) {
    const existing = groupedMap.get(item.companyName);

    if (!existing) {
      groupedMap.set(item.companyName, {
        companyName: item.companyName,
        companyLink: item.companyLink,
        roleTargeted: item.roleTargeted,
        contactCount: 1,
        contacts: [item],
        mostRecentContact: item,
        statuses: [item.status],
        earliestMessageSentAt: item.messageSentAt,
        latestFollowUpDueAt: item.followUpDueAt,
        latestFollowUpSentAt: item.followUpSentAt,
      });
    } else {
      existing.contactCount++;
      existing.contacts.push(item);
      
      // Add status if it's not already in the list
      if (!existing.statuses.includes(item.status)) {
        existing.statuses.push(item.status);
      }
      
      // Update most recent contact if this one is newer
      if (item.messageSentAt > existing.mostRecentContact.messageSentAt) {
        existing.mostRecentContact = item;
      }
      
      // Track earliest message sent
      if (item.messageSentAt < existing.earliestMessageSentAt) {
        existing.earliestMessageSentAt = item.messageSentAt;
      }
      
      // Track latest follow-up due date
      if (item.followUpDueAt > existing.latestFollowUpDueAt) {
        existing.latestFollowUpDueAt = item.followUpDueAt;
      }

      // Track latest follow-up sent date
      if (item.followUpSentAt && (!existing.latestFollowUpSentAt || item.followUpSentAt > existing.latestFollowUpSentAt)) {
        existing.latestFollowUpSentAt = item.followUpSentAt;
      }
    }
  }

  // Convert map to array and return
  return Array.from(groupedMap.values()).map(group => ({
    id: group.mostRecentContact.id, // Use most recent contact's ID for linking
    companyName: group.companyName,
    companyLink: group.companyLink,
    roleTargeted: group.roleTargeted,
    personName: group.mostRecentContact.personName,
    personRole: group.mostRecentContact.personRole,
    status: group.mostRecentContact.status,
    messageSentAt: group.earliestMessageSentAt, // Show when first contact was made
    followUpDueAt: group.latestFollowUpDueAt, // Show latest follow-up date
    followUpSentAt: group.latestFollowUpSentAt,
    contactMethod: group.mostRecentContact.contactMethod,
    contactCount: group.contactCount,
  }));
}

export async function updateOutreachStatus(id: string, newStatus: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };

    // Validate status
    // @ts-expect-error - checked against STATUSES array
    if (!STATUSES.includes(newStatus)) {
        return { error: "Invalid status" };
    }

    try {
        await db.update(outreach)
            .set({ 
                // @ts-expect-error - we validated it above
                status: newStatus, 
                updatedAt: new Date() 
            })
            .where(
                and(
                    eq(outreach.id, id),
                    eq(outreach.userId, session.user.id)
                )
            );
        
        revalidatePath("/dashboard");
        return { success: true };
    } catch (error) {
        console.error("Failed to update status:", error);
        return { error: "Database error" };
    }
}

export async function deleteOutreach(id: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };

    try {
        await db.delete(outreach)
            .where(
                and(
                    eq(outreach.id, id),
                    eq(outreach.userId, session.user.id)
                )
            );
        
        revalidatePath("/dashboard");
        return { success: true };
    } catch (error) {
        console.error("Failed to delete outreach:", error);
        return { error: "Database error" };
    }
}

export async function updateOutreachNotes(id: string, notes: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };

    try {
        await db.update(outreach)
            .set({ 
                notes, 
                updatedAt: new Date() 
            })
            .where(
                and(
                    eq(outreach.id, id),
                    eq(outreach.userId, session.user.id)
                )
            );
        
        revalidatePath("/dashboard");
        revalidatePath(`/outreach/${id}`);
        return { success: true };
    } catch (error) {
        console.error("Failed to update notes:", error);
        return { error: "Database error" };
    }
}

export async function getCompanyContacts(companyName: string) {
    const session = await auth();
    if (!session?.user?.id) return [];

    return await db.query.outreach.findMany({
        where: and(
            eq(outreach.userId, session.user.id),
            eq(outreach.companyName, companyName)
        ),
        orderBy: [desc(outreach.createdAt)]
    });
}

export async function addContactToCompanyAction(outreachId: string, formData: FormData) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };

    const personName = formData.get("personName") as string;
    const personRole = formData.get("personRole") as any;
    const contactMethod = formData.get("contactMethod") as any;
    const rawEmail = formData.get("emailAddress") as string;
    const rawLinkedin = formData.get("linkedinProfileUrl") as string;

    const emailAddress = rawEmail === "" ? null : rawEmail;
    const linkedinProfileUrl = rawLinkedin === "" ? null : rawLinkedin;

    if (!personName || !personRole || !contactMethod) {
        return { error: "Required fields missing" };
    }

    // Get the base outreach info
    const baseOutreach = await db.query.outreach.findFirst({
        where: and(
            eq(outreach.id, outreachId),
            eq(outreach.userId, session.user.id)
        )
    });

    if (!baseOutreach) return { error: "Outreach not found" };

    try {
        await db.insert(outreach).values({
            userId: session.user.id,
            companyName: baseOutreach.companyName,
            companyLink: baseOutreach.companyLink,
            roleTargeted: baseOutreach.roleTargeted,
            personName,
            personRole,
            contactMethod,
            emailAddress: emailAddress || null,
            linkedinProfileUrl: linkedinProfileUrl || null,
            status: "DRAFT", // Default to draft for new contacts added this way
            messageSentAt: new Date(),
            followUpDueAt: addDays(new Date(), 5),
            notes: "",
        });
    } catch (error) {
        console.error("Failed to add contact:", error);
        return { error: "Database error" };
    }

    revalidatePath("/dashboard");
    revalidatePath(`/outreach/${outreachId}`);
    return { success: true };
}

export async function updateOutreachAction(data: any) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };

    const parsed = editOutreachSchema.safeParse(data);
    if (!parsed.success) {
        return { 
            error: "Validation failed", 
            details: parsed.error.flatten().fieldErrors as any 
        };
    }

    const { id, ...updateData } = parsed.data;

    try {
        await db.update(outreach)
            .set({
                ...updateData,
                updatedAt: new Date(),
            })
            .where(
                and(
                    eq(outreach.id, id),
                    eq(outreach.userId, session.user.id)
                )
            );

        revalidatePath("/dashboard");
        revalidatePath(`/outreach/${id}`);
        return { success: true };
    } catch (error) {
        console.error("Failed to update outreach:", error);
        return { error: "Database error" };
    }
}
