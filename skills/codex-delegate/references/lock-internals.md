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

That marker is abandoned when its **owner** is gone, never on a timer. A clock got it wrong in both
directions: it stole the marker from an owner merely stalled past the deadline — a laptop sleep, a
`SIGSTOP`, a wall-clock step — reopening the very window the marker closes; and it made a provably free
directory report `BUSY` for the whole deadline whenever a run was killed mid-reclaim.

The lock covers the driver's lifetime, not its descendants'. It is released at process exit, while
test servers and browsers spawned by the turn may still be dying — so it serialises invocations, not
directories. What it does not cover at all is a shared scratch directory being deleted out from under a
run by other work on the machine; give every concurrent run its own uniquely named cwd.

