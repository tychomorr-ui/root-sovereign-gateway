import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function unauthenticatedContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("ROOT protected procedures", () => {
  it("rejects unauthenticated reads of member profiles, grants, and member records", async () => {
    const caller = appRouter.createCaller(unauthenticatedContext());
    await expect(caller.root.profile.get()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.root.profile.personalIdentity.get()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.root.permissions.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.root.memberRecord.mine()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects unauthenticated writes to member-owned Truth Talk and vouch records", async () => {
    const caller = appRouter.createCaller(unauthenticatedContext());
    await expect(caller.root.truthTalk.publish({ claimType: "report", body: "A claim long enough to validate.", sourceUrls: [] })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.root.vouches.create({ recipientMemberCode: "root-0123456789", scope: "review" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
