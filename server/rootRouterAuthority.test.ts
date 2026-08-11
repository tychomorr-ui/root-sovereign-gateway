import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  revokeConsentGrant: vi.fn(),
  getScopedVouch: vi.fn(),
  respondToScopedVouch: vi.fn(),
  revokeScopedVouch: vi.fn(),
  getOrCreateMemberProfile: vi.fn(),
  getPersonalIdentity: vi.fn(),
  createPersonalIdentity: vi.fn(),
  createTruthPost: vi.fn(),
  listPublishedProjectReclaimSources: vi.fn(),
  getProjectReclaimSource: vi.fn(),
  saveProjectReclaimInterest: vi.fn(),
  listOwnProjectReclaimInterests: vi.fn(),
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

  it("creates and retrieves a personal member code only in the calling member's private scope", async () => {
    dbMocks.getPersonalIdentity.mockResolvedValue({ id: 9, ownerUserId: 12, personalMemberCode: "root-personal-private", label: "Personal ROOT identity", status: "active" });
    dbMocks.createPersonalIdentity.mockResolvedValue({ id: 9, ownerUserId: 12, personalMemberCode: "root-personal-private", label: "Tyler C. Morris", status: "active" });
    const caller = rootRouter.createCaller(authenticatedContext(12));
    await caller.profile.personalIdentity.create({ label: "Tyler C. Morris" });
    await caller.profile.personalIdentity.get();
    expect(dbMocks.createPersonalIdentity).toHaveBeenCalledWith({ ownerUserId: 12, label: "Tyler C. Morris" });
    expect(dbMocks.getPersonalIdentity).toHaveBeenCalledWith(12);
  });

  it("returns only the reviewed public Project Reclaim source set to members", async () => {
    const published = [{ id: 1, title: "Published source", status: "published", county: "mendocino" }];
    dbMocks.listPublishedProjectReclaimSources.mockResolvedValue(published);
    const caller = rootRouter.createCaller(authenticatedContext(12));
    await expect(caller.projectReclaim.sources()).resolves.toEqual(published);
    expect(dbMocks.listPublishedProjectReclaimSources).toHaveBeenCalledOnce();
  });

  it("keeps Project Reclaim interest writes and reads inside the signed-in member's private ledger", async () => {
    const caller = rootRouter.createCaller(authenticatedContext(12));
    dbMocks.getProjectReclaimSource.mockResolvedValue({ id: 1, status: "published" });
    dbMocks.saveProjectReclaimInterest.mockResolvedValue({ id: 6, ownerUserId: 12, sourceId: 1, privateNote: "Follow up privately." });
    dbMocks.listOwnProjectReclaimInterests.mockResolvedValue([{ interest: { id: 6, ownerUserId: 12, sourceId: 1 }, source: { id: 1, status: "published" } }]);

    await caller.projectReclaim.interests.save({ sourceId: 1, privateNote: "Follow up privately." });
    await caller.projectReclaim.interests.mine();
    expect(dbMocks.saveProjectReclaimInterest).toHaveBeenCalledWith({ ownerUserId: 12, sourceId: 1, privateNote: "Follow up privately." });
    expect(dbMocks.listOwnProjectReclaimInterests).toHaveBeenCalledWith(12);

    dbMocks.getProjectReclaimSource.mockResolvedValue({ id: 2, status: "internal_watchlist" });
    await expect(caller.projectReclaim.interests.save({ sourceId: 2 })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(dbMocks.saveProjectReclaimInterest).toHaveBeenCalledTimes(1);
  });
});
