export const MIRROR_LAW_PILLARS = [
  { name: "Truth", description: "Reality exists independent of opinion." },
  { name: "Responsibility", description: "Freedom requires accountability." },
  { name: "Restoration", description: "Systems should maximize recovery potential." },
  { name: "Stewardship", description: "Leave every system stronger than you found it." },
] as const;

export const CLAIM_TYPES = [
  { value: "report", label: "report" },
  { value: "firsthand_account", label: "firsthand account" },
  { value: "opinion", label: "opinion" },
  { value: "analysis", label: "analysis" },
  { value: "correction", label: "correction" },
  { value: "question", label: "question" },
] as const;

export const CLAIM_TYPE_VALUES = CLAIM_TYPES.map(item => item.value) as [
  "report",
  "firsthand_account",
  "opinion",
  "analysis",
  "correction",
  "question",
];

export type TruthOkSignals = {
  identityBound: boolean;
  integrityBound: boolean;
  sourcesDeclared: boolean;
  reviewCompleted: boolean;
};

export const TRUTH_OK_SIGNAL_LABELS = {
  identityBound: "identity-bound",
  integrityBound: "integrity-bound",
  sourcesDeclared: "sources-declared",
  reviewCompleted: "review-completed",
} as const;

export function truthOkSignals(input: TruthOkSignals) {
  return (Object.entries(TRUTH_OK_SIGNAL_LABELS) as Array<
    [keyof TruthOkSignals, (typeof TRUTH_OK_SIGNAL_LABELS)[keyof TruthOkSignals]]
  >).map(([key, label]) => ({ key, label, complete: input[key] }));
}

export function consentReceiptText(input: {
  receiptCode: string;
  recipient: string;
  fieldNames: string[];
  purpose: string;
  expiresAt?: Date | null;
}) {
  const fields = input.fieldNames.join(", ");
  const expiry = input.expiresAt
    ? ` It expires on ${input.expiresAt.toLocaleDateString()}.`
    : " It remains active until you revoke it.";
  return `Consent receipt ${input.receiptCode}: you granted ${input.recipient} access to ${fields} for ${input.purpose}.${expiry}`;
}

export const EMERGENCY_PRIVACY_NOTICE =
  "Location is requested one time for this lookup only. ROOT does not persist a location history.";

export function canRespondToVouch(subjectUserId: number, actorUserId: number, status: string) {
  return subjectUserId === actorUserId && status === "pending";
}

export function canRevokeVouch(voucherUserId: number, subjectUserId: number, actorUserId: number) {
  return voucherUserId === actorUserId || subjectUserId === actorUserId;
}

export function emergencyLocationIsPersistent() {
  return false;
}

export async function deriveFileIntegrityDigest(bytes: ArrayBuffer) {
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  const hex = Array.from(new Uint8Array(hash)).map(byte => byte.toString(16).padStart(2, "0")).join("");
  return `sha256:${hex}`;
}
