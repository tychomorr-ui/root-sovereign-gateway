import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { canRespondToVouch, canRevokeVouch, CLAIM_TYPES, consentReceiptText, deriveFileIntegrityDigest, emergencyLocationIsPersistent, truthOkSignals } from "../shared/root";

describe("ROOT policy primitives", () => {
  it("exposes only the approved Truth Talk claim labels", () => {
    expect(CLAIM_TYPES.map(type => type.label)).toEqual([
      "report",
      "firsthand account",
      "opinion",
      "analysis",
      "correction",
      "question",
    ]);
  });

  it("renders TruthOK as discrete signals, never a binary verdict", () => {
    const signals = truthOkSignals({
      identityBound: true,
      integrityBound: true,
      sourcesDeclared: false,
      reviewCompleted: false,
    });
    expect(signals).toEqual([
      { key: "identityBound", label: "identity-bound", complete: true },
      { key: "integrityBound", label: "integrity-bound", complete: true },
      { key: "sourcesDeclared", label: "sources-declared", complete: false },
      { key: "reviewCompleted", label: "review-completed", complete: false },
    ]);
    expect(JSON.stringify(signals).toLowerCase()).not.toContain("true/false");
  });

  it("creates a human-readable consent receipt with its scoped fields and expiry", () => {
    const receipt = consentReceiptText({
      receiptCode: "ROOT-CONSENT-TEST",
      recipient: "A named verifier",
      fieldNames: ["verification level", "active attestations"],
      purpose: "a service eligibility check",
      expiresAt: new Date("2030-01-01T00:00:00.000Z"),
    });
    expect(receipt).toContain("verification level, active attestations");
    expect(receipt).toContain("A named verifier");
    expect(receipt).toContain("expires on");
  });

  it("only permits a vouch recipient to respond and permits only a participant to revoke", () => {
    expect(canRespondToVouch(4, 4, "pending")).toBe(true);
    expect(canRespondToVouch(4, 3, "pending")).toBe(false);
    expect(canRespondToVouch(4, 4, "active")).toBe(false);
    expect(canRevokeVouch(3, 4, 3)).toBe(true);
    expect(canRevokeVouch(3, 4, 4)).toBe(true);
    expect(canRevokeVouch(3, 4, 5)).toBe(false);
  });

  it("keeps emergency location ephemeral", () => {
    expect(emergencyLocationIsPersistent()).toBe(false);
  });

  it("does not load an analytics script in the ROOT entry document", () => {
    const entryHtml = readFileSync(resolve(process.cwd(), "client/index.html"), "utf8");
    expect(entryHtml).not.toContain("manus-analytics");
    expect(entryHtml).not.toContain("/umami");
    expect(entryHtml).not.toContain("data-website-id");
  });

  it("derives a stable local-only SHA-256 receipt for a member-selected file", async () => {
    const bytes = new TextEncoder().encode("ROOT member evidence").buffer;
    const first = await deriveFileIntegrityDigest(bytes);
    const second = await deriveFileIntegrityDigest(bytes);
    expect(first).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(first).toBe(second);
  });
});
