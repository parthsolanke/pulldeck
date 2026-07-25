import { useEffect, useState } from "preact/hooks";
import { getActiveRepo, type ActiveRepo } from "../lib/storage";
import type { ConnectRepoResponse } from "../background/service-worker";
import { parseRepoInput } from "./parse-repo-input";

type Status = "idle" | "loading" | "error" | "success";

export function ConnectRepo() {
  const [activeRepo, setActiveRepo] = useState<ActiveRepo | null>(null);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [fileCount, setFileCount] = useState(0);

  useEffect(() => {
    getActiveRepo().then((repo) => {
      if (repo) {
        setActiveRepo(repo);
        setInput(`${repo.owner}/${repo.repo}`);
      }
    });
  }, []);

  async function handleConnect() {
    const parsed = parseRepoInput(input);
    if (!parsed) {
      setStatus("error");
      setErrorMessage('Enter a repo as "owner/repo" or a github.com URL');
      return;
    }
    const { owner, repo } = parsed;

    setStatus("loading");
    setErrorMessage(null);

    const response: ConnectRepoResponse = await chrome.runtime.sendMessage({
      type: "connect-repo",
      owner,
      repo,
    });

    if (!response.ok) {
      setStatus("error");
      setErrorMessage(
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
    setStatus("success");
  }

  return (
    <>
      <div class="connect-form">
        <div class="connect-input-wrap">
          {activeRepo && <span class="connected-dot" aria-hidden="true"></span>}
          <input
            class={activeRepo ? "has-dot" : ""}
            type="text"
            placeholder="owner/repo or github.com URL"
            value={input}
            onInput={(e) => setInput((e.target as HTMLInputElement).value)}
          />
        </div>
        <button onClick={handleConnect} disabled={status === "loading"}>
          {status === "loading" ? (
            <span class="btn-spinner" aria-hidden="true"></span>
          ) : activeRepo ? (
            "Reconnect"
          ) : (
            "Connect"
          )}
        </button>
      </div>
      {status === "error" && (
        <p class="status-message error">{errorMessage}</p>
      )}
      {status === "success" && (
        <p class="status-message">
          Connected — {fileCount} file{fileCount === 1 ? "" : "s"} indexed.
        </p>
      )}
      {status === "success" && truncated && (
        <p class="status-message warning">
          Repo is very large — showing a partial file list.
        </p>
      )}
    </>
  );
}
