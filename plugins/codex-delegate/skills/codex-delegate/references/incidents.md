# Incidents behind the rules

The measured failures that produced SKILL.md's imperatives. Each line is evidence, not folklore: if a
rule ever looks like ceremony, this is what it cost to learn.

**Isolation.** Of 157 delegations run against the caller's own `~/.codex`, 95 spent their FIRST tool
call reading `~/.codex/plugins/cache` instead of the task (209 of 919 tool calls went there), and one
turn ended having only announced it had to run a plugin's workflow first. Hence the private
`CODEX_HOME`. The caller's `config.toml` had also grown to 36 KB of dead trusted-project records, one
appended per run.

**Composition disclosure.** Under an unstated mix an agent ran the Codex seat first and disclosed it
only in the write-up — the announce-before rule used to be attached only to the case where the caller
named a ratio. Told "no codex", another agent correctly ran none and never said so, because it read the
instruction as "do not open the Codex skill". Both rules are now unconditional.

**The unverified wrapper.** A wrapper subagent started a background Codex job and returned at once with
`suitesPass: "unknown — task forwarded to background job"` and `findings: []` — and the panel counted
it as a seat that had reported. A later seat returned a *task* id, `task-mtfzrffs-0mbqya`, which
matches no rollout; the receipt check would have caught it in milliseconds. A seat that did nothing is
indistinguishable from a seat that found nothing.

**Context cost.** An unbounded seat returned 13 KB of prose into a coordinator that needed a verdict.
`--brief` exists for this; the full text stays at `answerPath`.

**Silent downgrades.** A driver-side effort default silently downgraded a user whose config asked for
`max` to `low` on every delegation — hence effort and model inherit unless flagged. `minimal` was once
refused as a usage error while the server took it; the ladder is now a permissive union and a
server-refused value exits 2 with the server's own list.

**The TOML parser.** Inherited config was once read by hand-parsing the caller's `config.toml` with
line regexes. Four distinct defects surfaced in a single day: a single-quoted value matched nothing; a
multi-line string body was scanned as settings; a duplicate key was emitted, which codex rejects
outright; and a comment merely mentioning `= """` opened a skip that swallowed every setting after it.
The parser was deleted for `config/read` — the server reports the values as it resolves them.

**Redundant flags as crashes.** `--cwd X --writable X` and a root named twice both exited 4 ("codex
crashed") until the driver deduped and subtracted what the server does.

**Worktree leaks, and who actually leaked.** One repository was found holding 64 worktrees and 41 GB.
This note used to blame the manual remove-after-harvest instruction for them; re-measured 2026-09-01,
that attribution is wrong. By prefix: 57 `wf_*` left by Claude Code's own workflow worktree isolation,
3 `agent-*` from a native `Agent(isolation: "worktree")`, 4 hand-made audit trees — and **zero**
created by this driver, whose trees are named `codex-*`. The set dates from 22–25 August with four
more on the 30th, and 22 of the 64 still held uncommitted work, so none of it can be swept blindly.
The lesson outlives its own evidence — a worktree lifecycle nobody owns is a lifecycle nobody performs
— and it is why `--worktree` harvests and removes rather than printing instructions. But the driver
was never the leaker here, and anyone who had compared this paragraph against the directory would have
caught it out.

**Orphaned load.** A review probe launched eight busy loops to measure timeout behaviour under CPU
pressure and put `kill $LOADPIDS` after the measurement. Its parent died first: the loops were
reparented to PID 1 and burned eight of twelve cores for fifteen hours. Kill background load from a
`trap`, and read `ps -eo pid,ppid,etime,%cpu` when a machine feels slow — a load average alone cost an
hour of misreading here. A second occurrence, from a coordinator's own shell: CPU load generated with
`for i in $(seq 1 10); do (while :; do :; done) & done` and cleaned up with `LOADPIDS=$(jobs -p); …;
kill $LOADPIDS` left twenty-two busy loops on PID 1, burning half a core each for nearly eight hours —
under the tool harness the command runs inside its own `zsh -c` wrapper, where `jobs -p` reported
nothing, so `kill` killed nothing and the wrapper exited first. Record pids as you spawn them, and
check with `ps -eo pid,ppid,etime,command | awk '$2==1'` — a delegation's own teardown is not what
leaks here. Separately, an eval-suite fake server and a hung driver copy from `/tmp`
survived their sessions by ~22–38 hours (one of them ignored SIGTERM outright) — the shutdown path now
waits for the process group and escalates to SIGKILL, and the suites pin it with a TERM-ignoring
survivor.

**Red-green seats.** Three mutation-testing seats ran suites against deliberately broken copies;
`commandsFailed` was 24, 17 and 9, and exit 11 announced failure for work that had succeeded. Pass
`--verify` with the end condition you actually want; a passing check overrules failed commands by
design.

**Safety classifier.** A seat asked to find where a guard could be "defeated", build a "hostile" home
and "break" a policy check came back `turnStatus: failed`, `codexErrorInfo: "cyberPolicy"` — twice more
on earlier occasions. The same work described as robustness under unusual filesystem states ran fine.
The Claude side has the same mechanism with a heavier cost: an audit brief asking to "bypass the
guard", "forge the receipt" and "break the contract" tripped Anthropic's classifier as `[cyber]` on
the first message, before a single file was read, and fell the session back to another model for its
whole remaining life (`model_refusal_fallback`, `scope: session`) — and that brief had been drafted by
a Claude coordinator using this skill.

**Fan-out physics.** On a 36 GB machine already carrying other work, exceeding the memory budget got
delegations SIGTERM-killed by the OS, reported as `interrupted by SIGTERM`. Turn overhead measured 6.6 s
isolated / 8.2 s host-home once, and 9.2 s / 11.7 s hours later on a LESS loaded machine — it is
dominated by provider round-trips; treat it as 7–12 s and do not tune against the number. A wrapper
script that forked three children (8 s, 25 s, 45 s) and ended in `wait` reported once at 45 s where
separate launches reported at 11.5 s, 28.2 s and 48.4 s — `wait` is a barrier, use it only when you
wanted one.

**Report integrity.** A 20 MB report was truncated at 262144 bytes by exiting before stdout drained. A
cyrillic answer sailed past a 4000-"byte" cap at 8003 actual bytes because `.length` counts UTF-16
units. A deliberate refusal after spawn had its exit code rewritten to 4 by the child-exit handler —
`fail()` now marks the run settled. Two deliberate attempts to make `--answer-json` come back as prose
both returned bare JSON.

**Resume rights.** A thread started at read level was resumed at write level and the write succeeded —
rights are per call, on resume as everywhere else. Verified, not assumed.
