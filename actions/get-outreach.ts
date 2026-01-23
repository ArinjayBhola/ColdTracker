"use server";

import { db } from "@/db";
import { outreach } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";

export async function getOutreachById(id: string) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const item = await db.query.outreach.findFirst({
    where: and(
        eq(outreach.id, id),
        eq(outreach.userId, session.user.id)
    )
  });

  return item || null;
}
