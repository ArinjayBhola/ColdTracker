export const FOLLOW_UP_VARIANTS = ["unknown", "seen", "not_seen"] as const;
export type FollowUpVariant = typeof FOLLOW_UP_VARIANTS[number];
export type FollowUpStage = 1 | 2;
export type FollowUpTemplate = { stage: FollowUpStage; variant: FollowUpVariant; subject: string; body: string };
export const VARIANT_LABELS: Record<FollowUpVariant, string> = { unknown: "Unknown", seen: "Seen", not_seen: "Not seen" };
export const DEFAULT_FOLLOW_UP_TEMPLATES: FollowUpTemplate[] = [
  { stage: 1, variant: "unknown", subject: "Following up — {{companyName}}", body: "Hi {{personName}},\n\nI wanted to follow up on my earlier email about opportunities at {{companyName}}. I'd love to explore whether my experience could be useful to your team.\n\nWould you be open to a brief conversation? Happy to share more context.\n\nThank you for your time!" },
  { stage: 1, variant: "seen", subject: "A quick follow-up — {{companyName}}", body: "Hi {{personName}},\n\nFollowing up on my note about {{companyName}}. I'd be happy to answer any questions or share a few examples of my work if that would help.\n\nWould a quick conversation make sense?\n\nThanks for considering it!" },
  { stage: 1, variant: "not_seen", subject: "In case my earlier note got buried — {{companyName}}", body: "Hi {{personName}},\n\nBringing my earlier note back to the top of your inbox in case it got buried. I'm interested in opportunities at {{companyName}} and would love to learn where I might contribute.\n\nAre you the right person to speak with?\n\nThanks for your time!" },
  { stage: 2, variant: "unknown", subject: "One last follow-up — {{companyName}}", body: "Hi {{personName}},\n\nOne last follow-up on my earlier email about {{companyName}}. I'm still interested in connecting, but I understand the timing may not be right.\n\nIf there's an opportunity to speak, I'd be glad to hear from you. Otherwise, I'll leave it here.\n\nThank you!" },
  { stage: 2, variant: "seen", subject: "Closing the loop — {{companyName}}", body: "Hi {{personName}},\n\nI wanted to close the loop on my interest in {{companyName}}. If you think there could be a fit, I'd welcome a short conversation.\n\nIf now isn't a good time, no worries — I'll leave it here.\n\nThanks for considering my note!" },
  { stage: 2, variant: "not_seen", subject: "A final note — {{companyName}}", body: "Hi {{personName}},\n\nSending a final note in case my earlier emails were missed. I'm interested in contributing to {{companyName}} and would appreciate being pointed toward the right person if that isn't you.\n\nNo worries if the timing isn't right. I won't keep following up.\n\nThank you!" },
];

export function personalizeFollowUp(text: string, context: { companyName: string; personName?: string; roleTargeted?: string }) {
  const values: Record<string, string> = { companyName: context.companyName, personName: context.personName?.trim() || "there", roleTargeted: context.roleTargeted || "your team" };
  return text.replace(/{{\s*(companyName|personName|roleTargeted)\s*}}/g, (_, key: string) => values[key]);
}

export function suggestedFollowUpStage(item: { followUpSentAt?: Date | string | null; followUp2SentAt?: Date | string | null }): FollowUpStage {
  return item.followUpSentAt || item.followUp2SentAt ? 2 : 1;
}
