import { db } from "@/db";
import { messageTemplates } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { followUpTemplateId, followUpTemplateStage } from "@/lib/follow-up-template-slots";
import { ensureFollowUpTemplates } from "@/lib/follow-up-template-store";
import { TEMPLATE_PAGE_SIZE, TEMPLATE_PREVIEW_LENGTH, type TemplateFilters, type TemplateItem, type TemplatePage } from "@/lib/template-types";

export function serializeTemplate(row: typeof messageTemplates.$inferSelect, owner: string): TemplateItem {
  return { id:row.id,title:row.title,subject:row.subject,body:row.body,category:row.category,tags:row.tags,
    characterLimit:row.characterLimit,favorite:row.favorite,pinned:row.pinned,createdAt:row.createdAt.toISOString(),updatedAt:row.updatedAt.toISOString(),
    characterCount:Array.from(row.body).length,bodyTruncated:false,followUpStage:followUpTemplateStage(owner,row.id) };
}
export async function readTemplate(owner: string, id: string) {
  const [row] = await db.select().from(messageTemplates).where(and(eq(messageTemplates.userId,owner),eq(messageTemplates.id,id)));
  return row ? serializeTemplate(row,owner) : null;
}
export async function readTemplatePage(owner: string, filters: TemplateFilters): Promise<TemplatePage> {
  const requestedPage=Number.isFinite(filters.page)?Math.min(2147483647,Math.max(1,Math.floor(filters.page)||1)):1;
  const slots=([1,2] as const).map(stage=>followUpTemplateId(owner,stage));
  const conditions=[sql`true`];
  if(filters.q){
    const pattern=`%${filters.q.replace(/[\\%_]/g,'\\$&')}%`;
    conditions.push(sql`concat_ws(' ',b.title,b.subject,b.body,b.category,(SELECT string_agg(tag,' ') FROM jsonb_array_elements_text(b.tags) tag)) ILIKE ${pattern}`);
  }
  if(filters.category)conditions.push(sql`b.category=${filters.category}`);
  if(filters.tag)conditions.push(sql`b.tags @> ${JSON.stringify([filters.tag])}::jsonb`);
  if(filters.favorites)conditions.push(sql`b.favorite`);
  const [result]=await db.execute<TemplatePage>(sql`
    WITH base AS NOT MATERIALIZED (SELECT * FROM message_templates WHERE user_id=${owner}),
    matched AS MATERIALIZED (SELECT b.id,b.pinned,b.created_at FROM base b WHERE ${sql.join(conditions,sql` AND `)}),
    pagination AS (SELECT count(*)::int AS total,least(${requestedPage},greatest(1,ceil(count(*)::numeric/${TEMPLATE_PAGE_SIZE})::int)) AS page FROM matched),
    page_ids AS (SELECT id,pinned,created_at FROM matched ORDER BY pinned DESC,created_at DESC,id ASC
      LIMIT ${TEMPLATE_PAGE_SIZE} OFFSET ((SELECT page FROM pagination)-1)*${TEMPLATE_PAGE_SIZE})
    SELECT (SELECT total FROM pagination) AS "totalCount",(SELECT page FROM pagination) AS "currentPage",
      coalesce((SELECT jsonb_agg(jsonb_build_object(
        'id',b.id,'title',b.title,'subject',b.subject,'body',left(b.body,${TEMPLATE_PREVIEW_LENGTH}),'category',b.category,'tags',b.tags,
        'characterLimit',b.character_limit,'favorite',b.favorite,'pinned',b.pinned,
        'createdAt',to_char(b.created_at,'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),'updatedAt',to_char(b.updated_at,'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
        'characterCount',char_length(b.body),'bodyTruncated',char_length(b.body)>${TEMPLATE_PREVIEW_LENGTH},
        'followUpStage',CASE WHEN b.id=${slots[0]}::uuid THEN 1 WHEN b.id=${slots[1]}::uuid THEN 2 ELSE null END
      ) ORDER BY p.pinned DESC,p.created_at DESC,p.id ASC) FROM page_ids p JOIN base b ON b.id=p.id),'[]'::jsonb) AS items,
      count(*)::int AS total,count(*) FILTER(WHERE favorite)::int AS "favoriteCount",
      coalesce(jsonb_agg(DISTINCT category) FILTER(WHERE category<>''),'[]'::jsonb) AS categories,
      coalesce((SELECT jsonb_agg(DISTINCT tag) FROM base t CROSS JOIN LATERAL jsonb_array_elements_text(t.tags) tag),'[]'::jsonb) AS tags,
      coalesce(jsonb_agg(id) FILTER(WHERE id IN (${slots[0]}::uuid,${slots[1]}::uuid)),'[]'::jsonb) AS "linkedIds"
    FROM base
  `);
  return {...result,categories:result.categories.sort(),tags:result.tags.sort()};
}
export async function readTemplateLibrary(owner: string, filters: TemplateFilters) {
  let page=await readTemplatePage(owner,filters);
  if(await ensureFollowUpTemplates(owner,page.linkedIds))page=await readTemplatePage(owner,filters);
  return page;
}
