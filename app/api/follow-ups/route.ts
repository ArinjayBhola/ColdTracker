import { getFollowUpPage } from "@/lib/follow-up-query";
import { auth } from "@/lib/auth";
import { userDayBounds, validTimeZone } from "@/lib/user-calendar";
import { z } from "zod";
import { STATUSES } from "@/lib/validations";
const querySchema = z.object({ category: z.enum(["OVERDUE", "TODAY", "UPCOMING", "SENT", "ALL_ACTIVE"]), stage: z.enum(["ALL", "1", "2"]), page: z.coerce.number().int().min(1).max(100000), timeZone: z.string().refine(validTimeZone),
  q: z.string().trim().max(200).default(""), method: z.enum(["ALL", "EMAIL", "LINKEDIN"]).default("ALL"), status: z.enum(["ALL", ...STATUSES]).default("ALL"),
});
export async function GET(request: Request) {
  const started = performance.now();
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "private, no-store" } });
  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  const headers = { "Cache-Control": "private, no-store" };
  if (!parsed.success) return Response.json({ error: "Invalid filters" }, { status: 400, headers });
  const { category, stage, page, timeZone, q, method, status } = parsed.data;
  const day = userDayBounds(timeZone);
  const result = await getFollowUpPage(session.user.id, category, page, 15, stage, timeZone, { key: day.key, start: day.start.toISOString(), end: day.end.toISOString() }, { q, method, status });
  return Response.json(result, { headers: { ...headers, "Server-Timing": `handler;dur=${(performance.now() - started).toFixed(1)}` } });
}
