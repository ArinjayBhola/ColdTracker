"use server";

import { db } from "@/db";
import { outreach } from "@/db/schema";
import { outreachFormSchema, STATUSES } from "@/lib/validations";
import { auth } from "@/lib/auth";
import { eq, desc, asc, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
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
    contacts: contacts.map((c, idx) => ({
      ...c,
      messageSentAt: formData.get(`contacts.${idx}.messageSentAt`) || formData.get("messageSentAt"),
      followUpDueAt: formData.get(`contacts.${idx}.followUpDueAt`) || formData.get("followUpDueAt"),
    })),
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
  const firstContact = validatedContacts[0];
  const sentAt = firstContact?.messageSentAt || now;
  const followUpDueAt = firstContact?.followUpDueAt || addDays(sentAt, 5);

  try {
    // Check if company already exists for this user
    const existing = await db.query.outreach.findFirst({
      where: and(
        eq(outreach.userId, session.user.id),
        eq(outreach.companyName, companyName)
      )
    });

    if (existing) {
      // Append new contacts to existing ones
      const updatedContacts = [...existing.contacts, ...validatedContacts];
      await db.update(outreach)
        .set({
          contacts: updatedContacts,
          roleTargeted, // Update role targeted if changed?
          companyLink: companyLink || existing.companyLink,
          notes: notes || existing.notes,
          status: status || existing.status,
          updatedAt: new Date(),
        })
        .where(eq(outreach.id, existing.id));
      
      revalidatePath("/dashboard");
      return { success: true, outreachId: existing.id };
    } else {
      // Create new outreach entry
      const result = await db.insert(outreach).values({
        userId: session.user.id,
        companyName,
        roleTargeted,
        companyLink: companyLink || null,
        contacts: validatedContacts,
        status: status || "SENT", 
        notes,
        createdAt: now,
        updatedAt: now,
      }).returning({ id: outreach.id });

      revalidatePath("/dashboard");
      return { success: true, outreachId: result[0]?.id };
    }
  } catch (error) {
    console.error("Failed to create outreach:", error);
    return { error: "Database error" };
  }
}

export async function getOutreachItems() {
  const session = await auth();
  if (!session?.user?.id) return [];

  // Sort by messageSentAt from the first contact in JSONB (latest first)
  return await db.query.outreach.findMany({
    where: eq(outreach.userId, session.user.id),
    orderBy: [desc(sql`${outreach.contacts}->0->>'messageSentAt'`)], 
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
    orderBy: [desc(sql`${outreach.contacts}->0->>'messageSentAt'`)],
  });

  return items.map(item => ({
    id: item.id,
    companyName: item.companyName,
    companyLink: item.companyLink,
    roleTargeted: item.roleTargeted,
    personName: item.contacts[0]?.personName || "No Contact",
    personRole: item.contacts[0]?.personRole || "N/A",
    status: item.status,
    messageSentAt: item.contacts[0]?.messageSentAt, 
    followUpDueAt: item.contacts[0]?.followUpDueAt,
    followUpSentAt: item.followUpSentAt,
    contactMethod: item.contacts[0]?.contactMethod || "EMAIL",
    contactCount: item.contacts.length,
    contacts: item.contacts,
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
    const personRole = formData.get("personRole") as string;
    const contactMethod = formData.get("contactMethod") as any;
    const rawEmail = formData.get("emailAddress") as string;
    const rawLinkedin = formData.get("linkedinProfileUrl") as string;

    const emailAddress = rawEmail === "" ? null : rawEmail;
    const linkedinProfileUrl = rawLinkedin === "" ? null : rawLinkedin;

    if (!personName || !personRole || !contactMethod) {
        return { error: "Required fields missing" };
    }

    // Get the base outreach info
    const existing = await db.query.outreach.findFirst({
        where: and(
            eq(outreach.id, outreachId),
            eq(outreach.userId, session.user.id)
        )
    });

    if (!existing) return { error: "Outreach not found" };

    try {
        const newContact = {
            personName,
            personRole,
            contactMethod,
            emailAddress,
            linkedinProfileUrl,
            messageSentAt: new Date(),
            followUpDueAt: addDays(new Date(), 5),
        };

        await db.update(outreach)
            .set({
                contacts: [...existing.contacts, newContact],
                updatedAt: new Date(),
            })
            .where(eq(outreach.id, outreachId));

    } catch (error) {
        console.error("Failed to add contact:", error);
        return { error: "Database error" };
    }

    revalidatePath("/dashboard");
    revalidatePath(`/outreach/${outreachId}`);
    return { success: true };
}
export async function updateOutreachInlineAction(outreachId: string, contactIndex: number, data: Record<string, string>) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };

    try {
        const existing = await db.query.outreach.findFirst({
            where: and(
                eq(outreach.id, outreachId),
                eq(outreach.userId, session.user.id)
            )
        });

        if (!existing) return { error: "Outreach not found" };

        const updatedContacts = [...existing.contacts];
        if (updatedContacts[contactIndex]) {
            updatedContacts[contactIndex] = {
                ...updatedContacts[contactIndex],
                contactMethod: (data.contactMethod as any) || updatedContacts[contactIndex].contactMethod,
                emailAddress: data.email || (data.email === "" ? null : updatedContacts[contactIndex].emailAddress),
                linkedinProfileUrl: data.linkedin || (data.linkedin === "" ? null : updatedContacts[contactIndex].linkedinProfileUrl),
            };
        }

        await db.update(outreach)
            .set({
                roleTargeted: data.roleTargeted || existing.roleTargeted,
                companyLink: data.companyLink || (data.companyLink === "" ? null : existing.companyLink),
                contacts: updatedContacts,
                updatedAt: new Date(),
            })
            .where(eq(outreach.id, outreachId));

        revalidatePath("/dashboard");
        revalidatePath(`/outreach/${outreachId}`);
        return { success: true };
    } catch (error) {
        console.error("Failed to update outreach inline:", error);
        return { error: "Database error" };
    }
}

export async function deleteContactAction(outreachId: string, contactIndex: number) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };

    try {
        const existing = await db.query.outreach.findFirst({
            where: and(
                eq(outreach.id, outreachId),
                eq(outreach.userId, session.user.id)
            )
        });

        if (!existing) return { error: "Outreach not found" };

        const updatedContacts = [...existing.contacts];
        if (updatedContacts.length <= 1) {
            return { error: "Cannot delete the last contact. Add another contact first or delete the entire company outreach." };
        }

        if (contactIndex < 0 || contactIndex >= updatedContacts.length) {
            return { error: "Invalid contact selection" };
        }

        updatedContacts.splice(contactIndex, 1);

        await db.update(outreach)
            .set({
                contacts: updatedContacts,
                updatedAt: new Date(),
            })
            .where(eq(outreach.id, outreachId));

        revalidatePath("/dashboard");
        revalidatePath(`/outreach/${outreachId}`);
        return { success: true };
    } catch (error) {
        console.error("Failed to delete contact:", error);
        return { error: "Database error" };
    }
}
