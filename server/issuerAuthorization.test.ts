import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  findProfileByMemberCode: vi.fn(),
  createAttestation: vi.fn(),
  revokeAttestation: vi.fn(),
  listIssuedAttestations: vi.fn(),
  createService: vi.fn(),
  listManagedServices: vi.fn(),
  setServicePublication: vi.fn(),
  createEmergencyResource: vi.fn(),
  listManagedEmergencyResources: vi.fn(),
  setEmergencyResourcePublication: vi.fn(),
  markServiceReviewed: vi.fn(),
  markEmergencyResourceReviewed: vi.fn(),
  getActiveOperatorForUser: vi.fn(),
  bootstrapFirstExecutive: vi.fn(),
  listOperators: vi.fn(),
  listOperatorAudits: vi.fn(),
  approveOperator: vi.fn(),
  setOperatorStatus: vi.fn(),
  listIssuedAttestationsForOperator: vi.fn(),
}));

vi.mock("./rootDb", async importOriginal => {
  const actual = await importOriginal<typeof import("./rootDb")>();
  return { ...actual, ...dbMocks };
});

import { rootRouter } from "./rootRouter";

function context(role: "admin" | "user", id = role === "admin" ? 90 : 91): TrpcContext {
  return {
    user: { id, openId: `issuer-test-${id}`, name: "Issuer test", email: null, loginMethod: "manus", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("ROOT issuer and directory authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.getActiveOperatorForUser.mockImplementation(async (userId: number) => userId === 90 ? { id: 1, governanceRole: "first_executive", status: "active" } : undefined);
  });

  it("rejects every issuer and directory management route from ordinary members", async () => {
    const caller = rootRouter.createCaller(context("user"));
    await expect(caller.issuer.attestations.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.issuer.attestations.create({ recipientMemberCode: "root-0123456789", issuerLabel: "ROOT issuer", issuerKind: "authorized operator", scope: "source review", evidenceStatus: "verified" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.issuer.attestations.revoke({ attestationId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.issuer.directories.services.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.issuer.directories.services.create({ name: "Real service", description: "A real verified service description.", serviceType: "support", eligibilityRequirement: "A scoped requirement", sourceUrl: "https://example.org", isPublished: false })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.issuer.directories.services.setPublication({ serviceId: 1, isPublished: true })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.issuer.directories.emergency.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.issuer.directories.emergency.create({ emergencyType: "safety", regionLabel: "A region", resourceName: "A resource", contactLabel: "A contact", sourceUrl: "https://example.org", isPublished: false })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.issuer.directories.emergency.setPublication({ resourceId: 1, isPublished: true })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows an administrator to issue a scoped attestation to a member code", async () => {
    dbMocks.findProfileByMemberCode.mockResolvedValue({ userId: 7 });
    const caller = rootRouter.createCaller(context("admin"));
    await caller.issuer.attestations.create({ recipientMemberCode: "root-0123456789", issuerLabel: "ROOT issuer", issuerKind: "authorized operator", scope: "source review", evidenceStatus: "verified" });
    expect(dbMocks.createAttestation).toHaveBeenCalledWith(expect.objectContaining({ subjectUserId: 7, issuedByUserId: 90, scope: "source review" }));
  });

  it("requires both coordinates when an administrator adds an emergency directory record", async () => {
    const caller = rootRouter.createCaller(context("admin"));
    await expect(caller.issuer.directories.emergency.create({ emergencyType: "safety", regionLabel: "A region", resourceName: "A resource", contactLabel: "A contact", sourceUrl: "https://example.org", latitude: 34, isPublished: false })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(dbMocks.createEmergencyResource).not.toHaveBeenCalled();
  });

  it("allows an administrator to manage issuer, service, and emergency record states", async () => {
    dbMocks.listIssuedAttestations.mockResolvedValue([]);
    dbMocks.listManagedServices.mockResolvedValue([]);
    dbMocks.listManagedEmergencyResources.mockResolvedValue([]);
    const caller = rootRouter.createCaller(context("admin"));
    await caller.issuer.attestations.list();
    await caller.issuer.attestations.revoke({ attestationId: 21 });
    await caller.issuer.directories.services.list();
    await caller.issuer.directories.services.setPublication({ serviceId: 22, isPublished: true });
    await caller.issuer.directories.services.markReviewed({ serviceId: 22 });
    await caller.issuer.directories.emergency.list();
    await caller.issuer.directories.emergency.setPublication({ resourceId: 23, isPublished: true });
    await caller.issuer.directories.emergency.markReviewed({ resourceId: 23 });
    expect(dbMocks.listIssuedAttestations).toHaveBeenCalledOnce();
    expect(dbMocks.revokeAttestation).toHaveBeenCalledWith(21);
    expect(dbMocks.listManagedServices).toHaveBeenCalledOnce();
    expect(dbMocks.setServicePublication).toHaveBeenCalledWith(22, true, 90);
    expect(dbMocks.markServiceReviewed).toHaveBeenCalledWith(22);
    expect(dbMocks.listManagedEmergencyResources).toHaveBeenCalledOnce();
    expect(dbMocks.setEmergencyResourcePublication).toHaveBeenCalledWith(23, true, 90);
    expect(dbMocks.markEmergencyResourceReviewed).toHaveBeenCalledWith(23);
  });

  it("allows an administrator to create verified service and emergency directory records", async () => {
    const caller = rootRouter.createCaller(context("admin"));
    await caller.issuer.directories.services.create({ name: "A verified service", description: "A real service description suitable for a directory record.", serviceType: "support", eligibilityRequirement: "A scoped eligibility requirement", sourceUrl: "https://example.org/service", isPublished: false });
    await caller.issuer.directories.emergency.create({ emergencyType: "safety", regionLabel: "A region", resourceName: "A verified resource", contactLabel: "A current public contact", contactUrl: "https://example.org/contact", sourceUrl: "https://example.org/source", latitude: 40, longitude: -73, isPublished: false });
    expect(dbMocks.createService).toHaveBeenCalledWith(expect.objectContaining({ name: "A verified service", sourceUrl: "https://example.org/service" }));
    expect(dbMocks.createEmergencyResource).toHaveBeenCalledWith(expect.objectContaining({ resourceName: "A verified resource", sourceUrl: "https://example.org/source", latitude: "40", longitude: "-73" }));
  });

  it("bootstraps and administers the First Executive roster only through active First Executive authority", async () => {
    dbMocks.bootstrapFirstExecutive.mockResolvedValue({ id: 1, governanceRole: "first_executive" });
    dbMocks.listOperators.mockResolvedValue([]);
    dbMocks.listOperatorAudits.mockResolvedValue([]);
    dbMocks.findProfileByMemberCode.mockResolvedValue({ userId: 7 });
    const admin = rootRouter.createCaller(context("admin"));
    await admin.issuer.operators.bootstrap();
    await admin.issuer.operators.list();
    await admin.issuer.operators.audit();
    await admin.issuer.operators.approve({ recipientMemberCode: "root-0123456789", operatorLabel: "First Issuer", governanceRole: "issuer" });
    await admin.issuer.operators.setStatus({ operatorId: 7, status: "suspended" });
    expect(dbMocks.bootstrapFirstExecutive).toHaveBeenCalledWith({ userId: 90, operatorLabel: "Issuer test" });
    expect(dbMocks.listOperators).toHaveBeenCalledOnce();
    expect(dbMocks.listOperatorAudits).toHaveBeenCalledOnce();
    expect(dbMocks.approveOperator).toHaveBeenCalledWith(expect.objectContaining({ userId: 7, governanceRole: "issuer", approvedByUserId: 90 }));
    expect(dbMocks.setOperatorStatus).toHaveBeenCalledWith({ operatorId: 7, status: "suspended", actorUserId: 90 });
  });

  it("enforces role boundaries for issuer and directory-steward operators", async () => {
    dbMocks.getActiveOperatorForUser.mockImplementation(async (userId: number) => {
      if (userId === 92) return { id: 2, governanceRole: "issuer", status: "active" };
      if (userId === 93) return { id: 3, governanceRole: "directory_steward", status: "active" };
      return undefined;
    });
    dbMocks.findProfileByMemberCode.mockResolvedValue({ userId: 7 });
    const issuer = rootRouter.createCaller(context("user", 92));
    const steward = rootRouter.createCaller(context("user", 93));
    await issuer.issuer.attestations.create({ recipientMemberCode: "root-0123456789", issuerLabel: "ROOT issuer", issuerKind: "authorized operator", scope: "source review", evidenceStatus: "verified" });
    await expect(issuer.issuer.directories.services.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await steward.issuer.directories.services.create({ name: "A verified service", description: "A real service description suitable for a directory record.", serviceType: "support", eligibilityRequirement: "A scoped eligibility requirement", sourceUrl: "https://example.org/service", isPublished: false });
    await expect(steward.issuer.attestations.create({ recipientMemberCode: "root-0123456789", issuerLabel: "ROOT issuer", issuerKind: "authorized operator", scope: "source review", evidenceStatus: "verified" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMocks.createAttestation).toHaveBeenCalledWith(expect.objectContaining({ issuedByUserId: 92 }));
    expect(dbMocks.createService).toHaveBeenCalledWith(expect.objectContaining({ name: "A verified service" }));
  });
});
