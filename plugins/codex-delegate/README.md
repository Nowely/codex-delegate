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
report as though it had; a prompt with no header at all is a read seat in the current directory. Where a
knob and a default compete, the default wins. Where a rule must be known to succeed, that is a defect in
this repository, not in the coordinator.

A second, user-invoked skill applies the same goal to the whole session. `/codex-delegate:orchestrate`
turns the main conversation into an orchestrator that scouts inline, agrees one plan, and pushes every
verbose step onto Claude and Codex seats; it is prompt only, adds no flag or field, and is a delta over
this skill ([skills/orchestrate/SKILL.md](skills/orchestrate/SKILL.md)).

## Prerequisites

- **`codex` CLI, installed and authenticated.** `codex` must be on `PATH` and signed in — check with
  `codex login status`. Runs reuse your credentials: `auth.json` is symlinked from your real `~/.codex`.
- **The codex-cli build the driver pins.** Every report names it as `codexVersionPinned`, and the
  `schema-<version>/` directory at the repository root is that build's protocol reference. After
  upgrading codex, run the fidelity suite (below) before trusting a run.
- **Node at or above the floor `package.json` declares** (`engines`); CI runs that floor and a current
  release, Linux and macOS. No dependencies: the driver is one file importing only `node:` builtins.
- **macOS and Linux are both measured.** CI runs every suite that needs no `codex` binary on both;
  the macOS-only call (the managed-preferences plist) is guarded. A stock Linux shell leaves `TMPDIR`
  unset, and at `--level read` it *is* the grant: the driver then makes a private one and names it in
  the report as `tmpDir` ([Environment](skills/codex-delegate/references/environment-and-internals.md#environment)).
  Export your own to put the seat's scratch files elsewhere.
- **Your `~/.codex/config.toml` is the default policy.** Model, reasoning effort and the other keys
  the driver inherits ([the isolated home](skills/codex-delegate/references/environment-and-internals.md#the-isolated-home))
  come from it unless overridden per call (`--model`, `--effort`); the driver deliberately sets no
  defaults of its own.

## Install

As a plugin — the full set: both skills, the driver and the suites (the repo is its own marketplace):

```
/plugin marketplace add Nowely/codex-delegate
/plugin install codex-delegate@codex-delegate
```

This route exposes the skill as `codex-delegate:codex-delegate` and the orchestrator mode as
`codex-delegate:orchestrate`, which only the user can turn on.

The same two steps from a shell: `claude plugin marketplace add Nowely/codex-delegate`, then
`claude plugin install codex-delegate@codex-delegate`. To update, refresh the marketplace clone and
then the plugin, and restart Claude Code:

```bash
claude plugin marketplace update codex-delegate
claude plugin update codex-delegate@codex-delegate
```

Or from source — clone and symlink, so the checkout stays the single source of truth (the `orchestrate`
symlink is only needed for the orchestrator mode):

```bash
git clone https://github.com/Nowely/codex-delegate.git
cd codex-delegate
mkdir -p ~/.claude/skills                           # absent on a machine that has never run Claude Code
ln -s "$PWD/skills/codex-delegate" ~/.claude/skills/codex-delegate
ln -s "$PWD/skills/orchestrate" ~/.claude/skills/orchestrate
```

On this clone-and-symlink route the skill is `codex-delegate` and the mode is `/orchestrate`; on the
plugin route they are `codex-delegate:codex-delegate` and `/codex-delegate:orchestrate`.

The `mkdir -p` is not decoration: without it every `ln -s` call fails with `No such file or directory`
on a fresh account, which is exactly the account this route is written for.

**Where the driver's state lives.** `${CLAUDE_PLUGIN_DATA}`, the plugin's own data directory, which
Claude Code substitutes into the skill's recipes and which this install resolves to
`~/.claude/plugins/data/codex-delegate-codex-delegate/`. The answers and the isolated Codex home, the
write locks, the worktree ledger and the orchestrator mode's run directories are all there. It survives
plugin updates; an uninstall deletes it unless you pass `claude plugin uninstall --keep-data`. The driver
keeps no default of its own: with neither that variable nor `CODEX_DELEGATE_STATE_DIR` it exits 2. In
every permission mode but auto and bypass, a write outside the working directory prompts, so add that
directory to `permissions.additionalDirectories` once — this plugin adds no rules on your behalf. On the
clone-and-symlink route nothing substitutes the placeholder, so export an absolute path of your own
instead, in your shell profile:

```bash
export CODEX_DELEGATE_STATE_DIR="$HOME/.local/state/codex-delegate"
```

Verify the install from the checkout (plugin installs carry the suites too, under the plugin root) —
costs nothing, calls no model:

```bash
npm test    # every suite, cheapest first, stops at the first red
```

A plugin root carries no git metadata, so the `package` suite's tag and payload cases announce
themselves there as skipped instead of failing; from the checkout they run.

The `fidelity` suite is what to watch after a `codex` upgrade: it performs a real handshake and diffs
it against the fixture, so protocol drift shows up as a failing case instead of a confident wrong
answer. Without `codex` on `PATH` it skips and exits 0, which is what CI does; the release checklist
([RELEASING.md](RELEASING.md)) runs it locally, where the skip becomes a failure.

Run the suites from the **repository or plugin root**. Do not compute that root by appending `../..`
to the skill path: where the skill is a symlink (the clone-and-symlink install above), Node collapses
`..` lexically and lands somewhere that does not exist, while `ls` follows the link and appears to
work. Resolve the link, or use the install path announced when the skill loads, or `installPath` in
`installed_plugins.json`.

## First run

From the checkout, with the state directory exported as Install says:

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

Inside Claude Code you rarely type this yourself: the skill's `SKILL.md` is the operating manual the
agent reads mid-task, including when to give a panel seat to Codex at all. With the plugin installed it
is `codex-delegate:codex-delegate` (the clone-and-symlink spellings are under Install). A seat is one
background Bash call of that same driver: the prompt in a file named by `--seat-file`, the report at
`--report-file`; add `SEAT: worktree <repo>` above `TASK:` for a managed writer. The
driver parses that header, launches one seat, waits as long as the work takes, and publishes the report
by hard link, never over an existing entry: the coordinator reads the file when the call's exit
notification arrives, and a missing file means unknown, never success.

## Rights, per call

| Call | Codex may |
| --- | --- |
| `--level read` (the default; `--cwd DIR` is optional and defaults to the current directory) | read any readable path, run commands, write only `$TMPDIR` — enough to run tests |
| `--worktree REPO` | write level in a managed detached tree the driver creates, harvests and removes; what it starts from and lacks is in [parity.md](skills/codex-delegate/references/parity.md#read-and-isolated-write) |
| `--level write --cwd DIR` | write anywhere under a directory you chose |
| `+ --network` / `--writable DIR` | egress or an extra root — each an explicit opt-in |

## The run's lifetime

A run lives exactly as long as its call: there is no run registry and no collector, and the caller that
started a seat owns its lifetime. `--report-file` is the delivery that survives a broken pipe, and a
seat is stopped by `SIGTERM` to the pid the driver prints on its first stderr line — the turn is
interrupted, the report it had earned is written anyway, and the codex process group is swept.

## Trust and verification

- **Exit codes from evidence.** The `codex` process always exits 0; the driver derives an ordered
  ladder of exit codes from the event stream. The driver's `--help` is the complete ladder;
  `SKILL.md` gives the decisions a coordinator makes on it.
- **Evidence gates.** `--verify '<shell>'` runs after the turn, executed by the driver, never authored by
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
needs `--configLoader runner`. Concurrency is memory-bound (figures in
[parity.md](skills/codex-delegate/references/parity.md#fan-out-and-reporting)) and exceeding the machine
budget gets runs killed by the OS, not throttled. The app-server protocol is `[experimental]` and
carries no stability promise — hence the pinned schema and the fidelity suite.

## After a codex upgrade

```bash
codex app-server generate-json-schema --out <tmp-new>/
git archive 7364f7b schema-<old-version> | tar -x -C <tmp-old>/
diff -r <tmp-old>/schema-<old-version>/ <tmp-new>/
```

Read the diff for anything structural. Commit `<tmp-new>/` as `schema-<new-version>/` in a commit of its
own: that commit holds the full tree the next upgrade diffs against, so replace `7364f7b` above with its hash.
`CODEX_DELEGATE_SCHEMA_DIR=schema-<new-version> node evals/conformance.test.mjs` validates it while
`schema-<old-version>/` is still the pinned one; once that is green, move `PINNED_CODEX`, prune the new
directory to the files [conformance](evals/conformance.test.mjs) loads in a second commit, and delete the old one. Then
`npm test` and `node evals/fidelity.test.mjs --require-live`, inspect any fixture/live difference, and
re-check [the dated parity reference](skills/codex-delegate/references/parity.md).

## Layout

```
skills/codex-delegate/           the skill: SKILL.md (the operating manual), scripts/ (the driver and
                                 its companions, each self-describing under --help), references/
skills/orchestrate/SKILL.md      the orchestrator mode: a delta over the codex-delegate skill,
                                 prompt only
.claude-plugin/                  plugin + marketplace manifests
evals/                           the suites, one file each; run-all.mjs lists them and runs them
                                 cheapest first, lib/harness.mjs and lib/scenarios.mjs are their
                                 shared machinery
package.json                     private; the Node floor and `npm test`
.github/workflows/ci.yml         the suites that need no `codex` binary, on its OS × Node matrix
schema-<version>/                the files evals/conformance.test.mjs loads out of the pinned protocol
                                 schema; kept in the repo (and therefore in plugin installs) because
                                 those are what the suites this README tells you to run validate
                                 against. The full generated tree is not kept here: the commit named in
                                 the upgrade recipe holds the last one (7364f7b for 0.153.4), and the
                                 recipe diffs the next regeneration against it.
```

Canonical homes for repeated stories:

| Subject | Canonical home |
| --- | --- |
| composition, rights, workflow | [`SKILL.md`](skills/codex-delegate/SKILL.md) |
| orchestration: tiers, Codex share, seat bounds, returns | [`skills/orchestrate/SKILL.md`](skills/orchestrate/SKILL.md) |
| flags and field formats | `node skills/codex-delegate/scripts/driver.mjs --help` (`--help-all` for the rest) |
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
