import type { FollowUpStage } from "@/lib/follow-up-templates";

export type TemplateItem = {
  id: string; title: string; subject: string; body: string; category: string; tags: string[];
  characterLimit: number | null; favorite: boolean; pinned: boolean; createdAt: string; updatedAt: string;
  characterCount: number; bodyTruncated: boolean; followUpStage: FollowUpStage | null;
};
export type TemplateFilters = { page: number; q: string; category: string; tag: string; favorites: boolean };
export type TemplatePage = {
  items: TemplateItem[]; totalCount: number; total: number; favoriteCount: number; currentPage: number;
  categories: string[]; tags: string[]; linkedIds: string[];
};
export const TEMPLATE_PAGE_SIZE = 18;
export const TEMPLATE_PREVIEW_LENGTH = 1000;
export function templatePreview(template: TemplateItem): TemplateItem {
  return { ...template, body: Array.from(template.body).slice(0,TEMPLATE_PREVIEW_LENGTH).join(''), bodyTruncated: template.characterCount > TEMPLATE_PREVIEW_LENGTH };
}
