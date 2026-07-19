import { fetchRepoTree } from "../lib/github-api";
import { setActiveRepoAndFileTree } from "../lib/storage";

chrome.runtime.onInstalled.addListener(() => {
  console.info("[pulldeck] installed");
});

export interface ConnectRepoMessage {
  type: "connect-repo";
  owner: string;
  repo: string;
}

export type ConnectRepoResponse =
  | { ok: true; defaultBranch: string; fileCount: number; truncated: boolean }
  | { ok: false; error: "not_found" | "rate_limited" | "unknown" };

async function handleConnectRepo(
  owner: string,
  repo: string,
): Promise<ConnectRepoResponse> {
  const result = await fetchRepoTree(owner, repo);
  if (!result.ok) return result;

  await setActiveRepoAndFileTree(
    { owner, repo, defaultBranch: result.defaultBranch },
    { files: result.files, truncated: result.truncated },
  );

  return {
    ok: true,
    defaultBranch: result.defaultBranch,
    fileCount: result.files.length,
    truncated: result.truncated,
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "connect-repo") {
    const { owner, repo } = message as ConnectRepoMessage;
    handleConnectRepo(owner, repo).then(sendResponse);
    return true; // keep the message channel open for the async response
  }
});

// TODO: installation-token exchange + refresh, and message routing for
// authenticated GitHub API calls (PR/issue tagging) from content scripts.
