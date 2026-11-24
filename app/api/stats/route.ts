import { auth } from "@/lib/auth";
import { validTimeZone } from "@/lib/user-calendar";
import { readStatsSnapshot } from "@/lib/stats-query";

export async function GET(request: Request) {
  const started = performance.now();
  const headers = { "Cache-Control": "private, no-store" };
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Sign in required" }, { status: 401, headers });
  const timeZone = new URL(request.url).searchParams.get("timeZone");
  if (!validTimeZone(timeZone)) return Response.json({ error: "Invalid timezone" }, { status: 400, headers });
  try {
    const snapshot = await readStatsSnapshot(session.user.id, timeZone);
    return Response.json(snapshot, { headers: { ...headers, "Server-Timing": `handler;dur=${(performance.now() - started).toFixed(1)}` } });
  } catch {
    return Response.json({ error: "Statistics temporarily unavailable" }, { status: 503, headers });
  }
}
