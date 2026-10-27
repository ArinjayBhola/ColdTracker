export type FollowUpStage = 1 | 2;
export type FollowUpTemplate = { stage: FollowUpStage; subject: string; body: string };
export const FOLLOW_UP_PLACEHOLDERS = [
  { token: "{{companyName}}", label: "Company" },
  { token: "{{personName}}", label: "Person" },
  { token: "{{role}}", label: "Role" },
] as const;
export const DEFAULT_FOLLOW_UP_TEMPLATES: FollowUpTemplate[] = [
  { stage: 1, subject: "Following up — {{companyName}}", body: "Hi {{personName}},\n\nI wanted to follow up on my earlier email about {{role}} at {{companyName}}. I'd love to explore whether my experience could be useful to your team.\n\nWould you be open to a brief conversation? Happy to share more context.\n\nThank you for your time!" },
  { stage: 2, subject: "One last follow-up — {{companyName}}", body: "Hi {{personName}},\n\nOne last follow-up on my earlier email about {{role}} at {{companyName}}. I'm still interested in connecting, but I understand the timing may not be right.\n\nIf there's an opportunity to speak, I'd be glad to hear from you. Otherwise, I'll leave it here.\n\nThank you!" },
];

export function personalizeFollowUp(text: string, context: { companyName: string; personName?: string; roleTargeted?: string }) {
  const role = context.roleTargeted?.trim() || "opportunities";
  const values: Record<string, string> = { companyname: context.companyName, personname: context.personName?.trim() || "there", role, roletargeted: role };
  return text.replace(/{{\s*(companyName|personName|roleTargeted|role)\s*}}/gi, (_, key: string) => values[key.toLowerCase()]);
}

export function suggestedFollowUpStage(item: { followUpSentAt?: Date | string | null; followUp2SentAt?: Date | string | null }): FollowUpStage {
  return item.followUpSentAt || item.followUp2SentAt ? 2 : 1;
}
