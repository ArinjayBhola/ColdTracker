"use server";

import { db } from "@/db";
import { emailTemplates } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getTemplatesAction() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const templates = await db.query.emailTemplates.findMany({
      where: eq(emailTemplates.userId, session.user.id),
      orderBy: (templates, { desc }) => [desc(templates.createdAt)],
    });

    return { success: true, data: templates };
  } catch (error) {
    console.error("Failed to get templates:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to get templates" };
  }
}

export async function createTemplateAction(data: { name: string; subjectTemplate: string; bodyTemplate: string }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    if (!data.name || !data.subjectTemplate || !data.bodyTemplate) {
      return { success: false, error: "All fields are required" };
    }

    const newTemplate = await db.insert(emailTemplates).values({
      userId: session.user.id,
      name: data.name,
      subjectTemplate: data.subjectTemplate,
      bodyTemplate: data.bodyTemplate,
    }).returning();

    revalidatePath("/templates");
    return { success: true, data: newTemplate[0] };
  } catch (error) {
    console.error("Failed to create template:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to create template" };
  }
}

export async function updateTemplateAction(id: string, data: { name: string; subjectTemplate: string; bodyTemplate: string }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const updated = await db
      .update(emailTemplates)
      .set({
        name: data.name,
        subjectTemplate: data.subjectTemplate,
        bodyTemplate: data.bodyTemplate,
        updatedAt: new Date(),
      })
      .where(eq(emailTemplates.id, id))
      .returning();

    revalidatePath("/templates");
    return { success: true, data: updated[0] };
  } catch (error) {
    console.error("Failed to update template:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to update template" };
  }
}

export async function deleteTemplateAction(id: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    await db.delete(emailTemplates).where(eq(emailTemplates.id, id));

    revalidatePath("/templates");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete template:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete template" };
  }
}

export async function massDeleteTemplatesAction(ids: string[]) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    if (!ids || ids.length === 0) {
      return { success: false, error: "No templates selected" };
    }

    await db.delete(emailTemplates).where(inArray(emailTemplates.id, ids));

    revalidatePath("/templates");
    return { success: true };
  } catch (error) {
    console.error("Failed to mass delete templates:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to mass delete templates" };
  }
}
