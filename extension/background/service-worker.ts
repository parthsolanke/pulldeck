import { fetchRepoTree, fetchFileContent } from "../lib/github-api";
import { getActiveRepo, setActiveRepoAndFileTree } from "../lib/storage";

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

export interface FetchFileContentMessage {
  type: "fetch-file-content";
  path: string;
}

export type FetchFileContentResponse =
  | { ok: true; content: string }
  | {
      ok: false;
      error: "not_found" | "rate_limited" | "no_active_repo" | "unknown";
    };

async function handleFetchFileContent(
  path: string,
): Promise<FetchFileContentResponse> {
  const activeRepo = await getActiveRepo();
  if (!activeRepo) return { ok: false, error: "no_active_repo" };

  return fetchFileContent(
    activeRepo.owner,
    activeRepo.repo,
    path,
    activeRepo.defaultBranch,
  );
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "connect-repo") {
    const { owner, repo } = message as ConnectRepoMessage;
    handleConnectRepo(owner, repo).then(sendResponse);
    return true; // keep the message channel open for the async response
  }

  if (message?.type === "fetch-file-content") {
    const { path } = message as FetchFileContentMessage;
    handleFetchFileContent(path).then(sendResponse);
    return true;
  }
});

// TODO: installation-token exchange + refresh, and message routing for
// authenticated GitHub API calls (PR/issue tagging) from content scripts.
