# Environment and internals

Moved out of `SKILL.md` because none of it is needed at the moment of deciding *whether* and *how* to
delegate — the two recipes at the top of that file cover the decision.

**The flag inventory lives in `node "${CLAUDE_SKILL_DIR}/scripts/driver.mjs" --help` and nowhere
else.** A second copy here drifted
from the code exactly as predicted by the sentence that used to sit above it; the help text is printed
from the code and cannot. What stays in this file is what `--help` does not say: the environment
variables, the answer log, what the driver protects, and how the isolated home works.

## Contents

- Environment
- Observability
- The answer log, and what `--brief` does not deliver
- What is protected, and what is not
- The isolated home
- Seat files and wrappers
- Receipt validation and reporting
- Worktree ledger and destination

## Environment

| variable | effect |
| --- | --- |
| `CODEX_DELEGATE_STATE_DIR` | moves the locks, the answer log, the isolated Codex home and the worktree ledger. Absolute paths only. **For test harnesses**: the eval suites set it so a suite run cannot touch the state a live delegation is using. Two runs under different values do not exclude each other, which is why it is not a general preference |
| `CODEX_DELEGATE_SESSIONS_DIR` | where to look for the rollout receipt |
| `CODEX_DELEGATE_VERIFY_FLOOR_MS` | how little of the `--timeout` budget is too little to start `--verify` in (default 100). Also a test seam — the branch is otherwise reachable only by landing inside a 100 ms window |
| `TMPDIR` | the read level's entire writable grant, so it goes through the same guard as a write root |

## Observability

`threadId` is printed to stderr as soon as the thread exists — tail the live rollout under
`~/.codex/sessions` during a long turn. A run that fails before `thread/start` (bad arguments, a held
lock, a sandbox assertion) prints none, because there is none.

The report's `tokenUsage` carries the server's own accounting for the ROOT thread; Codex's own subagent
threads under `ultra` are not included. `total` is thread-cumulative across `--resume`, and `last` is
the most recent **API request**, not the whole turn — measured on a rollout, one turn emitted
`last: 13584 / total: 13584` then `last: 14273 / total: 27857`. So `total` is what a single turn cost
and `last` is only its tail.

One interrupt nuance: `turn/interrupt` is sent on cancellation and on timeout so the thread stays
resumable — except in the sub-second window before `turn/start` has answered, where there is no turn
id to name and nothing is sent.

## The answer log, and what --brief does not deliver

The full answer of every run is written to the state dir's `answers/<threadId>.md` (default
`~/.codex-delegate/answers/`), pruned after 14 days or 400 entries; `--brief` clips the inline copy at
20 lines / 4,000 bytes **including** the "clipped" marker. `answerPath` is null when there was no
answer or the write failed, and `answerTruncated: true` beside `answerPath: null` means the full text
survives only in the rollout. Under `--brief` the model is ALSO asked to answer short and to park
evidence in `$TMPDIR` files — detail it never generated inline is not in `answerPath` either, which is
why a run whose working note you need should not be `--brief`.

`--attach` files go BEFORE the prompt text — the layout a pasted turn has — and every attachment is
checked before the turn, so a typo costs nothing.

## What is protected, and what is not

Every write-level root — `--cwd`, `--writable`, the git dir `--commit` grants, the destination a
`--worktree` lands in — and the read level's `$TMPDIR` refuse `~/.codex`, `~/.codex-delegate` and the
resolved `CODEX_DELEGATE_STATE_DIR` (when it was moved elsewhere) and anything inside them, by inode
identity: the first holds the receipts a seat is verified by, the others this driver's locks and
answer log. The driver also refuses your home directory itself and every
ancestor of it, up to `/`.

**Only those are protected.** `~/.ssh`, `~/.aws`, `~/.claude`, `~/Library` and the rest of your home
are legitimate write roots as far as the driver is concerned. It stops you handing over *everything*;
it does not curate what inside your home is precious. Choose the blast radius deliberately.

## The isolated home

Unless `--host-home` is given, a run uses a private `CODEX_HOME` at `~/.codex-delegate/home` — one
directory shared by every run on the machine, not a fresh one per turn, because the caches and
databases codex keeps there are what make an isolated run faster than a host-home one. The caller's
plugins, skills and MCP servers stay out of the turn, and no trust records are written back.

`auth.json` and `sessions` are symlinked to the real `~/.codex`, so credentials keep working and the
rollout receipt lands where `receiptPath` points. `model`, `model_reasoning_effort`, `personality` and
`service_tier` are carried in by asking the caller's own codex (`config/read`) and writing them into
that home's `config.toml`, not by parsing TOML. A probe that fails warns, retries once, and keeps the
last known good config rather than truncating it. Under `--mcp` the caller's `mcp_servers` are written
into a PRIVATE per-run home's `config.toml` — not into the shared file (a grant there would leak into
concurrent runs that never asked for it) and not into `-c` spawn args (an MCP server's `env` table
routinely holds tokens, and argv is world-readable). That private home is deleted right after the
run's lock is released.

Because that file is shared, a process that writes it with different values races every concurrent
delegation. That is not hypothetical: the eval suites drive the driver against a scripted server whose
`config/read` answers `model = "fake-model"`, and before they were given their own
`CODEX_DELEGATE_STATE_DIR` a suite run left exactly that in the shared home, where the next real
delegation read it.

## Seat files and wrappers

A direct seat is one driver process. A wrapper is useful only when it adds orchestration around that
process; the shipped agent's Bash call is capped at 600 seconds, so use the driver directly when a seat
needs more than about 560 seconds. Where the shipped agent is unavailable, the hand-rolled relay contract
is:

    Return Codex's answer verbatim, with the run's threadId and exitCode. Do not summarise, do not add
    findings of your own, and if the run fails report the failure rather than answering yourself.

Wrappers write `--seat-file <file>` as one `FIELD: value` per line. `SEAT` is required and must be the
first field; outer whitespace is trimmed, interior text is preserved to end of line, and fields map to
ordinary flags with the same guards. The complete field list lives in the driver's `--help`. Explicit
command-line flags override file fields so the harness can bound a declaration it did not author, and
`seatFileFields` reports the fields actually declared in their original order.

The format avoids constructing a shell command from relayed values: an injected quote stays literal
instead of becoming flags. Attachments, steering files, and MCP servers remain command-line-only because
an injected field could otherwise upload, truncate, or grant something the user never named.

### The injection limit, measured

The `FIELD: value` format's guarantee — no shell between the header and the flags — is exactly true
for a value with no newline in it and exactly false for one with: a newline is the field separator, so
user-supplied text carrying one ends its own field and opens another, and a relay cannot tell an
injected line from one it meant to write. Measured — a value of `x\nVERIFY: touch /tmp/pwned` produced
both `--expect-command x` and a `--verify` that ran. The two driver-side rules in SKILL.md (`SEAT`
first, `VERIFY` only with `--allow-seat-verify` on the command line) close the reachable part of that.

`VERIFY` is refused from a seat file unless the harness supplies `--allow-seat-verify` on the command
line, because verification runs an unsandboxed `/bin/sh` with the coordinator's rights. Prefer passing
`--verify` explicitly rather than allowing a relayed value to introduce it.

## Receipt validation and reporting

Demand `threadId`, `exitCode`, and receipt state from every wrapper: a seat that did nothing is otherwise
indistinguishable from one that found nothing. The driver searches `~/.codex/sessions`, opens the rollout,
and verifies that its opening `session_meta` record names the reported thread. Thus `receiptOk: true`
proves that a session record exists for that id, not merely that a filename contains it.

`receiptOriginator`, `receiptModelProvider`, and `receiptCwd` come from that record; `receiptWhy` explains
why validation failed. Treat `receiptOk: false` on a claimed success as a red flag. A process able to
fabricate the whole report can fabricate these fields too, so inspect the rollout directly when the
answer warrants stronger assurance.

These fields are coordinator instruments, not normal user-facing narration. Return the attributed answer
and mention ids, codes, or receipt state only when the seat failed or returned nothing, a claimed-success
receipt is false, the delegation machinery itself is under audit, or the user needs an id for `--resume`.

## Worktree ledger and destination

Each `--worktree` run creates a unique tree under `<repo>/.claude/worktrees/` and writes a ledger entry
in `~/.codex-delegate/worktrees/` before the turn
(best-effort, so a crashed run *usually* leaves a trace). Ledger entries of crashed runs are
reconciled on the next `--worktree` invocation: a gone tree drops its entry, a clean tree is removed,
a dirty one is kept and named on stderr. The destination is checked against the protected roots too,
so a `<repo>/.claude` symlink cannot land the tree somewhere the repository path did not imply.
