import type { PlatformAdapter } from "./adapters/adapter.interface";
import { showMountStatus } from "./mount-status-banner";
import { getActiveRepo } from "../lib/storage";

const MAX_RETRIES = 20;
const RETRY_INTERVAL_MS = 500;

export type MountStatus = "pending" | "mounted" | "failed";

export interface MountStatusQuery {
  type: "get-mount-status";
}

export type MountStatusQueryResponse = MountStatus;

// Module-scoped so the onMessage listener can read it; each entry point calls mountAdapter exactly once.
let currentMountStatus: MountStatus = "pending";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "get-mount-status") {
    sendResponse(currentMountStatus);
  }
});

export function mountAdapter(adapter: PlatformAdapter, onMounted?: () => void): void {
  if (!adapter.isChatRoute()) return;

  let attempts = 0;

  const observer = new MutationObserver(() => tryMount());

  showMountStatus("loading", "Getting pulldeck ready…");

  function tryMount() {
    // Latched: once we've resolved either way, every further call (from a
    // stray timer or a mutation the observer hasn't unsubscribed from yet)
    // is a no-op instead of re-running the whole check.
    if (currentMountStatus !== "pending") return;

    if (adapter.isReady() && adapter.findComposeBox()) {
      currentMountStatus = "mounted";
      observer.disconnect();
      console.info(`[pulldeck] ${adapter.name} adapter mounted`);
      // Must mount before onMessageSent — same-node capture listeners fire in registration order, and the dropdown needs first refusal on Enter.
      onMounted?.();
      adapter.onMessageSent(() => {
        console.debug(`[pulldeck] ${adapter.name} message sent`);
      });
      getActiveRepo().then((activeRepo) => {
        showMountStatus(
          "success",
          activeRepo
            ? "pulldeck is ready. Type # to tag a file."
            : "pulldeck is ready. Open pulldeck from your browser's Extensions menu to connect a repo.",
        );
      });
      return;
    }

    attempts += 1;
    if (attempts >= MAX_RETRIES) {
      currentMountStatus = "failed";
      observer.disconnect();
      failLoudly(adapter.name);
      return;
    }

    setTimeout(tryMount, RETRY_INTERVAL_MS);
  }

  observer.observe(document.body, { childList: true, subtree: true });

  tryMount();
}

function failLoudly(platformName: string): void {
  console.error(
    `[pulldeck] Couldn't find the chat box on ${platformName} after ${MAX_RETRIES} retries. ` +
      "This site may have updated its markup.",
  );
  showMountStatus(
    "failed",
    "Couldn't find the chat box here. This site may have updated. Try refreshing the page.",
  );
}
