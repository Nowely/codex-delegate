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

The **user** requests the work; the **coordinator** chooses and synthesises the composition; one Codex
**seat** performs one deliverable under rights declared in its prompt.

## One call

For a read seat, send the task with no header:

    Agent(subagent_type: "codex-seat", prompt: "TASK: …\nCHECK: …\nRETURN: …")

For an isolated writer, add one rights line (the tree starts from HEAD: commit or stash first, or
the seat sees none of your uncommitted work):

    Agent(subagent_type: "codex-seat", prompt: "SEAT: worktree <repo>\nTASK: …\nCHECK: …\nRETURN: …")

Under a plugin install use `codex-delegate:codex-seat`. The relay writes this prompt verbatim to one
file, runs `driver.mjs --relay <file>`, and returns the driver's envelope verbatim. A header-less prompt
is a read seat in the current directory; the relay adds nothing. The driver launches and waits; if one
wait expires, the envelope supplies the complete `collect:` command and the relay repeats it. Only after
24 repeats, about four hours, can the call return `exitCode: 10` while the seat is still running. The
relay's only own failure shape is `exitCode: null`, for a driver it could not start or a killed tool call.

## Composition

Apply all five rules:

1. Announce the composition **before** starting any Codex run, naming the count and which seats are Codex.
2. Treat refusal as composition: for “no codex” or “just you”, run zero Codex seats and say the resulting
   panel is all-Claude and shares one model bias.
3. Attribute every finding; if a Codex seat failed or returned nothing, say so and never backfill it with
   a Claude answer.
4. Knowing the answer is not a reason to skip a requested second opinion.
5. Never add allow-rules on the user's behalf.

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

## Rights

Choose the smallest `SEAT` that can complete and check the work:

| Prompt header | Codex may | Settle first? |
| --- | --- | --- |
| `SEAT: read [<dir>]` or no header | read any readable path, run commands, write only `$TMPDIR` | no |
| `SEAT: worktree <repo>` | write in a driver-managed detached tree | say that a worktree will be made |
| `SEAT: write <dir>` | write under the live directory | yes; this chooses the blast radius |

`NETWORK: yes`, each `WRITABLE: <dir>`, and `COMMIT: yes` widen a write seat. Settle every one with the
user before adding it. Never translate a refusal into broader rights. Use the complete, canonical header
table in [agents/codex-seat.md](../../agents/codex-seat.md); model, effort, gates, review, continuation,
and answer-shape choices belong in that header, not in Agent-tool options. Never pass the Agent tool's
model option either: it moves the relay off its pinned model, and a relay on a small model widens
malformed rights and reports false success
([A relay on a small model](references/incidents.md#a-relay-on-a-small-model)).

Read seats may share one cwd, but a repository whose tooling keeps a daemon, a socket, or a pid/state
file needs a distinct cwd or its own `TMPDIR` per concurrent seat; the failure is a native crash, not a
sandbox refusal.

## Worktree lifecycle

- A worktree seat starts from repository `HEAD`, not the live working tree.
- Commit or stash relevant work first; staged, unstaged, untracked, ignored, and installed files are absent.
- A completed turn harvests tracked work to `worktreeDiffPath`.
- It archives non-ignored untracked files at `worktreeUntrackedPath` and commits at `worktreeCommitsRef`.
- After a successful harvest the driver removes the worktree.
- When the turn failed or harvest failed, the driver preserves it and reports `worktreePreserved`.

## Reading the result

- `exitCode: 0` means the completed turn passed its declared evidence gates.
- `exitCode: 3` is a cut; read the retained answer or partial and the `RESUME:` hint.
- `exitCode: 10` with a `collect:` line: still running, run that command; `10` without one: a held lock
  or a busy resumed thread, read the stderr block.
- Exit 4 and a pre-turn exit 2, 3 or 10 print no report; read the envelope's stderr block.
- Any other non-zero is a gate verdict on the run; read the answer before deciding what to do.
- `receiptOk: false` on a run that claims success is a red flag; what the receipt proves and does not
  prove is in
  [environment-and-internals.md](references/environment-and-internals.md#receipt-validation-and-reporting).
- Evidence of success is root-thread-only: a Codex subagent thread's commands are liveness, not evidence.
- To stop a seat, run `node "${CLAUDE_SKILL_DIR}/scripts/driver.mjs" --jobs --cwd <dir>` for its
  `threadId`, then `node "${CLAUDE_SKILL_DIR}/scripts/driver.mjs" --cancel <threadId>`.

## Prompt shape

Write a concrete, checkable body:

    TASK:   what to do
    CHECK:  the ground truth, preferably something the seat cannot guess
    RETURN: exactly what to hand back

Give one deliverable per seat. Split a return that asks for unrelated artifacts or decisions.

The standing rules are already on the thread — unattended, local shell only, no web search unless
granted, `COMMAND_BLOCKED` for a step that cannot run, never claim a test passed without the count — so
do not repeat them. A follow-up continues a thread with `RESUME: <threadId>`; a recall-only one runs no
commands, so it also needs `ALLOW_NO_COMMANDS: yes` (`--allow-no-commands` on a command line).

## Traps

- Phrase defensive work as robustness under unusual states; attack wording can trip a safety classifier.
- Read a non-zero result's answer; the exit judges evidence, not whether the answer exists.
- Treat `commandsPipedToPager` as sliced evidence: `head`, `tail`, and `less` can hide a failure and supply
  the pipeline status.
- Arm cleanup before background load and record each pid as it starts; trailing cleanup can orphan load.

## References

- `node "${CLAUDE_SKILL_DIR}/scripts/driver.mjs" --help` is the canonical inventory of every flag.
- Flags, fields, relay transport, bounds, environment, receipts, and worktree internals:
  [environment-and-internals.md](references/environment-and-internals.md).
- Evidence gates and verifier semantics: [result-gates.md](references/result-gates.md).
- Capability and concurrency parity: [parity.md](references/parity.md).
- The measured failures behind the rules: [incidents.md](references/incidents.md).
- Commit blast radius: [commit-blast-radius.md](references/commit-blast-radius.md).
- Locks: [lock-internals.md](references/lock-internals.md).
- Config drift: [config-drift.md](references/config-drift.md).
- Pasted images: [pasted-images.md](references/pasted-images.md).
- Browser tests: [browser-tests.md](references/browser-tests.md).
- Adversarial review: [adversarial-review.md](references/adversarial-review.md).
- Integration alternatives: [why-not-the-plugin.md](references/why-not-the-plugin.md).
- Installation and upgrades: [README.md](../../README.md).
