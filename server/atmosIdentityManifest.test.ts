import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const manifestPath = "client/public/.well-known/atmos-identity.json";
const expectedSha256 =
  "6b9d5315f3fb12dc12e41cee0ab6994bf6e6aadaba19c895c06ec897746a47ce";

describe("ROOT-GATE Atmos identity manifest", () => {
  it("preserves the exact requested public identity document", () => {
    const bytes = readFileSync(manifestPath);
    const manifest = JSON.parse(bytes.toString("utf8")) as Record<
      string,
      unknown
    >;

    expect(createHash("sha256").update(bytes).digest("hex")).toBe(
      expectedSha256
    );
    expect(manifest.nodeId).toBe("ROOT-GATE");
    expect(manifest.canonicalLocus).toBe("https://rootgate.manus.space");
    expect(manifest.privateKeyIncluded).toBe(false);
  });
});
