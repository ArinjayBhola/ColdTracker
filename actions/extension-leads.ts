"use server";

import { db } from "@/db";
import { extensionLeads, outreach } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { addDays } from "date-fns";
import { PromoteLeadValues } from "@/lib/validations";

export async function getExtensionLeadsAction() {
  const session = await auth();
  if (!session?.user?.id) return [];

  return await db.query.extensionLeads.findMany({
    where: eq(extensionLeads.userId, session.user.id),
    orderBy: [desc(extensionLeads.createdAt)],
  });
}

export async function deleteExtensionLeadAction(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  try {
    await db.delete(extensionLeads).where(
      and(
        eq(extensionLeads.id, id),
        eq(extensionLeads.userId, session.user.id)
      )
    );
    revalidatePath("/dashboard/extension-leads");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete lead:", error);
    return { error: "Database error" };
  }
}

export async function promoteLeadToOutreachAction(id: string, values: PromoteLeadValues) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const { companyName, companyLink, roleTargeted, contacts, notes } = values;

  try {
    let newOutreachId = "";

    await db.transaction(async (tx) => {
      // 1. Check if company already exists for this user
      const existing = await tx.query.outreach.findFirst({
        where: and(
          eq(outreach.userId, session.user.id),
          eq(outreach.companyName, companyName)
        ),
      });

      // Prepare contacts for JSONB storage (ensure dates are strings or handled by DB)
      const formattedContacts = contacts.map((c: any) => ({
        ...c,
        createdAt: new Date().toISOString(),
      }));

      if (existing) {
        // Update existing entry
        const updatedContacts = Array.isArray(existing.contacts) 
          ? [...(existing.contacts as any[]), ...formattedContacts]
          : [...formattedContacts];

        await tx.update(outreach)
          .set({
            contacts: updatedContacts,
            updatedAt: new Date(),
          })
          .where(eq(outreach.id, existing.id));
        
        newOutreachId = existing.id;
      } else {
        // Create new entry
        const [newOutreach] = await tx.insert(outreach).values({
          userId: session.user.id,
          companyName,
          companyLink: companyLink || null,
          roleTargeted,
          contacts: formattedContacts,
          status: "DRAFT",
          notes: notes || "",
        }).returning({ id: outreach.id });

        newOutreachId = newOutreach.id;
      }

      // 2. Delete from extensionLeads
      await tx.delete(extensionLeads).where(
        and(
          eq(extensionLeads.id, id),
          eq(extensionLeads.userId, session.user.id)
        )
      );
    });

    revalidatePath("/dashboard/extension-leads");
    revalidatePath("/dashboard");
    return { success: true, outreachId: newOutreachId };
  } catch (error) {
    console.error("Failed to promote lead:", error);
    return { error: "Database error" };
  }
}

export async function getExtensionLeadByIdAction(id: string) {
  const session = await auth();
  if (!session?.user?.id) return null;

  return await db.query.extensionLeads.findFirst({
    where: and(
      eq(extensionLeads.id, id),
      eq(extensionLeads.userId, session.user.id)
    ),
  });
}

export async function updateExtensionLeadAction(id: string, values: {
  personName?: string;
  companyName?: string;
  companyUrl?: string;
  position?: string;
  personRole?: any;
  emailAddress?: string | null;
  outreachDate?: Date;
  followUpDate?: Date | null;
  notes?: string;
  profileUrl?: string;
  contactMethod?: any;
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  try {
    await db.update(extensionLeads)
      .set({
        ...values,
        // Ensure nulls are handled correctly if coming from undefined in some cases
      } as any)
      .where(
        and(
          eq(extensionLeads.id, id),
          eq(extensionLeads.userId, session.user.id)
        )
      );
    revalidatePath(`/dashboard/extension-leads/${id}`);
    revalidatePath("/dashboard/extension-leads");
    return { success: true };
  } catch (error) {
    console.error("Failed to update lead:", error);
    return { error: "Database error" };
  }
}

export async function getCompanyExtensionLeads(companyName: string) {
    const session = await auth();
    if (!session?.user?.id) return [];

    return await db.query.extensionLeads.findMany({
        where: and(
            eq(extensionLeads.userId, session.user.id),
            eq(extensionLeads.companyName, companyName)
        ),
        orderBy: [desc(extensionLeads.createdAt)]
    });
}

export async function addContactToExtensionLeadAction(leadId: string, formData: FormData) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };

    const personName = formData.get("personName") as string;
    const personRole = formData.get("personRole") as any;
    const emailAddressStr = formData.get("emailAddress") as string;
    const linkedinProfileUrl = formData.get("linkedinProfileUrl") as string;

    const emailAddress = emailAddressStr === "" ? null : emailAddressStr;

    if (!personName || !personRole) {
        return { error: "Required fields missing" };
    }

    // Get the base lead info
    const baseLead = await db.query.extensionLeads.findFirst({
        where: and(
            eq(extensionLeads.id, leadId),
            eq(extensionLeads.userId, session.user.id)
        )
    });

    if (!baseLead) return { error: "Lead not found" };

    try {
        await db.insert(extensionLeads).values({
            userId: session.user.id,
            companyName: baseLead.companyName,
            companyUrl: baseLead.companyUrl,
            position: baseLead.position,
            profileUrl: linkedinProfileUrl || "#",
            personName,
            personRole,
            emailAddress: emailAddress || null,
            outreachDate: baseLead.outreachDate,
            followUpDate: baseLead.followUpDate,
            notes: "",
        });
    } catch (error) {
        console.error("Failed to add contact:", error);
        return { error: "Database error" };
    }

    revalidatePath(`/dashboard/extension-leads/${leadId}`);
    revalidatePath("/dashboard/extension-leads");
    return { success: true };
}
