# Changelog

Release history is derived from the tagged git log. Dates are the tagged commit dates; detailed
forensics remain in the repository references and release notes.

## Unreleased

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
