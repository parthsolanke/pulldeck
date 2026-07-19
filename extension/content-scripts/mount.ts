import type { PlatformAdapter } from "./adapters/adapter.interface";

const MAX_RETRIES = 20;
const RETRY_INTERVAL_MS = 500;

export function mountAdapter(adapter: PlatformAdapter, onMounted?: () => void): void {
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
      onMounted?.();
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
  // TODO: surface this visibly in the page, not just the console.
}
