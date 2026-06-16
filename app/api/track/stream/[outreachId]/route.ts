import { auth } from "@/lib/auth";
import { db } from "@/db";
import { outreach } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { createSubscriber, trackingChannel } from "@/lib/redis";
import { NextRequest } from "next/server";

// ioredis needs the Node.js runtime (not Edge). Keep the connection open as long
// as Vercel allows; the browser's EventSource auto-reconnects when it ends.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // raise to 300 on Vercel Pro for fewer reconnects

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ outreachId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { outreachId } = await params;

  // Ownership check — never stream another user's open activity.
  const owned = await db.query.outreach.findFirst({
    where: and(
      eq(outreach.id, outreachId),
      eq(outreach.userId, session.user.id)
    ),
    columns: { id: true },
  });
  if (!owned) {
    return new Response("Not found", { status: 404 });
  }

  const subscriber = createSubscriber();
  if (!subscriber) {
    return new Response("Realtime not configured", { status: 503 });
  }

  const channel = trackingChannel(outreachId);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: string) => {
        try {
          controller.enqueue(encoder.encode(data));
        } catch {
          // Controller already closed.
        }
      };

      // Initial comment so the browser marks the connection open immediately.
      send(": connected\n\n");

      subscriber.on("message", (_channel, message) => {
        send(`event: tracking\ndata: ${message}\n\n`);
      });

      try {
        await subscriber.subscribe(channel);
      } catch {
        send("event: error\ndata: subscribe-failed\n\n");
      }

      // Heartbeat keeps proxies/load-balancers from dropping an idle connection.
      const heartbeat = setInterval(() => send(": ping\n\n"), 15000);

      const cleanup = () => {
        clearInterval(heartbeat);
        subscriber.quit().catch(() => subscriber.disconnect());
        try {
          controller.close();
        } catch {
          // Already closed.
        }
      };

      req.signal.addEventListener("abort", cleanup);
    },
    cancel() {
      subscriber.quit().catch(() => subscriber.disconnect());
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
