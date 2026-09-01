# codex-delegate

A Claude Code skill that hands coding work to OpenAI Codex as a subagent, with the rights for each call
declared up front: analysis that reads and runs but writes nothing of yours, or writing and running
tests inside a git worktree the driver manages itself. Every run leaves a receipt — a rollout the driver
locates, opens and checks — and the exit code is derived from what actually happened rather than from a
process status that is always 0, so a seat that did nothing cannot report as though it had.

## Prerequisites

- **`codex` CLI, installed and authenticated.** `codex` must be on `PATH` and signed in — check with
  `codex login status`. Runs reuse your credentials: `auth.json` is symlinked from your real `~/.codex`.
- **codex-cli 0.150.1.** Everything here is measured against that build; `schema-0.150.1/` is the
  pinned protocol reference. After upgrading codex, run the fidelity suite (below) before trusting a run.
- **Node.** No dependencies: the driver is one file importing only `node:` builtins. Any Node a current
  Claude Code install runs on is fine; there is no separate version floor to manage.
- **macOS is the only measured platform.** Linux should work — the driver uses portable Node APIs — but
  nobody has run it there.
- **Your `~/.codex/config.toml` is the default policy.** Model, reasoning effort, personality and
  service tier are inherited from it unless overridden per call (`--model`, `--effort`); the driver
  deliberately sets no defaults of its own.

## Install

As a plugin — the full set: the skill plus the `codex-seat` subagent (the repo is its own marketplace):

```
/plugin marketplace add Nowely/codex-delegate
/plugin install codex-delegate@codex-delegate
```

Skill only, via the [`skills` CLI](https://github.com/vercel-labs/skills) (directory: [skills.sh](https://skills.sh)):

```bash
npx skills add Nowely/codex-delegate -g -a claude-code
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

The `mkdir -p` is not decoration: without it both `ln -s` calls fail with `No such file or directory`
on a fresh account, which is exactly the account this route is written for.

Verify the install from the checkout (plugin installs carry the suites too, under the plugin root) —
costs nothing, calls no model:

```bash
node evals/protocol.test.mjs   # the protocol and the result gates
node evals/lock.test.mjs       # the cwd lock and the worktree lifecycle
node evals/attach-pasted.test.mjs   # handing a seat the images the user pasted
node evals/conformance.test.mjs     # does the fixture still speak like the pinned protocol?
node evals/agent-contract.test.mjs  # does the shipped relay agent still match the driver?
node evals/fidelity.test.mjs   # does the fixture still match YOUR codex?
```

The last one is what to watch after a `codex` upgrade: it performs a real handshake and diffs it
against the fixture, so protocol drift shows up as a failing case instead of a confident wrong answer.

Run the suites from the **repository or plugin root**. Do not compute that root by appending `../..`
to the skill path: where the skill is a symlink (the clone-and-symlink install above), Node collapses
`..` lexically and lands somewhere that does not exist, while `ls` follows the link and appears to
work. Resolve the link, or use `$CLAUDE_PLUGIN_ROOT`. A bare `npx skills` install carries only the
skill itself and no suites, so run them from a checkout or a plugin install.

## First run

```bash
node skills/codex-delegate/scripts/driver.mjs --cwd . --brief \
  --prompt 'TASK: describe this repository in two sentences, after listing its files.
CHECK: name three real files.
RETURN: the two sentences.'
```

The JSON report (the default) ends with the verdict: `exitCode: 0` means the turn completed, every
declared check passed, and a command really ran; anything else is a specific complaint — `SKILL.md`
documents the full ladder. `threadId` continues the conversation via `--resume`; `receiptPath` and
`receiptOk` locate and validate the run's rollout (`SKILL.md`'s "Verify the seat" section says what a
receipt does and does not prove).

Inside Claude Code you rarely type this yourself: the skill's `SKILL.md` is the operating manual the
agent reads mid-task, including when to give a panel seat to Codex at all. With the plugin installed, a
seat is one native subagent call — `Agent(subagent_type: "codex-seat", prompt: "SEAT: read\nTASK: …")`
(or `agentType: "codex-seat"` inside a workflow): a pinned relay that maps the SEAT header to driver
flags, runs it once, and returns Codex's answer verbatim with the thread id and receipt, never an
answer of its own.

## Rights, per call

| Call | Codex may |
| --- | --- |
| `--cwd DIR` (read level, the default) | read any readable path, run commands, write only `$TMPDIR` — enough to run tests |
| `--worktree REPO` | write level inside a driver-managed detached worktree — harvested and removed after a completed turn, preserved with the reason otherwise |
| `--level write --cwd DIR` | write anywhere under a directory you chose |
| `+ --network` / `--writable DIR` / `--commit` | egress, an extra root, or the repository's git dir — each an explicit opt-in |

## Trust and verification

- **Exit codes from evidence.** The `codex` process always exits 0; the driver derives an ordered
  ladder of exit codes from the event stream. `SKILL.md` documents the ladder.
- **Three gates.** `--verify '<shell>'` runs after the turn, executed by the driver, never authored by
  the model; `--expect-command <regex>` demands the work matched a declared signature;
  `--output-schema <file>` demands a JSON answer matching a schema. Semantics, and how each gate can
  be fooled: `SKILL.md` and [references/result-gates.md](skills/codex-delegate/references/result-gates.md).
- **Sandbox asserted, not assumed.** The rights the server reports are compared against the rights that
  were asked for, and a mismatch refuses the run instead of proceeding under an unknown sandbox.
- **A receipt per run.** `receiptPath`/`receiptOk` locate the rollout and check it names this thread;
  what that does and does not prove is in `SKILL.md`.
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
([references/browser-tests.md](skills/codex-delegate/references/browser-tests.md)). Node-environment vitest at read level
needs `--configLoader runner`. Concurrency is memory-bound (~180 MB per seat) and exceeding the machine
budget gets runs killed by the OS, not throttled. The app-server protocol is `[experimental]` and
carries no stability promise — hence the pinned schema and the fidelity suite.

## After a codex upgrade

```bash
codex app-server generate-json-schema --out schema-<new-version>/
node evals/fidelity.test.mjs
```

then re-run the remaining suites and re-check the parity table in `SKILL.md`.

## Layout

```
skills/codex-delegate/           the skill: SKILL.md (the operating manual), scripts/driver.mjs
                                 (one file, no dependencies, only Node builtins),
                                 scripts/attach-pasted.mjs (hands a seat the images the user pasted,
                                 which live only in the Claude Code transcript), references/
agents/codex-seat.md             the relay subagent the plugin ships
.claude-plugin/                  plugin + marketplace manifests
evals/                           six suites — protocol, lock, attach-pasted, conformance (the fixture
                                 against the pinned schemas), agent-contract, and fidelity against
                                 the live server
schema-0.150.1/                  the pinned protocol schema the driver is written against; kept in the
                                 repo (and therefore in plugin installs) deliberately — it is the
                                 regeneration oracle the upgrade recipe diffs against, and stripping it
                                 from installs would also strip the suites this README tells you to run
```

## Status

Young code, adversarially reviewed by mixed Claude/Codex panels. What that produced is checkable in the
repository rather than in the claim: the home-directory guard is pinned against case variants, symlinks
and a hostile `$HOME`; the lock's critical section is pinned against overlapping holders; a seat file
cannot introduce a verifier; `$TMPDIR` is guarded like every other writable root; and each suite is
mutation-checked, with the surviving mutants and what was done about them listed in
[`evals/README.md`](evals/README.md). Changes and known issues are recorded per release on the
[releases page](https://github.com/Nowely/codex-delegate/releases); the codex build each release was
measured against is stated there, because that axis — not the skill's own code — is what usually
breaks. MIT — see [LICENSE](LICENSE).
