# PullDeck — Backlog

Kanban flow: pull one ticket at a time, in order within a phase. Phases run in
the build order from the architecture doc. Tickets marked **SPIKE** are
time-boxed investigations, not features — do them before the ticket(s) they
gate, and record the outcome even if the answer is "doesn't work as assumed."

Status tags: `DONE` `READY` `BLOCKED` `LATER` (not yet unblocked by phase order)

## Phase 0 — Repo scaffold `DONE`

- [x] P0-01 pnpm workspace (`extension` + `auth-server`), shared tsconfig, gitignore, README
- [x] P0-02 MV3 manifest, Vite + CRXJS build, per-platform `content_scripts` entries
- [x] P0-03 Adapter interface + ChatGPT/Claude stub adapters + shared `mount.ts` (retry + fail-loud console log)
- [x] P0-04 Feature module stubs (file-tagging, pr-issue-tagging, sensitive-file-guard, bundles, commit-digest, chat-code-bridge)
- [x] P0-05 `lib/storage.ts` working bundle CRUD wrapper; `lib/github-api.ts` stub
- [x] P0-06 Popup converted to Preact (`App.tsx`/`main.tsx`), JSX wired repo-wide
- [x] P0-07 `auth-server` stub package, renamed from `oauth-server`

## Phase 1 — ChatGPT + Claude adapters, file tagging only

Goal: prove the injection mechanic holds up before building anything on top of it.

- [ ] **P1-01** `READY` **SPIKE** — manually confirm `chatgptAdapter.findComposeBox` selector + contenteditable text-node + `InputEvent` injection works against real chatgpt.com markup. Time-box: 1 day. Record the outcome either way.
- [ ] **P1-02** `READY` **SPIKE** — same check against real claude.ai markup for `claudeAdapter`.
- [ ] **P1-03** `BLOCKED by P1-01/02` — extend `PlatformAdapter` with caret position, the live `#query` substring, and an anchor rect for the dropdown. Flagged as a gap during initial design; the spikes will show exactly what each site's compose box exposes before we commit to the shape.
- [ ] **P1-04** `LATER` — implement `chatgptAdapter.injectText` for real (contenteditable insert + `InputEvent` + `KeyboardEvent` dispatch).
- [ ] **P1-05** `LATER` — implement `claudeAdapter.injectText` for real.
- [ ] **P1-06** `LATER` — implement `onMessageSent` for both adapters (send-button click / Enter keypress detection).
- [ ] **P1-07** `LATER` — `#` trigger detection + autocomplete dropdown (Preact component, injected into the page).
- [ ] **P1-08** `LATER` — `lib/github-api.ts`: unauthenticated public-repo file read. GitHub's unauthenticated rate limit is enough for read-only public-repo file tagging — no GitHub App needed for this slice yet, matching the free tier's "public repos, basic file tagging."
- [ ] **P1-09** `LATER` — popup: minimal "connect a public repo" (owner/name input, no auth flow yet).
- [ ] **P1-10** `LATER` — visible fail-loud UI (toast/banner), replacing the console.error-only path currently in `mount.ts`.
- [ ] **P1-11** `LATER`, low priority — wire adapter failures to a lightweight error-tracking endpoint.

## Phase 2 — GitHub App setup + PR/issue tagging

Goal: the validated, differentiated feature, on the correct auth architecture from the start.

- [ ] **P2-01** `LATER` — register the GitHub App at github.com/settings/apps — read-only permissions only (`contents:read`, `metadata:read`, `pull_requests:read`, `issues:read`).
- [ ] **P2-02** `LATER` — **decision needed**: deploy `auth-server` as a Cloudflare Worker or a Vercel Edge Function. Pick before starting this ticket.
- [ ] **P2-03** `LATER` — `auth-server`: JWT signing + installation-token exchange via `@octokit/auth-app`.
- [ ] **P2-04** `LATER` — extension: "Connect GitHub" flow — install-page redirect, capture `installation_id`, call `auth-server`, store the installation token.
- [ ] **P2-05** `LATER` — `background/service-worker.ts`: token refresh coordination + message routing for GitHub API calls from content scripts.
- [ ] **P2-06** `LATER` — `lib/github-api.ts`: authenticated PR fetch (diff + discussion + review comments).
- [ ] **P2-07** `LATER` — `lib/github-api.ts`: authenticated issue fetch (thread).
- [ ] **P2-08** `LATER` — `#PR-142` / `#issue-88` trigger parsing, extending the Phase 1 dropdown.
- [ ] **P2-09** `LATER` — free-tier usage cap (10 PR/issue tags per month) — counter + monthly reset in `storage.ts`.
- [ ] **P2-10** `LATER` **SPIKE** — confirm GitHub App review/approval timeline for the requested permission set; check early so it's not a surprise before launch.

## GATE — MVP validation *(not a ticket)*

Ship Phase 1 + 2 only. Put it in front of 15-20 developers who use both an
agentic coding tool and browser chat, framed around the gap: "context your
native GitHub integration doesn't give you." Track repeat, unprompted use
over a week. **The go/no-go decision on Phases 3-6 happens here — they are
not pre-committed.**

## Phase 3 — Sensitive file guard

- [ ] **P3-01** `LATER` — denylist pattern matcher (`.env`, `.pem`, `.key`, `id_rsa`, common secrets-manager filenames).
- [ ] **P3-02** `LATER` — confirm-before-inject warning UI wired into the file-tagging injection path.

## Phase 4 — Bundles

- [ ] **P4-01** `LATER` — extend the `Bundle` type in `storage.ts` beyond `files: string[]` to hold PRs/issues/commits.
- [ ] **P4-02** `LATER` — bundle management UI in the popup (list, create, rename, delete, add/remove items).
- [ ] **P4-03** `LATER` — "reload bundle into this conversation" — inject every item in a bundle via the active adapter.
- [ ] **P4-04** `LATER` — staleness check on bundle reload (ties into Phase 6 staleness flags — build together if that lands first).

## Phase 5 — Gemini adapter

- [ ] **P5-01** `LATER` — `gemini.adapter.ts` implementing `PlatformAdapter`.
- [ ] **P5-02** `LATER` — `gemini.entry.ts` + manifest `content_scripts` block + `host_permissions` for gemini.google.com.

## Phase 6 — Commit digest, chat↔code bridge, staleness flags

- [ ] **P6-01** `LATER` — `lib/github-api.ts`: commit history + diff fetch for a given path.
- [ ] **P6-02** `LATER` — commit-digest tag trigger + summarization.
- [ ] **P6-03** `LATER` **SPIKE** — chat↔code bridge mechanics. Highest technical risk in the spec; needs its own investigation before any implementation ticket is written.
- [ ] **P6-04** `LATER` — (tickets TBD, pending P6-03's outcome).
- [ ] **P6-05** `LATER` — staleness flags: check tagged PR/issue state (open/closed/merged) at injection time.
