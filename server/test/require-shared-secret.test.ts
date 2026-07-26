import { describe, expect, it } from "vitest";
import { hasValidSharedSecret } from "../src/require-shared-secret";

describe("hasValidSharedSecret", () => {
  it("returns true when the header matches", () => {
    const request = new Request("https://example.com", {
      headers: { "X-Pulldeck-Secret": "correct-secret" },
    });
    expect(hasValidSharedSecret(request, "correct-secret")).toBe(true);
  });

  it("returns false when the header is missing", () => {
    const request = new Request("https://example.com");
    expect(hasValidSharedSecret(request, "correct-secret")).toBe(false);
  });

  it("returns false when the header doesn't match", () => {
    const request = new Request("https://example.com", {
      headers: { "X-Pulldeck-Secret": "wrong-secret" },
    });
    expect(hasValidSharedSecret(request, "correct-secret")).toBe(false);
  });
});
