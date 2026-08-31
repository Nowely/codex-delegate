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
- Three suites: `protocol` (59 cases), `lock` (32), and `fidelity` (10), the last of which handshakes
  against the real `codex` and diffs it against the test fixture.
- **A private `CODEX_HOME`**, one directory shared by every run rather than a fresh one per turn. Codex
  reads plugins, skills and memories out of it, so delegating
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

### Known issues

Found by the final adversarial pass and recorded rather than fixed: an independent judge reproduced each
and ruled none a must-fix. Seven earlier passes each found defects only in code written during or just
after them, so another repair-and-recheck round is known not to converge — these are the starting list for
the next one.

- Config inheritance follows an ambient `CODEX_HOME` if the caller has one exported, so model and effort
  come from that home while credentials and the rollout come from the passwd home. The `--json` report's
  `model` and `reasoningEffort` name what actually ran; the human footer prints neither.
- At `--level read`, a `--cwd` that lives under `$TMPDIR` is writable. The precise rule in `SKILL.md`
  says so; the plain-language gloss "the repo stays unwritable" does not. `sandbox.writableRoots` in every
  report is authoritative.
- No test covers the verify-exit-126 branch. Deleting it keeps every suite green while a non-executable
  verifier would report exit 9, "the work failed", instead of 12, "fix the verifier".
- The fidelity suite checks only the first occurrence of a repeated `-c` flag, so an added later one can
  still leave all ten cases agreeing.
- `--writable` accepts `~/.codex`, `~/.codex/sessions` and `~/.codex-delegate`; only `~` itself is
  refused. The receipt's unforgeability rests on the caller not naming those three paths.
- The exit-0 footer prints "NOT TRUSTWORTHY: no command executed" even when `--allow-no-commands` waived
  exactly that clause, and when a command ran and failed — it should say "no command succeeded". The exit
  codes themselves are right.
- `--timeout` overshoots the wall clock by roughly 1–5 s, because the config probe is spent before the
  deadline is armed. Unterminated probe output is unbounded: a 96 MiB write took driver RSS from 52 to
  387 MB.
- On SIGTERM the process-group kill is attempted twice and a misleading config warning is emitted. A
  `config: []` reply downgrades settings without saying so, and JSON-RPC error warnings discard the
  probe's stderr.
- `~/.codex-delegate/answers/` grows without bound and no document mentions pruning it.
- The exit-3 footer omits `SKILL.md`'s own warning that a timeout is the case most likely to leave a
  half-written tree.

### What no pass attacked

The honest ceiling on the verdict above. `evals/fake-app-server.mjs` is the oracle for all 91 protocol and
lock assertions, and only `fidelity` checks it against the real server — a wrong model there makes every
suite agree wrongly together. The two suites' own assertions were used as mutation detectors but never
questioned. Four of the five `references/*.md` are unread. Nobody has installed this on a clean machine.
And within `driver.mjs`, resume, `--ephemeral`, answer truncation and the stdout drain path were never
targeted.
