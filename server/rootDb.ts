import { and, desc, eq, isNull, or } from "drizzle-orm";
import {
  attestations,
  consentGrants,
  emergencyResources,
  memberProfiles,
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
  isPublished: boolean;
}) {
  const db = requireDb(await getDb());
  await db.insert(services).values(input);
}

export async function setServicePublication(serviceId: number, isPublished: boolean) {
  const db = requireDb(await getDb());
  await db.update(services).set({ isPublished }).where(eq(services.id, serviceId));
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
  isPublished: boolean;
}) {
  const db = requireDb(await getDb());
  await db.insert(emergencyResources).values({ ...input, verifiedAt: new Date() });
}

export async function setEmergencyResourcePublication(resourceId: number, isPublished: boolean) {
  const db = requireDb(await getDb());
  await db.update(emergencyResources).set({ isPublished }).where(eq(emergencyResources.id, resourceId));
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
