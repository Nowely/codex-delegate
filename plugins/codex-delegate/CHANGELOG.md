# Changelog

Hand-written per release from the tagged git log. Dates are the tagged commit dates; detailed
forensics remain in the repository references and release notes.

## 0.11.0 — 2026-09-08

Measured against codex-cli 0.153.4 on macOS. An orchestrated review on 2026-09-08 — two scouts, five
reviewers, three cross-side refuters, a judge and a completeness critic, half of them Codex seats — made
124 findings, of which 96 survived refutation and 27 were ranked for work. This release is that work: a
Codex seat is now a direct background call of the driver, and the flags no live run had used are gone.

### Compatibility notes

- The `codex-seat` agent and the whole relay and detach transport are retired: `--relay`,
  `--relay-collect`, `--detach`, `--run-dir`, `--wait`, `--wait-timeout`, `--jobs`, `--cancel`,
  `CODEX_DELEGATE_RELAY_WAIT_S`, the text envelope, the progress heartbeat, the `runs/` directory family
  and the launch handshake. Launch a seat directly instead, in a background Bash task:
  `node driver.mjs --seat-file <prompt> --report-file <report>`, and read that file when the task's exit
  notification arrives. A run no longer survives its caller and there is no collector; stop a seat by
  stopping its task, or by signalling the pid the driver announces on its first stderr line. `jobs/*.json`
  remains, private, as what `--resume last` and a worktree rebuild need, and loses its obsolete keys the
  first time this driver rewrites it.
- `--report-file FILE` is new, and is the delivery that counts: an absolute path whose parent exists and
  which does not exist yet, each of those exit 2 before anything is spawned, written to a sibling at 0600
  and published by rename before stdout, so a broken pipe neither loses the report nor changes the
  verdict. A refusal reached before the turn — a usage error, an abort, a signal — writes
  `{ok:false, exitCode, threadId, turnStatus:null, answer:"", error, reportPath}` to the same path, so a
  missing file means unknown and never success. It is command-line-only: `REPORT_FILE:` in a header is
  exit 2 naming the flag.
- Removed, unused in 177 live runs: `--fork`, `--fork-through`, `--compact`, `--reasoning-summary`,
  `--mcp-server`, `--ephemeral`, `--steer-file` and `--progress`; native `--review` with its `REVIEW:`
  field; `--mcp` with its per-run private home; `--commit` with its `COMMIT:` field; and
  `scripts/stop-gate.mjs` with `CODEX_DELEGATE_STOP_GATE`. `thread/fork`, `thread/compact/start` and
  `review/start` are no longer sent, `thread/start` carries no `ephemeral` and `turn/start` no `summary`,
  and the report drops `forkedFrom` and `forkedThrough`. A retired flag is an unknown argument and a
  retired field an unknown header line; both are exit 2 naming the line or the flag.
- A Codex seat cannot commit at all. `--commit` granted the git common dir that a linked worktree needs
  to commit, and without it `git commit` inside the seat's sandbox fails at
  `index.lock: Permission denied` (measured). A worktree seat's work comes back as `worktreeDiffPath`
  and `worktreeUntrackedPath`; `worktreeCommitsRef` is still harvested and is now populated only where
  the caller's own `--verify`, which runs unsandboxed, committed.
- A seat that needs MCP tools uses `--host-home`, which brings the caller's whole configuration with
  them. The isolated home is one shared directory unconditionally: `<state>/homes/` is neither created
  nor reaped, and no `[mcp_servers]` table of the caller's is copied anywhere.
- Exit rung 11 (`COMMAND_FAILED`) is retired, and the code stays unallocated rather than free: a
  completed turn that answered exits 0 however many of its commands failed. `commandsFailed`,
  `commandsBlocked`, `commandsProbeNegative`, `fileChangesFailed` and `commandsPipedToPager` stay in the
  report, and `--expect-command` (exit 5) and `--verify` (9, or 12 when it could not be measured) are the
  gates that judge. `--allow-failed-commands` and `ALLOW_FAILED_COMMANDS:` waived that rung and only it,
  so both are exit 2.
- `--resume last` names the run most recently STARTED for this `--cwd`, or with `--worktree` this
  repository — not the one most recently written to, so a long seat still running no longer outranks a
  shorter one begun after it and already finished. A newest run that is still running is exit 10 as
  before.
- A relative `CODEX_DELEGATE_STATE_DIR` is exit 2 at parse time. It used to be accepted, and the answer
  log and turn diff answered a bad root by silently dropping the artefact.
- A `--seat-file` with no header at all is a read seat in the current directory, which is the default
  `--relay` used to supply. Where a header exists, `SEAT` is still required and still first.
- `schema-0.153.4/` tracks only the 15 files `evals/conformance.test.mjs` loads, down from 304. The full
  generated tree is the annotated tag `schema-0.153.4-full`, and README › After a codex upgrade diffs the
  next regeneration against that tag.
- The driver exports `EXIT`, `FIELDS`, `LADDER`, `PINNED_CODEX`, `SEAT_FIELDS`, `VERSION` and `lockKey`.
  `ATTACH_KINDS`, `EFFORTS`, `LEVELS`, `STATE_SUBDIRS`, `WEB_SEARCH` and `helpText` had no reader
  anywhere and are no longer exported.

### Fixed

- Every zsh here-document in a seat failed with "can't create temp file for here document": zsh keeps the
  document under `TMPPREFIX`, default `/tmp/zsh`, which no grant covers. Measured in 15 rollouts between
  2026-08-31 and 2026-09-08. The app-server is now spawned with `TMPPREFIX` under the run's own `TMPDIR`,
  and a live seat proved it.
- Concurrent first runs against a fresh state directory could refuse with "exists but is not a symbolic
  link": `readlink` answers a transient `EINVAL` while a peer replaces the link by `rename`. The driver
  re-checks with `lstat` and re-links atomically; 3840 synchronised first links after the fix, no loser.
- The worktree ledger is written by temp+rename; an unparsable entry is quarantined as `<name>.json.bad`
  instead of deleted, so the tree it names survives; a ledger that cannot be written refuses the run
  before `git worktree add`; a re-harvest that takes nothing removes the previous turn's `.diff` and
  `.untracked.tgz` and says so; harvest diffs go through temp+rename; and `ps`, `plutil` and the harvest
  `tar` now carry the timeout git already had.
- A resumed thread kept the previous run's `endedAt`, which is what the busy-thread refusal reads, so a
  second seat could be waved onto a live thread. The closing fields are reset when a run starts.
- A job record closed on the broken-pipe path keeps `receiptOk`, the command counts and the verify and
  cut summaries.
- `run-all` fails on a signal-killed suite (a killed child reports `code` null, and `process.exit(null)`
  exits 0) and no longer counts a skipped or unparsed suite as green; the harness has a `skip(reason)`
  sentinel that prints its reason and is named in the summary. `package.test.mjs` is green from an
  installed plugin root, where there is no git metadata, and compares the version only against a `v*` tag
  on `HEAD`. `conformance.test.mjs` asserts that the schema directory it loads is the one `PINNED_CODEX`
  names (`CODEX_DELEGATE_SCHEMA_DIR` overrides it during an upgrade) and validates JSON-RPC error
  responses. An unknown scenario name is now fatal in the fixture instead of answered with a success.

### Changed

- The orchestrate page prefers background Agent calls, one notification per seat, over a Workflow, which
  reports nothing until its last agent returns (measured 2026-09-08: a seat's exit at minute 9 surfaced
  only when the user asked, while its sibling ran 18 minutes). Workflow stays for a chain a script must
  decide.
- Driver structure: one `FIELDS` table derives the seat-field vocabulary; one `jsonRpcConn` serves the
  config probe and the main channel; every `LADDER` rung is a pure function of its own context; one
  `exitWith` funnel settles, closes the record, writes stdout under the drain watchdog and exits, so
  `process.exit` appears once; `main`, `parseArgs` and `handleMessage` are split into named units
  (`main` 362 lines to 125); one `LIMITS` table holds 36 tuning numbers with a reason each. The driver
  goes 4318 lines to 3819. Those refactors changed no byte the driver writes or prints; the removals
  above are what changed its help text.
- Eleven suites, cheapest first: the protocol suite splits into `protocol` (what the driver does with the
  server's events, 135 cases) and `cli` (what it does with its arguments and its output surface, 85), the
  lock suite into `lock` (53) and `worktree` (22), over the new `evals/lib/scenarios.mjs`. Every protocol
  table case runs on its own state root.

### Notes

- The two live gates, `evals/fidelity.test.mjs` and `evals/orchestrate-live.test.mjs`, were rewritten for
  the direct route and have not been run against a live binary since. RELEASING.md steps 5 and 6 run
  them, and no release is cut without them.
- `references/parity.md`'s memory and turn-overhead figures still carry their 2026-08-30/31 date and were
  not re-measured for the 0.153.4 pin; the page now says so and the release checklist asks only that the
  order of magnitude still holds.
- `references/why-not-the-plugin.md` keeps the code forensics and dates its upstream-activity snapshot;
  the routing rule is to read the issues rather than plan around them.
- `evals/README.md` now leads with how to run the suites and keeps the dated coverage ledger after it.

## 0.10.0 — 2026-09-07

Measured against codex-cli 0.153.4 on macOS (Node 24.11). The pinned protocol moves from 0.150.1 to
0.153.4; the protocol diff between the two is purely additive (9 new type files, 30 changed, nothing
removed). The orchestrate skill and its evals were measured on 0.153.4 against the 0.150.1 pin before it
moved.

### Added

- A second skill, `codex-delegate:orchestrate`, invoked by the user only (`disable-model-invocation:
  true`): the main conversation becomes an orchestrator that scouts inline, agrees one plan with the
  rights it needs, and delegates every verbose step to Claude and Codex seats. It is a delta over
  `codex-delegate` and repeats none of its seat mechanics.
- What the mode fixes in one place: the Claude/Codex model gradation and which tier does which work, the
  default half-Codex share for the judgement roles, the seat bounds (6 alive at once, one Fable and one
  `gpt-6-astra` seat alive at a time, one Codex write seat per directory), the five-field return template,
  the two-round cross-review loop, and `.orchestrate/<run>/` as the run directory, self-ignoring through
  a `.gitignore` of `*`. The pool is the same whatever the orchestrator's own model, its top pair takes
  the top-row roles in turn, and the bounds are defaults the plan states for the user to override in words.
- `evals/orchestrate.test.mjs` pins that text and runs in `npm test`; `evals/package.test.mjs` now ships
  the new skill in the payload and holds its `metadata.version` to the same agreement as the old one.

### Changed

- `schema-0.153.4/` replaces `schema-0.150.1/` as the pinned protocol reference; `PINNED_CODEX`, the
  fixture's version strings and the README prerequisite move with it. The drift warning that fired on
  every run under 0.153.4 is quiet again.
- `thread/resume` and `thread/fork` send `excludeTurns: true`: the driver never read `thread.turns`,
  every thread created under 0.153.4 is paginated, and for those an ephemeral fork without the flag was
  refused with -32600. Measured: a resume shrank from 1.5 MB to 58 KB.

### Fixed

- A question the model asks through `request_user_input_async` (0.153.0; offered to gpt-6-astra)
  arrives as an agentMessage carrying `questions`, phased `final_answer`. It used to become the seat's
  `answer` under exit 0, outranking the turn's real answer. It is now recorded as an interaction
  (exit 7, `item/agentMessage/questions: <title>`) and never selected as the answer.
- `--mcp` carries package-style server names (`@scope/pkg`, legal since 0.152.0) as quoted TOML keys
  instead of skipping the server.
- A Codex subagent thread is registered from the root's `subAgentActivity` announcement. Measured on
  0.153.4, a child never sends `thread/started`, so the old registration never fired: a delegating turn
  reported `subagentThreads: []` and no child's work at all, and the idle guard, blind while the children
  worked, could cut a long delegation as silence. The report now lists them as
  `{threadId, agentPath, status, items, commands}`, their events prove liveness, and a root that ran
  nothing still exits 5 with a cause that names them: "no command ran on the root thread; N subagent
  thread(s) ran (…, n commands): liveness, not evidence". Evidence and token accounting stay root-only.

### Notes

- A prompt seat gets no `BRIEF:` line. `BRIEF:` asks for 20 lines and clips at 20 lines or 4000 bytes,
  which the five-field return does not fit into; the template is the bound instead.
- Measured: `gpt-6-astra` delegates to its own Codex subagent threads at `xhigh` as readily as at
  `ultra` when the prompt invites it, so delegation is the model's choice and no effort keeps the work on
  the thread the driver started. The mode therefore sets no `EFFORT:` line for any seat, and every
  `MODEL:` inherits the configured effort. A seat that delegates comes back exit 5, "no command ran",
  carrying its answer: only the root thread is evidence, and the answer is still the seat's. The report's
  `subagentThreads` was blind to those children, which never arrive as a `thread/started` with a
  `parentThreadId`; fixed in this release, and the exit-5 cause now names them.
- The run directory is `.orchestrate/<run>/` at the repository root, not under `.claude/`: a write
  anywhere under `.claude/` is refused as a sensitive file, measured even with an explicit
  `Write(./.claude/**)` allow rule.
- Measured: a Workflow `schema` on a `codex-seat` call makes the relay wrap the whole envelope into
  `result`, losing the seat's own fields inside it. A Codex seat takes the five fields as an
  `OUTPUT_SCHEMA:` file and the answer is read below the envelope's `--- answer` line; the `schema`
  option is for Claude seats.
- Measured: `agent({model: 'fable'})` answers as Fable 5.1 from a Fable session and from an Opus session
  alike, so the one Fable seat is tagged like every other Agent call and is available to every
  orchestrator; its cap of one alive is policy, not a limit.
- The relay stays pinned to sonnet and the Agent tool's model option is still never passed to it.
- `evals/orchestrate-live.test.mjs` is the mode's live release gate, behind
  `CODEX_DELEGATE_LIVE_ORCHESTRATE=1` and out of CI: it spends five headless claude sessions, the
  subagents cases 3 and 5 spawn, and one `gpt-6-astra` Codex turn (a second one with
  `CODEX_DELEGATE_LIVE_ORCHESTRATE_DELEGATE=1`, the informational delegation probe). Its sessions run
  under `--permission-mode acceptEdits` with an explicit `--allowedTools` list and the prompt on stdin;
  bypass mode is not needed, and is ignored anyway where managed settings disable it.
- `CodexErrorInfo` gained `rateLimitExceeded` beside `usageLimitExceeded`; neither is retried, and the
  comments now say so.
- The bundled default model is gpt-6-astra when `config.toml` names none; the driver inherits only the
  keys the caller set, so a flagless seat's model changed with the upgrade. Pin `model` in `config.toml`
  or pass `MODEL:`.
- SKILL.md: the `--- answer (N bytes)` marker is the size to check; a relay on a small model was
  measured cutting long answers and altering escapes in JSON ones. Read `answerPath` when the bytes
  differ.

## 0.9.1 — 2026-09-03

- `--help` and `--help-all` no longer call `process.exit()` behind the write: on an asynchronous pipe
  (macOS) that truncated the text when the reader was slower than the exit. Found by CI on the 0.9.0
  release commit (macOS, Node 18); Linux and Node 24 did not show it. The process now exits on its own
  once stdout has drained, as every other refusal path already did.

## 0.9.0 — 2026-09-03

Measured against codex-cli 0.150.1 on macOS (Node 24.11; the free suites on Linux and macOS, Node 18 and 24, in CI). Three commits since 0.8.0: simplification round 3.

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

## 0.6.0 — 2026-09-01

- Completed a documentation-only best-practice pass: corrected eleven drifted claims, reduced the
  entrypoint, defined terms, and moved conditional detail into focused references.
- Documented the non-zero-result trap, pasted-image handling, and relay-agent precision without
  changing the driver.
- Added license metadata to the plugin manifest and tightened the shipped relay-agent contract.

## 0.5.0 — 2026-09-01

- Added driver-owned worktree harvest and disposal, including staged work, untracked archives, crash
  ledger reconciliation, and retained refs for clean seats that commit.
- Added attachments, pasted-image relay, progress, job records and `--resume last`, native review,
  live steering, and optional isolated MCP-server carry-through.
- Added bounded transient retry, clean interruption, richer activity reporting, two contract suites,
  and extensive corrections from independent review.
- Measured `codex mcp-server` against this driver and documented why it is still not a substitute.

## 0.4.0 — 2026-09-01

- Hardened seat files: `SEAT` must be first, relayed `VERIFY` needs command-line authorization, and
  declared fields are reported.
- Made strict output schemas an admission rule, made an unmeasured verifier exit 12, and validated
  rollout receipts by opening their `session_meta` record.
- Added a `SIGHUP` handler and a full report on every signal, protected relocated state and worktree
  destinations, and isolated eval state. This release changed the signal, seat-file verifier, and
  strict-schema contracts.
- Corrected lock, token, verifier, answer-log, worktree, and protected-root documentation; added the
  coordinator-side background-load warning.

## 0.3.0 — 2026-08-31

- Shipped the repository as a Claude Code plugin with the `codex-seat` relay agent.
- Added `--seat-file` so wrappers pass literal fields instead of interpolating user values into a shell
  command; unknown and repeated fields are rejected.
- Added identity-based root guards, strict schema-verdict handling, and report integrity after a refused
  retry, with adversarial contract tests.

## 0.2.0 — 2026-08-31

- Made the driver wait for its child process group and own the managed-worktree lifecycle.
- Added rollout receipt location (`receiptPath`, `receiptOk`) and made JSON the default report output.
- Reworked installation and operating documentation, moving incident and plugin forensics into
  references and reducing the skill entrypoint.

## 0.1.0 — 2026-08-31

- Introduced the one-file Node app-server driver with per-call read/write rights, worktree support,
  cwd locking, evidence-derived exit codes, and commit/network controls.
- Added private `CODEX_HOME` isolation while inheriting resolved model, effort, personality, and service
  tier through `config/read`.
- Added web-search modes, JSON answers, answer logging, protocol and lock suites, and the first
  fidelity suite against codex-cli 0.150.1.
- Reshaped the returned report to match subagent handoff needs, capping the inline answer while the
  full text stays at `answerPath`.
