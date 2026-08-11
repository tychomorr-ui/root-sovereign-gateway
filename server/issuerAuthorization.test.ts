import { describe, expect, it, vi } from "vitest";
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
}));

vi.mock("./rootDb", async importOriginal => {
  const actual = await importOriginal<typeof import("./rootDb")>();
  return { ...actual, ...dbMocks };
});

import { rootRouter } from "./rootRouter";

function context(role: "admin" | "user"): TrpcContext {
  return {
    user: { id: 90, openId: "issuer-test", name: "Issuer test", email: null, loginMethod: "manus", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("ROOT issuer and directory authorization", () => {
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
    await caller.issuer.directories.emergency.list();
    await caller.issuer.directories.emergency.setPublication({ resourceId: 23, isPublished: true });
    expect(dbMocks.listIssuedAttestations).toHaveBeenCalledOnce();
    expect(dbMocks.revokeAttestation).toHaveBeenCalledWith(21);
    expect(dbMocks.listManagedServices).toHaveBeenCalledOnce();
    expect(dbMocks.setServicePublication).toHaveBeenCalledWith(22, true);
    expect(dbMocks.listManagedEmergencyResources).toHaveBeenCalledOnce();
    expect(dbMocks.setEmergencyResourcePublication).toHaveBeenCalledWith(23, true);
  });

  it("allows an administrator to create verified service and emergency directory records", async () => {
    const caller = rootRouter.createCaller(context("admin"));
    await caller.issuer.directories.services.create({ name: "A verified service", description: "A real service description suitable for a directory record.", serviceType: "support", eligibilityRequirement: "A scoped eligibility requirement", sourceUrl: "https://example.org/service", isPublished: false });
    await caller.issuer.directories.emergency.create({ emergencyType: "safety", regionLabel: "A region", resourceName: "A verified resource", contactLabel: "A current public contact", contactUrl: "https://example.org/contact", sourceUrl: "https://example.org/source", latitude: 40, longitude: -73, isPublished: false });
    expect(dbMocks.createService).toHaveBeenCalledWith(expect.objectContaining({ name: "A verified service", sourceUrl: "https://example.org/service" }));
    expect(dbMocks.createEmergencyResource).toHaveBeenCalledWith(expect.objectContaining({ resourceName: "A verified resource", sourceUrl: "https://example.org/source", latitude: "40", longitude: "-73" }));
  });
});
