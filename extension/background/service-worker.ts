chrome.runtime.onInstalled.addListener(() => {
  console.info("[PullDeck] installed");
});

// TODO: GitHub App installation-token exchange + refresh coordination (talks
// to auth-server once it exists), and message routing for GitHub API calls
// from content scripts. Content scripts cannot call the GitHub API directly
// — CORS, and the token should stay out of page context — so all reads route
// through here. See architecture doc's "GitHub App" section.
