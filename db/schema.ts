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
  userIdCreatedAtIdx: index("outreach_user_id_created_at_idx").on(table.userId, table.createdAt),
  // Covers status-filtered list + getStats grouping. Its (userId) and (userId,status)
  // prefixes also serve those narrower lookups, so no standalone indexes are needed.
  userIdStatusCreatedAtIdx: index("outreach_user_id_status_created_at_idx").on(table.userId, table.status, table.createdAt),
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

