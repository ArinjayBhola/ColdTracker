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
  emailAddress: z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z.string().email("Invalid email").optional()
  ),
  linkedinProfileUrl: z.preprocess(
    (val) => {
      if (val === "" || val === null) return undefined;
      const str = String(val).trim();
      // If URL doesn't start with http:// or https://, prepend https://
      if (str && !str.match(/^https?:\/\//i)) {
        return `https://${str}`;
      }
      return str;
    },
    z.string().url("Invalid URL").optional()
  ),
};

export const outreachFormSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  companyLink: z.preprocess(
    (val) => {
      if (val === "" || val === null) return undefined;
      const str = String(val).trim();
      // If URL doesn't start with http:// or https://, prepend https://
      if (str && !str.match(/^https?:\/\//i)) {
        return `https://${str}`;
      }
      return str;
    },
    z.string().url("Invalid URL").optional()
  ),
  roleTargeted: z.string().min(1, "Role targeted is required"),
  contacts: z.array(z.object(CONTACT_FIELDS)).min(1, "At least one contact is required"),
  status: z.preprocess((val) => val === "" || val === null ? undefined : val, z.enum(STATUSES)).optional(),
  notes: z.string().optional(),
  messageSentAt: z.preprocess((val) => val === "" || val === null ? undefined : val, z.string().optional().transform(v => v ? new Date(v) : undefined)),
  followUpDueAt: z.preprocess((val) => val === "" || val === null ? undefined : val, z.string().optional().transform(v => v ? new Date(v) : undefined)),
});

export type OutreachFormValues = z.infer<typeof outreachFormSchema>;
