"use server";

import { db } from "@/db";
import { outreach } from "@/db/schema";
import { outreachFormSchema } from "@/lib/validations";
import { auth } from "@/lib/auth";
import { eq, desc, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addDays } from "date-fns";
export type ActionState = {
  error?: string;
  details?: Record<string, string[]>;
};

export async function createOutreachAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const rawData = Object.fromEntries(formData.entries());
  const parsed = outreachFormSchema.safeParse(rawData);
  
  if (!parsed.success) {
    return { 
        error: "Invalid data", 
        details: parsed.error.flatten().fieldErrors 
    };
  }

  const {
    companyName,
    roleTargeted,
    personName,
    personRole,
    contactMethod,
    companyLink,
    emailAddress,
    linkedinProfileUrl,
    notes,
    status
  } = parsed.data;

  // Auto-calculate follow-up date (3 days from now) if not provided
  const now = new Date();
  const followUpDueAt = addDays(now, 3);

  try {
    await db.insert(outreach).values({
      userId: session.user.id,
      companyName,
      roleTargeted,
      personName,
      personRole,
      contactMethod,
      companyLink: companyLink || null,
      emailAddress: emailAddress || null,
      linkedinProfileUrl: linkedinProfileUrl || null,
      status: status || "SENT", // Default to SENT if not specified
      messageSentAt: now, // Assuming created means sent for now, or we can add a 'messageSentAt' field in form
      followUpDueAt,
      notes,
    });
  } catch (error) {
    console.error("Failed to create outreach:", error);
    return { error: "Database error" };
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
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

export async function updateOutreachStatus(id: string, newStatus: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };

    // Validate status
    const statusEnum = outreachFormSchema.shape.status.unwrap();
    // @ts-expect-error - Zod enum parsing is tricky with strings directly
    if (!statusEnum.options.includes(newStatus)) {
        return { error: "Invalid status" };
    }

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
}

export async function deleteOutreach(id: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };

    await db.delete(outreach)
        .where(
            and(
                eq(outreach.id, id),
                eq(outreach.userId, session.user.id)
            )
        );
    
    revalidatePath("/dashboard");
}
