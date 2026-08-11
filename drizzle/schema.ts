import { boolean, index, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const memberProfiles = mysqlTable("member_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique().references(() => users.id),
  memberCode: varchar("memberCode", { length: 40 }).notNull().unique(),
  displayName: varchar("displayName", { length: 96 }),
  verificationLevel: mysqlEnum("verificationLevel", ["unverified", "identity-bound", "attested"])
    .notNull()
    .default("unverified"),
  privateByDefault: boolean("privateByDefault").notNull().default(true),
  exportRequestedAt: timestamp("exportRequestedAt"),
  deletionRequestedAt: timestamp("deletionRequestedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const consentGrants = mysqlTable("consent_grants", {
  id: int("id").autoincrement().primaryKey(),
  ownerUserId: int("ownerUserId").notNull().references(() => users.id),
  recipientLabel: varchar("recipientLabel", { length: 120 }).notNull(),
  fieldNamesJson: text("fieldNamesJson").notNull(),
  purpose: varchar("purpose", { length: 280 }).notNull(),
  status: mysqlEnum("status", ["active", "expired", "revoked"]).notNull().default("active"),
  receiptCode: varchar("receiptCode", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expiresAt"),
  revokedAt: timestamp("revokedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({
  ownerIdx: index("consent_grants_owner_idx").on(table.ownerUserId),
}));

export const attestations = mysqlTable("attestations", {
  id: int("id").autoincrement().primaryKey(),
  subjectUserId: int("subjectUserId").notNull().references(() => users.id),
  issuerLabel: varchar("issuerLabel", { length: 140 }).notNull(),
  issuerKind: varchar("issuerKind", { length: 80 }).notNull(),
  scope: varchar("scope", { length: 180 }).notNull(),
  evidenceStatus: mysqlEnum("evidenceStatus", ["not-provided", "declared", "verified", "disputed"])
    .notNull()
    .default("not-provided"),
  status: mysqlEnum("status", ["active", "revoked", "expired", "disputed"]).notNull().default("active"),
  issuedAt: timestamp("issuedAt").defaultNow().notNull(),
  revokedAt: timestamp("revokedAt"),
  disputeSummary: text("disputeSummary"),
}, table => ({
  subjectIdx: index("attestations_subject_idx").on(table.subjectUserId),
}));

export const truthPosts = mysqlTable("truth_posts", {
  id: int("id").autoincrement().primaryKey(),
  authorUserId: int("authorUserId").notNull().references(() => users.id),
  authorLabel: varchar("authorLabel", { length: 96 }).notNull(),
  claimType: mysqlEnum("claimType", ["report", "firsthand_account", "opinion", "analysis", "correction", "question"])
    .notNull(),
  body: text("body").notNull(),
  sourceUrlsJson: text("sourceUrlsJson").notNull(),
  evidenceDigest: varchar("evidenceDigest", { length: 128 }),
  integrityReceipt: varchar("integrityReceipt", { length: 128 }).notNull(),
  identityBound: boolean("identityBound").notNull().default(false),
  integrityBound: boolean("integrityBound").notNull().default(false),
  sourcesDeclared: boolean("sourcesDeclared").notNull().default(false),
  reviewCompleted: boolean("reviewCompleted").notNull().default(false),
  visibility: mysqlEnum("visibility", ["public", "members", "private"]).notNull().default("public"),
  withdrawnAt: timestamp("withdrawnAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  feedIdx: index("truth_posts_feed_idx").on(table.visibility, table.createdAt),
  authorIdx: index("truth_posts_author_idx").on(table.authorUserId),
}));

export const scopedVouches = mysqlTable("scoped_vouches", {
  id: int("id").autoincrement().primaryKey(),
  voucherUserId: int("voucherUserId").notNull().references(() => users.id),
  subjectUserId: int("subjectUserId").notNull().references(() => users.id),
  scope: varchar("scope", { length: 180 }).notNull(),
  note: varchar("note", { length: 500 }),
  status: mysqlEnum("status", ["pending", "active", "declined", "revoked"]).notNull().default("pending"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  respondedAt: timestamp("respondedAt"),
  revokedAt: timestamp("revokedAt"),
}, table => ({
  subjectIdx: index("scoped_vouches_subject_idx").on(table.subjectUserId),
  voucherIdx: index("scoped_vouches_voucher_idx").on(table.voucherUserId),
}));

export const services = mysqlTable("services", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 140 }).notNull(),
  description: text("description").notNull(),
  serviceType: varchar("serviceType", { length: 100 }).notNull(),
  eligibilityRequirement: varchar("eligibilityRequirement", { length: 240 }).notNull(),
  isPublished: boolean("isPublished").notNull().default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({
  publishedIdx: index("services_published_idx").on(table.isPublished),
}));

export const emergencyResources = mysqlTable("emergency_resources", {
  id: int("id").autoincrement().primaryKey(),
  emergencyType: mysqlEnum("emergencyType", ["safety", "shelter", "food", "health", "legal", "other"]).notNull(),
  regionLabel: varchar("regionLabel", { length: 160 }).notNull(),
  resourceName: varchar("resourceName", { length: 160 }).notNull(),
  contactLabel: varchar("contactLabel", { length: 280 }).notNull(),
  contactUrl: varchar("contactUrl", { length: 500 }),
  latitude: varchar("latitude", { length: 32 }),
  longitude: varchar("longitude", { length: 32 }),
  verifiedAt: timestamp("verifiedAt"),
  isPublished: boolean("isPublished").notNull().default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({
  emergencyTypeIdx: index("emergency_resources_type_idx").on(table.emergencyType, table.isPublished),
}));
