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
  version: "0.11.0"
license: MIT
---

# Delegating to Codex

The **user** requests the work; the **coordinator** chooses and synthesises the composition; one Codex
**seat** performs one deliverable under rights declared in its prompt.

## One call

One background Bash task per seat. Write the prompt to a file with the Write tool, then run this, with
`run_in_background: true` and no `&` of your own:

    CODEX_DELEGATE_STATE_DIR="${CLAUDE_PLUGIN_DATA}" node "${CLAUDE_SKILL_DIR}/scripts/driver.mjs" --seat-file "<DIR>/prompt.txt" --report-file "<DIR>/report.json" > "<DIR>/out.json" 2> "<DIR>/err.txt"

The call's `description` is `Codex seat <id>, <model>: <task in a few words>`, so the row the user sees names the
seat and not the command line. `<DIR>` is one `mktemp -d "${TMPDIR:-/tmp}/codex-seat.XXXXXXXX"` per seat: Write and Read expand nothing,
so they need the absolute path it prints. The task's exit notification is the seat's completion, and
`<DIR>/report.json` is what to read then.

Every driver call carries that variable — the plugin's own data directory, where the driver's state and
every Codex artifact the report names (`answerPath`, a worktree harvest) live; without it the driver
exits 2. Only `--help` needs none. A clone-and-symlink install substitutes nothing for the placeholder,
so there the user exports `CODEX_DELEGATE_STATE_DIR` themselves ([README](../../README.md) says where).

A read seat's prompt needs no header at all:

    TASK: …
    CHECK: …
    RETURN: …

For an isolated writer, one rights line above it (cut at `HEAD`, see
[Worktree lifecycle](#worktree-lifecycle)):

    SEAT: worktree <repo>

Write a prompt you were handed VERBATIM: not a quote, not a `$`, not a header line it has, and add
nothing. A prompt with no `SEAT:` line is a read seat in the current directory; the driver decides that,
not you. Never create a directory, change a level or re-run with different flags to make a refused seat
succeed: measured, a wrapper that created the missing directory ran Codex with rights nobody granted.

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
| `SEAT: read [<dir>]` or no header | read any readable path, run commands, write only `$TMPDIR`; a write elsewhere or a browser launch asks an approval nobody is there to give, and the run exits 6 | no |
| `SEAT: worktree <repo>` | write in a driver-managed detached tree | say that a worktree will be made |
| `SEAT: write <dir>` | write under the live directory | yes; this chooses the blast radius |

`NETWORK: yes` and each `WRITABLE: <dir>` widen a write seat. Settle every one with the
user before adding it. Never translate a refusal into broader rights. Every field is in
[Header fields](#header-fields) below; model, effort, gates, continuation and answer-shape choices
belong in that header, and the seat's rights in its `SEAT:` line, which is why the prompt is copied
into the file rather than rewritten: measured, a wrapper that rewrote one widened malformed rights and
reported false success
([A relay on a small model](references/incidents.md#a-relay-on-a-small-model)).

Read seats may share one cwd, but a repository whose tooling keeps a daemon, a socket, or a pid/state
file needs a distinct cwd or its own `TMPDIR` per concurrent seat; the failure is a native crash, not a
sandbox refusal.

## Header fields

The header is the leading run of upper-case `NAME: value` lines at column 0; the body starts at `TASK:` or
at the first line that is not one; a non-field upper-case `NAME:` above it is exit 2 naming it.

| Field (`VERIFY` is refused in a seat file without `--allow-seat-verify`) | Value (booleans: `yes`, `true` or `1`; no line means off) | A coordinator sets it when |
| --- | --- | --- |
| `SEAT:` | `read [<dir>]`, `worktree <repo>`, `write <dir>` | first, or not at all: no header is a read seat in the current directory |
| `NETWORK:` | `yes` | the seat cannot finish without egress; write levels only, and settle it with the user first |
| `WRITABLE:` | `<dir>`, repeatable | a write seat needs one more root than the directory it was given |
| `RESUME:` | `<threadId>`, `last` | this seat continues an earlier thread instead of opening one |
| `EXPECT:` | `<regex>` | the answer is only evidence if a command matching it ran |
| `OUTPUT_SCHEMA:` | `<path to a strict JSON Schema file>` | the answer must parse as one JSON object |
| `MODEL:` | `<slug>` | this seat needs a model other than the configured default |
| `EFFORT:` | `none`, `minimal`, `low`, `medium`, `high`, `xhigh`, `max`, `ultra` | the task is worth more or less thinking |
| `WEB_SEARCH:` | `cached`, `indexed`, `live` | the seat needs sources it cannot read locally |
| `BRIEF:` | `yes` | a short answer is enough; omit it beside an output schema — it clips only the inline `answer` (`answerJson` is parsed from the whole one) yet still asks the model for 20 lines |
| `ALLOW_NO_COMMANDS:` | `yes` | the seat is recall-only and will run nothing |

## Worktree lifecycle

- A worktree seat starts from repository `HEAD`, not the live working tree.
- Commit or stash relevant work first; staged, unstaged, untracked, ignored, and installed files are absent.
- A completed turn harvests tracked work to `worktreeDiffPath`.
- It archives non-ignored untracked files at `worktreeUntrackedPath`; `worktreeCommitsRef` is populated
  only where the caller's own `--verify` committed — a seat cannot commit without `WRITABLE: <repo>/.git`,
  a widening to settle first.
- After a successful harvest the driver removes the worktree.
- When the turn failed or harvest failed, the driver preserves it and reports `worktreePreserved`.

## Reading the result

- `<DIR>/report.json` is the report, the same JSON the run also wrote to `<DIR>/out.json`. Read the file:
  it is written whole or not at all, and a missing one means unknown, never success.
- `exitCode: 0` means the completed turn passed its declared evidence gates. `answer` is the seat's text;
  with an `OUTPUT_SCHEMA:` line, `answerJson` is that answer already parsed.
- `exitCode: 3` is a cut; read the retained answer or partial and the `RESUME:` hint.
- `exitCode: 10` is a held lock or a busy resumed thread: the report says `ok: false` and carries the
  refusal in `error`, and `<DIR>/err.txt` has it in full.
- Exit 2 is always a refusal before the turn: `ok: false`, `turnStatus: null`, the reason in `error`,
  no receipt.
- Exit 4 has two shapes. With `turnStatus: null` it is a refusal or an abort (a sandbox assertion, a
  signal before the thread, a transport failure): read `error` and `<DIR>/err.txt`; a `threadId` beside
  it means the thread had started and its rollout is the only record. With any other `turnStatus` — the
  server died mid-turn, or the report could not be published — the report is complete: read it like any
  post-turn code (commands, `answer`, `answerPath`, receipt).
- Any other non-zero is a gate verdict on the run; read the answer before deciding what to do.
- `receiptOk: false` on a run that claims success is a red flag; what the receipt proves and does not
  prove is in
  [environment-and-internals.md](references/environment-and-internals.md#receipt-validation-and-reporting).
- Evidence of success is root-thread-only: a Codex subagent thread's commands are liveness, not evidence.
- To stop a seat, stop its Bash task, or send `SIGTERM` to the pid on the first line of `<DIR>/err.txt`:
  the driver interrupts the turn, writes the report it had earned and sweeps the codex process group.

## Prompt shape

Write a concrete, checkable body:

    TASK:   what to do
    CHECK:  the ground truth, preferably something the seat cannot guess
    RETURN: exactly what to hand back

Give one deliverable per seat. Split a return that asks for unrelated artifacts or decisions. Whatever `RETURN:`
asks for, its first line is one sentence a human can read on its own, the seat, its model, its status and what it
did, because that line is what the user is told; the rest is the return's own shape.

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

- `node "${CLAUDE_SKILL_DIR}/scripts/driver.mjs" --help` is the canonical inventory of the flags a coordinator sets; `--help-all` adds the rarely needed ones, the `CODEX_DELEGATE_*` variables and the internals.
- Flags, fields, delivery, bounds, environment, receipts, and worktree internals:
  [environment-and-internals.md](references/environment-and-internals.md).
- Evidence gates and verifier semantics: [result-gates.md](references/result-gates.md).
- Capability and concurrency parity: [parity.md](references/parity.md).
- The measured failures behind the rules: [incidents.md](references/incidents.md).
- Commit blast radius: [environment-and-internals.md](references/environment-and-internals.md#git-directory-grant).
- Locks: [environment-and-internals.md](references/environment-and-internals.md#lock-design).
- Config drift: [environment-and-internals.md](references/environment-and-internals.md#configuration-key-oracle).
- Pasted images: [parity.md](references/parity.md#pasted-media-handling).
- Browser tests: [parity.md](references/parity.md#browser-mode-sandbox).
- Adversarial review: [adversarial-review.md](references/adversarial-review.md).
- Integration alternatives: [why-not-the-plugin.md](references/why-not-the-plugin.md).
- Installation and upgrades: [README.md](../../README.md).
