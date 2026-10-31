import { describe, expect, it } from "vitest";

describe("configured Archangel trust root API", () => {
  it("reports the supplied public key as the active receipt trust root", async () => {
    const baseUrl =
      process.env.ROOT_PREVIEW_URL ??
      "https://3000-iez5zma8y0ojyvdi0knqg-5eeab6a4.us1.manus.computer";
    const response = await fetch(`${baseUrl}/api/archangel/contract`);
    expect(response.ok).toBe(true);
    const body = (await response.json()) as {
      status: string;
      contract: string;
      authorityFingerprint?: string;
    };
    expect(body.status).toBe("configured");
    expect(body.contract).toBe("ARCHANGEL/v0");
    expect(body.authorityFingerprint).toBe(
      "5a7d0be5747b2a61bbe4a5d95772ae50a469688e85d40028b501c893dea2013a"
    );
  });
});
