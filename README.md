<p align="center">
  <img src="assets/brand/logo.svg" alt="pulldeck" width="320" />
</p>

Browser extension that gives ChatGPT and Claude the GitHub context their
native integrations leave out: commit history, PR discussions, issue
threads, plus reusable Bundles, tagged with `#`.

Tag a file in the compose box with `#`, pick it from the dropdown, and
pulldeck attaches the right repository context to the message. Bundles
group the files, PRs, issues, and commits you reach for together, so a
whole set of context is one tag away.

## Layout

- `extension/` — the MV3 browser extension (Preact + Vite + CRXJS)
  - `background/` — service worker: repo connection, file fetches,
    installation token exchange, GitHub API proxy
  - `content-scripts/` — ChatGPT and Claude adapters, compose-box
    tagging, status banner, design tokens
  - `features/` — file tagging UI, plus Bundles, PR/issue tagging,
    sensitive-file guard, commit digest, and chat↔code bridge modules
  - `popup/` — connect-a-repo, GitHub account, and settings screens
  - `lib/` — storage, GitHub API/auth, glob matching, formatting helpers
- `server/` — GitHub App auth server (Cloudflare Worker, Hono)
- `assets/brand/` — logos and wordmarks

## Prerequisites

- Node.js 22 (see `.github/workflows/ci.yml`)
- pnpm 9 (`corepack enable` is the easiest way to get it)

## Install

```
pnpm install
```

## Scripts

Run from the repo root:

| Script            | What it does                                   |
| ----------------- | ---------------------------------------------- |
| `pnpm dev`        | Extension in watch mode (`extension/`)          |
| `pnpm build`      | Production extension build into `extension/dist` |
| `pnpm typecheck`  | Type-checks every package                      |
| `pnpm test`       | Runs tests in packages that define them (`server/`) |

Package-specific scripts also work, e.g. `pnpm --filter extension build`
or `pnpm --filter server test`. The extension `dev`/`build`/`typecheck`
scripts regenerate file icons first via
`extension/scripts/generate-file-icons.mjs`.

## Run the extension

1. `pnpm dev` (or `pnpm build` for a one-off bundle).
2. Open `chrome://extensions`, enable Developer Mode, and choose
   "Load unpacked".
3. Select `extension/dist`.
4. Open ChatGPT or Claude and type `#` in the compose box to tag a file.

Reload the extension from `chrome://extensions` after a rebuild.

## Connect GitHub

The "Connect GitHub" flow needs `extension/.env` filled in (copy
`extension/.env.example`) with the shared secret and URL of a deployed
`server/` Worker — see `server/README.md` for deploying that first:

```
VITE_PULLDECK_CLIENT_SECRET=...
VITE_PULLDECK_SERVER_URL=https://pulldeck-server.YOUR-SUBDOMAIN.workers.dev
```

Then connect the GitHub App installation from the popup and paste an
`owner/repo` (or GitHub URL) into the connect screen.

## Build order

1. ChatGPT + Claude adapters, file tagging only
2. GitHub App setup + PR/issue tagging
3. Sensitive file guard
4. Bundles
5. Gemini adapter
6. Commit digest, chat↔code bridge, staleness flags

## CI

GitHub Actions runs `pnpm install --frozen-lockfile`, `pnpm typecheck`,
and `pnpm build` on pushes to `main` and on pull requests.
