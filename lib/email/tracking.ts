/**
 * Resolve the public origin the app is served from. Tracking pixels and click
 * links embedded in outgoing emails MUST use this absolute URL — a recipient's
 * mail client cannot reach `localhost`, so a wrong base silently breaks all
 * open/click tracking.
 *
 * Resolution order (first non-empty wins):
 *   1. NEXT_PUBLIC_APP_URL  — explicit override
 *   2. NEXTAUTH_URL         — already configured for auth callbacks
 *   3. VERCEL_PROJECT_PRODUCTION_URL / VERCEL_URL — provided by Vercel
 *   4. Known production domain — when running in production with nothing else set
 *   5. http://localhost:3000 — local dev only
 *
 * A tracking pixel pointing at `localhost` silently breaks ALL open tracking
 * (the recipient's mail client can't reach it), so production must never fall
 * back to localhost.
 */
const PRODUCTION_URL = "https://cold-track.arinjay.dev";

export function resolveBaseUrl(): string {
  const candidate =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "") ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    (process.env.NODE_ENV === "production" ? PRODUCTION_URL : "http://localhost:3000");

  // Strip any trailing slash so we can safely concatenate paths.
  return candidate.replace(/\/+$/, "");
}

export function rewriteLinksForTracking(
  html: string,
  trackingId: string,
  baseUrl: string = resolveBaseUrl()
): string {
  return html.replace(
    /href="(https?:\/\/[^"]+)"/g,
    (_match, url) =>
      `href="${baseUrl}/api/track/click/${trackingId}?url=${encodeURIComponent(url)}"`
  );
}

export function getTrackingPixelUrl(
  trackingId: string,
  baseUrl: string = resolveBaseUrl()
): string {
  return `${baseUrl}/api/track/open/${trackingId}.gif`;
}

export function appendTrackingPixel(
  html: string,
  trackingId: string,
  baseUrl: string = resolveBaseUrl()
): string {
  // IMPORTANT: do NOT use `display:none` — Gmail/Outlook skip downloading hidden
  // images, so the open never registers. Keep it loadable but invisible.
  const pixel = `<img src="${getTrackingPixelUrl(trackingId, baseUrl)}" width="1" height="1" alt="" style="display:block;border:0;width:1px;height:1px;max-width:1px;max-height:1px;overflow:hidden;opacity:0" />`;

  // Insert before closing body tag if present, otherwise append
  if (html.includes("</body>")) {
    return html.replace("</body>", `${pixel}</body>`);
  }
  return html + pixel;
}

export function prepareEmailBody(
  body: string,
  trackingId: string,
  baseUrl: string = resolveBaseUrl()
): string {
  // Wrap plain text in basic HTML if needed
  let html = body;
  if (!html.includes("<html") && !html.includes("<body")) {
    html = `<html><body>${html.replace(/\n/g, "<br/>")}</body></html>`;
  }

  html = rewriteLinksForTracking(html, trackingId, baseUrl);
  html = appendTrackingPixel(html, trackingId, baseUrl);
  return html;
}
