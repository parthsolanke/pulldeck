import { env } from "cloudflare:workers";
import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { afterEach, describe, expect, it, vi } from "vitest";
import worker from "../src/index";
import type { Env } from "../src/env";
import { TEST_PRIVATE_KEY } from "./fixtures";

const testEnv: Env = {
  ...env,
  GITHUB_APP_ID: "1",
  GITHUB_APP_PRIVATE_KEY: TEST_PRIVATE_KEY,
  CLIENT_SHARED_SECRET: "test-secret",
};

afterEach(() => {
  vi.restoreAllMocks();
});

async function callWorker(request: Request) {
  const ctx = createExecutionContext();
  const response = await worker.fetch(request, testEnv, ctx);
  await waitOnExecutionContext(ctx);
  return response;
}

describe("worker fetch handler", () => {
  it("404s a request to an unknown route", async () => {
    const response = await callWorker(new Request("https://example.com/nope"));
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ ok: false, error: "not_found" });
  });

  it("401s a POST without the shared secret", async () => {
    const response = await callWorker(
      new Request("https://example.com/installation-token", {
        method: "POST",
        body: JSON.stringify({ installationId: 42 }),
      }),
    );
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ ok: false, error: "unauthorized" });
  });

  it("400s a POST with a malformed installationId", async () => {
    const response = await callWorker(
      new Request("https://example.com/installation-token", {
        method: "POST",
        headers: { "X-Pulldeck-Secret": "test-secret" },
        body: JSON.stringify({ installationId: "not-a-number" }),
      }),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: "invalid_request" });
  });

  it("returns a token for a valid authenticated request", async () => {
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

    const response = await callWorker(
      new Request("https://example.com/installation-token", {
        method: "POST",
        headers: { "X-Pulldeck-Secret": "test-secret" },
        body: JSON.stringify({ installationId: 42 }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      token: "ghs_abc123",
      expiresAt: "2026-07-27T12:00:00Z",
    });
  });

  it("400s a POST with malformed JSON", async () => {
    const response = await callWorker(
      new Request("https://example.com/installation-token", {
        method: "POST",
        headers: { "X-Pulldeck-Secret": "test-secret" },
        body: "{",
      }),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: "invalid_request" });
  });

  it("maps installation_not_found to 404", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: "Not Found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const response = await callWorker(
      new Request("https://example.com/installation-token", {
        method: "POST",
        headers: { "X-Pulldeck-Secret": "test-secret" },
        body: JSON.stringify({ installationId: 42 }),
      }),
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ ok: false, error: "installation_not_found" });
  });

  it("maps unknown errors to 500", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: "Server Error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const response = await callWorker(
      new Request("https://example.com/installation-token", {
        method: "POST",
        headers: { "X-Pulldeck-Secret": "test-secret" },
        body: JSON.stringify({ installationId: 42 }),
      }),
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ ok: false, error: "unknown" });
  });
});
