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
}

export interface NotificationPage {
  items: AppNotification[];
  unreadCount: number;
  nextCursor: string | null;
  through: string;
}
