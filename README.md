<p align="center">
  <img src="assets/brand/logo.svg" alt="pulldeck" width="320" />
</p>

Browser extension that gives ChatGPT and Claude the GitHub context their
native integrations leave out. Type `#` in the composer to search your
repository and drop a file's contents straight into the conversation.

## Features

- **File tagging** — type `#` in ChatGPT or Claude, fuzzy-search the connected
  repo's file tree, and tag files by name or path. Tagged files are read from
  the repo (via jsDelivr) and their contents are inserted into the prompt.
- **Repo connect** — connect any GitHub repo from the popup by owner/name or
  a GitHub URL; the file tree is cached locally.
- **GitHub App auth** — sign in with GitHub and the extension fetches a
  short-lived installation token through the companion server.
- **Settings** — max file size, include/exclude glob patterns, and a light or
  dark theme for the injected UI.
- **Binary and notebook handling** — binary files are skipped, and `.ipynb`
  notebooks are rendered into a compact readable form.

## Packages

- `extension/` — the MV3 browser extension (Preact + Vite + CRXJS)
- `server/` — GitHub App auth server (Hono on Cloudflare Workers)

## Roadmap

1. ~~ChatGPT + Claude adapters, file tagging only~~
2. ~~GitHub App setup~~; PR/issue tagging next
3. Sensitive file guard
4. Bundles
5. Gemini adapter
6. Commit digest, chat↔code bridge, staleness flags

The `extension/features/bundles`, `pr-issue-tagging`, `sensitive-file-guard`,
`commit-digest`, and `chat-code-bridge` modules are placeholders for this work.

## Dev

Requires Node 22+ and pnpm.

```
pnpm install
pnpm dev       # builds the extension in watch mode
```

Load `extension/dist` as an unpacked extension in Chrome
(`chrome://extensions` → enable Developer Mode → "Load unpacked").

The "Connect GitHub" flow needs `extension/.env` filled in (copy
`extension/.env.example`) with the shared secret and URL of a deployed
`server/` Worker — see `server/README.md` for deploying that first.

## Scripts

Run from the repo root:

```
pnpm typecheck   # type-check every package
pnpm test        # run tests (server)
pnpm build       # build the extension
```

CI (`.github/workflows/ci.yml`) runs install, typecheck, and build on pushes to
`main` and on pull requests.

## Layout

```
extension/
  background/        service worker: repo, file, and GitHub API messages
  content-scripts/   per-site adapters plus mount and #-tag helpers
  features/          file-tagging UI and future feature modules
  lib/               storage, GitHub API, auth, glob, formatting
  popup/             connect, GitHub account, and settings screens
server/src/          token endpoint, shared-secret check, GitHub App exchange
```
