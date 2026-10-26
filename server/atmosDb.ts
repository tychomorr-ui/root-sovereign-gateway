import {
  createHash,
  createPublicKey,
  randomBytes,
  randomUUID,
  verify,
} from "node:crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  atmosAlerts,
  atmosAudits,
  atmosChallenges,
  atmosNodeRegistrations,
  atmosReceipts,
  truthTalkConnections,
} from "../drizzle/schema";
import {
  ATMOS_CHALLENGE_TTL_SECONDS,
  ATMOS_SCOPE,
  getAtmosNodeCatalogEntry,
  type AtmosNodeStatus,
} from "../shared/atmos";
import { getDb } from "./db";

function requireDb(db: Awaited<ReturnType<typeof getDb>>) {
  if (!db) throw new Error("ROOT database is not available.");
  return db;
}

export function publicKeyFingerprint(publicKeyPem: string) {
  const key = createPublicKey(publicKeyPem);
  if (key.asymmetricKeyType !== "ed25519")
    throw new Error("The node public key must be Ed25519.");
  return createHash("sha256")
    .update(key.export({ type: "spki", format: "der" }))
    .digest("hex");
}

export function canonicalAtmosReceipt(input: {
  nodeId: string;
  challengeId: string;
  nonce: string;
  issuedAt: string;
  expiresAt: string;
  nodeVersion: string;
  status: AtmosNodeStatus;
  capabilities: string[];
}) {
  return JSON.stringify({
    nodeId: input.nodeId,
    challengeId: input.challengeId,
    nonce: input.nonce,
    issuedAt: input.issuedAt,
    expiresAt: input.expiresAt,
    nodeVersion: input.nodeVersion,
    status: input.status,
    capabilities: [...input.capabilities].sort(),
  });
}

function challengeResult(row: typeof atmosChallenges.$inferSelect) {
  return {
    challengeId: row.challengeId,
    nodeId: row.nodeId,
    issuedAt: row.issuedAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
  };
}

export async function listAtmosEnrollments() {
  const db = requireDb(await getDb());
  return db
    .select()
    .from(atmosNodeRegistrations)
    .orderBy(atmosNodeRegistrations.nodeId);
}

export async function listAtmosReceipts() {
  const db = requireDb(await getDb());
  return db
    .select()
    .from(atmosReceipts)
    .orderBy(desc(atmosReceipts.verifiedAt))
    .limit(200);
}

export async function listAtmosAudits() {
  const db = requireDb(await getDb());
  return db
    .select()
    .from(atmosAudits)
    .orderBy(desc(atmosAudits.createdAt))
    .limit(200);
}

export async function listAtmosAlerts() {
  const db = requireDb(await getDb());
  return db
    .select()
    .from(atmosAlerts)
    .orderBy(desc(atmosAlerts.createdAt))
    .limit(200);
}

export async function scanAtmosReceiptExpiry() {
  const db = requireDb(await getDb());
  const registrations = await listAtmosEnrollments();
  const now = Date.now();
  const warningAfterMs = (ATMOS_CHALLENGE_TTL_SECONDS - 60) * 1000;
  const expiredAfterMs = ATMOS_CHALLENGE_TTL_SECONDS * 1000;
  const results: Array<{
    nodeId: string;
    alertType: "receipt_expiring" | "receipt_expired";
    severity: "warning" | "critical";
  }> = [];

  for (const registration of registrations) {
    if (
      !registration.lastVerifiedAt ||
      registration.verificationState === "suspended"
    )
      continue;
    const ageMs = now - registration.lastVerifiedAt.getTime();
    const alertType =
      ageMs >= expiredAfterMs
        ? "receipt_expired"
        : ageMs >= warningAfterMs
          ? "receipt_expiring"
          : undefined;
    if (!alertType) continue;
    const severity = alertType === "receipt_expired" ? "critical" : "warning";
    const bucket = Math.floor(
      registration.lastVerifiedAt.getTime() / expiredAfterMs
    );
    const dedupeKey = `${registration.nodeId}:${alertType}:${bucket}`;
    const details =
      alertType === "receipt_expired"
        ? `No fresh signed health receipt has been accepted for ${Math.floor(ageMs / 60000)} minutes.`
        : "The signed health receipt will expire within one minute unless the node submits a fresh challenge response.";
    try {
      await db
        .insert(atmosAlerts)
        .values({
          nodeId: registration.nodeId,
          alertType,
          severity,
          dedupeKey,
          details,
          observedAt: new Date(),
        });
      await db
        .insert(atmosAudits)
        .values({
          nodeId: registration.nodeId,
          action: "alert.opened",
          details,
        });
    } catch {
      // The unique dedupe key makes the monitor idempotent across repeated runs.
    }
    results.push({ nodeId: registration.nodeId, alertType, severity });
  }
  return results;
}

export async function acknowledgeAtmosAlert(alertId: number) {
  const db = requireDb(await getDb());
  await db
    .update(atmosAlerts)
    .set({ status: "acknowledged", acknowledgedAt: new Date() })
    .where(eq(atmosAlerts.id, alertId));
  return { acknowledged: true };
}

export async function listTruthTalkConnections() {
  const db = requireDb(await getDb());
  return db
    .select()
    .from(truthTalkConnections)
    .orderBy(desc(truthTalkConnections.createdAt));
}

export async function registerTruthTalkConnection(input: {
  label: string;
  originUrl: string;
  feedUrl: string;
  publicKeyPem?: string | null;
  createdByUserId: number;
}) {
  const db = requireDb(await getDb());
  const existing = await db
    .select()
    .from(truthTalkConnections)
    .where(eq(truthTalkConnections.originUrl, input.originUrl))
    .limit(1);
  if (existing[0]) {
    await db
      .update(truthTalkConnections)
      .set({
        label: input.label,
        feedUrl: input.feedUrl,
        publicKeyPem: input.publicKeyPem ?? null,
        status: "pending",
        lastError: null,
        updatedAt: new Date(),
      })
      .where(eq(truthTalkConnections.id, existing[0].id));
    return {
      ...(
        await db
          .select()
          .from(truthTalkConnections)
          .where(eq(truthTalkConnections.id, existing[0].id))
          .limit(1)
      )[0],
      changed: true,
    };
  }
  const inserted = await db
    .insert(truthTalkConnections)
    .values({
      ...input,
      publicKeyPem: input.publicKeyPem ?? null,
      scope: "public-read-only",
    });
  const id = Number(inserted[0].insertId);
  return {
    ...(
      await db
        .select()
        .from(truthTalkConnections)
        .where(eq(truthTalkConnections.id, id))
        .limit(1)
    )[0],
    changed: true,
  };
}

export async function getAtmosEnrollment(nodeId: string) {
  const db = requireDb(await getDb());
  const rows = await db
    .select()
    .from(atmosNodeRegistrations)
    .where(eq(atmosNodeRegistrations.nodeId, nodeId))
    .limit(1);
  return rows[0];
}

export async function registerAtmosNode(input: {
  nodeId: string;
  displayName: string;
  endpointUrl: string;
  publicKeyPem: string;
  approvedScope: string;
  registeredByUserId: number;
}) {
  const catalog = getAtmosNodeCatalogEntry(input.nodeId);
  if (!catalog || !catalog.enrollable)
    throw new Error("This exact node ID is not currently enrollable.");
  if (input.approvedScope !== ATMOS_SCOPE)
    throw new Error(`Only the bounded ${ATMOS_SCOPE} scope is supported.`);
  const fingerprint = publicKeyFingerprint(input.publicKeyPem);
  const db = requireDb(await getDb());
  const existing = await getAtmosEnrollment(input.nodeId);
  if (existing) {
    const keyChanged = existing.publicKeyFingerprint !== fingerprint;
    await db
      .update(atmosNodeRegistrations)
      .set({
        displayName: input.displayName,
        endpointUrl: input.endpointUrl,
        publicKeyPem: input.publicKeyPem,
        publicKeyFingerprint: fingerprint,
        approvedScope: input.approvedScope,
        verificationState: keyChanged ? "pending" : existing.verificationState,
        reachability: keyChanged ? "unknown" : existing.reachability,
        nodeVersion: keyChanged ? null : existing.nodeVersion,
        lastReceiptHash: keyChanged ? null : existing.lastReceiptHash,
        lastObservedAt: keyChanged ? null : existing.lastObservedAt,
        lastVerifiedAt: keyChanged ? null : existing.lastVerifiedAt,
        updatedAt: new Date(),
      })
      .where(eq(atmosNodeRegistrations.nodeId, input.nodeId));
    await db
      .insert(atmosAudits)
      .values({
        nodeId: input.nodeId,
        action: "updated",
        actorUserId: input.registeredByUserId,
        details: keyChanged
          ? "Registration updated and verification reset because the public key changed."
          : "Registration endpoint and scope updated.",
      });
  } else {
    await db
      .insert(atmosNodeRegistrations)
      .values({ ...input, publicKeyFingerprint: fingerprint });
    await db
      .insert(atmosAudits)
      .values({
        nodeId: input.nodeId,
        action: "registered",
        actorUserId: input.registeredByUserId,
        details: `Registered with bounded ${input.approvedScope} scope; receipt verification remains pending.`,
      });
  }
  return getAtmosEnrollment(input.nodeId);
}

export async function issueAtmosChallenge(nodeId: string) {
  const registration = await getAtmosEnrollment(nodeId);
  if (!registration || registration.verificationState === "suspended")
    return undefined;
  const db = requireDb(await getDb());
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + ATMOS_CHALLENGE_TTL_SECONDS * 1000
  );
  const challengeId = `atm_${randomUUID().replaceAll("-", "")}`;
  const nonce = randomBytes(32).toString("base64url");
  await db
    .insert(atmosChallenges)
    .values({
      challengeId,
      nodeId,
      nonceHash: createHash("sha256").update(nonce).digest("hex"),
      issuedAt: now,
      expiresAt,
    });
  await db
    .insert(atmosAudits)
    .values({
      nodeId,
      action: "challenge.issued",
      details: "Issued a five-minute single-use receipt challenge.",
    });
  const challenge = await db
    .select()
    .from(atmosChallenges)
    .where(eq(atmosChallenges.challengeId, challengeId))
    .limit(1);
  if (!challenge[0])
    throw new Error("Unable to persist the enrollment challenge.");
  return {
    nonce,
    registeredPublicKeyFingerprint: registration.publicKeyFingerprint,
    approvedScope: registration.approvedScope,
    ...challengeResult(challenge[0]),
  };
}

export async function acceptAtmosReceipt(input: {
  nodeId: string;
  challengeId: string;
  nonce: string;
  issuedAt: string;
  expiresAt: string;
  nodeVersion: string;
  status: AtmosNodeStatus;
  capabilities: string[];
  signature: string;
}) {
  const registration = await getAtmosEnrollment(input.nodeId);
  if (!registration) return { kind: "unknown_node" as const };
  if (registration.verificationState === "suspended")
    return { kind: "suspended" as const };
  const db = requireDb(await getDb());
  const challengeRows = await db
    .select()
    .from(atmosChallenges)
    .where(
      and(
        eq(atmosChallenges.challengeId, input.challengeId),
        eq(atmosChallenges.nodeId, input.nodeId)
      )
    )
    .limit(1);
  const challenge = challengeRows[0];
  const reject = async (
    details: string,
    kind: "expired" | "replay" | "receipt_invalid" = "receipt_invalid"
  ) => {
    await db
      .insert(atmosAudits)
      .values({ nodeId: input.nodeId, action: "receipt.rejected", details });
    return { kind } as const;
  };
  if (!challenge)
    return reject("Receipt rejected because the challenge is unknown.");
  if (challenge.usedAt)
    return reject(
      "Receipt rejected because the challenge was already used.",
      "replay"
    );
  const now = Date.now();
  if (now > challenge.expiresAt.getTime())
    return reject("Receipt rejected because the challenge expired.", "expired");
  if (
    input.issuedAt !== challenge.issuedAt.toISOString() ||
    input.expiresAt !== challenge.expiresAt.toISOString()
  )
    return reject(
      "Receipt rejected because its challenge timestamps do not match."
    );
  if (
    createHash("sha256").update(input.nonce).digest("hex") !==
    challenge.nonceHash
  )
    return reject(
      "Receipt rejected because its nonce does not match the issued challenge."
    );
  if (!input.nodeVersion.trim() || !input.capabilities.includes("health.check"))
    return reject(
      "Receipt must report a runtime version and health.check capability."
    );
  const canonicalPayload = canonicalAtmosReceipt(input);
  let signature: Buffer;
  try {
    signature = Buffer.from(input.signature, "base64url");
  } catch {
    return reject("Receipt signature encoding is invalid.");
  }
  let valid = false;
  try {
    valid = verify(
      null,
      Buffer.from(canonicalPayload),
      createPublicKey(registration.publicKeyPem),
      signature
    );
  } catch {
    valid = false;
  }
  if (!valid) return reject("Receipt signature verification failed.");
  const receiptHash = `sha256:${createHash("sha256").update(canonicalPayload).update(signature).digest("hex")}`;
  try {
    await db
      .insert(atmosReceipts)
      .values({
        nodeId: input.nodeId,
        challengeId: input.challengeId,
        receiptHash,
        canonicalPayload,
        signature: input.signature,
        nodeVersion: input.nodeVersion,
        nodeStatus: input.status,
        capabilitiesJson: JSON.stringify([...input.capabilities].sort()),
        observedAt: new Date(input.issuedAt),
      });
  } catch {
    return reject(
      "Receipt rejected because its challenge or receipt hash was already recorded.",
      "replay"
    );
  }
  await db
    .update(atmosChallenges)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(atmosChallenges.challengeId, input.challengeId),
        isNull(atmosChallenges.usedAt)
      )
    );
  await db
    .update(atmosNodeRegistrations)
    .set({
      verificationState: "verified",
      reachability: "reachable",
      nodeVersion: input.nodeVersion,
      lastReceiptHash: receiptHash,
      lastObservedAt: new Date(input.issuedAt),
      lastVerifiedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(atmosNodeRegistrations.nodeId, input.nodeId));
  await db
    .insert(atmosAudits)
    .values({
      nodeId: input.nodeId,
      action: "receipt.recorded",
      receiptHash,
      details: "Accepted a fresh challenge-bound Ed25519 health receipt.",
    });
  return {
    kind: "accepted" as const,
    receiptHash,
    observedAt: input.issuedAt,
    verifiedAt: new Date().toISOString(),
  };
}
