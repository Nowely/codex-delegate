# Changelog

Versions are the skill's own. The `codex` build it was measured against is a separate axis and is stated
per release, because that is what actually breaks: the app-server protocol carries no stability promise,
and `evals/fidelity.test.mjs` exists to tell you when your `codex` and this fixture have diverged.

## 0.1.0

First release. Measured on macOS with codex-cli **0.150.1**; `schema-0.150.1/` is the pinned protocol
schema it is written against.

- Two rights levels — `read` (runs commands, writes only `$TMPDIR`) and `write` (a directory you chose) —
  with `--commit`, `--writable` and `--network` as explicit modifiers.
- An exit code derived from the event stream rather than from the process status, which is always 0.
  Thirteen codes, ordered, documented in `SKILL.md`.
- `--verify`: a shell check the driver runs afterwards, which the model cannot author.
- The sandbox the server reports is asserted against what was asked for, at both levels, and so are the
  approval policy and the approvals reviewer — a clamped policy denies every command while the run still
  looks healthy.
- Three suites: `protocol` (52 cases), `lock` (25), and `fidelity` (8), the last of which handshakes
  against the real `codex` and diffs it against the test fixture.
- **A private `CODEX_HOME` per run.** Codex reads plugins, skills and memories out of it, so delegating
  into the caller's own home made every turn a function of what they had installed: of the 157 delegations
  measured on the development machine, 95 spent their FIRST tool call reading `~/.codex/plugins/cache`
  instead of the task, 209 of 919 tool calls went there, and one turn ended having only announced that it
  had to run a plugin's workflow first. `auth.json` and `sessions` stay linked to the real home, and
  `model`, `model_reasoning_effort`, `personality` and `service_tier` are carried in, so the account still
  decides who answers. `--host-home` opts out, and costs the determinism back.
- `--web-search cached|indexed|live` and `--answer-json`, closing two gaps against a Claude subagent: a
  seat could not look anything up, and its answer could not be machine-read.
- A parameter the server refuses now exits 2 with the server's own message, rather than 1 with a JSON blob
  — "fix your flag" and "the turn died" are different instructions.
- `--help`, which was previously an unknown-argument error.
