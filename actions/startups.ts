"use server";

import { db } from "@/db";
import { startups, startupEmployees, startupTracking } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, sql, inArray, ilike, or, asc, desc, getTableColumns, isNull } from "drizzle-orm";
import { TEAM_SIZE_FILTERS, startupTeamSizeGroup } from "@/lib/startup-team-size";
import { startupFormSchema, normalizeStartupName, startupWebsiteDomain } from "@/lib/startup-validation";
import { revalidatePath, revalidateTag, updateTag, unstable_cache as cache } from "next/cache";
import { z } from "zod";

export async function saveStartupAction(input: unknown, startupId?: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, error: "Please sign in to save startups." };
  if (startupId !== undefined && !z.uuid().safeParse(startupId).success) return { success: false as const, error: "Invalid startup ID." };
  const parsed = startupFormSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, error: parsed.error.issues.map(issue => `${issue.path.join(".")}: ${issue.message}`).join("; ") };
  const { employees, ...company } = parsed.data;
  const normalizedName = normalizeStartupName(company.name);
  if (!normalizedName) return { success: false as const, error: "Startup name must contain a letter or number." };
  const domain = startupWebsiteDomain(company.website);
  let savedId: string;
  try {
    savedId = await db.transaction(async tx => {
      // Serialize catalog writes so simultaneous create/edit requests cannot pass the same duplicate check.
      await tx.execute(sql`LOCK TABLE startups IN SHARE ROW EXCLUSIVE MODE`);
      const catalog = await tx.select({ id: startups.id, name: startups.name, website: startups.website }).from(startups);
      if (startupId && !catalog.some(row => row.id === startupId)) throw new Error("This startup no longer exists.");
      const duplicate = catalog.find(row => row.id !== startupId && (normalizeStartupName(row.name) === normalizedName || (domain && startupWebsiteDomain(row.website) === domain)));
      if (duplicate) throw new Error(`A startup with this name or website already exists: ${duplicate.name}`);
      const values = {
        ...company,
        description: company.description || null, website: company.website || null, logoUrl: company.logoUrl || null,
        sector: company.sector || null, location: company.location || null, teamSize: company.teamSize || null,
        fundingRound: company.fundingRound || null, fundingAmount: company.fundingAmount || null, fundingDate: company.fundingDate || null,
        updatedAt: new Date(),
      };
      const [saved] = startupId
        ? await tx.update(startups).set(values).where(eq(startups.id, startupId)).returning({ id: startups.id })
        : await tx.insert(startups).values(values).returning({ id: startups.id });
      const existingEmployees = await tx.select({ id: startupEmployees.id }).from(startupEmployees).where(eq(startupEmployees.startupId, saved.id));
      const existingIds = new Set(existingEmployees.map(employee => employee.id));
      const submittedIds = employees.flatMap(employee => employee.id ? [employee.id] : []);
      if (new Set(submittedIds).size !== submittedIds.length || submittedIds.some(id => !existingIds.has(id))) throw new Error("Invalid team member selection. Reopen the form and try again.");
      const removedIds = [...existingIds].filter(id => !submittedIds.includes(id));
      if (removedIds.length) await tx.delete(startupEmployees).where(inArray(startupEmployees.id, removedIds));
      for (const employee of employees) {
        const member = { name: employee.name, role: employee.role || null, email: employee.email || null, linkedinUrl: employee.linkedinUrl || null, updatedAt: new Date() };
        if (employee.id) await tx.update(startupEmployees).set(member).where(and(eq(startupEmployees.id, employee.id), eq(startupEmployees.startupId, saved.id)));
        else await tx.insert(startupEmployees).values({ ...member, startupId: saved.id });
      }
      return saved.id;
    });
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

function startupSearch(search: string) {
  const value = search.trim().slice(0, 200);
  return value ? or(ilike(startups.name, `%${value}%`), ilike(startups.description, `%${value}%`), ilike(startups.sector, `%${value}%`)) : undefined;
}

export async function getStartupsAction(page = 1, pageSize = 20, search = "", sort = "NOT_OUTREACHED", teamSize = "all") {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const selectedTeamSize = TEAM_SIZE_FILTERS.some(filter => filter.value === teamSize) ? teamSize : "all";
  const sizeRows = await db.select({ size: startups.teamSize, count: sql<number>`count(*)::int` })
    .from(startups).where(startupSearch(search)).groupBy(startups.teamSize);
  const teamSizeCounts = TEAM_SIZE_FILTERS.map(filter => ({ ...filter,
    count: sizeRows.filter(row => startupTeamSizeGroup(row.size) === filter.value).reduce((sum, row) => sum + row.count, 0),
  }));
  const matchingSizes = sizeRows.filter(row => startupTeamSizeGroup(row.size) === selectedTeamSize).map(row => row.size);
  const nonNullSizes = matchingSizes.filter((size): size is string => size !== null);
  const sizeCondition = selectedTeamSize === "all" ? undefined : or(
    nonNullSizes.length ? inArray(startups.teamSize, nonNullSizes) : sql`false`,
    matchingSizes.includes(null) ? isNull(startups.teamSize) : sql`false`,
  );
  const safePage = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
  const safePageSize = Number.isFinite(pageSize) ? Math.min(50, Math.max(1, Math.floor(pageSize))) : 20;
  const normalizedSort = ["NOT_OUTREACHED", "OUTREACHED", "A_Z", "Z_A"].includes(sort) ? sort : "NOT_OUTREACHED";
  const name = sql`lower(${startups.name})`;
  const contacted = sql`coalesce(${startupTracking.outreachDone}, false)`;
  const ordering = normalizedSort === "OUTREACHED" ? [desc(contacted), asc(name)]
    : normalizedSort === "NOT_OUTREACHED" ? [asc(contacted), asc(name)]
    : normalizedSort === "Z_A" ? [desc(name)] : [asc(name)];
  const [rows, totalCount, [summary]] = await Promise.all([
    db.select({ startup: getTableColumns(startups), tracking: getTableColumns(startupTracking) })
      .from(startups).leftJoin(startupTracking, and(eq(startupTracking.startupId, startups.id), eq(startupTracking.userId, session.user.id)))
      .where(and(startupSearch(search), sizeCondition)).orderBy(...ordering, asc(startups.id))
      .limit(safePageSize).offset((safePage - 1) * safePageSize),
    Promise.resolve(selectedTeamSize === "all" ? sizeRows.reduce((sum, row) => sum + row.count, 0) : teamSizeCounts.find(filter => filter.value === selectedTeamSize)!.count),
    db.select({
      total: sql<number>`count(*)::int`,
      done: sql<number>`count(*) filter (where ${startupTracking.outreachDone} = true)::int`,
    }).from(startups).leftJoin(startupTracking, and(
      eq(startupTracking.startupId, startups.id),
      eq(startupTracking.userId, session.user.id),
    )),
  ]);
  const ids = rows.map(row => row.startup.id);
  const employees = ids.length ? await db.query.startupEmployees.findMany({ where: inArray(startupEmployees.startupId, ids) }) : [];
  const employeesByStartup = new Map<string, typeof employees>();
  for (const employee of employees) {
    const list = employeesByStartup.get(employee.startupId) ?? [];
    list.push(employee); employeesByStartup.set(employee.startupId, list);
  }
  return {
    items: rows.map(row => ({ ...row.startup, tracking: row.tracking ? [row.tracking] : [], employees: employeesByStartup.get(row.startup.id) ?? [] })),
    totalCount,
    teamSizeCounts,
    selectedTeamSize,
    summary: { total: summary.total, done: summary.done, left: summary.total - summary.done },
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


