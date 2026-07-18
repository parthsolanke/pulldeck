# auth-server (stub)

Deferred until build order step 2 (GitHub App setup + PR/issue tagging).

Will hold the GitHub App's private key, sign JWTs, and issue/refresh
short-lived installation tokens via `@octokit/auth-app`. Deployed as a single
stateless Cloudflare Worker or Vercel Edge function — no database, no
persistent state. After the extension gets its first installation token,
this server is only called again on token refresh; every other GitHub API
call goes directly from the extension's background service worker to
`api.github.com`.

Env vars needed once this is built (not yet configured):

- `GITHUB_APP_ID`
- `GITHUB_APP_PRIVATE_KEY`
