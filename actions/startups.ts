"use server";

import { db } from "@/db";
import { startups, startupTracking } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, sql } from "drizzle-orm";
import { revalidatePath, unstable_cache as cache, revalidateTag } from "next/cache";

// Cache for 24 hours for static startup data
const getCachedStartups = cache(
  async (page: number, pageSize: number) => {
    const offset = (page - 1) * pageSize;
    const items = await db.query.startups.findMany({
      limit: pageSize,
      offset: offset,
      with: {
        employees: true,
      },
      orderBy: (startups, { desc }) => [desc(startups.createdAt)],
    });

    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(startups);

    const sectorResults = await db.select({
      sector: startups.sector,
      count: sql<number>`count(*)`
    }).from(startups).groupBy(startups.sector);

    const sectorCounts: Record<string, number> = {};
    sectorResults.forEach(r => {
      if (r.sector) sectorCounts[r.sector] = r.count;
    });

    return { items, totalCount: Number(count), sectorCounts };
  },
  ["startups-list"],
  { revalidate: 86400, tags: ["startups"] }
);

export async function getStartupsAction(page: number = 1, pageSize: number = 20) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Fetch static data from cache
  const { items, totalCount, sectorCounts } = await getCachedStartups(page, pageSize);

  // Fetch dynamic tracking data for this user
  const startupIds = items.map(i => i.id);
  const trackingData = await db.query.startupTracking.findMany({
    where: and(
      eq(startupTracking.userId, session.user.id),
      sql`${startupTracking.startupId} IN ${startupIds}`
    ),
  });

  // Merge tracking data into items
  const itemsWithTracking = items.map(item => ({
    ...item,
    tracking: trackingData.filter(t => t.startupId === item.id)
  }));

  return {
    items: itemsWithTracking,
    totalCount,
    sectorCounts,
  };
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


