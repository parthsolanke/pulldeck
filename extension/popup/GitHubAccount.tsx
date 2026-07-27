import { useEffect, useRef, useState } from "preact/hooks";
import { getGitHubInstallation } from "../lib/storage";
import type { ConnectGithubResponse } from "../background/service-worker";

// ERROR_FADE_MS must match the .status-message.fading transition duration in popup.css.
const ERROR_VISIBLE_MS = 3500;
const ERROR_FADE_MS = 300;

const INSTALL_URL = "https://github.com/apps/pulldeck-app/installations/new";

// GitHub's own "mark-github" glyph, from Primer/Octicons (MIT licensed).
function GitHubMark({ size, class: className }: { size: number; class?: string }) {
  return (
    <svg
      class={className}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M6.766 11.328c-2.063-.25-3.516-1.734-3.516-3.656 0-.781.281-1.625.75-2.188-.203-.515-.172-1.609.063-2.062.625-.078 1.468.25 1.968.703.594-.187 1.219-.281 1.985-.281.765 0 1.39.094 1.953.265.484-.437 1.344-.765 1.969-.687.218.422.25 1.515.046 2.047.5.593.766 1.39.766 2.203 0 1.922-1.453 3.375-3.547 3.64.531.344.89 1.094.89 1.954v1.625c0 .468.391.734.86.547C13.781 14.359 16 11.53 16 8.03 16 3.61 12.406 0 7.984 0 3.563 0 0 3.61 0 8.031a7.88 7.88 0 0 0 5.172 7.422c.422.156.828-.125.828-.547v-1.25c-.219.094-.5.156-.75.156-1.031 0-1.64-.562-2.078-1.609-.172-.422-.36-.672-.719-.719-.187-.015-.25-.093-.25-.187 0-.188.313-.328.625-.328.453 0 .844.281 1.25.86.313.452.64.655 1.031.655s.641-.14 1-.5c.266-.265.47-.5.657-.656" />
    </svg>
  );
}

export function GitHubAccount() {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorFading, setErrorFading] = useState(false);
  const errorFadeTimeoutRef = useRef<number | undefined>(undefined);
  const errorClearTimeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    getGitHubInstallation().then((installation) => {
      if (installation) setConnected(true);
    });
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
    let redirectUrl: string | undefined;
    try {
      redirectUrl = await chrome.identity.launchWebAuthFlow({ url: INSTALL_URL, interactive: true });
    } catch {
      return; // user closed the window before finishing the install
    }
    if (!redirectUrl) return;

    const installationId = Number(new URL(redirectUrl).searchParams.get("installation_id"));
    if (!Number.isInteger(installationId) || installationId <= 0) {
      showError("Something went wrong connecting to GitHub");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    let response: ConnectGithubResponse | undefined;
    try {
      response = await chrome.runtime.sendMessage({ type: "connect-github", installationId });
    } catch {
      // fall through to the generic error below
    }

    setLoading(false);

    if (!response || !response.ok) {
      showError(
        response?.error === "installation_not_found"
          ? "GitHub couldn't find that installation — try connecting again"
          : "Something went wrong connecting to GitHub",
      );
      return;
    }

    setConnected(true);
  }

  return (
    <div class="github-account">
      {connected ? (
        <>
          <GitHubMark size={20} class="github-account-icon connected" />
          <div class="github-account-status">Connected</div>
        </>
      ) : (
        <>
          <div class="repo-connect-row">
            <button type="button" onClick={handleConnect} disabled={loading}>
              {loading ? (
                <span class="btn-spinner" aria-hidden="true"></span>
              ) : (
                <>
                  <GitHubMark size={14} />
                  Connect GitHub
                </>
              )}
            </button>
          </div>
        </>
      )}

      {errorMessage && (
        <p class={`status-message error${errorFading ? " fading" : ""}`}>{errorMessage}</p>
      )}
    </div>
  );
}
