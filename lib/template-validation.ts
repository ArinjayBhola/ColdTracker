import { z } from "zod";

export const templateSchema = z.object({
  title: z.string().trim().min(1, "Enter a title").max(200),
  subject: z.string().trim().max(500),
  body: z.string().min(1, "Enter a message").max(50000).refine(value => value.trim().length > 0, "Enter a message"),
  category: z.string().trim().max(80),
  tags: z.array(z.string().trim().min(1).max(40)).max(20)
    .transform(tags => [...new Map(tags.map(tag => [tag.toLowerCase(), tag])).values()]),
  characterLimit: z.number().int().min(1).max(50000).nullable(),
  favorite: z.boolean(),
  pinned: z.boolean(),
});

export type TemplateInput = z.input<typeof templateSchema>;

// Count Unicode code points consistently in the editor and preview.
export function characterCount(value: string) {
  return Array.from(value).length;
}
