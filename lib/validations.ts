import { z } from "zod";

const PERSON_ROLES = ["HR", "CEO", "CTO", "RECRUITER", "OTHER"] as const;
const CONTACT_METHODS = ["EMAIL", "LINKEDIN"] as const;
export const STATUSES = [
  "DRAFT",
  "SENT",
  "REPLIED",
  "GHOSTED",
  "INTERVIEW",
  "REJECTED",
  "OFFER",
  "CLOSED",
] as const;

const CONTACT_FIELDS = {
  personName: z.string().min(1, "Person name is required"),
  personRole: z.enum(PERSON_ROLES),
  contactMethod: z.enum(CONTACT_METHODS),
  emailAddress: z.string().email("Invalid email").optional().or(z.literal("")),
  linkedinProfileUrl: z.preprocess((val) => {
    if (typeof val !== "string" || !val.trim()) return undefined;
    const str = val.trim();
    if (!str.match(/^https?:\/\//i)) {
      return `https://${str}`;
    }
    return str;
  }, z.string().url("Invalid URL").optional().or(z.literal(""))),
};

export const outreachFormSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  companyLink: z.preprocess((val) => {
    if (typeof val !== "string" || !val.trim()) return undefined;
    const str = val.trim();
    if (!str.match(/^https?:\/\//i)) {
      return `https://${str}`;
    }
    return str;
  }, z.string().url("Invalid URL").optional().or(z.literal(""))),
  roleTargeted: z.string().min(1, "Role targeted is required"),
  contacts: z.array(z.object(CONTACT_FIELDS)).min(1, "At least one contact is required"),
  status: z.enum(STATUSES).optional().default("DRAFT"),
  notes: z.string().optional(),
  messageSentAt: z.union([z.string(), z.date()]).optional().transform(v => v ? new Date(v) : undefined),
  followUpDueAt: z.union([z.string(), z.date()]).optional().transform(v => v ? new Date(v) : undefined),
});

export const editOutreachSchema = z.object({
  id: z.string().uuid(),
  companyName: z.string().min(1, "Company name is required"),
  companyLink: z.preprocess((val) => {
    if (typeof val !== "string" || !val.trim()) return undefined;
    const str = val.trim();
    if (!str.match(/^https?:\/\//i)) {
      return `https://${str}`;
    }
    return str;
  }, z.string().url("Invalid URL").optional().or(z.literal(""))),
  roleTargeted: z.string().min(1, "Role targeted is required"),
  personName: z.string().min(1, "Person name is required"),
  personRole: z.enum(PERSON_ROLES),
  contactMethod: z.enum(CONTACT_METHODS),
  emailAddress: z.string().email("Invalid email").optional().or(z.literal("")),
  linkedinProfileUrl: z.preprocess((val) => {
    if (typeof val !== "string" || !val.trim()) return undefined;
    const str = val.trim();
    if (!str.match(/^https?:\/\//i)) {
      return `https://${str}`;
    }
    return str;
  }, z.string().url("Invalid URL").optional().or(z.literal(""))),
});

export interface EditOutreachValues {
  id: string;
  companyName: string;
  companyLink?: string;
  roleTargeted: string;
  personName: string;
  personRole: "HR" | "CEO" | "CTO" | "RECRUITER" | "OTHER";
  contactMethod: "EMAIL" | "LINKEDIN";
  emailAddress?: string;
  linkedinProfileUrl?: string;
}

export type OutreachFormValues = z.infer<typeof outreachFormSchema>;
