import { and, desc, eq, isNull, or } from "drizzle-orm";
import {
  attestations,
  consentGrants,
  emergencyResources,
  memberProfiles,
  monarchNodeAudits,
  monarchNodes,
  operatorAudits,
  operatorIntakeAudits,
  operatorIntakes,
  operators,
  personalIdentities,
  projectReclaimAudits,
  projectReclaimInterests,
  projectReclaimSources,
  scopedVouches,
  services,
  truthPosts,
} from "../drizzle/schema";
import { getDb } from "./db";

function requireDb<T>(db: T | null): T {
  if (!db) throw new Error("ROOT data store is unavailable.");
  return db;
}

export async function getOrCreateMemberProfile(userId: number) {
  const db = requireDb(await getDb());
  const existing = await db.select().from(memberProfiles).where(eq(memberProfiles.userId, userId)).limit(1);
  if (existing[0]) return existing[0];

  const memberCode = `root-${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`;
  await db.insert(memberProfiles).values({ userId, memberCode });
  const created = await db.select().from(memberProfiles).where(eq(memberProfiles.userId, userId)).limit(1);
  if (!created[0]) throw new Error("Unable to create a ROOT member profile.");
  return created[0];
}

export async function getPersonalIdentity(ownerUserId: number) {
  const db = requireDb(await getDb());
  const records = await db.select().from(personalIdentities).where(eq(personalIdentities.ownerUserId, ownerUserId)).limit(1);
  return records[0];
}

export async function createPersonalIdentity(input: { ownerUserId: number; label: string }) {
  const db = requireDb(await getDb());
  const existing = await getPersonalIdentity(input.ownerUserId);
  if (existing) return existing;
  const personalMemberCode = `root-personal-${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`;
  await db.insert(personalIdentities).values({ ...input, personalMemberCode, status: "active" });
  const created = await getPersonalIdentity(input.ownerUserId);
  if (!created) throw new Error("Unable to create the private personal ROOT identity.");
  return created;
}

export async function updateMemberProfile(userId: number, displayName: string | null) {
  const db = requireDb(await getDb());
  await getOrCreateMemberProfile(userId);
  await db.update(memberProfiles).set({ displayName }).where(eq(memberProfiles.userId, userId));
  return getOrCreateMemberProfile(userId);
}

export async function markExportRequested(userId: number) {
  const db = requireDb(await getDb());
  await getOrCreateMemberProfile(userId);
  await db.update(memberProfiles).set({ exportRequestedAt: new Date() }).where(eq(memberProfiles.userId, userId));
}

export async function markDeletionRequested(userId: number) {
  const db = requireDb(await getDb());
  await getOrCreateMemberProfile(userId);
  await db.update(memberProfiles).set({ deletionRequestedAt: new Date() }).where(eq(memberProfiles.userId, userId));
}

export async function createConsentGrant(input: {
  ownerUserId: number;
  recipientLabel: string;
  fieldNames: string[];
  purpose: string;
  receiptCode: string;
  expiresAt: Date | null;
}) {
  const db = requireDb(await getDb());
  await db.insert(consentGrants).values({
    ownerUserId: input.ownerUserId,
    recipientLabel: input.recipientLabel,
    fieldNamesJson: JSON.stringify(input.fieldNames),
    purpose: input.purpose,
    receiptCode: input.receiptCode,
    expiresAt: input.expiresAt,
  });
  const row = await db.select().from(consentGrants).where(eq(consentGrants.receiptCode, input.receiptCode)).limit(1);
  if (!row[0]) throw new Error("Unable to create consent grant.");
  return row[0];
}

export async function listConsentGrants(ownerUserId: number) {
  const db = requireDb(await getDb());
  const records = await db
    .select()
    .from(consentGrants)
    .where(eq(consentGrants.ownerUserId, ownerUserId))
    .orderBy(desc(consentGrants.createdAt));
  const now = new Date();
  return Promise.all(records.map(async record => {
    if (record.status === "active" && record.expiresAt && record.expiresAt <= now) {
      await db.update(consentGrants).set({ status: "expired" }).where(eq(consentGrants.id, record.id));
      return { ...record, status: "expired" as const };
    }
    return record;
  }));
}

export async function revokeConsentGrant(ownerUserId: number, grantId: number) {
  const db = requireDb(await getDb());
  await db.update(consentGrants).set({ status: "revoked", revokedAt: new Date() }).where(and(
    eq(consentGrants.id, grantId),
    eq(consentGrants.ownerUserId, ownerUserId),
  ));
}

export async function listMemberAttestations(userId: number) {
  const db = requireDb(await getDb());
  return db.select().from(attestations).where(eq(attestations.subjectUserId, userId)).orderBy(desc(attestations.issuedAt));
}

export async function listIssuedAttestations() {
  const db = requireDb(await getDb());
  return db.select().from(attestations).orderBy(desc(attestations.issuedAt)).limit(100);
}

export async function listIssuedAttestationsForOperator(issuedByUserId: number) {
  const db = requireDb(await getDb());
  return db.select().from(attestations).where(eq(attestations.issuedByUserId, issuedByUserId)).orderBy(desc(attestations.issuedAt)).limit(100);
}

export type GovernanceRole = "first_executive" | "issuer" | "directory_steward" | "incident_reviewer";

export async function getActiveOperatorForUser(userId: number) {
  const db = requireDb(await getDb());
  const records = await db.select().from(operators).where(and(eq(operators.userId, userId), eq(operators.status, "active"))).limit(1);
  return records[0];
}

export async function bootstrapFirstExecutive(input: { userId: number; operatorLabel: string }) {
  const db = requireDb(await getDb());
  const existing = await db.select().from(operators).where(eq(operators.userId, input.userId)).limit(1);
  if (existing[0]) return existing[0];
  const reviewDueAt = new Date();
  reviewDueAt.setMonth(reviewDueAt.getMonth() + 3);
  await db.insert(operators).values({
    userId: input.userId,
    operatorLabel: input.operatorLabel,
    governanceRole: "first_executive",
    status: "active",
    approvedByUserId: input.userId,
    conflictDisclosureConfirmed: true,
    reviewDueAt,
  });
  const created = await db.select().from(operators).where(eq(operators.userId, input.userId)).limit(1);
  if (!created[0]) throw new Error("Unable to create the First Executive roster record.");
  await db.insert(operatorAudits).values({ operatorId: created[0].id, actorUserId: input.userId, action: "approved", details: "Initial First Executive roster bootstrap." });
  return created[0];
}

export async function listOperators() {
  const db = requireDb(await getDb());
  return db.select().from(operators).orderBy(desc(operators.approvedAt));
}

export async function listOperatorAudits() {
  const db = requireDb(await getDb());
  return db.select().from(operatorAudits).orderBy(desc(operatorAudits.createdAt)).limit(200);
}

export type RequestedOperatorRole = "issuer" | "directory_steward" | "incident_reviewer";

export async function createOperatorIntake(input: {
  submittedByUserId: number;
  candidateMemberCode: string;
  candidateLabel: string;
  requestedRole: RequestedOperatorRole;
  regionalScope: string;
  conflictDisclosure: string;
}) {
  const db = requireDb(await getDb());
  await db.insert(operatorIntakes).values(input);
  const created = await db.select().from(operatorIntakes).where(and(
    eq(operatorIntakes.submittedByUserId, input.submittedByUserId),
    eq(operatorIntakes.candidateMemberCode, input.candidateMemberCode),
  )).orderBy(desc(operatorIntakes.createdAt)).limit(1);
  if (!created[0]) throw new Error("Unable to save the private operator intake.");
  return created[0];
}

export async function listOperatorIntakes() {
  const db = requireDb(await getDb());
  return db.select().from(operatorIntakes).orderBy(desc(operatorIntakes.createdAt)).limit(100);
}

export async function listOperatorIntakeAudits() {
  const db = requireDb(await getDb());
  return db.select().from(operatorIntakeAudits).orderBy(desc(operatorIntakeAudits.createdAt)).limit(200);
}

export async function getOperatorIntake(intakeId: number) {
  const db = requireDb(await getDb());
  const records = await db.select().from(operatorIntakes).where(eq(operatorIntakes.id, intakeId)).limit(1);
  return records[0];
}

export async function reviewOperatorIntake(input: {
  intakeId: number;
  status: "approved" | "declined";
  reviewedByUserId: number;
  decisionNote: string | null;
}) {
  const db = requireDb(await getDb());
  await db.update(operatorIntakes).set({
    status: input.status,
    reviewedByUserId: input.reviewedByUserId,
    reviewedAt: new Date(),
    decisionNote: input.decisionNote,
  }).where(and(eq(operatorIntakes.id, input.intakeId), eq(operatorIntakes.status, "submitted")));
}

export async function recordOperatorIntakeAudit(input: {
  intakeId: number;
  actorUserId: number;
  action: "approved" | "declined";
  decisionNote: string;
}) {
  const db = requireDb(await getDb());
  await db.insert(operatorIntakeAudits).values(input);
}

export async function approveOperator(input: {
  userId: number;
  operatorLabel: string;
  governanceRole: GovernanceRole;
  approvedByUserId: number;
  reviewDueAt: Date;
}) {
  const db = requireDb(await getDb());
  const existing = await db.select().from(operators).where(eq(operators.userId, input.userId)).limit(1);
  if (existing[0]) throw new Error("This member already has an operator roster record.");
  await db.insert(operators).values({ ...input, status: "active", conflictDisclosureConfirmed: true });
  const created = await db.select().from(operators).where(eq(operators.userId, input.userId)).limit(1);
  if (!created[0]) throw new Error("Unable to approve the operator.");
  await db.insert(operatorAudits).values({ operatorId: created[0].id, actorUserId: input.approvedByUserId, action: "approved", details: `Approved as ${input.governanceRole}.` });
  return created[0];
}

export async function setOperatorStatus(input: { operatorId: number; status: "active" | "suspended"; actorUserId: number }) {
  const db = requireDb(await getDb());
  await db.update(operators).set({ status: input.status, suspendedAt: input.status === "suspended" ? new Date() : null }).where(eq(operators.id, input.operatorId));
  await db.insert(operatorAudits).values({ operatorId: input.operatorId, actorUserId: input.actorUserId, action: input.status === "suspended" ? "suspended" : "reactivated", details: `Operator status set to ${input.status}.` });
}

export type MonarchNodeLayer = "anchor" | "relay" | "signal";

export async function listMonarchNodes() {
  const db = requireDb(await getDb());
  return db.select().from(monarchNodes).orderBy(monarchNodes.layer, monarchNodes.nodeCode);
}

export async function getActiveMonarchNode(nodeId: number) {
  const db = requireDb(await getDb());
  const records = await db.select().from(monarchNodes).where(and(eq(monarchNodes.id, nodeId), eq(monarchNodes.status, "active"))).limit(1);
  return records[0];
}

export async function listMonarchNodeAudits() {
  const db = requireDb(await getDb());
  return db.select().from(monarchNodeAudits).orderBy(desc(monarchNodeAudits.createdAt)).limit(200);
}

export async function registerMonarchNode(input: {
  nodeCode: string;
  nodeLabel: string;
  layer: MonarchNodeLayer;
  mandate: string;
  regionLabel: string | null;
  capabilityManifest: string[];
  status: "planned" | "active";
  operatorUserId: number | null;
  approvedByUserId: number;
  reviewDueAt: Date;
}) {
  const db = requireDb(await getDb());
  const existing = await db.select().from(monarchNodes).where(eq(monarchNodes.nodeCode, input.nodeCode)).limit(1);
  if (existing[0]) throw new Error("This Monarch node code is already registered.");
  await db.insert(monarchNodes).values({
    nodeCode: input.nodeCode,
    nodeLabel: input.nodeLabel,
    layer: input.layer,
    mandate: input.mandate,
    regionLabel: input.regionLabel,
    capabilityManifestJson: JSON.stringify(input.capabilityManifest),
    status: input.status,
    operatorUserId: input.operatorUserId,
    approvedByUserId: input.approvedByUserId,
    reviewDueAt: input.reviewDueAt,
  });
  const created = await db.select().from(monarchNodes).where(eq(monarchNodes.nodeCode, input.nodeCode)).limit(1);
  if (!created[0]) throw new Error("Unable to register the Monarch node.");
  await db.insert(monarchNodeAudits).values({ nodeId: created[0].id, actorUserId: input.approvedByUserId, action: "registered", details: `Registered ${input.status} ${input.layer} node.` });
  return created[0];
}

export async function setMonarchNodeStatus(input: { nodeId: number; status: "active" | "suspended"; actorUserId: number }) {
  const db = requireDb(await getDb());
  await db.update(monarchNodes).set({ status: input.status, suspendedAt: input.status === "suspended" ? new Date() : null }).where(eq(monarchNodes.id, input.nodeId));
  await db.insert(monarchNodeAudits).values({ nodeId: input.nodeId, actorUserId: input.actorUserId, action: input.status === "suspended" ? "suspended" : "reactivated", details: `Node status set to ${input.status}.` });
}

export async function markMonarchNodeReviewed(input: { nodeId: number; actorUserId: number }) {
  const db = requireDb(await getDb());
  const reviewDueAt = new Date();
  reviewDueAt.setMonth(reviewDueAt.getMonth() + 3);
  await db.update(monarchNodes).set({ reviewDueAt }).where(eq(monarchNodes.id, input.nodeId));
  await db.insert(monarchNodeAudits).values({ nodeId: input.nodeId, actorUserId: input.actorUserId, action: "reviewed", details: "Node mandate and capability manifest reviewed." });
}

export async function createAttestation(input: {
  subjectUserId: number;
  issuedByUserId: number;
  issuerLabel: string;
  issuerKind: string;
  scope: string;
  evidenceStatus: "not-provided" | "declared" | "verified" | "disputed";
}) {
  const db = requireDb(await getDb());
  await db.insert(attestations).values(input);
}

export async function revokeAttestation(attestationId: number) {
  const db = requireDb(await getDb());
  await db.update(attestations).set({ status: "revoked", revokedAt: new Date() }).where(eq(attestations.id, attestationId));
}

export async function listMemberVouches(userId: number) {
  const db = requireDb(await getDb());
  return db.select().from(scopedVouches).where(or(
    eq(scopedVouches.subjectUserId, userId),
    eq(scopedVouches.voucherUserId, userId),
  )).orderBy(desc(scopedVouches.createdAt));
}

export async function createTruthPost(input: {
  authorUserId: number;
  authorLabel: string;
  claimType: "report" | "firsthand_account" | "opinion" | "analysis" | "correction" | "question";
  body: string;
  sourceUrls: string[];
  evidenceDigest: string | null;
  integrityReceipt: string;
  visibility: "public" | "members" | "private";
}) {
  const db = requireDb(await getDb());
  await db.insert(truthPosts).values({
    authorUserId: input.authorUserId,
    authorLabel: input.authorLabel,
    claimType: input.claimType,
    body: input.body,
    sourceUrlsJson: JSON.stringify(input.sourceUrls),
    evidenceDigest: input.evidenceDigest,
    integrityReceipt: input.integrityReceipt,
    identityBound: true,
    integrityBound: true,
    sourcesDeclared: input.sourceUrls.length > 0,
    reviewCompleted: false,
    visibility: input.visibility,
  });
}

export async function listPublicTruthPosts() {
  const db = requireDb(await getDb());
  return db.select().from(truthPosts).where(and(
    eq(truthPosts.visibility, "public"),
    isNull(truthPosts.withdrawnAt),
  )).orderBy(desc(truthPosts.createdAt)).limit(60);
}

export async function listOwnTruthPosts(userId: number) {
  const db = requireDb(await getDb());
  return db.select().from(truthPosts).where(eq(truthPosts.authorUserId, userId)).orderBy(desc(truthPosts.createdAt));
}

export async function withdrawTruthPost(userId: number, postId: number) {
  const db = requireDb(await getDb());
  await db.update(truthPosts).set({ withdrawnAt: new Date() }).where(and(
    eq(truthPosts.id, postId),
    eq(truthPosts.authorUserId, userId),
  ));
}

export async function findProfileByMemberCode(memberCode: string) {
  const db = requireDb(await getDb());
  const result = await db.select().from(memberProfiles).where(eq(memberProfiles.memberCode, memberCode)).limit(1);
  return result[0];
}

export async function createScopedVouch(input: {
  voucherUserId: number;
  subjectUserId: number;
  scope: string;
  note: string | null;
}) {
  const db = requireDb(await getDb());
  await db.insert(scopedVouches).values(input);
}

export async function getScopedVouch(vouchId: number) {
  const db = requireDb(await getDb());
  const result = await db.select().from(scopedVouches).where(eq(scopedVouches.id, vouchId)).limit(1);
  return result[0];
}

export async function respondToScopedVouch(vouchId: number, status: "active" | "declined") {
  const db = requireDb(await getDb());
  await db.update(scopedVouches).set({ status, respondedAt: new Date() }).where(eq(scopedVouches.id, vouchId));
}

export async function revokeScopedVouch(vouchId: number) {
  const db = requireDb(await getDb());
  await db.update(scopedVouches).set({ status: "revoked", revokedAt: new Date() }).where(eq(scopedVouches.id, vouchId));
}

export type ProjectReclaimPillar = "health" | "housing" | "work" | "education" | "community" | "independence";
export type ProjectReclaimSourceKind = "resource" | "opportunity";
export type ProjectReclaimCounty = "mendocino" | "lake";
export type ProjectReclaimSourceStatus = "draft" | "internal_watchlist" | "published" | "unpublished";

function nextProjectReclaimReview() {
  const reviewDueAt = new Date();
  reviewDueAt.setMonth(reviewDueAt.getMonth() + 3);
  return reviewDueAt;
}

export async function listPublishedProjectReclaimSources() {
  const db = requireDb(await getDb());
  return db.select().from(projectReclaimSources).where(eq(projectReclaimSources.status, "published")).orderBy(projectReclaimSources.county, projectReclaimSources.pillar, projectReclaimSources.title);
}

export async function listManagedProjectReclaimSources() {
  const db = requireDb(await getDb());
  return db.select().from(projectReclaimSources).orderBy(desc(projectReclaimSources.createdAt));
}

export async function getProjectReclaimSource(sourceId: number) {
  const db = requireDb(await getDb());
  const records = await db.select().from(projectReclaimSources).where(eq(projectReclaimSources.id, sourceId)).limit(1);
  return records[0];
}

export async function createProjectReclaimSource(input: {
  title: string;
  description: string;
  pillar: ProjectReclaimPillar;
  sourceKind: ProjectReclaimSourceKind;
  county: ProjectReclaimCounty;
  sourceUrl: string;
  availabilityNote: string;
  nodeId: number | null;
  status: "draft" | "internal_watchlist" | "published";
  createdByUserId: number;
}) {
  const db = requireDb(await getDb());
  const now = new Date();
  await db.insert(projectReclaimSources).values({
    ...input,
    verifiedAt: now,
    reviewDueAt: nextProjectReclaimReview(),
    publishedAt: input.status === "published" ? now : null,
    publishedByUserId: input.status === "published" ? input.createdByUserId : null,
  });
  const created = await db.select().from(projectReclaimSources).where(and(
    eq(projectReclaimSources.createdByUserId, input.createdByUserId),
    eq(projectReclaimSources.title, input.title),
  )).orderBy(desc(projectReclaimSources.createdAt)).limit(1);
  if (!created[0]) throw new Error("Unable to create the Project Reclaim source record.");
  await db.insert(projectReclaimAudits).values({
    sourceId: created[0].id,
    actorUserId: input.createdByUserId,
    action: input.status === "internal_watchlist" ? "watchlisted" : input.status === "published" ? "published" : "created",
    details: input.status === "published" ? "Source published after active-node validation." : `Source recorded as ${input.status}.`,
  });
  return created[0];
}

export async function setProjectReclaimSourceStatus(input: { sourceId: number; status: "published" | "unpublished" | "internal_watchlist"; actorUserId: number }) {
  const db = requireDb(await getDb());
  const now = new Date();
  await db.update(projectReclaimSources).set({
    status: input.status,
    publishedAt: input.status === "published" ? now : null,
    publishedByUserId: input.status === "published" ? input.actorUserId : null,
    reviewDueAt: input.status === "published" ? nextProjectReclaimReview() : null,
  }).where(eq(projectReclaimSources.id, input.sourceId));
  await db.insert(projectReclaimAudits).values({
    sourceId: input.sourceId,
    actorUserId: input.actorUserId,
    action: input.status === "published" ? "published" : input.status === "unpublished" ? "unpublished" : "watchlisted",
    details: `Source status set to ${input.status}.`,
  });
}

export async function markProjectReclaimSourceReviewed(input: { sourceId: number; actorUserId: number }) {
  const db = requireDb(await getDb());
  await db.update(projectReclaimSources).set({ verifiedAt: new Date(), reviewDueAt: nextProjectReclaimReview() }).where(eq(projectReclaimSources.id, input.sourceId));
  await db.insert(projectReclaimAudits).values({ sourceId: input.sourceId, actorUserId: input.actorUserId, action: "reviewed", details: "Source URL, availability note, and regional status reviewed." });
}

export async function listProjectReclaimAudits() {
  const db = requireDb(await getDb());
  return db.select().from(projectReclaimAudits).orderBy(desc(projectReclaimAudits.createdAt)).limit(200);
}

export async function saveProjectReclaimInterest(input: { ownerUserId: number; sourceId: number; privateNote: string | null }) {
  const db = requireDb(await getDb());
  const existing = await db.select().from(projectReclaimInterests).where(and(
    eq(projectReclaimInterests.ownerUserId, input.ownerUserId),
    eq(projectReclaimInterests.sourceId, input.sourceId),
  )).limit(1);
  if (existing[0]) {
    await db.update(projectReclaimInterests).set({ privateNote: input.privateNote }).where(eq(projectReclaimInterests.id, existing[0].id));
    return existing[0];
  }
  await db.insert(projectReclaimInterests).values(input);
  const created = await db.select().from(projectReclaimInterests).where(and(
    eq(projectReclaimInterests.ownerUserId, input.ownerUserId),
    eq(projectReclaimInterests.sourceId, input.sourceId),
  )).orderBy(desc(projectReclaimInterests.createdAt)).limit(1);
  if (!created[0]) throw new Error("Unable to save the private Project Reclaim interest.");
  return created[0];
}

export async function listOwnProjectReclaimInterests(ownerUserId: number) {
  const db = requireDb(await getDb());
  return db.select({ interest: projectReclaimInterests, source: projectReclaimSources }).from(projectReclaimInterests)
    .innerJoin(projectReclaimSources, eq(projectReclaimInterests.sourceId, projectReclaimSources.id))
    .where(eq(projectReclaimInterests.ownerUserId, ownerUserId)).orderBy(desc(projectReclaimInterests.updatedAt));
}

export async function listPublishedServices() {
  const db = requireDb(await getDb());
  return db.select().from(services).where(eq(services.isPublished, true));
}

export async function listManagedServices() {
  const db = requireDb(await getDb());
  return db.select().from(services).orderBy(desc(services.createdAt));
}

export async function createService(input: {
  name: string;
  description: string;
  serviceType: string;
  eligibilityRequirement: string;
  sourceUrl: string;
  nodeId?: number;
  isPublished: boolean;
  publishedByUserId: number;
}) {
  const db = requireDb(await getDb());
  const now = new Date();
  const reviewDueAt = new Date(now);
  reviewDueAt.setMonth(reviewDueAt.getMonth() + 3);
  await db.insert(services).values({ ...input, verifiedAt: now, reviewDueAt, publishedAt: input.isPublished ? now : null, publishedByUserId: input.isPublished ? input.publishedByUserId : null });
}

export async function setServicePublication(serviceId: number, isPublished: boolean, actorUserId: number) {
  const db = requireDb(await getDb());
  const now = new Date();
  const reviewDueAt = new Date(now);
  reviewDueAt.setMonth(reviewDueAt.getMonth() + 3);
  await db.update(services).set({ isPublished, publishedAt: isPublished ? now : null, publishedByUserId: isPublished ? actorUserId : null, reviewDueAt: isPublished ? reviewDueAt : null }).where(eq(services.id, serviceId));
}

export async function markServiceReviewed(serviceId: number) {
  const db = requireDb(await getDb());
  const now = new Date();
  const reviewDueAt = new Date(now);
  reviewDueAt.setMonth(reviewDueAt.getMonth() + 3);
  await db.update(services).set({ verifiedAt: now, reviewDueAt }).where(eq(services.id, serviceId));
}

export async function getServiceEligibility(userId: number, serviceId: number) {
  const db = requireDb(await getDb());
  const service = await db.select().from(services).where(and(eq(services.id, serviceId), eq(services.isPublished, true))).limit(1);
  if (!service[0]) return undefined;
  const compatible = await db.select({ id: attestations.id }).from(attestations).where(and(
    eq(attestations.subjectUserId, userId),
    eq(attestations.status, "active"),
    eq(attestations.evidenceStatus, "verified"),
  )).limit(1);
  return {
    service: service[0],
    eligible: compatible.length > 0,
    presentation: compatible.length > 0
      ? "Minimum eligibility proof available. No underlying record details were disclosed."
      : "No compatible minimum eligibility proof is available.",
  };
}

function distanceMiles(latitude: number, longitude: number, resourceLatitude: number, resourceLongitude: number) {
  const toRadians = (value: number) => value * Math.PI / 180;
  const earthRadiusMiles = 3958.8;
  const dLat = toRadians(resourceLatitude - latitude);
  const dLon = toRadians(resourceLongitude - longitude);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(latitude)) * Math.cos(toRadians(resourceLatitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * earthRadiusMiles * Math.asin(Math.sqrt(a));
}

export async function listEmergencyResources(
  emergencyType: "safety" | "shelter" | "food" | "health" | "legal" | "other",
  oneTimeLocation?: { latitude: number; longitude: number },
) {
  const db = requireDb(await getDb());
  const resources = await db.select().from(emergencyResources).where(and(
    eq(emergencyResources.emergencyType, emergencyType),
    eq(emergencyResources.isPublished, true),
  )).orderBy(desc(emergencyResources.verifiedAt)).limit(100);

  const withDistance = resources.map(resource => {
    const resourceLatitude = resource.latitude ? Number(resource.latitude) : null;
    const resourceLongitude = resource.longitude ? Number(resource.longitude) : null;
    const distance = oneTimeLocation && Number.isFinite(resourceLatitude) && Number.isFinite(resourceLongitude)
      ? distanceMiles(oneTimeLocation.latitude, oneTimeLocation.longitude, resourceLatitude!, resourceLongitude!)
      : null;
    return { ...resource, distanceMiles: distance ? Number(distance.toFixed(1)) : null };
  });

  return withDistance.sort((left, right) => {
    if (left.distanceMiles === null && right.distanceMiles === null) return 0;
    if (left.distanceMiles === null) return 1;
    if (right.distanceMiles === null) return -1;
    return left.distanceMiles - right.distanceMiles;
  }).slice(0, 5);
}

export async function listManagedEmergencyResources() {
  const db = requireDb(await getDb());
  return db.select().from(emergencyResources).orderBy(desc(emergencyResources.createdAt));
}

export async function createEmergencyResource(input: {
  emergencyType: "safety" | "shelter" | "food" | "health" | "legal" | "other";
  regionLabel: string;
  resourceName: string;
  contactLabel: string;
  contactUrl: string | null;
  sourceUrl: string;
  latitude: string | null;
  longitude: string | null;
  nodeId?: number;
  isPublished: boolean;
  publishedByUserId: number;
}) {
  const db = requireDb(await getDb());
  const now = new Date();
  const reviewDueAt = new Date(now);
  reviewDueAt.setMonth(reviewDueAt.getMonth() + 1);
  await db.insert(emergencyResources).values({ ...input, verifiedAt: now, reviewDueAt, publishedAt: input.isPublished ? now : null, publishedByUserId: input.isPublished ? input.publishedByUserId : null });
}

export async function setEmergencyResourcePublication(resourceId: number, isPublished: boolean, actorUserId: number) {
  const db = requireDb(await getDb());
  const now = new Date();
  const reviewDueAt = new Date(now);
  reviewDueAt.setMonth(reviewDueAt.getMonth() + 1);
  await db.update(emergencyResources).set({ isPublished, publishedAt: isPublished ? now : null, publishedByUserId: isPublished ? actorUserId : null, reviewDueAt: isPublished ? reviewDueAt : null }).where(eq(emergencyResources.id, resourceId));
}

export async function markEmergencyResourceReviewed(resourceId: number) {
  const db = requireDb(await getDb());
  const now = new Date();
  const reviewDueAt = new Date(now);
  reviewDueAt.setMonth(reviewDueAt.getMonth() + 1);
  await db.update(emergencyResources).set({ verifiedAt: now, reviewDueAt }).where(eq(emergencyResources.id, resourceId));
}

export async function exportMemberData(userId: number) {
  const [profile, grants, memberAttestations, posts, vouches] = await Promise.all([
    getOrCreateMemberProfile(userId),
    listConsentGrants(userId),
    listMemberAttestations(userId),
    listOwnTruthPosts(userId),
    listMemberVouches(userId),
  ]);
  return { exportedAt: new Date().toISOString(), profile, consentGrants: grants, attestations: memberAttestations, truthPosts: posts, scopedVouches: vouches };
}
