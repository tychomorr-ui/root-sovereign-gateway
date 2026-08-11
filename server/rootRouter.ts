import { TRPCError } from "@trpc/server";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { canRespondToVouch, canRevokeVouch, CLAIM_TYPE_VALUES, consentReceiptText, EMERGENCY_PRIVACY_NOTICE, emergencyLocationIsPersistent, truthOkSignals } from "../shared/root";
import {
  createConsentGrant,
  createScopedVouch,
  createTruthPost,
  exportMemberData,
  findProfileByMemberCode,
  getOrCreateMemberProfile,
  getScopedVouch,
  getServiceEligibility,
  listConsentGrants,
  listEmergencyResources,
  listMemberAttestations,
  listMemberVouches,
  listOwnTruthPosts,
  listPublicTruthPosts,
  listPublishedServices,
  markDeletionRequested,
  markExportRequested,
  respondToScopedVouch,
  revokeConsentGrant,
  revokeScopedVouch,
  updateMemberProfile,
  withdrawTruthPost,
} from "./rootDb";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";

const claimTypeSchema = z.enum(CLAIM_TYPE_VALUES);
const emergencyTypeSchema = z.enum(["safety", "shelter", "food", "health", "legal", "other"]);

function rootError(message: string, code: "BAD_REQUEST" | "FORBIDDEN" | "NOT_FOUND" = "BAD_REQUEST") {
  return new TRPCError({ code, message });
}

export const rootRouter = router({
  profile: router({
    get: protectedProcedure.query(({ ctx }) => getOrCreateMemberProfile(ctx.user.id)),
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
});
