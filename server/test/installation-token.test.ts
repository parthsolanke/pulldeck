import { afterEach, describe, expect, it, vi } from "vitest";
import { exchangeInstallationToken } from "../src/installation-token";
import { TEST_PRIVATE_KEY } from "./fixtures";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("exchangeInstallationToken", () => {
  it("returns a token on success", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          token: "ghs_abc123",
          expires_at: "2026-07-27T12:00:00Z",
          permissions: {},
          repository_selection: "all",
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    );

    const result = await exchangeInstallationToken("1", TEST_PRIVATE_KEY, 42);

    expect(result).toEqual({
      ok: true,
      token: "ghs_abc123",
      expiresAt: "2026-07-27T12:00:00Z",
    });
  });

  it("returns installation_not_found when GitHub responds 404", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: "Not Found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await exchangeInstallationToken("1", TEST_PRIVATE_KEY, 999999);

    expect(result).toEqual({ ok: false, error: "installation_not_found" });
  });

  it("returns unknown on an unexpected failure", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: "Server Error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await exchangeInstallationToken("1", TEST_PRIVATE_KEY, 42);

    expect(result).toEqual({ ok: false, error: "unknown" });
  });
});
