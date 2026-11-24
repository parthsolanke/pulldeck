import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { HARD_MAX_FILE_SIZE_BYTES } from "../lib/config";

const githubApi = vi.hoisted(() => ({
  fetchRepoTree: vi.fn(),
  fetchFileContent: vi.fn(),
}));
const serverApi = vi.hoisted(() => ({ fetchInstallationToken: vi.fn() }));
const githubAuth = vi.hoisted(() => ({ getValidInstallationToken: vi.fn() }));
const storage = vi.hoisted(() => ({
  getActiveRepo: vi.fn(),
  getSettings: vi.fn(),
  setActiveRepoAndFileTree: vi.fn(),
  setGitHubInstallation: vi.fn(),
}));

vi.mock("../lib/github-api", () => githubApi);
vi.mock("../lib/server-api", () => serverApi);
vi.mock("../lib/github-auth", () => githubAuth);
vi.mock("../lib/storage", () => storage);

type RuntimeListener = (
  message: unknown,
  sender: unknown,
  sendResponse: (response: unknown) => void,
) => unknown;

let onMessageListener: RuntimeListener | undefined;

function dispatch(message: unknown): Promise<unknown> {
  return new Promise((resolve) => {
    const keptOpen = onMessageListener?.(message, {}, resolve);
    if (keptOpen !== true) resolve(undefined);
  });
}

beforeAll(async () => {
  vi.stubGlobal("chrome", {
    runtime: {
      onInstalled: { addListener: vi.fn() },
      onMessage: {
        addListener: (listener: RuntimeListener) => {
          onMessageListener = listener;
        },
      },
    },
  });
  await import("./service-worker");
});

beforeEach(() => {
  githubApi.fetchRepoTree.mockReset();
  githubApi.fetchFileContent.mockReset();
  serverApi.fetchInstallationToken.mockReset();
  githubAuth.getValidInstallationToken.mockReset();
  storage.getActiveRepo.mockReset();
  storage.getSettings.mockReset();
  storage.setActiveRepoAndFileTree.mockReset();
  storage.setGitHubInstallation.mockReset();

  storage.getSettings.mockResolvedValue({
    maxFileSizeBytes: 1024,
    filePatterns: [],
    patternMode: "exclude",
    theme: "system",
  });
  storage.setActiveRepoAndFileTree.mockResolvedValue(undefined);
  storage.setGitHubInstallation.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("connect-repo message", () => {
  it("stores the repo tree and reports the file count", async () => {
    const files = [
      { path: "a.ts", size: 1 },
      { path: "b.ts", size: 2 },
    ];
    githubApi.fetchRepoTree.mockResolvedValue({
      ok: true,
      defaultBranch: "main",
      files,
      truncated: false,
    });

    const response = await dispatch({ type: "connect-repo", owner: "octo", repo: "repo" });

    expect(githubApi.fetchRepoTree).toHaveBeenCalledWith("octo", "repo");
    expect(storage.setActiveRepoAndFileTree).toHaveBeenCalledWith(
      { owner: "octo", repo: "repo", defaultBranch: "main" },
      { files, truncated: false },
    );
    expect(response).toEqual({
      ok: true,
      defaultBranch: "main",
      fileCount: 2,
      truncated: false,
    });
  });

  it("passes through a fetch failure without storing anything", async () => {
    githubApi.fetchRepoTree.mockResolvedValue({ ok: false, error: "rate_limited" });

    const response = await dispatch({ type: "connect-repo", owner: "octo", repo: "repo" });

    expect(response).toEqual({ ok: false, error: "rate_limited" });
    expect(storage.setActiveRepoAndFileTree).not.toHaveBeenCalled();
  });
});

describe("fetch-file-content message", () => {
  it("reports no_active_repo when nothing is connected", async () => {
    storage.getActiveRepo.mockResolvedValue(null);

    const response = await dispatch({ type: "fetch-file-content", path: "a.ts" });

    expect(response).toEqual({ ok: false, error: "no_active_repo" });
    expect(githubApi.fetchFileContent).not.toHaveBeenCalled();
  });

  it("uses the active repo and clamps the configured file size", async () => {
    storage.getActiveRepo.mockResolvedValue({
      owner: "octo",
      repo: "repo",
      defaultBranch: "main",
    });
    storage.getSettings.mockResolvedValue({
      maxFileSizeBytes: 10_000_000,
      filePatterns: [],
      patternMode: "exclude",
      theme: "system",
    });
    githubApi.fetchFileContent.mockResolvedValue({ ok: true, content: "hello" });

    const response = await dispatch({ type: "fetch-file-content", path: "src/a.ts" });

    expect(githubApi.fetchFileContent).toHaveBeenCalledWith(
      "octo",
      "repo",
      "src/a.ts",
      "main",
      HARD_MAX_FILE_SIZE_BYTES,
    );
    expect(response).toEqual({ ok: true, content: "hello" });
  });
});

describe("connect-github message", () => {
  it("persists the installation and returns the expiry", async () => {
    serverApi.fetchInstallationToken.mockResolvedValue({
      ok: true,
      token: "ghs_token",
      expiresAt: "2030-01-01T00:00:00Z",
    });

    const response = await dispatch({ type: "connect-github", installationId: 42 });

    expect(storage.setGitHubInstallation).toHaveBeenCalledWith({
      installationId: 42,
      token: "ghs_token",
      expiresAt: "2030-01-01T00:00:00Z",
    });
    expect(response).toEqual({ ok: true, expiresAt: "2030-01-01T00:00:00Z" });
  });

  it("passes through a token exchange failure", async () => {
    serverApi.fetchInstallationToken.mockResolvedValue({ ok: false, error: "unauthorized" });

    const response = await dispatch({ type: "connect-github", installationId: 42 });

    expect(response).toEqual({ ok: false, error: "unauthorized" });
    expect(storage.setGitHubInstallation).not.toHaveBeenCalled();
  });
});

describe("github-api-request message", () => {
  it("rejects paths outside /repos/ or containing traversal", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    for (const path of ["/users/octo", "/repos/octo/../secret"]) {
      const response = await dispatch({ type: "github-api-request", path });
      expect(response).toEqual({ ok: false, error: "invalid_request" });
    }

    expect(githubAuth.getValidInstallationToken).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("passes through a token failure", async () => {
    githubAuth.getValidInstallationToken.mockResolvedValue({
      ok: false,
      error: "not_connected",
    });

    const response = await dispatch({ type: "github-api-request", path: "/repos/o/r" });

    expect(response).toEqual({ ok: false, error: "not_connected" });
  });

  it("fetches with the installation token and returns the JSON body", async () => {
    githubAuth.getValidInstallationToken.mockResolvedValue({ ok: true, token: "abc" });
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ number: 1 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const response = await dispatch({ type: "github-api-request", path: "/repos/o/r/pulls/1" });

    expect(fetchSpy).toHaveBeenCalledWith("https://api.github.com/repos/o/r/pulls/1", {
      headers: {
        Authorization: "Bearer abc",
        Accept: "application/vnd.github+json",
      },
    });
    expect(response).toEqual({ ok: true, data: { number: 1 } });
  });

  it("maps GitHub status codes to errors", async () => {
    githubAuth.getValidInstallationToken.mockResolvedValue({ ok: true, token: "abc" });
    const cases: Array<[number, string]> = [
      [404, "not_found"],
      [403, "rate_limited"],
      [500, "unknown"],
    ];
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    for (const [status, error] of cases) {
      fetchSpy.mockResolvedValue(new Response("", { status }));
      const response = await dispatch({ type: "github-api-request", path: "/repos/o/r" });
      expect(response).toEqual({ ok: false, error });
    }
  });
});

describe("unknown messages", () => {
  it("ignores message types it does not handle", async () => {
    expect(await dispatch({ type: "something-else" })).toBeUndefined();
  });
});
