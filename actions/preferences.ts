"use server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, sql } from "drizzle-orm";
import { parsePreferences, preferencesSchema } from "@/lib/preferences";
import { cache } from "react";
import { revalidatePath } from "next/cache";

const readAccountPreferences = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await db.query.users.findFirst({ where: eq(users.id, session.user.id), columns: { preferences: true } });
  return user ? { preferences: user.preferences ? parsePreferences(user.preferences) : null } : null;
});

export async function getAccountPreferences() { return readAccountPreferences(); }

export async function saveAccountPreferences(input: unknown) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Please sign in again.");
  const parsed = preferencesSchema.partial().strict().parse(input);
  // Zod applies defaults even inside optional fields; only write requested sections.
  const patch = Object.fromEntries(Object.keys(input as object).map(key => [key, parsed[key as keyof typeof parsed]]));
  await db.update(users).set({ preferences: sql`coalesce(${users.preferences}, '{}'::jsonb) || ${JSON.stringify(patch)}::jsonb` }).where(eq(users.id, session.user.id));
  if ("table" in patch) revalidatePath("/dashboard");
  return { success: true };
}
