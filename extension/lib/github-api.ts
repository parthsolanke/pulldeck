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

export type FetchFileContentResult =
  | { ok: true; content: string }
  | { ok: false; error: "not_found" | "rate_limited" | "unknown" };

// Served from jsDelivr's GitHub CDN rather than api.github.com — public
// repo file content isn't subject to GitHub's own rate limit this way, and
// jsDelivr serves it as plain text directly (no base64 to decode).
export async function fetchFileContent(
  owner: string,
  repo: string,
  path: string,
  branch: string,
): Promise<FetchFileContentResult> {
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(
    `https://cdn.jsdelivr.net/gh/${owner}/${repo}@${branch}/${encodedPath}`,
  );

  if (response.status === 404) return { ok: false, error: "not_found" };
  if (response.status === 429) return { ok: false, error: "rate_limited" };
  if (!response.ok) return { ok: false, error: "unknown" };

  const content = await response.text();
  return { ok: true, content };
}
