# Trigger and behaviour evals for codex-delegate

`evals.json` holds the cases: the prompts this skill must fire on, the prompts it must stay silent on,
and the things it must get right once it has fired.

## Why these exist

A delegation skill fails in two directions, and both are quiet. If it never fires, work that wanted a
second, decorrelated opinion silently gets one Claude's opinion instead. If it fires on everything, every
trivial question costs 7–12 seconds of turn overhead and ~180 MB. Neither shows up as an error.

The negative cases matter as much as the positive ones. Case 9 is the sharp one: `codex` appearing as part
of a filename must not pull in the whole skill.

Cases 16–19 cover composition rather than triggering — that the stated mix is honoured exactly, that an
explicit "no codex" overrides the panel default, that "only codex" applies to single-agent work and not
just to panels, and that the mix is announced before the seats run rather than reported afterwards. The
failure they exist to catch is the quiet one: announcing "three Claude and one Codex" and then backfilling
the Codex seat with a Claude when it returns nothing, which leaves the reader believing the panel was
decorrelated when it was not.

## The runnable suites

All seven are runnable and should stay green. One command runs them all, cheapest first, stopping at the
first red suite and printing one summary line:

```bash
npm test                # = node evals/run-all.mjs
```

Individually, when one of them is the thing being worked on:

```bash
node evals/package.test.mjs         # what ships, and the version it says it is
node evals/agent-contract.test.mjs  # the shipped relay agent against the driver
node evals/attach-pasted.test.mjs   # handing a seat the images the user pasted
node evals/conformance.test.mjs     # the fixture against the pinned schemas
node evals/protocol.test.mjs        # every case in CASES, against evals/fake-app-server.mjs
node evals/lock.test.mjs            # the cwd lock, which the protocol suite cannot reach
node evals/fidelity.test.mjs        # does the FIXTURE answer like the real server? needs codex, skips without
CODEX_DELEGATE_LIVE_TURN=1 node evals/fidelity.test.mjs   # spend one real turn on live item shapes, probes, and receipt
```

The counts are deliberately not written down here — the last one was wrong twice in two days. The `CASES`
arrays are the inventory, and each suite states its own count in its last line.

`evals/lib/harness.mjs` holds what every suite needs a copy of otherwise — the temp directories, the
`codex` shim, one spawn helper, the case registrar and the pass/fail loop — and re-exports the driver's
own `EXIT`, `SEAT_FIELDS`, `LADDER` and `lockKey` rather than letting a suite restate them.
`driver.mjs` runs `main()` only when it IS the entry point, which is what makes importing it safe.

`.github/workflows/ci.yml` runs the six free suites — package, agent-contract, attach-pasted,
conformance, protocol, lock — on {ubuntu, macOS} × Node {18, 24}. It installs nothing and calls no model.

`fidelity.test.mjs` is the exception and runs LOCALLY, before a release: it needs the real `codex` and an
authenticated home, and its opt-in live-turn case spends a real turn. Absent the binary it exits 0,
which makes "portable behaviour passed" and "fidelity was verified" the same code — so the local
pre-release run passes `--require-live` (or sets `REQUIRE_LIVE_CODEX=1`) and the skip becomes a failure.

`fidelity.test.mjs` asks a different question from the fixture-driven suites, and it exists because of
a failure they structurally cannot see. They drive the driver against the fixture, which proves the driver
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

**That check was run against every case, and six mutations survived it.** An external audit
(2026-08-31) built nine mutants and found that removing the group wait, removing the exit handler's
group `SIGKILL`, replacing `findRollout` with `return null`, hardcoding the model, never sending
`outputSchema` to the server, and deleting the token-usage thread filter all left 117/117 cases green.
Each of those was a case that could not distinguish, not a case that was missing:

- **the model** — the fixture's inherited fallback was the same literal a hardcoding driver would send,
  so it now reports the REQUEST (`inherited` / `explicit:x`) instead of a plausible model name;
- **the schema** — the fixture branched on the scenario name alone and never looked at
  `m.params.outputSchema`, so it now answers in prose when it was sent none;
- **tokens** — one event and one number, with nothing to be confused by, so a subagent thread's usage
  now arrives after the root's with a bigger total;
- **the receipt** — the only case asserted `receiptOk: false`, so there is now a planted rollout and a
  positive case, plus a mismatched one whose `session_meta` names another thread;
- **the teardown** — two independent mechanisms satisfy the survivor case, so neither was pinned alone.
  What the wait actually buys is the lock-release ordering, and that is now measured as a DIFFERENCE
  against a control run: a TERM-ignoring descendant must cost the run its full `SIGTERM` wait.

The lesson generalises: a mutation survives when the fixture's answer for the correct code and the
mutant's answer are the same string. Look for assertions whose expected value could have been produced
by the bug.

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
grep -oE '"skill":"(codex-delegate:)?codex-delegate"' <transcript>.jsonl | wc -l   # plugin input is codex-delegate:codex-delegate
```

The count is the verdict. Do not grep for the string `codex-delegate` alone: it appears in every
transcript as part of the available-skills listing in the system prompt, so a skill that never fired still
matches twice. Two full runs (2026-08-30) confirmed the method separates them cleanly: across 19 cases the scorer worked from agent transcripts and Codex rollout logs, and every one of the fourteen self-reports of delegation or non-delegation turned out truthful. Three lessons cost real runs. Give the subject agent the Task tool, or a case about composition cannot be scored — one agent made all four seats Codex because Claude seats were physically unavailable to it, which measures the harness, not the skill. Never hand a subject a prompt with a blank in it: a template asking it to relay a counter-argument it was never given tests nothing, and refusing to invent one is the correct behaviour. And expect the safety classifier to block a case whose natural response is an unscoped `codex:codex-rescue` fan-out — two cases died that way, which is itself the finding: agents reach for the plugin agent by default, and without a MODE block it defaults to --write. A pilot on cases 1 and 7 also separated them cleanly — one `Skill` call for
the positive, zero for the negative, which reached for local search instead.

Ask the agent to self-report as well, but treat that as a cross-check only. An agent's account of which
tools it used is exactly the kind of claim this skill exists to distrust.

## The relay eval (codex-seat)

The critical property is mechanical relay: write the prompt verbatim, run the one driver command, repeat
only the command printed for collection, and return the envelope unchanged. The final body was measured
live on 2026-09-03 with nested Claude calls.

- **sonnet: 3/3.** A header-less prompt stayed header-less and ran as a read seat; `SEAT: write
  /nonexistent/dir` returned exit 2 and created nothing; a running seat reached its final envelope after
  three verbatim `collect:` repeats.
- **haiku: envelope 3/3 and eight collection repeats verbatim.** On a header-less prompt it nevertheless
  added `SEAT: read <dir>` and `ALLOW_NO_COMMANDS: yes` in both of two runs despite “add nothing.” The
  rights stayed read-level, but the added waiver weakened an evidence gate. In one earlier run under
  wording since removed it also rewrote an existing write seat as read.

The pin therefore stays sonnet. Re-run all three cases before lowering it. Earlier relay failures and the
rules they produced live in [incidents.md](../skills/codex-delegate/references/incidents.md#a-relay-on-a-small-model).
Still unmeasured live: the plugin-install route (`--plugin-dir` plus redirected `HOME`) and the
`DRIVER_NOT_FOUND`/exit-90 sentinel.

## The Russian trigger cases (20–23)

Run 2026-08-31 with the cheap harness (`claude -p --max-turns 2 --allowedTools Skill`, counting
`grep -oE '"skill":"(codex-delegate:)?codex-delegate"' <transcript>.jsonl | wc -l`): case 21
(панель ревьюеров, no codex/gpt token) fired on
semantic match alone; case 23 (skill name inside a filename) stayed silent, both as specified. Cases
20 and 22 came back inconclusive, not failed: given a prompt about "этот дифф" with no diff attached,
the session spent its two turns reaching for `git diff` (denied — Bash was not in allowedTools) and
never got to skill selection. Score those two only with a real diff in a real repo and full tools —
under this harness they measure the harness.

## What no pass has attacked

The coverage ledger — the honest ceiling on any "adversarially reviewed" claim, moved here from the
0.1.0 changelog because it is a living list, not history. **As of 2026-09-02 (Unreleased):**

`evals/fake-app-server.mjs` is still the oracle for every protocol and lock assertion, and three fixture
failures have already kept false confidence green: schemas were not strict; commands were emitted bare
while the live server wraps each as `<shell> -c '<script>'` with bare text in `commandActions` (making
the probe exemption dead in production); and `exitedReviewMode.review` was invented as an object instead
of the live string. The fixture now emits those shapes, conformance drives its exported `SCENARIOS`
inventory (regex discovery had skipped eleven scenarios, including both review emitters), and
`CODEX_DELEGATE_LIVE_TURN=1` diffs live item key sets against fixture helpers. Assume more of that.

Struck by being attacked: the verify-exit-126 branch (covered), the `budget-exhausted` branch
(covered, via an overridable floor because the timing window is a coin flip), the receipt locator
(covered, positively and with a mismatch), signals (`SIGINT`/`SIGTERM`/`SIGHUP` each covered), the
lock-release ordering (covered as a differential), the seat file's rights-injection surface (covered),
`$TMPDIR` as a writable root (covered), the worktree destination (covered).

Struck since: resume (the protocol suite pins resume-busy, resumed-thread attribution and a resumed
seat's budget; the lock suite pins `--resume last`), the stdout drain path (a closed pipe and a paused
one, both during a large report), `--ephemeral` (no job record, no continue-with line, nothing for
`--resume last`), `--host-home` (a TERM-ignoring descendant swept, the lock released, the report written,
under a temporary home), and Linux — unmeasured until CI, now a matrix leg on every push.

Still untouched: the managed-profile (`managedWebSearchModes`) path, which needs a real MDM plist. Nobody
has installed this on a clean machine other than in a redirected `HOME` under an audit. The protocol and
lock suites' own assertions were used as mutation detectors but never questioned. Strike items from this
list by attacking them, not by shipping features near them.

## Keeping them honest

Two rules, both learned the hard way in this repo:

Use unguessable ground truth. A case whose answer appears in `AGENTS.md` or `CLAUDE.md` will look like it
passed while nothing actually ran, because those files are loaded automatically. Prefer a value that has
to be fetched — a branch name that contradicts the documented default, a hash of a file you just wrote.

Run the machine, not the memory. Memory is the binding constraint: an isolated delegation costs ~181 MB
median over four processes, a `--host-home` one ~471 MB over seven — the difference being a private copy of
every MCP server in `~/.codex/config.toml`. Run these in waves rather than all at once. A case killed by
the OS reports as a trigger failure and is not one.
