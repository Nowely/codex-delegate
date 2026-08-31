# Every flag, and what the driver does with your machine

Moved out of `SKILL.md` because none of it is needed at the moment of deciding *whether* and *how* to
delegate — the two recipes at the top of that file cover the decision, and this covers the typing.
`node "$DRIVER" --help` prints the same surface from the code itself, which is the copy that cannot
drift.

## The full surface

`--cwd <dir>` (required unless `--worktree` or a seat file supplies it) · `--seat-file <file>` (declare
the seat in a file instead of on a command line — for wrappers; `SEAT` first, given once) ·
`--allow-seat-verify` (permit `VERIFY` in a seat file; refused without it) ·
`--worktree <repo>` (write level in a managed worktree)
· `--level read|write` (default `read`) · `--prompt <text>`, or pipe it on stdin (better for long ones;
512 KB cap on both routes) · `--effort none|minimal|low|medium|high|xhigh|max|ultra` (omit to inherit
config) · `--model <slug>` (omit to inherit) · `--timeout <sec>` (default 900, max 7200) · `--commit` ·
`--writable <dir>` (repeatable) · `--network` · `--expect-command <regex>` · `--verify '<shell>'` ·
`--allow-no-commands` (waives the command floor, never a declared expectation) ·
`--resume <threadId>` · `--ephemeral` (non-resumable; the receipt story still holds, but prefer the
default) · `--web-search cached|indexed|live` (off by default) · `--answer-json` ·
`--output-schema <file>` (a validated object with one corrective retry; exit 13 on a final mismatch) ·
`--brief` (cap the inline answer at 20 lines / 4 KB, marker included; the full text is at `answerPath`) ·
`--host-home` (the caller's `~/.codex` instead of the private home) · `--json` (the default, kept so
existing recipes stay valid) · `--footer` (human footer instead of the default JSON) · `--help`.

`--commit`, `--writable` and `--network` require write level.

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

## What is protected, and what is not

Every write-level root — `--cwd`, `--writable`, the git dir `--commit` grants, the destination a
`--worktree` lands in — and the read level's `$TMPDIR` refuse `~/.codex` and `~/.codex-delegate` and
anything inside them, by inode identity: the first holds the receipts a seat is verified by, the second
this driver's locks and answer log. The driver also refuses your home directory itself and every
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
that home's `config.toml`, not by parsing TOML.

Because that file is shared, a process that writes it with different values races every concurrent
delegation. That is not hypothetical: the eval suites drive the driver against a scripted server whose
`config/read` answers `model = "fake-model"`, and before they were given their own
`CODEX_DELEGATE_STATE_DIR` a suite run left exactly that in the shared home, where the next real
delegation read it.
