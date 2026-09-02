# Environment and internals

Moved out of `SKILL.md` because none of it is needed at the moment of deciding *whether* and *how* to
delegate — the two recipes at the top of that file cover the decision.

The canonical flag inventory lives in `node "${CLAUDE_SKILL_DIR}/scripts/driver.mjs" --help`. This file
explains environment, state, wrappers, operational bounds, and lifecycle details behind those flags.

## Contents

- Environment
- Observability
- The answer log, and what `--brief` does not deliver
- What is protected, and what is not
- The isolated home
- Seat files and wrappers
- Bounding or stopping a seat
- Relay transport
- Receipt validation and reporting
- Worktree ledger and destination

## Environment

| variable | effect |
| --- | --- |
| `CODEX_DELEGATE_STATE_DIR` | moves everything this driver owns: `locks/`, `answers/` (answers, partials, turn diffs), `home/` (the isolated Codex home), `homes/` (one private home per `--mcp` run), `jobs/` (what `--jobs`, `--wait`, and `--resume last` read), `runs/` (a `--detach` run's transport), `tmp/` (the private `$TMPDIR` of a run whose caller exported none), `worktrees/` (the ledger), and `pasted/` (images `attach-pasted.mjs` stages). Absolute paths only. Two runs under different values do not exclude each other |
| `CODEX_DELEGATE_SESSIONS_DIR` | where to look for the rollout receipt |
| `CODEX_DELEGATE_RELAY_WAIT_S` | how long `--relay` and `--relay-collect` wait before handing back the running envelope (default 560, just under a relay's 590 s tool cap); a test and live-check seam |
| `CODEX_DELEGATE_VERIFY_FLOOR_MS` | verifier-admission floor (default 100 ms) and test seam; see [Bounding or stopping a seat](#bounding-or-stopping-a-seat) |
| `TMPDIR` | the read level's entire writable grant, so a caller's own goes through the same guard as a write root. Unset, the driver makes `<state>/tmp/<runId>` (0700) and grants exactly that; it outlives the run, the report names it as `tmpDir`, and it is pruned with the run directories |

## Observability

`threadId` is printed to stderr as soon as the thread exists — tail the live rollout under
`~/.codex/sessions` during a long turn. A run that fails before `thread/start` (bad arguments, a held
lock, a sandbox assertion) prints none, because there is none.

The report's `tokenUsage` carries the server's own accounting for the ROOT thread; Codex's own subagent
threads under `ultra` are not included. `total` is thread-cumulative across `--resume`, and `last` is
the most recent **API request**, not the whole turn — measured on a rollout, one turn emitted
`last: 13584 / total: 13584` then `last: 14273 / total: 27857`. So `total` is what a single turn cost
and `last` is only its tail.

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
answer log. The private `<state>/tmp/<runId>` created by the driver is the narrow exception: its owner
record binds it to that run. The driver also refuses your home directory itself and every
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
rollout receipt lands where `receiptPath` points. `model`, `model_reasoning_effort`, `personality`, and
`service_tier` are carried in through `config/read`, not by parsing TOML. A failed probe warns, retries
once, and keeps the last known good config. A probe cancelled by a signal also fails, and an ending run
writes nothing there. `configInherited` reports `probe`, `last-known-good`, or `none`, with carried keys;
the report also carries `codexVersion` beside `codexVersionPinned`. Under `--mcp`, `mcp_servers` are written
into a PRIVATE per-run home's `config.toml` — not into the shared file (a grant there would leak into
concurrent runs that never asked for it) and not into `-c` spawn args (an MCP server's `env` table
routinely holds tokens, and argv is world-readable). It is removed during orderly shutdown; a later MCP
run reaps it if its recorded owner died first.

Because that file is shared, isolate test harness state with `CODEX_DELEGATE_STATE_DIR`; concurrent
writers use atomic rename.

## Seat files and wrappers

A direct seat is one driver process. A wrapper is useful only when it adds orchestration. Where the
shipped agent is unavailable, preserve this relay contract:

    Return Codex's answer verbatim, with the run's threadId and exitCode. Do not summarise, do not add
    findings of your own, and if the run fails report the failure rather than answering yourself.

Wrappers write ONE file: a header of `FIELD: value` lines, then the prompt. The file is capped at 512 KB.
Header names are upper-case, case-sensitive, and start at column 0. The header ends at the first blank,
comment, or other non-field line, and always at `TASK:`, `CHECK:`, or `RETURN:`; everything from there
down is the body, verbatim, including that line, even when a later line looks like a field. An unknown
ALL-CAPS name above the body is exit 2 naming its line. A value is literal to end of line.

With `--seat-file`, `SEAT` is required and must be first. A file with no body leaves the prompt to stdin
or `--prompt`; providing both is exit 2, as is a body beside `REVIEW`, which builds its own prompt.
Explicit command-line flags override file fields, and `seatFileFields` reports the declared fields in
their original order. With `--relay`, a file whose leading header has no `SEAT` becomes a read seat in
the current directory: the relay writes the prompt verbatim and adds nothing. Pass the file to
`--seat-file` for JSON or `--relay` for the text envelope. The complete field list is in `--help`.

The format avoids constructing a shell command from relayed values: an injected quote stays literal
instead of becoming flags. Attachments, steering files, MCP servers, bounds, and transport remain
command-line-only because an injected field could otherwise upload, truncate, grant, or reshape a run
that the user never named. A header naming a command-line-only bound or transport exits 2 and names the
flag to use.

### The injection limit

A newline is a field separator. Require `SEAT` first and refuse `VERIFY` unless the harness explicitly
passes command-line `--allow-seat-verify`; a relay cannot distinguish an injected field from an intended
one. The measured failure is recorded in [incidents.md](incidents.md#seat-file-newline-injection).

`VERIFY` is refused from a seat file unless the harness supplies `--allow-seat-verify` on the command
line, because verification runs an unsandboxed `/bin/sh` with the coordinator's rights. Prefer passing
`--verify` explicitly rather than allowing a relayed value to introduce it.

## Bounding or stopping a seat

The native defaults set no wall clock (`--timeout 0`), cut after 900 seconds of thread silence
(`--idle-timeout 900`), and cut after 1,000 commands (`--max-commands 1000`). Silence is rearmed by
every thread item, delta, and usage event. Set any bound deliberately:

- `--timeout S` declares a wall clock. The driver steers for a final answer before the end, interrupts
  with a short grace, then writes the report at the deadline. Without it there is no wall-clock cut.
- `--idle-timeout S` guards silence; `0` disables it. `--max-commands N` catches command loops; `0`
  disables it.
- A cut is exit 3 with `cut.kind` `wall`, `idle`, or `commands`; `answerPartial` and the resume hint report
  what was retained.

There is no token budget — `tokenUsage` in the report is the server's own accounting, not a bound. The
three bounds that exist, `--timeout`, `--idle-timeout` and `--max-commands`, are command-line-only,
because the defaults let a seat run with no sizing header. `--brief` controls both answer size and
context consumption; it does not stop a turn.

Use `--detach` when a run must outlive its caller. It starts the seat in its own process group under
`<state>/runs/<runId>/` and returns a handle (exit 10, `turnStatus: running`). `--wait <id|last>` collects
the report byte-for-byte under the run's exit code; `--wait-timeout S` returns the handle again if the
seat is still live. `--jobs [--cwd R]` derives `running`, `crashed`, or `ended` from process liveness and
exposes `lastEventAt`, `tokensSpent` (the server's own total for the thread, cumulative across `--resume`),
`commandsSeen`, and `phase`. `--cancel <id>` sends `SIGTERM`; the seat's handler writes the interrupted
report. A second signal escalates teardown, while `SIGKILL` of the driver can strand descendants. Run
directories are kept for 14 days or 400 entries, except one whose `launch.json` names a live process,
which is never pruned however old.

The run directory holds `prompt.txt`, `report.json`, `stderr.txt`, and `launch.json`; it is the transport,
so an unwritable state directory is exit 2 before launch. `endedAt` is written only after the complete
report. Before then a live recorded pid means running and a dead one means crashed. The detached front
holds no cwd lock or worktree; the run itself owns both. Detach returns immediately unless given a wait
budget; a standalone `--wait` waits up to 7200 s by default and hands back the handle (exit 10) if the
run is still going.

A signal after the thread exists returns the interrupted report with exit 1 (`turn/interrupt` is sent
once a turn id exists; the sub-second window before that sends nothing); before the thread exists it is
exit 4.

## Relay transport

The shipped relay runs `driver.mjs --relay <file>`: one detached seat, one wait of 560 seconds, and one
text envelope on stdout under the run's own exit code. `CODEX_DELEGATE_RELAY_WAIT_S` overrides that wait
as a test and live-check seam. While the seat is going, the envelope starts with `exitCode: 10` and carries
a literal `collect:` command using `--relay-collect <threadId> --cwd <dir>`. The relay repeats it verbatim
at most 24 times, about four hours, so one Agent call normally returns the finished answer. Run that same
command by hand to keep collecting, or use `--wait <threadId>` for JSON.

The envelope has one shape: `exitCode` first; report fields and non-null artifact pointers next; the
`collect:` command only while running; an stderr tail when no report exists; then the full answer and its
byte count, always last. Everything above the answer marker is metadata, and everything after it is the
answer even if it looks like a field. Transport is never declared in the seat header.

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

Each `--worktree` run creates a unique tree under `<repo>/.claude/worktrees/` and writes its ledger entry
in `~/.codex-delegate/worktrees/` before `git worktree add`; it rewrites the entry with the base commit,
and an unreadable base refuses the run before Codex starts. The next worktree run reconciles crashed
entries oldest first, at most fifty: a gone tree drops its entry, a dirty one remains and is named, and a
clean one is removed only after commits at its HEAD get `refs/codex-delegate/<name>`. A preserved tree
keeps `state: "preserved"` and is later handled on the same terms once its owner is gone. The destination
guard prevents a `<repo>/.claude` symlink from escaping the repository's implied path.

Job records retain repository, base, diff, and untracked-archive paths so `--worktree --resume` can
rebuild content. A private `--mcp` home under `homes/<hex>/` records its owner in `owner.json`; a later MCP
run reaps it once that owner is gone. It contains caller MCP environment tokens in a 0600 `config.toml`.
Lock and ledger records also retain the app-server process group and are reclaimed only when both it and
the driver are gone.
