"use server";

import { db } from "@/db";
import { outreach, users } from "@/db/schema";
import { sendDailyOutreachReminder } from "@/lib/resend";
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

export async function updateNotificationSettingsAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const notificationEmail = formData.get("notificationEmail") as string;
  const receiveNotifications = formData.get("receiveNotifications") === "true";

  try {
    const updateData: any = {
      receiveNotifications,
    };

    if (notificationEmail) {
      const emailParsed = z.string().email().safeParse(notificationEmail);
      if (!emailParsed.success) {
        return { error: "Invalid email address" };
      }
      updateData.notificationEmail = notificationEmail;
    } else {
      updateData.notificationEmail = null;
    }

    await db.update(users).set(updateData).where(eq(users.id, session.user.id));

    revalidatePath("/settings");
    return { success: "Notification settings updated successfully" };
  } catch (error) {
    console.error("Update notification settings error:", error);
    return { error: "Failed to update notification settings" };
  }
}

export async function sendTestEmailAction() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  if (!user) return { error: "User not found" };

  const emailTo = user.notificationEmail || user.email;
  if (!emailTo) return { error: "No email address found" };

  const result = await sendDailyOutreachReminder(emailTo, user.name || "User");
  
  if (result.success) {
    return { success: "Test email sent! Check your inbox." };
  } else {
    return { error: "Failed to send email. Check your RESEND_API_KEY." };
  }
}
