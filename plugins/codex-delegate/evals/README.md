# Trigger and behaviour evals for codex-delegate

`evals.json` holds the cases: the prompts this skill must fire on, the prompts it must stay silent on,
and the things it must get right once it has fired.

## Why these exist

A delegation skill fails in two directions, and both are quiet. If it never fires, work that wanted a
second, decorrelated opinion silently gets one Claude's opinion instead. If it fires on everything, every
trivial question costs a 7-second process spawn and ~0.5 GB. Neither shows up as an error.

The negative cases matter as much as the positive ones. Case 9 is the sharp one: `codex` appearing as part
of a filename must not pull in the whole skill.

Cases 16–19 cover composition rather than triggering — that the stated mix is honoured exactly, that an
explicit "no codex" overrides the panel default, that "only codex" applies to single-agent work and not
just to panels, and that the mix is announced before the seats run rather than reported afterwards. The
failure they exist to catch is the quiet one: announcing "three Claude and one Codex" and then backfilling
the Codex seat with a Claude when it returns nothing, which leaves the reader believing the panel was
decorrelated when it was not.

## Two suites, one runnable

`protocol.test.mjs` IS runnable and should stay green:

```bash
node evals/protocol.test.mjs      # every case in CASES, against evals/fake-app-server.mjs
node evals/lock.test.mjs          # the cwd lock, which the protocol suite cannot reach
node evals/fidelity.test.mjs      # does the FIXTURE answer like the real server? needs codex, skips without
```

The counts are deliberately not written down here — the last one was wrong twice in two days. The `CASES`
arrays are the inventory.

`fidelity.test.mjs` asks a different question from the other two, and it exists because of a failure the
other two structurally cannot see. They drive the driver against the fixture, which proves the driver
behaves as the FIXTURE expects — and the fixture is one person's model of the server. When that model is
wrong, driver and fixture are wrong identically and every case stays green while production fails. That
happened twice in one day: `move_path` dropped from a rename, and the cwd not subtracted from
`writableRoots`. Both shipped under a fully green suite; both were caught live, hours later.

So this suite performs the same `initialize` + `thread/start` handshake against the REAL `codex` and
against the fixture, and diffs the fields the driver reasons about. No turn is started and no model is
called, which makes it cheap enough to run on every change to either side. It SKIPS loudly when `codex` is
absent — a missing binary is not a fidelity defect — and exits 0 in that case so a machine without codex
can still run the rest.

Its first run found three divergences in eight cases, and taught two things no amount of code review had:
the server applies DIFFERENT subtraction rules depending on where a root came from (`:tmpdir` roots are
canonicalised before comparison, `writable_roots` are echoed verbatim and compared as strings), and
`runtimeWorkspaceRoots` carries the cwd PLUS every extra writable root. The fixture had agreed with the
server by accident, not by construction.

Run it after any change to the fixture, after any change to what the driver sends, and after a codex
upgrade — it is the cheapest protocol-drift detector here.

`lock.test.mjs` exists because `protocol.test.mjs` runs every case at `--level read`, and read level never
locks — so the entire acquire path had no coverage at all. It drives `--level write` against the same
scripted server and seeds the directory states a real one has been found in: a stale lock, an empty one, a
directory or a FIFO where the lock file should be, a lock naming a live process owned by another user.
A case asserts the lock is absent from the protected directory **while the turn is live**, not merely
after it: the defect being pinned is a turn's `git add -A` staging the lock, and by the time the run ends
the lock has already been released.

**Measure the invariant, not a proxy for it.** The concurrency bug in the reclaim path was first "found"
by counting how many of eight racing runs exited 0, and that number proves nothing: runs that acquire in
sequence all legitimately succeed. Two independent reviews and one implementer read those exit codes as a
violation. What settles it is whether two runs are ever inside the critical section *at the same time*, so
the stampede case makes `--verify` — which executes while the lock is still held — do an atomic `mkdir`
and fail if the section is occupied. Deciding which of two competing designs was correct took logging
every acquire/release interval and looking for genuine overlap: the old code reached three simultaneous
holders, the new one never exceeds one.

Some of these races are probabilistic, and a test that catches a bug one run in three is not a regression
test. Where that happened the mechanism is pinned deterministically as well — one case holds the reclaim
marker externally and asserts no driver touches the stale lock while it is held. Prefer that shape: a
probabilistic end-to-end case shows the bug is real, a deterministic one keeps it fixed.

Every scenario there is an ordering that once produced a false success, or that a review demonstrated
could: a command and answer belonging to an earlier turn on the same thread, a completion that overtakes
the response establishing the turn id, a subagent's work on another thread, `false` exiting 1 and being
counted as evidence, a server request nobody can answer, commentary standing in for a final answer, an
item arriving after the turn ended, a `--expect-command` waived by `--allow-no-commands`, and a read-level
permission profile the server did not apply.

A green suite is not the same as a suite that bites. Check the second property by mutating the driver in a
copy and confirming the right cases go red — removing the `threadId` filter must fail the attribution
cases; reverting the read-level guard to a name-only check must fail `profile-effect-dropped` and
`profile-widened`; re-gating `--verify` behind the weaker checks must fail four cases, two of them on the
report rather than the exit code; moving the lock back into the cwd must fail most of the lock suite.
A suite that stays green under mutation is measuring nothing.

Write the mutation faithfully or it proves nothing. Disabling one clause of a multi-clause guard leaves the
other clauses catching the case, which reads as "the test is weak" when the mutation was. And some
mutations are *equivalent* — after `--verify` was moved above the proxy checks, swapping `!verifyPassed`
back to `!opts.verify` changes no reachable behaviour, because a failing verify now short-circuits first.
An equivalent mutant surviving is information about the code, not a hole in the suite; say so rather than
inventing a test to cover it.

The fixture must match `schema-<version>/` exactly. An early version invented a top-level `turnId` on
`TurnCompletedNotification`, which the real server does not send: the suite passed and the live driver
rejected every real completion. A fixture that diverges from the schema is worse than no test, because it
manufactures confidence. When the schema is regenerated, diff the fixture against it.

## The trigger cases

There is no harness for those. `claude plugin eval` exists in the documentation but is early access and
absent from this build — `claude plugin --help` lists no `eval` subcommand. The sibling `arc` skill keeps
its `evals.json` as a document for the same reason.

What does work is observing a real invocation. Give an agent the case prompt verbatim, with no hint that
it is a test, then read its transcript rather than its self-report:

```bash
# after running a case, count actual Skill tool calls in the agent transcript
grep -o '"name":"Skill"' <transcript>.jsonl | wc -l
grep -o '"skill":"codex-delegate"' <transcript>.jsonl | wc -l
```

The count is the verdict. Do not grep for the string `codex-delegate` alone: it appears in every
transcript as part of the available-skills listing in the system prompt, so a skill that never fired still
matches twice. Two full runs (2026-08-30) confirmed the method separates them cleanly: across 19 cases the scorer worked from agent transcripts and Codex rollout logs, and every one of the fourteen self-reports of delegation or non-delegation turned out truthful. Three lessons cost real runs. Give the subject agent the Task tool, or a case about composition cannot be scored — one agent made all four seats Codex because Claude seats were physically unavailable to it, which measures the harness, not the skill. Never hand a subject a prompt with a blank in it: a template asking it to relay a counter-argument it was never given tests nothing, and refusing to invent one is the correct behaviour. And expect the safety classifier to block a case whose natural response is an unscoped `codex:codex-rescue` fan-out — two cases died that way, which is itself the finding: agents reach for the plugin agent by default, and without a MODE block it defaults to --write. A pilot on cases 1 and 7 also separated them cleanly — one `Skill` call for
the positive, zero for the negative, which reached for local search instead.

Ask the agent to self-report as well, but treat that as a cross-check only. An agent's account of which
tools it used is exactly the kind of claim this skill exists to distrust.

## Keeping them honest

Two rules, both learned the hard way in this repo:

Use unguessable ground truth. A case whose answer appears in `AGENTS.md` or `CLAUDE.md` will look like it
passed while nothing actually ran, because those files are loaded automatically. Prefer a value that has
to be fetched — a branch name that contradicts the documented default, a hash of a file you just wrote.

Run the machine, not the memory. Memory is the binding constraint: each delegation costs roughly 0.5 GB,
about half of it a private copy of every MCP server in `~/.codex/config.toml`, so run these in waves rather
than all at once. A case killed by the OS reports as a trigger failure and is not one.
