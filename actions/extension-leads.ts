"use server";

import { db } from "@/db";
import { extensionLeads, outreach } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { addDays } from "date-fns";

export async function getExtensionLeadsAction() {
  const session = await auth();
  if (!session?.user?.id) return [];

  return await db.query.extensionLeads.findMany({
    where: eq(extensionLeads.userId, session.user.id),
    orderBy: [extensionLeads.createdAt],
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

export async function promoteLeadToOutreachAction(id: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const personName = formData.get("personName") as string;
  const companyName = formData.get("companyName") as string;
  const companyLink = formData.get("companyLink") as string;
  const personRole = formData.get("personRole") as string;
  const contactMethod = formData.get("contactMethod") as any;
  const emailAddress = formData.get("emailAddress") as string;
  const linkedinProfileUrl = formData.get("linkedinProfileUrl") as string;
  const position = formData.get("position") as string;
  const roleTargeted = formData.get("roleTargeted") as string;
  const notes = formData.get("notes") as string;

  if (!personName || !companyName || !roleTargeted || !personRole || !contactMethod) {
    return { error: "Required fields missing" };
  }

  try {
    await db.transaction(async (tx) => {
      // 1. Insert into outreach
      await tx.insert(outreach).values({
        userId: session.user.id,
        companyName,
        companyLink: companyLink || null,
        roleTargeted,
        personName,
        personRole,
        contactMethod,
        emailAddress: emailAddress || null,
        linkedinProfileUrl: linkedinProfileUrl || null,
        status: "DRAFT",
        messageSentAt: new Date(),
        followUpDueAt: addDays(new Date(), 5),
        notes: notes || "",
      });

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
    return { success: true };
  } catch (error) {
    console.error("Failed to promote lead:", error);
    return { error: "Database error" };
  }
}
