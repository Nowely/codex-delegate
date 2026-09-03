# Environment and internals

Moved out of `SKILL.md` because none of it is needed at the moment of deciding *whether* and *how* to
delegate — the two recipes at the top of that file cover the decision.

The canonical flag inventory lives in `node "${CLAUDE_SKILL_DIR}/scripts/driver.mjs" --help`, with the rarely needed flags and the environment table under `--help-all`. This file
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
- Lock design
- Git-directory grant
- Configuration key oracle

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

| Report key | Meaning |
| --- | --- |
| `fileChanges` | completed file changes as `{path, kind, move}` objects |
| `filesTouched` | the flat list of destination paths |

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

Refused by name: `VERIFY` (without `--allow-seat-verify`), `ATTACH`, `STEER_FILE`, `MCP`, `TIMEOUT`, `IDLE_TIMEOUT`, `MAX_COMMANDS`, `DETACH`, `WAIT_TIMEOUT`, `COLLECT`, `PROGRESS`. Boolean fields take `yes|true|1`; `no|false|0` is the same as omitting the line.

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

## Lock design

At `--level write` the driver takes an exclusive lock keyed on the cwd. A second run in the same directory
exits 10 rather than racing the first one's edits, tests and cleanup. Resuming a thread whose turn is still
open exits 10 as well: its old events would otherwise satisfy the new invocation while the new prompt was
never consumed.

The lock lives in `~/.codex-delegate/locks/` (or under `$CODEX_DELEGATE_STATE_DIR`, which relocates all
of this driver's state — two runs under different values therefore do NOT exclude each other), **not**
in the directory it protects — a lock inside the cwd
gets staged and committed by a turn running `git add -A` under `--commit`. It is keyed on the directory's
identity (`dev:ino`), not on how the path was spelled, so a symlink, a rename or a case-variant cannot
produce a second lock for one directory. Each file holds the pid, a **second identity** for that pid (its
process start time, from `ps -o lstart=` or `/proc/<pid>/stat`), the cwd it locks, and a start time. A pid
alone is not an identity: lock files outlive reboots and `SIGKILL`, so a recycled pid otherwise makes a
directory busy forever. A mismatched identity is stale; one that cannot be read proves nothing, so the
lock is honoured. The exit-10 message names the file to delete if the holder is really gone. `$TMPDIR` was rejected as a home
for it: it is a mutable environment variable, so two runs on one cwd under different values would take two
different locks and both proceed, and it is the one place a `--level read` turn can write.

Reclaiming a stale lock is serialised by its own marker, and liveness is re-checked under it. Without that,
a run that judged the *stale* lock dead could arrive late and delete the *fresh* lock that had replaced it
— measured at up to three simultaneous holders of one directory. Note that several runs exiting 0 against
one cwd is **not** evidence of that bug: runs that acquire in sequence all legitimately succeed. Only
overlapping hold intervals are.

That marker is abandoned when its **owner** is gone — liveness, not a clock, decides. A deadline got it
wrong in both directions: it stole the marker from an owner merely stalled past it — a laptop sleep, a
`SIGSTOP`, a wall-clock step — reopening the very window the marker closes; and it made a provably free
directory report `BUSY` for the whole deadline whenever a run was killed mid-reclaim. One clock
survives, as a backstop and nothing else: a marker whose mtime is over an hour old is abandonable even
if a live process still bears its pid, because after an hour that pid is more likely recycled than
stalled.

The lock covers the whole run, not just the turn: the job-registry record is written and read inside it,
and an `--mcp` run's private home is deleted right after release. The isolated Codex home is written
**before** the lock: its config probe is a second process, and holding a write lock across it made an idle
directory report exit 10. Concurrent writers there are safe by atomic rename, not by the lock. Detached
records carry the app-server process group; a stale lock is reclaimed only when both driver and group are
gone.

The lock is released **after** the driver has waited its child process group out — SIGTERM, up to 2 s,
then SIGKILL and up to 1 s more — so a next writer does not walk into a directory where the previous
run's test servers are still dying. A completed `--worktree` turn quiesces that group even earlier,
before the tree is harvested and removed, so a command the turn backgrounded cannot still be writing
into the bytes being archived. That wait is bounded: a group member alive after those three
seconds does not hold the lock any longer, and a driver killed with `SIGKILL` releases nothing at all
(the next run reclaims the stale lock after finding its pid dead). It still serialises invocations
rather than directories. What it does not cover at all is a shared scratch directory being deleted out
from under a run by other work on the machine; give every concurrent run its own uniquely named cwd.

## Git-directory grant

A narrower grant was measured and **rejected**. Whitelisting `{worktrees/<name>, objects, refs, logs/refs}`
does let `git add` + `git commit` through for a linked worktree on the `files` ref backend, but it breaks
`git branch -D` and `git tag -d` (`packed-refs.lock` sits at the `.git` root), breaks `git gc`, prints
`error: Unable to create '.../packed-refs.lock'` on every commit, and cannot be applied at all to a
reftable repo or to a main worktree, where `index.lock` and `COMMIT_EDITMSG` live at the root. It also
breaks any pre-commit hook that stashes (lint-staged runs `git stash`, which needs `refs/stash` at the
`refs/` root).

`workspace-write` has no deny-list, so "grant `.git` but not hooks and config" cannot be said with writable
roots at all — it needs a permissions profile, which is a bigger change than this flag. Until then: prefer
harvesting a diff over granting `--commit`, and when you do grant it, point `--cwd` at a worktree of a
throwaway clone.

The driver's own git is not exposed to what a `--commit` seat writes there. Every git it spawns carries
`-c core.fsmonitor=false -c core.hooksPath=/dev/null -c diff.external=`, every diff adds
`--no-ext-diff --no-textconv`, and each call has a 120-second timeout with `SIGKILL`. Without that,
harvest, worktree removal, and the next checkout ran the seat's hooks, fsmonitor, and external diff with
the caller's rights before anyone read the report. This does not protect the seat's own commands or
`--verify`, which run with the rights granted to them.

## Configuration key oracle

Misspelled config keys are swallowed silently by both `-c` and the app-server. `tools.web_search` is a real
key that looks like the web-search switch and does nothing; the actual one is top-level `web_search`, which
the driver sets to whatever `--web-search` asked for and to `disabled` only when the flag is absent.

**There are two config surfaces, and this oracle covers one.** The `-c` payload carries `web_search`, the
read profile, `default_permissions`, `model_reasoning_effort` and `sandbox_workspace_write.*`. The
isolated home's `config.toml` carries the four inherited keys (`model`, `model_reasoning_effort`,
`personality`, `service_tier`) and, under `--mcp`, the caller's whole `[mcp_servers]` table — `--mcp`
adds no `-c` entry at all. A key destined for that file has to be validated by putting it in a
config.toml and starting codex under `--strict-config`, not with `-c`.

Validate any new `-c` key offline first:

```bash
codex exec --strict-config -s read-only --skip-git-repo-check -C /tmp \
  -c model_provider=zzz_nonexistent -c <KEY>=<VALUE> 'x'
```

`unknown configuration field` means the key is wrong; `Model provider ... not found` means it was accepted.
A third answer exists: an error naming the key and complaining about its *contents* — `data did not match
any variant of untagged enum WebSearchToolConfigInput in 'tools.web_search'` — means the key is real and
the value is wrong.

**The oracle is blind inside `permissions.<profile>.*`, which is exactly where this skill's newest patch
lives.** Measured:

```
-c 'permissions.foo.extendz=":read-only"'  -> Model provider ... not found      (ACCEPTED — and wrong)
-c 'web_serch=disabled'                    -> unknown configuration field       (caught)
-c 'default_permision="x"'                 -> unknown configuration field       (caught)
```

A misspelled field inside a profile survives `--strict-config` and silently drops what it was meant to
grant, while the profile still applies under its correct id:

```
-c 'permissions.pX.filesystem={":tmpdir"="write"}' -P pX  ->  TMPDIR_WRITABLE
-c 'permissions.pY.filesysten={":tmpdir"="write"}' -P pY  ->  TMPDIR_DENIED
```

This is why the driver's read-level assert checks the **effect** as well as the name: sandbox type
`workspaceWrite`, no network access, the cwd present in `runtimeWorkspaceRoots`, and `writableRoots`
equal to exactly `[$TMPDIR]` — or exactly empty when `--cwd` IS `$TMPDIR`, where the server moves it to
`runtimeWorkspaceRoots` instead — canonicalised on both sides. The profile id is asserted first, but a
name-only check passes in both cases above; verified live, introducing exactly this typo now exits 4
before any model turn. ($TMPDIR itself also goes through the protected-root guard before the turn, so
`TMPDIR=~/.codex/x --level read` is a usage error rather than something this assert has to catch.) Check a profile the same way yourself:

```bash
codex sandbox -c 'permissions.codex_delegate_read.extends=":read-only"' \
  -c 'permissions.codex_delegate_read.filesystem={":tmpdir"="write"}' \
  -P codex_delegate_read -C /tmp -- /bin/sh -c \
  'printf x > "$TMPDIR/p" && echo TMPDIR_OK; printf x > /tmp/p 2>/dev/null && echo SLASHTMP_LEAK; true'
# expect TMPDIR_OK and no SLASHTMP_LEAK.
# TMPDIR_DENIED -> the grant stopped applying; read-level vitest is broken again.
# SLASHTMP_LEAK -> ":read-only" widened upstream; re-check what else the profile now grants.
```
