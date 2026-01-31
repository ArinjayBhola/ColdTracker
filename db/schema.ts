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
} from "drizzle-orm/pg-core";
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
  (verificationToken) => ({
    compositePk: primaryKey({
      columns: [verificationToken.identifier, verificationToken.token],
    }),
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
  personName: varchar("person_name", { length: 255 }).notNull(),
  personRole: roleInternalEnum("person_role").notNull(),
  contactMethod: contactMethodEnum("contact_method").notNull(),
  emailAddress: varchar("email_address", { length: 255 }),
  linkedinProfileUrl: text("linkedin_profile_url"),
  messageType: messageTypeEnum("message_type").default("COLD").notNull(),
  messageSentAt: timestamp("message_sent_at", { mode: "date" }).defaultNow().notNull(),
  followUpDueAt: timestamp("follow_up_due_at", { mode: "date" }).notNull(), // Should be calculated
  followUpSentAt: timestamp("follow_up_sent_at", { mode: "date" }),
  status: statusEnum("status").default("DRAFT").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});
