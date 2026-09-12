A. Actionable claims

Paths below:
Candidate = /Users/ruliny/Git/agent-skills/research/2026-09-11-markup-round-0/07-lifecycle.md
P = /Users/ruliny/Git/agent-skills/plugins/codex-delegate
D = P/skills/seat/scripts/driver.mjs
R = /var/folders/mf/9v804k_57lq30kwtlr7468xr0000gn/T/lifecycle-audit-ypki0pjw

1. CONFIRMED — The rights assertion does not check every grant.

Quote: “You say what an agent may touch before it starts, and the run stops if the server grants anything else.” Candidate:8; repeated at 155.

Evidence: D:1991–2017 checks the profile, network, workspace membership and writableRoots, but ignores excludeSlashTmp. That field exists in P/schema-0.153.4/v2/ThreadStartResponse.json:1086.

Check: node R/receipt-and-sandbox.mjs
Output:
read sandbox excludeSlashTmp=true: accepted
read sandbox excludeSlashTmp=false: accepted

This uses a temporary copy exposing the unchanged assertion function, with synthetic server responses. Actual server widening was not induced.

Impact: harmed. The claimed protection against a changed server grant is stronger than the implemented check.

2. CONFIRMED — “Saved” does not include ignored output.

Quote: “Made for it, removed once what it did has been saved, and kept for you to look at when the turn or the saving fails.” Candidate:86–87.

Evidence: D:1854 archives untracked files with --exclude-standard. D:1863–1872 explicitly excludes ignored files and merely reports their names. D:1888–1890 then removes the worktree with --force.

Impact: harmed. A reader commissioning an ignored build artifact, generated report or other ignored deliverable can lose it despite a successful harvest.

3. CONFIRMED — Crash commits do not immediately acquire recovery refs.

Quote: “a crashed run’s commits are kept under refs/codex-delegate/.” Candidate:116–117.

Evidence: D:1625–1627 reconciles on a later --worktree invocation. D:1650–1653 skips dirty trees before reaching the ref creation at D:1665–1669.

Impact: harmed. A crashed, dirty tree can contain commits with no such recovery ref. Removing it on the assumption that those commits are already protected can strand them.

4. CONFIRMED — Killing the driver does not necessarily make its lock reclaimable.

Quote: “A write lock goes when its run ends, and one a killed run left behind is reclaimed by the next.” Candidate:122–123.

Evidence: D:1353–1365 requires both the driver and its app-server process group to be gone. D:1450–1452 refuses acquisition while the group survives.

Experiment: a lock naming a nonexistent driver PID and a live temporary process group produced exit 10:
“which is itself gone; wait for it, or stop it with kill -TERM -88052; the lock is then reclaimed on the next attempt without your help”

Full invocation and output: R/driver-probes.json, entry “dead-driver-live-group”.

Impact: harmed. Repeated retries can remain blocked; the README omits the surviving-process condition.

5. CONFIRMED — A receipt establishes session identity, not that this turn happened.

Quote: “That a turn happened at all is backed by Codex’s own session file, opened and its first record read rather than matched by name.” Candidate:156–158.

Evidence: D:2956–2963 accepts a session_meta record with the matching thread ID. It checks no turn ID or turn event. D:3375–3377 calculates the exit independently of the receipt.

Check: node R/receipt-and-sandbox.mjs
Output for a file containing only session_meta and no turn records:
“verified”:true

P/skills/seat/references/environment-and-internals.md:144–151 explicitly limits the proof to the existence of a session record.

Impact: harmed. A resumed session’s old metadata can be mistaken for evidence of the requested turn.

6. CONFIRMED — The promised authoritative help contains contradictory recovery advice.

Quote: “The flags, the report’s fields and every exit code are the driver’s own help, which is where they stay accurate”. Candidate:160–164.

Evidence: node D --help prints “an argument error prints none.” That text comes from D:539. An actual missing-state invocation with a fresh --report-file exited 2 and wrote a report containing:
“ok”:false
“turnStatus”:null
“error”:“no state directory: …”

Full output: R/driver-probes.json, entry “no-state”. Additionally, D:458 explicitly says --help-all lists the remaining report fields.

Impact: harmed. The designated reference tells readers not to expect a report that the driver actually publishes.

7. CONFIRMED — A pre-start refusal can leave an old, apparently successful report.

Quote: “the run is refused before it starts | the report’s error says why”. Candidate:189.

Experiment: pre-created the requested report with:
{"ok":true,"error":"OLD REPORT"}

The driver exited 2, stdout was empty, and the file remained unchanged. Only stderr contained:
“already exists, or is a symbolic link; a report is never written over an entry already there, so name a path of this run’s own”

Evidence: D:940–944; full invocation/output in R/driver-probes.json, entry “taken-report”.

Impact: harmed. Obeying the table can attribute another run’s report to the refused invocation.

8. CONFIRMED — “Changed nothing” does not diagnose the wrong checkout.

Quote: “the agent reports success and changed nothing | it ran against your last commit, not your working tree | commit, then ask again.” Candidate:188.

Evidence: P/skills/seat/SKILL.md:85–86 makes a headerless call a read seat in the current directory. D:264–270 imposes command/answer gates, not a changed-files requirement. A successful review can therefore inspect live uncommitted work and correctly change nothing.

Impact: harmed. The prescribed commit and rerun can be unnecessary, and the diagnosis can conceal the actual cause.

9. CONFIRMED — A missing report does not diagnose out-of-memory termination.

Quote: “a run dies mid-way in a large fan-out, leaving no report | out of memory”. Candidate:190.

Evidence: D:948–961 handles report publication failures independently of memory. P/skills/seat/SKILL.md:164–167 says a missing report means unknown. P/skills/seat/references/environment-and-internals.md:136 describes SIGKILL stranding descendants; it does not require memory pressure.

Impact: harmed. Reducing concurrency does not repair publication failures or identify an external kill.

10. CONFIRMED — Cleanup can list nothing while saved answers and ordinary reports exist.

Quote: “Lists what the plugin left on this machine, suggests what to remove, deletes only what you pick.” Candidate:61.

Experiment: seeded an answer under answers/ and a report under reports/run/, then ran cleanup.mjs --list --json with temporary state, configuration and TMPDIR.

Output:
“rows”:[]
“selectable”:[]
“Nothing this cleanup covers is on this machine.”

Both seeded files still existed. Full inventory: R/cleanup-inventory.json.

Evidence: P/skills/seat/scripts/cleanup.mjs:846–847 enumerates specific categories; ordinary answers and reports are absent.

Impact: harmed. The advertised inventory is incomplete, including data the README says remains until explicitly removed.

11. CONFIRMED — Cleanup does not support the unset-TMPDIR case that the README presents as supported operation.

Quote: “Lists what the plugin left on this machine”. Candidate:61.
Related promise: “the plugin’s own when your shell names none.” Candidate:84.

Check: env -u TMPDIR CODEX_DELEGATE_STATE_DIR=R/state node P/skills/seat/scripts/cleanup.mjs --list --json

Started; exit 2:
“cleanup: TMPDIR is not set to an absolute path, and the seat and test files live under it. Nothing was deleted.”

Evidence: cleanup.mjs:227–230. The driver’s fallback exists at D:2113–2114.

Impact: harmed. A supported delegation setup can leave the advertised cleanup command unusable without additional configuration.

12. CONFIRMED — “Network off” has an undisclosed independent channel.

Quote: “reach the network — off in one line.” Candidate:97.

Evidence: P/skills/seat/SKILL.md:100–101 explicitly says NETWORK: no does not disable provider web search. D:2155 sets web_search independently; D:2164 sets sandbox network access.

Impact: harmed. A reader can believe a continued or configured search-capable agent has been disconnected when only its command egress was denied.

13. CONFIRMED — The login check can concern a different account from the driver’s credentials.

Quote: “check with codex login status. Agents run under that sign-in and spend its quota”. Candidate:24–25.

Evidence: D:1218–1228 links authentication from the passwd home’s .codex/auth.json, ignoring a custom CODEX_HOME for that link. The configuration probe, by contrast, deliberately inherits the caller’s CODEX_HOME at D:1055–1058. The observed codex exec --help also states that authentication uses CODEX_HOME.

Impact: harmed when CODEX_HOME is customized. The checked account and the account charged by the isolated driver need not be the same.

14. PLAUSIBLE — The official-plugin comparison overgeneralizes managed-machine behavior.

Quote: “On a managed machine the approval policy it hardcodes is overridden and its writes come back declined.” Candidate:141–142.

Evidence: P/skills/seat/references/why-not-the-plugin.md:14–24 describes a policy that can exclude “never”; that exclusion is what triggers the described clamp. Being managed alone does not establish that policy.

Fetched source still defaults to “never”:
https://github.com/openai/codex-plugin-cc/blob/db52e28f4d9ded852ab3942cea316258ae4ef346/plugins/codex/scripts/lib/codex.mjs#L67

A managed machine permitting “never” was not available for observation.

Impact: potentially misinformed when choosing an integration.

15. PLAUSIBLE — The official-plugin comparison turns a temporary-write limitation into a prohibition on every test suite.

Quote: “On every machine its read-only agents cannot run a test suite, a build, or anything that stages a file”. Candidate:142–143.

Evidence: the cited reproduction is an EPERM from mkdtemp, P/skills/seat/references/why-not-the-plugin.md:38–42. The fetched implementation selects read-only sandboxing; it does not prohibit commands merely because they run tests:
https://github.com/openai/codex-plugin-cc/blob/db52e28f4d9ded852ab3942cea316258ae4ef346/plugins/codex/scripts/codex-companion.mjs#L491

The read-only Node-suite experiment was blocked before Node started; details in C. Whether that suite runs under the target sandbox is unknown.

Impact: potentially misinformed. The universal claim exceeds the reproduced failure.

16. PLAUSIBLE — “Every test case” is broader than the dated mutation evidence.

Quote: “every test case was mutation-checked and the survivors listed”. Candidate:202–203.

Evidence: P/evals/README.md:174–177 identifies nine mutants against 117 cases on 2026-08-31. Its current inventory at lines 14–16 names twelve suites, including later coverage. The cited ledger does not establish mutation checking of every current case.

Whether additional, unlisted mutation runs cover them is unknown.

Impact: potentially misinformed about the strength of the validation.

B. Contradictions

1. CONFIRMED — Proof is not the only parity difference described.

First statement: “The one place the two differ is proof”. Candidate:99–100.

Conflicting statement: “By default a Codex agent cannot commit: its rights stop short of your repository’s git directory”. Candidate:127–128, under “Where parity stops”.

Deciding evidence: P/skills/seat/references/parity.md:15–16 explicitly gives native worktree committing no Codex equivalent. Lines 21 and 28 identify further configuration/approval differences.

C. Experiments and limits

1. CONFIRMED — Environment observed:
codex --version → exit 0, “codex-cli 0.153.4”
claude --version → exit 0, “2.1.170 (Claude Code)”
codex exec --help and node D --help → exit 0.

Commands and output files: R/version-help-probes.json.
Initial Codex invocations printed “WARNING: proceeding, even though we could not create PATH aliases: Operation not permitted (os error 1)”. Subsequent probes used CODEX_HOME under R.

2. CONFIRMED — Installation/removal command syntax: none found defective in the tested sequence.

Every claude plugin invocation used CLAUDE_CONFIG_DIR=R/claude, created fresh for this audit. Lifecycle mutations ran from R.

Observed:
marketplace add Nowely/agent-skills → exit 0
plugin install codex-delegate@nowely → exit 0
marketplace update nowely → exit 0
plugin update codex-delegate@nowely → exit 0, already version 0.13.0
plugin uninstall … --keep-data → exit 0; seeded data survived
plugin uninstall … → exit 0; seeded data was deleted
marketplace remove nowely --scope user → exit 0; seeded data was deleted
plugin list --json afterward → []

Records: R/claude-install-probes.json and R/claude-removal-probes.json.
Fetched marketplace: https://github.com/Nowely/agent-skills.git

Actual updating between different versions and reloading an already-open session were not observed.

3. CONFIRMED — Four pre-turn driver probes ran without a Codex turn.

Missing state → exit 2, fresh refusal report.
Taken report path → exit 2, old report retained.
Live lock holder → exit 10, refusal report.
Dead driver with live process group → exit 10, refusal report.

Records: R/driver-probes.json. The lock probes used --host-home with a temporary CODEX_HOME, avoiding the isolated-home setup.

4. CONFIRMED — Default success does not establish passing tests or a receipt.

Check: node R/ladder-probe.mjs
Output:
{"commandsRan":1,"commandsFailed":1,"receiptOk":false,"exit":0}

This invokes the exported exit ladder with a synthetic completed-turn context. It is not a live model or test-suite result. Evidence: D:232–275 and D:3313–3319.

5. CONFIRMED — External comparison source fetched.

git clone --depth 1 https://github.com/openai/codex-plugin-cc.git R/official → exit 0.
git -C R/official rev-parse HEAD →
db52e28f4d9ded852ab3942cea316258ae4ef346

The retrieved plugin manifest reports version 1.0.6.

6. PLAUSIBLE — Read-only test-suite counterexample remains unverified.

Command: CODEX_HOME=R/codex codex sandbox -P :read-only -C R -- node --test R/read-only.test.mjs
Started; exit 71; exact diagnostic:
“sandbox-exec: sandbox_apply: Operation not permitted”

Escalated retry: did not start; exit status unavailable; exact diagnostic:
CreateProcess { message: "Rejected(\"rejected by user\")" }

No test count was observed. No project test suite or Codex turn was run.

D. Two weakest sections

1. CONFIRMED — “Troubleshooting”, weakest.

Candidate:188–190 substitutes diagnoses for observations: unchanged files become a checkout mistake, missing reports become OOM, and every pre-start refusal supposedly explains itself in the report. A7–A9 provide concrete counterexamples. Its prescribed actions can discard the useful diagnostic or trigger unnecessary commits and reruns.

2. CONFIRMED — “How it works”, second weakest.

Candidate:155–164 makes the trust claims on which readers would accept results. The rights assertion misses a sandbox field, the receipt checks session identity rather than turn execution, and the supposedly accurate help contradicts observed refusal reporting. Deciding evidence and reproducible checks are A1, A5 and A6.

E. Questions a new reader still cannot answer

1. CONFIRMED — “What does success actually certify?”

The README never explains that failed commands can coexist with exit 0, or that a particular test command needs an explicit expectation/verifier. The distinction decides whether its quick-start “suite green” example is independently established.

Check: node R/ladder-probe.mjs; output in C4.
Contract: P/skills/seat/references/result-gates.md:28–39.

2. CONFIRMED — “How do I recover or apply the work after the throwaway copy disappears?”

Candidate:86–94 describes saving and continuation but supplies no landing procedure, artifact fields or distinction between a harvest and a preserved tree. Those are necessary because a preserved tree may have no applicable harvest.

Evidence: P/skills/seat/SKILL.md:151–160; P/skills/orchestrate/SKILL.md:51–53. Ignored output adds the loss case in A2.

3. CONFIRMED — “How long can a run spend quota, and when do its recovery artifacts disappear?”

The README mentions quota and aging but supplies neither runtime defaults nor retention limits. The driver has no default wall-clock cap, a 900-second silence limit and a 1,000-command limit; retained artifacts are pruned at 14 days or 400 entries.

Evidence: D:65–82. Missing harvested files can prevent worktree continuation: D:1761–1765.

4. CONFIRMED — “Which cleanup operation actually removes my ordinary saved answers, reports and transcripts?”

The cleanup command does not inventory ordinary answers/reports, uninstall removes the plugin data directory, and session transcripts live elsewhere. The document lists storage locations without completing the removal contract.

Evidence: A10’s empty inventory with existing artifacts; C2’s deletion experiment; D:1227–1228 linking sessions outside plugin state.