// GitHub API calls happen from the background service worker only — content
// scripts run in page context and can't hold the token safely or make
// cross-origin requests to api.github.com.
export {};
