# The cwd lock: how it is keyed, and how it is reclaimed

<!-- Extracted from SKILL.md: depth a caller does not need while deciding what to run.
     Read it when the pointer in SKILL.md sends you here. -->

At `--level write` the driver takes an exclusive lock keyed on the cwd. A second run in the same directory
exits 10 rather than racing the first one's edits, tests and cleanup. Resuming a thread whose turn is still
open exits 10 as well: its old events would otherwise satisfy the new invocation while the new prompt was
never consumed.

The lock lives in `~/.codex-delegate/locks/`, **not** in the directory it protects — a lock inside the cwd
gets staged and committed by a turn running `git add -A` under `--commit`. It is keyed on the directory's
identity (`dev:ino`), not on how the path was spelled, so a symlink, a rename or a case-variant cannot
produce a second lock for one directory. Each file holds the pid, the cwd it locks and a start time, and
the exit-10 message names the file to delete if the holder is really gone. `$TMPDIR` was rejected as a home
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

The lock is released **after** the driver has waited its child process group out — SIGTERM, up to 2 s,
then SIGKILL and up to 1 s more — so a next writer does not walk into a directory where the previous
run's test servers are still dying. That wait is bounded: a group member alive after those three
seconds does not hold the lock any longer, and a driver killed with `SIGKILL` releases nothing at all
(the next run reclaims the stale lock after finding its pid dead). It still serialises invocations
rather than directories. What it does not cover at all is a shared scratch directory being deleted out
from under a run by other work on the machine; give every concurrent run its own uniquely named cwd.

