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
- **Node 18+.** No dependencies: the driver is one file importing only `node:` builtins (exercised on 24.x).
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
node evals/fidelity.test.mjs   # does the fixture still match YOUR codex?
```

The third is the one to watch after a `codex` upgrade: it performs a real handshake and diffs it
against the fixture, so protocol drift shows up as a failing case instead of a confident wrong answer.

## First run

```bash
node skills/codex-delegate/scripts/driver.mjs --cwd . --brief \
  --prompt 'TASK: describe this repository in two sentences, after listing its files.
CHECK: name three real files.
RETURN: the two sentences.'
```

The JSON report (the default) ends with the verdict: `exitCode: 0` means the turn completed, every
declared check passed, and a command really ran — unless `--allow-no-commands` waived exactly that last
clause. `threadId` continues the conversation via `--resume`. `receiptPath` points at the rollout under
`~/.codex/sessions`, and `receiptOk` says the driver opened it and found a `session_meta` record naming
this thread; `receiptOriginator` and `receiptModelProvider` come from that record.

Inside Claude Code you rarely type this yourself: the skill's `SKILL.md` is the operating manual the
agent reads mid-task, including when to give a panel seat to Codex at all. With the plugin installed, a
seat is one native subagent call — `Agent(subagent_type: "codex-seat", prompt: "SEAT: read\nTASK: …")`
(or `agentType: "codex-seat"` inside a workflow): a pinned relay that maps the SEAT header to driver
flags, runs it once, and returns Codex's answer verbatim with the thread id and receipt, never an
answer of its own.

## Rights, per call

| Call | Codex may |
| --- | --- |
| `--cwd DIR` (read level, the default) | read any readable path, run commands, write only `$TMPDIR` — enough to run tests, never enough to touch your files |
| `--worktree REPO` | write level inside a driver-managed detached worktree; removed afterwards only when provably clean, preserved (with the reason and the removal command) otherwise |
| `--level write --cwd DIR` | write anywhere under a directory you chose |
| `+ --network` / `--writable DIR` / `--commit` | egress, an extra root, or the repository's git dir — each an explicit opt-in |

## Trust and verification

- **Exit codes from evidence.** The `codex` process always exits 0; the driver derives an ordered
  ladder of exit codes from the event stream — turn status, commands that really succeeded, a final
  answer versus commentary. `SKILL.md` documents the ladder.
- **`--verify '<shell>'`** runs after the turn, executed by the driver, invisible to the model: the one
  check the model cannot author. `--expect-command <regex>` additionally demands that the work matched
  a declared signature, and `--output-schema <file>` demands a JSON answer matching a schema — enforced
  by the server during generation, re-checked by the driver, with one corrective turn before failing.
- **Sandbox asserted, not assumed.** The rights the server reports are compared against the rights that
  were asked for — sandbox type, writable roots, network, approval policy, approvals reviewer — and a
  mismatch refuses the run instead of proceeding under an unknown sandbox.
- **A receipt per run.** `receiptPath`/`receiptOk` locate the rollout, open it, and check that its
  opening `session_meta` record names this thread — a filename match alone is as strong as `touch`.
  `receiptOriginator`, `receiptModelProvider` and `receiptCwd` come out of that record. It is evidence
  against a wrapper that forwarded the work rather than doing it; it is not evidence against one that
  fabricated the whole report, which anything writing the report could do.
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

then re-run the other two suites and re-check the parity table in `SKILL.md`.

## Layout

```
skills/codex-delegate/           the skill: SKILL.md (the operating manual), scripts/driver.mjs
                                 (one file, no dependencies, only Node builtins), references/
agents/codex-seat.md             the relay subagent the plugin ships
.claude-plugin/                  plugin + marketplace manifests
evals/                           three suites — protocol, lock, and fidelity against the live server
schema-0.150.1/                  the pinned protocol schema the driver is written against
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
