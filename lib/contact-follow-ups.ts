import type { OutreachContact } from "@/db/schema";

export const FOLLOW_UP_STOP_STATUSES = ["DRAFT", "REPLIED", "INTERVIEW", "REJECTED", "OFFER", "CLOSED"];

export function contactDue(contact: OutreachContact) {
  if (contact.followUp2SentAt) return null;
  return contact.followUpSentAt ? contact.followUp2DueAt ?? null : contact.followUpDueAt ?? null;
}

export function earliestContactDue(contacts: OutreachContact[]) {
  return contacts.map(contactDue).filter((date): date is string | Date => !!date)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0] ?? null;
}
