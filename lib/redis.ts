import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL;

/**
 * Channel name for live email-tracking events scoped to a single outreach.
 * The browser subscribes to its outreach; the tracking pixel/click routes publish here.
 */
export function trackingChannel(outreachId: string): string {
  return `tracking:outreach:${outreachId}`;
}

export type TrackingEventPayload = {
  type: "open" | "click";
  outreachId: string;
  sentEmailId: string;
  trackingId: string;
  url?: string | null;
  timestamp: string;
};

// Module-scoped publisher. On Vercel, warm lambdas reuse this across invocations
// instead of opening a new connection every request. ioredis auto-reconnects.
let publisher: Redis | null = null;

function getPublisher(): Redis | null {
  if (!REDIS_URL) return null;
  if (!publisher) {
    publisher = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      lazyConnect: false,
    });
    // Never let an unhandled error event crash the serverless function.
    publisher.on("error", () => {});
  }
  return publisher;
}

/**
 * Publish a tracking event. Best-effort: never throws, so it can't break the
 * tracking pixel response.
 */
export async function publishTrackingEvent(
  payload: TrackingEventPayload
): Promise<void> {
  const client = getPublisher();
  if (!client) return;
  try {
    await client.publish(
      trackingChannel(payload.outreachId),
      JSON.stringify(payload)
    );
  } catch {
    // Swallow — live updates are non-critical; the DB remains source of truth.
  }
}

/**
 * Create a dedicated connection for SSE subscription. Pub/sub mode monopolizes a
 * connection, so each stream needs its own. Caller must `.quit()` on cleanup.
 */
export function createSubscriber(): Redis | null {
  if (!REDIS_URL) return null;
  const sub = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
    lazyConnect: false,
  });
  sub.on("error", () => {});
  return sub;
}
