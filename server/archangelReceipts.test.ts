import { generateKeyPairSync, sign } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import {
  ARCHANGEL_RECEIPT_BOUNDARY,
  ARCHANGEL_RECEIPT_CONTRACT,
  canonicalArchangelReceipt,
  verifyArchangelReceipt,
  type ArchangelReceiptEnvelope,
} from "./archangelReceipts";

const previousKey = process.env.ARCHANGEL_RECEIPT_PUBLIC_KEY_PEM;

function makeReceipt(): Omit<ArchangelReceiptEnvelope, "signature"> {
  return {
    contract: ARCHANGEL_RECEIPT_CONTRACT,
    receiptId: "receipt-20261031-0001",
    nodeId: "tesseract-a",
    nodeEndpoint: "https://tesseract.nexinus.net",
    nodePublicKeyFingerprint: "a".repeat(64),
    artifactSha256: `sha256:${"b".repeat(64)}`,
    manifestCid: `sha256:${"c".repeat(64)}`,
    nodeStatus: "ok",
    boundary: ARCHANGEL_RECEIPT_BOUNDARY,
    observedAt: "2026-11-01T00:00:00.000Z",
    expiresAt: "2026-11-01T00:05:00.000Z",
  };
}

afterEach(() => {
  if (previousKey === undefined) delete process.env.ARCHANGEL_RECEIPT_PUBLIC_KEY_PEM;
  else process.env.ARCHANGEL_RECEIPT_PUBLIC_KEY_PEM = previousKey;
});

describe("Archangel receipt contract", () => {
  it("accepts a valid pinned Ed25519 signature and returns a stable receipt hash", () => {
    const { privateKey, publicKey } = generateKeyPairSync("ed25519");
    process.env.ARCHANGEL_RECEIPT_PUBLIC_KEY_PEM = publicKey
      .export({ type: "spki", format: "pem" })
      .toString();
    const unsigned = makeReceipt();
    const signature = sign(
      null,
      Buffer.from(canonicalArchangelReceipt(unsigned)),
      privateKey
    ).toString("base64");
    const result = verifyArchangelReceipt({ ...unsigned, signature });
    expect(result.receiptHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(result.canonicalPayload).toContain('"receiptId":"receipt-20261031-0001"');
  });

  it("fails closed when the pinned trust root is missing", () => {
    delete process.env.ARCHANGEL_RECEIPT_PUBLIC_KEY_PEM;
    expect(() => verifyArchangelReceipt({ ...makeReceipt(), signature: "AA==" })).toThrow(
      "trust root is not configured"
    );
  });

  it("rejects a tampered payload even when the signature is otherwise valid", () => {
    const { privateKey, publicKey } = generateKeyPairSync("ed25519");
    process.env.ARCHANGEL_RECEIPT_PUBLIC_KEY_PEM = publicKey
      .export({ type: "spki", format: "pem" })
      .toString();
    const unsigned = makeReceipt();
    const signature = sign(
      null,
      Buffer.from(canonicalArchangelReceipt(unsigned)),
      privateKey
    ).toString("base64");
    expect(() =>
      verifyArchangelReceipt({ ...unsigned, nodeStatus: "degraded", signature })
    ).toThrow("signature verification failed");
  });

  it("rejects an unsupported authority boundary", () => {
    const { privateKey, publicKey } = generateKeyPairSync("ed25519");
    process.env.ARCHANGEL_RECEIPT_PUBLIC_KEY_PEM = publicKey
      .export({ type: "spki", format: "pem" })
      .toString();
    const unsigned = makeReceipt();
    const signature = sign(
      null,
      Buffer.from(canonicalArchangelReceipt(unsigned)),
      privateKey
    ).toString("base64");
    expect(() =>
      verifyArchangelReceipt({
        ...unsigned,
        boundary: "SERVICE_AUTHORITY" as ArchangelReceiptEnvelope["boundary"],
        signature,
      })
    ).toThrow("boundary is not the approved observation boundary");
  });
});
