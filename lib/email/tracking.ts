const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export function rewriteLinksForTracking(
  html: string,
  trackingId: string
): string {
  return html.replace(
    /href="(https?:\/\/[^"]+)"/g,
    (_match, url) =>
      `href="${BASE_URL}/api/track/click/${trackingId}?url=${encodeURIComponent(url)}"`
  );
}

export function getTrackingPixelUrl(trackingId: string): string {
  return `${BASE_URL}/api/track/open/${trackingId}`;
}

export function appendTrackingPixel(html: string, trackingId: string): string {
  const pixel = `<img src="${getTrackingPixelUrl(trackingId)}" width="1" height="1" style="display:none" alt="" />`;

  // Insert before closing body tag if present, otherwise append
  if (html.includes("</body>")) {
    return html.replace("</body>", `${pixel}</body>`);
  }
  return html + pixel;
}

export function prepareEmailBody(
  body: string,
  trackingId: string
): string {
  // Wrap plain text in basic HTML if needed
  let html = body;
  if (!html.includes("<html") && !html.includes("<body")) {
    html = `<html><body>${html.replace(/\n/g, "<br/>")}</body></html>`;
  }

  html = rewriteLinksForTracking(html, trackingId);
  html = appendTrackingPixel(html, trackingId);
  return html;
}
