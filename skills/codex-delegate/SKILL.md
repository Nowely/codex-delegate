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
  version: "0.6.0"
license: MIT
---

# Delegating to Codex

The **user** is the human requesting the work; the **coordinator** is the Claude instance choosing the
composition and synthesising it; the **harness** is the surrounding Claude Code tooling that launches
and reports agents. One driver **run** (a **delegation**) gives one Codex **seat** its declared rights
for one **turn**, a prompt→answer exchange; `--resume` adds turns to the thread across runs.

## Delegation checklist

1. Announce the composition and attribute every result.
2. Choose the mix the user requested, or the default below.
3. Choose the smallest rights that can complete and verify the task.
4. Launch one driver run per seat, with a concrete `TASK`, `CHECK`, and `RETURN`.
5. Check `exitCode`, `threadId`, the evidence gates, and `receiptOk`; read the answer even on non-zero.
6. Report the attributed answer, not internal receipt fields, unless a failure or audit makes them useful.

## Contents

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

- These commands are not pre-approved in `~/.claude/settings.json`; settle Claude Code's permission
  gate with the user before a long delegation, and never add allow-rules on their behalf.
- Require an installed, authenticated `codex` CLI (`codex login status`). Model, effort, personality,
  and service tier inherit `~/.codex/config.toml` unless a call overrides them.
- Read installation and upgrade prerequisites in `README.md`; when it is not installed, use
  <https://github.com/Nowely/codex-delegate> as the README/evals fallback. After any Codex upgrade,
  regenerate the pinned schema and run the suites before trusting the experimental app-server protocol.
- The official `openai-codex` plugin, exec-based skills, SDK, and `codex mcp-server` are not substitutes
  where rights and evidence matter; read
  [why-not-the-plugin.md](references/why-not-the-plugin.md) when choosing an integration surface.

## Recipes

A read seat is the common case. A resumable thread and JSON report are defaults; `--brief` caps the
inline return while preserving the full generated answer at `answerPath`. Under `--brief` the model is
also asked to answer short — skip it when you need the full working note; without it an unbounded seat
hands its whole working note into your context:

```bash
node "${CLAUDE_SKILL_DIR}/scripts/driver.mjs" --cwd <repo> --brief \
  --expect-command '<regex of the real work, e.g. vitest|tsc>' \
  --prompt 'TASK:   <what to do>
CHECK:  <the ground truth to verify against>
RETURN: <exactly what to hand back>'
```

Omit `--expect-command` when no command signature is meaningful. Exit 0 still requires some completed,
successful command unless `--allow-no-commands` explicitly waives that floor; it never waives a declared
expectation.

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

- Run directly with one background driver invocation per seat when no wrapper reasoning is needed.
- Use a wrapper only for orchestration and keep its relay contract. A header `TIMEOUT` above 560 is
  refused by the relay as a bad header, not passed through: past the cap the Bash tool backgrounds the
  driver instead of killing it, so the relay never sees an exit code — run the driver directly for
  longer seats.
- Invoke the relay as `Agent(subagent_type: "codex-seat", prompt: "SEAT: read\nTASK: …")` or
  `agent(prompt, {agentType: "codex-seat"})` in a workflow — bare names after clone-and-symlink;
  `codex-delegate:codex-seat` (and the skill `codex-delegate:codex-delegate`) after plugin install.
- Keep the shipped wrapper's answer verbatim; require `threadId`, `exitCode`, receipt state, and structured failure.
- Pass the seat's model, effort and schema as `MODEL:`, `EFFORT:` and `OUTPUT_SCHEMA:` header lines: the
  Agent tool's own model/effort/schema options act on the RELAY — they reshape its return and can
  replace the sonnet the relay eval pinned — not on the seat. `BRIEF:` is header-decided too; the relay
  does not add it. No header field attaches an image or audio file, so a seat that must see one leaves
  the native route and runs `scripts/attach-pasted.mjs` or the driver with `--attach`.
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

Effort and model inherit by default. Pass `--model` only when the user names one or reproducibility needs
it; increasing `--effort` increases latency.

| Effort | Use |
| --- | --- |
| omit | default |
| `low` | fact lookup, call sites, recall-only follow-up |
| `medium` | ordinary review or summary |
| `high` / `xhigh` | refutation, competing designs, second implementation |
| `max` / `ultra` | hardest work; `ultra` may use Codex subagent threads |

The driver accepts a permissive union (`none minimal low medium high xhigh max ultra`); the server may
still reject a level with exit 2 and its own list. `codex debug models` shows the current catalogue.

## Capability parity

The detailed, dated comparison and operating qualifications live in
[parity.md](references/parity.md). Use this routing table, then consult `--help`:

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
| native review | `--review uncommitted\|branch:<ref>\|commit:<sha>` — no prompt required; see `--help` |
| structured answer | `--output-schema <file>` — one corrective turn before exit 13; see `--help` |
| short return | `--brief` — full generated answer remains at `answerPath`; see `--help` |
| a permission prompt | none — refused, recorded, exit 6; see [Escalations](#escalations-and-locks) |

An output schema must be strict: every object rejects additional properties and requires every declared
property; make optional values nullable. A minimal six-line schema is:

```json
{
  "type": "object",
  "properties": {"verdict": {"type": "string"}},
  "required": ["verdict"],
  "additionalProperties": false
}
```

## Concurrency and pasted images

Each delegation starts an app-server and uses about 181 MB measured median (about 471 MB under
`--host-home`); `--mcp` also starts copied servers. Count all in-flight delegations, drain waves before
starting more, and give every concurrent writer its own cwd; excess memory is killed by the OS rather
than throttled. Read seats take no lock and may share a cwd.

Do not background a script that forks delegations with `&` and exits: the harness follows only its
parent and receives no result. Separate background calls notify separately; a final `wait` deliberately
reports only after the slowest child; the launch-shape table is in
[Fan-out and reporting](references/parity.md#fan-out-and-reporting).

For pasted images, use:

```bash
# the bare -- ends attach-pasted's own selector flags; everything after it goes to the driver
node "${CLAUDE_SKILL_DIR}/scripts/attach-pasted.mjs" -- \
  --cwd <repo> --brief --allow-no-commands \
  --prompt 'TASK: … CHECK: … RETURN: …'
```

It selects every image from the latest human turn in paste order; if that turn has none, it refuses with
exit 2 and names `--list` instead of reaching backward. Select older turns by UUID from `--list`, never
by an unstable offset; read
[pasted-images.md](references/pasted-images.md) for limits, storage, ordering, and downscaling.

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

The diff is against the starting commit and includes staged, unstaged, and committed work; the archive
contains non-ignored untracked files, while ignored artifacts are dropped. For a hand-managed worktree,
harvest before removal and inspect `git status --porcelain`, because `git diff` omits untracked files.
Ledger and destination details live in
[environment-and-internals.md](references/environment-and-internals.md#worktree-ledger-and-destination).

## Reading the result

The Codex process status does not describe task success; the driver derives this ordered contract:

| Exit | Meaning |
| --- | --- |
| 0 | turn completed, all declared gates passed, and a command completed successfully unless waived |
| 1 | turn failed/interrupted; partial answer; one bounded retry only for a transient provider failure with no observable output, never a usage-limit window; `transientRetries` records it |
| 2 | driver arguments or a server request were rejected; only the latter can have a report/work |
| 3 | timeout; may contain partial work |
| 4 | transport or sandbox/approval/reviewer assertion failure; not a retry: it usually means the rights you asked for were not the rights you got |
| 5 | no successful command matched the expectation, or no command met the floor |
| 6 | escalation refused and recorded |
| 7 | MCP form, attestation, or other human input requested; no sandbox change fixes it |
| 8 | no final answer |
| 9 | `--verify` ran and failed |
| 10 | cwd locked or resumed thread still busy |
| 11 | command or file change failed, except an exit-1 plain negative probe; a passing verifier/review overrides it |
| 12 | verifier could not run, timed out, overflowed, or lacked enough remaining budget; fix the verifier, not the work |
| 13 | answer missed `--output-schema` after one correction |

After-turn precedence is **3 → 2 → 1 → 7 → 6 → 12 → 9 → 5 → 8 → 13 → 11**; exit 4 and 10 happen
outside that ladder. Codes decided after the turn can carry executed work and an answer; pre-turn
argument 2, lock 10, assertion 4, or pre-thread timeout 3 prints no report.

Cancellation after a thread exists sends `turn/interrupt`, waits out the child group, returns a full
interrupted report with exit 1, and leaves the thread resumable; before the thread exists it exits 4.
A second signal escalates teardown to `SIGKILL`; killing the driver itself with `SIGKILL` can strand
descendants and a stale lock.

A command is successful evidence only when completed with exit 0. `--expect-command` matches the model's
command strings and catches drift but can be fooled by generic startup reads or pipeline-last status;
pin the outcome with `--verify` and read [result-gates.md](references/result-gates.md).

`--verify '<shell>'` runs after a completed turn with the coordinator's rights, outside the sandbox, in
the seat's tree (the worktree under `--worktree`), never as model input. It is not secret—the command is
in the driver's argv and may be visible through process inspection. It runs whenever the turn completed,
even when other gates missed, and is skipped only for a timeout, a failed turn or an exhausted budget;
`verifySkipped` says which. It has at most 300 seconds of the remaining timeout; a seat file may not
supply it without command-line `--allow-seat-verify`; it cannot rescue an incomplete turn or waive
`--expect-command`.

    --verify 'test -f done.txt && grep -q PROOF done.txt'
    --verify 'pnpm -w exec vitest run --project docs'
    --verify 'git diff --quiet && exit 1 || exit 0'   # demand that something changed

## Escalations and locks

Under `on-request`, Codex asks only when instructed not to give up after a denial. Treat that prompt as
proof the chosen sandbox is too small: the driver refuses it, records it, and exits 6 unless a
higher-priority failure wins; a refused escalation means the work is very likely incomplete. Widen only
the declared rights (`--writable`, `--network`, or write level); subagent-thread escalations count too,
while success evidence remains root-thread-only.

Write level takes an exclusive cwd-identity lock; another writer or a still-running resumed turn exits
10, and that message names the lock file to delete if the holder is really gone. Give concurrent writers
distinct cwd values and read
[lock-internals.md](references/lock-internals.md) before reclaiming a stale lock.

Only `~/.codex`, `~/.codex-delegate`, and the resolved state directory are protected roots; the rest of
the home, including `~/.ssh`, is grantable, so choose write roots deliberately. Environment, isolated
home, answer-log, seat-file, and receipt rules live in
[environment-and-internals.md](references/environment-and-internals.md).

Common controls are `--timeout <sec>` (default 900, maximum 7200), `--brief`, and
`--allow-no-commands`; use the canonical `--help` for every other flag.

## Traps

- Validate new config keys as described in [Config drift](references/config-drift.md); a misspelling can
  be silently accepted, especially inside a permission profile.
- Kill background load from an armed trap with recorded pids, including in the coordinator's shell;
  trailing cleanup and `jobs -p` can orphan it to PID 1 ([Orphaned load](references/incidents.md#orphaned-load)).
- Give intentional failure work a verifier for the desired end state; otherwise red-green, mutation, and
  bisection seats exit 11 despite succeeding ([Red-green seats](references/incidents.md#red-green-seats)).
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
that cwd. Standing unattended-operation, local-shell,
web-search, blocked-command, and test-count rules already exist on the thread; do not repeat them.
Prompt only:

    TASK:    what to do
    CHECK:   the ground truth, ideally something unguessable
    RETURN:  exactly what to hand back

Express rights with flags, not prose. Judge the answer by command evidence and the receipt, not by its
confidence; read [incidents.md](references/incidents.md) when a rule's consequence matters.
