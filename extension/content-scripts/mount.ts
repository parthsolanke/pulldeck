import type { PlatformAdapter } from "./adapters/adapter.interface";

const MAX_RETRIES = 20;
const RETRY_INTERVAL_MS = 500;

// Shared by every per-platform entry file, so the retry/fail-loud behavior
// only has to be written once. A broken adapter on one platform can't take
// down another, since each platform gets its own content_scripts entry in
// the manifest and its own instance of this loop.
export function mountAdapter(adapter: PlatformAdapter): void {
  let attempts = 0;
  let mounted = false;

  const tryMount = () => {
    if (mounted) return;
    if (adapter.isReady() && adapter.findComposeBox()) {
      mounted = true;
      console.info(`[pulldeck] ${adapter.name} adapter mounted`);
      adapter.onMessageSent(() => {
        console.debug(`[pulldeck] ${adapter.name} message sent`);
      });
      return;
    }

    attempts += 1;
    if (attempts >= MAX_RETRIES) {
      failLoudly(adapter.name);
      return;
    }

    setTimeout(tryMount, RETRY_INTERVAL_MS);
  };

  const observer = new MutationObserver(() => tryMount());
  observer.observe(document.body, { childList: true, subtree: true });

  tryMount();
}

function failLoudly(platformName: string): void {
  console.error(
    `[pulldeck] Couldn't find the chat box on ${platformName} after ${MAX_RETRIES} retries. ` +
      "This site may have updated its markup.",
  );
  // TODO: surface this to the user visibly (e.g. a small toast injected into
  // the page), not just the console — per the architecture doc's
  // "fail loudly" resilience requirement. Also worth logging to a lightweight
  // error-tracking endpoint so breakage shows up as telemetry, not reviews.
}
