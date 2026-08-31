# codex-delegate

A Claude Code skill that hands coding work to OpenAI Codex as a subagent, with the rights for each call
declared up front: analysis that reads and runs but writes nothing of yours, or writing and running
tests inside a git worktree the driver manages itself. Every run leaves a receipt no intermediary can
forge, and the exit code is derived from what actually happened rather than from a process status that
is always 0 — so a seat that did nothing cannot report as though it had.

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

Via the [`skills` CLI](https://github.com/vercel-labs/skills) (directory: [skills.sh](https://skills.sh)):

```bash
npx skills add Nowely/codex-delegate -g -a claude-code
```

`-g` installs user-wide into `~/.claude/skills/`; drop it for a project-local install. Or from source —
clone and symlink, so the checkout stays the single source of truth:

```bash
git clone https://github.com/Nowely/codex-delegate.git
ln -s "$PWD/codex-delegate" ~/.claude/skills/codex-delegate
```

Verify the install — costs nothing, calls no model:

```bash
node ~/.claude/skills/codex-delegate/evals/protocol.test.mjs   # the protocol and the result gates
node ~/.claude/skills/codex-delegate/evals/lock.test.mjs       # the cwd lock and the worktree lifecycle
node ~/.claude/skills/codex-delegate/evals/fidelity.test.mjs   # does the fixture still match YOUR codex?
```

The third is the one to watch after a `codex` upgrade: it performs a real handshake and diffs it
against the fixture, so protocol drift shows up as a failing case instead of a confident wrong answer.

## First run

```bash
node ~/.claude/skills/codex-delegate/scripts/driver.mjs --cwd . --brief \
  --prompt 'TASK: describe this repository in two sentences, after listing its files.
CHECK: name three real files.
RETURN: the two sentences.'
```

The JSON report (the default) ends with the verdict: `exitCode: 0` means the turn completed, a command
really ran, and every declared check passed; `threadId` continues the conversation via `--resume`; and
`receiptPath` points at the rollout under `~/.codex/sessions` — the proof the turn really ran, carrying
the originator, the model provider and the whole transcript.

Inside Claude Code you rarely type this yourself: the skill's `SKILL.md` is the operating manual the
agent reads mid-task, including when to give a panel seat to Codex at all.

## Rights, per call

| Call | Codex may |
| --- | --- |
| `--cwd DIR` (read level, the default) | read any readable path, run commands, write only `$TMPDIR` — enough to run tests, never enough to touch your files |
| `--worktree REPO` | write level inside a driver-managed detached worktree; removed afterwards only when provably clean, preserved (with the reason and the removal command) otherwise |
| `--level write --cwd DIR` | write anywhere under a directory you chose |
| `+ --network` / `--writable DIR` / `--commit` | egress, an extra root, or the repository's git dir — each an explicit opt-in |

## Trust and verification

- **Exit codes from evidence.** The `codex` process always exits 0; the driver derives thirteen ordered
  codes from the event stream — turn status, commands that really succeeded, a final answer versus
  commentary. `SKILL.md` documents the ladder.
- **`--verify '<shell>'`** runs after the turn, executed by the driver, invisible to the model: the one
  check the model cannot author. `--expect-command <regex>` additionally demands that the work matched
  a declared signature.
- **Sandbox asserted, not assumed.** The rights the server reports are compared against the rights that
  were asked for — sandbox type, writable roots, network, approval policy, approvals reviewer — and a
  mismatch refuses the run instead of proceeding under an unknown sandbox.
- **A receipt per run.** `receiptPath`/`receiptOk` in every report locate the rollout; a wrapper that
  forwarded the work instead of doing it has no thread id to give.
- **Isolation by default.** Runs use a private `CODEX_HOME`, so your plugins, skills and MCP servers
  stay out of the turn and no trust records are written back; `--host-home` opts out.

## Why not the official plugin

The official `openai-codex` plugin is architecturally the same idea and richer in places — background
jobs, resume UX, a stop-time review gate. It is not a substitute where rights matter: it hardcodes an
approval policy that managed (MDM) machines clamp into deny-everything, and it always sends an explicit
`sandbox` parameter, which suppresses the permission profile that makes read-level test runs possible —
on every machine, managed or not. Both defects are silent: the run still exits 0. The `codex
exec`-based skills and the official SDK hit the same walls. Full forensics, upstream issue state, and
what the plugin does better: [references/why-not-the-plugin.md](references/why-not-the-plugin.md).

## Limitations

Read level cannot run browser-mode tests (vitest's server binds loopback TCP; the profile refuses it) —
they run at write level with a one-file Chromium workaround
([references/browser-tests.md](references/browser-tests.md)). Node-environment vitest at read level
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
SKILL.md              the operating manual the agent reads mid-task
scripts/driver.mjs    the driver: one file, no dependencies, only Node builtins
references/           the depth SKILL.md points at rather than carrying
evals/                three suites — protocol, lock, and fidelity against the live server
schema-0.150.1/       the pinned protocol schema the driver is written against
```

## Status

Young code, adversarially reviewed: nine review passes by mixed Claude/Codex panels, which found —
among other things — a live sandbox bypass and a broken mutual-exclusion guarantee, both fixed and
pinned by tests. Changes and known issues are recorded per release on the
[releases page](https://github.com/Nowely/codex-delegate/releases); the codex build each release was
measured against is stated there, because that axis — not the skill's own code — is what usually
breaks. MIT — see [LICENSE](LICENSE).
