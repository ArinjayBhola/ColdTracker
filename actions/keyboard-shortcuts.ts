"use server";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { defaultShortcutPreferences, shortcutPreferencesSchema, type ShortcutPreferences } from "@/lib/keyboard-shortcuts";

export async function getKeyboardShortcuts() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Please sign in again.");
  const [user] = await db.select({ preferences: users.keyboardShortcuts }).from(users).where(eq(users.id, session.user.id));
  if (!user) throw new Error("Account not found.");
  const parsed = shortcutPreferencesSchema.safeParse(user.preferences);
  return parsed.success ? parsed.data : defaultShortcutPreferences;
}

export async function saveKeyboardShortcuts(preferences: ShortcutPreferences) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Please sign in again." };
  const parsed = shortcutPreferencesSchema.safeParse(preferences);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    const updated = await db.update(users).set({ keyboardShortcuts: parsed.data })
      .where(eq(users.id, session.user.id)).returning({ id: users.id });
    if (!updated.length) return { error: "Account not found." };
    return { preferences: parsed.data };
  } catch {
    return { error: "Could not save shortcuts. Please try again." };
  }
}
