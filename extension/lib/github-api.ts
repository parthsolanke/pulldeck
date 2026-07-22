// GitHub API calls happen from the background service worker only — content
// scripts run in page context and can't hold the token safely or make
// cross-origin requests to api.github.com.

import { looksBinaryContent } from "./binary-sniff";
import type { FileTreeEntry } from "./storage";

interface GitHubRepoResponse {
  default_branch: string;
}

interface GitHubTreeResponse {
  tree: Array<{ path: string; type: string; size?: number }>;
  truncated: boolean;
}

export type FetchRepoTreeResult =
  | { ok: true; defaultBranch: string; files: FileTreeEntry[]; truncated: boolean }
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
  const files: FileTreeEntry[] = treeData.tree
    .filter((item) => item.type === "blob")
    .map((item) => ({ path: item.path, size: item.size ?? 0 }));

  return { ok: true, defaultBranch, files, truncated: treeData.truncated };
}

export type FetchFileContentResult =
  | { ok: true; content: string }
  | { ok: false; error: "not_found" | "rate_limited" | "unknown" | "binary" }
  | { ok: false; error: "too_large"; actualSize: number; maxSize: number };

// Served from jsDelivr's GitHub CDN rather than api.github.com — public
// repo file content isn't subject to GitHub's own rate limit this way, and
// jsDelivr serves it as plain text directly (no base64 to decode).
export async function fetchFileContent(
  owner: string,
  repo: string,
  path: string,
  branch: string,
  maxSizeBytes: number,
): Promise<FetchFileContentResult> {
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(
    `https://cdn.jsdelivr.net/gh/${owner}/${repo}@${branch}/${encodedPath}`,
  );

  if (response.status === 404) return { ok: false, error: "not_found" };
  if (response.status === 429) return { ok: false, error: "rate_limited" };
  if (!response.ok) return { ok: false, error: "unknown" };

  // Fast path: reject before reading the body if the server already told us
  // it's too big.
  const contentLength = response.headers.get("content-length");
  if (contentLength !== null) {
    const declaredSize = Number(contentLength);
    if (Number.isFinite(declaredSize) && declaredSize > maxSizeBytes) {
      return { ok: false, error: "too_large", actualSize: declaredSize, maxSize: maxSizeBytes };
    }
  }

  const content = await response.text();

  // Exact fallback — content-length can be missing, or can under-report
  // relative to the decoded text (e.g. a compressed transfer) — always
  // check the real byte length too, not just when the header was absent.
  const actualSize = new TextEncoder().encode(content).length;
  if (actualSize > maxSizeBytes) {
    return { ok: false, error: "too_large", actualSize, maxSize: maxSizeBytes };
  }

  // Catches what the extension-only isBinaryFile check (run before this
  // fetch even happens) can't: a binary file under an unlisted extension.
  // The bytes are already UTF-8-decoded by .text() at this point, so this
  // checks for what survives that decoding rather than raw bytes.
  if (looksBinaryContent(content)) {
    return { ok: false, error: "binary" };
  }

  return { ok: true, content };
}
