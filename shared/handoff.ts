export const ROOT_HANDOFF_VERSION = "ROOT_TRUTHTALK_HANDOFF/v1" as const;
export const ROOT_HANDOFF_AUDIENCE = "truth-talk" as const;
export const ROOT_HANDOFF_ISSUER_ORIGIN = "https://rootgate.manus.space" as const;
export const ROOT_HANDOFF_TARGET_ORIGIN = "https://rootgate.nexinus.net" as const;
export const ROOT_HANDOFF_SCOPE = ["member_code", "display_name"] as const;
export const ROOT_HANDOFF_TTL_SECONDS = 120;

export type RootTruthTalkHandoffPayload = {
  version: typeof ROOT_HANDOFF_VERSION;
  issuer: "ROOT";
  audience: typeof ROOT_HANDOFF_AUDIENCE;
  subject: string;
  displayName: string | null;
  scope: readonly string[];
  jti: string;
  issuedAt: string;
  expiresAt: string;
};

export type RootTruthTalkHandoffEnvelope = {
  payload: RootTruthTalkHandoffPayload;
  signature: string;
  publicKey: string;
};

export function canonicalHandoffPayload(payload: RootTruthTalkHandoffPayload): string {
  return JSON.stringify({
    version: payload.version,
    issuer: payload.issuer,
    audience: payload.audience,
    subject: payload.subject,
    displayName: payload.displayName,
    scope: [...payload.scope],
    jti: payload.jti,
    issuedAt: payload.issuedAt,
    expiresAt: payload.expiresAt,
  });
}
