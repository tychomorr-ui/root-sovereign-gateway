import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const nodeMocks = vi.hoisted(() => ({
  getActiveOperatorForUser: vi.fn(),
  getActiveMonarchNode: vi.fn(),
  listMonarchNodes: vi.fn(),
  listMonarchNodeAudits: vi.fn(),
  registerMonarchNode: vi.fn(),
  setMonarchNodeStatus: vi.fn(),
  markMonarchNodeReviewed: vi.fn(),
  createService: vi.fn(),
}));

vi.mock("./rootDb", async importOriginal => {
  const actual = await importOriginal<typeof import("./rootDb")>();
  return { ...actual, ...nodeMocks };
});

import { rootRouter } from "./rootRouter";

function context(userId: number): TrpcContext {
  return {
    user: { id: userId, openId: `node-${userId}`, name: "ROOT user", email: null, loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("ROOT Monarch node authority", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    nodeMocks.getActiveOperatorForUser.mockResolvedValue(undefined);
  });

  it("denies node registry access to a member without the First Executive mandate", async () => {
    const caller = rootRouter.createCaller(context(22));
    await expect(caller.issuer.nodes.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.issuer.nodes.markReviewed({ nodeId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows the First Executive to register a prefix-correct planned relay node", async () => {
    nodeMocks.getActiveOperatorForUser.mockResolvedValue({ governanceRole: "first_executive", status: "active" });
    nodeMocks.registerMonarchNode.mockResolvedValue({ id: 3, nodeCode: "R1" });
    const caller = rootRouter.createCaller(context(1));
    await caller.issuer.nodes.register({ nodeCode: "R1", nodeLabel: "Regional directory relay", layer: "relay", mandate: "Regional directory federation.", capabilityManifest: ["Regional source verification"], status: "planned" });
    expect(nodeMocks.registerMonarchNode).toHaveBeenCalledWith(expect.objectContaining({ nodeCode: "R1", layer: "relay", status: "planned", approvedByUserId: 1 }));
  });

  it("rejects a node code whose numeric topology prefix does not match its declared layer", async () => {
    nodeMocks.getActiveOperatorForUser.mockResolvedValue({ governanceRole: "first_executive", status: "active" });
    const caller = rootRouter.createCaller(context(1));
    await expect(caller.issuer.nodes.register({ nodeCode: "S1", nodeLabel: "Misclassified node", layer: "anchor", mandate: "A deliberately invalid test mandate.", capabilityManifest: ["Test"], status: "planned" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(nodeMocks.registerMonarchNode).not.toHaveBeenCalled();
  });

  it("allows only the First Executive to review and suspend a node", async () => {
    nodeMocks.getActiveOperatorForUser.mockResolvedValue({ governanceRole: "first_executive", status: "active" });
    const caller = rootRouter.createCaller(context(1));
    await caller.issuer.nodes.markReviewed({ nodeId: 1 });
    await caller.issuer.nodes.setStatus({ nodeId: 1, status: "suspended" });
    expect(nodeMocks.markMonarchNodeReviewed).toHaveBeenCalledWith({ nodeId: 1, actorUserId: 1 });
    expect(nodeMocks.setMonarchNodeStatus).toHaveBeenCalledWith({ nodeId: 1, status: "suspended", actorUserId: 1 });
  });

  it("rejects assigning a service directory record to a planned or inactive node", async () => {
    nodeMocks.getActiveOperatorForUser.mockResolvedValue({ governanceRole: "first_executive", status: "active" });
    nodeMocks.getActiveMonarchNode.mockResolvedValue(undefined);
    const caller = rootRouter.createCaller(context(1));
    await expect(caller.issuer.directories.services.create({
      name: "A real service",
      description: "A properly sourced service record used to test node assignment boundaries.",
      serviceType: "support",
      eligibilityRequirement: "A scoped requirement",
      sourceUrl: "https://example.org",
      nodeId: 9,
      isPublished: false,
    })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(nodeMocks.createService).not.toHaveBeenCalled();
  });
});
