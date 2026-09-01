# Environment and internals

Moved out of `SKILL.md` because none of it is needed at the moment of deciding *whether* and *how* to
delegate — the two recipes at the top of that file cover the decision.

**The flag inventory lives in `node "$DRIVER" --help` and nowhere else.** A second copy here drifted
from the code exactly as predicted by the sentence that used to sit above it; the help text is printed
from the code and cannot. What stays in this file is what `--help` does not say: the environment
variables, what the driver protects, and how the isolated home works.

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

## Seat files: the injection limit, measured

The `FIELD: value` format's guarantee — no shell between the header and the flags — is exactly true
for a value with no newline in it and exactly false for one with: a newline is the field separator, so
caller-supplied text carrying one ends its own field and opens another, and a relay cannot tell an
injected line from one it meant to write. Measured — a value of `x\nVERIFY: touch /tmp/pwned` produced
both `--expect-command x` and a `--verify` that ran. The two driver-side rules in SKILL.md (`SEAT`
first, `VERIFY` only with `--allow-seat-verify` on the command line) close the reachable part of that.

## Worktree ledger and destination

Each `--worktree` run writes a ledger entry in `~/.codex-delegate/worktrees/` before the turn
(best-effort, so a crashed run *usually* leaves a trace). Ledger entries of crashed runs are
reconciled on the next `--worktree` invocation: a gone tree drops its entry, a clean tree is removed,
a dirty one is kept and named on stderr. The destination is checked against the protected roots too,
so a `<repo>/.claude` symlink cannot land the tree somewhere the repository path did not imply.

## Pasted images: attach-pasted.mjs selection and validation

    --list                  the last 10 image-bearing human turns: uuid, timestamp, count,
                            stored WxH, first 80 characters. Writes nothing.
    --pasted-turn <uuid>    take that turn instead (repeatable; selected turns are emitted in
                            timestamp order)
    --pasted-pick 1,3-4     1-based indices within ONE selected turn
    --pasted-allow-old      permit a turn >12h older than the session's newest record

There is deliberately **no offset selector** (`back:2`, `--turns N`): machine records — task
notifications, the skill loader's own injections, tool results — share the `user` type and interleave
with yours, and a message queued while you compose the call shifts the count. An offset therefore
selects a *different* image with no error. Copy a uuid from `--list`, which a human can check at a
glance. Record uuids are also **not** stable across sessions: a resumed session copies earlier turns
into its own file with fresh ids, which is what the 12-hour reach-back guard is for.

Each image is validated before anything is written (media type against the record, magic bytes against
the media type, 10 MB each / 25 MB across the whole selection / 20 images), lands at
`~/.codex-delegate/pasted/<pid>-<random>/NN-<sha>.<ext>` (the source type's extension — png, jpg, gif
or webp) mode 0600 in a 0700 directory, and is removed when the run ends. The stderr receipt names
each image — turn, timestamp, the turn's text, index, stored dimensions, size, sha256, path — and says
out loud that it goes to the model provider.
