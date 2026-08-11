export const MONARCH_NODE_LAYERS = ["anchor", "relay", "signal"] as const;
export type MonarchNodeLayer = (typeof MONARCH_NODE_LAYERS)[number];

export const MONARCH_NODE_BLUEPRINT = [
  { code: "A1", layer: "anchor", mandate: "Sovereign governance and policy custody" },
  { code: "A2", layer: "anchor", mandate: "Consent, identity, and portable-proof custody" },
  { code: "A3", layer: "anchor", mandate: "Incident, correction, and continuity custody" },
  { code: "R1", layer: "relay", mandate: "Regional directory federation" },
  { code: "R2", layer: "relay", mandate: "Evidence and provenance federation" },
  { code: "R3", layer: "relay", mandate: "Public-interest information federation" },
  { code: "R4", layer: "relay", mandate: "Language and accessibility federation" },
  { code: "R5", layer: "relay", mandate: "Service and eligibility federation" },
  { code: "R6", layer: "relay", mandate: "Dispute and restoration federation" },
  { code: "S1", layer: "signal", mandate: "Local source and resource verification" },
  { code: "S2", layer: "signal", mandate: "Local emergency-resource maintenance" },
  { code: "S3", layer: "signal", mandate: "Local service directory maintenance" },
  { code: "S4", layer: "signal", mandate: "Claim-context and correction review" },
  { code: "S5", layer: "signal", mandate: "Local-language source stewardship" },
  { code: "S6", layer: "signal", mandate: "Community access and support routing" },
  { code: "S7", layer: "signal", mandate: "Node security and continuity observation" },
  { code: "S8", layer: "signal", mandate: "Rights, consent, and privacy observation" },
  { code: "S9", layer: "signal", mandate: "Independent audit and feedback observation" },
] as const satisfies ReadonlyArray<{ code: string; layer: MonarchNodeLayer; mandate: string }>;

export const MONARCH_LAYER_LABELS: Record<MonarchNodeLayer, string> = {
  anchor: "3 anchors",
  relay: "6 relays",
  signal: "9 signals",
};
