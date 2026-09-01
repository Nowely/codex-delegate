---
name: codex-delegate
description: >-
  Run a task on Codex as a subagent, with rights declared per call: read-only analysis, or writing and
  running tests inside a git worktree. Use when a panel, refuters, or competing designs need a seat that
  does not share Claude's bias; when fanning out reviewers or adversarial verifiers; when two hypotheses
  have already failed and a third guess from the same model repeats the same bias; when a second
  independent implementation is wanted; or when the user names Codex, GPT, or "the other model" (через
  codex, через gpt, вторая имплементация, панель ревьюеров). Read this skill before fixing the mix whenever the
  user states how much work goes to Codex ("one of them codex", "half codex", "only codex") — and when
  they forbid it ("no codex", "just you"): a refusal is still a composition this skill decides. Skip
  for trivia and mechanical fact-gathering; knowing the answer is not a reason to skip a requested
  second opinion.
version: 0.6.0
license: MIT
---

# Delegating to Codex

One **run** of the driver (a **delegation**) gives one Codex **seat** its declared rights and executes
one **turn** — a prompt→answer exchange on a thread; `--resume` adds turns to the same thread across
runs.

## Before the first call

- None of this skill's commands are pre-approved in `~/.claude/settings.json`, so a delegation stops at
  Claude Code's own permission gate. Decide with the user how to handle that before a long delegation;
  do not add allow-rules on their behalf.
- Requirements: `codex` CLI installed and authenticated (`codex login status`). The model, reasoning
  effort, personality and service tier are inherited from the caller's `~/.codex/config.toml` unless
  overridden per call. Install routes and prerequisites: `README.md` at the plugin root.
- After a codex upgrade, follow the README's upgrade recipe (regenerate `schema-<v>/`, run the eval
  suites) before trusting a run — the app-server protocol carries no stability promise.
- The `openai-codex` plugin and the `codex exec`-based skills are not substitutes where rights matter:
  their read and review seats cannot run tests, and the failure is silent (the run still exits 0). The
  verdict is in the README, the forensics in
  [references/why-not-the-plugin.md](references/why-not-the-plugin.md).

## What to type

The driver lives at `scripts/driver.mjs` under THIS skill's base directory (announced when this file
loads) — set `DRIVER` to that absolute path, and `REPO` to the repository the seat works on, once per
session. A read seat is the common case, and what a panel's dissenting seat needs. The JSON report and a
resumable thread are the defaults; `--brief` caps the inline answer (the full text survives at
`answerPath`):

```bash
node "$DRIVER" --cwd "$REPO" --brief \
  --expect-command '<regex of the real work, e.g. vitest|tsc>' \
  --prompt 'TASK:   <what to do>
CHECK:  <the ground truth to verify against>
RETURN: <exactly what to hand back>'
```

Omit `--expect-command` when the task has no single command signature — the no-command floor (exit 0
still needs SOME command to have really executed; `--allow-no-commands` waives it) holds either way. A
write seat: the driver creates a detached worktree under `$REPO/.claude/worktrees/`, runs the
turn there, and owns the tree end to end — harvest and disposal included; see
[Worktree lifecycle](#worktree-lifecycle):

```bash
node "$DRIVER" --worktree "$REPO" \
  --verify '<the end state you demand, e.g. test -f done.txt>' --prompt '<task>'
```

Exit 0 is the only success, and it is derived from evidence; anything else is a specific complaint —
see [Reading the result](#reading-the-result). Add `--network` only for a turn that needs it —
installing dependencies, or binding loopback TCP, which browser tests do — and settle it with the user
first: write plus network is an exfiltration surface.

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
| *nothing* — **the default** | panels, refutation, competing designs: **one** Codex seat, given to the seat whose job is to disagree. Mechanical fan-out: **zero**. A single task: zero — you do it yourself |
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
receipt, structured failure) is baked into the definition, so there is nothing to re-instruct. Its
ceiling: the Bash tool caps a call at 600 s, so a seat that needs more than ~560 s of wall clock
cannot complete through the agent — run the driver directly for longer seats. Where the agent is not
installed, a hand-rolled wrapper must be told its job:

    Return Codex's answer verbatim, with the run's threadId and exitCode. Do not summarise, do not add
    findings of your own, and if the run fails report the failure rather than answering yourself.

Never run a hand-rolled relay on a small model. Measured: a haiku relay answered a failing SEAT
declaration by creating the missing directory and running Codex under rights nobody granted, then
reported success — the shipped agent is pinned to sonnet for exactly that.

A wrapper — shipped or hand-rolled — declares the seat with `--seat-file <file>`: one `FIELD: value`
per line, `SEAT` first and required — the full field list is in `--help` — each value taken as-is to
end of line (outer whitespace trimmed, interior preserved) and
mapped to the same flags with the same guards. That exists so a relay never builds a shell command
line out of values it was handed: an injected quote in `sh -c` becomes flags; in a seat file it stays
one literal value. Explicit flags still override the file, so a harness can bound a seat it did not
author.

**The guarantee stops at a newline** — a relayed value carrying one opens a field of its own
(measured; the story is in [references/environment-and-internals.md](references/environment-and-internals.md)).
Two driver-side rules close the reachable part: `SEAT` must be the **first** field (an injected `SEAT`
is then always a duplicate, and a file with no `SEAT` is refused, not defaulted), and `VERIFY` in a
seat file needs `--allow-seat-verify` **on the command line**, because `--verify` runs an unsandboxed
`/bin/sh` with your own rights — pass `--verify` yourself instead. The report's `seatFileFields` lists
what the file actually declared, in order, so a wrapped seat is not indistinguishable from a
hand-typed one.

Either way, a wrapper must not be unverified: a seat that did nothing is indistinguishable from a seat
that found nothing. Demand the run's `threadId` and `exitCode` in the return, and read the receipt
fields in the report. The driver locates the rollout under `~/.codex/sessions`, **opens it**, and
checks that its opening `session_meta` record names this thread — so `receiptOk: true` means a session
record exists for this id, not merely that a file with that id in its name does. `receiptOriginator`,
`receiptModelProvider` and `receiptCwd` come out of that record; `receiptWhy` says why a receipt was
not accepted. `receiptOk: false` on a run that claims success is a red flag.

What it does **not** prove: a process that writes the report can fabricate all of it — the receipt only
catches a wrapper that forwarded the work. Read the rollout yourself when the answer matters that much.

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
| `--worktree <repo>` | write level in a driver-managed worktree; harvested and removed after the turn, preserved only when the turn or the harvest failed | no — but say a worktree is being made |
| `--level write --cwd <dir>` | write anywhere under that directory | yes — you chose the blast radius |
| `--commit` | also `git add` / `git commit` — grants the MAIN clone's `.git`: config, hooks, every ref | yes; prefer harvesting a diff. See [references/commit-blast-radius.md](references/commit-blast-radius.md) |
| `--writable <dir>` | one extra writable root, repeatable | depends on the directory |
| `--network` | the network switch: egress AND loopback TCP — installs, package fetches, browser-test servers | yes — write plus network is an exfiltration surface |

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
a permissive union (`none minimal low medium high xhigh max ultra`), and a value it allows can still
be refused by the server — which exits 2 carrying the server's own list. Do not hardcode a model: pass
`--model` only when the user names one or a run must be reproducible.

## Parity with your own subagents

Measured 2026-08-30/31 on this repo (driver 0.1.0–0.4.0); the memory and overhead figures are the
oldest numbers here. Re-check after a codex upgrade.

| Your subagent | Codex equivalent | Parity |
| --- | --- | --- |
| `Explore` (read-only) | `--cwd <repo>` | matches for reading, grep, git, node, lint, and node-environment vitest **with `--configLoader runner`**. Browser-mode vitest cannot run here (loopback TCP refused); composite-project `tsc --noEmit` fails (writes `tsbuildinfo`) |
| agent with `isolation: "worktree"` | `--worktree <repo> --network` | edits and runs tests; browser tests only after the one-file override in [references/browser-tests.md](references/browser-tests.md) — without it Chromium crashes under the sandbox, and the run must be serial. Installs need a cache inside the tree: `npm install --cache "$PWD/.npm-cache"`; `pnpm install --frozen-lockfile` works against a warm store |
| the same, committing | `--level write --cwd <worktree> --commit` | full: add and commit succeed |
| fan-out of many agents | many concurrent invocations | memory-bound: ~181 MB median per isolated seat (471 MB with `--host-home`), turn overhead 7–12 s dominated by provider round-trips |
| a subagent's MCP tools | **none, by default** | the price of the isolated home (the private `CODEX_HOME` runs use instead of yours). `--mcp` copies the representable entries of the caller's `[mcp_servers]` — and only them — into a private per-run home, deleted at exit; a skipped entry is named on stderr, and the servers run with your rights. `--host-home` restores everything, plugins, skills and nondeterminism included |
| web search | `--web-search cached\|indexed\|live` | off unless asked; a managed device may permit only some modes, and the driver refuses a forbidden one (exit 2) rather than letting the server substitute silently |
| an image in the prompt | `--attach <file>` (repeatable, **command line only** — never a seat-file field, because an injected `ATTACH:` line would upload a file nobody named) | the protocol's `localImage`/`localAudio` input items; the format list is in `--help`, the ordering and pre-turn checks in [references/environment-and-internals.md](references/environment-and-internals.md). `--review` refuses them: its `review/start` carries no input items |
| **an image the USER pasted** | `scripts/attach-pasted.mjs` (below) | Claude Code keeps a paste only inside the transcript, so it has to be decoded to a file first; the front-end does that and calls the driver |
| watching a running subagent | `--progress` | one stderr line per item start (run/edit/search) without the delta firehose; the rollout under `~/.codex/sessions` stays the full live transcript |
| a review pass | `--review uncommitted\|branch:<ref>\|commit:<sha>` | the server's native reviewer on this thread; the review payload is the answer, the reviewer's own failed probes do not fail the run, and no prompt is needed |
| correcting a running subagent | `--steer-file <file>` | append text to the file: it reaches the live turn as `turn/steer` within a second and the file is drained. Input only, never rights |
| a schema-validated return | `--output-schema <file>` | the server constrains generation, the driver validates the result independently, and a mismatch spends ONE corrective turn on the same thread before exit 13 — the retry a subagent's tool layer provides. **The schema must be STRICT**; the rules are in `--help`, and the driver checks them before the turn so a bad schema costs no delegation. `--answer-json` remains the lighter syntax-only demand |
| a short return + transcript | `--brief`, plus `answerPath` when the write succeeds | the inline answer is capped, the full text lands in the answer log — but under `--brief` the model is ALSO asked to answer short, so skip it when you need the full working note. The caps, the pruning, and what a null `answerPath` means: [references/environment-and-internals.md](references/environment-and-internals.md) |

**The concurrency budget is per machine, not per fan-out.** Each delegation spawns its own app-server
(plus, under `--host-home` or `--mcp`, a private copy of the caller's MCP servers). Exceeding the
budget does not degrade gracefully — the OS kills runs outright (`interrupted by SIGTERM`). Count
delegations across everything in flight; prefer draining one wave before starting the next. One more
fan-out fact: every concurrent write-capable run needs its own cwd — `--worktree` guarantees that by
construction; read seats take no lock and may share one.
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
# the bare -- ends attach-pasted's own selector flags; everything after it goes to the driver
node "$(dirname "$DRIVER")/attach-pasted.mjs" -- \
  --cwd "$REPO" --brief --allow-no-commands \
  --prompt 'TASK: … CHECK: … RETURN: …'
```

The default is **every image of the latest human turn, in the order pasted** — a series stays a series,
which is what your own context has: a coordinator sees all N blocks before the text, so a seat asked
about "the second screenshot" must see the same arrangement. Nothing is selected implicitly beyond that
turn: if the latest human turn carries no image, the run refuses (exit 2) and names `--list` rather
than reaching back to something older you did not mean. To take an older turn, copy a uuid from
`--list` — never count backwards: an offset silently selects a *different* image (why: the reference
below). The selector flags, the validation limits, where the files land and why,
and the two facts to know before asking for pixel coordinates (the ~2000 px downscale, the unnamed
images): [references/pasted-images.md](references/pasted-images.md), or `--help`.

## Worktree lifecycle

`--worktree` owns it end to end: unique name under `<repo>/.claude/worktrees/`, a ledger entry before
the turn, and disposal afterwards. A COMPLETED turn's tree asks nothing of you: its work is harvested —
`worktreeDiffPath` (one patch diffed against the commit the tree started at — staged and unstaged work
travel, and commits the seat made get a real ref in the main repository, `worktreeCommitsRef`) and
`worktreeUntrackedPath` (a tar.gz of non-ignored untracked files; git-ignored artifacts are NOT
harvested — `worktreeIgnoredDropped` counts what removal took with the tree), both under
`~/.codex-delegate/answers/` — and the tree is then removed (`worktreeHarvested: true`). A turn that
did not complete, or a harvest that failed, preserves the tree instead: `worktreePreserved` says why,
`worktreeRemoveCommand` says what to run after harvesting by hand, and `worktreeFleet` counts the
codex worktrees the repo still carries. Ledger and destination internals:
[references/environment-and-internals.md](references/environment-and-internals.md).

Managing a worktree by hand (a custom location, a resumed thread) is still legitimate — but harvest
before removing, and check `git status --porcelain` too: `git diff` does not show untracked files, and
`worktree remove --force` deletes them without complaint.

## Reading the result

The process exit code of `codex` says nothing about the task — a run that survives to its end exits 0
whatever happened, and a crash is transport failure (exit 4) — so the driver derives its own:

| Exit | Meaning |
| --- | --- |
| 0 | turn completed, every declared check passed, and a command really executed — unless `--allow-no-commands` waived exactly that clause |
| 1 | turn did not complete (`failed` / `interrupted`) — the answer is partial. A transient provider failure (a stream or connection drop, a server error, overload — deliberately not a usage-limit window, which no short retry clears) is first absorbed by ONE bounded retry when the turn had produced nothing observable; `transientRetries` in the report records it |
| 2 | your arguments were rejected — by the driver (nothing ran, no report) or by the server mid-turn (commands may have run; the message carries the server's own wording) |
| 3 | timed out — the case most likely to leave a half-written tree |
| 4 | transport failure — codex missing or crashed, and every sandbox / approval-policy / reviewer assertion. Not a retry: it usually means the rights you asked for were not the rights you got |
| 5 | no command matching the expectation succeeded — the answer is unverified prose. With no expectation declared, the report's `hint` names `--allow-no-commands` for the recall-only case |
| 6 | an escalation was refused — the sandbox was too small; see below |
| 7 | something asked for a human: an MCP form, attestation, user input. No sandbox change fixes it |
| 8 | the turn ended with no final answer (with or without commentary along the way) |
| 9 | `--verify` ran and failed: whatever the model said, the work is not there |
| 10 | the cwd is locked by another run, or a resumed thread still has a turn open |
| 11 | a command ran and **failed**, or a file change did. Only a **passing** `--verify` — or, under `--review`, an arrived review payload — overrules it. A plain probe answering "no" — a no-match `grep`/`rg`, a false `test`, a `diff` that differs (exit 1 exactly) — is not a failure and never raises this |
| 12 | `--verify` could not be run at all — fix the verifier, not the work |
| 13 | the answer never matched `--output-schema`, even after the corrective turn — `schemaErrors` says how |

These are ordered, first match wins, and 4 and 10 never enter the ladder — they end the run before the
turn's verdict exists: **3 → 2 → 1 → 7 → 6 → 12 → 9 → 5 → 8 → 13 → 11**. Every code decided
after the turn can carry executed work — 3 most of all. The codes that mean nothing ran are decided
before the turn: an argument-error 2 (prints no report), 10, the assertion 4s — and a 3 raised before
the turn existed (a stalled config probe or stdin under a short `--timeout`), which also prints no
report.

**Cancelling a seat does not throw its work away.** `SIGINT`, `SIGTERM` and `SIGHUP` after the thread
exists report what the turn did so far — `turnStatus: "interrupted"`, exit **1**, a full JSON report —
and only before the thread exists do they exit 4. The server is sent `turn/interrupt` (on cancellation
and on timeout), so the turn ends cleanly on its side and the thread stays resumable; a second signal
escalates the running teardown straight to `SIGKILL`. `SIGKILL` to the driver itself is the one case
nothing can cover: descendants survive and the cwd lock is left for the next run to reclaim.

A command counts as evidence only at `status: completed` with exit code 0; it counts as failed on
status `failed`/`declined` OR a non-zero code. **Even then, a passing gate proves a command succeeded,
not that the right one did** — Codex opens most turns by reading its own skill files, and that
satisfies any generic check. `--expect-command <regex>` catches drift (a turn that never got to the
work); it greps the model's own command strings, so it is worth passing and never worth trusting alone.
One bypass needs no intent at all: a pipeline exits with its LAST command's status, and Codex routinely
pipes to `head`/`tail` — so `vitest run | tail -5` with a failing suite counts as a succeeded command
and can reach exit 0. Pin real outcomes with `--verify`.

**`--verify '<shell>'` is the sound check**: run by the driver in the cwd after the turn, never sent to
the model, a non-zero exit fails the run with code 9 no matter what the answer claimed. It gets at most
300 s of whatever `--timeout` budget remains — keep it cheaper than a full suite, or a healthy run
exits 12. ("Never sent"
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
    --verify 'git diff --quiet && exit 1 || exit 0'   # demand that something changed

## Escalations mean your sandbox was too small

Under `on-request`, Codex asks only when told not to give up on a denial. The driver refuses, records
it, and exits 6 unless something worse outranks it. A refused escalation means the work is very likely
incomplete; fix it by widening the sandbox (`--writable`, `--network`, write level), not by wanting to
approve — if you want to approve, the rights were sized wrong. Escalations from Codex's own subagent
threads count too (tagged `subagent`): evidence of failure is inclusive, while evidence of success
stays root-thread-only.

## One run per directory

At write level the driver takes an exclusive lock keyed on the cwd's identity; a second run in the same
directory exits 10 rather than racing the first, and the exit-10 message names the lock file to delete
if the holder is really gone. It serialises runs, not directories: give every concurrent run its
own cwd (`--worktree` does). Release timing, reclaim, and the `CODEX_DELEGATE_STATE_DIR` override:
[references/lock-internals.md](references/lock-internals.md) and
[references/environment-and-internals.md](references/environment-and-internals.md).

## Traps

- Misspelled `-c` config keys are swallowed silently, and the offline oracle that catches them is blind
  inside `permissions.<profile>.*`. Validate first: [references/config-drift.md](references/config-drift.md).
- A seat that starts background load must kill it from a `trap 'kill $PIDS' EXIT INT TERM`, not from a
  line at the end — a parent that dies first orphans the load to PID 1. **That applies to YOUR shell
  too, and `jobs -p` will not save you** (under the tool harness it reports nothing): record pids as
  you spawn them (`p=$!; PIDS="$PIDS $p"`), arm the trap before the loop, and prefer `kill -9 -$$` on
  the whole group. The measured incident — twenty-two orphaned busy loops for eight hours — is in
  [references/incidents.md](references/incidents.md).
- **A seat whose method is to make things fail will exit 11** — mutation testing, red-green repro,
  bisection. That is your flag choice, not the seat: pass `--verify` with the end condition you
  actually want; a passing check overrules failed commands by design.
- **A non-zero exit is a verdict on the gates, not proof there is no answer.** Every code decided
  after the turn — 1 (partial), 5, 6, 9, 11, 12, 13 — still delivers the full report, the answer and
  the receipt. A coordinator, or a merge step it instructs, that discards a seat's return because "the
  exit was non-zero" throws away receipt-verified work — measured: a review panel's merge dropped a
  ten-finding Codex answer over one failed probe's exit 11. Gate the *evidence* on the code; read the
  answer regardless.
- **Hardening your own tool, phrased as attacking it, is refused** by OpenAI's safety classifier
  (`turnStatus: failed`, `codexErrorInfo: "cyberPolicy"`). Describe the work as what it is —
  robustness under unusual states — and the same seat does the same work.
- **The same rule governs the text YOU write, not just what you send to Codex.** Anthropic's classifier
  flags a prompt phrased as offensive security ("bypass the guard", "forge the receipt") and falls the
  session back to another model for its whole remaining life — measured, on the first message. Write
  the same work as what it is: "check the guard against unusual spellings", "establish what the
  receipt actually proves". Details: [references/incidents.md](references/incidents.md).

## Flags

The two recipes at the top of this file are the common cases. The full flag inventory is
`node "$DRIVER" --help` — printed from the code, the copy that cannot drift. The environment
variables, what `tokenUsage` actually counts, which directories are protected and which are only
assumed to be, and how the shared isolated home works:
[references/environment-and-internals.md](references/environment-and-internals.md).

The four worth knowing without opening either: `--level read|write` (default `read`) · `--timeout
<sec>` (default 900) · `--brief` (cap the inline answer; the full text is at `answerPath`) ·
`--allow-no-commands` (waives the no-command floor, never a declared expectation).

**Only `~/.codex`, `~/.codex-delegate` and the driver's state directory are protected roots** — the
rest of your home, `~/.ssh` included, is grantable; the reference above says exactly what is refused
and why.

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
