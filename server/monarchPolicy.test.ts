import { describe, expect, it } from "vitest";
import { MONARCH_NODE_BLUEPRINT } from "../shared/monarch";

describe("ROOT Monarch federation blueprint", () => {
  it("defines exactly eighteen nodes across the 3–6–9 governance topology", () => {
    expect(MONARCH_NODE_BLUEPRINT).toHaveLength(18);
    expect(MONARCH_NODE_BLUEPRINT.filter(node => node.layer === "anchor")).toHaveLength(3);
    expect(MONARCH_NODE_BLUEPRINT.filter(node => node.layer === "relay")).toHaveLength(6);
    expect(MONARCH_NODE_BLUEPRINT.filter(node => node.layer === "signal")).toHaveLength(9);
  });

  it("uses distinct codes and declared mandates rather than infrastructure locations", () => {
    expect(new Set(MONARCH_NODE_BLUEPRINT.map(node => node.code)).size).toBe(18);
    expect(MONARCH_NODE_BLUEPRINT.every(node => node.mandate.length > 12)).toBe(true);
  });
});
