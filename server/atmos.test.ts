import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { canonicalAtmosReceipt, publicKeyFingerprint } from "./atmosDb";

describe("ARCHANGEL signed receipt contract", () => {
  it("canonicalizes the signed health payload with sorted capabilities", () => {
    expect(canonicalAtmosReceipt({
      nodeId: "root-gate",
      challengeId: "atm_123",
      nonce: "nonce",
      issuedAt: "2026-10-25T00:00:00.000Z",
      expiresAt: "2026-10-25T00:05:00.000Z",
      nodeVersion: "1.0.0",
      status: "ok",
      capabilities: ["version.info", "health.check"],
    })).toBe('{"nodeId":"root-gate","challengeId":"atm_123","nonce":"nonce","issuedAt":"2026-10-25T00:00:00.000Z","expiresAt":"2026-10-25T00:05:00.000Z","nodeVersion":"1.0.0","status":"ok","capabilities":["health.check","version.info"]}');
  });

  it("fingerprints Ed25519 public keys from their SPKI bytes", () => {
    const { publicKey } = generateKeyPairSync("ed25519");
    const pem = publicKey.export({ type: "spki", format: "pem" }).toString();
    const fingerprint = publicKeyFingerprint(pem);
    expect(fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(() => publicKeyFingerprint("not-a-public-key")).toThrow();
  });
});
