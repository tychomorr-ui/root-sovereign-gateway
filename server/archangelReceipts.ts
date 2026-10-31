import {
  createHash,
  createPublicKey,
  timingSafeEqual,
  verify,
} from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { archangelReceiptImports } from "../drizzle/schema";
import { getDb } from "./db";

export const ARCHANGEL_RECEIPT_CONTRACT =
  "TESSERACT_A_HEALTH_RECEIPT/v1" as const;
export const ARCHANGEL_RECEIPT_BOUNDARY =
  "SIGNED_HEALTH_OBSERVATION_NOT_SERVICE_AUTHORITY" as const;

type ReceiptStatus = "ok" | "degraded" | "not_ready";

export type ArchangelReceiptEnvelope = {
  contract: typeof ARCHANGEL_RECEIPT_CONTRACT;
  receiptId: string;
  nodeId: string;
  nodeEndpoint: string;
  nodePublicKeyFingerprint: string;
  artifactSha256?: string | null;
  manifestCid?: string | null;
  nodeStatus: ReceiptStatus;
  boundary: typeof ARCHANGEL_RECEIPT_BOUNDARY;
  observedAt: string;
  expiresAt: string;
  signature: string;
};

function sortCanonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortCanonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, sortCanonical(entry)])
    );
  }
  return value;
}

export function canonicalArchangelReceipt(
  receipt: Omit<ArchangelReceiptEnvelope, "signature">
) {
  return JSON.stringify(sortCanonical(receipt));
}

function requiredPublicKeyPem() {
  const value = process.env.ARCHANGEL_RECEIPT_PUBLIC_KEY_PEM?.trim();
  if (!value) throw new Error("ARCHANGEL receipt trust root is not configured.");
  const key = createPublicKey(value);
  if (key.asymmetricKeyType !== "ed25519")
    throw new Error("ARCHANGEL receipt trust root must be Ed25519.");
  return key;
}

function constantTimeHexEqual(left: string, right: string) {
  if (!/^[a-f0-9]{64}$/.test(left) || !/^[a-f0-9]{64}$/.test(right))
    return false;
  return timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
}

function validateTimestamp(value: string, label: string) {
  const time = Date.parse(value);
  if (!Number.isFinite(time)) throw new Error(`${label} must be an ISO timestamp.`);
  return new Date(time);
}

export function verifyArchangelReceipt(input: ArchangelReceiptEnvelope) {
  if (input.contract !== ARCHANGEL_RECEIPT_CONTRACT)
    throw new Error("Unsupported ARCHANGEL receipt contract.");
  if (input.boundary !== ARCHANGEL_RECEIPT_BOUNDARY)
    throw new Error("Receipt boundary is not the approved observation boundary.");
  if (!/^[a-f0-9]{64}$/.test(input.nodePublicKeyFingerprint))
    throw new Error("Node public-key fingerprint must be lowercase SHA-256 hex.");
  const observedAt = validateTimestamp(input.observedAt, "observedAt");
  const expiresAt = validateTimestamp(input.expiresAt, "expiresAt");
  if (expiresAt <= observedAt) throw new Error("Receipt expiry must follow observation time.");
  if (expiresAt.getTime() <= Date.now()) throw new Error("Receipt is expired.");
  const publicKey = requiredPublicKeyPem();
  const unsigned = { ...input };
  delete (unsigned as Partial<ArchangelReceiptEnvelope>).signature;
  const canonicalPayload = canonicalArchangelReceipt(
    unsigned as Omit<ArchangelReceiptEnvelope, "signature">
  );
  const signature = Buffer.from(input.signature, "base64");
  if (!signature.length) throw new Error("Receipt signature is empty.");
  if (!verify(null, Buffer.from(canonicalPayload), publicKey, signature))
    throw new Error("ARCHANGEL receipt signature verification failed.");
  return {
    canonicalPayload,
    receiptHash: `sha256:${createHash("sha256")
      .update(canonicalPayload)
      .update(signature)
      .digest("hex")}`,
    observedAt,
    expiresAt,
    authorityFingerprint: createHash("sha256")
      .update(publicKey.export({ type: "spki", format: "der" }))
      .digest("hex"),
  };
}

export async function listArchangelReceiptImports() {
  const db = await getDb();
  if (!db) throw new Error("ROOT database is not available.");
  return db
    .select({
      id: archangelReceiptImports.id,
      receiptId: archangelReceiptImports.receiptId,
      receiptHash: archangelReceiptImports.receiptHash,
      contract: archangelReceiptImports.contract,
      nodeId: archangelReceiptImports.nodeId,
      nodeEndpoint: archangelReceiptImports.nodeEndpoint,
      nodePublicKeyFingerprint: archangelReceiptImports.nodePublicKeyFingerprint,
      artifactSha256: archangelReceiptImports.artifactSha256,
      manifestCid: archangelReceiptImports.manifestCid,
      nodeStatus: archangelReceiptImports.nodeStatus,
      boundary: archangelReceiptImports.boundary,
      observedAt: archangelReceiptImports.observedAt,
      expiresAt: archangelReceiptImports.expiresAt,
      createdAt: archangelReceiptImports.createdAt,
    })
    .from(archangelReceiptImports)
    .orderBy(desc(archangelReceiptImports.observedAt))
    .limit(200);
}

export async function importArchangelReceipt(
  input: ArchangelReceiptEnvelope & { importedByUserId: number }
) {
  const verified = verifyArchangelReceipt(input);
  const db = await getDb();
  if (!db) throw new Error("ROOT database is not available.");
  const existing = await db
    .select({ id: archangelReceiptImports.id })
    .from(archangelReceiptImports)
    .where(eq(archangelReceiptImports.receiptHash, verified.receiptHash))
    .limit(1);
  if (existing[0]) throw new Error("This signed ARCHANGEL receipt was already imported.");
  await db.insert(archangelReceiptImports).values({
    receiptId: input.receiptId,
    receiptHash: verified.receiptHash,
    contract: input.contract,
    nodeId: input.nodeId,
    nodeEndpoint: input.nodeEndpoint,
    nodePublicKeyFingerprint: input.nodePublicKeyFingerprint,
    artifactSha256: input.artifactSha256 ?? null,
    manifestCid: input.manifestCid ?? null,
    nodeStatus: input.nodeStatus,
    boundary: input.boundary,
    canonicalPayload: verified.canonicalPayload,
    signature: input.signature,
    observedAt: verified.observedAt,
    expiresAt: verified.expiresAt,
    importedByUserId: input.importedByUserId,
  });
  return {
    imported: true,
    receiptId: input.receiptId,
    receiptHash: verified.receiptHash,
    authorityFingerprint: verified.authorityFingerprint,
    boundary: input.boundary,
    observedAt: verified.observedAt.toISOString(),
    expiresAt: verified.expiresAt.toISOString(),
  };
}

export function publicArchangelReceiptContract() {
  try {
    const key = requiredPublicKeyPem();
    return {
      status: "configured" as const,
      contract: ARCHANGEL_RECEIPT_CONTRACT,
      boundary: ARCHANGEL_RECEIPT_BOUNDARY,
      authorityFingerprint: createHash("sha256")
        .update(key.export({ type: "spki", format: "der" }))
        .digest("hex"),
    };
  } catch {
    return {
      status: "pending_contract" as const,
      contract: ARCHANGEL_RECEIPT_CONTRACT,
      boundary: ARCHANGEL_RECEIPT_BOUNDARY,
    };
  }
}

export { constantTimeHexEqual };
