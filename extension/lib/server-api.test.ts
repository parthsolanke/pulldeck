import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchInstallationToken } from "./server-api";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("fetchInstallationToken", () => {
  it("posts the installation id with the configured server URL and secret", async () => {
    vi.stubEnv("VITE_PULLDECK_SERVER_URL", "https://pulldeck.example");
    vi.stubEnv("VITE_PULLDECK_CLIENT_SECRET", "test-secret");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ ok: true, token: "ghs_abc", expiresAt: "2030-01-01T00:00:00Z" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchInstallationToken(42);

    expect(result).toEqual({
      ok: true,
      token: "ghs_abc",
      expiresAt: "2030-01-01T00:00:00Z",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      `${import.meta.env.VITE_PULLDECK_SERVER_URL}/installation-token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Pulldeck-Secret": import.meta.env.VITE_PULLDECK_CLIENT_SECRET,
        },
        body: JSON.stringify({ installationId: 42 }),
      },
    );
  });

  it("passes through error payloads", async () => {
    vi.stubEnv("VITE_PULLDECK_SERVER_URL", "https://pulldeck.example");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(fetchInstallationToken(42)).resolves.toEqual({
      ok: false,
      error: "unauthorized",
    });
  });

  it("returns unknown when the request throws", async () => {
    vi.stubEnv("VITE_PULLDECK_SERVER_URL", "https://pulldeck.example");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    await expect(fetchInstallationToken(42)).resolves.toEqual({
      ok: false,
      error: "unknown",
    });
  });
});
