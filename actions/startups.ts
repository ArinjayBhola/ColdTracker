"use server";

import { db } from "@/db";
import { startups, startupTracking } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, inArray } from "drizzle-orm";
import { saveStartupRecord } from "@/lib/startup-save";
import { readStartupPage } from "@/lib/startup-query";
import { startupFormSchema, normalizeStartupName } from "@/lib/startup-validation";
import { revalidatePath, revalidateTag, updateTag, unstable_cache as cache } from "next/cache";
import { z } from "zod";

export async function saveStartupAction(input: unknown, startupId?: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, error: "Please sign in to save startups." };
  if (startupId !== undefined && !z.uuid().safeParse(startupId).success) return { success: false as const, error: "Invalid startup ID." };
  const parsed = startupFormSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, error: parsed.error.issues.map(issue => `${issue.path.join(".")}: ${issue.message}`).join("; ") };
  if (!normalizeStartupName(parsed.data.name)) return { success: false as const, error: "Startup name must contain a letter or number." };
  let savedId: string;
  try {
    savedId = await saveStartupRecord(parsed.data, startupId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const expected = ["A startup with", "This startup no longer", "Invalid team member"];
    return { success: false as const, error: expected.some(prefix => message.startsWith(prefix)) ? message : "Unable to save startup. Please try again." };
  }
  updateTag("startups");
  revalidatePath("/startups");
  revalidatePath(`/startups/${savedId}`);
  return { success: true as const, id: savedId };
}

export async function getStartupsAction(page = 1, pageSize = 20, search = "", sort = "NOT_OUTREACHED", teamSize = "all") {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return readStartupPage(session.user.id, page, pageSize, search, sort, teamSize);
}

export async function toggleStartupOutreachAction(startupId: string, outreachDone: boolean) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const existing = await db.query.startupTracking.findFirst({
    where: and(
      eq(startupTracking.userId, session.user.id),
      eq(startupTracking.startupId, startupId)
    ),
  });

  if (existing) {
    await db.update(startupTracking)
      .set({ outreachDone, updatedAt: new Date() })
      .where(eq(startupTracking.id, existing.id));
  } else {
    await db.insert(startupTracking).values({
      userId: session.user.id,
      startupId: startupId,
      outreachDone,
    });
  }

  revalidatePath("/startups");
  return { success: true };
}

export async function updateStartupFollowUpAction(startupId: string, followUpDate: Date | null) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const existing = await db.query.startupTracking.findFirst({
    where: and(
      eq(startupTracking.userId, session.user.id),
      eq(startupTracking.startupId, startupId)
    ),
  });

  if (existing) {
    await db.update(startupTracking)
      .set({ followUpDate, updatedAt: new Date() })
      .where(eq(startupTracking.id, existing.id));
  } else {
    await db.insert(startupTracking).values({
      userId: session.user.id,
      startupId: startupId,
      followUpDate,
    });
  }

  revalidatePath("/startups");
  return { success: true };
}

export async function updateStartupNotesAction(startupId: string, notes: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const existing = await db.query.startupTracking.findFirst({
    where: and(
      eq(startupTracking.userId, session.user.id),
      eq(startupTracking.startupId, startupId)
    ),
  });

  if (existing) {
    await db.update(startupTracking)
      .set({ notes, updatedAt: new Date() })
      .where(eq(startupTracking.id, existing.id));
  } else {
    await db.insert(startupTracking).values({
      userId: session.user.id,
      startupId: startupId,
      notes,
    });
  }

  revalidatePath("/startups");
  return { success: true };
}

// Cache for 24 hours for individual startup static data
const getCachedStartupById = cache(
  async (id: string) => {
    return await db.query.startups.findFirst({
      where: eq(startups.id, id),
      with: {
        employees: true,
      },
    });
  },
  ["startup-detail"],
  { revalidate: 86400, tags: ["startups"] }
);

export async function getStartupByIdAction(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const startup = await getCachedStartupById(id);
  if (!startup) return null;

  const tracking = await db.query.startupTracking.findMany({
    where: and(
      eq(startupTracking.userId, session.user.id),
      eq(startupTracking.startupId, id)
    ),
  });

  return { ...startup, tracking };
}

export async function deleteStartupAction(startupId: string) {
  return deleteStartupsAction([startupId]);
}

export async function deleteStartupsAction(startupIds: string[]) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (!Array.isArray(startupIds) || startupIds.length === 0 || startupIds.length > 50 ||
    startupIds.some(id => typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))) {
    throw new Error("Select between 1 and 50 valid startups");
  }
  const ids = [...new Set(startupIds)];
  const deleted = await db.delete(startups).where(inArray(startups.id, ids)).returning({ id: startups.id });
  revalidateTag("startups", "max");
  revalidatePath("/startups");
  for (const id of ids) revalidatePath(`/startups/${id}`);

  return { success: true, deletedCount: deleted.length };
}


