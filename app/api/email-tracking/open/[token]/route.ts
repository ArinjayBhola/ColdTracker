import { collectOpen } from "@/lib/email-tracking-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 10;
const image = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
const headers = { "Content-Type": "image/gif", "Cache-Control": "private, no-store, no-cache, max-age=0",
  Pragma: "no-cache", Expires: "0", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" };

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const match = /^([A-Za-z0-9_-]{43})\.gif$/.exec(token);
  if (match && process.env.EMAIL_OPEN_TRACKING_ENABLED === "true") {
    try { await collectOpen(match[1]); } catch { /* Best effort; never log token or request metadata. */ }
  }
  // Unknown, disabled, expired and failed lookups have the same image response.
  return new Response(image, { status: 200, headers });
}
export function HEAD() { return new Response(null, { status: 200, headers }); }
