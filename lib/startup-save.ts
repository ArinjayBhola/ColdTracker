import { db } from "@/db";
import { startups, startupEmployees } from "@/db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";
import { normalizeStartupName, startupWebsiteDomain, type StartupFormValues } from "@/lib/startup-validation";

export async function saveStartupRecord(input: StartupFormValues, startupId?: string) {
  const { employees, ...company } = input;
  const normalizedName = normalizeStartupName(company.name);
  const domain = startupWebsiteDomain(company.website);
  return db.transaction(async tx => {
    if (startupId) {
      const [existing] = await tx.select({ id: startups.id }).from(startups).where(eq(startups.id, startupId)).for("update");
      if (!existing) throw new Error("This startup no longer exists.");
    }
    // All form saves claiming the same name/domain serialize. Hash ordering also
    // handles collisions without deadlocking; unrelated startups can save together.
    const keys = [`coldtrack:startup:name:${normalizedName}`, ...(domain ? [`coldtrack:startup:domain:${domain}`] : [])];
    await tx.execute(sql`SELECT pg_advisory_xact_lock(key) FROM (
      SELECT DISTINCT hashtextextended(value,0) AS key FROM jsonb_array_elements_text(${JSON.stringify(keys)}::jsonb) value ORDER BY key
    ) locks`);
    // Conservative prefilters reduce transferred catalog rows. Non-ASCII names
    // and unusual URLs fall back to the exact JavaScript normalization below.
    // No index is required, but PostgreSQL still scans the catalog for candidates.
    const nameCandidate = sql`(octet_length(convert_to(${startups.name},'UTF8')) <> length(${startups.name})
      OR regexp_replace(lower(${startups.name} COLLATE "C"),'[^a-z0-9]','','g') = ${normalizedName})`;
    const websiteCandidate = !domain ? sql`false` : /^[\d.]+$/.test(domain) || domain.includes(":") ? sql`${startups.website} IS NOT NULL` : sql`(
      octet_length(convert_to(${startups.website},'UTF8')) <> length(${startups.website})
      OR strpos(${startups.website},'%') > 0
      OR strpos(lower(translate(${startups.website}, E'\n\r\t','') COLLATE "C"),${domain}) > 0)`;
    const candidates = await tx.select({ id: startups.id, name: startups.name, website: startups.website }).from(startups)
      .where(and(startupId ? sql`${startups.id} <> ${startupId}` : undefined, sql`(${nameCandidate} OR ${websiteCandidate})`));
    const duplicate = candidates.find(row => normalizeStartupName(row.name) === normalizedName || (domain && startupWebsiteDomain(row.website) === domain));
    if (duplicate) throw new Error(`A startup with this name or website already exists: ${duplicate.name}`);
    const updatedAt = new Date();
    const values = {
      ...company,
      description: company.description || null, website: company.website || null, logoUrl: company.logoUrl || null,
      sector: company.sector || null, location: company.location || null, teamSize: company.teamSize || null,
      fundingRound: company.fundingRound || null, fundingAmount: company.fundingAmount || null, fundingDate: company.fundingDate || null,
      updatedAt,
    };
    const [saved] = startupId
      ? await tx.update(startups).set(values).where(eq(startups.id, startupId)).returning({ id: startups.id })
      : await tx.insert(startups).values(values).returning({ id: startups.id });
    const existingEmployees = await tx.select({ id: startupEmployees.id }).from(startupEmployees).where(eq(startupEmployees.startupId, saved.id));
    const existingIds = new Set(existingEmployees.map(employee => employee.id));
    const submittedIds = employees.flatMap(employee => employee.id ? [employee.id] : []);
    if (new Set(submittedIds).size !== submittedIds.length || submittedIds.some(id => !existingIds.has(id))) throw new Error("Invalid team member selection. Reopen the form and try again.");
    const removedIds = [...existingIds].filter(id => !submittedIds.includes(id));
    if (removedIds.length) await tx.delete(startupEmployees).where(and(eq(startupEmployees.startupId, saved.id), inArray(startupEmployees.id, removedIds)));
    const members = employees.map(employee => ({
      id: employee.id, name: employee.name, role: employee.role || null, email: employee.email || null,
      linkedinUrl: employee.linkedinUrl || null,
    }));
    const updates = members.filter(member => member.id);
    if (updates.length) await tx.execute(sql`UPDATE startup_employees e SET name=m.name,role=m.role,email=m.email,linkedin_url=m."linkedinUrl",updated_at=${updatedAt.toISOString()}
      FROM jsonb_to_recordset(${JSON.stringify(updates)}::jsonb) AS m(id uuid,name text,role text,email text,"linkedinUrl" text)
      WHERE e.id=m.id AND e.startup_id=${saved.id}`);
    const additions = members.filter(member => !member.id);
    if (additions.length) await tx.insert(startupEmployees).values(additions.map(({ name, role, email, linkedinUrl }) => ({ name,role,email,linkedinUrl,startupId:saved.id,updatedAt })));
    return saved.id;
  });
}
