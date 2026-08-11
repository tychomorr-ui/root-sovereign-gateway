import { TRPCError } from "@trpc/server";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { MONARCH_NODE_LAYERS } from "../shared/monarch";
import { canRespondToVouch, canRevokeVouch, CLAIM_TYPE_VALUES, consentReceiptText, EMERGENCY_PRIVACY_NOTICE, emergencyLocationIsPersistent, truthOkSignals } from "../shared/root";
import {
  approveOperator,
  bootstrapFirstExecutive,
  createAttestation,
  createConsentGrant,
  createEmergencyResource,
  createOperatorIntake,
  createPersonalIdentity,
  createProjectReclaimSource,
  createScopedVouch,
  createService,
  createTruthPost,
  exportMemberData,
  findProfileByMemberCode,
  getActiveOperatorForUser,
  getOperatorIntake,
  getActiveMonarchNode,
  getOrCreateMemberProfile,
  getPersonalIdentity,
  getProjectReclaimSource,
  getScopedVouch,
  getServiceEligibility,
  listConsentGrants,
  listEmergencyResources,
  listIssuedAttestations,
  listIssuedAttestationsForOperator,
  listManagedEmergencyResources,
  listManagedServices,
  listManagedProjectReclaimSources,
  listMemberAttestations,
  listMemberVouches,
  listMonarchNodeAudits,
  listMonarchNodes,
  listOperators,
  listOperatorAudits,
  listOperatorIntakeAudits,
  listOperatorIntakes,
  listOwnTruthPosts,
  listOwnProjectReclaimInterests,
  listProjectReclaimAudits,
  listPublicTruthPosts,
  listPublishedProjectReclaimSources,
  listPublishedServices,
  markDeletionRequested,
  markExportRequested,
  markEmergencyResourceReviewed,
  markMonarchNodeReviewed,
  markProjectReclaimSourceReviewed,
  markServiceReviewed,
  respondToScopedVouch,
  recordOperatorIntakeAudit,
  reviewOperatorIntake,
  revokeAttestation,
  revokeConsentGrant,
  revokeScopedVouch,
  registerMonarchNode,
  setEmergencyResourcePublication,
  setMonarchNodeStatus,
  setOperatorStatus,
  setProjectReclaimSourceStatus,
  setServicePublication,
  saveProjectReclaimInterest,
  updateMemberProfile,
  withdrawTruthPost,
} from "./rootDb";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";

const claimTypeSchema = z.enum(CLAIM_TYPE_VALUES);
const emergencyTypeSchema = z.enum(["safety", "shelter", "food", "health", "legal", "other"]);
const governanceRoleSchema = z.enum(["first_executive", "issuer", "directory_steward", "incident_reviewer"]);
type GovernanceRole = z.infer<typeof governanceRoleSchema>;
const requestedOperatorRoleSchema = z.enum(["issuer", "directory_steward", "incident_reviewer"]);
const monarchNodeLayerSchema = z.enum(MONARCH_NODE_LAYERS);
const projectReclaimPillarSchema = z.enum(["health", "housing", "work", "education", "community", "independence"]);
const projectReclaimCountySchema = z.enum(["mendocino", "lake"]);
const projectReclaimSourceKindSchema = z.enum(["resource", "opportunity"]);

function rootError(message: string, code: "BAD_REQUEST" | "FORBIDDEN" | "NOT_FOUND" = "BAD_REQUEST") {
  return new TRPCError({ code, message });
}

async function requireOperator(userId: number, allowedRoles: GovernanceRole[]) {
  const operator = await getActiveOperatorForUser(userId);
  if (!operator || !allowedRoles.includes(operator.governanceRole)) {
    throw rootError("Your active ROOT operator role does not permit this action.", "FORBIDDEN");
  }
  return operator;
}

export const rootRouter = router({
  profile: router({
    get: protectedProcedure.query(({ ctx }) => getOrCreateMemberProfile(ctx.user.id)),
    personalIdentity: router({
      get: protectedProcedure.query(({ ctx }) => getPersonalIdentity(ctx.user.id)),
      create: protectedProcedure.input(z.object({ label: z.string().trim().min(2).max(96) })).mutation(({ ctx, input }) => createPersonalIdentity({ ownerUserId: ctx.user.id, label: input.label })),
    }),
    update: protectedProcedure.input(z.object({ displayName: z.string().trim().min(2).max(96).nullable() }))
      .mutation(({ ctx, input }) => updateMemberProfile(ctx.user.id, input.displayName)),
    requestExport: protectedProcedure.mutation(async ({ ctx }) => {
      await markExportRequested(ctx.user.id);
      return exportMemberData(ctx.user.id);
    }),
    requestDeletion: protectedProcedure.mutation(async ({ ctx }) => {
      await markDeletionRequested(ctx.user.id);
      return { requested: true, message: "Deletion request recorded. Your existing data remains private while the request is processed." };
    }),
  }),

  permissions: router({
    list: protectedProcedure.query(({ ctx }) => listConsentGrants(ctx.user.id)),
    grant: protectedProcedure.input(z.object({
      recipientLabel: z.string().trim().min(2).max(120),
      fieldNames: z.array(z.string().trim().min(2).max(64)).min(1).max(8),
      purpose: z.string().trim().min(6).max(280),
      expiresAt: z.string().datetime().optional(),
    })).mutation(async ({ ctx, input }) => {
      const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
      if (expiresAt && expiresAt <= new Date()) throw rootError("Consent expiry must be in the future.");
      const receiptCode = `ROOT-CONSENT-${randomUUID().replaceAll("-", "").slice(0, 18).toUpperCase()}`;
      const grant = await createConsentGrant({ ...input, ownerUserId: ctx.user.id, receiptCode, expiresAt });
      return {
        grant,
        receipt: consentReceiptText({ receiptCode, recipient: input.recipientLabel, fieldNames: input.fieldNames, purpose: input.purpose, expiresAt }),
      };
    }),
    revoke: protectedProcedure.input(z.object({ grantId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        await revokeConsentGrant(ctx.user.id, input.grantId);
        return { revoked: true };
      }),
  }),

  memberRecord: router({
    mine: protectedProcedure.query(async ({ ctx }) => {
      const [profile, memberAttestations, vouches] = await Promise.all([
        getOrCreateMemberProfile(ctx.user.id),
        listMemberAttestations(ctx.user.id),
        listMemberVouches(ctx.user.id),
      ]);
      return { profile, attestations: memberAttestations, vouches };
    }),
  }),

  projectReclaim: router({
    sources: publicProcedure.query(() => listPublishedProjectReclaimSources()),
    interests: router({
      mine: protectedProcedure.query(({ ctx }) => listOwnProjectReclaimInterests(ctx.user.id)),
      save: protectedProcedure.input(z.object({ sourceId: z.number().int().positive(), privateNote: z.string().trim().max(1000).optional() })).mutation(async ({ ctx, input }) => {
        const source = await getProjectReclaimSource(input.sourceId);
        if (!source || source.status !== "published") throw rootError("You can save interest only for a currently published Project Reclaim source.", "NOT_FOUND");
        return saveProjectReclaimInterest({ ownerUserId: ctx.user.id, sourceId: input.sourceId, privateNote: input.privateNote || null });
      }),
    }),
  }),

  truthTalk: router({
    feed: publicProcedure.query(async () => {
      const posts = await listPublicTruthPosts();
      return posts.map(post => ({
        ...post,
        sourceUrls: JSON.parse(post.sourceUrlsJson) as string[],
        signals: truthOkSignals(post),
      }));
    }),
    mine: protectedProcedure.query(async ({ ctx }) => {
      const posts = await listOwnTruthPosts(ctx.user.id);
      return posts.map(post => ({ ...post, sourceUrls: JSON.parse(post.sourceUrlsJson) as string[], signals: truthOkSignals(post) }));
    }),
    publish: protectedProcedure.input(z.object({
      claimType: claimTypeSchema,
      body: z.string().trim().min(12).max(5000),
      sourceUrls: z.array(z.string().url().max(500)).max(8).default([]),
      evidenceDigest: z.string().trim().min(16).max(128).optional(),
      visibility: z.enum(["public", "members", "private"]).default("public"),
    })).mutation(async ({ ctx, input }) => {
      const profile = await getOrCreateMemberProfile(ctx.user.id);
      const canonical = JSON.stringify({ claimType: input.claimType, body: input.body, sourceUrls: input.sourceUrls, evidenceDigest: input.evidenceDigest ?? null });
      const integrityReceipt = `sha256:${createHash("sha256").update(canonical).digest("hex")}`;
      await createTruthPost({
        authorUserId: ctx.user.id,
        authorLabel: profile.displayName || "ROOT member",
        claimType: input.claimType,
        body: input.body,
        sourceUrls: input.sourceUrls,
        evidenceDigest: input.evidenceDigest ?? null,
        integrityReceipt,
        visibility: input.visibility,
      });
      return { published: true, integrityReceipt };
    }),
    withdraw: protectedProcedure.input(z.object({ postId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        await withdrawTruthPost(ctx.user.id, input.postId);
        return { withdrawn: true };
      }),
  }),

  vouches: router({
    listMine: protectedProcedure.query(async ({ ctx }) => ({ currentUserId: ctx.user.id, vouches: await listMemberVouches(ctx.user.id) })),
    create: protectedProcedure.input(z.object({
      recipientMemberCode: z.string().trim().min(10).max(40),
      scope: z.string().trim().min(4).max(180),
      note: z.string().trim().min(4).max(500).optional(),
    })).mutation(async ({ ctx, input }) => {
      const recipient = await findProfileByMemberCode(input.recipientMemberCode);
      if (!recipient) throw rootError("That member code does not match a ROOT profile.", "NOT_FOUND");
      if (recipient.userId === ctx.user.id) throw rootError("A member cannot issue a vouch to themselves.");
      await createScopedVouch({ voucherUserId: ctx.user.id, subjectUserId: recipient.userId, scope: input.scope, note: input.note ?? null });
      return { created: true, message: "The scoped vouch is pending acceptance by the recipient." };
    }),
    respond: protectedProcedure.input(z.object({ vouchId: z.number().int().positive(), decision: z.enum(["active", "declined"]) }))
      .mutation(async ({ ctx, input }) => {
        const vouch = await getScopedVouch(input.vouchId);
        if (!vouch) throw rootError("Vouch not found.", "NOT_FOUND");
        if (!canRespondToVouch(vouch.subjectUserId, ctx.user.id, vouch.status)) {
          throw rootError("Only the vouch recipient can accept or decline a pending vouch.", "FORBIDDEN");
        }
        await respondToScopedVouch(vouch.id, input.decision);
        return { updated: true };
      }),
    revoke: protectedProcedure.input(z.object({ vouchId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const vouch = await getScopedVouch(input.vouchId);
        if (!vouch) throw rootError("Vouch not found.", "NOT_FOUND");
        if (!canRevokeVouch(vouch.voucherUserId, vouch.subjectUserId, ctx.user.id)) {
          throw rootError("Only a participant can revoke this vouch.", "FORBIDDEN");
        }
        await revokeScopedVouch(vouch.id);
        return { revoked: true };
      }),
  }),

  services: router({
    list: publicProcedure.query(() => listPublishedServices()),
    eligibility: protectedProcedure.input(z.object({ serviceId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const result = await getServiceEligibility(ctx.user.id, input.serviceId);
        if (!result) throw rootError("Service not found.", "NOT_FOUND");
        return result;
      }),
  }),

  emergency: router({
    lookup: publicProcedure.input(z.object({
      emergencyType: emergencyTypeSchema,
      oneTimeLocationConsent: z.literal(true),
      latitude: z.number().min(-90).max(90).optional(),
      longitude: z.number().min(-180).max(180).optional(),
    })).mutation(async ({ input }) => {
      const oneTimeLocation = input.latitude !== undefined && input.longitude !== undefined
        ? { latitude: input.latitude, longitude: input.longitude }
        : undefined;
      const resources = await listEmergencyResources(input.emergencyType, oneTimeLocation);
      return {
        resources,
        locationStored: emergencyLocationIsPersistent(),
        privacyNotice: EMERGENCY_PRIVACY_NOTICE,
        message: resources.length
          ? "Verified directory entries are shown below. ROOT did not store your location."
          : "No verified ROOT directory entry is currently available for this category. If you are in immediate danger, contact your local emergency service.",
      };
    }),
  }),

  issuer: router({
    operators: router({
      bootstrap: adminProcedure.mutation(({ ctx }) => bootstrapFirstExecutive({ userId: ctx.user.id, operatorLabel: ctx.user.name || "First Executive" })),
      list: protectedProcedure.query(async ({ ctx }) => { await requireOperator(ctx.user.id, ["first_executive"]); return listOperators(); }),
      audit: protectedProcedure.query(async ({ ctx }) => { await requireOperator(ctx.user.id, ["first_executive"]); return listOperatorAudits(); }),
      approve: protectedProcedure.input(z.object({ recipientMemberCode: z.string().trim().min(10).max(40), operatorLabel: z.string().trim().min(2).max(120), governanceRole: governanceRoleSchema })).mutation(async ({ ctx, input }) => {
        await requireOperator(ctx.user.id, ["first_executive"]);
        const recipient = await findProfileByMemberCode(input.recipientMemberCode);
        if (!recipient) throw rootError("That member code does not match a ROOT profile.", "NOT_FOUND");
        const reviewDueAt = new Date(); reviewDueAt.setMonth(reviewDueAt.getMonth() + 3);
        return approveOperator({ userId: recipient.userId, operatorLabel: input.operatorLabel, governanceRole: input.governanceRole, approvedByUserId: ctx.user.id, reviewDueAt });
      }),
      setStatus: protectedProcedure.input(z.object({ operatorId: z.number().int().positive(), status: z.enum(["active", "suspended"]) })).mutation(async ({ ctx, input }) => {
        await requireOperator(ctx.user.id, ["first_executive"]); await setOperatorStatus({ ...input, actorUserId: ctx.user.id }); return { updated: true };
      }),
      intakes: router({
        list: protectedProcedure.query(async ({ ctx }) => {
          await requireOperator(ctx.user.id, ["first_executive"]);
          return listOperatorIntakes();
        }),
        audit: protectedProcedure.query(async ({ ctx }) => {
          await requireOperator(ctx.user.id, ["first_executive"]);
          return listOperatorIntakeAudits();
        }),
        submit: protectedProcedure.input(z.object({
          candidateMemberCode: z.string().trim().min(10).max(40),
          candidateLabel: z.string().trim().min(2).max(120),
          requestedRole: requestedOperatorRoleSchema,
          regionalScope: z.string().trim().min(2).max(160),
          conflictDisclosure: z.string().trim().min(2).max(5000),
        })).mutation(async ({ ctx, input }) => {
          await requireOperator(ctx.user.id, ["first_executive"]);
          return createOperatorIntake({ ...input, submittedByUserId: ctx.user.id });
        }),
        approve: protectedProcedure.input(z.object({ intakeId: z.number().int().positive(), decisionNote: z.string().trim().max(500).optional() })).mutation(async ({ ctx, input }) => {
          await requireOperator(ctx.user.id, ["first_executive"]);
          const intake = await getOperatorIntake(input.intakeId);
          if (!intake) throw rootError("That private operator intake does not exist.", "NOT_FOUND");
          if (intake.status !== "submitted") throw rootError("Only a submitted operator intake can be approved.");
          const recipient = await findProfileByMemberCode(intake.candidateMemberCode);
          if (!recipient) throw rootError("The submitted member code does not match a ROOT profile.", "NOT_FOUND");
          const reviewDueAt = new Date(); reviewDueAt.setMonth(reviewDueAt.getMonth() + 3);
          const operator = await approveOperator({ userId: recipient.userId, operatorLabel: intake.candidateLabel, governanceRole: intake.requestedRole, approvedByUserId: ctx.user.id, reviewDueAt });
          const decisionNote = input.decisionNote ?? "First Executive intake review completed.";
          await reviewOperatorIntake({ intakeId: intake.id, status: "approved", reviewedByUserId: ctx.user.id, decisionNote });
          await recordOperatorIntakeAudit({ intakeId: intake.id, actorUserId: ctx.user.id, action: "approved", decisionNote });
          return operator;
        }),
        decline: protectedProcedure.input(z.object({ intakeId: z.number().int().positive(), decisionNote: z.string().trim().min(2).max(500) })).mutation(async ({ ctx, input }) => {
          await requireOperator(ctx.user.id, ["first_executive"]);
          const intake = await getOperatorIntake(input.intakeId);
          if (!intake) throw rootError("That private operator intake does not exist.", "NOT_FOUND");
          if (intake.status !== "submitted") throw rootError("Only a submitted operator intake can be declined.");
          await reviewOperatorIntake({ intakeId: intake.id, status: "declined", reviewedByUserId: ctx.user.id, decisionNote: input.decisionNote });
          await recordOperatorIntakeAudit({ intakeId: intake.id, actorUserId: ctx.user.id, action: "declined", decisionNote: input.decisionNote });
          return { declined: true };
        }),
      }),
    }),
    nodes: router({
      list: protectedProcedure.query(async ({ ctx }) => { await requireOperator(ctx.user.id, ["first_executive"]); return listMonarchNodes(); }),
      audit: protectedProcedure.query(async ({ ctx }) => { await requireOperator(ctx.user.id, ["first_executive"]); return listMonarchNodeAudits(); }),
      register: protectedProcedure.input(z.object({
        nodeCode: z.string().trim().toUpperCase().regex(/^[ARS][1-9]$/),
        nodeLabel: z.string().trim().min(2).max(140),
        layer: monarchNodeLayerSchema,
        mandate: z.string().trim().min(8).max(280),
        regionLabel: z.string().trim().min(2).max(160).optional(),
        capabilityManifest: z.array(z.string().trim().min(2).max(120)).min(1).max(12),
        status: z.enum(["planned", "active"]).default("planned"),
        operatorMemberCode: z.string().trim().min(10).max(40).optional(),
      })).mutation(async ({ ctx, input }) => {
        await requireOperator(ctx.user.id, ["first_executive"]);
        const expectedLayer = input.nodeCode.startsWith("A") ? "anchor" : input.nodeCode.startsWith("R") ? "relay" : "signal";
        if (input.layer !== expectedLayer) throw rootError("The node code prefix must match its Monarch layer.");
        const profile = input.operatorMemberCode ? await findProfileByMemberCode(input.operatorMemberCode) : undefined;
        if (input.operatorMemberCode && !profile) throw rootError("That node operator member code does not match a ROOT profile.", "NOT_FOUND");
        const reviewDueAt = new Date(); reviewDueAt.setMonth(reviewDueAt.getMonth() + 3);
        return registerMonarchNode({ ...input, regionLabel: input.regionLabel ?? null, operatorUserId: profile?.userId ?? null, approvedByUserId: ctx.user.id, reviewDueAt });
      }),
      setStatus: protectedProcedure.input(z.object({ nodeId: z.number().int().positive(), status: z.enum(["active", "suspended"]) })).mutation(async ({ ctx, input }) => {
        await requireOperator(ctx.user.id, ["first_executive"]); await setMonarchNodeStatus({ ...input, actorUserId: ctx.user.id }); return { updated: true };
      }),
      markReviewed: protectedProcedure.input(z.object({ nodeId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
        await requireOperator(ctx.user.id, ["first_executive"]); await markMonarchNodeReviewed({ nodeId: input.nodeId, actorUserId: ctx.user.id }); return { reviewed: true };
      }),
    }),
    attestations: router({
      list: protectedProcedure.query(async ({ ctx }) => {
        const operator = await requireOperator(ctx.user.id, ["first_executive", "issuer", "incident_reviewer"]);
        return operator.governanceRole === "first_executive" ? listIssuedAttestations() : listIssuedAttestationsForOperator(ctx.user.id);
      }),
      create: protectedProcedure.input(z.object({ recipientMemberCode: z.string().trim().min(10).max(40), issuerLabel: z.string().trim().min(2).max(140), issuerKind: z.string().trim().min(2).max(80), scope: z.string().trim().min(4).max(180), evidenceStatus: z.enum(["not-provided", "declared", "verified", "disputed"]) })).mutation(async ({ ctx, input }) => {
        await requireOperator(ctx.user.id, ["first_executive", "issuer"]);
        const recipient = await findProfileByMemberCode(input.recipientMemberCode);
        if (!recipient) throw rootError("That member code does not match a ROOT profile.", "NOT_FOUND");
        await createAttestation({ subjectUserId: recipient.userId, issuedByUserId: ctx.user.id, issuerLabel: input.issuerLabel, issuerKind: input.issuerKind, scope: input.scope, evidenceStatus: input.evidenceStatus });
        return { created: true };
      }),
      revoke: protectedProcedure.input(z.object({ attestationId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
        await requireOperator(ctx.user.id, ["first_executive", "incident_reviewer"]); await revokeAttestation(input.attestationId); return { revoked: true };
      }),
    }),
    projectReclaim: router({
      list: protectedProcedure.query(async ({ ctx }) => { await requireOperator(ctx.user.id, ["first_executive", "directory_steward"]); return listManagedProjectReclaimSources(); }),
      audit: protectedProcedure.query(async ({ ctx }) => { await requireOperator(ctx.user.id, ["first_executive"]); return listProjectReclaimAudits(); }),
      create: protectedProcedure.input(z.object({
        title: z.string().trim().min(2).max(180),
        description: z.string().trim().min(12).max(5000),
        pillar: projectReclaimPillarSchema,
        sourceKind: projectReclaimSourceKindSchema,
        county: projectReclaimCountySchema,
        sourceUrl: z.string().url().max(500),
        availabilityNote: z.string().trim().min(4).max(500),
        nodeId: z.number().int().positive().optional(),
        status: z.enum(["draft", "internal_watchlist", "published"]).default("internal_watchlist"),
      })).mutation(async ({ ctx, input }) => {
        const operator = await requireOperator(ctx.user.id, ["first_executive", "directory_steward"]);
        let activeNode = input.nodeId ? await getActiveMonarchNode(input.nodeId) : undefined;
        if (input.nodeId && !activeNode) throw rootError("Project Reclaim sources can be assigned only to an active Monarch node.", "NOT_FOUND");
        if (input.status === "published") {
          if (operator.governanceRole !== "first_executive") throw rootError("Only the First Executive can publish a Project Reclaim source.", "FORBIDDEN");
          if (!activeNode || !activeNode.regionLabel?.toLowerCase().includes(input.county)) throw rootError("Public Project Reclaim sources require an active node whose regional mandate matches the county.", "FORBIDDEN");
        }
        return createProjectReclaimSource({ ...input, nodeId: activeNode?.id ?? null, createdByUserId: ctx.user.id });
      }),
      setStatus: protectedProcedure.input(z.object({ sourceId: z.number().int().positive(), status: z.enum(["published", "unpublished", "internal_watchlist"]) })).mutation(async ({ ctx, input }) => {
        const operator = await requireOperator(ctx.user.id, ["first_executive", "directory_steward"]);
        const source = await getProjectReclaimSource(input.sourceId);
        if (!source) throw rootError("Project Reclaim source not found.", "NOT_FOUND");
        if (input.status === "published") {
          if (operator.governanceRole !== "first_executive") throw rootError("Only the First Executive can publish a Project Reclaim source.", "FORBIDDEN");
          const activeNode = source.nodeId ? await getActiveMonarchNode(source.nodeId) : undefined;
          if (!activeNode || !activeNode.regionLabel?.toLowerCase().includes(source.county)) throw rootError("Public Project Reclaim sources require an active node whose regional mandate matches the county.", "FORBIDDEN");
        }
        await setProjectReclaimSourceStatus({ ...input, actorUserId: ctx.user.id });
        return { updated: true };
      }),
      markReviewed: protectedProcedure.input(z.object({ sourceId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
        await requireOperator(ctx.user.id, ["first_executive", "directory_steward"]);
        await markProjectReclaimSourceReviewed({ sourceId: input.sourceId, actorUserId: ctx.user.id });
        return { reviewed: true };
      }),
    }),
    directories: router({
      services: router({
        list: protectedProcedure.query(async ({ ctx }) => { await requireOperator(ctx.user.id, ["first_executive", "directory_steward"]); return listManagedServices(); }),
        create: protectedProcedure.input(z.object({ name: z.string().trim().min(2).max(140), description: z.string().trim().min(12).max(5000), serviceType: z.string().trim().min(2).max(100), eligibilityRequirement: z.string().trim().min(4).max(240), sourceUrl: z.string().url().max(500), nodeId: z.number().int().positive().optional(), isPublished: z.boolean().default(false) })).mutation(async ({ ctx, input }) => {
          await requireOperator(ctx.user.id, ["first_executive", "directory_steward"]);
          if (input.nodeId && !await getActiveMonarchNode(input.nodeId)) throw rootError("Directory records can be assigned only to an active Monarch node.", "NOT_FOUND");
          await createService({ ...input, publishedByUserId: ctx.user.id }); return { created: true };
        }),
        setPublication: protectedProcedure.input(z.object({ serviceId: z.number().int().positive(), isPublished: z.boolean() })).mutation(async ({ ctx, input }) => {
          await requireOperator(ctx.user.id, ["first_executive", "directory_steward"]); await setServicePublication(input.serviceId, input.isPublished, ctx.user.id); return { updated: true };
        }),
        markReviewed: protectedProcedure.input(z.object({ serviceId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
          await requireOperator(ctx.user.id, ["first_executive", "directory_steward"]); await markServiceReviewed(input.serviceId); return { reviewed: true };
        }),
      }),
      emergency: router({
        list: protectedProcedure.query(async ({ ctx }) => { await requireOperator(ctx.user.id, ["first_executive", "directory_steward"]); return listManagedEmergencyResources(); }),
        create: protectedProcedure.input(z.object({ emergencyType: emergencyTypeSchema, regionLabel: z.string().trim().min(2).max(160), resourceName: z.string().trim().min(2).max(160), contactLabel: z.string().trim().min(2).max(280), contactUrl: z.string().url().max(500).optional(), sourceUrl: z.string().url().max(500), latitude: z.number().min(-90).max(90).optional(), longitude: z.number().min(-180).max(180).optional(), nodeId: z.number().int().positive().optional(), isPublished: z.boolean().default(false) })).mutation(async ({ ctx, input }) => {
          await requireOperator(ctx.user.id, ["first_executive", "directory_steward"]);
          if ((input.latitude === undefined) !== (input.longitude === undefined)) throw rootError("Provide both directory coordinates or neither.");
          if (input.nodeId && !await getActiveMonarchNode(input.nodeId)) throw rootError("Directory records can be assigned only to an active Monarch node.", "NOT_FOUND");
          await createEmergencyResource({ ...input, contactUrl: input.contactUrl ?? null, latitude: input.latitude?.toString() ?? null, longitude: input.longitude?.toString() ?? null, publishedByUserId: ctx.user.id }); return { created: true };
        }),
        setPublication: protectedProcedure.input(z.object({ resourceId: z.number().int().positive(), isPublished: z.boolean() })).mutation(async ({ ctx, input }) => {
          await requireOperator(ctx.user.id, ["first_executive", "directory_steward"]); await setEmergencyResourcePublication(input.resourceId, input.isPublished, ctx.user.id); return { updated: true };
        }),
        markReviewed: protectedProcedure.input(z.object({ resourceId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
          await requireOperator(ctx.user.id, ["first_executive", "directory_steward"]); await markEmergencyResourceReviewed(input.resourceId); return { reviewed: true };
        }),
      }),
    }),
  }),
});
