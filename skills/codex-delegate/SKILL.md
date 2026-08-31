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
version: 0.3.0
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
turn there, and removes the tree afterwards only when the turn completed AND `git status --porcelain`
is empty (a clean tree whose turn never even started is removed too). Every other outcome preserves
the tree, and the report says why and how to remove it:

```bash
node "$DRIVER" --worktree "$REPO" \
  --verify '<the end state you demand, e.g. test -f done.txt>' --prompt '<task>'
```

Exit 0 means the turn completed, a command really ran, and every check you declared passed. Anything
else is a specific complaint — see [Reading the result](#reading-the-result). Add `--network` only for
a turn that must install dependencies, and settle it with the user first: write plus network is an
exfiltration surface.

## Before the first call

- None of this skill's commands are pre-approved in `~/.claude/settings.json`, so a delegation stops at
  Claude Code's own permission gate. Decide with the user how to handle that before a long delegation;
  do not add allow-rules on their behalf.
- Requirements: `codex` CLI on `PATH` and authenticated (`codex login status`), Node 18+. The model,
  reasoning effort, personality and service tier are inherited from the caller's `~/.codex/config.toml`
  unless overridden per call.
- Protocol facts are pinned in `schema-<version>/` at the repository/plugin root (not shipped by a
  bare `npx skills` install). If `codex --version` differs from
  the pinned version, regenerate (`codex app-server generate-json-schema --out schema-<v>/`) and run the
  suites before trusting a run — the protocol carries no stability promise:

```bash
node <repo-or-plugin-root>/evals/protocol.test.mjs   # the protocol and the result gates
node <repo-or-plugin-root>/evals/lock.test.mjs       # the cwd lock and the worktree lifecycle
node <repo-or-plugin-root>/evals/fidelity.test.mjs   # does the fixture still answer like YOUR codex?
```

The suites live beside the skill in the repository (or plugin root), two directories up from this
file's base directory; a bare `npx skills` install carries only the skill itself, so run them from a
checkout.

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
per line (`SEAT`, `EFFORT`, `TIMEOUT`, `EXPECT`, `VERIFY`, `NETWORK`, `MODEL`, `WEB_SEARCH`,
`OUTPUT_SCHEMA`, `WRITABLE`, `COMMIT`, `BRIEF`, `ALLOW_NO_COMMANDS`), each value taken literally to
end of line and mapped to the same flags with the same guards. That exists so a relay never builds a
shell command line out of values it was handed: `--expect-command "x' --level write --commit '"`
interpolated into `sh -c` grants write level and the git directory, while in a seat file it stays one
regex (pinned, and verified live). Explicit flags still override the file, so a harness can bound a
seat it did not author.

Either way, a wrapper must not be unverified: a seat that did nothing is indistinguishable from a seat
that found nothing. Demand the run's `threadId` and `exitCode` in the return, and read `receiptPath` in
the report — the driver locates the rollout under `~/.codex/sessions` itself, and `receiptOk: false` on
a run that claims success is a red flag (the rollout carries the originator, the model provider and the
whole turn; a wrapper that forwarded the work has no thread id to give).

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

Measured 2026-08-30 on this repo (driver 0.1.0); the schema row re-measured 2026-08-31 on 0.3.0.
Re-check after a codex upgrade.

| Your subagent | Codex equivalent | Parity |
| --- | --- | --- |
| `Explore` (read-only) | `--cwd <repo>` | matches for reading, grep, git, node, lint, and node-environment vitest **with `--configLoader runner`**. Browser-mode vitest cannot run here (loopback TCP refused); composite-project `tsc --noEmit` fails (writes `tsbuildinfo`) |
| agent with `isolation: "worktree"` | `--worktree <repo> --network` | edits and runs tests, including browser tests (see [references/browser-tests.md](references/browser-tests.md)). Installs need a cache inside the tree: `npm install --cache "$PWD/.npm-cache"`; `pnpm install --frozen-lockfile` works against a warm store |
| the same, committing | `--level write --cwd <worktree> --commit` | full: add and commit succeed |
| fan-out of many agents | many concurrent invocations | memory-bound: ~181 MB median per isolated seat (471 MB with `--host-home`), turn overhead 7–12 s dominated by provider round-trips |
| a subagent's MCP tools | **none, by default** | the price of the isolated home; `--host-home` restores them, and their nondeterminism |
| web search | `--web-search cached\|indexed\|live` | off unless asked; a managed device may permit only some modes, and the driver refuses a forbidden one (exit 2) rather than letting the server substitute silently |
| a schema-validated return | `--output-schema <file>` | the server constrains generation with the schema, the driver validates the result independently (type/required/properties/enum/items), and a mismatch spends ONE corrective turn on the same thread before exit 13 — the retry a subagent's tool layer provides. `--answer-json` remains the lighter syntax-only demand |
| a short return + transcript | `--brief`, plus `answerPath` always | the full answer is written to `~/.codex-delegate/answers/<threadId>.md` (pruned after 14 days / 400 entries) and the inline answer is capped at 20 lines / 4 KB. Under `--brief` the model is ALSO asked to answer short and to put evidence in `$TMPDIR` files — so detail it never generated inline is not in `answerPath` either; skip `--brief` when you need the full working note |

**The concurrency budget is per machine, not per fan-out.** Each delegation spawns its own app-server
(plus, on `--host-home` only, a private copy of every MCP server in the caller's config). Exceeding the
budget does not degrade gracefully — the OS kills runs outright (`interrupted by SIGTERM`). Count
delegations across everything in flight; prefer draining one wave before starting the next. Two more
fan-out facts: a non-login shell may lack `/opt/homebrew/bin` on `PATH` (export it), and every
concurrent run needs its own cwd — `--worktree` guarantees that by construction.

### How to launch several, so each one reports back

| shape | notifications | use when |
| --- | --- | --- |
| one background call per delegation | one each, as each finishes | the usual case |
| subagents, launched in one message | one each | each delegation needs its own reasoning around it |
| the Workflow tool | one per agent | phases, verification, synthesis |
| one background call ending in `wait` | one, when the slowest finishes | the next step needs all of them |

Do **not** background a wrapper script that forks delegations with `&` and exits: the harness tracks
the process it started, the delegations are reparented to init, and nothing ever reports them.

## Worktree lifecycle

`--worktree` owns it end to end: unique name under `<repo>/.claude/worktrees/`, a ledger entry in
`~/.codex-delegate/worktrees/` before the turn (so a crashed run leaves a trace), and removal only when
the turn completed AND the tree is clean — untracked files count as work and block removal. Preserved
trees come back in the report with `worktreePreserved` (why), `worktreeDiffStat`/`worktreeDiffPath`
(the tracked diff, saved beside the answer), `worktreeRemoveCommand` (what to run after harvesting) and
`worktreeFleet` (how many codex worktrees the repo now carries — read it; ignoring the manual version
of this count once left 64 worktrees and 41 GB behind).

Managing a worktree by hand (a custom location, a resumed thread) is still legitimate — but harvest
before removing, and check `git status --porcelain` too: `git diff` does not show untracked files, and
`worktree remove --force` deletes them without complaint.

## Reading the result

The process exit code of `codex` itself is always 0, so the driver derives its own:

| Exit | Meaning |
| --- | --- |
| 0 | turn completed, every declared check passed, and a command really executed — unless `--allow-no-commands` waived exactly that clause |
| 1 | turn did not complete (`failed` / `interrupted`) — the answer is partial |
| 2 | your arguments were rejected — by the driver (nothing ran, no report) or by the server mid-turn (commands may have run; the message carries the server's own wording) |
| 3 | timed out — the case most likely to leave a half-written tree |
| 4 | transport failure — codex missing or crashed, and every sandbox / approval-policy / reviewer assertion. Not a retry: it usually means the rights you asked for were not the rights you got |
| 5 | no command matching the expectation succeeded — the answer is unverified prose. With no expectation declared, the report's `hint` names `--allow-no-commands` for the recall-only case |
| 6 | an escalation was refused — the sandbox was too small; see below |
| 7 | something asked for a human: an MCP form, attestation, user input. No sandbox change fixes it |
| 8 | the turn produced commentary but never a final answer |
| 9 | `--verify` ran and failed: whatever the model said, the work is not there |
| 10 | the cwd is locked by another run, or a resumed thread still has a turn open |
| 11 | a command ran and **failed**, or a file change did. Only a **passing** `--verify` overrules it |
| 12 | `--verify` could not be run at all — fix the verifier, not the work |
| 13 | the answer never matched `--output-schema`, even after the corrective turn — `schemaErrors` says how |

These are ordered, first match wins: **3 → 2 → 1 → 7 → 6 → 12 → 9 → 5 → 8 → 13 → 11**. Every code decided
after the turn can carry executed work — 3 most of all. The codes that mean nothing ran are decided
before the turn: an argument-error 2 (prints no report), 10, the assertion 4s — and a 3 raised before
the turn existed (a stalled config probe or stdin under a short `--timeout`), which also prints no
report.

A command counts as evidence only at `status: completed` with exit code 0; it counts as failed on
status `failed`/`declined` OR a non-zero code. **Even then, a passing gate proves a command succeeded,
not that the right one did** — Codex opens most turns by reading its own skill files, and that
satisfies any generic check. `--expect-command <regex>` catches drift (a turn that never got to the
work); it greps the model's own command strings, so it is worth passing and never worth trusting alone.

**`--verify '<shell>'` is the sound check**: run by the driver in the cwd after the turn, invisible to
the model, a non-zero exit fails the run with code 9 no matter what the answer claimed. It runs
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
the driver's whole process group is confirmed dead — so a next writer does not enter a directory where
the previous run's test servers are still dying. It serialises invocations, not directories: give every
concurrent run its own cwd (`--worktree` does). Internals:
[references/lock-internals.md](references/lock-internals.md).

## Traps

- Misspelled `-c` config keys are swallowed silently, and the offline oracle that catches them is blind
  inside `permissions.<profile>.*`. Validate first: [references/config-drift.md](references/config-drift.md).
- A seat that starts background load must kill it from a `trap 'kill $PIDS' EXIT INT TERM`, not from a
  line at the end — a parent that dies first orphans the load to PID 1.
- **A seat whose method is to make things fail will exit 11** — mutation testing, red-green repro,
  bisection. That is your flag choice, not the seat: pass `--verify` with the end condition you
  actually want; a passing check overrules failed commands by design.
- **Hardening your own tool, phrased as attacking it, is refused** by OpenAI's safety classifier
  (`turnStatus: failed`, `codexErrorInfo: "cyberPolicy"`). Describe the work as what it is —
  robustness under unusual states — and the same seat does the same work.

## Flags

`--cwd <dir>` (required unless `--worktree` or a seat file supplies it) · `--seat-file <file>` (declare
the seat in a file instead of on a command line — for wrappers) ·
`--worktree <repo>` (write level in a managed worktree)
· `--level read|write` (default `read`) · `--prompt <text>`, or pipe it on stdin (better for long ones;
512 KB cap) · `--effort none|minimal|low|medium|high|xhigh|max|ultra` (omit to inherit config) ·
`--model <slug>` (omit to inherit) · `--timeout <sec>` (default 900, max 7200) · `--commit` ·
`--writable <dir>` (repeatable) · `--network` · `--expect-command <regex>` · `--verify '<shell>'` ·
`--allow-no-commands` (waives the command floor, never a declared expectation) ·
`--resume <threadId>` · `--ephemeral` (non-resumable; the receipt story still holds, but prefer the
default) · `--web-search cached|indexed|live` (off by default) · `--answer-json` ·
`--output-schema <file>` (a validated object with one corrective retry; exit 13 on a final mismatch) ·
`--brief` (cap the inline answer at 20 lines / 4 KB; the full text is at `answerPath`) · `--host-home` (the
caller's `~/.codex` instead of the private home) · `--footer` (human footer instead of the default
JSON) · `--help`.

Observability: `threadId` is printed to stderr as soon as the thread exists — tail the live rollout
under `~/.codex/sessions` during a long turn — and the report's `tokenUsage` carries the server's own
accounting for the ROOT thread (Codex's own subagent threads under `ultra` are not included, and
`total` is thread-cumulative: on `--resume` it counts earlier invocations too; read `last` for this
turn alone). Every write-level root — `--cwd`, `--writable`, the git dir `--commit` grants — refuses
`~/.codex` and `~/.codex-delegate` and anything inside them, by inode identity: the first holds the
receipts a seat is verified by, the second this driver's locks and answer log.

`--commit`, `--writable` and `--network` require write level. Unless `--host-home` is given, a run uses
a private `CODEX_HOME` at `~/.codex-delegate/home` — shared by every run — so the caller's plugins,
skills and MCP servers stay out of the turn and no trust records are written back. `auth.json` and
`sessions` are symlinked to the real home, so the rollout receipt lands where `receiptPath` points, and
`model`, `model_reasoning_effort`, `personality`, `service_tier` are carried in by asking the caller's
own codex (`config/read`), not by parsing TOML.

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
