"use server";

import { db } from "@/db";
import { startups, startupEmployees, startupTracking } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, sql, inArray, ilike, or } from "drizzle-orm";
import { revalidatePath, revalidateTag, unstable_cache as cache } from "next/cache";

// Cache for 24 hours for static startup data
const getCachedStartups = cache(
  async (search: string) => {
    const searchTerm = search.trim();
    const searchWhere = searchTerm
      ? or(
          ilike(startups.name, `%${searchTerm}%`),
          ilike(startups.description, `%${searchTerm}%`),
          ilike(startups.sector, `%${searchTerm}%`),
        )
      : undefined;
    const [items, countResult] = await Promise.all([
      db.query.startups.findMany({
        where: searchWhere,
        orderBy: (startups, { desc }) => [desc(startups.createdAt)],
      }),
      db.select({ count: sql<number>`count(*)` }).from(startups).where(searchWhere),
    ]);

    const count = countResult[0].count;

    return { items, totalCount: Number(count) };
  },
  ["startups-list"],
  { revalidate: 86400, tags: ["startups"] }
);

export async function getStartupsAction(page: number = 1, pageSize: number = 20, search: string = "", sort: string = "NOT_OUTREACHED") {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const safePage = Math.max(1, Math.floor(page));
  const safePageSize = Math.min(50, Math.max(1, Math.floor(pageSize)));

  // Fetch static data from cache
  const { items: allItems, totalCount } = await getCachedStartups(search);

  // Fetch dynamic tracking data for this user
  const startupIds = allItems.map(i => i.id);
  const trackingData = startupIds.length > 0 ? await db.query.startupTracking.findMany({
    where: and(
      eq(startupTracking.userId, session.user.id),
      inArray(startupTracking.startupId, startupIds)
    ),
  }) : [];

  // Merge tracking data into items
  const trackingByStartup = new Map(trackingData.map((tracking) => [tracking.startupId, tracking]));
  const itemsWithTracking = allItems.map(item => ({
    ...item,
    tracking: trackingByStartup.has(item.id) ? [trackingByStartup.get(item.id)!] : []
  }));

  const normalizedSort = ["NOT_OUTREACHED", "OUTREACHED", "A_Z", "Z_A"].includes(sort)
    ? sort
    : "NOT_OUTREACHED";

  itemsWithTracking.sort((a, b) => {
    const aOutreached = a.tracking.some(t => t.outreachDone);
    const bOutreached = b.tracking.some(t => t.outreachDone);

    if (normalizedSort === "NOT_OUTREACHED" && aOutreached !== bOutreached) {
      return aOutreached ? 1 : -1;
    }
    if (normalizedSort === "OUTREACHED" && aOutreached !== bOutreached) {
      return aOutreached ? -1 : 1;
    }

    const nameOrder = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    return normalizedSort === "Z_A" ? -nameOrder : nameOrder;
  });

  const offset = (safePage - 1) * safePageSize;
  const pageItems = itemsWithTracking.slice(offset, offset + safePageSize);
  const pageIds = pageItems.map((item) => item.id);
  const employees = pageIds.length > 0
    ? await db.query.startupEmployees.findMany({ where: inArray(startupEmployees.startupId, pageIds) })
    : [];
  const employeesByStartup = new Map<string, typeof employees>();
  for (const employee of employees) {
    const existing = employeesByStartup.get(employee.startupId) || [];
    existing.push(employee);
    employeesByStartup.set(employee.startupId, existing);
  }
  const items = pageItems.map((item) => ({
    ...item,
    employees: employeesByStartup.get(item.id) || [],
  }));

  return {
    items,
    totalCount,
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

export async function deleteStartupAction(startupId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db.delete(startups).where(eq(startups.id, startupId));
  revalidateTag("startups", "max");
  revalidatePath("/startups");
  revalidatePath(`/startups/${startupId}`);

  return { success: true };
}


