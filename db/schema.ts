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
  unique,
  index,
  check,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
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
  timeZone: text("time_zone"),
  preferences: jsonb("preferences").$type<import("@/lib/preferences").AppPreferences>(),
  notificationEmail: text("notification_email"),
  receiveNotifications: boolean("receive_notifications").default(true),
  keyboardShortcuts: jsonb("keyboard_shortcuts").$type<import("@/lib/keyboard-shortcuts").ShortcutPreferences>(),
}, (table) => ({ emailIdx: index("user_email_idx").on(table.email) }));

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


export type OutreachContact = {
  personName: string;
  personRole: string;
  contactMethod: string;
  emailAddress?: string | null;
  linkedinProfileUrl?: string | null;
  // Optional saved permalink to the exact Gmail/Outlook thread (e.g.
  // https://mail.google.com/mail/#sent/<id>). Stored per-contact in JSONB, so
  // no migration is needed. Pasted manually; the live "Open in Gmail" search
  // link is derived from emailAddress and needs nothing stored.
  emailThreadUrl?: string | null;
  messageSentAt?: string | Date;
  followUpDueAt?: string | Date;
};

// --- Outreach Schema ---
export const outreach = pgTable("outreach", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  companyName: varchar("company_name", { length: 255 }).notNull(),
  companyLink: text("company_link"),
  roleTargeted: varchar("role_targeted", { length: 255 }).notNull(),
  applicationSource: text("application_source").notNull().default("DIRECT_EMAIL"),
  applicationUrl: text("application_url"),
  applicationStatus: text("application_status").notNull().default("SENT"),
  followUpSentAt: timestamp("follow_up_sent_at", { mode: "date" }),
  followUp2DueAt: timestamp("follow_up_2_due_at", { mode: "date" }),
  followUp2SentAt: timestamp("follow_up_2_sent_at", { mode: "date" }),
  status: statusEnum("status").default("DRAFT").notNull(),
  notes: text("notes"),
  contacts: jsonb("contacts").$type<OutreachContact[]>().default([]).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  // Covers the default dashboard list / export: WHERE userId ORDER BY createdAt DESC.
  userIdCompanyIdx: index("outreach_user_id_company_idx").on(table.userId, table.companyName),
  userIdCreatedAtIdx: index("outreach_user_id_created_at_idx").on(table.userId, table.createdAt),
  // Covers status-filtered list + getStats grouping. Its (userId) and (userId,status)
  // prefixes also serve those narrower lookups, so no standalone indexes are needed.
  userIdStatusCreatedAtIdx: index("outreach_user_id_status_created_at_idx").on(table.userId, table.status, table.createdAt),
}));

// Existing automation ledger, created externally. outreach_id deliberately has
// no foreign key: match the deployed table rather than changing its lifecycle.
export const automationOutreachEvents = pgTable("automation_outreach_events", {
  eventKey: text("event_key").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  outreachId: uuid("outreach_id").notNull(),
  payloadSha256: text("payload_sha256").notNull(),
  result: text("result").notNull(),
  messageSentAt: timestamp("message_sent_at", { mode: "date" }).notNull(),
  loggedAt: timestamp("logged_at", { mode: "date" }).notNull().default(sql`(now() AT TIME ZONE 'UTC')`),
}, (table) => ({
  payloadCheck: check("automation_outreach_events_payload_sha256_check", sql`${table.payloadSha256} ~ '^[0-9a-f]{64}$'`),
  resultCheck: check("automation_outreach_events_result_check", sql`${table.result} IN ('created', 'merged')`),
}));

// Per-email tracking, separate from company contacts and initial-send receipts.
// Requires the reviewed 0012_email_open_tracking.PROPOSED.sql migration.
export const outreachEmailMessages = pgTable("outreach_email_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  outreachId: uuid("outreach_id").references(() => outreach.id, { onDelete: "cascade" }),
  attemptId: text("attempt_id").notNull(), senderHash: text("sender_hash").notNull(),
  recipient: text("recipient").notNull(), subject: varchar("subject", { length: 300 }).notNull(),
  kind: text("kind").notNull(), tokenHash: text("token_hash").notNull(),
  deliveryState: text("delivery_state").notNull().default("prepared"),
  trackingEnabled: boolean("tracking_enabled").notNull().default(true), providerId: text("provider_id"),
  sentAt: timestamp("sent_at", { withTimezone: true, mode: "date" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  firstOpenAt: timestamp("first_open_at", { withTimezone: true, mode: "date" }),
  lastOpenAt: timestamp("last_open_at", { withTimezone: true, mode: "date" }),
  openCount: integer("open_count").notNull().default(0),
  windowStart: timestamp("window_start", { withTimezone: true, mode: "date" }),
  windowCount: integer("window_count").notNull().default(0),
}, table => ({
  ownerAttempt: unique("outreach_email_messages_user_id_attempt_id_key").on(table.userId, table.attemptId),
  tokenUnique: unique("outreach_email_messages_token_hash_key").on(table.tokenHash),
  ownerOutreach: index("outreach_email_messages_owner_outreach_idx").on(table.userId, table.outreachId, table.sentAt),
  attemptCheck: check("outreach_email_messages_attempt_id_check", sql`${table.attemptId} ~ '^[0-9a-f]{32}$'`),
  senderCheck: check("outreach_email_messages_sender_hash_check", sql`${table.senderHash} ~ '^[0-9a-f]{64}$'`),
  tokenCheck: check("outreach_email_messages_token_hash_check", sql`${table.tokenHash} ~ '^[0-9a-f]{64}$'`),
  kindCheck: check("outreach_email_messages_kind_check", sql`${table.kind} IN ('initial','follow_up_1','follow_up_2')`),
  stateCheck: check("outreach_email_messages_delivery_state_check", sql`${table.deliveryState} IN ('prepared','accepted','failed','ambiguous')`),
  countCheck: check("outreach_email_messages_open_count_check", sql`${table.openCount} BETWEEN 0 AND 10000`),
  windowCheck: check("outreach_email_messages_window_count_check", sql`${table.windowCount} BETWEEN 0 AND 60`),
  acceptedCheck: check("outreach_email_messages_check", sql`${table.deliveryState} <> 'accepted' OR (${table.providerId} IS NOT NULL AND ${table.sentAt} IS NOT NULL)`),
}));
export const outreachEmailOpenEvents = pgTable("outreach_email_open_events", {
  id: uuid("id").primaryKey(),
  messageId: uuid("message_id").notNull().references(() => outreachEmailMessages.id, { onDelete: "cascade" }),
  observedAt: timestamp("observed_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, table => ({ messageTime: index("outreach_email_open_events_message_time_idx").on(table.messageId, table.observedAt) }));

// Durable inbox: event IDs deduplicate notifications without tying their retention
// to the raw tracking event log. Deleting an outreach removes its notifications.
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  outreachId: uuid("outreach_id").notNull().references(() => outreach.id, { onDelete: "cascade" }),
  recipient: text("recipient").notNull(),
  subject: varchar("subject", { length: 300 }).notNull(),
  observedAt: timestamp("observed_at", { withTimezone: true, mode: "date" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  readAt: timestamp("read_at", { withTimezone: true, mode: "date" }),
  clearedAt: timestamp("cleared_at", { withTimezone: true, mode: "date" }),
}, table => ({
  ownerTime: index("notifications_owner_time_idx").on(table.userId, table.createdAt, table.id),
  ownerUnread: index("notifications_owner_unread_idx").on(table.userId, table.createdAt).where(sql`${table.readAt} IS NULL`),
  ownerVisible: index("notifications_owner_visible_idx").on(table.userId, table.createdAt, table.id).where(sql`${table.clearedAt} IS NULL`),
  outreachIdx: index("notifications_outreach_idx").on(table.outreachId),
}));

// --- Personal message templates ---
export const messageTemplates = pgTable("message_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 200 }).notNull(),
  subject: varchar("subject", { length: 500 }).notNull().default(""),
  body: text("body").notNull(),
  category: varchar("category", { length: 80 }).notNull().default(""),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  characterLimit: integer("character_limit"),
  favorite: boolean("favorite").notNull().default(false),
  pinned: boolean("pinned").notNull().default(false),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("message_templates_user_id_idx").on(table.userId),
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
  userIdCreatedAtIdx: index("extension_leads_user_id_created_at_idx").on(table.userId, table.createdAt),
  userIdIdx: index("extension_leads_user_id_idx").on(table.userId),
  createdAtIdx: index("extension_leads_created_at_idx").on(table.createdAt),
}));

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
}, (table) => ({ userIdIdx: index("goals_user_id_idx").on(table.userId) }));

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
  userDateUnique: unique("daily_activity_user_date_unique").on(table.userId, table.date),
}));

// --- Startups Schema ---
export const startups = pgTable("startups", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  fundingAmount: varchar("funding_amount", { length: 255 }),
  fundingDate: text("funding_date"),
  fundingRound: varchar("funding_round", { length: 255 }),
  isHiring: boolean("is_hiring").default(false),
  isTrending: boolean("is_trending").default(false),
  location: varchar("location", { length: 255 }),
  logoUrl: text("logo_url"),
  savesCount: integer("saves_count").default(0),
  sector: varchar("sector", { length: 255 }),
  slug: varchar("slug", { length: 255 }).unique(),
  teamSize: varchar("team_size", { length: 255 }),
  website: text("website"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

export const startupEmployees = pgTable("startup_employees", {
  id: uuid("id").defaultRandom().primaryKey(),
  startupId: uuid("startup_id")
    .notNull()
    .references(() => startups.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 255 }),
  email: varchar("email", { length: 255 }),
  linkedinUrl: text("linkedin_url"),
  status: varchar("status", { length: 50 }).default("pending"),
  emailsSent: integer("emails_sent").default(0),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  // FK used by the `with: { employees: true }` relation load on the startups page.
  startupIdIdx: index("startup_employees_startup_id_idx").on(table.startupId),
}));


export const startupTracking = pgTable("startup_tracking", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  startupId: uuid("startup_id")
    .notNull()
    .references(() => startups.id, { onDelete: "cascade" }),
  outreachDone: boolean("outreach_done").default(false).notNull(),
  followUpDate: timestamp("follow_up_date", { mode: "date" }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  userStartupIdx: uniqueIndex("startup_tracking_user_startup_idx").on(table.userId, table.startupId),
}));

// --- Relations ---
export const startupsRelations = relations(startups, ({ many }) => ({
  tracking: many(startupTracking),
  employees: many(startupEmployees),
}));

export const startupEmployeesRelations = relations(startupEmployees, ({ one }) => ({
  startup: one(startups, {
    fields: [startupEmployees.startupId],
    references: [startups.id],
  }),
}));


export const startupTrackingRelations = relations(startupTracking, ({ one }) => ({
  user: one(users, {
    fields: [startupTracking.userId],
    references: [users.id],
  }),
  startup: one(startups, {
    fields: [startupTracking.startupId],
    references: [startups.id],
  }),
}));

