#!/usr/bin/env bash
# One-time migration: creates the milestones, labels, and issues from
# BACKLOG.md on the actual GitHub repo. Safe to re-run — label/milestone
# creation ignores "already exists" errors; issue creation does not
# deduplicate, so don't re-run the issue section after the first success.
set -euo pipefail

REPO="parthsolanke/pulldeck"

echo "==> Creating milestones"
create_milestone() {
  gh api "repos/${REPO}/milestones" -f title="$1" -f description="$2" \
    >/dev/null 2>&1 || echo "  (skip) $1 already exists"
}
create_milestone "Phase 1 — Adapters + file tagging" \
  "Prove the injection mechanic holds up before building anything on top of it."
create_milestone "Phase 2 — GitHub App + PR/issue tagging" \
  "The validated, differentiated feature. GATE: ship Phase 1+2 only, test with 15-20 developers, track repeat unprompted use for a week. Go/no-go on Phases 3-6 decided here."
create_milestone "Phase 3 — Sensitive file guard" \
  "Cheap safety guardrail, worth having before any real usage."
create_milestone "Phase 4 — Bundles" \
  "Reusable sets of files/PRs/issues/commits, reload with one click."
create_milestone "Phase 5 — Gemini adapter" \
  "Should be close to a copy-paste of the interface once two adapters already exist."
create_milestone "Phase 6 — Commit digest, chat-code bridge, staleness flags" \
  "Only after Phases 1-5 show real repeat usage."

echo "==> Creating labels"
create_label() {
  gh label create "$1" --repo "$REPO" --color "$2" --description "$3" \
    >/dev/null 2>&1 || echo "  (skip) $1 already exists"
}
create_label "phase:1" "5319e7" "Phase 1 — adapters + file tagging"
create_label "phase:2" "5319e7" "Phase 2 — GitHub App + PR/issue tagging"
create_label "phase:3" "5319e7" "Phase 3 — sensitive file guard"
create_label "phase:4" "5319e7" "Phase 4 — bundles"
create_label "phase:5" "5319e7" "Phase 5 — Gemini adapter"
create_label "phase:6" "5319e7" "Phase 6 — commit digest, bridge, staleness"
create_label "type:spike"    "d93f0b" "Time-boxed investigation, not a feature"
create_label "type:feature"  "0e8a16" "Implementation work"
create_label "type:decision" "fbca04" "Needs a decision before work starts"
create_label "status:ready"   "1d76db" "Pullable now"
create_label "status:blocked" "b60205" "Waiting on a dependency"
create_label "status:later"   "cccccc" "Not yet unblocked by phase order"

echo "==> Creating issues"
create_issue() {
  local title="$1" milestone="$2" labels="$3" body="$4"
  gh issue create --repo "$REPO" --title "$title" --milestone "$milestone" \
    --label "$labels" --body "$body" >/dev/null
  echo "  created: $title"
}

create_issue "[P1-01] SPIKE: Confirm injection mechanic on chatgpt.com" \
  "Phase 1 — Adapters + file tagging" "phase:1,type:spike,status:ready" \
"Manually verify \`chatgptAdapter.findComposeBox\`'s selector, contenteditable
text-node insertion, and native \`InputEvent\` dispatch against chatgpt.com's
current live markup. Time-boxed to 1 day.

**Depends on:** — **Blocks:** P1-03

**Acceptance criteria**
- [ ] Confirmed working against live markup, or the specific breakage is identified
- [ ] Outcome recorded regardless of result"

create_issue "[P1-02] SPIKE: Confirm injection mechanic on claude.ai" \
  "Phase 1 — Adapters + file tagging" "phase:1,type:spike,status:ready" \
"Same check as P1-01, against claude.ai's current live markup for \`claudeAdapter\`.

**Depends on:** — **Blocks:** P1-03

**Acceptance criteria**
- [ ] Confirmed working against live markup, or the specific breakage is identified
- [ ] Outcome recorded regardless of result"

create_issue "[P1-03] Extend PlatformAdapter with caret/anchor-rect support" \
  "Phase 1 — Adapters + file tagging" "phase:1,type:feature,status:blocked" \
"Extend \`PlatformAdapter\` with live caret position, the in-progress
\`#query\` substring, and an anchor rect to position the autocomplete
dropdown against. Shape it from what the spikes actually reveal about each
site's compose box, not in advance.

**Depends on:** P1-01, P1-02 **Blocks:** P1-07

**Acceptance criteria**
- [ ] Interface extended in \`adapter.interface.ts\`
- [ ] Both stub adapters updated to implement the new methods"

create_issue "[P1-04] Implement chatgptAdapter.injectText" \
  "Phase 1 — Adapters + file tagging" "phase:1,type:feature,status:later" \
"Contenteditable text-node insertion + native \`InputEvent\` dispatch, plus a
\`KeyboardEvent\` where needed since some send-button handlers listen for key
presses rather than input events.

**Depends on:** P1-01

**Acceptance criteria**
- [ ] Tagging a file actually inserts its content into the ChatGPT compose box
- [ ] Works with caret at any position, not just end-of-input"

create_issue "[P1-05] Implement claudeAdapter.injectText" \
  "Phase 1 — Adapters + file tagging" "phase:1,type:feature,status:later" \
"Same as P1-04, for claude.ai.

**Depends on:** P1-02

**Acceptance criteria**
- [ ] Tagging a file actually inserts its content into the Claude compose box
- [ ] Works with caret at any position, not just end-of-input"

create_issue "[P1-06] Implement onMessageSent for both adapters" \
  "Phase 1 — Adapters + file tagging" "phase:1,type:feature,status:later" \
"Detect send-button click / Enter keypress on both platforms so features can
react to a message actually being sent.

**Depends on:** P1-01, P1-02

**Acceptance criteria**
- [ ] Callback fires reliably on both platforms for click-to-send and Enter-to-send"

create_issue "[P1-07] # trigger detection + autocomplete dropdown" \
  "Phase 1 — Adapters + file tagging" "phase:1,type:feature,status:blocked" \
"Preact component injected into the page: opens on \`#\`, filters as you
type, keyboard-navigable, replaces the typed \`#query\` substring with the
resolved tag on selection.

**Depends on:** P1-03

**Acceptance criteria**
- [ ] Dropdown opens on \`#\`, filters live, supports arrow keys + Enter + Escape
- [ ] Selecting an item replaces \`#query\` with the resolved reference"

create_issue "[P1-08] Unauthenticated public-repo file read" \
  "Phase 1 — Adapters + file tagging" "phase:1,type:feature,status:later" \
"Implement \`lib/github-api.ts\` file-content reads against public repos
using GitHub's unauthenticated rate limit — no GitHub App needed for this
slice, matching the free tier's \"public repos, basic file tagging.\"

**Depends on:** —

**Acceptance criteria**
- [ ] Given \`owner/repo\` + path, returns file contents
- [ ] Rate-limit errors surface a clear message, not a silent failure"

create_issue "[P1-09] Popup: connect a public repo" \
  "Phase 1 — Adapters + file tagging" "phase:1,type:feature,status:later" \
"Minimal popup UI: enter \`owner/name\`, store it as the active repo. No auth
flow yet — public reads only.

**Depends on:** P1-08

**Acceptance criteria**
- [ ] Entered repo persists via \`chrome.storage.local\` and survives popup reopen"

create_issue "[P1-10] Visible fail-loud UI" \
  "Phase 1 — Adapters + file tagging" "phase:1,type:feature,status:later" \
"Replace the console.error-only path in \`mount.ts\` with a visible
toast/banner injected into the page: \"couldn't find the chat box, this site
may have updated.\"

**Depends on:** —

**Acceptance criteria**
- [ ] Toast appears in-page after max retries are exhausted, not just in devtools console"

create_issue "[P1-11] Adapter failure telemetry (optional)" \
  "Phase 1 — Adapters + file tagging" "phase:1,type:feature,status:later" \
"Log adapter mount failures to a lightweight error-tracking endpoint so
breakage shows up as telemetry, not angry reviews. Lowest priority in this phase.

**Depends on:** P1-10

**Acceptance criteria**
- [ ] Failure event includes platform name, timestamp, and retry count"

create_issue "[P2-01] Register the GitHub App" \
  "Phase 2 — GitHub App + PR/issue tagging" "phase:2,type:feature,status:later" \
"Register at github.com/settings/apps with read-only permissions only:
\`contents:read\`, \`metadata:read\`, \`pull_requests:read\`, \`issues:read\`.

**Depends on:** —

**Acceptance criteria**
- [ ] App registered, callback URL set, permission set matches exactly the four above (no write scopes)"

create_issue "[P2-02] DECISION: auth-server deploy target" \
  "Phase 2 — GitHub App + PR/issue tagging" "phase:2,type:decision,status:blocked" \
"Choose Cloudflare Worker vs. Vercel Edge Function for \`auth-server\` before
starting implementation.

**Depends on:** — **Blocks:** P2-03

**Acceptance criteria**
- [ ] Decision made and recorded (this ticket can close with just a comment)"

create_issue "[P2-03] auth-server: JWT signing + installation-token exchange" \
  "Phase 2 — GitHub App + PR/issue tagging" "phase:2,type:feature,status:blocked" \
"Implement using \`@octokit/auth-app\`: sign a JWT with the App's private
key, exchange for a short-lived installation token.

**Depends on:** P2-01, P2-02

**Acceptance criteria**
- [ ] Given an \`installation_id\`, returns a valid installation token
- [ ] Private key only ever read from environment, never logged or returned"

create_issue "[P2-04] Extension: Connect GitHub flow" \
  "Phase 2 — GitHub App + PR/issue tagging" "phase:2,type:feature,status:blocked" \
"Install-page redirect, capture \`installation_id\` from the callback, call
\`auth-server\`, store the installation token.

**Depends on:** P2-03

**Acceptance criteria**
- [ ] Clicking \"Connect GitHub\" in the popup completes the full round trip and stores a working token"

create_issue "[P2-05] Background worker: token refresh + API message routing" \
  "Phase 2 — GitHub App + PR/issue tagging" "phase:2,type:feature,status:blocked" \
"\`background/service-worker.ts\` refreshes the installation token before it
expires and routes GitHub API calls requested by content scripts (which
can't call \`api.github.com\` directly).

**Depends on:** P2-04

**Acceptance criteria**
- [ ] Token refresh happens automatically before expiry, no user action needed
- [ ] Content scripts request GitHub data via message passing only, never fetch directly"

create_issue "[P2-06] Authenticated PR fetch" \
  "Phase 2 — GitHub App + PR/issue tagging" "phase:2,type:feature,status:blocked" \
"\`lib/github-api.ts\`: fetch a PR's diff, discussion thread, and review comments.

**Depends on:** P2-05

**Acceptance criteria**
- [ ] Given \`#PR-142\`, returns diff + full discussion + review comments, not just file contents"

create_issue "[P2-07] Authenticated issue fetch" \
  "Phase 2 — GitHub App + PR/issue tagging" "phase:2,type:feature,status:blocked" \
"\`lib/github-api.ts\`: fetch an issue's full thread.

**Depends on:** P2-05

**Acceptance criteria**
- [ ] Given \`#issue-88\`, returns the full comment thread"

create_issue "[P2-08] #PR-N / #issue-N trigger parsing" \
  "Phase 2 — GitHub App + PR/issue tagging" "phase:2,type:feature,status:blocked" \
"Extend the Phase 1 dropdown to recognize and resolve PR/issue references.

**Depends on:** P1-07, P2-06, P2-07

**Acceptance criteria**
- [ ] Typing \`#PR-142\` or \`#issue-88\` resolves and injects the correct content"

create_issue "[P2-09] Free-tier usage cap" \
  "Phase 2 — GitHub App + PR/issue tagging" "phase:2,type:feature,status:blocked" \
"10 PR/issue tags per month on the free tier — counter + monthly reset in \`storage.ts\`.

**Depends on:** P2-08

**Acceptance criteria**
- [ ] Counter increments per tag, resets monthly, blocks the 11th with a clear upgrade prompt"

create_issue "[P2-10] SPIKE: GitHub App review/approval timeline" \
  "Phase 2 — GitHub App + PR/issue tagging" "phase:2,type:spike,status:ready" \
"Confirm how long GitHub's review takes for the requested permission set,
before assuming a launch date.

**Depends on:** P2-01

**Acceptance criteria**
- [ ] Timeline confirmed and recorded, or a workaround identified if review is slow"

create_issue "[P3-01] Denylist pattern matcher" \
  "Phase 3 — Sensitive file guard" "phase:3,type:feature,status:later" \
"Pattern-match a tagged file's path against \`.env\`, \`.pem\`, \`.key\`,
\`id_rsa\`, and common secrets-manager filenames.

**Depends on:** —

**Acceptance criteria**
- [ ] All listed patterns correctly flagged; ordinary source files are not false-positived"

create_issue "[P3-02] Confirm-before-inject warning UI" \
  "Phase 3 — Sensitive file guard" "phase:3,type:feature,status:blocked" \
"Wire the matcher into the file-tagging injection path: warn and require
explicit confirmation before injecting a flagged file's contents.

**Depends on:** P3-01

**Acceptance criteria**
- [ ] Tagging a flagged file shows a warning and requires confirmation before it's injected"

create_issue "[P4-01] Extend Bundle type beyond files" \
  "Phase 4 — Bundles" "phase:4,type:feature,status:later" \
"Extend the \`Bundle\` type in \`storage.ts\` beyond \`files: string[]\` to
hold PRs, issues, and (later) commits.

**Depends on:** P2-08

**Acceptance criteria**
- [ ] Bundle can hold a mix of file/PR/issue references and round-trips through storage correctly"

create_issue "[P4-02] Bundle management UI" \
  "Phase 4 — Bundles" "phase:4,type:feature,status:blocked" \
"Popup UI: list, create, rename, delete bundles; add/remove items.

**Depends on:** P4-01

**Acceptance criteria**
- [ ] Full CRUD on bundles works from the popup"

create_issue "[P4-03] Reload bundle into conversation" \
  "Phase 4 — Bundles" "phase:4,type:feature,status:blocked" \
"Inject every item in a bundle into the active chat via the current adapter.

**Depends on:** P4-02

**Acceptance criteria**
- [ ] One click injects all bundle items into a fresh conversation"

create_issue "[P4-04] Staleness check on bundle reload" \
  "Phase 4 — Bundles" "phase:4,type:feature,status:blocked" \
"Ties into Phase 6's staleness flags — build together if that phase lands first.

**Depends on:** P4-03

**Acceptance criteria**
- [ ] Reloading a bundle flags any PR/issue that's since changed state"

create_issue "[P5-01] gemini.adapter.ts" \
  "Phase 5 — Gemini adapter" "phase:5,type:feature,status:later" \
"Implement \`PlatformAdapter\` for Gemini, following the ChatGPT/Claude pattern.

**Depends on:** P1-03, P1-04, P1-05

**Acceptance criteria**
- [ ] All \`PlatformAdapter\` methods implemented and working against live gemini.google.com"

create_issue "[P5-02] Gemini entry + manifest wiring" \
  "Phase 5 — Gemini adapter" "phase:5,type:feature,status:blocked" \
"\`gemini.entry.ts\` + a new \`content_scripts\` block + \`host_permissions\`
for gemini.google.com.

**Depends on:** P5-01

**Acceptance criteria**
- [ ] Extension mounts correctly on gemini.google.com without affecting the other two adapters"

create_issue "[P6-01] Commit history + diff fetch" \
  "Phase 6 — Commit digest, chat-code bridge, staleness flags" "phase:6,type:feature,status:later" \
"\`lib/github-api.ts\`: fetch commit history and diffs for a given path.

**Depends on:** P2-05

**Acceptance criteria**
- [ ] Given a file path, returns recent commits with messages and diffs"

create_issue "[P6-02] Commit-digest tag trigger + summarization" \
  "Phase 6 — Commit digest, chat-code bridge, staleness flags" "phase:6,type:feature,status:blocked" \
"\"What changed in \`auth.js\` recently and why\" — pulled from real commit
messages and diffs.

**Depends on:** P6-01

**Acceptance criteria**
- [ ] Tagging a file's commit digest returns a coherent summary grounded in real commit data"

create_issue "[P6-03] SPIKE: chat-code bridge mechanics" \
  "Phase 6 — Commit digest, chat-code bridge, staleness flags" "phase:6,type:spike,status:ready" \
"Highest technical risk in the spec. Investigate how a browser-chat session
can learn what Claude Code/Codex already did in a coding session, before
writing any implementation ticket.

**Depends on:** —

**Acceptance criteria**
- [ ] A concrete mechanism is identified and documented, or the feature is explicitly deprioritized/dropped with reasoning"

create_issue "[P6-04] Chat-code bridge implementation (TBD)" \
  "Phase 6 — Commit digest, chat-code bridge, staleness flags" "phase:6,type:feature,status:blocked" \
"Scope to be defined once P6-03 resolves.

**Depends on:** P6-03"

create_issue "[P6-05] Staleness flags" \
  "Phase 6 — Commit digest, chat-code bridge, staleness flags" "phase:6,type:feature,status:later" \
"Check a tagged PR/issue's state (open/closed/merged) at injection time and
flag if it's changed since being tagged.

**Depends on:** P2-06, P2-07

**Acceptance criteria**
- [ ] A merged/closed PR or issue shows a clear staleness warning when re-tagged or reloaded from a bundle"

echo "==> Done. $(gh issue list --repo "$REPO" --state all --limit 100 | wc -l | xargs) issues now on the repo."
