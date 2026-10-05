import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const sourceDirectory = path.dirname(fileURLToPath(import.meta.url));
const styles = readFileSync(path.join(sourceDirectory, "index.css"), "utf8");
const button = readFileSync(path.join(sourceDirectory, "components/ui/button.tsx"), "utf8");
const skeleton = readFileSync(path.join(sourceDirectory, "components/ui/skeleton.tsx"), "utf8");

describe("ROOT interaction motion contract", () => {
  it("keeps hover and press feedback bounded and accessible", () => {
    expect(button).toContain("hover:-translate-y-0.5");
    expect(button).toContain("active:scale-[0.98]");
    expect(button).toContain("motion-reduce:hover:transform-none");
    expect(button).toContain("aria-busy={loading || undefined}");
  });

  it("provides shimmer, entry, status, and reduced-motion safeguards", () => {
    expect(styles).toContain(".motion-skeleton");
    expect(styles).toContain(".motion-enter");
    expect(styles).toContain(".motion-status-pulse");
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
    expect(skeleton).toContain("motion-skeleton");
  });
});
