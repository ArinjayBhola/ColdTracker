import { auth } from "@/lib/auth";
import { readStartupTeamPreviews } from "@/lib/startup-query";
import { z } from "zod";

export async function GET(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Sign in required" }, { status: 401, headers });
  const raw = new URL(request.url).searchParams.get("ids") ?? "";
  const ids = raw.length <= 1850 ? z.array(z.uuid()).min(1).max(50).safeParse(raw.split(",")) : null;
  if (!ids?.success) return Response.json({ error: "Invalid startups" }, { status: 400, headers });
  try {
    return Response.json(await readStartupTeamPreviews([...new Set(ids.data)]), { headers });
  } catch {
    return Response.json({ error: "Team members temporarily unavailable" }, { status: 503, headers });
  }
}
