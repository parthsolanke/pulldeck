<p align="center">
  <img src="assets/brand/logo.svg" alt="pulldeck" width="320" />
</p>

pulldeck is a browser extension that gives ChatGPT and Claude the GitHub
context their native integrations leave out. Type `#` in the chat composer to
search the connected repository's file tree and pull file contents straight
into the conversation. Commit history, PR discussions, issue threads and
reusable Bundles are on the roadmap.

## Status

Implemented:

- ChatGPT and Claude adapters — composer detection, text injection and send
  lifecycle hooks
- File tagging — a `#`-triggered fuzzy file picker that inserts a reference and
  fetches the file's contents, with configurable size limits, glob
  include/exclude patterns, binary detection and Jupyter notebook flattening
- GitHub App auth — connect an installation from the popup; the server
  exchanges the installation ID for a short-lived token
- Popup settings — theme, max file size and file patterns

Planned (placeholder modules under `extension/features/`):

- PR/issue tagging
- Sensitive file guard
- Bundles
- Commit digest, chat↔code bridge, staleness flags

## Packages

- `extension/` — the MV3 browser extension (Preact + Vite + CRXJS)
- `server/` — GitHub App auth server (Cloudflare Worker, Hono)

## Dev

```
pnpm install
pnpm dev       # builds the extension in watch mode
pnpm build     # production build of the extension
pnpm typecheck # typechecks the extension and server
pnpm test      # runs the extension and server test suites
```

Load `extension/dist` as an unpacked extension in Chrome
(`chrome://extensions` → enable Developer Mode → "Load unpacked").

The "Connect GitHub" flow needs `extension/.env` filled in (copy
`extension/.env.example`) with the shared secret and URL of a deployed
`server/` Worker — see `server/README.md` for deploying that first.
