"use server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { sql } from "drizzle-orm";
import { validTimeZone } from "@/lib/user-calendar";

export async function saveUserTimeZone(timeZone: string) {
  if (!validTimeZone(timeZone)) return;
  const session = await auth();
  if (!session?.user?.id) return;
  await db.update(users).set({ timeZone }).where(sql`${users.id} = ${session.user.id} AND ${users.timeZone} IS DISTINCT FROM ${timeZone}`);
  return { success: true };
}
