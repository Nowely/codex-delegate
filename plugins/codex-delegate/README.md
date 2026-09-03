# codex-delegate

A Claude Code skill that hands coding work to OpenAI Codex as a subagent, with the rights for each call
declared up front: analysis that reads and runs but writes nothing of yours, or writing and running
tests inside a git worktree the driver manages itself. Every run leaves a receipt — a rollout the driver
locates, opens and checks — and the exit code is derived from what actually happened rather than from a
process status that says nothing about the task, so a seat that did nothing cannot report as though it
had.

## Goal

A coordinator agent, Sonnet or Opus, that has loaded this skill must be able to launch a Codex subagent
on the first attempt and get a finished, verifiable answer back, with nothing to configure and nothing
to know in advance. The defaults have to produce what a native Claude Code subagent does: one call, it
waits as long as the work takes, it returns the answer, and it is stopped only by silence or by the
coordinator. Everything else here serves that. Rights are declared per call so the coordinator never
wonders what the seat may touch; exit codes are derived from evidence so a seat that did nothing cannot
report as though it had; the relay agent's defaults are the native ones. Where a knob and a default
compete, the default wins. Where a rule must be known to succeed, that is a defect in this repository,
not in the coordinator.

## Prerequisites

- **`codex` CLI, installed and authenticated.** `codex` must be on `PATH` and signed in — check with
  `codex login status`. Runs reuse your credentials: `auth.json` is symlinked from your real `~/.codex`.
- **codex-cli 0.150.1.** Everything here is measured against that build; `schema-0.150.1/` is the
  pinned protocol reference. After upgrading codex, run the fidelity suite (below) before trusting a run.
- **Node 18 or later.** Declared in `package.json` (`engines`) and run in CI on 18 and 24, Linux and
  macOS. No dependencies: the driver is one file importing only `node:` builtins.
- **macOS and Linux are both measured.** CI runs every suite that needs no `codex` binary on
  ubuntu-latest and macos-latest; the one macOS-only call (the managed-preferences plist) is guarded.
  A stock Linux shell leaves `TMPDIR` unset, and at `--level read` it *is* the grant: the driver then
  makes `<state>/tmp/<runId>` (0700) of its own, grants exactly that, and names it in the report as
  `tmpDir`. Export your own to put the seat's scratch files elsewhere.
- **Your `~/.codex/config.toml` is the default policy.** Model, reasoning effort, personality and
  service tier are inherited from it unless overridden per call (`--model`, `--effort`); the driver
  deliberately sets no defaults of its own.

## Install

As a plugin — the full set: the skill plus the namespaced subagent (the repo is its own marketplace):

```
/plugin marketplace add Nowely/codex-delegate
/plugin install codex-delegate@codex-delegate
```

This route exposes the skill as `codex-delegate:codex-delegate` and the wrapped seat as
`codex-delegate:codex-seat`.

The same two steps from a shell: `claude plugin marketplace add Nowely/codex-delegate`, then
`claude plugin install codex-delegate@codex-delegate`. To update, refresh the marketplace clone and
then the plugin, and restart Claude Code:

```bash
claude plugin marketplace update codex-delegate
claude plugin update codex-delegate@codex-delegate
```

Or from source — clone and symlink, so the checkout stays the single source of truth (add the second
symlink if you want the `codex-seat` agent without the plugin route):

```bash
git clone https://github.com/Nowely/codex-delegate.git
cd codex-delegate
mkdir -p ~/.claude/skills ~/.claude/agents          # absent on a machine that has never run Claude Code
ln -s "$PWD/skills/codex-delegate" ~/.claude/skills/codex-delegate
ln -s "$PWD/agents/codex-seat.md" ~/.claude/agents/codex-seat.md
```

On this clone-and-symlink route the agent spelling is bare `codex-seat` and the skill is
`codex-delegate`; on the plugin route they are `codex-delegate:codex-seat` and
`codex-delegate:codex-delegate`.

The `mkdir -p` is not decoration: without it both `ln -s` calls fail with `No such file or directory`
on a fresh account, which is exactly the account this route is written for.

Verify the install from the checkout (plugin installs carry the suites too, under the plugin root) —
costs nothing, calls no model:

```bash
npm test    # = node evals/run-all.mjs — every suite, cheapest first, stops at the first red
```

The last suite it runs, `fidelity`, is what to watch after a `codex` upgrade: it performs a real
handshake and diffs it against the fixture, so protocol drift shows up as a failing case instead of a
confident wrong answer. Without `codex` on `PATH` it skips and exits 0, which is what CI does; before a
release run `node evals/fidelity.test.mjs --require-live` locally, where the skip becomes a failure.
`CODEX_DELEGATE_LIVE_TURN=1` also spends one real turn.

Run the suites from the **repository or plugin root**. Do not compute that root by appending `../..`
to the skill path: where the skill is a symlink (the clone-and-symlink install above), Node collapses
`..` lexically and lands somewhere that does not exist, while `ls` follows the link and appears to
work. Resolve the link, or use the install path announced when the skill loads, or `installPath` in
`installed_plugins.json`. Use either installation route above and run the suites from its checkout or
plugin root.

## First run

```bash
node skills/codex-delegate/scripts/driver.mjs --cwd . --brief \
  --prompt 'TASK: describe this repository in two sentences, after listing its files.
CHECK: name three real files.
RETURN: the two sentences.'
```

The JSON report — the only report — ends with the verdict: `exitCode: 0` means the turn completed, every
declared check passed, and a command really ran; anything else is a specific complaint — the driver's
`--help` documents the full ladder. `threadId` continues the conversation via `--resume`; `receiptPath` and
`receiptOk` locate and validate the run's rollout
([receipt details](skills/codex-delegate/references/environment-and-internals.md#receipt-validation-and-reporting)
say what that does and does not prove).

| Report key | Meaning |
| --- | --- |
| `fileChanges` | completed file changes as `{path, kind, move}` objects |
| `filesTouched` | the flat list of destination paths |

Inside Claude Code you rarely type this yourself: the skill's `SKILL.md` is the operating manual the
agent reads mid-task, including when to give a panel seat to Codex at all. With the plugin installed,
use `Agent(subagent_type: "codex-delegate:codex-seat", prompt: "TASK: …\nCHECK: …\nRETURN: …")` or
`agentType: "codex-delegate:codex-seat"` in a workflow; the skill is
`codex-delegate:codex-delegate`. A clone-and-symlink install instead uses bare `codex-seat` for both
agent call spellings and `codex-delegate` for the skill. Add `SEAT: worktree <repo>` before `TASK:` for
a managed writer. The pinned relay does three mechanical things — write the prompt to a file, run
`driver.mjs --relay <file>`, return that output verbatim — and the driver does the rest: it parses the
header, launches one seat, waits as long as the work takes and renders the envelope carrying the thread
id, the receipt and Codex's whole answer. The relay never composes an answer of its own.

## Rights, per call

| Call | Codex may |
| --- | --- |
| `--level read` (the default; `--cwd DIR` is optional and defaults to the current directory) | read any readable path, run commands, write only `$TMPDIR` — enough to run tests |
| `--worktree REPO` | write level in a managed detached tree that starts at HEAD; commit or stash WIP first, or use `--level write --cwd` on the live tree. Dependencies are absent, so dependency-needing verifiers exit 1 unless installed in the seat's tree |
| `--level write --cwd DIR` | write anywhere under a directory you chose |
| `+ --network` / `--writable DIR` / `--commit` | egress, an extra root, or the repository's git dir — each an explicit opt-in |

## Runs that outlive the call

A detached run survives this process, its shell and the session; the run directory under the state dir
is its transport.

| Flag | Effect |
| --- | --- |
| `--detach` | start the turn in its own process group and print a handle: exit 10, `turnStatus: running`, `threadId`, `pid`, `runId`, and the paths its report and stderr will land at. Bounded by `--idle-timeout`, `--max-commands` and any `--timeout` exactly as a blocking run is |
| `--wait-timeout S` | how long this process waits before handing back the handle: 0 under `--detach`, 7200 under `--wait` |
| `--wait <id\|last>` | collect a detached run: its report to stdout and its stderr to stderr, byte for byte, under the code the run itself decided; exit 4 if it died without one |
| `--jobs [--cwd R]` | the registry as JSON, status from pid liveness — `running` / `crashed` / `ended` — plus `lastEventAt`, `tokensSpent` (the server's own total for the thread, cumulative across `--resume`), `commandsSeen` and `phase`; spawns nothing |
| `--cancel <id>` | `SIGTERM` the run; its own handler writes the full interrupted report |

## Trust and verification

- **Exit codes from evidence.** The `codex` process always exits 0; the driver derives an ordered
  ladder of exit codes from the event stream. The driver's `--help` is the complete ladder;
  `SKILL.md` gives the relay decisions a coordinator needs.
- **Three gates.** `--verify '<shell>'` runs after the turn, executed by the driver, never authored by
  the model — but with the coordinator's own rights, env and network, so a verifier that executes tree
  contents (`npm test` runs the seat's `package.json` script) is running the seat's code; prefer one
  that does not, or add `--verify-sandboxed` to put it behind the read-only profile;
  `--expect-command <regex>` demands the work matched a declared signature;
  `--output-schema <file>` demands a JSON answer matching a schema. Semantics, and how each gate can
  be fooled: the driver's `--help` and [references/result-gates.md](skills/codex-delegate/references/result-gates.md).
- **Sandbox asserted, not assumed.** The rights the server reports are compared against the rights that
  were asked for, and a mismatch refuses the run instead of proceeding under an unknown sandbox.
- **A receipt per run.** `receiptPath`/`receiptOk` locate the rollout and check it names this thread;
  what that does and does not prove is in
  [the internals reference](skills/codex-delegate/references/environment-and-internals.md#receipt-validation-and-reporting).
- **Isolation by default.** Runs use a private `CODEX_HOME`, so your plugins, skills and MCP servers
  stay out of the turn and no trust records are written back; `--host-home` opts out.

## Why not the official plugin

The official `openai-codex` plugin is architecturally the same idea and richer in places — background
jobs, resume UX, a stop-time review gate. It is not a substitute where rights matter: it hardcodes an
approval policy that managed (MDM) machines clamp into deny-everything, and it always sends an explicit
`sandbox` parameter, which suppresses the permission profile that makes read-level test runs possible —
on every machine, managed or not. Both defects are silent: the run still exits 0. The `codex
exec`-based skills and the official SDK hit the same walls. Full forensics, upstream issue state, and
what the plugin does better: [references/why-not-the-plugin.md](skills/codex-delegate/references/why-not-the-plugin.md).

## Limitations

Read level cannot run browser-mode tests (vitest's server binds loopback TCP; the profile refuses it) —
they run at write level with a one-file Chromium workaround
([Browser-mode sandbox](skills/codex-delegate/references/parity.md#browser-mode-sandbox)). Node-environment vitest at read level
needs `--configLoader runner`. Concurrency is memory-bound (~180 MB per seat) and exceeding the machine
budget gets runs killed by the OS, not throttled. The app-server protocol is `[experimental]` and
carries no stability promise — hence the pinned schema and the fidelity suite.

## After a codex upgrade

```bash
codex app-server generate-json-schema --out schema-<new-version>/
npm test
node evals/fidelity.test.mjs --require-live
```

Then inspect any fixture/live difference and re-check
[the dated parity reference](skills/codex-delegate/references/parity.md).

## Layout

```
skills/codex-delegate/           the skill: SKILL.md (the operating manual), scripts/driver.mjs
                                 (one file, no dependencies, only Node builtins),
                                 scripts/attach-pasted.mjs (hands a seat the images the user pasted,
                                 which live only in the Claude Code transcript), references/
agents/codex-seat.md             the relay subagent the plugin ships
.claude-plugin/                  plugin + marketplace manifests
evals/                           seven suites — package (what ships, and the version it claims),
                                 agent-contract, attach-pasted, conformance (the fixture against the
                                 pinned schemas), protocol, lock, and fidelity against the live
                                 server; run-all.mjs runs them, lib/harness.mjs is their shared machinery
package.json                     private; the Node floor and `npm test`
.github/workflows/ci.yml         the six free suites on {ubuntu, macOS} × Node {18, 24}
schema-0.150.1/                  the pinned protocol schema the driver is written against; kept in the
                                 repo (and therefore in plugin installs) deliberately — it is the
                                 regeneration oracle the upgrade recipe diffs against, and stripping it
                                 from installs would also strip the suites this README tells you to run.
                                 The two consolidated `*.schemas.json` bundles inside it are read by
                                 nothing here — conformance loads the per-type files. They stay so a
                                 `diff -r` against a regeneration is clean
```

Canonical homes for repeated stories:

| Subject | Canonical home |
| --- | --- |
| composition, rights, workflow | [`SKILL.md`](skills/codex-delegate/SKILL.md) |
| flags and field formats | `node skills/codex-delegate/scripts/driver.mjs --help` (`--help-all` for the rest) |
| wrapped-agent relay contract | [`agents/codex-seat.md`](agents/codex-seat.md) |
| environment, seat files, receipts, worktree internals | [`environment-and-internals.md`](skills/codex-delegate/references/environment-and-internals.md) |
| native capability parity and dated measurements | [`parity.md`](skills/codex-delegate/references/parity.md) |
| measured failures behind rules | [`incidents.md`](skills/codex-delegate/references/incidents.md) |
| suite coverage and mutations | [`evals/README.md`](evals/README.md) |

## Status

Young code, adversarially reviewed by mixed Claude/Codex panels. What that produced is checkable in the
repository rather than in the claim: the home-directory guard is pinned against case variants, symlinks
and a hostile `$HOME`; the lock's critical section is pinned against overlapping holders; a seat file
cannot introduce a verifier; `$TMPDIR` is guarded like every other writable root; and each suite is
mutation-checked, with the surviving mutants and what was done about them listed in
[`evals/README.md`](evals/README.md). Changes are available offline in
[`CHANGELOG.md`](CHANGELOG.md); release notes and known issues also live on the
[releases page](https://github.com/Nowely/codex-delegate/releases). The Codex build each release was
measured against is stated there because that axis — not the skill's own code — is what usually breaks.
MIT — see [LICENSE](LICENSE).
