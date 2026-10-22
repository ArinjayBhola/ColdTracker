"use server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, sql } from "drizzle-orm";
import { parsePreferences, preferencesSchema } from "@/lib/preferences";

export async function getAccountPreferences() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await db.query.users.findFirst({ where: eq(users.id, session.user.id), columns: { preferences: true } });
  return user ? { preferences: user.preferences ? parsePreferences(user.preferences) : null } : null;
}

export async function saveAccountPreferences(input: unknown) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Please sign in again.");
  const patch = preferencesSchema.partial().strict().parse(input);
  await db.update(users).set({ preferences: sql`coalesce(${users.preferences}, '{}'::jsonb) || ${JSON.stringify(patch)}::jsonb` }).where(eq(users.id, session.user.id));
  return { success: true };
}
