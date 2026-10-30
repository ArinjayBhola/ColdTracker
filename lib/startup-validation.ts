import { z } from "zod";

const text = z.string().trim().max(255, "Use 255 characters or fewer");
const url = z.string().trim().max(2048).transform(value => value && !/^[a-z][a-z\d+.-]*:/i.test(value) ? `https://${value}` : value)
  .refine(value => {
    if (!value) return true;
    try { return ["https:", "http:"].includes(new URL(value).protocol); } catch { return false; }
  }, "Enter a valid http or https URL");

export const startupFormSchema = z.object({
  name: text.min(1, "Startup name is required"),
  description: z.string().trim().max(10000),
  website: url,
  logoUrl: url,
  sector: text,
  location: text,
  teamSize: text,
  fundingRound: text,
  fundingAmount: text,
  fundingDate: z.string().trim().refine(value => !value || (/^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value), "Enter a valid date"),
  isHiring: z.boolean(),
  isTrending: z.boolean(),
  employees: z.array(z.object({
    id: z.uuid().optional(),
    name: text.min(1, "Team member name is required"),
    role: text,
    email: text.refine(value => !value || z.email().safeParse(value).success, "Enter a valid email address"),
    linkedinUrl: url.refine(value => {
      if (!value) return true;
      try { return /(^|\.)linkedin\.com$/i.test(new URL(value).hostname); } catch { return false; }
    }, "Enter a LinkedIn URL"),
  })).min(1, "Add at least one team member").max(100, "Use 100 team members or fewer"),
});

export type StartupFormValues = z.infer<typeof startupFormSchema>;

export function normalizeStartupName(value: string) {
  return value.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

export function startupWebsiteDomain(value: string | null) {
  if (!value?.trim()) return "";
  try { return new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`).hostname.toLowerCase().replace(/^www\./, "").replace(/\.$/, ""); }
  catch { return ""; }
}
