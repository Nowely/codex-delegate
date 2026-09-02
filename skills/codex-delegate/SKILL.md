---
name: codex-delegate
description: >-
  Delegates tasks to Codex as a subagent with per-call rights: read-only analysis or writing and tests
  in a managed git worktree. Use when a panel, refuters, or competing designs need a seat that does not
  share Claude's bias; when fanning out reviewers or adversarial verifiers; after two hypotheses fail;
  when a second independent implementation is wanted; or when the user names Codex, GPT, or "the other
  model" (через codex, через gpt, вторая имплементация, панель ревьюеров). It also governs requested
  mixes ("one of them codex", "half codex", "only codex") and refusals ("no codex", "just you"). Skip
  trivia and mechanical fact-gathering.
metadata:
  version: "0.7.0"
license: MIT
---

# Delegating to Codex

The **user** requests the work; the **coordinator** chooses and synthesises the composition; the
**harness** launches agents. One driver **run** gives one Codex **seat** its declared rights for one
**turn**; `--resume` adds turns to its thread.

## One call

Read (analysis, tests, a review; writes nothing of yours):

    Agent(subagent_type: "codex-seat", prompt: "TASK: …\nCHECK: …\nRETURN: …")

Write, in a worktree the driver manages (the tree starts from HEAD: commit or stash first, or the seat
sees none of your uncommitted work):

    Agent(subagent_type: "codex-seat", prompt: "SEAT: worktree <repo>\nTASK: …\nCHECK: …\nRETURN: …")

That is the whole configuration. The seat runs as long as the work takes, like a native subagent, and is
stopped only by silence (15 minutes), by a command cap, or by you: run
`node "${CLAUDE_SKILL_DIR}/scripts/driver.mjs" --jobs --cwd <dir>` for its `threadId`, then
`--cancel <threadId>`. Its answer comes back verbatim with `exitCode`, `threadId`, and `receiptOk`:
exit 0 means evidence; a non-zero code from a turn that ran is a gate verdict and the answer is still
relayed; the relay's `seat did not run` shape is the exception. After about four hours of waiting the
relay returns `exitCode: 10  turnStatus: running` with the `threadId`; collect it with a second call
whose header is `COLLECT: <threadId>`. Under a plugin install use `codex-delegate:codex-seat`.

## Delegation checklist

1. Announce the composition and attribute every result.
2. Choose the mix the user requested, or the default below.
3. Choose the smallest rights that can complete and verify the task.
4. Launch one driver run per seat, with a concrete `TASK`, `CHECK`, and `RETURN`.
5. Check `exitCode`, `threadId`, the evidence gates, and `receiptOk`; read the answer even on non-zero.
6. Report the attributed answer, not internal receipt fields, unless a failure or audit makes them useful.

## Contents

- [One call](#one-call)
- [Before the first call](#before-the-first-call)
- [Recipes](#recipes)
- [Composition](#composition)
- [Wrapping a seat](#wrapping-a-seat)
- [Rights and effort](#rights-and-effort)
- [Capability parity](#capability-parity)
- [Concurrency and pasted images](#concurrency-and-pasted-images)
- [Worktree lifecycle](#worktree-lifecycle)
- [Reading the result](#reading-the-result)
- [Escalations and locks](#escalations-and-locks)
- [Traps](#traps)
- [Multiple rounds and prompts](#multiple-rounds-and-prompts)

## Before the first call

- Settle Claude Code's permission gate with the user; never add allow-rules for them.
- Require an authenticated `codex` CLI (`codex login status`). Model, effort, personality, and service
  tier inherit config.
- Follow `README.md` for installation and upgrades, or <https://github.com/Nowely/codex-delegate> where
  the `npx skills` route installed neither it nor the suites. Regenerate the pinned schema and run the
  suites after a Codex upgrade.
- Read [why-not-the-plugin.md](references/why-not-the-plugin.md) before choosing another integration.

## Recipes

A resumable thread and JSON report are defaults. `--brief` asks for a short answer and clips the inline
return while preserving the generated answer at `answerPath`:

```bash
node "${CLAUDE_SKILL_DIR}/scripts/driver.mjs" --cwd <repo> --brief \
  --expect-command '<regex of the real work, e.g. vitest|tsc>' \
  --prompt 'TASK:   <what to do>
CHECK:  <the ground truth to verify against>
RETURN: <exactly what to hand back>'
```

Omit `--expect-command` when no command signature is meaningful. Exit 0 still requires some completed,
successful command unless `--allow-no-commands` explicitly waives that floor; it never waives a declared
expectation. A read-only seat whose environment probe is expected to fail — no repository, no toolchain,
a deliberately broken build — passes `--allow-failed-commands` (relay `ALLOW_FAILED_COMMANDS`), which
waives exit 11 and nothing else: an unmatched `--expect-command` is still 5, a failed `--verify` still 9,
and the counts stay in the report.

A write seat uses a detached, driver-managed worktree and is harvested and disposed as described below:

```bash
node "${CLAUDE_SKILL_DIR}/scripts/driver.mjs" --worktree <repo> \
  --verify '<the end state you demand, e.g. test -f done.txt>' --prompt '<task>'
```

For every option and field, run `node "${CLAUDE_SKILL_DIR}/scripts/driver.mjs" --help`; its text is the
canonical flag inventory.

Exit 0 is the only success. Add `--network` only for egress or loopback TCP and settle it with the user
first: write plus network is an exfiltration surface.

## Composition

Apply all four rules:

1. Announce the composition **before** starting any Codex run, naming the count and which seats are Codex.
2. Treat refusal as composition: for “no codex” or “just you”, run zero Codex seats and say the resulting
   panel is all-Claude and shares one model bias.
3. Attribute every finding; if a Codex seat failed or returned nothing, say so and never backfill it with
   a Claude answer.
4. Knowing the answer is not a reason to skip a requested second opinion.

### Choosing the mix

| What the user says | Composition |
| --- | --- |
| “no codex”, “just you” | zero Codex seats |
| nothing | panels, refutation, competing designs: one dissenting Codex seat; mechanical fan-out or one ordinary task: zero |
| “a codex seat”, “one of them codex” | exactly one |
| “half codex” | half the seats, rounded up |
| “mostly codex” | every seat except the coordinator |
| “only codex”, “all codex” | every seat, including a one-agent task |
| “two of five codex” | exactly as stated |

A dissenting seat pays for decorrelation; mechanical fan-out does not. “Only codex” means Codex does the
task while the coordinator orchestrates and checks it.

## Wrapping a seat

- Use a wrapper only for orchestration and keep its relay contract.
- Invoke the relay as `Agent(subagent_type: "codex-seat", prompt: "SEAT: read\nTASK: …")` or
  `agent(prompt, {agentType: "codex-seat"})` in a workflow — bare names after clone-and-symlink;
  `codex-delegate:codex-seat` (and the skill `codex-delegate:codex-delegate`) after plugin install.
- Keep the shipped wrapper's answer verbatim; require `threadId`, `exitCode`, receipt state, and structured failure.
- Pass model, effort, and schema as `MODEL:`, `EFFORT:`, and `OUTPUT_SCHEMA:` headers. Agent-tool options
  act on the relay, not the seat; `BRIEF:` is also header-decided. For image or audio input, leave the
  native route and run `scripts/attach-pasted.mjs` or the driver with `--attach`.
- Tell a hand-rolled wrapper to relay rather than summarise or answer for a failed seat; declare rights through `--seat-file`, bound them with explicit harness flags, and read [environment-and-internals.md](references/environment-and-internals.md#seat-files-and-wrappers).
- Never relay through a small model: it can widen malformed rights and report false success; see [A relay on a small model](references/incidents.md#a-relay-on-a-small-model).

## Rights and effort

| Flag | Codex may | Settle first? |
| --- | --- | --- |
| `--level read` (default) | read any readable path, run commands, write only `$TMPDIR` | no |
| `--worktree <repo>` | write in a managed tree that starts at HEAD; commit or stash WIP first, or use `--level write --cwd` on the live tree; dependency-needing verifiers exit 1 unless installed there | say a worktree is being made |
| `--level write --cwd <dir>` | write under that directory | yes; this chooses the blast radius |
| `--commit` | also write the main clone's git common dir, including config, hooks, and refs | yes; prefer harvesting; read [commit-blast-radius.md](references/commit-blast-radius.md) |
| `--writable <dir>` | write one additional root, repeatable | depends on the directory |
| `--network` | use egress and loopback TCP | yes |

The three modifiers require write level; `--level read --network` is exit 2, while duplicate roots, or
the cwd named again as `--writable`, are harmless: the driver dedupes and subtracts what the server
would.

Read level is deliberately not literal read-only: it grants exactly `$TMPDIR`, so a cwd beneath it is
writable and a Linux `$TMPDIR=/tmp` grants all of `/tmp`. At write level `$TMPDIR` and `/tmp` are also
writable, so leave nothing precious there. The driver asserts the reported sandbox type, roots, network,
active profile, `approvalPolicy: on-request`, and user approvals reviewer; a mismatch exits 4.

Effort and model inherit. Override them only for user choice, reproducibility, or task difficulty;
higher effort increases latency, and `ultra` may use Codex subagent threads. Which level buys what is in
[Effort](references/parity.md#effort).

The driver accepts `none minimal low medium high xhigh max ultra`. When `--model` or `--effort` is
supplied, it reads `model/list` before starting a thread and refuses a value the server catalogue does
not advertise with exit 2.

## Capability parity

The dated comparison is in [parity.md](references/parity.md). Route here, then consult `--help`:

| Need | Codex capability |
| --- | --- |
| read and run | `--cwd <repo>` — node-environment tests work with constraints; see [Read and isolated write](references/parity.md#read-and-isolated-write) |
| isolated writer | `--worktree <repo>` — starts from HEAD without implicit network; see `--help` |
| isolated writer that commits | `--worktree <repo> --commit` — commits survive at `worktreeCommitsRef`; see `--help` |
| MCP tools | `--mcp` — copies representable servers into a private run home; see `--help` |
| web search | `--web-search cached\|indexed\|live` — off unless requested; see `--help` |
| local image or audio | `--attach <file>` — repeatable and command-line only; see `--help` |
| pasted user image | `scripts/attach-pasted.mjs` — decodes transcript images first; see `--help` |
| progress or correction | `--progress` / `--steer-file <file>` — observes or steers without widening rights; see `--help` |
| native review | `--review uncommitted\|branch:<ref>\|commit:<sha>` — no prompt required; `uncommitted` excludes `--worktree`, whose fresh tree starts at HEAD with nothing uncommitted; see `--help` |
| structured answer | `--output-schema <file>` — one corrective turn before exit 13; see `--help` |
| short return | `--brief` — full generated answer remains at `answerPath`; see `--help` |
| fork a shared investigation | `--fork <threadId> [--fork-through <turnId>]` — branches existing context without sharing a live turn; see `--help` |
| compact a continuation | `--resume <threadId> --compact` — compacts before starting the new turn; see `--help` |
| MCP tool subset | `--mcp --mcp-server <name>` — repeatable, command-line-only, and filters MCP servers rather than built-in tools; see `--help` |
| reasoning-summary density | `--reasoning-summary auto\|concise\|detailed` — forwarded to each `turn/start`; see `--help` |
| adversarial review contract | [adversarial-review.md](references/adversarial-review.md) with `schemas/review-output.schema.json` — grounded strict-schema review |
| optional stop-time review | `CODEX_DELEGATE_STOP_GATE=1 node scripts/stop-gate.mjs` — reviews dirty trees and skips clean ones; hook registration remains a user decision |
| a permission prompt | none — refused, recorded, exit 6; see [Escalations](#escalations-and-locks) |

An output schema must be strict: every object rejects additional properties and requires every declared
property; make optional values nullable. A minimal one:

```json
{"type": "object",
 "properties": {"verdict": {"type": "string"}},
 "required": ["verdict"],
 "additionalProperties": false}
```

## Concurrency and pasted images

Each seat uses about 181 MB measured median (471 MB under `--host-home`); count in-flight seats and give
each writer its own cwd. Read seats share a cwd only as far as their tools do: tooling with a daemon,
socket, or pid/state file needs its own cwd or its own `TMPDIR`, and contention surfaces as a native
crash, not a sandbox refusal. Launch shapes: [Fan-out and reporting](references/parity.md#fan-out-and-reporting).

For pasted images run `scripts/attach-pasted.mjs -- <driver flags>`. It selects the latest human turn;
select older turns by UUID from `--list`, never by offset. Read
[pasted-images.md](references/pasted-images.md) for limits, ordering, and downscaling.

## Worktree lifecycle

A `--worktree` seat starts at repository HEAD, so uncommitted, untracked, ignored files, and dependencies
are absent: commit or stash first, or use `--level write --cwd` on the live tree; a dependency-needing
verifier exits 1 there (driver exit 9) unless dependencies are installed in the seat's tree.

| Outcome | Driver action |
| --- | --- |
| completed and harvest succeeds | save `worktreeDiffPath`, `worktreeUntrackedPath`, and any commits at `worktreeCommitsRef`; count discarded ignored files; remove the tree |
| turn never starts and the tree is clean | remove the tree |
| turn incomplete after work, or tree dirty | preserve it with `worktreePreserved`, `worktreeRemoveCommand`, and fleet count |
| harvest fails | preserve it and report why |

The diff includes staged, unstaged, and committed work against the start; the archive holds non-ignored
untracked files. For a hand-managed tree, inspect `git status --porcelain` before removal. A finished
worktree seat is continued with `--worktree <repo> --resume <threadId>`, which rebuilds the tree at
`worktreeBase`, reapplies `worktreeDiffPath` and `worktreeUntrackedPath`, and reports `worktreeRestored`.
Content is restored, not history: the patch is taken against the base and already carries what the seat
committed, so its commits stay at `worktreeCommitsRef` rather than being replayed. Ledger and destination
details live in
[environment-and-internals.md](references/environment-and-internals.md#worktree-ledger-and-destination).

## Reading the result

The Codex process status does not describe task success; the driver derives this ordered contract:

| Exit | Meaning |
| --- | --- |
| 0 | turn completed, all declared gates passed, and a command completed successfully unless waived |
| 1 | turn failed/interrupted; partial answer; one bounded retry only for a transient provider failure with no observable output, never a usage-limit window; `transientRetries` records it |
| 2 | driver arguments or a server request were rejected; only the latter can have a report/work |
| 3 | cut on a budget: idle silence, commands, tokens, or a wall clock you set; holds the work so far |
| 4 | transport or sandbox/approval/reviewer assertion failure; not a retry: it usually means the rights you asked for were not the rights you got |
| 5 | no successful command matched the expectation, or no command met the floor |
| 6 | escalation refused and recorded |
| 7 | MCP form, attestation, or other human input requested; no sandbox change fixes it |
| 8 | no final answer |
| 9 | `--verify` ran and failed |
| 10 | cwd locked, resumed thread still busy, or a detached run is still going |
| 11 | command or file change failed, except an exit-1 plain negative probe; a passing verifier/review overrides it, and `--allow-failed-commands` waives the rung outright |
| 12 | verifier could not run, timed out, or lacked enough remaining budget; fix the verifier, not the work |
| 13 | answer missed `--output-schema` after one correction |

After-turn precedence is **3 → 2 → 1 → 7 → 6 → 12 → 9 → 5 → 8 → 13 → 11**; exit 4 and 10 happen
outside that ladder. Codes decided after the turn can carry executed work and an answer; pre-turn
argument 2, lock 10, assertion 4, or pre-thread timeout 3 prints no report.

A command is successful evidence only when completed with exit 0. `--expect-command` matches the model's
parsed command or commands and the raw wrapper string; it catches drift but can be fooled by generic
startup reads or pipeline-last status. Pin the outcome with `--verify` and read
[result-gates.md](references/result-gates.md).

`--verify '<shell>'` runs after a completed turn, outside the sandbox, in the seat's tree (the worktree
under `--worktree`), never as model input — with your rights, environment, and network in a tree the seat
has just written, so `npm test`, `make check`, and `pytest` all execute code from that tree. Prefer a
verifier that only inspects the end state, or add `--verify-sandboxed` to run it through `codex sandbox`
under the same read-only profile `--level read` uses: the tree is readable, `$TMPDIR` is writable, and a
verifier that must write fails. It is not secret — it sits in the driver's argv. It runs whenever the
turn completed, even when other gates missed, and is skipped only after a cut, a failed turn, or an
exhausted budget (`verifySkipped` says which); it cannot rescue an incomplete turn, waive
`--expect-command`, or come from a seat file without command-line `--allow-seat-verify`. `SIGINT`,
`SIGTERM`, or `SIGHUP` kills its whole process group and the run still reports with the check unmeasured;
`SIGKILL` of the driver itself can still orphan that group.

    --verify 'test -f done.txt && grep -q PROOF done.txt'
    --verify 'pnpm -w exec vitest run --project docs'
    --verify 'git diff --quiet && exit 1 || exit 0'   # demand that something changed

## Escalations and locks

Under `on-request`, Codex asks only when instructed not to give up after a denial. Treat that prompt as
proof the chosen sandbox is too small: the driver refuses it, records it, and exits 6 unless a
higher-priority failure wins, and the work is then very likely incomplete. Widen only the declared rights
(`--writable`, `--network`, write level); subagent-thread escalations count too, while success evidence
remains root-thread-only.

Write level takes an exclusive cwd-identity lock; another writer or a still-running resumed turn exits
10, and that message names the lock file to delete if the holder is really gone. Give concurrent writers
distinct cwd values; read [lock-internals.md](references/lock-internals.md) before reclaiming a stale one.

Only `~/.codex`, `~/.codex-delegate`, and the resolved state directory are protected roots; choose other
write roots deliberately. Internals live in
[environment-and-internals.md](references/environment-and-internals.md).

Use `--brief` and `--allow-no-commands` directly; every budget and every way to collect or stop a seat
lives in [Bounding or stopping a seat](references/environment-and-internals.md#bounding-or-stopping-a-seat).

## Traps

- Validate new config keys as described in [Config drift](references/config-drift.md); a misspelling can
  be silently accepted, especially inside a permission profile.
- Kill background load from an armed trap with recorded pids, including in the coordinator's shell;
  trailing cleanup and `jobs -p` can orphan it to PID 1 ([Orphaned load](references/incidents.md#orphaned-load)).
- Give intentional failure work a verifier for the desired end state; otherwise red-green, mutation, and
  bisection seats exit 11 despite succeeding ([Red-green seats](references/incidents.md#red-green-seats)).
- Read `commandsPipedToPager` before believing a conclusion: a command ending in `| head`, `tail`, or
  `less` showed the seat only that slice of its own evidence, and the pipeline's exit code is the pager's.
- Read every returned answer even when the exit is non-zero; discarding it can lose receipt-verified
  findings ([A non-zero exit discarded](references/incidents.md#a-non-zero-exit-discarded)).
- Describe defensive work as robustness under unusual states; attack phrasing can trigger either
  provider's safety classifier and end or downgrade the session ([Safety classifier](references/incidents.md#safety-classifier)).

## Multiple rounds and prompts

Resume a thread with rights declared again on the new run:

```bash
node "${CLAUDE_SKILL_DIR}/scripts/driver.mjs" --cwd <repo> \
  --resume <threadId> --prompt '<follow-up>'
```

A recall-only follow-up needs `--allow-no-commands`; `--resume last` selects the newest recorded run for
that cwd — or, with `--worktree`, for that repository — and the report names the thread actually
continued as `resumedFrom`, which is what to check when you passed `last`. `--worktree <repo> --resume
<threadId>` rebuilds the tree as above, and without a job record holding that base commit it refuses
rather than hand the seat a fresh tree at HEAD. Standing unattended-operation, local-shell, web-search,
blocked-command, and test-count rules already exist on the thread; do not repeat them.
Prompt only:

    TASK:    what to do
    CHECK:   the ground truth, ideally something unguessable
    RETURN:  exactly what to hand back

Give one deliverable per seat. If `RETURN` lists more than two artifacts, split it into two seats.
`--brief` and `BUDGET_TOKENS` are budget controls, not only context controls.

Express rights with flags, not prose. Judge the answer by command evidence and the receipt, not by its
confidence; read [incidents.md](references/incidents.md) when a rule's consequence matters.
