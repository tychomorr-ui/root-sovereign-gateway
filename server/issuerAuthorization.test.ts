import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  findProfileByMemberCode: vi.fn(),
  createAttestation: vi.fn(),
  createOperatorIntake: vi.fn(),
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
  getActiveMonarchNode: vi.fn(),
  bootstrapFirstExecutive: vi.fn(),
  listOperators: vi.fn(),
  listOperatorAudits: vi.fn(),
  listOperatorIntakeAudits: vi.fn(),
  listOperatorIntakes: vi.fn(),
  approveOperator: vi.fn(),
  getOperatorIntake: vi.fn(),
  recordOperatorIntakeAudit: vi.fn(),
  reviewOperatorIntake: vi.fn(),
  setOperatorStatus: vi.fn(),
  listIssuedAttestationsForOperator: vi.fn(),
  createProjectReclaimSource: vi.fn(),
  listManagedProjectReclaimSources: vi.fn(),
  listProjectReclaimAudits: vi.fn(),
  getProjectReclaimSource: vi.fn(),
  setProjectReclaimSourceStatus: vi.fn(),
  markProjectReclaimSourceReviewed: vi.fn(),
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
    dbMocks.getActiveMonarchNode.mockResolvedValue({ id: 1, nodeCode: "A1", status: "active", regionLabel: "Mendocino County, California" });
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
    await expect(caller.issuer.operators.intakes.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.issuer.operators.intakes.submit({ candidateMemberCode: "root-0123456789", candidateLabel: "Directory candidate", requestedRole: "directory_steward", regionalScope: "Mendocino County", conflictDisclosure: "No material conflict disclosed." })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.issuer.projectReclaim.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.issuer.projectReclaim.create({ title: "A source", description: "An official public source suitable for Project Reclaim testing.", pillar: "work", sourceKind: "resource", county: "mendocino", sourceUrl: "https://example.org", availabilityNote: "Check the official source for current details.", status: "internal_watchlist" })).rejects.toMatchObject({ code: "FORBIDDEN" });
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
    dbMocks.listManagedServices.mockResolvedValue([{ id: 22, nodeId: 1 }]);
    dbMocks.listManagedEmergencyResources.mockResolvedValue([{ id: 23, nodeId: 1 }]);
    const caller = rootRouter.createCaller(context("admin"));
    await caller.issuer.attestations.list();
    await caller.issuer.attestations.revoke({ attestationId: 21 });
    const managedServices = await caller.issuer.directories.services.list();
    await caller.issuer.directories.services.setPublication({ serviceId: 22, isPublished: true });
    await caller.issuer.directories.services.markReviewed({ serviceId: 22 });
    const managedEmergencyResources = await caller.issuer.directories.emergency.list();
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
    expect(managedServices).toEqual([{ id: 22, nodeId: 1 }]);
    expect(managedEmergencyResources).toEqual([{ id: 23, nodeId: 1 }]);
  });

  it("allows an administrator to create verified service and emergency directory records", async () => {
    const caller = rootRouter.createCaller(context("admin"));
    await caller.issuer.directories.services.create({ name: "A verified service", description: "A real service description suitable for a directory record.", serviceType: "support", eligibilityRequirement: "A scoped eligibility requirement", sourceUrl: "https://example.org/service", nodeId: 1, isPublished: false });
    await caller.issuer.directories.emergency.create({ emergencyType: "safety", regionLabel: "A region", resourceName: "A verified resource", contactLabel: "A current public contact", contactUrl: "https://example.org/contact", sourceUrl: "https://example.org/source", latitude: 40, longitude: -73, nodeId: 1, isPublished: false });
    expect(dbMocks.createService).toHaveBeenCalledWith(expect.objectContaining({ name: "A verified service", sourceUrl: "https://example.org/service", nodeId: 1 }));
    expect(dbMocks.createEmergencyResource).toHaveBeenCalledWith(expect.objectContaining({ resourceName: "A verified resource", sourceUrl: "https://example.org/source", latitude: "40", longitude: "-73", nodeId: 1 }));
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

  it("keeps operator intake private until the First Executive explicitly approves or declines it", async () => {
    const submitted = { id: 41, status: "submitted", candidateMemberCode: "root-0123456789", candidateLabel: "Regional directory candidate", requestedRole: "directory_steward", regionalScope: "Mendocino County", conflictDisclosure: "No material conflict disclosed." };
    dbMocks.createOperatorIntake.mockResolvedValue(submitted);
    dbMocks.listOperatorIntakes.mockResolvedValue([submitted]);
    dbMocks.listOperatorIntakeAudits.mockResolvedValue([]);
    dbMocks.getOperatorIntake.mockResolvedValue(submitted);
    dbMocks.findProfileByMemberCode.mockResolvedValue({ userId: 7 });
    dbMocks.approveOperator.mockResolvedValue({ id: 12, userId: 7, governanceRole: "directory_steward" });
    const admin = rootRouter.createCaller(context("admin"));
    await admin.issuer.operators.intakes.submit({ candidateMemberCode: submitted.candidateMemberCode, candidateLabel: submitted.candidateLabel, requestedRole: "directory_steward", regionalScope: submitted.regionalScope, conflictDisclosure: submitted.conflictDisclosure });
    await expect(admin.issuer.operators.intakes.list()).resolves.toEqual([submitted]);
    await admin.issuer.operators.intakes.approve({ intakeId: submitted.id, decisionNote: "Scope and conflict review completed." });
    expect(dbMocks.createOperatorIntake).toHaveBeenCalledWith(expect.objectContaining({ submittedByUserId: 90, requestedRole: "directory_steward" }));
    expect(dbMocks.approveOperator).toHaveBeenCalledWith(expect.objectContaining({ userId: 7, governanceRole: "directory_steward", approvedByUserId: 90 }));
    expect(dbMocks.reviewOperatorIntake).toHaveBeenCalledWith({ intakeId: 41, status: "approved", reviewedByUserId: 90, decisionNote: "Scope and conflict review completed." });
    expect(dbMocks.recordOperatorIntakeAudit).toHaveBeenCalledWith({ intakeId: 41, actorUserId: 90, action: "approved", decisionNote: "Scope and conflict review completed." });
    await admin.issuer.operators.intakes.decline({ intakeId: submitted.id, decisionNote: "Need a narrower regional scope." });
    expect(dbMocks.reviewOperatorIntake).toHaveBeenCalledWith({ intakeId: 41, status: "declined", reviewedByUserId: 90, decisionNote: "Need a narrower regional scope." });
    expect(dbMocks.recordOperatorIntakeAudit).toHaveBeenCalledWith({ intakeId: 41, actorUserId: 90, action: "declined", decisionNote: "Need a narrower regional scope." });
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

  it("allows a private Lake County watchlist but requires a county-matched active node and First Executive approval to publish", async () => {
    const admin = rootRouter.createCaller(context("admin"));
    await admin.issuer.projectReclaim.create({
      title: "Lake County Housing",
      description: "Official Lake County housing information with availability monitored at the source.",
      pillar: "housing",
      sourceKind: "resource",
      county: "lake",
      sourceUrl: "https://www.lakecountyca.gov/808/Housing",
      availabilityNote: "The official source currently states its voucher waitlist is closed.",
      status: "internal_watchlist",
    });
    expect(dbMocks.createProjectReclaimSource).toHaveBeenCalledWith(expect.objectContaining({ county: "lake", status: "internal_watchlist", nodeId: null, createdByUserId: 90 }));

    await expect(admin.issuer.projectReclaim.create({
      title: "Lake County Housing",
      description: "Official Lake County housing information with availability monitored at the source.",
      pillar: "housing",
      sourceKind: "resource",
      county: "lake",
      sourceUrl: "https://www.lakecountyca.gov/808/Housing",
      availabilityNote: "The official source currently states its voucher waitlist is closed.",
      nodeId: 1,
      status: "published",
    })).rejects.toMatchObject({ code: "FORBIDDEN" });

    await admin.issuer.projectReclaim.create({
      title: "Mendocino CalWORKs Job Services",
      description: "Official County employment and training support for eligible CalWORKs recipients.",
      pillar: "work",
      sourceKind: "resource",
      county: "mendocino",
      sourceUrl: "https://www.mendocinocounty.gov/departments/social-services/employment-family-assistance-services/calworks-job-services",
      availabilityNote: "Eligibility and participation decisions remain with Mendocino County.",
      nodeId: 1,
      status: "published",
    });
    expect(dbMocks.createProjectReclaimSource).toHaveBeenCalledWith(expect.objectContaining({ county: "mendocino", status: "published", nodeId: 1, createdByUserId: 90 }));
  });
});
