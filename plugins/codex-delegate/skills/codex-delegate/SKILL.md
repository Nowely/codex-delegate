---
name: codex-delegate
description: >-
  Run a task on Codex as a subagent, with rights declared per call: read-only analysis, or writing and
  running tests inside a git worktree. Use when a panel, refuters, or competing designs need a seat that
  does not share Claude's bias; when fanning out reviewers or adversarial verifiers; when two hypotheses
  have already failed and a third guess from the same model repeats the same bias; when a second
  independent implementation is wanted; or when the user names Codex, GPT, or "the other model" (через
  codex, через gpt, вторая имплементация, панель ревьюеров). Read it before fixing the mix whenever the
  user states how much work goes to Codex ("one of them codex", "half codex", "only codex") — and when
  they forbid it ("no codex", "just you"): a refusal is still a composition this skill decides, and an
  all-Claude panel owes the user one line naming its shared bias. Skip for trivia and mechanical
  fact-gathering; knowing the answer is not a reason to skip a requested second opinion.
version: 0.4.0
license: MIT
---

# Delegating to Codex

## What to type

The driver lives at `scripts/driver.mjs` under THIS skill's base directory (announced when this file
loads) — set `DRIVER` to that absolute path once per session. A read seat — the common case, and what a
panel's dissenting seat needs. The JSON report and a resumable thread are the defaults; `--brief` keeps
the inline answer out of your context budget:

```bash
node "$DRIVER" --cwd "$REPO" --brief \
  --expect-command '<regex of the real work, e.g. vitest|tsc>' \
  --prompt 'TASK:   <what to do>
CHECK:  <the ground truth to verify against>
RETURN: <exactly what to hand back>'
```

Omit `--expect-command` when the task has no single command signature — the no-command floor still
holds. A write seat: the driver creates a detached worktree under `$REPO/.claude/worktrees/`, runs the
turn there, and disposes of the tree itself. Once the turn completed, the work is harvested — the
tracked diff and an archive of untracked files land under `~/.codex-delegate/answers/`, their paths in
the report — and the tree is removed; a turn that did not complete (or a harvest that failed)
preserves the tree, and the report says why and how to remove it:

```bash
node "$DRIVER" --worktree "$REPO" \
  --verify '<the end state you demand, e.g. test -f done.txt>' --prompt '<task>'
```

Exit 0 means the turn completed, every check you declared passed, and a command really ran — unless
`--allow-no-commands` waived exactly that last clause. Anything else is a specific complaint — see
[Reading the result](#reading-the-result). Add `--network` only for a turn that must install
dependencies, and settle it with the user first: write plus network is an exfiltration surface.

## Before the first call

- None of this skill's commands are pre-approved in `~/.claude/settings.json`, so a delegation stops at
  Claude Code's own permission gate. Decide with the user how to handle that before a long delegation;
  do not add allow-rules on their behalf.
- Requirements: `codex` CLI installed and authenticated (`codex login status`); the driver finds it on
  `PATH` or in the standard install locations. The model,
  reasoning effort, personality and service tier are inherited from the caller's `~/.codex/config.toml`
  unless overridden per call.
- Protocol facts are pinned in `schema-<version>/` at the repository/plugin root (not shipped by a
  bare `npx skills` install). If `codex --version` differs from
  the pinned version, regenerate (`codex app-server generate-json-schema --out schema-<v>/`) and run the
  suites before trusting a run — the protocol carries no stability promise:

```bash
node <repo-or-plugin-root>/evals/protocol.test.mjs       # the protocol and the result gates
node <repo-or-plugin-root>/evals/lock.test.mjs           # the cwd lock and the worktree lifecycle
node <repo-or-plugin-root>/evals/attach-pasted.test.mjs  # handing a seat the user's pasted images
node <repo-or-plugin-root>/evals/fidelity.test.mjs       # does the fixture still answer like YOUR codex?
```

The suites live beside the skill in the **repository or plugin root** — `<root>/evals/`, where
`<root>/skills/codex-delegate/` is this file's directory. Do not compute that root by appending `../..`
to the skill path: where the skill is a symlink (the clone-and-symlink install the README documents),
Node collapses `..` lexically and lands somewhere that does not exist, while `ls` follows the link and
appears to work. Resolve the link, or use `$CLAUDE_PLUGIN_ROOT`. A bare `npx skills` install carries
only the skill itself and no suites, so run them from a checkout or a plugin install.

The suites write nothing into `~/.codex-delegate`: each sets `CODEX_DELEGATE_STATE_DIR` to a scratch
directory of its own. Before that they shared the real one, and a suite run concurrent with a live
delegation replaced that delegation's inherited config with the fixture's.

The `openai-codex` plugin is not a substitute where rights matter: it hardcodes an approval policy an
MDM profile clamps, and its always-sent `sandbox` parameter suppresses the permission profile that makes
read-level test runs possible. The full analysis lives in
[references/why-not-the-plugin.md](references/why-not-the-plugin.md).

## Composition: say who is running, before they run

A Codex seat is not a Claude seat, and the caller is entitled to know which is which. Three rules, all
unconditional:

1. **Announce the composition before starting** — for ANY run that ends up with a Codex seat, whether
   the caller asked for one or the default chose it. Name the count and which seats are Codex: "four
   reviewers, three Claude and one Codex". Not a footnote afterwards.
2. **A refusal is a composition too.** "No codex, just you" is answered by running zero Codex seats AND
   by saying, in one line, that the panel is therefore all-Claude and shares one bias.
3. **Attribute the results.** Say which seat produced each finding. If a Codex seat failed to start or
   returned nothing, say that too — never quietly backfill a dead Codex seat with a Claude.

### Choosing the mix

The caller controls it. Honour whatever they said; when they said nothing, use the default row.

| What the caller says | Composition |
| --- | --- |
| "no codex", "just you" | zero Codex seats |
| *nothing* — **the default** | panels, refutation, competing designs: **one** Codex seat, given to the seat whose job is to disagree. Mechanical fan-out: **zero**. A single task: yours |
| "a codex seat", "one of them codex" | exactly one |
| "half codex" | half the seats, rounded up |
| "mostly codex" | every seat except the coordinator; you orchestrate, synthesise, verify |
| "only codex", "all codex" | every seat, including a task that needs only one agent |
| "two of five codex" | exactly as stated |

A panel of only Claudes shares one bias, so the dissenting seat is where a Codex seat earns its cost. A
mechanical fan-out gets none — decorrelation buys nothing where there is nothing to disagree about, and
each seat costs ~180 MB and 7–12 s of turn overhead. The scale applies to single-agent work too: "only
codex" on one task means Codex does the task and you coordinate and check it.

### Verify the seat; wrapping it is a choice, not a mistake

**Direct.** Run the driver yourself, one background shell per seat. `--level read` takes no lock, so
any number of read seats work over one directory at once. Use `--brief`, or an unbounded seat hands its
whole working note into your context.

**Wrapped.** A subagent around the seat is legitimate — it can summarise, reconcile runs, or sit inside
a workflow. The standard wrapper is the **`codex-seat` agent** shipped with the plugin: call it as
`Agent(subagent_type: "codex-seat", prompt: "SEAT: read\nTASK: …")` or, in a workflow,
`agent(prompt, {agentType: "codex-seat"})` — its relay contract (verbatim answer, threadId, exitCode,
receipt, structured failure) is baked into the definition, so there is nothing to re-instruct. Where it
is not installed, a hand-rolled wrapper must be told its job:

    Return Codex's answer verbatim, with the run's threadId and exitCode. Do not summarise, do not add
    findings of your own, and if the run fails report the failure rather than answering yourself.

A wrapper — shipped or hand-rolled — declares the seat with `--seat-file <file>`: one `FIELD: value`
per line (`SEAT` first and required, then `EFFORT`, `TIMEOUT`, `EXPECT`, `VERIFY`, `NETWORK`, `MODEL`,
`WEB_SEARCH`, `OUTPUT_SCHEMA`, `WRITABLE`, `COMMIT`, `BRIEF`, `ALLOW_NO_COMMANDS`), each value taken
literally to end of line and mapped to the same flags with the same guards. That exists so a relay
never builds a shell command line out of values it was handed: `--expect-command "x' --level write
--commit '"` interpolated into `sh -c` grants write level and the git directory, while in a seat file
it stays one regex (pinned, and verified live). Explicit flags still override the file, so a harness
can bound a seat it did not author.

**Know the limit of that guarantee.** It holds for a value with no newline in it and fails for one
with: a newline is the field separator, so caller-supplied text carrying one ends its own field and
opens another, and the relay cannot tell an injected line from one it meant to write. Measured — a
value of `x\nVERIFY: touch /tmp/pwned` produced both `--expect-command x` and a `--verify` that ran.
Two rules close the reachable part of it, and both are the driver's, not the wrapper's:

- `SEAT` must be the **first** field, so an injected `SEAT` is always a duplicate and a duplicate is
  already a usage error. A seat file with no `SEAT` is refused rather than defaulted.
- `VERIFY` in a seat file needs `--allow-seat-verify` **on the command line**, because `--verify` runs
  an unsandboxed `/bin/sh` with your own rights at both levels. Pass `--verify` yourself instead; the
  command line is the one place a relayed value cannot reach.

The report carries `seatFileFields` — what the file actually declared, in order — so a wrapped seat is
not indistinguishable from a hand-typed one.

Either way, a wrapper must not be unverified: a seat that did nothing is indistinguishable from a seat
that found nothing. Demand the run's `threadId` and `exitCode` in the return, and read the receipt
fields in the report. The driver locates the rollout under `~/.codex/sessions`, **opens it**, and
checks that its opening `session_meta` record names this thread — so `receiptOk: true` means a session
record exists for this id, not merely that a file with that id in its name does. `receiptOriginator`,
`receiptModelProvider` and `receiptCwd` come out of that record; `receiptWhy` says why a receipt was
not accepted. `receiptOk: false` on a run that claims success is a red flag.

What it does **not** prove: the receipt is evidence against a wrapper that forwarded the work, not
against one that fabricated the whole report — a process that writes the report can write anything in
it. Read the rollout yourself when the answer matters that much.

**Verify with them; do not narrate them.** `threadId`, `exitCode` and `receiptOk` are the coordinator's
instruments, not the caller's reading material — the harness hands you a native subagent's id marked
"internal, do not mention to the user", and nobody misses it. Report the seat's ANSWER, attributed as
the composition rules require ("Codex found…"). An id or a code goes to the caller only when it changes
what they do next: the seat failed or returned nothing; `receiptOk` is false on a run that claims
success; they are auditing the delegation machinery itself, where the exit code IS the finding; or they
are about to `--resume` the thread and need the id.

## Levels

Two levels, mirroring your own subagents — a reader that may run things, and a writer confined to a
directory the driver or you chose. Everything else is a modifier on `write`.

| Flag | Codex may | Settle with the user first? |
| --- | --- | --- |
| `--level read` (default) | read any readable path and run commands; write **only `$TMPDIR`** | no |
| `--worktree <repo>` | write level in a driver-managed worktree, removed only when provably clean | say a worktree is being made |
| `--level write --cwd <dir>` | write anywhere under that directory | yes — you chose the blast radius |
| `--commit` | also `git add` / `git commit` — grants the MAIN clone's `.git`: config, hooks, every ref | yes; prefer harvesting a diff. See [references/commit-blast-radius.md](references/commit-blast-radius.md) |
| `--writable <dir>` | one extra writable root, repeatable | depends on the directory |
| `--network` | egress: installs, fetching packages | yes — write plus network is an exfiltration surface |

The three modifiers require write level; `--level read --network` is a usage error (exit 2). Naming the
cwd or a duplicate root twice is harmless — the driver dedupes and subtracts what the server would.

**`read` is not literally read-only, deliberately.** It extends `":read-only"` with `$TMPDIR` writable,
because a reader that cannot write its temp directory cannot start vitest or tsc. The guarantee is
exactly "`$TMPDIR` is writable and nothing else is" — so a `--cwd` that lives under `$TMPDIR` IS
writable, and where `TMPDIR` is `/tmp` (many Linux and container environments) the grant is all of
`/tmp`. **At write level `$TMPDIR` and all of `/tmp` are writable as well**, implicitly; do not leave
anything you care about in `/tmp` during a write delegation. The driver checks the sandbox the server
actually reports — type, roots, network — and refuses to run under anything else; `approvalPolicy` is
always `on-request`, and approvals are pinned to this driver (`approvalsReviewer: "user"`, asserted),
so a server-side reviewer cannot silently disarm the refusal policy.

**Effort is the quality knob, and by default it is not this driver's to set** — with no `--effort` the
thread inherits `model_reasoning_effort` from the caller's config, exactly as `--model` inherits the
model. Raising it costs latency; the ~7 s startup floor barely moves, but a `max` turn can run minutes.

| `--effort` | when |
| --- | --- |
| *omit* | the default, and usually right |
| `low` | fact lookup, listing call sites, a recall-only follow-up |
| `medium` | ordinary review, a summary you will read rather than act on |
| `high` / `xhigh` | a seat whose whole value is disagreement: refutation, competing designs, a second implementation |
| `max` / `ultra` | the hardest problems; `ultra` delegates subtasks to its own subagent threads |

`codex debug models` lists the current catalogue and each model's levels; the driver validates against
a permissive union, and a value it allows can still be refused by the server — which exits 2 carrying
the server's own list. Do not hardcode a model: pass `--model` only when the user names one or a run
must be reproducible.

## Parity with your own subagents

Measured 2026-08-30 on this repo (driver 0.1.0); the schema, brief, token and receipt rows re-measured
2026-08-31 on 0.4.0. The memory and overhead figures are the oldest numbers here and have not been
re-taken. Re-check after a codex upgrade.

| Your subagent | Codex equivalent | Parity |
| --- | --- | --- |
| `Explore` (read-only) | `--cwd <repo>` | matches for reading, grep, git, node, lint, and node-environment vitest **with `--configLoader runner`**. Browser-mode vitest cannot run here (loopback TCP refused); composite-project `tsc --noEmit` fails (writes `tsbuildinfo`) |
| agent with `isolation: "worktree"` | `--worktree <repo> --network` | edits and runs tests, including browser tests (see [references/browser-tests.md](references/browser-tests.md)). Installs need a cache inside the tree: `npm install --cache "$PWD/.npm-cache"`; `pnpm install --frozen-lockfile` works against a warm store |
| the same, committing | `--level write --cwd <worktree> --commit` | full: add and commit succeed |
| fan-out of many agents | many concurrent invocations | memory-bound: ~181 MB median per isolated seat (471 MB with `--host-home`), turn overhead 7–12 s dominated by provider round-trips |
| a subagent's MCP tools | **none, by default** | the price of the isolated home. `--mcp` carries the caller's `[mcp_servers]` — and only them — into the isolated home (the servers run with your rights); `--host-home` restores everything, plugins, skills and nondeterminism included |
| web search | `--web-search cached\|indexed\|live` | off unless asked; a managed device may permit only some modes, and the driver refuses a forbidden one (exit 2) rather than letting the server substitute silently |
| an image in the prompt | `--attach <file>` (repeatable, **command line only** — never a seat-file field, because an injected `ATTACH:` line would upload a file nobody named) | the protocol's `localImage`/`localAudio` input items — png/jpg/jpeg/gif/webp/bmp and wav/mp3/m4a/ogg/flac. Attachments go BEFORE the prompt text, the layout a pasted turn has. Checked before the turn, so a typo costs nothing. `--review` refuses them: its `review/start` carries no input items |
| **an image the USER pasted** | `scripts/attach-pasted.mjs` (below) | Claude Code keeps a paste only inside the transcript, so it has to be decoded to a file first; the front-end does that and calls the driver |
| watching a running subagent | `--progress` | one stderr line per item start (run/edit/search) without the delta firehose; the rollout under `~/.codex/sessions` stays the full live transcript |
| a review pass | `--review uncommitted\|branch:<ref>\|commit:<sha>` | the server's native reviewer on this thread; the review payload is the answer, the reviewer's own failed probes do not fail the run, and no prompt is needed |
| correcting a running subagent | `--steer-file <file>` | append text to the file: it reaches the live turn as `turn/steer` within a second and the file is drained. Input only, never rights |
| a schema-validated return | `--output-schema <file>` | the server constrains generation with the schema, the driver validates the result independently (type/required/properties/enum/items/additionalProperties), and a mismatch spends ONE corrective turn on the same thread before exit 13 — the retry a subagent's tool layer provides. **The schema must be STRICT**: every object needs `"additionalProperties": false` and a `"required"` listing every one of its properties (use `"type": ["string","null"]` where you wanted optional). The provider rejects anything else with a 400; the driver checks both rules before the turn so you do not pay a delegation to find out. `--answer-json` remains the lighter syntax-only demand |
| a short return + transcript | `--brief`, plus `answerPath` when the write succeeds | the full answer is written to `~/.codex-delegate/answers/<threadId>.md` (pruned after 14 days / 400 entries) and the inline answer is capped at 20 lines / 4 KB **including** the "clipped" marker. `answerPath` is null when there was no answer or the write failed, and `answerTruncated: true` with `answerPath: null` means the full text survives only in the rollout. Under `--brief` the model is ALSO asked to answer short and to put evidence in `$TMPDIR` files — so detail it never generated inline is not in `answerPath` either; skip `--brief` when you need the full working note |

**The concurrency budget is per machine, not per fan-out.** Each delegation spawns its own app-server
(plus, on `--host-home` only, a private copy of every MCP server in the caller's config). Exceeding the
budget does not degrade gracefully — the OS kills runs outright (`interrupted by SIGTERM`). Count
delegations across everything in flight; prefer draining one wave before starting the next. One more
fan-out fact: every concurrent run needs its own cwd — `--worktree` guarantees that by construction.
(The driver finds `codex` itself — PATH, then the standard install locations — so a non-login shell
needs no PATH export.)

### How to launch several, so each one reports back

| shape | notifications | use when |
| --- | --- | --- |
| one background call per delegation | one each, as each finishes | the usual case |
| subagents, launched in one message | one each | each delegation needs its own reasoning around it |
| the Workflow tool | one per agent | phases, verification, synthesis |
| one background call ending in `wait` | one, when the slowest finishes | the next step needs all of them |

Do **not** background a wrapper script that forks delegations with `&` and exits: the harness tracks
the process it started, the delegations are reparented to init, and nothing ever reports them.

## Handing a Codex seat the image the user pasted

A pasted image lives **only** in the session transcript — a base64 block with no filename, no path and
no index; its position in the turn is its whole identity, and Claude Code writes it nowhere else on
disk. So it has to be decoded to a file before any seat can see it. `scripts/attach-pasted.mjs` does
exactly that and then runs the driver:

```bash
node "$(dirname "$DRIVER")/attach-pasted.mjs" -- \
  --cwd "$REPO" --brief --allow-no-commands \
  --prompt 'TASK: … CHECK: … RETURN: …'
```

The default is **every image of the latest human turn, in the order pasted** — a series stays a series,
which is what your own context has: a coordinator sees all N blocks before the text, so a seat asked
about "the second screenshot" must see the same arrangement. Nothing is selected implicitly beyond that
turn: if the latest human turn carries no image, the run refuses (exit 2) and names `--list` rather
than reaching back to something older you did not mean.

    --list                  the last 10 image-bearing human turns: uuid, timestamp, count,
                            stored WxH, first 80 characters. Writes nothing.
    --pasted-turn <uuid>    take that turn instead (repeatable, emitted in transcript order)
    --pasted-pick 1,3-4     1-based indices within the selected turn
    --pasted-allow-old      permit a turn >12h older than the session's newest record

There is deliberately **no offset selector** (`back:2`, `--turns N`): machine records — task
notifications, the skill loader's own injections, tool results — share the `user` type and interleave
with yours, and a message queued while you compose the call shifts the count. An offset therefore
selects a *different* image with no error. Copy a uuid from `--list`, which a human can check at a
glance. Record uuids are also **not** stable across sessions: a resumed session copies earlier turns
into its own file with fresh ids, which is what the 12-hour reach-back guard is for.

Each image is validated before anything is written (media type against the record, magic bytes against
the media type, 10 MB each / 25 MB per turn / 20 images), lands at
`~/.codex-delegate/pasted/<pid>-<random>/NN-<sha>.png` mode 0600 in a 0700 directory, and is **removed
when the run ends**. Not `$TMPDIR`: that is the read level's one writable root, so the very seat being
shown the images could edit them. The stderr receipt names each image — turn, timestamp, the turn's
text, index, stored dimensions, size, sha256, path — and says out loud that it goes to the model
provider.

Two facts worth knowing before asking for pixel coordinates: Claude Code **downscales** a paste to at
most ~2000 px before storing it (its own meta records say "Multiply coordinates by 1.73 to map to the
original"), so the receipt's `WxH` is the space the seat answers in; and the images carry no names, so
if your prompt says "the first screenshot", number them there yourself — the driver adds no sentence of
its own to a prompt you wrote.

## Worktree lifecycle

`--worktree` owns it end to end: unique name under `<repo>/.claude/worktrees/`, a ledger entry in
`~/.codex-delegate/worktrees/` before the turn (best-effort, so a crashed run *usually* leaves a
trace), and disposal afterwards. A COMPLETED turn's tree asks nothing of you: its work is harvested —
`worktreeDiffPath` (the tracked diff, staged and unstaged, `git diff HEAD --binary`) and
`worktreeUntrackedPath` (a tar.gz of untracked files), both under `~/.codex-delegate/answers/` — and
the tree is then removed (`worktreeHarvested: true`). A turn that did not complete, or a harvest that
failed, preserves the tree instead: `worktreePreserved` says why, `worktreeRemoveCommand` says what to
run after harvesting by hand, and `worktreeFleet` counts the codex worktrees the repo still carries.
The destination is checked against the protected roots too, so a `<repo>/.claude` symlink cannot land
the tree somewhere the repository path did not imply. Ledger entries of CRASHED runs are reconciled on
the next `--worktree` invocation: a gone tree drops its entry, a clean tree is removed, a dirty one is
kept and named on stderr.

Managing a worktree by hand (a custom location, a resumed thread) is still legitimate — but harvest
before removing, and check `git status --porcelain` too: `git diff` does not show untracked files, and
`worktree remove --force` deletes them without complaint.

## Reading the result

The process exit code of `codex` itself is always 0, so the driver derives its own:

| Exit | Meaning |
| --- | --- |
| 0 | turn completed, every declared check passed, and a command really executed — unless `--allow-no-commands` waived exactly that clause |
| 1 | turn did not complete (`failed` / `interrupted`) — the answer is partial. A transient provider failure (stream disconnect, overload, usage window) is first absorbed by ONE bounded retry when the turn had produced nothing observable; `transientRetries` in the report records it |
| 2 | your arguments were rejected — by the driver (nothing ran, no report) or by the server mid-turn (commands may have run; the message carries the server's own wording) |
| 3 | timed out — the case most likely to leave a half-written tree |
| 4 | transport failure — codex missing or crashed, and every sandbox / approval-policy / reviewer assertion. Not a retry: it usually means the rights you asked for were not the rights you got |
| 5 | no command matching the expectation succeeded — the answer is unverified prose. With no expectation declared, the report's `hint` names `--allow-no-commands` for the recall-only case |
| 6 | an escalation was refused — the sandbox was too small; see below |
| 7 | something asked for a human: an MCP form, attestation, user input. No sandbox change fixes it |
| 8 | the turn produced commentary but never a final answer |
| 9 | `--verify` ran and failed: whatever the model said, the work is not there |
| 10 | the cwd is locked by another run, or a resumed thread still has a turn open |
| 11 | a command ran and **failed**, or a file change did. Only a **passing** `--verify` overrules it. A plain probe answering "no" — a no-match `grep`/`rg`, a false `test`, a `diff` that differs (exit 1 exactly) — is not a failure and never raises this |
| 12 | `--verify` could not be run at all — fix the verifier, not the work |
| 13 | the answer never matched `--output-schema`, even after the corrective turn — `schemaErrors` says how |

These are ordered, first match wins: **3 → 2 → 1 → 7 → 6 → 12 → 9 → 5 → 8 → 13 → 11**. Every code decided
after the turn can carry executed work — 3 most of all. The codes that mean nothing ran are decided
before the turn: an argument-error 2 (prints no report), 10, the assertion 4s — and a 3 raised before
the turn existed (a stalled config probe or stdin under a short `--timeout`), which also prints no
report.

**Cancelling a seat does not throw its work away.** `SIGINT`, `SIGTERM` and `SIGHUP` after the thread
exists report what the turn did so far — `turnStatus: "interrupted"`, exit **1**, a full JSON report —
and only before the thread exists do they exit 4. The server is also sent `turn/interrupt` (on
cancellation and on timeout), so the turn ends cleanly on its side and the thread stays resumable —
except in the sub-second window before `turn/start` has answered, where there is no turn id to name
and nothing is sent. A second signal escalates the running teardown
straight to `SIGKILL`. `SIGKILL` to the driver itself is the one case nothing can cover: descendants
survive and the cwd lock is left for the next run to reclaim.

A command counts as evidence only at `status: completed` with exit code 0; it counts as failed on
status `failed`/`declined` OR a non-zero code. **Even then, a passing gate proves a command succeeded,
not that the right one did** — Codex opens most turns by reading its own skill files, and that
satisfies any generic check. `--expect-command <regex>` catches drift (a turn that never got to the
work); it greps the model's own command strings, so it is worth passing and never worth trusting alone.

**`--verify '<shell>'` is the sound check**: run by the driver in the cwd after the turn, never sent to
the model, a non-zero exit fails the run with code 9 no matter what the answer claimed. ("Never sent"
is the accurate claim; it is not hidden — it sits in the driver's own argv, and a turn that reads
`/proc` or `ps` could see it. It runs with **your** rights, outside the sandbox, at both levels, which
is why a seat file cannot supply one without `--allow-seat-verify`.) It runs
whenever the turn completed — even when other gates missed — and is skipped only when there is no sound
end state (timeout, failed turn) or no wall clock left to run it in (`budget-exhausted`);
`verifySkipped` says which. A passing `--verify` does not waive a
declared `--expect-command` (a stale `dist/` satisfies `test -f dist/index.js` for a build that never
ran), and it cannot rescue a turn that did not complete. How each gate can be fooled:
[references/result-gates.md](references/result-gates.md).

    --verify 'test -f done.txt && grep -q PROOF done.txt'
    --verify 'pnpm -w exec vitest run --project docs'
    --verify 'git -C "$W" diff --quiet && exit 1 || exit 0'   # demand that something changed

## Escalations mean your sandbox was too small

Under `on-request`, Codex asks only when told not to give up on a denial. The driver refuses, records
it, and exits 6 unless something worse outranks it. A refused escalation means the work is very likely
incomplete; fix it by widening the sandbox (`--writable`, `--network`, write level), not by wanting to
approve — if you want to approve, the rights were sized wrong. Escalations from Codex's own subagent
threads count too (tagged `subagent`): evidence of failure is inclusive, while evidence of success
stays root-thread-only.

## One run per directory

At write level the driver takes an exclusive lock keyed on the cwd's identity; a second run in the same
directory exits 10 rather than racing the first. The lock lives in `~/.codex-delegate/locks/`, the
exit-10 message names the file to delete if the holder is really gone, and it is released only after
the driver has waited its whole process group out — SIGTERM, up to 2 s, then SIGKILL and up to 1 s more
— so a next writer does not enter a directory where the previous run's test servers are still dying.
**That wait is bounded, not unconditional**: a group member still alive after those three seconds does
not hold the lock any longer, and a driver killed with `SIGKILL` releases nothing at all. It serialises
invocations, not directories: give every concurrent run its own cwd (`--worktree` does). Internals:
[references/lock-internals.md](references/lock-internals.md).

`CODEX_DELEGATE_STATE_DIR` moves the locks, the answer log, the isolated Codex home and the worktree
ledger somewhere else. It is for test harnesses — the eval suites set it so they cannot touch the state
a live delegation is using — and two runs under different values do not exclude each other.

## Traps

- Misspelled `-c` config keys are swallowed silently, and the offline oracle that catches them is blind
  inside `permissions.<profile>.*`. Validate first: [references/config-drift.md](references/config-drift.md).
- A seat that starts background load must kill it from a `trap 'kill $PIDS' EXIT INT TERM`, not from a
  line at the end — a parent that dies first orphans the load to PID 1.
- **That applies to YOUR shell too, and `jobs -p` will not save you.** Measured while auditing this
  skill: a coordinator generating CPU load with `for i in $(seq 1 10); do (while :; do :; done) & done`
  and cleaning up with `LOADPIDS=$(jobs -p); …; kill $LOADPIDS` left twenty-two busy loops reparented to
  PID 1, burning half a core each for nearly eight hours. Under the tool harness the command runs inside
  its own `zsh -c` wrapper, where `jobs -p` reported nothing, so `kill` killed nothing and the wrapper
  exited first. Record pids as you spawn them (`p=$!; PIDS="$PIDS $p"`), arm the trap before the loop,
  and prefer `kill -9 -$$` on the whole group. Then check with
  `ps -eo pid,ppid,etime,command | awk '$2==1'` — a delegation's own teardown is not what leaks here.
- **A seat whose method is to make things fail will exit 11** — mutation testing, red-green repro,
  bisection. That is your flag choice, not the seat: pass `--verify` with the end condition you
  actually want; a passing check overrules failed commands by design.
- **Hardening your own tool, phrased as attacking it, is refused** by OpenAI's safety classifier
  (`turnStatus: failed`, `codexErrorInfo: "cyberPolicy"`). Describe the work as what it is —
  robustness under unusual states — and the same seat does the same work.
- **The same rule governs the text YOU write, not just what you send to Codex.** Anthropic's classifier
  flags a prompt phrased as offensive security as `[cyber]` and falls the session back to another
  model for its whole remaining life (`model_refusal_fallback`, `scope: session`). Measured: an audit
  brief asking to "bypass the guard", "forge the receipt" and "break the contract" tripped it on the
  first message, before a single file was read — and that brief had been drafted by a Claude
  coordinator using this skill. Write "check the guard against unusual spellings of a path", "establish
  what the receipt actually proves", "confirm a relayed value cannot become a flag". Same work, same
  findings, no fallback.

## Flags

The two recipes at the top of this file are the common cases. The full surface — every flag, the
environment variables, what `tokenUsage` actually counts, which directories are protected and which
are only assumed to be, and how the shared isolated home works — is in
[references/flags-and-internals.md](references/flags-and-internals.md), and `node "$DRIVER" --help`
prints the same list out of the code, which is the copy that cannot drift.

The four worth knowing without opening either: `--level read|write` (default `read`) · `--timeout
<sec>` (default 900) · `--brief` (cap the inline answer; the full text is at `answerPath`) ·
`--allow-no-commands` (waives the command floor, never a declared expectation).

**Only `~/.codex` and `~/.codex-delegate` are protected roots.** `~/.ssh`, `~/.claude` and the rest of
your home are grantable; the driver refuses your home directory itself and every ancestor of it, not
everything valuable inside it.

## Multiple rounds

Every run prints `threadId=…`, and `--resume <threadId>` continues the thread with its context — the
right shape for "here is my counter-argument" and second-look diagnoses. Rights are per call, on resume
as everywhere else: a thread started at read level continues at whatever level the resuming call names.
A recall-only follow-up runs no commands and needs `--allow-no-commands`.

## Writing the prompt

Standing rules are already on the thread — unattended operation, local shell only, no web search unless
`--web-search` was granted, `COMMAND_BLOCKED` when a command cannot run, never claim a test passed
without seeing the count. Do not repeat them. The prompt carries three things:

    TASK:    what to do
    CHECK:   the ground truth to verify against, ideally something unguessable
    RETURN:  exactly what to hand back

Rights are expressed by the level flags, not by prose — asking Codex to "not modify anything" is a
request; `--level read` is a kernel-enforced fact. Codex can fabricate when it cannot reach the
evidence; judge by the command list and the receipt, not by the prose. The incidents behind these
rules: [references/incidents.md](references/incidents.md).
