import {
  timestamp,
  pgTable,
  text,
  primaryKey,
  integer,
  uuid,
  pgEnum,
  varchar,
  boolean,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { type AdapterAccount } from "next-auth/adapters";

// --- Enums ---
export const roleInternalEnum = pgEnum("role_internal", [
  "HR",
  "CEO",
  "CTO",
  "RECRUITER",
  "OTHER",
]);
export const contactMethodEnum = pgEnum("contact_method", ["EMAIL", "LINKEDIN"]);
export const messageTypeEnum = pgEnum("message_type", ["COLD", "FOLLOW_UP"]);
export const statusEnum = pgEnum("status", [
  "DRAFT",
  "SENT",
  "REPLIED",
  "GHOSTED",
  "INTERVIEW",
  "REJECTED",
  "OFFER",
  "CLOSED",
]);

// --- Email Enums ---
export const emailProviderEnum = pgEnum("email_provider", ["gmail", "outlook"]);
export const trackingEventTypeEnum = pgEnum("tracking_event_type", [
  "open",
  "click",
]);

// --- Auth Schema ---
export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  password: text("password"), // For Credentials provider
  notificationEmail: text("notification_email"),
  receiveNotifications: boolean("receive_notifications").default(true),
  calendarSyncEnabled: boolean("calendar_sync_enabled").default(false),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccount["type"]>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  })
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  })
);


// --- Outreach Schema ---
export const outreach = pgTable("outreach", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  companyName: varchar("company_name", { length: 255 }).notNull(),
  companyLink: text("company_link"),
  roleTargeted: varchar("role_targeted", { length: 255 }).notNull(),
  followUpSentAt: timestamp("follow_up_sent_at", { mode: "date" }),
  followUp2DueAt: timestamp("follow_up_2_due_at", { mode: "date" }),
  followUp2SentAt: timestamp("follow_up_2_sent_at", { mode: "date" }),
  status: statusEnum("status").default("DRAFT").notNull(),
  notes: text("notes"),
  contacts: jsonb("contacts").$type<any[]>().default([]).notNull(),
  calendarSynced: boolean("calendar_synced").default(false),
  calendarEventId: text("calendar_event_id"),
  calendarEventId2: text("calendar_event_id_2"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("outreach_user_id_idx").on(table.userId),
  createdAtIdx: index("outreach_created_at_idx").on(table.createdAt),
}));

// --- Extension Schema ---
export const extensionLeads = pgTable("extension_leads", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  profileUrl: text("profile_url").notNull(),
  personName: varchar("person_name", { length: 255 }).notNull(),
  companyName: varchar("company_name", { length: 255 }),
  companyUrl: text("company_url"),
  position: varchar("position", { length: 255 }).default("Job inquiry"),
  personRole: text("person_role"),
  contactMethod: contactMethodEnum("contact_method").default("LINKEDIN").notNull(),
  emailAddress: varchar("email_address", { length: 255 }),
  outreachDate: timestamp("outreach_date", { mode: "date" }).defaultNow().notNull(),
  followUpDate: timestamp("follow_up_date", { mode: "date" }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("extension_leads_user_id_idx").on(table.userId),
  createdAtIdx: index("extension_leads_created_at_idx").on(table.createdAt),
}));

// --- Email Tracking Schema ---
export const sentEmails = pgTable(
  "sent_emails",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    outreachId: uuid("outreach_id")
      .notNull()
      .references(() => outreach.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    contactIndex: integer("contact_index").notNull().default(0),
    to: text("to").notNull(),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    trackingId: uuid("tracking_id")
      .notNull()
      .$defaultFn(() => crypto.randomUUID()),
    provider: emailProviderEnum("provider").notNull(),
    sentAt: timestamp("sent_at", { mode: "date" }).defaultNow().notNull(),
    openedAt: timestamp("opened_at", { mode: "date" }),
    clickedAt: timestamp("clicked_at", { mode: "date" }),
  },
  (table) => ({
    trackingIdIdx: uniqueIndex("sent_emails_tracking_id_idx").on(
      table.trackingId
    ),
  })
);

export const emailEvents = pgTable("email_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  sentEmailId: uuid("sent_email_id")
    .notNull()
    .references(() => sentEmails.id, { onDelete: "cascade" }),
  trackingId: uuid("tracking_id").notNull(),
  type: trackingEventTypeEnum("type").notNull(),
  url: text("url"),
  userAgent: text("user_agent"),
  ip: text("ip"),
  timestamp: timestamp("timestamp", { mode: "date" }).defaultNow().notNull(),
});

// --- Goals & Streaks Schema ---
export const goals = pgTable("goals", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  dailyTarget: integer("daily_target").notNull().default(3),
  weeklyTarget: integer("weekly_target").notNull().default(10),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

export const dailyActivity = pgTable("daily_activity", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  date: text("date").notNull(), // YYYY-MM-DD format for easy comparison
  outreachCount: integer("outreach_count").notNull().default(0),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  userDateIdx: uniqueIndex("daily_activity_user_date_idx").on(table.userId, table.date),
}));

// --- Relations ---
export const sentEmailsRelations = relations(sentEmails, ({ one, many }) => ({
  outreach: one(outreach, {
    fields: [sentEmails.outreachId],
    references: [outreach.id],
  }),
  user: one(users, {
    fields: [sentEmails.userId],
    references: [users.id],
  }),
  events: many(emailEvents),
}));

export const emailEventsRelations = relations(emailEvents, ({ one }) => ({
  sentEmail: one(sentEmails, {
    fields: [emailEvents.sentEmailId],
    references: [sentEmails.id],
  }),
}));
