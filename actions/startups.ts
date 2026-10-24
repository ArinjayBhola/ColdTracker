"use server";

import { db } from "@/db";
import { startups, startupEmployees, startupTracking } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, sql, inArray, ilike, or, asc, desc, getTableColumns } from "drizzle-orm";
import { revalidatePath, revalidateTag, unstable_cache as cache } from "next/cache";

// Only the public catalog count is shared; personalized rows are queried per user.
const getCachedStartupCount = cache(async (search: string) => {
  const where = startupSearch(search);
  const [result] = await db.select({ count: sql<number>`count(*)` }).from(startups).where(where);
  return Number(result.count);
}, ["startups-count"], { revalidate: 86400, tags: ["startups"] });

function startupSearch(search: string) {
  const value = search.trim().slice(0, 200);
  return value ? or(ilike(startups.name, `%${value}%`), ilike(startups.description, `%${value}%`), ilike(startups.sector, `%${value}%`)) : undefined;
}

export async function getStartupsAction(page = 1, pageSize = 20, search = "", sort = "NOT_OUTREACHED") {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const safePage = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
  const safePageSize = Number.isFinite(pageSize) ? Math.min(50, Math.max(1, Math.floor(pageSize))) : 20;
  const normalizedSort = ["NOT_OUTREACHED", "OUTREACHED", "A_Z", "Z_A"].includes(sort) ? sort : "NOT_OUTREACHED";
  const name = sql`lower(${startups.name})`;
  const contacted = sql`coalesce(${startupTracking.outreachDone}, false)`;
  const ordering = normalizedSort === "OUTREACHED" ? [desc(contacted), asc(name)]
    : normalizedSort === "NOT_OUTREACHED" ? [asc(contacted), asc(name)]
    : normalizedSort === "Z_A" ? [desc(name)] : [asc(name)];
  const [rows, totalCount] = await Promise.all([
    db.select({ startup: getTableColumns(startups), tracking: getTableColumns(startupTracking) })
      .from(startups).leftJoin(startupTracking, and(eq(startupTracking.startupId, startups.id), eq(startupTracking.userId, session.user.id)))
      .where(startupSearch(search)).orderBy(...ordering, asc(startups.id))
      .limit(safePageSize).offset((safePage - 1) * safePageSize),
    getCachedStartupCount(search),
  ]);
  const ids = rows.map(row => row.startup.id);
  const employees = ids.length ? await db.query.startupEmployees.findMany({ where: inArray(startupEmployees.startupId, ids) }) : [];
  const employeesByStartup = new Map<string, typeof employees>();
  for (const employee of employees) {
    const list = employeesByStartup.get(employee.startupId) ?? [];
    list.push(employee); employeesByStartup.set(employee.startupId, list);
  }
  return { items: rows.map(row => ({ ...row.startup, tracking: row.tracking ? [row.tracking] : [], employees: employeesByStartup.get(row.startup.id) ?? [] })), totalCount };
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


