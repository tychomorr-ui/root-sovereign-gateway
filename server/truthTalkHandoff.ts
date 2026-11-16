import { createPrivateKey, createPublicKey, randomUUID, sign } from "node:crypto";
import {
  ROOT_HANDOFF_AUDIENCE,
  ROOT_HANDOFF_SCOPE,
  ROOT_HANDOFF_TTL_SECONDS,
  ROOT_HANDOFF_VERSION,
  canonicalHandoffPayload,
  type RootTruthTalkHandoffEnvelope,
} from "../shared/handoff";
import { getOrCreateMemberProfile } from "./rootDb";
import { createTruthTalkHandoff, revokeTruthTalkHandoff } from "./rootDb";

function getPrivateKey() {
  const value = process.env.ROOT_TRUTHTALK_HANDOFF_PRIVATE_KEY_PEM?.trim();
  if (!value) throw new Error("ROOT TruthTalk handoff signing key is not configured.");
  return createPrivateKey(value);
}

export function getTruthTalkHandoffPublicKey() {
  return createPublicKey(getPrivateKey()).export({ type: "spki", format: "der" }).toString("base64");
}

export async function issueTruthTalkHandoff(userId: number): Promise<RootTruthTalkHandoffEnvelope> {
  const profile = await getOrCreateMemberProfile(userId);
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + ROOT_HANDOFF_TTL_SECONDS * 1000);
  const payload = {
    version: ROOT_HANDOFF_VERSION,
    issuer: "ROOT" as const,
    audience: ROOT_HANDOFF_AUDIENCE,
    subject: profile.memberCode,
    displayName: profile.displayName,
    scope: [...ROOT_HANDOFF_SCOPE],
    jti: randomUUID().replaceAll("-", ""),
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
  const signature = sign(null, Buffer.from(canonicalHandoffPayload(payload)), getPrivateKey()).toString("base64");
  await createTruthTalkHandoff({
    ownerUserId: userId,
    jti: payload.jti,
    version: payload.version,
    audience: payload.audience,
    scope: [...payload.scope],
    subject: payload.subject,
    displayName: payload.displayName,
    issuedAt,
    expiresAt,
  });
  return { payload, signature, publicKey: getTruthTalkHandoffPublicKey() };
}

export async function revokeIssuedTruthTalkHandoff(userId: number, jti: string) {
  await revokeTruthTalkHandoff(userId, jti);
}
