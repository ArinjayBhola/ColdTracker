import { getOutreachById } from "@/actions/get-outreach";
import { z } from "zod";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const started = performance.now();
  const { id } = await params;
  const headers = { "Cache-Control": "private, no-store" };
  if (!z.uuid().safeParse(id).success) return Response.json({ error: "Invalid outreach" }, { status: 400, headers });
  const item = await getOutreachById(id);
  if (!item) return Response.json({ error: "Outreach not found" }, { status: 404, headers });
  return Response.json(item, { headers: { ...headers, "Server-Timing": `handler;dur=${(performance.now() - started).toFixed(1)}` } });
}
