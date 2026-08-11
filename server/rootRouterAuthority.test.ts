import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  revokeConsentGrant: vi.fn(),
  getScopedVouch: vi.fn(),
  respondToScopedVouch: vi.fn(),
  revokeScopedVouch: vi.fn(),
  getOrCreateMemberProfile: vi.fn(),
  createTruthPost: vi.fn(),
}));

vi.mock("./rootDb", async importOriginal => {
  const actual = await importOriginal<typeof import("./rootDb")>();
  return { ...actual, ...dbMocks };
});

import { rootRouter } from "./rootRouter";

function authenticatedContext(id: number): TrpcContext {
  return {
    user: {
      id,
      openId: `member-${id}`,
      name: `Member ${id}`,
      email: null,
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("ROOT router ownership enforcement", () => {
  it("carries a local file digest into Truth Talk publication metadata", async () => {
    dbMocks.getOrCreateMemberProfile.mockResolvedValue({ displayName: "Proof holder" });
    const caller = rootRouter.createCaller(authenticatedContext(12));
    await caller.truthTalk.publish({
      claimType: "report",
      body: "A declared claim with integrity metadata.",
      sourceUrls: ["https://example.org/source"],
      evidenceDigest: "sha256:abcdef0123456789",
      visibility: "public",
    });
    expect(dbMocks.createTruthPost).toHaveBeenCalledWith(expect.objectContaining({
      authorUserId: 12,
      evidenceDigest: "sha256:abcdef0123456789",
      sourceUrls: ["https://example.org/source"],
    }));
  });

  it("passes the signed-in owner to consent revocation so the database can revoke only their grant", async () => {
    const caller = rootRouter.createCaller(authenticatedContext(12));
    await caller.permissions.revoke({ grantId: 44 });
    expect(dbMocks.revokeConsentGrant).toHaveBeenCalledWith(12, 44);
  });

  it("rejects a vouch response from anyone other than the recipient", async () => {
    dbMocks.getScopedVouch.mockResolvedValue({ id: 8, voucherUserId: 2, subjectUserId: 4, status: "pending" });
    const caller = rootRouter.createCaller(authenticatedContext(3));
    await expect(caller.vouches.respond({ vouchId: 8, decision: "active" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMocks.respondToScopedVouch).not.toHaveBeenCalled();
  });

  it("allows the recipient to respond and only a participant to revoke a vouch", async () => {
    dbMocks.getScopedVouch.mockResolvedValue({ id: 8, voucherUserId: 2, subjectUserId: 4, status: "pending" });
    const recipient = rootRouter.createCaller(authenticatedContext(4));
    await recipient.vouches.respond({ vouchId: 8, decision: "active" });
    expect(dbMocks.respondToScopedVouch).toHaveBeenCalledWith(8, "active");

    dbMocks.getScopedVouch.mockResolvedValue({ id: 8, voucherUserId: 2, subjectUserId: 4, status: "active" });
    const outsider = rootRouter.createCaller(authenticatedContext(7));
    await expect(outsider.vouches.revoke({ vouchId: 8 })).rejects.toMatchObject({ code: "FORBIDDEN" });

    const voucher = rootRouter.createCaller(authenticatedContext(2));
    await voucher.vouches.revoke({ vouchId: 8 });
    expect(dbMocks.revokeScopedVouch).toHaveBeenCalledWith(8);
  });
});
