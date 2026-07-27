import { fetchRepoTree, fetchFileContent } from "../lib/github-api";
import { fetchInstallationToken } from "../lib/server-api";
import { getActiveRepo, getSettings, setActiveRepoAndFileTree, setGitHubInstallation } from "../lib/storage";
import { clampMaxFileSize } from "../lib/config";

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
      error: "not_found" | "rate_limited" | "no_active_repo" | "unknown" | "binary";
    }
  | { ok: false; error: "too_large"; actualSize: number; maxSize: number };

async function handleFetchFileContent(
  path: string,
): Promise<FetchFileContentResponse> {
  const activeRepo = await getActiveRepo();
  if (!activeRepo) return { ok: false, error: "no_active_repo" };

  const settings = await getSettings();
  const maxSizeBytes = clampMaxFileSize(settings.maxFileSizeBytes);

  return fetchFileContent(
    activeRepo.owner,
    activeRepo.repo,
    path,
    activeRepo.defaultBranch,
    maxSizeBytes,
  );
}

export interface ConnectGithubMessage {
  type: "connect-github";
  installationId: number;
}

export type ConnectGithubResponse =
  | { ok: true; expiresAt: string }
  | { ok: false; error: "unauthorized" | "invalid_request" | "installation_not_found" | "unknown" };

async function handleConnectGithub(installationId: number): Promise<ConnectGithubResponse> {
  const result = await fetchInstallationToken(installationId);
  if (!result.ok) return result;

  await setGitHubInstallation({
    installationId,
    token: result.token,
    expiresAt: result.expiresAt,
  });

  return { ok: true, expiresAt: result.expiresAt };
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

  if (message?.type === "connect-github") {
    const { installationId } = message as ConnectGithubMessage;
    handleConnectGithub(installationId).then(sendResponse);
    return true;
  }
});

// TODO: installation-token refresh, and message routing for authenticated
// GitHub API calls (PR/issue tagging) from content scripts.
