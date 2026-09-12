# codex-delegate

## What this is

One Codex turn, started from Claude Code, with the rights for that turn named on the call that makes it.

It is a single Node script — the driver — that speaks JSON-RPC to `codex app-server` over stdio, plus
three skills that tell Claude how to call it. The driver returns one JSON report: what the turn was
allowed to do, which commands ran and what they returned, whether the answer arrived, and an exit code
derived from those events rather than from the model's own account of itself.

The design holds one position. **Rights are a grant, and a grant is made per call.** A seat that only
needs to read gets a read-only sandbox. A seat that must write gets a named writable root and a lock on
it. Neither inherits anything from the call before it, and there is no config file that quietly widens
the next one.

That position is what the exit code is for. `0` does not mean the model said it was finished; it means
the turn completed, the commands the caller required actually ran, and the check the caller declared
passed. Where the caller declared none of those, `0` means less, and the report says which parts were
measured.

What it is not: a job queue, a background service, or a way to keep a Codex session alive across tasks.
The caller that starts a seat owns its lifetime and stops it. A thread can be resumed by name, and
nothing else survives the call.

## Install and first run

```
/plugin marketplace add Nowely/agent-skills
/plugin install codex-delegate@nowely
```

You need Node 22 or newer, `codex` on `PATH`, and an account it can use — the driver does not
authenticate, it borrows the `auth.json` your own Codex already has.

Then ask Claude for the work, naming Codex:

> Ask a Codex seat to read `src/parser.ts` and list the cases it does not handle.

The skill turns that into one driver call, shows you the rights it is asking for, and reports what came
back. Nothing is written anywhere outside a temporary directory unless you asked for a write seat.

The turn runs against a Codex home the driver keeps for itself, not against yours, so nothing you have
configured steers it. Filling it costs one short probe of your own `codex` before the turn — normally
about 120 milliseconds, and never more than five seconds.

If the call ends at exit 2 saying it has no state directory, the plugin's data directory was not passed
through. That is the one piece of setup with no default: state under your home would outlive an
uninstall, so the driver refuses to invent a location.

## Rights, per call

Three levels, and the difference between them is what the sandbox will let the turn write.

| Level | Reads | Writes | Lock |
| --- | --- | --- | --- |
| `--level read`, the default | anything you can read | `$TMPDIR` only | none |
| `--level write --cwd DIR` | anything | inside `DIR` | one per directory |
| `--worktree REPO` | anything | a fresh worktree | one per repository |

Read seats take no lock, so several of them run over one directory at once. A write seat takes a lock
on its `--cwd` and a second one waits at exit 10 rather than editing the same tree underneath it.

`--cwd` has no default at write level. A writable root is a grant, and a defaulted grant is one nobody
made.

`--worktree` cuts a detached tree at `HEAD` under `REPO/.claude/worktrees`, runs there, copies the work
out to the driver's answers directory and removes the tree. Note what `HEAD` means: the last commit.
Uncommitted changes, untracked files and installed dependencies are not in it, so a seat asked about work
in progress finds an empty tree and reports success. Commit or stash first, or run on the live tree with
`--level write`.

The network is open at both levels. `--no-network` closes it, and there is no host allowlist — name the
hosts in the prompt.

## Proof that the work happened

A turn that read the code, formed an opinion and ran nothing will still produce a confident answer. The
driver's job is to make that visible rather than to trust it, and the caller has three instruments.

**`--expect-command RE`** requires that a command matching `RE` actually ran. The pattern is matched
against what the server parsed as well as the wrapper string it reports, so `^pnpm` works. Nothing
matched is exit 5.

**`--verify CMD`** runs `CMD` after the turn, in the seat's tree, and its exit code decides: a failure is
exit 9, and a verifier that could not be measured at all is exit 12. `CMD` runs with your rights, your
environment and your network, so prefer one that executes only what the seat just wrote — `npm test`
runs the seat's own script.

**`--verify-sandboxed`** runs that check under the same read-only profile a read seat gets. It keeps the
check as honest as the seat, and most build and test runners write, so most fail under it.

Beyond the ladder, the report carries counts the exit code does not read: `commandsFailed`,
`commandsBlocked` — a command that reached the client with no verdict at all — `fileChangesFailed` and
`commandsProbeNegative`. Read them before acting on the answer. A failed command is not a rung: it does
not make the turn a failure by itself, and it is not evidence that anything ran either.

## When a turn is cut

Three bounds, each with its own default and its own reason.

`--idle-timeout`, 900 seconds, is the one that catches a hang. It measures how long the thread may say
nothing at all; every notification from the server resets it, including item starts, answer deltas and
token accounting, so a long inference step does not trip it.

`--max-commands`, 1000, is the one that catches a loop.

`--timeout` is unset by default, and the turn runs as long as the work takes. Declare one and it is
anchored at process start: near the end the turn is steered to answer now, and at the last moment it is
cut. The maximum is 7200 seconds.

Any of the three ends the turn at exit 3, and the report still holds what the turn had reached — the
answer if it delivered one, and otherwise `answerPartial`, the text the model had written when it was
cut, reassembled from the answer stream because the server discards the message in flight. `cut` names
which bound ended it and what it observed, and the report carries the thread id to resume from.

The reason a partial is written beside the answer rather than as one: it is text the model never
finished and never delivered. It is worth reading and it is not the turn's result.

## The private Codex home

By default a turn runs against a Codex home that belongs to the driver, not to you. Your own plugins,
skills and memories cannot steer it, and it writes no trust records back into your configuration.

It is one directory shared by every run, not a fresh one per turn. That is deliberate: the caches and
databases Codex keeps there persist, which is what makes an isolated run faster than a host-home one.
Two things stay linked to your real home rather than copied — `auth.json`, because the driver does not
hold credentials of its own, and the sessions directory, because that is where the receipt for a
completed turn is written.

Filling it costs one short process before the turn: the driver asks your own `codex` what its settings
resolve to, bounded at five seconds and normally about 120 milliseconds. The report's `configInherited`
says whether the model and effort for this turn came from a fresh probe, from the last known good
answer, or from nothing at all.

`--host-home` uses your `~/.codex` instead, plugins and all. It is the right choice when a seat needs an
MCP server you have configured there, and the wrong one when you want the turn's behaviour to depend on
nothing but the call.

## What it leaves on disk, and how to remove it

Everything the driver owns lives in one state directory, named by `CODEX_DELEGATE_STATE_DIR` or, where
that is unset, by the plugin's own data directory. There is no built-in default.

```
locks/      one per directory a write seat holds
answers/    answers, partials, turn diffs
home/       the private Codex home
jobs/       what --resume last and a worktree rebuild need
tmp/        the temporary directory of a run whose caller exported none
worktrees/  the managed-worktree ledger
pasted/     images staged for attachment
```

Nothing prunes any of it. Answers accumulate, and so do the worktree entries for trees that were
removed.

The `cleanup` skill lists what is there with sizes and dates, says which items it suggests removing and
why the rest are being kept, and deletes only what you name. Three things it lists and never removes:
managed worktrees and their ledger, write locks, and the shared Codex home. The driver reconciles the
first two itself, and the last is shared by every seat, including ones running now.

A `--report-file` is yours, not the driver's: it is written where you named it and nothing cleans it up.

## Stopping and continuing a run

A seat is stopped by sending `SIGTERM` to the driver process. Its pid is on stderr before anything else,
so it can be stopped by a caller that has not yet seen a thread id.

The handler asks the server to end the turn and then writes the report the turn had earned, at exit 1.
Stopping a seat does not discard its work: the commands that ran are in the report, the files it wrote
are where it wrote them, and the answer or the partial is on disk.

`--resume THREAD` continues a thread by id. `--resume last` continues the run most recently *started*
for this `--cwd`, or for this repository under `--worktree`. Started, not most recently active: a long
seat still running does not lose its place to a shorter one begun after it and already finished. Check
`resumedFrom` in the report after using `last`, which is the whole reason the field exists.

A thread whose turn is still open refuses a resume at exit 10. So does a directory another write seat
holds. Both are the same rule — one turn at a time over one tree — arriving from two directions.

`tokenUsage` is cumulative across a resumed thread, so the number after three resumes is the cost of all
three, not of the last one.

## Why this driver, and not the official plugin

The official Codex plugin for Claude Code and this driver are the same skeleton: both spawn
`codex app-server` and speak thread and turn JSON-RPC over stdio. They differ in one layer, and it is
the layer that decides whether a result can be trusted.

Two defects, both measured against the cached plugin source and reproduced live, as of 2026-08-31.

**It hardcodes an approval policy of `never`.** On a machine with a managed Codex profile that does not
allow `never`, Codex clamps it to `untrusted`, under which every command and every write raises an
approval request. The plugin answers every such request with JSON-RPC `-32601`, which Codex reads as a
refusal. The log says `File changes declined.` and the run exits 0.

**It sends an explicit sandbox on every start**, and sending that parameter at all suppresses any
configured permission profile — the only mechanism that can add `$TMPDIR` to a read-only sandbox. A
review seat launched through it cannot create a temporary directory, so it cannot run a test suite or a
build, on any machine. It reviews by reading and reports a confident verdict having run nothing.

Scope this honestly: on an unmanaged machine the plugin's `--write` path is serviceable, because
`workspace-write` opens `$TMPDIR` as a side effect. It is read and review seats that are structurally
unable to run anything.

Both were reported upstream. Neither was fixed. Read the issues yourself before assuming that still
holds.

## After a codex upgrade

The driver speaks a protocol that a new Codex can change without saying so, and the suites will not
notice: they drive the driver against a fixture, and when the fixture is wrong the driver and the
fixture are wrong in the same way while every case stays green.

So the first thing to run after an upgrade is the one suite that asks a different question:

```bash
node evals/fidelity.test.mjs
```

It sends the real server the same handshake the fixture answers and compares the replies. No turn is
started and no model is called, which makes it cheap enough to run on every change to either side. It
skips only when `codex` is absent, loudly, because a missing binary is not a protocol defect; every other
spawn or handshake failure is drift.

Then run the rest, and the live gate separately:

```bash
npm test
CODEX_DELEGATE_LIVE_TURN=1 node evals/fidelity.test.mjs --require-live
```

Afterwards, check `codexVersion` in a report. It carries what the server said about itself beside the
version this plugin was last measured against, so a mismatch is visible in the output of ordinary work
rather than only in a test run.
