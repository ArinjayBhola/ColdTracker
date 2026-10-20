"use server";

import { db } from "@/db";
import { messageTemplates } from "@/db/schema";
import { auth } from "@/lib/auth";
import { templateSchema, type TemplateInput } from "@/lib/template-validation";
import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export async function getTemplates() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return db.select().from(messageTemplates)
    .where(eq(messageTemplates.userId, session.user.id))
    .orderBy(desc(messageTemplates.pinned), desc(messageTemplates.createdAt));
}

export async function saveTemplate(input: TemplateInput, id?: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Please sign in again." };
  const parsed = templateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (id !== undefined && !z.uuid().safeParse(id).success) return { error: "Invalid template." };
  try {
    const [template] = id
      ? await db.update(messageTemplates).set({ ...parsed.data, updatedAt: new Date() })
        .where(and(eq(messageTemplates.id, id), eq(messageTemplates.userId, session.user.id))).returning()
      : await db.insert(messageTemplates).values({ ...parsed.data, userId: session.user.id }).returning();
    if (!template) return { error: "Template not found." };
    revalidatePath("/templates");
    return { template };
  } catch {
    return { error: "Could not save the template. Please try again." };
  }
}

export async function deleteTemplate(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Please sign in again." };
  if (!z.uuid().safeParse(id).success) return { error: "Invalid template." };
  try {
    const deleted = await db.delete(messageTemplates)
      .where(and(eq(messageTemplates.id, id), eq(messageTemplates.userId, session.user.id)))
      .returning({ id: messageTemplates.id });
    if (!deleted.length) return { error: "Template not found." };
    revalidatePath("/templates");
    return { success: true };
  } catch {
    return { error: "Could not delete the template. Please try again." };
  }
}

export async function setTemplateFavorite(id: string, favorite: boolean) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Please sign in again." };
  if (!z.uuid().safeParse(id).success || typeof favorite !== "boolean") return { error: "Invalid template." };
  try {
    const [template] = await db.update(messageTemplates).set({ favorite, updatedAt: new Date() })
      .where(and(eq(messageTemplates.id, id), eq(messageTemplates.userId, session.user.id))).returning();
    if (!template) return { error: "Template not found." };
    revalidatePath("/templates");
    return { template };
  } catch {
    return { error: "Could not update favorite. Please try again." };
  }
}

export async function setTemplatePinned(id: string, pinned: boolean) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Please sign in again." };
  if (!z.uuid().safeParse(id).success || typeof pinned !== "boolean") return { error: "Invalid template." };
  try {
    const [template] = await db.update(messageTemplates).set({ pinned, updatedAt: new Date() })
      .where(and(eq(messageTemplates.id, id), eq(messageTemplates.userId, session.user.id))).returning();
    if (!template) return { error: "Template not found." };
    revalidatePath("/templates");
    return { template };
  } catch {
    return { error: "Could not update pin. Please try again." };
  }
}
