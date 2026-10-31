import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import {
  ARCHANGEL_RECEIPT_CONTRACT,
  canonicalArchangelPayload,
  verifyArchangelReceipt,
  type ArchangelReceiptEnvelope,
} from "./archangelReceipts";

const previousKey = process.env.ARCHANGEL_RECEIPT_PUBLIC_KEY_PEM;

function makeReceipt() {
  const payload = {
    node: "tesseract-a",
    ts: Math.floor(Date.now() / 1000) + 30,
    uname: "penguin",
    kernel: "6.8.0-test",
  };
  const canonicalPayload = canonicalArchangelPayload(payload);
  return {
    v: ARCHANGEL_RECEIPT_CONTRACT,
    node: payload.node,
    ts: payload.ts,
    payload,
    payload_cid: createHash("sha256").update(canonicalPayload).digest("hex"),
  } satisfies Omit<ArchangelReceiptEnvelope, "sig" | "pub">;
}

afterEach(() => {
  if (previousKey === undefined) delete process.env.ARCHANGEL_RECEIPT_PUBLIC_KEY_PEM;
  else process.env.ARCHANGEL_RECEIPT_PUBLIC_KEY_PEM = previousKey;
});

describe("Archangel/v0 signed status contract", () => {
  it("accepts a valid pinned Ed25519 signature over payload_cid|ts", () => {
    const { privateKey, publicKey } = generateKeyPairSync("ed25519");
    process.env.ARCHANGEL_RECEIPT_PUBLIC_KEY_PEM = publicKey
      .export({ type: "spki", format: "pem" })
      .toString();
    const unsigned = makeReceipt();
    const pub = publicKey.export({ type: "spki", format: "der" }).subarray(-32).toString("hex");
    const sig = sign(null, Buffer.from(`${unsigned.payload_cid}|${unsigned.ts}`), privateKey).toString("hex");
    const result = verifyArchangelReceipt({ ...unsigned, pub, sig });
    expect(result.receiptHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(result.receiptId).toBe(`tesseract-a:${unsigned.payload_cid}`);
  });

  it("fails closed when the pinned trust root is missing", () => {
    delete process.env.ARCHANGEL_RECEIPT_PUBLIC_KEY_PEM;
    const unsigned = makeReceipt();
    expect(() => verifyArchangelReceipt({ ...unsigned, pub: "a".repeat(64), sig: "0".repeat(128) })).toThrow(
      "trust root is not configured"
    );
  });

  it("rejects a tampered payload CID or payload", () => {
    const { privateKey, publicKey } = generateKeyPairSync("ed25519");
    process.env.ARCHANGEL_RECEIPT_PUBLIC_KEY_PEM = publicKey
      .export({ type: "spki", format: "pem" })
      .toString();
    const unsigned = makeReceipt();
    const pub = publicKey.export({ type: "spki", format: "der" }).subarray(-32).toString("hex");
    const sig = sign(null, Buffer.from(`${unsigned.payload_cid}|${unsigned.ts}`), privateKey).toString("hex");
    expect(() => verifyArchangelReceipt({ ...unsigned, pub, sig, payload: { ...unsigned.payload, kernel: "tampered" } })).toThrow(
      "payload_cid does not match"
    );
  });

  it("rejects a signer that is not the pinned Archangel authority", () => {
    const authority = generateKeyPairSync("ed25519");
    const other = generateKeyPairSync("ed25519");
    process.env.ARCHANGEL_RECEIPT_PUBLIC_KEY_PEM = authority.publicKey
      .export({ type: "spki", format: "pem" })
      .toString();
    const unsigned = makeReceipt();
    const otherPub = other.publicKey.export({ type: "spki", format: "der" }).subarray(-32).toString("hex");
    const sig = sign(null, Buffer.from(`${unsigned.payload_cid}|${unsigned.ts}`), other.privateKey).toString("hex");
    expect(() => verifyArchangelReceipt({ ...unsigned, pub: otherPub, sig })).toThrow(
      "not the pinned ARCHANGEL trust root"
    );
  });
});
