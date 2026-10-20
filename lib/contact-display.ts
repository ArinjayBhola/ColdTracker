export function contactDisplayName(contact: { personName?: string | null; emailAddress?: string | null }) {
  return contact.personName?.trim() || contact.emailAddress?.split(",")[0]?.trim() || "Unnamed contact";
}
