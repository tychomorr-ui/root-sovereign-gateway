import {
  createHash,
  createPublicKey,
  timingSafeEqual,
  verify,
} from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { archangelReceiptImports } from "../drizzle/schema";
import { getDb } from "./db";

export const ARCHANGEL_RECEIPT_CONTRACT = "ARCHANGEL/v0" as const;
export const ARCHANGEL_RECEIPT_BOUNDARY =
  "SIGNED_NODE_STATUS_OBSERVATION_NOT_SERVICE_AUTHORITY" as const;
const DEFAULT_RECEIPT_TTL_SECONDS = 300;

type ReceiptStatus = "ok" | "degraded" | "not_ready";

type SignedStatusPayload = {
  node: string;
  ts: number;
  uname: string;
  kernel: string;
};

export type ArchangelReceiptEnvelope = {
  v: typeof ARCHANGEL_RECEIPT_CONTRACT;
  node: string;
  ts: number;
  payload: SignedStatusPayload;
  payload_cid: string;
  sig: string;
  pub: string;
  sourceEndpoint?: string | null;
  nodeStatus?: ReceiptStatus | null;
  artifactSha256?: string | null;
  manifestCid?: string | null;
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

export function canonicalArchangelPayload(payload: SignedStatusPayload) {
  return JSON.stringify(sortCanonical(payload));
}

function requiredPublicKey() {
  const value = process.env.ARCHANGEL_RECEIPT_PUBLIC_KEY_PEM?.trim();
  if (!value) throw new Error("ARCHANGEL receipt trust root is not configured.");
  const key = createPublicKey(value);
  if (key.asymmetricKeyType !== "ed25519")
    throw new Error("ARCHANGEL receipt trust root must be Ed25519.");
  return key;
}

function rawPublicKeyHex(key: ReturnType<typeof createPublicKey>) {
  const der = key.export({ type: "spki", format: "der" });
  return der.subarray(-32).toString("hex");
}

function constantTimeHexEqual(left: string, right: string) {
  if (!/^[a-f0-9]{64}$/.test(left) || !/^[a-f0-9]{64}$/.test(right))
    return false;
  return timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
}

function receiptExpiry(ts: number) {
  const ttl = Number(process.env.ARCHANGEL_RECEIPT_TTL_SECONDS ?? DEFAULT_RECEIPT_TTL_SECONDS);
  const ttlSeconds = Number.isFinite(ttl) && ttl > 0 && ttl <= 86400 ? ttl : DEFAULT_RECEIPT_TTL_SECONDS;
  return new Date((ts + ttlSeconds) * 1000);
}

export function verifyArchangelReceipt(input: ArchangelReceiptEnvelope) {
  if (input.v !== ARCHANGEL_RECEIPT_CONTRACT)
    throw new Error("Unsupported ARCHANGEL receipt contract.");
  if (!Number.isInteger(input.ts) || input.ts <= 0)
    throw new Error("ARCHANGEL receipt timestamp is invalid.");
  const observedAt = new Date(input.ts * 1000);
  const expiresAt = receiptExpiry(input.ts);
  if (expiresAt.getTime() <= Date.now()) throw new Error("Receipt is expired.");
  if (!/^[a-f0-9]{64}$/.test(input.pub))
    throw new Error("Receipt public key must be lowercase raw Ed25519 hex.");
  if (!/^[a-f0-9]{64}$/.test(input.payload_cid))
    throw new Error("Receipt payload_cid must be lowercase SHA-256 hex.");
  if (!/^[a-f0-9]{128}$/.test(input.sig))
    throw new Error("Receipt signature must be lowercase Ed25519 hex.");
  if (input.node !== input.payload.node)
    throw new Error("Receipt node does not match its signed payload.");
  const canonicalPayload = canonicalArchangelPayload(input.payload);
  const calculatedCid = createHash("sha256").update(canonicalPayload).digest("hex");
  if (!constantTimeHexEqual(calculatedCid, input.payload_cid))
    throw new Error("Receipt payload_cid does not match the canonical payload.");
  const authority = requiredPublicKey();
  if (!constantTimeHexEqual(input.pub, rawPublicKeyHex(authority)))
    throw new Error("Receipt signer is not the pinned ARCHANGEL trust root.");
  const valid = verify(
    null,
    Buffer.from(`${input.payload_cid}|${input.ts}`),
    authority,
    Buffer.from(input.sig, "hex")
  );
  if (!valid) throw new Error("ARCHANGEL receipt signature verification failed.");
  const canonicalEnvelope = JSON.stringify(sortCanonical({
    v: input.v,
    node: input.node,
    ts: input.ts,
    payload: input.payload,
    payload_cid: input.payload_cid,
    sig: input.sig,
    pub: input.pub,
  }));
  return {
    canonicalPayload: canonicalEnvelope,
    receiptHash: `sha256:${createHash("sha256").update(canonicalEnvelope).digest("hex")}`,
    receiptId: `${input.node}:${input.payload_cid}`,
    observedAt,
    expiresAt,
    authorityFingerprint: createHash("sha256")
      .update(authority.export({ type: "spki", format: "der" }))
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
    receiptId: verified.receiptId,
    receiptHash: verified.receiptHash,
    contract: input.v,
    nodeId: input.node,
    nodeEndpoint: input.sourceEndpoint ?? null,
    nodePublicKeyFingerprint: input.pub,
    artifactSha256: input.artifactSha256 ?? null,
    manifestCid: input.manifestCid ?? null,
    nodeStatus: input.nodeStatus ?? null,
    boundary: ARCHANGEL_RECEIPT_BOUNDARY,
    canonicalPayload: verified.canonicalPayload,
    signature: input.sig,
    observedAt: verified.observedAt,
    expiresAt: verified.expiresAt,
    importedByUserId: input.importedByUserId,
  });
  return {
    imported: true,
    receiptId: verified.receiptId,
    receiptHash: verified.receiptHash,
    authorityFingerprint: verified.authorityFingerprint,
    boundary: ARCHANGEL_RECEIPT_BOUNDARY,
    observedAt: verified.observedAt.toISOString(),
    expiresAt: verified.expiresAt.toISOString(),
  };
}

export function publicArchangelReceiptContract() {
  try {
    const key = requiredPublicKey();
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
