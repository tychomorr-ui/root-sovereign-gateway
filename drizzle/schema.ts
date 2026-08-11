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
  issuedByUserId: int("issuedByUserId").references(() => users.id),
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
sourceUrl: varchar("sourceUrl", { length: 500 }).notNull(),
verifiedAt: timestamp("verifiedAt"),
reviewDueAt: timestamp("reviewDueAt"),
publishedAt: timestamp("publishedAt"),
publishedByUserId: int("publishedByUserId").references(() => users.id),
  nodeId: int("nodeId"),
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
sourceUrl: varchar("sourceUrl", { length: 500 }).notNull(),
latitude: varchar("latitude", { length: 32 }),
longitude: varchar("longitude", { length: 32 }),
verifiedAt: timestamp("verifiedAt"),
reviewDueAt: timestamp("reviewDueAt"),
publishedAt: timestamp("publishedAt"),
publishedByUserId: int("publishedByUserId").references(() => users.id),
  nodeId: int("nodeId"),
isPublished: boolean("isPublished").notNull().default(false),
createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({
  emergencyTypeIdx: index("emergency_resources_type_idx").on(table.emergencyType, table.isPublished),
}));

export const operators = mysqlTable("operators", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique().references(() => users.id),
  operatorLabel: varchar("operatorLabel", { length: 120 }).notNull(),
  governanceRole: mysqlEnum("governanceRole", ["first_executive", "issuer", "directory_steward", "incident_reviewer"]).notNull(),
  status: mysqlEnum("status", ["active", "suspended"]).notNull().default("active"),
  approvedByUserId: int("approvedByUserId").notNull().references(() => users.id),
  approvedAt: timestamp("approvedAt").defaultNow().notNull(),
  conflictDisclosureConfirmed: boolean("conflictDisclosureConfirmed").notNull().default(false),
  reviewDueAt: timestamp("reviewDueAt"),
  suspendedAt: timestamp("suspendedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  activeRoleIdx: index("operators_active_role_idx").on(table.status, table.governanceRole),
}));

export const operatorAudits = mysqlTable("operator_audits", {
  id: int("id").autoincrement().primaryKey(),
  operatorId: int("operatorId").notNull().references(() => operators.id),
  actorUserId: int("actorUserId").notNull().references(() => users.id),
  action: mysqlEnum("action", ["approved", "role_updated", "suspended", "reactivated", "reviewed"]).notNull(),
  details: varchar("details", { length: 500 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({
	operatorAuditIdx: index("operator_audits_operator_idx").on(table.operatorId, table.createdAt),
}));

export const operatorIntakes = mysqlTable("operator_intakes", {
  id: int("id").autoincrement().primaryKey(),
  submittedByUserId: int("submittedByUserId").notNull().references(() => users.id),
  candidateMemberCode: varchar("candidateMemberCode", { length: 40 }).notNull(),
  candidateLabel: varchar("candidateLabel", { length: 120 }).notNull(),
  requestedRole: mysqlEnum("requestedRole", ["issuer", "directory_steward", "incident_reviewer"]).notNull(),
  regionalScope: varchar("regionalScope", { length: 160 }).notNull(),
  conflictDisclosure: text("conflictDisclosure").notNull(),
  status: mysqlEnum("status", ["submitted", "approved", "declined"]).notNull().default("submitted"),
  reviewedByUserId: int("reviewedByUserId").references(() => users.id),
  reviewedAt: timestamp("reviewedAt"),
  decisionNote: varchar("decisionNote", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  statusIdx: index("operator_intakes_status_idx").on(table.status, table.createdAt),
  submitterIdx: index("operator_intakes_submitter_idx").on(table.submittedByUserId, table.createdAt),
}));

export const operatorIntakeAudits = mysqlTable("operator_intake_audits", {
  id: int("id").autoincrement().primaryKey(),
  intakeId: int("intakeId").notNull().references(() => operatorIntakes.id),
  actorUserId: int("actorUserId").notNull().references(() => users.id),
  action: mysqlEnum("action", ["approved", "declined"]).notNull(),
  decisionNote: varchar("decisionNote", { length: 500 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({
  intakeAuditIdx: index("operator_intake_audits_intake_idx").on(table.intakeId, table.createdAt),
}));

export const monarchNodes = mysqlTable("monarch_nodes", {
  id: int("id").autoincrement().primaryKey(),
  nodeCode: varchar("nodeCode", { length: 24 }).notNull().unique(),
  nodeLabel: varchar("nodeLabel", { length: 140 }).notNull(),
  layer: mysqlEnum("layer", ["anchor", "relay", "signal"]).notNull(),
  mandate: varchar("mandate", { length: 280 }).notNull(),
  regionLabel: varchar("regionLabel", { length: 160 }),
  capabilityManifestJson: text("capabilityManifestJson").notNull(),
  status: mysqlEnum("status", ["planned", "active", "suspended"]).notNull().default("planned"),
  operatorUserId: int("operatorUserId").references(() => users.id),
  approvedByUserId: int("approvedByUserId").notNull().references(() => users.id),
  approvedAt: timestamp("approvedAt").defaultNow().notNull(),
  reviewDueAt: timestamp("reviewDueAt"),
  suspendedAt: timestamp("suspendedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  codeIdx: index("monarch_nodes_code_idx").on(table.nodeCode),
  statusIdx: index("monarch_nodes_status_layer_idx").on(table.status, table.layer),
}));

export const monarchNodeAudits = mysqlTable("monarch_node_audits", {
  id: int("id").autoincrement().primaryKey(),
  nodeId: int("nodeId").notNull().references(() => monarchNodes.id),
  actorUserId: int("actorUserId").notNull().references(() => users.id),
  action: mysqlEnum("action", ["registered", "reviewed", "suspended", "reactivated"]).notNull(),
  details: varchar("details", { length: 500 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({
  nodeAuditIdx: index("monarch_node_audits_node_idx").on(table.nodeId, table.createdAt),
}));
