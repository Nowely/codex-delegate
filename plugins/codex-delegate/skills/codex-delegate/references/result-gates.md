# How the result gates can be fooled, and what `--verify` measures

<!-- Extracted from SKILL.md: depth a caller does not need while deciding what to run.
     Read it when the pointer in SKILL.md sends you here. -->

## Bypasses of `--expect-command`

A plain probe answering "no" — `grep`/`rg`/`test`/`diff`/`cmp` exiting **1 exactly** — is not a failed
command and never raises exit 11; it is counted separately as `commandsProbeNegative`. The exemption is
for a PLAIN command only: a pipe, a compound, a substitution or a multi-line script keeps failure
semantics, because its exit 1 may belong to another command in the chain. A sandbox-declined command is
never a negative probe, whatever its text says.

Classification reads what the server parsed, not merely its reported wrapper. Live commands arrive as
`/bin/zsh -c 'grep -q zzz /dev/null'` (or `-lc`) with bare text in `commandActions`; the report's
`commands[].actions` preserves those parsed actions. The probe is judged from that action or the
unwrapped script. Several parsed actions have no single bare command, so the whole script keeps failure
semantics. This distinction matters: matching only the wrapper made the exemption dead in production
while fixture tests stayed green.

One accidental bypass is worth knowing, because it needs no intent: `pnpm -w exec vitest run | tail -5`
exits with `tail`'s status, so a failing suite reports success, and Codex pipes to `head`/`tail` routinely
just to cap output. The contrived bypass is real too — a command that is literally `true # vitest` scores
`commandsMatchingExpectation: 1`, measured — though it has not been observed in practice: asked directly to
claim work it had not done, Codex refused and said so.
The report counts sliced evidence as `commandsPipedToPager`, with `pipedToPagerHint` beside it.

### `--allow-failed-commands`

Use this waiver when failures are the finding: a crashing environment probe, an intentionally broken
build, or a bisection seat's red step. It removes rung 11 only. `--expect-command` still decides exit 5;
`--verify` still decides 9 or 12; and `commandsFailed`, `fileChangesFailed`, and `commandsBlocked` remain
in the report. Prefer `--verify` when an end state can be measured: this flag asserts nothing, it only
stops asserting the opposite.

### Unknown command verdicts

A command that reached the client without an exit code and was neither failed nor declined has an
unknown outcome, so it raises exit 11. A passing verifier or native review overrides that rung, and
`--allow-failed-commands` waives it; otherwise exit 0 would assert success without evidence.

## What `--verify` can and cannot measure

The verifier runs under `/bin/sh` in its own process group. It gets 300 seconds unless a `--timeout` you
set leaves less (`verify.budgetMs`); at the deadline the group is killed with `SIGKILL` and
`verify.timedOut` says so. Output streams while a bounded tail is retained, so a verifier that prints
hundreds of megabytes and exits 0 passes. `--verify-sandboxed` runs it through `codex sandbox` under the
read-only profile: the tree is readable, `$TMPDIR` is writable, and a tree-writing verifier fails;
`verify.sandboxed` records the mode.

`verify.measured` splits "your verifier broke" from "the work is not there", because those call for
opposite responses — one means fix the check, the other means redo the work. It is decided by the observed
exit status, not by whether anything went wrong around it:

The rows are read in order; the first that matches decides.

| observed | meaning | exit |
| --- | --- | --- |
| `127` / `126` | **not measured.** The shell never ran the command — a typo, or a tool missing from the *driver's* `PATH`, which a launchd or hook context routinely lacks | **12** |
| no status at all | **not measured.** Killed at the deadline or the spawn itself failed | **12** |
| any other status, zero or not | **measured.** The check ran and gave its verdict | `0` passes, else **9** |

A fourth state is not in the table because it produces no exit status to observe: with under 100 ms of
a `--timeout` you set left when the turn ends, the check is not run at all. That is
`verifySkipped: "budget-exhausted"` with `verify: null`, and it is **also exit 12** — a check that was
declared and not measured is the same instruction to the caller however it came about. It used to fall
through to the weaker gates and reach exit 0, which is the one shape `--verify` exists to prevent.

The other `verifySkipped` values are not exit 12, because the ladder has already spoken: a budget cut is
exit 3, and a turn that did not complete is exit 2 when the server rejected the request as invalid and
exit 1 otherwise. Running a check against a half-written tree would only add a misleading verdict.

A verifier that exits `0` while a background process still holds its stdout is a **pass**: the deadline
fires on the pipe, but the exit status was observed and is proof. Keep verifiers cheap and quiet anyway —
`test -f`, `grep -q`, a targeted test project.
