import { z } from "zod";

const PERSON_ROLES = ["HR", "CEO", "CTO", "RECRUITER", "OTHER"] as const;
const CONTACT_METHODS = ["EMAIL", "LINKEDIN"] as const;
const STATUSES = [
  "DRAFT",
  "SENT",
  "REPLIED",
  "GHOSTED",
  "INTERVIEW",
  "REJECTED",
  "OFFER",
  "CLOSED",
] as const;

export const outreachFormSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  companyLink: z.string().url("Invalid URL").optional().or(z.literal("")),
  roleTargeted: z.string().min(1, "Role targeted is required"),
  personName: z.string().min(1, "Person name is required"),
  personRole: z.enum(PERSON_ROLES),
  contactMethod: z.enum(CONTACT_METHODS),
  emailAddress: z.string().email("Invalid email").optional().or(z.literal("")),
  linkedinProfileUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  status: z.enum(STATUSES).optional(),
  notes: z.string().optional(),
  messageSentAt: z.preprocess((val) => val === "" ? undefined : val, z.coerce.date()).optional(),
  followUpDueAt: z.preprocess((val) => val === "" ? undefined : val, z.coerce.date()).optional(),
});

export type OutreachFormValues = z.infer<typeof outreachFormSchema>;
