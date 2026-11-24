export interface AppNotification {
  id: string;
  outreachId: string;
  recipient: string;
  subject: string;
  companyName: string;
  personName: string | null;
  observedAt: string;
  createdAt: string;
  readAt: string | null;
  outreachUpdatedAt: string;
}

export type NotificationSummary = {
  revision: string;
  unreadCount: number;
};

// Match PostgreSQL's canonical representation without transferring message bodies.
// IDs are UUIDs, so JavaScript and PostgreSQL use the same lexical ordering.
export async function notificationRevision(items: AppNotification[]) {
  const unique = [...new Map(items.map(item => [item.id, item])).values()];
  const text = unique.sort((a, b) => a.id.localeCompare(b.id)).map(item =>
    `${item.id}${item.readAt ? "r" : "u"}${item.outreachUpdatedAt}`
  ).join("\n");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

export function oldestNotification(items: AppNotification[]) {
  return items.reduce<AppNotification | undefined>((oldest, item) =>
    !oldest || item.createdAt < oldest.createdAt || (item.createdAt === oldest.createdAt && item.id < oldest.id) ? item : oldest,
  undefined);
}

export interface NotificationPage {
  items: AppNotification[];
  unreadCount: number;
  nextCursor: string | null;
  through: string;
}
