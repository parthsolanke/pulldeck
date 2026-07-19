chrome.runtime.onInstalled.addListener(() => {
  console.info("[pulldeck] installed");
});

// TODO: installation-token exchange + refresh, and message routing for
// GitHub API calls from content scripts (which can't call the API directly).
