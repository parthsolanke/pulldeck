import { useEffect, useRef, useState } from "preact/hooks";
import { FolderCode, X } from "lucide-preact";
import { clearActiveRepo, getActiveRepo, getFileTree, type ActiveRepo } from "../lib/storage";
import type { ConnectRepoResponse } from "../background/service-worker";
import type { MountStatusQuery, MountStatusQueryResponse } from "../content-scripts/mount";
import { parseRepoInput } from "./parse-repo-input";

// ERROR_FADE_MS must match the .status-message.fading transition duration in popup.css.
const ERROR_VISIBLE_MS = 3500;
const ERROR_FADE_MS = 300;

export function ConnectRepo() {
  const [activeRepo, setActiveRepo] = useState<ActiveRepo | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorFading, setErrorFading] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const [fileCount, setFileCount] = useState(0);
  const [tabMountStatus, setTabMountStatus] = useState<MountStatusQueryResponse | "unknown">(
    "unknown",
  );
  const errorFadeTimeoutRef = useRef<number | undefined>(undefined);
  const errorClearTimeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    getActiveRepo().then((repo) => {
      if (repo) {
        setActiveRepo(repo);
        setInput(`${repo.owner}/${repo.repo}`);
      }
    });
    // The resolved row shows file count for a repo connected in an earlier
    // session too, not just right after a fresh Connect — read the last saved tree.
    getFileTree().then((tree) => {
      if (tree) {
        setFileCount(tree.files.length);
        setTruncated(tree.truncated);
      }
    });
  }, []);

  // Tab-scoped, unlike repo-connect above (that's global) — reflects whether pulldeck actually mounted on the tab that's open right now.
  useEffect(() => {
    async function loadTabMountStatus() {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;

      try {
        const response: MountStatusQueryResponse = await chrome.tabs.sendMessage(
          tab.id,
          { type: "get-mount-status" } satisfies MountStatusQuery,
        );
        setTabMountStatus(response);
      } catch {
        // No content script listening on this tab — wrong site, or not loaded yet.
        setTabMountStatus("unknown");
      }
    }

    loadTabMountStatus();
  }, []);

  function showError(message: string) {
    if (errorFadeTimeoutRef.current) window.clearTimeout(errorFadeTimeoutRef.current);
    if (errorClearTimeoutRef.current) window.clearTimeout(errorClearTimeoutRef.current);
    setErrorMessage(message);
    setErrorFading(false);
    errorFadeTimeoutRef.current = window.setTimeout(() => setErrorFading(true), ERROR_VISIBLE_MS);
    errorClearTimeoutRef.current = window.setTimeout(
      () => setErrorMessage(null),
      ERROR_VISIBLE_MS + ERROR_FADE_MS,
    );
  }

  async function handleConnect() {
    const parsed = parseRepoInput(input);
    if (!parsed) {
      showError('Enter a repo as "owner/repo" or a github.com URL');
      return;
    }
    const { owner, repo } = parsed;

    setLoading(true);
    setErrorMessage(null);

    const response: ConnectRepoResponse = await chrome.runtime.sendMessage({
      type: "connect-repo",
      owner,
      repo,
    });

    setLoading(false);

    if (!response.ok) {
      showError(
        response.error === "not_found"
          ? "Repo not found (or private — only public repos work for now)"
          : response.error === "rate_limited"
            ? "GitHub rate limit hit — try again in a bit"
            : "Something went wrong connecting to GitHub",
      );
      return;
    }

    setActiveRepo({ owner, repo, defaultBranch: response.defaultBranch });
    setTruncated(response.truncated);
    setFileCount(response.fileCount);
  }

  async function handleDisconnect() {
    await clearActiveRepo();
    setActiveRepo(null);
    setInput("");
    setFileCount(0);
    setTruncated(false);
  }

  return (
    <>
      <div class="repo-card-heading">Repository</div>
      <div class="repo-card-helper">Connect a public GitHub repo to tag its files in chat.</div>
      <div class="repo-connect-row">
        <input
          type="text"
          placeholder="owner/repo or github.com URL"
          value={input}
          onInput={(e) => setInput((e.target as HTMLInputElement).value)}
        />
        <button type="button" onClick={handleConnect} disabled={loading}>
          {loading ? (
            <span class="btn-spinner" aria-hidden="true"></span>
          ) : activeRepo ? (
            "Reconnect"
          ) : (
            "Connect"
          )}
        </button>
      </div>
      {activeRepo && (
        <div class="repo-resolved-row">
          <span class="repo-resolved-icon">
            <FolderCode size={16} />
          </span>
          <div class="repo-resolved-text">
            <div class="repo-resolved-name">{activeRepo.repo}</div>
            <div class="repo-resolved-sub">
              <span class="dot" aria-hidden="true"></span>
              {fileCount} file{fileCount === 1 ? "" : "s"} indexed
              {/* An ongoing fact about the connection, so it persists rather than fading like the error message. */}
              {truncated && <span class="repo-partial"> &middot; Partial</span>}
            </div>
          </div>
          <button
            type="button"
            class="repo-remove-btn"
            aria-label={`Disconnect ${activeRepo.repo}`}
            onClick={handleDisconnect}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {errorMessage && (
        <p class={`status-message error${errorFading ? " fading" : ""}`}>{errorMessage}</p>
      )}
      {tabMountStatus === "failed" && (
        <p class="status-message warning">
          pulldeck couldn't attach to this tab. Refresh the page to retry.
        </p>
      )}
    </>
  );
}
