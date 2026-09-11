---
name: seat
description: >-
  Delegates tasks to Codex as a subagent with per-call rights: analysis that writes nothing of yours, or
  writing and tests in a managed git worktree, each reaching the network unless the call denies it. Use
  when a panel, refuters, or competing designs need a seat that does not share Claude's bias;
  when fanning out reviewers or adversarial verifiers; after two hypotheses fail;
  when a second independent implementation is wanted; or when the user names Codex, GPT, or "the other
  model" (через codex, через gpt, вторая имплементация, панель ревьюеров). It also governs requested
  mixes ("one of them codex", "half codex", "only codex") and refusals ("no codex", "just you"). Skip
  trivia and mechanical fact-gathering.
metadata:
  version: "0.13.0"
license: MIT
---

# Delegating to Codex

The **user** requests the work; the **coordinator** chooses and synthesises the composition; one Codex
**seat** performs one deliverable under rights declared in its prompt.

## One call

One background Bash task per seat. Write the prompt to a file with the Write tool, then run this, with
`run_in_background: true` and no `&` of your own:

    CLAUDE_PLUGIN_DATA="${CLAUDE_PLUGIN_DATA}" node "${CLAUDE_SKILL_DIR}/scripts/driver.mjs" --seat-file "<DIR>/prompt.txt" --report-file "<REPORT>" > "<DIR>/out.json" 2> "<DIR>/err.txt"

The call's `description` is `Codex <model> <id>: <task in a few words>`, so the row the user sees names the
agent by its model and not the command line. `<DIR>` is one `mktemp -d "${TMPDIR:-/tmp}/codex-seat.XXXXXXXX"` per seat: Write and Read expand nothing,
so they need the absolute path it prints. `<REPORT>` is an absolute path of this seat's own and never under `<DIR>`:
`<DIR>` sits in `$TMPDIR`, the one root a read seat may write, and a file the seat leaves at that name blocks publication
and then sits where you would read it as the seat's own report. Put it under the driver's state directory,
`<state>/reports/<run>/report.json` with `<run>` unique; the driver makes every directory that path needs, at 0700,
so it may name a root your own Write and `mkdir` are refused.
The task's exit notification is the seat's completion, and `<REPORT>` is what to read then.

Every driver call forwards that variable under its own name — the plugin's own data directory, where the
driver's state and every Codex artifact the report names (`answerPath`, a worktree harvest) live. The
driver reads `CODEX_DELEGATE_STATE_DIR` first and that variable second, and with neither it exits 2; only
`--help` needs none. A clone-and-symlink install substitutes nothing for the placeholder, so the forwarded
value is empty there and the `CODEX_DELEGATE_STATE_DIR` the user exports decides ([README](../../README.md)
says where).

A read seat's prompt needs no header at all:

    TASK: …
    CHECK: …
    RETURN: …

For an isolated writer, one rights line above it (see
[Worktree lifecycle](#worktree-lifecycle) for what it contains):

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
| `SEAT: read [<dir>]` or no header | read any readable path, reach the network, run commands, write only `$TMPDIR`; a write elsewhere asks an approval nobody is there to give, and the run exits 6 | no |
| `SEAT: worktree <repo>` | write in a driver-managed detached tree | say that a worktree will be made |
| `SEAT: write <dir>` | write under the live directory | yes; this chooses the blast radius |

Every level reaches the network, as a native subagent does, and `NETWORK: no` denies the sandbox that —
not the provider's web search, which is `WEB_SEARCH:`'s own channel. Egress moves nothing on disk:
whatever a seat can read it can send, which at read level is every readable path. Each `WRITABLE: <dir>`
widens a write seat, as does removing a `NETWORK: no` the user settled: settle each with the user before
adding it, and never translate a refusal into broader rights. Every field is in
[Header fields](#header-fields) below; model, effort, gates, continuation and answer-shape choices
belong in that header, and the seat's rights in its `SEAT:` line, which is why the prompt is copied
into the file rather than rewritten: measured, a wrapper that rewrote one widened malformed rights and
reported false success
([A relay on a small model](references/incidents.md#a-relay-on-a-small-model)).

Read seats may share one cwd, but a repository whose tooling keeps a daemon, a socket, or a pid/state
file needs a distinct cwd or its own `TMPDIR` per concurrent seat; the failure is a native crash, not a
sandbox refusal.

A write seat sharing a live tree must not change what the tree shares: no stash, branch switch, reset,
clean or rebase while another writer holds part of it. Those move or discard work the other seat is
still editing, and no sandbox refuses them.

## Header fields

The header is the leading run of upper-case `NAME: value` lines at column 0; the body starts at `TASK:` or
at the first line that is not one; a non-field upper-case `NAME:` above it is exit 2 naming it.

| Field | Value (booleans: `yes`, `true` or `1`; no line means off, and for `NETWORK:` means on) | A coordinator sets it when |
| --- | --- | --- |
| `SEAT:` | `read [<dir>]`, `worktree <repo>`, `write <dir>` | first, or not at all: no header is a read seat in the current directory |
| `NETWORK:` | `no` | this seat's own commands must not reach the network; no line leaves it the egress every level has, and `WEB_SEARCH:` is untouched either way |
| `WRITABLE:` | `<dir>`, repeatable | a write seat needs one more root than the directory it was given |
| `RESUME:` | `<threadId>`, `last` | this seat continues an earlier thread instead of opening one |
| `EXPECT:` | `<regex>` | the answer is only evidence if a command matching it ran AND succeeded; a matching command that exited non-zero does not count, and none matching is exit 5. Do not point it at a check whose failure IS the finding |
| `OUTPUT_SCHEMA:` | `<path to a strict JSON Schema file>` | the answer must parse as one JSON object |
| `MODEL:` | `<slug>` | this seat needs a model other than the configured default |
| `EFFORT:` | `none`, `minimal`, `low`, `medium`, `high`, `xhigh`, `max`, `ultra` | the task is worth more or less thinking |
| `WEB_SEARCH:` | `cached`, `indexed`, `live` | the seat needs sources it cannot read locally |
| `BRIEF:` | `yes` | a short answer is enough; omit it beside an output schema — it clips only the inline `answer` (`answerJson` is parsed from the whole one) yet still asks the model for 20 lines |
| `ALLOW_NO_COMMANDS:` | `yes` | the seat is recall-only and will run nothing |

One field is missing from that table on purpose. `VERIFY` is refused in a seat file without `--allow-seat-verify`,
a flag the one call above does not pass: it runs a caller-declared command after the turn, so a seat that could
write its own would be grading itself. Declare gates on the command line instead
([result-gates.md](references/result-gates.md)).

## Worktree lifecycle

- A new thread's worktree starts at current `HEAD`; a resumed worktree starts at its recorded base and
  restores its harvested diff and untracked files; neither copies live edits nor applies a stash.
- Staged, unstaged, untracked, ignored and installed files are absent. To put current work in, commit it
  first with the user's approval, or use an authorised live tree.
- The driver creates the tree under the repository's own `.claude/worktrees/`, and removes it after a
  successful harvest.
- A completed turn harvests tracked work to `worktreeDiffPath`.
- It archives non-ignored untracked files at `worktreeUntrackedPath`; `worktreeCommitsRef` is populated
  only where the caller's own `--verify` committed — a seat cannot commit without `WRITABLE: <repo>/.git`,
  a widening to settle first.
- After a successful harvest the driver removes the worktree.
- When the turn failed or harvest failed, the driver preserves it and reports `worktreePreserved`.
- A preserved tree is not a harvest: `worktreeDiffPath`, `worktreeUntrackedPath` and `worktreeCommitsRef`
  can all be null, so the landing recipe has nothing to apply. The tree itself is the artifact, at
  `worktreePath`; read it, take what is worth keeping, then remove it with
  `git -C <repo> worktree remove --force <path>`. Removing it discards whatever was never harvested.

## Reading the result

- `<REPORT>` is the report, the same JSON the run also wrote to `<DIR>/out.json`. Read the file:
  it is written whole or not at all, and a missing one means unknown, never success. A file that IS there is
  the driver's own only when it published one: the driver never overwrites what it finds, and says so on
  stderr when it could not publish. Read that line before trusting a report you did not see it write.
- `exitCode: 0` means the completed turn passed its declared evidence gates. `answer` is the seat's text;
  with an `OUTPUT_SCHEMA:` line, `answerJson` is that answer already parsed.
- `exitCode: 3` is a cut; read the retained answer or partial and the `RESUME:` hint. Give the continuation a
  report path of its own: the driver refuses one already taken and exits before it announces its pid, so a
  retry at the last path cannot start.
- `exitCode: 10` is a held lock or a busy resumed thread: the report says `ok: false` and carries the
  refusal in `error`, and `<DIR>/err.txt` has it in full.
- Exit 2 has two shapes, and the report tells them apart. With `turnStatus: null` no turn ran: the reason
  is in `error` and there is no receipt. With any other `turnStatus` the turn ran and the server rejected
  the request: the reason is in `turnError`, and the commands, any retained answer and the receipt are
  real. Read them before relaunching, or a paid turn is thrown away.
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
asks for, its first line is one sentence a reader can take on its own, the agent's model and id, its status and
what it did; it is what the coordinator retells, and not itself a message to the user; the rest is the return's
own shape.

The standing rules are already on the thread — unattended, its egress and its web search each named
whichever way they went, `COMMAND_BLOCKED` for a step that cannot run, never claim a test passed without
the count — so do not repeat them. A follow-up continues a thread with `RESUME: <threadId>`; a
recall-only one runs no commands, so it also needs `ALLOW_NO_COMMANDS: yes` (`--allow-no-commands` on a
command line).

## What the user reads

Every word on this page is addressed to the coordinator, and a seat's return is too. What reaches the user is
prose the coordinator writes: in the user's own language, naming an agent by its model and id ("Sonnet W5",
"Codex gpt-5.6-sol A1") and not by this page's own vocabulary. A header field name, a status block, an internal
table's row name and an absolute path are machinery; they belong in a prompt or a report, and putting them in
front of a person says nothing they can act on. Rights are the one thing that must survive the translation: say
what an agent may write, and where, in ordinary words, because that is what the user is being asked to approve.

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
