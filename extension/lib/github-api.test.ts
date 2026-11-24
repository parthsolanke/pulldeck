import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchFileContent, fetchRepoTree } from "./github-api";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function mockFetch(...responses: Response[]) {
  const fetchMock = vi.fn();
  for (const response of responses) fetchMock.mockResolvedValueOnce(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("fetchRepoTree", () => {
  it("returns blob entries with the default branch and truncation flag", async () => {
    const fetchMock = mockFetch(
      jsonResponse({ default_branch: "main" }),
      jsonResponse({
        tree: [
          { path: "src/index.ts", type: "blob", size: 42 },
          { path: "src", type: "tree" },
          { path: "README.md", type: "blob" },
        ],
        truncated: true,
      }),
    );

    const result = await fetchRepoTree("octo", "repo");

    expect(result).toEqual({
      ok: true,
      defaultBranch: "main",
      files: [
        { path: "src/index.ts", size: 42 },
        { path: "README.md", size: 0 },
      ],
      truncated: true,
    });
    expect(fetchMock).toHaveBeenNthCalledWith(1, "https://api.github.com/repos/octo/repo");
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://api.github.com/repos/octo/repo/git/trees/main?recursive=1",
    );
  });

  it("maps a 404 on the repo request to not_found", async () => {
    mockFetch(jsonResponse({}, 404));
    await expect(fetchRepoTree("octo", "missing")).resolves.toEqual({
      ok: false,
      error: "not_found",
    });
  });

  it("maps a 403 on the repo request to rate_limited", async () => {
    mockFetch(jsonResponse({}, 403));
    await expect(fetchRepoTree("octo", "repo")).resolves.toEqual({
      ok: false,
      error: "rate_limited",
    });
  });

  it("maps any other repo error to unknown", async () => {
    mockFetch(jsonResponse({}, 500));
    await expect(fetchRepoTree("octo", "repo")).resolves.toEqual({
      ok: false,
      error: "unknown",
    });
  });

  it("maps a 403 on the tree request to rate_limited", async () => {
    mockFetch(jsonResponse({ default_branch: "main" }), jsonResponse({}, 403));
    await expect(fetchRepoTree("octo", "repo")).resolves.toEqual({
      ok: false,
      error: "rate_limited",
    });
  });

  it("maps a non-OK tree request to unknown", async () => {
    mockFetch(jsonResponse({ default_branch: "main" }), jsonResponse({}, 502));
    await expect(fetchRepoTree("octo", "repo")).resolves.toEqual({
      ok: false,
      error: "unknown",
    });
  });
});

describe("fetchFileContent", () => {
  it("returns the file content and encodes each path segment", async () => {
    const fetchMock = mockFetch(new Response("hello", { status: 200 }));

    const result = await fetchFileContent("octo", "repo", "src/my file.ts", "main", 1024);

    expect(result).toEqual({ ok: true, content: "hello" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://cdn.jsdelivr.net/gh/octo/repo@main/src/my%20file.ts",
    );
  });

  it("maps status codes to errors", async () => {
    const cases: Array<[number, string]> = [
      [404, "not_found"],
      [429, "rate_limited"],
      [500, "unknown"],
    ];

    for (const [status, error] of cases) {
      mockFetch(new Response("", { status }));
      await expect(
        fetchFileContent("octo", "repo", "a.ts", "main", 1024),
      ).resolves.toEqual({ ok: false, error });
    }
  });

  it("rejects early when Content-Length exceeds the limit", async () => {
    mockFetch(
      new Response("ignored", {
        status: 200,
        headers: { "Content-Length": "5000" },
      }),
    );

    await expect(
      fetchFileContent("octo", "repo", "a.ts", "main", 100),
    ).resolves.toEqual({ ok: false, error: "too_large", actualSize: 5000, maxSize: 100 });
  });

  it("rejects after reading when the body exceeds the limit", async () => {
    mockFetch(new Response("abcdef", { status: 200 }));

    await expect(
      fetchFileContent("octo", "repo", "a.ts", "main", 3),
    ).resolves.toEqual({ ok: false, error: "too_large", actualSize: 6, maxSize: 3 });
  });

  it("rejects binary-looking content", async () => {
    mockFetch(new Response("abc\0def", { status: 200 }));

    await expect(
      fetchFileContent("octo", "repo", "a.bin", "main", 1024),
    ).resolves.toEqual({ ok: false, error: "binary" });
  });
});
