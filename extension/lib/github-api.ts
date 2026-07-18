// Build order step 2. Implement once auth-server issues installation
// tokens. Calls happen from the background service worker only — never from
// content scripts, which run in page context and can't hold the token
// safely or make cross-origin requests to api.github.com.
export {};
