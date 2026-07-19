// GitHub API calls happen from the background service worker only — content
// scripts run in page context and can't hold the token safely or make
// cross-origin requests to api.github.com.

interface GitHubRepoResponse {
  default_branch: string;
}

interface GitHubTreeResponse {
  tree: Array<{ path: string; type: string }>;
  truncated: boolean;
}

export type FetchRepoTreeResult =
  | { ok: true; defaultBranch: string; files: string[]; truncated: boolean }
  | { ok: false; error: "not_found" | "rate_limited" | "unknown" };

export async function fetchRepoTree(
  owner: string,
  repo: string,
): Promise<FetchRepoTreeResult> {
  const repoResponse = await fetch(
    `https://api.github.com/repos/${owner}/${repo}`,
  );

  if (repoResponse.status === 404) return { ok: false, error: "not_found" };
  if (repoResponse.status === 403) return { ok: false, error: "rate_limited" };
  if (!repoResponse.ok) return { ok: false, error: "unknown" };

  const repoData: GitHubRepoResponse = await repoResponse.json();
  const defaultBranch = repoData.default_branch;

  const treeResponse = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`,
  );

  if (treeResponse.status === 403) return { ok: false, error: "rate_limited" };
  if (!treeResponse.ok) return { ok: false, error: "unknown" };

  const treeData: GitHubTreeResponse = await treeResponse.json();
  const files = treeData.tree
    .filter((item) => item.type === "blob")
    .map((item) => item.path);

  return { ok: true, defaultBranch, files, truncated: treeData.truncated };
}

interface GitHubContentResponse {
  content?: string;
  encoding?: string;
}

export type FetchFileContentResult =
  | { ok: true; content: string }
  | { ok: false; error: "not_found" | "rate_limited" | "too_large" | "unknown" };

export async function fetchFileContent(
  owner: string,
  repo: string,
  path: string,
  branch: string,
): Promise<FetchFileContentResult> {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
  );

  if (response.status === 404) return { ok: false, error: "not_found" };
  if (response.status === 403) return { ok: false, error: "rate_limited" };
  if (!response.ok) return { ok: false, error: "unknown" };

  const data: GitHubContentResponse = await response.json();
  // Files between 1-100MB: GitHub returns 200 but omits content entirely.
  if (!data.content) return { ok: false, error: "too_large" };

  const bytes = Uint8Array.from(atob(data.content), (c) => c.charCodeAt(0));
  const content = new TextDecoder("utf-8").decode(bytes);

  return { ok: true, content };
}
