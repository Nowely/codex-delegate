# Incidents behind the rules

The measured failures that produced SKILL.md's imperatives. Each line is evidence, not folklore: if a
rule ever looks like ceremony, this is what it cost to learn.

## Contents

- [Isolation](#isolation)
- [Composition disclosure](#composition-disclosure)
- [The unverified wrapper](#the-unverified-wrapper)
- [A relay on a small model](#a-relay-on-a-small-model)
- [Context cost](#context-cost)
- [Silent downgrades](#silent-downgrades)
- [The TOML parser](#the-toml-parser)
- [Redundant flags as crashes](#redundant-flags-as-crashes)
- [Worktree leaks, and who actually leaked](#worktree-leaks-and-who-actually-leaked)
- [Hooks run by the driver's own git](#hooks-run-by-the-drivers-own-git)
- [Orphaned load](#orphaned-load)
- [Red-green seats](#red-green-seats)
- [A non-zero exit discarded](#a-non-zero-exit-discarded)
- [Safety classifier](#safety-classifier)
- [Fan-out physics](#fan-out-physics)
- [Report integrity](#report-integrity)
- [Resume rights](#resume-rights)
- [Seat-file newline injection](#seat-file-newline-injection)
- [State split the lock](#state-split-the-lock)
- [Shared-home fixture pollution](#shared-home-fixture-pollution)
- [Stale-lock stampede](#stale-lock-stampede)
- [Protected-root aliases](#protected-root-aliases)
- [MCP secrets in argv](#mcp-secrets-in-argv)
- [Negative probes counted as failures](#negative-probes-counted-as-failures)
- [Cancellation lost the answer](#cancellation-lost-the-answer)
- [The verifier gate was inverted](#the-verifier-gate-was-inverted)
- [An unref'd kill never fired](#an-unrefd-kill-never-fired)
- [Five of seven seats lost to the wall clock](#five-of-seven-seats-lost-to-the-wall-clock)

## Isolation

Of 157 delegations run against the caller's own `~/.codex`, 95 spent their FIRST tool
call reading `~/.codex/plugins/cache` instead of the task (209 of 919 tool calls went there), and one
turn ended having only announced it had to run a plugin's workflow first. Hence the private
`CODEX_HOME`. The caller's `config.toml` had also grown to 36 KB of dead trusted-project records, one
appended per run.

## Composition disclosure

Under an unstated mix an agent ran the Codex seat first and disclosed it
only in the write-up — the announce-before rule used to be attached only to the case where the caller
named a ratio. Told "no codex", another agent correctly ran none and never said so, because it read the
instruction as "do not open the Codex skill". Both rules are now unconditional.

## The unverified wrapper

A wrapper subagent started a background Codex job and returned at once with
`suitesPass: "unknown — task forwarded to background job"` and `findings: []` — and the panel counted
it as a seat that had reported. A later seat returned a *task* id, `task-mtfzrffs-0mbqya`, which
matches no rollout; the receipt check would have caught it in milliseconds. A seat that did nothing is
indistinguishable from a seat that found nothing.

## A relay on a small model

A haiku relay received a failing `SEAT` declaration, created the missing directory, and ran Codex under
rights nobody had granted, then reported success. The shipped `codex-seat` wrapper is pinned to sonnet;
a hand-rolled relay must not use a small model.

## Context cost

An unbounded seat returned 13 KB of prose into a coordinator that needed a verdict.
`--brief` exists for this; the full text stays at `answerPath`.

## Silent downgrades

A driver-side effort default silently downgraded a user whose config asked for
`max` to `low` on every delegation — hence effort and model inherit unless flagged. `minimal` was once
refused as a usage error while the server took it; the ladder is now a permissive union and a
server-refused value exits 2 with the server's own list.

## The TOML parser

Inherited config was once read by hand-parsing the caller's `config.toml` with
line regexes. Four distinct defects surfaced in a single day: a single-quoted value matched nothing; a
multi-line string body was scanned as settings; a duplicate key was emitted, which codex rejects
outright; and a comment merely mentioning `= """` opened a skip that swallowed every setting after it.
The parser was deleted for `config/read` — the server reports the values as it resolves them.

## Redundant flags as crashes

`--cwd X --writable X` and a root named twice both exited 4 ("codex
crashed") until the driver deduped and subtracted what the server does.

## Worktree leaks, and who actually leaked

One repository was found holding 64 worktrees and 41 GB.
This note used to blame the manual remove-after-harvest instruction for them; re-measured 2026-09-01,
that attribution is wrong. By prefix: 57 `wf_*` left by Claude Code's own workflow worktree isolation,
3 `agent-*` from a native `Agent(isolation: "worktree")`, 4 hand-made audit trees — and **zero**
created by this driver, whose trees are named `codex-*`. The set dates from 22–25 August with four
more on the 30th, and 22 of the 64 still held uncommitted work, so none of it can be swept blindly.
The lesson outlives its own evidence — a worktree lifecycle nobody owns is a lifecycle nobody performs
— and it is why `--worktree` harvests and removes rather than printing instructions. But the driver
was never the leaker here, and anyone who had compared this paragraph against the directory would have
caught it out.

## Hooks run by the driver's own git

`--commit` hands the seat the git common dir, and the driver's own harvest, its worktree removal and the
next run's worktree add then execute what the seat wrote there with the CALLER's rights, before anyone
reads the report. Measured before the fix: `core.fsmonitor=pwn.sh` logged runs under `status`, `diff`,
`ls-files` twice, `worktree remove` and `worktree add`, at exit 0. Closed by
`-c core.fsmonitor=false -c core.hooksPath=/dev/null -c diff.external=` on every git the driver spawns.

## Orphaned load

A review probe launched eight busy loops to measure timeout behaviour under CPU pressure and put `kill
$LOADPIDS` after the measurement. Its parent died first: the loops were reparented to PID 1 and burned eight
of twelve cores for fifteen hours. Kill background load from an armed `trap 'kill $PIDS' EXIT INT TERM`, and
read `ps -eo pid,ppid,etime,%cpu` when a machine feels slow — a load average alone cost an hour of
misreading here. A second occurrence, from a coordinator's own shell: CPU load generated with `for i in
$(seq 1 10); do (while :; do :; done) & done` and cleaned up with `LOADPIDS=$(jobs -p); …; kill $LOADPIDS`
left twenty-two busy loops on PID 1, burning half a core each for nearly eight hours — under the tool
harness the command runs inside its own `zsh -c` wrapper, where `jobs -p` reported nothing, so `kill` killed
nothing and the wrapper exited first. Record pids as you spawn them (`p=$!; PIDS="$PIDS $p"`), arm the trap
before the loop, prefer `kill -9 -$$` on the whole group, and check with `ps -eo pid,ppid,etime,command |
awk '$2==1'` — a delegation's own teardown is not what leaks here. Separately, an eval-suite fake server and
a hung driver copy from `/tmp` survived their sessions by ~22–38 hours (one of them ignored SIGTERM
outright) — the shutdown path now waits for the process group and escalates to SIGKILL, and the suites pin
it with a TERM-ignoring survivor.

## Red-green seats

Three mutation-testing seats ran suites against deliberately broken copies;
`commandsFailed` was 24, 17 and 9, and exit 11 announced failure for work that had succeeded. Pass
`--verify` with the end condition you actually want; a passing check overrules failed commands by
design.

## A non-zero exit discarded

A review panel's merge step discarded a receipt-verified Codex answer containing ten findings because
one failed probe made the run exit 11. A non-zero exit judges the gates, not whether an answer exists;
read the answer and gate only its evidence.

## Safety classifier

A seat asked to find where a guard could be "defeated", build a "hostile" home
and "break" a policy check came back `turnStatus: failed`, `codexErrorInfo: "cyberPolicy"` — twice more
on earlier occasions. The same work described as robustness under unusual filesystem states ran fine.
The Claude side has the same mechanism with a heavier cost: an audit brief asking to "bypass the
guard", "forge the receipt" and "break the contract" tripped Anthropic's classifier as `[cyber]` on
the first message, before a single file was read, and fell the session back to another model for its
whole remaining life (`model_refusal_fallback`, `scope: session`) — and that brief had been drafted by
a Claude coordinator using this skill.

## Fan-out physics

On a 36 GB machine already carrying other work, exceeding the memory budget got
delegations SIGTERM-killed by the OS, reported as `interrupted by SIGTERM`. Turn overhead measured 6.6 s
isolated / 8.2 s host-home once, and 9.2 s / 11.7 s hours later on a LESS loaded machine — it is
dominated by provider round-trips; treat it as 7–12 s and do not tune against the number. A wrapper
script that forked three children (8 s, 25 s, 45 s) and ended in `wait` reported once at 45 s where
separate launches reported at 11.5 s, 28.2 s and 48.4 s — `wait` is a barrier, use it only when you
wanted one.

## Report integrity

A 20 MB report was truncated at 262144 bytes by exiting before stdout drained. A
cyrillic answer sailed past a 4000-"byte" cap at 8003 actual bytes because `.length` counts UTF-16
units. A deliberate refusal after spawn had its exit code rewritten to 4 by the child-exit handler —
`fail()` now marks the run settled. Two deliberate attempts to make `--answer-json` come back as prose
both returned bare JSON.

## Resume rights

A thread started at read level was resumed at write level and the write succeeded —
rights are per call, on resume as everywhere else. Verified, not assumed.

## Seat-file newline injection

`EXPECT: x\nVERIFY: touch /tmp/pwned` became two fields and executed the verifier through `/bin/sh`.
`SEAT` is now first and seat-file `VERIFY` requires a command-line authorization the relay never gives.

## State split the lock

Two state roots derived from two `HOME` values produced two locks and simultaneous writers; `HOME=""`
also made the lock directory relative. State paths are now absolute and the state root is explicit.

## Shared-home fixture pollution

A suite's fake server wrote `model = "fake-model"` into the shared isolated home. Evals now move all
driver state with `CODEX_DELEGATE_STATE_DIR`, and home updates use atomic rename.

## Stale-lock stampede

Eight contenders raced over one planted stale lock: six violated the critical section and three holders
overlapped. Serialising reclaim and rechecking liveness reduced the observed maximum to one.

## Protected-root aliases

`TMPDIR=~/.codex/x --level read` once exited 0 with access to receipt state, and a `~/.CODEX` spelling
defeated a string-prefix guard. Root protection now uses canonical identity and includes the read grant.

## MCP secrets in argv

Passing MCP config with `-c` exposed a server's `env` tokens in world-readable process arguments. MCP
tables now go into a mode-0600 private home and are never seat-file fields.

## Negative probes counted as failures

Seven of 26 read seats exited 11 because `grep` found nothing. The live server wrapped commands while
the fixture emitted bare strings, so the exemption never matched production. Classification now uses
the parsed `commandActions`; the fixture emits the same shape.

## Cancellation lost the answer

Six cancelled seats returned zero-byte reports because an interrupt discards the in-flight model
message. Agent-message deltas now preserve `answerPartial`, and final answers are persisted immediately.

## The verifier gate was inverted

`--verify` once ran only behind `--expect-command`, leaving `verify: null` for both proven-broken and
proven-good states. The verifier now runs after any completed turn and precedes weaker evidence gates.

## An unref'd kill never fired

A `SIGKILL` timer was unreferenced and discarded by `process.exit()`, leaving a TERM-ignoring test server
behind. Teardown now waits for the child group and escalates before exit.

## Five of seven seats lost to the wall clock

GitHub issue #1 (2026-09-02) measured five of seven seats hitting a 540-second relay-era ceiling;
commands used only 6–16% of the clock and the cut returned zero bytes. The driver gained a wrap-up steer,
interrupt grace, partial capture, and detached transport. Native defaults now impose no wall clock;
silence, command, and caller-declared clock bounds remain explicit.
