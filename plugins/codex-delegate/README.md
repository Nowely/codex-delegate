# codex-delegate

A Claude Code skill that hands coding work to Codex as a subagent, with the rights for each call declared
up front: analysis that reads and runs but writes nothing of yours, or writing and running tests inside a
git worktree.

`SKILL.md` is the operating manual the agent reads mid-task. This file is the rationale: why this exists
at all, what it replaces, and what would make it unnecessary.

## Install

Claude Code loads skills from `~/.claude/skills/<name>/`. Symlink this repository there, so the checkout
stays the single source of truth:

```bash
git clone https://github.com/Nowely/codex-delegate.git
ln -s "$PWD/codex-delegate" ~/.claude/skills/codex-delegate
```

Requirements: Node (any version with `node:` builtins — developed on 24.x) and the `codex` CLI on `PATH`.
No dependencies to install; the driver is one file and imports only Node builtins.

Verify the install, which costs nothing and calls no model:

```bash
node ~/.claude/skills/codex-delegate/evals/protocol.test.mjs   # the protocol and the result gates
node ~/.claude/skills/codex-delegate/evals/lock.test.mjs       # the cwd lock
node ~/.claude/skills/codex-delegate/evals/fidelity.test.mjs   # does the fixture still match YOUR codex?
```

The third one is the one to watch after a `codex` upgrade: it performs a real handshake and diffs it
against the fixture, so protocol drift shows up as a failing case rather than as a confident wrong answer.

## Layout

```
scripts/driver.mjs    the driver: one file, no dependencies, only Node builtins
SKILL.md              the operating manual the agent reads mid-task
references/           the depth SKILL.md points at rather than carrying
evals/                three suites — protocol, lock, and fidelity against the live server
schema-0.150.1/       the pinned protocol schema the driver is written against
```

## Scope, honestly

Developed and measured on **macOS with codex-cli 0.150.1**, and on nothing else. Linux should work — the
driver uses only portable Node APIs — but no one has run it there, and two of its guards
(`O_NOFOLLOW`/`O_NONBLOCK` on the lock file, `os.userInfo()` for the home anchor) are exactly the kind of
thing that behaves differently elsewhere. The pinned `schema-0.150.1/` is 94% of this repository by size
and is generated output, not hand-written.

Seven adversarial review passes ran against this code. They found, among other things, a live sandbox
bypass that granted write access to the whole home directory, and a broken mutual-exclusion guarantee that
put three concurrent writers in one worktree. Both are fixed and pinned by tests. Draw the obvious two
conclusions: the checks here exist because they were needed, and a codebase this young has more.

## Why it exists

The official `openai-codex` plugin for Claude Code is architecturally the same idea and is richer —
background jobs, session resume, a job index, a stop-time review gate. What it cannot do on this machine is
give a delegated seat the rights it needs, or tell you when it failed to.

An earlier version of this file said the plugin "cannot execute a single command". That was too strong, and
measuring beats remembering: in a review delegation observed on 2026-08-30 the plugin ran 15 commands and
had 18 fail. It executes. The problem is narrower and worse for being narrower — see below.

It hardcodes the approval policy at [`codex.mjs:67`](https://github.com/openai/codex-plugin-cc/blob/db52e28f4d9ded852ab3942cea316258ae4ef346/plugins/codex/scripts/lib/codex.mjs#L67) and [`:80`](https://github.com/openai/codex-plugin-cc/blob/db52e28f4d9ded852ab3942cea316258ae4ef346/plugins/codex/scripts/lib/codex.mjs#L80), pinned here to v1.0.6:

```js
approvalPolicy: options.approvalPolicy ?? "never",
```

A managed configuration profile at `/Library/Managed Preferences/com.openai.codex.plist` (root-owned,
pushed by device management) restricts what is allowed:

```toml
allowed_approval_policies = ["untrusted", "on-request"]
allowed_sandbox_modes    = ["read-only", "workspace-write"]
```

`never` is not in that set, so Codex clamps it and says so:

> Configured value for `approval_policy` is disallowed by requirements; falling back to required value
> UnlessTrusted. Details: invalid value for `approval_policy`: `Never` is not in the allowed set
> [UnlessTrusted, OnRequest] (set by MDM com.openai.codex:requirements_toml_base64)

Under `untrusted`, commands, reads and writes raise approval requests. The plugin's app-server client
answers them with a JSON-RPC `-32601`, which Codex reads as a refusal (upstream `#499`); the job log shows
`File changes declined.`, and the run still exits 0.

The second failure is the one that actually decides this, and it is structural rather than environmental.
The plugin sends an explicit `sandbox` on every `thread/start` — `sandbox: request.write ?
"workspace-write" : "read-only"` at [`codex-companion.mjs:491`](https://github.com/openai/codex-plugin-cc/blob/db52e28f4d9ded852ab3942cea316258ae4ef346/plugins/codex/scripts/codex-companion.mjs#L491) — and sending that parameter at all
**suppresses any permission profile**, which is the only mechanism that can add `$TMPDIR` to a read-only
sandbox. Measured three ways with a raw JSON-RPC probe: omit the parameter and a configured profile applies
(`writableRoots: ["$TMPDIR"]`); send `"read-only"` and `activePermissionProfile` comes back `null` with no
writable roots at all; send `"workspace-write"` and the profile is suppressed too, but `$TMPDIR` and `/tmp`
are both open.

So a review seat launched through the plugin cannot create a temp directory, and therefore cannot run a
test suite, a build, or anything that stages a file. Observed: `EPERM: operation not permitted, mkdtemp`,
and the seat reviewed the code by reading it while the Claude seats beside it ran the suites — a
decorrelated opinion bought and a crippled one delivered. No flag reaches this: the plugin's whole surface
is `[--background] [--write] [--resume-last|--resume|--fresh] [--model] [--effort]`, and the suppression is
caused by the parameter it always sends, not by a setting anyone can change.

The failure is silent where it counts: a review comes back with a confident verdict having run nothing. The
greppable fingerprint is `(exit ?)` in `~/.claude/plugins/data/codex-openai-codex/state/*/jobs/*.log` — it means
Codex ran no commands at all and answered from the prompt alone.

This is not a session artifact. Reproduced in a clean process with an empty environment:

```
$ env -i HOME=$HOME PATH=... codex exec -c approval_policy=never --skip-git-repo-check -C /tmp 'Reply OK'
approval: untrusted
```

## Is the plugin still worth keeping?

For a seat you intend to trust, no. It runs commands, and it runs many of them successfully — but it
cannot be given the rights a seat needs, and it does not tell you when it was denied them. A review
delegation that could not create a temp directory still returned a confident verdict and exited 0. Its
extra machinery (background jobs, resume, the stop gate) is genuinely good and sits on top of a rights
model with no dial on it.

Nothing here modifies the plugin. Patching `?? "never"` to `?? "on-request"` in the plugin cache does work
— it was measured — but the cache is overwritten on every plugin update, and a fix that silently reverts
is worse than no fix.

## Why not one of the existing skills

Every Claude-to-Codex delegation skill surveyed drives `codex exec`: `skills-directory/skill-codex`
(~1400 stars), `eddiearc/codex-delegator`, `wywwzjj/cc-skill-codex`, `veithly/codex-skill`, and the MCP
wrappers around it. `codex exec` forces `approval_policy=Never` internally, after config is loaded, so it
hits the same clamp — and no `-c` override reaches it. Three spellings were tried; all produced
`approval: untrusted`.

OpenAI's own recommendation does not help either. The docs say to use the Codex SDK for automation, but
`@openai/codex-sdk` builds `["exec", "--experimental-json"]`, so it is an `exec` wrapper and inherits the
same wall.

That leaves `codex app-server`, which accepts a per-thread `approvalPolicy` — and `on-request` is one of
the two policies the profile permits. It is not gold-plating; it is the only door.

## The three surfaces, measured

| | `codex exec` | `codex mcp-server` | `codex app-server` |
| --- | --- | --- | --- |
| status | stable | stable, not measured here | `[experimental]` per `codex --help` |
| per-call approval / sandbox | no — forces `never` | yes | yes |
| works under the profile | no | yes | yes |
| proof a command really ran | `--json` | not exposed | `exitCode` + `status` |
| structured output | `--output-schema` | no | `outputSchema` |

`app-server` is the only one with both per-call rights and a machine-checkable execution signal. It is
also what the official plugin uses, so it is de facto the integration path despite the label.

## What this does that the analogues do not

**Rights declared per call, not once per session.** Two levels plus modifiers, chosen at each invocation,
so a review cannot write and a fix-the-tests run cannot touch the main working tree. This mirrors the shape
of Claude's own subagents rather than inventing a ladder: a reader that may still run things, a writer
confined to a directory the coordinator picked, and explicit opt-ins for network, extra roots and commits.

**An honesty gate, and an honest account of its limits.** The process exit code is always 0, even when
nothing ran, so success is derived from the event stream: the turn's own status, a command that reached
exit 0, and a final answer rather than commentary. Events still cannot show that the *right* command ran —
Codex opens most turns by reading its own documentation, which satisfies any generic check — so the caller
can declare the evidence with `--expect-command`. A regression suite drives the driver against a scripted
server through every ordering that once produced a false success.

**Worktree parity.** Codex gets the same isolation Claude's own worktree subagents get, installs its own
dependencies, runs the suite — including browser-mode tests, which need a Chromium flag to survive the
sandbox. The coordinator owns the worktree and its removal, because a finished worktree still holds work
worth harvesting.

**Rounds addressed by id.** Every run prints its thread id and `--resume <id>` continues it. The
common alternative, `resume --last`, resolves to the newest session in the current directory and races
when two rounds run against the same repo.

**Standing rules on the thread.** Unattended operation, local shell only, no web search, and an explicit
blocked-command token live in `developerInstructions` at thread start, so they govern every turn of a
resumed thread instead of competing with the task text. `codex exec` has no equivalent.

## What it cannot do

The read level cannot run browser-mode tests: vitest's server binds loopback TCP and the profile refuses it.
Node-environment test projects *do* run there, but only with `--configLoader runner` — the exact invocation
is in `SKILL.md`, which owns every operational detail. Browser-mode tests at write level need a Chromium
flag that caps the run at one browser context and forces serial execution. Concurrency is memory-bound;
exceeding the budget does not degrade gracefully, the OS starts killing runs.

## What would make this obsolete

Upstream changes that would retire parts of this, all open as of 2026-08-30:

- `openai/codex-plugin-cc#426` (PR) passes `on-request` for write-capable runs. It would not be enough on
  its own — the read paths still send `never`.
- `#482` is the exact mechanism above: "the plugin sends an explicit `sandbox` value on every
  `thread/start`, so the `sandbox_mode` a user configured never applies", citing the same lines. Open since
  2026-07-12, last touched 2026-07-28. **Its fix was written and then dropped**: PR `#508` stopped sending
  the hardcoded value, was verified by a third party on Windows, and was closed unmerged on 2026-08-11.
  Every participant on both threads is `NONE` — no maintainer has engaged, and 2 of the last 40 closed PRs
  were merged. Do not plan around this landing.
- `#273` is the same worktree-commit failure this skill solves with an explicit git-dir writable root.
- `#499` and `#641` describe this wall from the other side: the plugin's app-server client stubs every
  server-to-client request with `-32601`, so approvals and MCP elicitations are auto-rejected. That is why
  the plugin's runs die without executing — answering those requests is most of what the driver here does.

A merged `#426` plus a merged successor to the closed `#508` is the day the write path can go back to the
plugin. None of them mentions the managed-profile case, which is strictly broader than what is reported;
filing it is worth doing and has not been claimed.

## Version surface

Everything here is pinned to one codex build. `schema-<version>/` holds the generated protocol schema and
is the reference the driver's protocol handling is written against — three defects were found by checking
the code against it rather than against prose. The app-server protocol carries no stability promise and
the generated schemas are explicitly version-specific, so after upgrading codex, regenerate:

```bash
codex app-server generate-json-schema --out schema-<new-version>/
```

then re-check the approval response shapes, the turn status values and the message phases, and re-run the
parity table in `SKILL.md`. The browser-test workaround in particular rests on a detail of the embedded
sandbox profile and could stop being necessary — or stop working — in either direction.
