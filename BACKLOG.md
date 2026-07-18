# PullDeck — Backlog

Kanban flow: pull one ticket at a time, in order within a phase. Phases run
in the build order from the architecture doc. Each ticket below is a
self-contained card — title, labels, dependencies, description, acceptance
criteria — meant to become one GitHub Issue via `scripts/create-github-issues.sh`.

Phases map to GitHub Milestones; `phase`/`type`/`status` map to GitHub Labels.

## Phase 0 — Repo scaffold `DONE` (not filed as issues — already merged)

- [x] pnpm workspace (`extension` + `auth-server`), shared tsconfig, gitignore, README
- [x] MV3 manifest, Vite + CRXJS build, per-platform `content_scripts` entries
- [x] Adapter interface + ChatGPT/Claude stub adapters + shared `mount.ts` (retry + fail-loud console log)
- [x] Feature module stubs (file-tagging, pr-issue-tagging, sensitive-file-guard, bundles, commit-digest, chat-code-bridge)
- [x] `lib/storage.ts` working bundle CRUD wrapper; `lib/github-api.ts` stub
- [x] Popup converted to Preact (`App.tsx`/`main.tsx`), JSX wired repo-wide
- [x] `auth-server` stub package, renamed from `oauth-server`

---

## Phase 1 — ChatGPT + Claude adapters, file tagging only

Milestone goal: prove the injection mechanic holds up before building anything on top of it.

### P1-01 — SPIKE: Confirm injection mechanic on chatgpt.com
**Labels:** `phase:1` `type:spike` `status:ready`
**Depends on:** —  **Blocks:** P1-03

Manually verify `chatgptAdapter.findComposeBox`'s selector, contenteditable
text-node insertion, and native `InputEvent` dispatch against chatgpt.com's
current live markup. Time-boxed to 1 day.

**Acceptance criteria**
- [ ] Confirmed working against live markup, or the specific breakage is identified
- [ ] Outcome recorded here (or in the issue) regardless of result

### P1-02 — SPIKE: Confirm injection mechanic on claude.ai
**Labels:** `phase:1` `type:spike` `status:ready`
**Depends on:** —  **Blocks:** P1-03

Same check as P1-01, against claude.ai's current live markup for `claudeAdapter`.

**Acceptance criteria**
- [ ] Confirmed working against live markup, or the specific breakage is identified
- [ ] Outcome recorded regardless of result

### P1-03 — Extend PlatformAdapter with caret/anchor-rect support
**Labels:** `phase:1` `type:feature` `status:blocked`
**Depends on:** P1-01, P1-02  **Blocks:** P1-07

Extend `PlatformAdapter` with live caret position, the in-progress `#query`
substring, and an anchor rect to position the autocomplete dropdown against.
Flagged as a known gap in the original interface; shape it from what the
spikes actually reveal about each site's compose box, not in advance.

**Acceptance criteria**
- [ ] Interface extended in `adapter.interface.ts`
- [ ] Both stub adapters updated to implement the new methods

### P1-04 — Implement chatgptAdapter.injectText
**Labels:** `phase:1` `type:feature` `status:later`
**Depends on:** P1-01

Contenteditable text-node insertion + native `InputEvent` dispatch, plus a
`KeyboardEvent` where needed since some send-button handlers listen for key
presses rather than input events.

**Acceptance criteria**
- [ ] Tagging a file actually inserts its content into the ChatGPT compose box
- [ ] Works with caret at any position, not just end-of-input

### P1-05 — Implement claudeAdapter.injectText
**Labels:** `phase:1` `type:feature` `status:later`
**Depends on:** P1-02

Same as P1-04, for claude.ai.

**Acceptance criteria**
- [ ] Tagging a file actually inserts its content into the Claude compose box
- [ ] Works with caret at any position, not just end-of-input

### P1-06 — Implement onMessageSent for both adapters
**Labels:** `phase:1` `type:feature` `status:later`
**Depends on:** P1-01, P1-02

Detect send-button click / Enter keypress on both platforms so features can
react to a message actually being sent.

**Acceptance criteria**
- [ ] Callback fires reliably on both platforms for click-to-send and Enter-to-send

### P1-07 — `#` trigger detection + autocomplete dropdown
**Labels:** `phase:1` `type:feature` `status:blocked`
**Depends on:** P1-03

Preact component injected into the page: opens on `#`, filters as you type,
keyboard-navigable, replaces the typed `#query` substring with the resolved
tag on selection.

**Acceptance criteria**
- [ ] Dropdown opens on `#`, filters live, supports arrow keys + Enter + Escape
- [ ] Selecting an item replaces `#query` with the resolved reference

### P1-08 — Unauthenticated public-repo file read
**Labels:** `phase:1` `type:feature` `status:later`
**Depends on:** —

Implement `lib/github-api.ts` file-content reads against public repos using
GitHub's unauthenticated rate limit — no GitHub App needed for this slice,
matching the free tier's "public repos, basic file tagging."

**Acceptance criteria**
- [ ] Given `owner/repo` + path, returns file contents
- [ ] Rate-limit errors surface a clear message, not a silent failure

### P1-09 — Popup: connect a public repo
**Labels:** `phase:1` `type:feature` `status:later`
**Depends on:** P1-08

Minimal popup UI: enter `owner/name`, store it as the active repo. No auth
flow yet — public reads only.

**Acceptance criteria**
- [ ] Entered repo persists via `chrome.storage.local` and survives popup reopen

### P1-10 — Visible fail-loud UI
**Labels:** `phase:1` `type:feature` `status:later`
**Depends on:** —

Replace the console.error-only path in `mount.ts` with a visible toast/banner
injected into the page: "couldn't find the chat box, this site may have
updated."

**Acceptance criteria**
- [ ] Toast appears in-page after max retries are exhausted, not just in devtools console

### P1-11 — Adapter failure telemetry (optional)
**Labels:** `phase:1` `type:feature` `status:later`
**Depends on:** P1-10

Log adapter mount failures to a lightweight error-tracking endpoint so
breakage shows up as telemetry, not angry reviews. Lowest priority in this phase.

**Acceptance criteria**
- [ ] Failure event includes platform name, timestamp, and retry count

---

## Phase 2 — GitHub App setup + PR/issue tagging

Milestone goal: the validated, differentiated feature, on the correct auth
architecture from the start.
**GATE:** ship Phase 1 + this phase only, put it in front of 15-20 developers
who use both an agentic coding tool and browser chat, track repeat
unprompted use for a week. Go/no-go on Phases 3-6 is decided here — they are
not pre-committed.

### P2-01 — Register the GitHub App
**Labels:** `phase:2` `type:feature` `status:later`
**Depends on:** —

Register at github.com/settings/apps with read-only permissions only:
`contents:read`, `metadata:read`, `pull_requests:read`, `issues:read`.

**Acceptance criteria**
- [ ] App registered, callback URL set, permission set matches exactly the four above (no write scopes)

### P2-02 — DECISION: auth-server deploy target
**Labels:** `phase:2` `type:decision` `status:blocked`
**Depends on:** —  **Blocks:** P2-03

Choose Cloudflare Worker vs. Vercel Edge Function for `auth-server` before
starting implementation.

**Acceptance criteria**
- [ ] Decision made and recorded (this ticket can close with just a comment)

### P2-03 — auth-server: JWT signing + installation-token exchange
**Labels:** `phase:2` `type:feature` `status:blocked`
**Depends on:** P2-01, P2-02

Implement using `@octokit/auth-app`: sign a JWT with the App's private key,
exchange for a short-lived installation token.

**Acceptance criteria**
- [ ] Given an `installation_id`, returns a valid installation token
- [ ] Private key only ever read from environment, never logged or returned

### P2-04 — Extension: "Connect GitHub" flow
**Labels:** `phase:2` `type:feature` `status:blocked`
**Depends on:** P2-03

Install-page redirect, capture `installation_id` from the callback, call
`auth-server`, store the installation token.

**Acceptance criteria**
- [ ] Clicking "Connect GitHub" in the popup completes the full round trip and stores a working token

### P2-05 — Background worker: token refresh + API message routing
**Labels:** `phase:2` `type:feature` `status:blocked`
**Depends on:** P2-04

`background/service-worker.ts` refreshes the installation token before it
expires and routes GitHub API calls requested by content scripts (which
can't call `api.github.com` directly).

**Acceptance criteria**
- [ ] Token refresh happens automatically before expiry, no user action needed
- [ ] Content scripts request GitHub data via message passing only, never fetch directly

### P2-06 — Authenticated PR fetch
**Labels:** `phase:2` `type:feature` `status:blocked`
**Depends on:** P2-05

`lib/github-api.ts`: fetch a PR's diff, discussion thread, and review comments.

**Acceptance criteria**
- [ ] Given `#PR-142`, returns diff + full discussion + review comments, not just file contents

### P2-07 — Authenticated issue fetch
**Labels:** `phase:2` `type:feature` `status:blocked`
**Depends on:** P2-05

`lib/github-api.ts`: fetch an issue's full thread.

**Acceptance criteria**
- [ ] Given `#issue-88`, returns the full comment thread

### P2-08 — `#PR-N` / `#issue-N` trigger parsing
**Labels:** `phase:2` `type:feature` `status:blocked`
**Depends on:** P1-07, P2-06, P2-07

Extend the Phase 1 dropdown to recognize and resolve PR/issue references.

**Acceptance criteria**
- [ ] Typing `#PR-142` or `#issue-88` resolves and injects the correct content

### P2-09 — Free-tier usage cap
**Labels:** `phase:2` `type:feature` `status:blocked`
**Depends on:** P2-08

10 PR/issue tags per month on the free tier — counter + monthly reset in `storage.ts`.

**Acceptance criteria**
- [ ] Counter increments per tag, resets monthly, blocks the 11th with a clear upgrade prompt

### P2-10 — SPIKE: GitHub App review/approval timeline
**Labels:** `phase:2` `type:spike` `status:ready`
**Depends on:** P2-01

Confirm how long GitHub's review takes for the requested permission set,
before assuming a launch date.

**Acceptance criteria**
- [ ] Timeline confirmed and recorded, or a workaround identified if review is slow

---

## Phase 3 — Sensitive file guard

Milestone goal: cheap safety guardrail, worth having before any real usage.

### P3-01 — Denylist pattern matcher
**Labels:** `phase:3` `type:feature` `status:later`
**Depends on:** —

Pattern-match a tagged file's path against `.env`, `.pem`, `.key`, `id_rsa`,
and common secrets-manager filenames.

**Acceptance criteria**
- [ ] All listed patterns correctly flagged; ordinary source files are not false-positived

### P3-02 — Confirm-before-inject warning UI
**Labels:** `phase:3` `type:feature` `status:blocked`
**Depends on:** P3-01

Wire the matcher into the file-tagging injection path: warn and require
explicit confirmation before injecting a flagged file's contents.

**Acceptance criteria**
- [ ] Tagging a flagged file shows a warning and requires confirmation before it's injected

---

## Phase 4 — Bundles

Milestone goal: reusable sets of files/PRs/issues/commits, reload with one click.

### P4-01 — Extend Bundle type beyond files
**Labels:** `phase:4` `type:feature` `status:later`
**Depends on:** P2-08

Extend the `Bundle` type in `storage.ts` beyond `files: string[]` to hold
PRs, issues, and (later) commits.

**Acceptance criteria**
- [ ] Bundle can hold a mix of file/PR/issue references and round-trips through storage correctly

### P4-02 — Bundle management UI
**Labels:** `phase:4` `type:feature` `status:blocked`
**Depends on:** P4-01

Popup UI: list, create, rename, delete bundles; add/remove items.

**Acceptance criteria**
- [ ] Full CRUD on bundles works from the popup

### P4-03 — Reload bundle into conversation
**Labels:** `phase:4` `type:feature` `status:blocked`
**Depends on:** P4-02

Inject every item in a bundle into the active chat via the current adapter.

**Acceptance criteria**
- [ ] One click injects all bundle items into a fresh conversation

### P4-04 — Staleness check on bundle reload
**Labels:** `phase:4` `type:feature` `status:blocked`
**Depends on:** P4-03

Ties into Phase 6's staleness flags — build together if that phase lands first.

**Acceptance criteria**
- [ ] Reloading a bundle flags any PR/issue that's since changed state

---

## Phase 5 — Gemini adapter

Milestone goal: should be close to a copy-paste of the interface once two
adapters already exist and the pattern is proven.

### P5-01 — gemini.adapter.ts
**Labels:** `phase:5` `type:feature` `status:later`
**Depends on:** P1-03, P1-04, P1-05

Implement `PlatformAdapter` for Gemini, following the ChatGPT/Claude pattern.

**Acceptance criteria**
- [ ] All `PlatformAdapter` methods implemented and working against live gemini.google.com

### P5-02 — Gemini entry + manifest wiring
**Labels:** `phase:5` `type:feature` `status:blocked`
**Depends on:** P5-01

`gemini.entry.ts` + a new `content_scripts` block + `host_permissions` for
gemini.google.com.

**Acceptance criteria**
- [ ] Extension mounts correctly on gemini.google.com without affecting the other two adapters

---

## Phase 6 — Commit digest, chat↔code bridge, staleness flags

Milestone goal: only after Phases 1-5 show real repeat usage.

### P6-01 — Commit history + diff fetch
**Labels:** `phase:6` `type:feature` `status:later`
**Depends on:** P2-05

`lib/github-api.ts`: fetch commit history and diffs for a given path.

**Acceptance criteria**
- [ ] Given a file path, returns recent commits with messages and diffs

### P6-02 — Commit-digest tag trigger + summarization
**Labels:** `phase:6` `type:feature` `status:blocked`
**Depends on:** P6-01

"What changed in `auth.js` recently and why" — pulled from real commit
messages and diffs.

**Acceptance criteria**
- [ ] Tagging a file's commit digest returns a coherent summary grounded in real commit data

### P6-03 — SPIKE: chat↔code bridge mechanics
**Labels:** `phase:6` `type:spike` `status:ready`
**Depends on:** —

Highest technical risk in the spec. Investigate how a browser-chat session
can learn what Claude Code/Codex already did in a coding session, before
writing any implementation ticket.

**Acceptance criteria**
- [ ] A concrete mechanism is identified and documented, or the feature is explicitly deprioritized/dropped with reasoning

### P6-04 — Chat↔code bridge implementation (TBD)
**Labels:** `phase:6` `type:feature` `status:blocked`
**Depends on:** P6-03

Scope to be defined once P6-03 resolves.

### P6-05 — Staleness flags
**Labels:** `phase:6` `type:feature` `status:later`
**Depends on:** P2-06, P2-07

Check a tagged PR/issue's state (open/closed/merged) at injection time and
flag if it's changed since being tagged.

**Acceptance criteria**
- [ ] A merged/closed PR or issue shows a clear staleness warning when re-tagged or reloaded from a bundle
