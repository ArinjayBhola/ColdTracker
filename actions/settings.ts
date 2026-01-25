"use server";

import { db } from "@/db";
import { outreach, users } from "@/db/schema";
import { hash, compare } from "bcryptjs";
import { eq, count } from "drizzle-orm";
import { z } from "zod";
import { auth, signOut } from "@/lib/auth";
import { revalidatePath } from "next/cache";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your new password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const updateProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  image: z.string().url("Invalid image URL").optional().or(z.literal("")),
});

export async function updateProfileAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const name = formData.get("name") as string;
  const image = formData.get("image") as string;

  const parsed = updateProfileSchema.safeParse({ name, image });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  await db.update(users).set({ 
    name: parsed.data.name,
    image: parsed.data.image || null,
  }).where(eq(users.id, session.user.id));

  revalidatePath("/settings");
  return { success: "Profile updated successfully" };
}

export async function changePasswordAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const currentPassword = formData.get("currentPassword") as string;
  const newPassword = formData.get("newPassword") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  const parsed = changePasswordSchema.safeParse({
    currentPassword,
    newPassword,
    confirmPassword,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  if (!user || !user.password) {
    return { error: "User not found or using OAuth" };
  }

  const passwordsMatch = await compare(currentPassword, user.password);
  if (!passwordsMatch) {
    return { error: "Incorrect current password" };
  }

  const hashedPassword = await hash(newPassword, 10);
  await db.update(users).set({ password: hashedPassword }).where(eq(users.id, session.user.id));

  return { success: "Password updated successfully" };
}

export async function getOutreachStatsAction() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const result = await db
    .select({ total: count() })
    .from(outreach)
    .where(eq(outreach.userId, session.user.id));

  return { count: result[0]?.total || 0 };
}

export async function deleteAccountAction(confirmText: string) {
  if (confirmText.trim().toUpperCase() !== "DELETE") {
    return { error: "Invalid confirmation text" };
  }

  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    // Delete user - Cascade will handle outreach, accounts, sessions
    await db.delete(users).where(eq(users.id, session.user.id));
    return { success: true };
  } catch (error) {
    console.error("Delete account error:", error);
    return { error: "Failed to delete account data" };
  }
}
