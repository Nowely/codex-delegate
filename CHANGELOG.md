# Changelog

Release history is derived from the tagged git log. Dates are the tagged commit dates; detailed
forensics remain in the repository references and release notes.

## Unreleased

### Compatibility notes

- Refuse `--json` and `--footer` as unknown flags. The JSON report is the only report; the footer is
  gone.
- Show coordinator-facing flags under `--help`; use `--help-all` for every flag, the
  `CODEX_DELEGATE_*` variables, and internals.
- Keep the header-field table in `SKILL.md`. The relay names only `SEAT` and remains a mechanical
  transport.
- Correct the 0.8.0 relay measurement: the runs reported as haiku on 2026-09-03 were not verified by
  model id. The shipped agent's `model: sonnet` frontmatter overrides `claude -p --model haiku`, whose
  transcript shows `claude-sonnet-4-6`. A real haiku, selected through a copy with `model: haiku` or
  the Agent tool's model option, ignored the relay contract in four of four runs and answered the task
  itself on both the a156c52 body and the new one. Measure a lower model through a copy with its own
  model line; keep the shipped relay pinned to sonnet.

### Documentation

- Consolidate the 11 reference files into six. Move `lock-internals.md`,
  `commit-blast-radius.md`, and `config-drift.md` into `environment-and-internals.md`; move
  `browser-tests.md` and `pasted-images.md` into `parity.md`.

## 0.8.0 — 2026-09-03

Measured against codex-cli 0.150.1 on macOS (Node 24.11; the free suites on Linux and macOS, Node 18 and 24, in CI). Three commits since 0.7.0: the simplification round.

This simplification round removes coordinator decisions that had defaults and moves the relay
transport into the driver.

### Compatibility notes

- Removed the token budget, its steering and cut mode, and the report's `budget` key. The native limits
  remain 900 seconds of thread silence and 1,000 commands, with no wall clock unless the caller sets one.
- Reduced the seat-file vocabulary from 23 fields to 15. Bounds and transport are command-line-only;
  naming a removed field is exit 2 with the flag to use.
- Made read-level `--cwd` optional. An unset `TMPDIR` no longer exits 2: the driver creates a private
  0700 `<state>/tmp/<runId>`, grants exactly that, reports it as `tmpDir`, and prunes it with run state.
- Seat-file header names are case-sensitive upper-case names at column 0. A blank, comment, or other
  non-field line ends the header; `TASK:`, `CHECK:`, and `RETURN:` always open the body. Files are capped
  at 512 KB, and a review declaration cannot also carry a body.
- Removed the `npx skills` install route: it shipped the skill without the `codex-seat` relay agent.
  Install the plugin, or clone and symlink.
- Replaced the relay's three return shapes with one envelope, rendered by the driver: `exitCode` first,
  `--- answer (N bytes) ---` last. `exitCode: null` is the relay's own shape only when the driver could
  not start or could not run to completion.
- Made seven header fields exit 2 in a seat file: `TIMEOUT`, `IDLE_TIMEOUT`, `MAX_COMMANDS`, `DETACH`,
  `WAIT_TIMEOUT`, `COLLECT`, `PROGRESS`. The flags themselves stay.

### Relay

- Added `--relay <file>` and `--relay-collect <threadId>`. The driver launches one detached seat, waits,
  and renders one text envelope under the run's own exit code; a running envelope includes the complete
  collection command to repeat.
- A wrapper now writes ONE file containing header plus prompt, then chooses `--relay` for the envelope or
  `--seat-file` for JSON. Through `--relay`, a file without `SEAT` defaults to a read seat in the current
  directory; `--seat-file` still requires `SEAT`.
- Reduced the shipped agent to three mechanical steps: write the prompt verbatim, invoke `--relay`, and
  return its output verbatim. It repeats the driver's collection command at most 24 times and has one
  failure envelope.

### Documentation and evidence

- Reduced `SKILL.md` to the relay route, composition, rights, result reading, worktree lifecycle, prompt
  shape, and surviving traps; conditional operation remains in focused references.
- Re-measured the final relay body: sonnet passed the header-less, refused-write, and repeated-collection
  cases 3/3. Haiku relayed envelopes and collection commands but still added fields to header-less prompts,
  so the relay remains pinned to sonnet.

## 0.7.0 — 2026-09-02

Measured against codex-cli 0.150.1 on macOS (Node 24.11; the free suites also on Node 20.10).
Thirteen commits since 0.6.0: a five-goal review of the plugin (59 confirmed findings, each package
goal-checked before its commit) and the design for GitHub issue #1.

### Compatibility notes

- `--timeout` defaults to 0: no wall clock. A turn is bounded by `--idle-timeout` (900 s of silence)
  and `--max-commands` (1000); a caller that declared a clock keeps today's three-rung behaviour.
- The relay (`codex-seat`) runs every seat detached and repeats `--wait` until the report is final;
  its header is optional, `BRIEF` is no longer forced on read seats, and a `TIMEOUT` above 560 is no
  longer refused. Under a plugin install the agent is `codex-delegate:codex-seat`.
- Exit 11 now also covers a command that reached the client with no verdict; the probe exemption is
  judged on the command the server parsed, so a no-match `grep` no longer raises it. A verifier whose
  output overran the old 64 MB buffer used to exit 12; output is streamed now and a loud verifier that
  exits 0 passes.
- Report shape: `commands[]` entries carry `actions`; new keys `cut`, `timing`, `budget`,
  `answerPartial`, `commentaryPath`, `configInherited`, `codexVersion`, `commandsPipedToPager`,
  `verify.budgetMs/timedOut/sandboxed`, `resumedFrom`, `worktreeBase/worktreeRestored`, `rateLimits`,
  `turnDiffPath`, `driverVersion`.
- The lock body and the worktree ledger record a second identity and the app-server's process group;
  entries written by older drivers stay honoured.
- `npm test` replaces the six per-suite commands; `evals/lib/harness.mjs` is shared by every suite;
  the driver exports its constants and runs `main()` only as the entry point.
- Known issues: Node 18 is declared but not measured locally (CI is the first run); the relay's
  plugin-install route and the `TASK:` line fix are pinned by the contract suite but not re-measured
  live since the last body change; Linux is measured only by CI's free suites.

### Relay

- Made the header optional, preserved `TASK:` in the body, resolved the driver across install routes,
  returned the complete report envelope and verbatim answer, and distinguished gate verdicts from runs
  that never started.

### Documentation

- Rebuilt the skill as a compact Agent Skills entrypoint, added focused parity and incident references,
  and stated the governing goal: a native-style one-call subagent with nothing to configure.

### Evidence path

- Classified parsed command actions rather than shell wrappers, restored real negative-probe handling,
  treated unknown command verdicts as exit 11, aligned review shapes with the live server, and added a
  live-turn fidelity path.

### Robustness

- Hardened signal teardown, stdout framing and draining, config inheritance, lock identity, seat-file
  booleans, steering claims, protected roots, and verifier process groups; streamed verifier output and
  added the read-profile sandboxed verifier.

### Worktree lifecycle

- Made driver-owned git immune to hooks, fsmonitor, text conversion, and external diffs; recorded intent
  before checkout, retained refs before cleanup, reaped abandoned MCP homes, and allowed finished
  worktree threads to resume by rebuilding their harvested content.

### Issue #1

- Preserved answers at a caller-declared wall-clock cut with wrap-up steering, interrupt grace, partial
  capture, and timing; added token and silence bounds.
- Added detached seats and `--wait`, `--wait-timeout`, `--jobs`, and `--cancel`, plus relay fields
  `DETACH`, `WAIT_TIMEOUT`, and `COLLECT`. Job records expose mid-flight progress; `endedAt` follows the
  completed report. Locks and worktree ledgers retain `appServerPgid` and are reclaimed only after both
  driver and app-server group are gone.
- Changed native defaults to no wall clock, 15 minutes of silence, and 1,000 commands. The relay detaches
  and waits repeatedly so one Agent call lasts as long as the work.

### Parity

- Added fork, model/effort catalogue preflight, rate-limit snapshots, compact continuation, turn diffs,
  reasoning-summary control, MCP-server subsets, strict adversarial review, and an opt-in stop-time gate.

### Structure and CI

- Added `npm test` over seven suites, a shared harness, exported driver constants, generated help and
  exit-ladder text, package/version agreement checks, and CI for the six free suites across Linux and
  macOS on Node 18 and 24. Added `--allow-failed-commands` for expected probe failures.

## [v0.6.0] — 2026-09-01

- Completed a documentation-only best-practice pass: corrected eleven drifted claims, reduced the
  entrypoint, defined terms, and moved conditional detail into focused references.
- Documented the non-zero-result trap, pasted-image handling, and relay-agent precision without
  changing the driver.
- Added license metadata to the plugin manifest and tightened the shipped relay-agent contract.

## [v0.5.0] — 2026-09-01

- Added driver-owned worktree harvest and disposal, including staged work, untracked archives, crash
  ledger reconciliation, and retained refs for clean seats that commit.
- Added attachments, pasted-image relay, progress, job records and `--resume last`, native review,
  live steering, and optional isolated MCP-server carry-through.
- Added bounded transient retry, clean interruption, richer activity reporting, two contract suites,
  and extensive corrections from independent review.
- Measured `codex mcp-server` against this driver and documented why it is still not a substitute.

## [v0.4.0] — 2026-09-01

- Hardened seat files: `SEAT` must be first, relayed `VERIFY` needs command-line authorization, and
  declared fields are reported.
- Made strict output schemas an admission rule, made an unmeasured verifier exit 12, and validated
  rollout receipts by opening their `session_meta` record.
- Added a `SIGHUP` handler and a full report on every signal, protected relocated state and worktree
  destinations, and isolated eval state. This release changed the signal, seat-file verifier, and
  strict-schema contracts.
- Corrected lock, token, verifier, answer-log, worktree, and protected-root documentation; added the
  coordinator-side background-load warning.

## [v0.3.0] — 2026-08-31

- Shipped the repository as a Claude Code plugin with the `codex-seat` relay agent.
- Added `--seat-file` so wrappers pass literal fields instead of interpolating user values into a shell
  command; unknown and repeated fields are rejected.
- Added identity-based root guards, strict schema-verdict handling, and report integrity after a refused
  retry, with adversarial contract tests.

## [v0.2.0] — 2026-08-31

- Made the driver wait for its child process group and own the managed-worktree lifecycle.
- Added rollout receipt location (`receiptPath`, `receiptOk`) and made JSON the default report output.
- Reworked installation and operating documentation, moving incident and plugin forensics into
  references and reducing the skill entrypoint.

## [v0.1.0] — 2026-08-31

- Introduced the one-file Node app-server driver with per-call read/write rights, worktree support,
  cwd locking, evidence-derived exit codes, and commit/network controls.
- Added private `CODEX_HOME` isolation while inheriting resolved model, effort, personality, and service
  tier through `config/read`.
- Added web-search modes, JSON answers, answer logging, protocol and lock suites, and the first
  fidelity suite against codex-cli 0.150.1.
- Reshaped the returned report to match subagent handoff needs, capping the inline answer while the
  full text stays at `answerPath`.

[v0.6.0]: https://github.com/Nowely/codex-delegate/compare/v0.5.0...v0.6.0
[v0.5.0]: https://github.com/Nowely/codex-delegate/compare/v0.4.0...v0.5.0
[v0.4.0]: https://github.com/Nowely/codex-delegate/compare/v0.3.0...v0.4.0
[v0.3.0]: https://github.com/Nowely/codex-delegate/compare/v0.2.0...v0.3.0
[v0.2.0]: https://github.com/Nowely/codex-delegate/compare/v0.1.0...v0.2.0
[v0.1.0]: https://github.com/Nowely/codex-delegate/releases/tag/v0.1.0
