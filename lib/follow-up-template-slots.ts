import { createHash } from "node:crypto";
import type { FollowUpStage } from "@/lib/follow-up-templates";

// Keep the original generic slot IDs so existing edited messages remain linked.
export function followUpTemplateId(userId: string, stage: FollowUpStage) {
  const hash = createHash("sha256").update(JSON.stringify(["follow-up-template-v1", userId, stage, "unknown"])).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

export function followUpTemplateStage(userId: string, id: string): FollowUpStage | null {
  return ([1, 2] as const).find(stage => followUpTemplateId(userId, stage) === id) ?? null;
}
