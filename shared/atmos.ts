export const ATMOS_SCOPE = "read:health" as const;
export const ATMOS_CHALLENGE_TTL_SECONDS = 300;

export const ATMOS_NODE_CATALOG = [
  { nodeId: "root-gate", displayName: "Root-Gate", posture: "declared_pending", enrollable: true },
  { nodeId: "tesseract-terminus", displayName: "Tesseract-Terminus / Sovereign Provenance Console", posture: "declared_pending", enrollable: true },
  { nodeId: "xinus-clarity", displayName: "XinUS-Clarity", posture: "declared_pending", enrollable: true },
  { nodeId: "kether-gate", displayName: "Monarch-OS", posture: "declared_pending", enrollable: true },
  { nodeId: "tesseract-a", displayName: "Tesseract-A", posture: "declared_pending", enrollable: true },
  { nodeId: "keira", displayName: "KEIRA", posture: "declared_pending", enrollable: true },
  { nodeId: "project-reclaim", displayName: "Project Reclaim", posture: "declared_pending", enrollable: true },
  { nodeId: "iwa-sage", displayName: "IWA Sage", posture: "declared_pending", enrollable: true },
  { nodeId: "resonate-earth", displayName: "Resonate Earth", posture: "planned_unplaced", enrollable: false },
  { nodeId: "exitus-lens", displayName: "Exitus Lens", posture: "planned_unplaced", enrollable: false },
  { nodeId: "valkyrie-adjudication-entity", displayName: "VALKYRIE Adjudication Entity", posture: "verified_reference", enrollable: false },
] as const;

export type AtmosNodeId = (typeof ATMOS_NODE_CATALOG)[number]["nodeId"];
export type AtmosNodeStatus = "ok" | "degraded" | "not_ready";

export function getAtmosNodeCatalogEntry(nodeId: string) {
  return ATMOS_NODE_CATALOG.find(node => node.nodeId === nodeId);
}
