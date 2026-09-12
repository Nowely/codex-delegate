# Astra — adversarial on 08-review.md, changed sentences hardest (2026-09-12)

A. Actionable claims contradicted by the implementation

Line numbers refer to 08-review.md. Code paths below are relative to plugins/codex-delegate/.

A1. CONFIRMED — Cleanup can delete the reports it explicitly excludes.

Quote, line 59: “Lists the scratch and run directories the plugin left on this machine — not your answers, run records or reports — suggests what to remove, deletes only what you pick.”

An orchestration run directory contains report.json files, including their embedded answers. Cleanup offers that directory for deletion and removes it recursively.

Evidence: skills/seat/scripts/cleanup.mjs:407 identifies report.json inside a run; :434 inventories runs; :865 makes finished runs selectable; :1024 removes their entire contents. skills/orchestrate/SKILL.md:28–30 explicitly places reports in these directories.

Experiment: planted a finished run containing A1/report.json, listed it, then selected its number. Output:
“I deleted the run "review08" in project.”
exit=0; report_exists=false; separate_answer_exists=true.

Harm: a reader can authorize deletion believing reports are excluded, and lose them.

A2. CONFIRMED — The sandbox comparison does not cover every sandbox difference.

Quote, lines 8–9: “You say what an agent may touch before it starts, and the run stops if Codex grants a different sandbox or network than that.”

Also line 157: “The rights the server says it applied are checked against the ones asked for; a difference stops the run.”

The read-sandbox assertion checks profile ID, sandbox type, network, workspace membership and writableRoots. It does not check excludeSlashTmp or excludeTmpdirEnvVar.

Evidence: skills/seat/scripts/driver.mjs:1991–2017. Both omitted fields belong to SandboxPolicy in schema-0.153.4/v2/ThreadStartResponse.json:1086–1093.

Experiment: changed only the repository mock server’s read-sandbox response from excludeSlashTmp=true to false. The unchanged driver continued through turn/start and returned:
exitCode=0; ok=true; sandbox.excludeSlashTmp=false.

Harm: the README overstates the protection against unexpected filesystem grants. Acceptance of the changed response is confirmed; actual OS enforcement of that synthetic response is unknown.

A3. CONFIRMED — “Unsaved files” do not reliably preserve a worktree.

Quote, lines 119–121: “a failed turn's copy until you remove it or a later throwaway-copy run finds it clean and removes it, keeping any commits under refs/codex-delegate/; a copy with unsaved files is left as it is, commits and all.”

The reconciliation check uses git status --porcelain, which ignores ignored files. It can remove a preserved worktree containing unsaved ignored files.

Evidence: skills/seat/scripts/driver.mjs:1650–1653 and :1675–1678.

Experiment: planted a preserved-worktree ledger entry and an unsaved valuable.log covered by *.log. Started another worktree invocation with an intentionally nonexistent --writable directory. Before refusing that invocation, the driver printed:
“codex-delegate: removed a crashed run's clean worktree …/codex-old-12345678”

Result: preserved_tree_exists=false; exitCode=2; threadId=null. No Codex thread started.

Harm: a reader can leave valuable ignored output in a preserved tree expecting it to survive, then lose it during an unrelated later invocation.

A4. CONFIRMED — “Your .gitignore” describes the wrong harvest boundary.

Quote, lines 89–91: “Made for it, removed once what it did has been saved — its edits and new files, not anything your .gitignore covers — and kept for you to look at when the turn, the saving, or the run itself is cut short.”

The untracked archive uses --exclude-standard, which also excludes files through .git/info/exclude and global ignore configuration. Conversely, tracked changes are harvested even when their filenames match .gitignore patterns.

Evidence: skills/seat/scripts/driver.mjs:1837–1838, :1854–1855 and :1863–1868.

Experiment in a temporary repository:
git check-ignore -v secret.txt
Output: “.git/info/exclude:1:secret.txt	secret.txt”

git ls-files --others --exclude-standard
Output: empty, although secret.txt existed and .gitignore contained only *.log.

git diff HEAD -- tracked.log
Output included the tracked file’s change despite its matching *.log.

Harm: new files outside the stated .gitignore exclusion can be omitted from the harvest and deleted. The tracked-file assertion also misinforms.

A5. CONFIRMED — The scratch-retention promise has expanded beyond what is pruned.

Quote, lines 124–125: “Answers, run records and a read-only agent's scratch age out — 14 days or 400 entries, trimmed when a later run starts; reports and the private home stay until you remove them.”

The driver prunes its private state/tmp scratch when it creates another private scratch directory. It does not prune the caller’s TMPDIR or the skill’s codex-seat.* directories. A later run with TMPDIR already set does not trigger private-scratch pruning either.

Evidence: skills/seat/scripts/driver.mjs:1139–1146 and :2113–2114. The complete pruneDir call sites are :1145, :1535, :2991 and :3003. Answers are pruned when written, rather than simply whenever another run starts. The newest entry is exempt from expiration at :3019.

Experiment: planted 30-day-old caller scratch and private state/tmp scratch, then completed another mock invocation with TMPDIR set. Both files remained.

Harm: a reader relying on automatic expiration can retain sensitive material indefinitely and underestimate disk use.

A6. CONFIRMED — The default execution proof is weaker than “ran something”; naming a command in the task is insufficient.

Quote, lines 158–160: “The exit code comes from what the turn actually did, not from what it says it did — by default, that it ran something under those rights; a command that failed does not fail the run unless you asked for that command by name, and a turn meant to run nothing can say so.”

The default floor counts commandExecution items without requiring an observed exit status. The stronger command requirement comes from EXPECT/--expect-command, not a command name in the task text.

Evidence: skills/seat/scripts/driver.mjs:2612 records command items; :3110 sets commandsRan=commands.length; :266 uses that count. Successful matching commands are required only through expectRe at :3112 and :3142. skills/seat/SKILL.md:130 documents EXPECT.

Experiments:
• One unresolved command item, status=inProgress and exitCode=null: driver exitCode=0, commandsSucceeded=0, commandsFailed=0, commandsBlocked=1.
• Prompt “Run false. Report whether it succeeded.” with the mock reporting false exiting 1: driver exitCode=0, expectationOk=null.
• Same invocation plus --expect-command '^false$': driver exitCode=5, expectationOk=false.

Harm: readers can mistake an unresolved execution record for established execution, or believe that requesting a named test automatically makes its success mandatory. Whether the unresolved command actually started is unknown.

A7. CONFIRMED — Session-file backing is optional, not a guarantee of successful reports.

Quote, lines 160–161: “That the thread existed is backed by Codex's own session file, opened and read, not matched by name.”

A missing or unverifiable receipt does not fail the run.

Evidence: skills/seat/scripts/driver.mjs:3375 obtains the receipt, but :3377 decides the exit independently. The exit ladder at :232–275 contains no receipt requirement. :3455 reports receiptOk=false separately.

Experiment: mock runs with an empty isolated receipt directory returned:
ok=true; exitCode=0; receiptOk=false.

Harm: a reader can accept success as carrying independent session-file corroboration when none was obtained.

A8. CONFIRMED — The advertised version pin is not enforced.

Quote, lines 28–29: “codex-cli 0.153.4, the build this is pinned to and was last measured on.”

Evidence: skills/seat/scripts/driver.mjs:3763–3765 only prints a warning when the reported version differs.

Experiment: repository mock server reporting version 9.9.9:
“codex-delegate: this codex is 9.9.9; the plugin's protocol facts and pinned schemas were measured against 0.153.4. Behaviour that contradicts the docs starts here.”

Result: turn/start occurred; codexVersion=9.9.9; exitCode=0.

Harm: readers may rely on an automatic version restriction that does not exist.

A9. CONFIRMED — The private home shares more than sign-in and sessions.

Quote, lines 117–118: “a Codex home of the plugin's own, sharing only your sign-in and your session files, so your own Codex plugins, skills and memories cannot steer a turn.”

It also inherits model, model_reasoning_effort, personality and service_tier from the caller’s configuration.

Evidence: skills/seat/scripts/driver.mjs:1049 names the four keys; :1094 returns them; :1279–1281 writes them into the private configuration. skills/seat/references/environment-and-internals.md:74–78 explicitly documents this inheritance.

Effect: merely misinformed by the “only” claim. This evidence does not establish that host plugins, skills or memories are inherited.


B. Internal contradictions

No strictly internal sentence-to-sentence contradiction confirmed. The findings above concern claims contradicted by implementation or experiments.


C. Experiments and limits

The first command was:
diff -u research/2026-09-11-markup-round-0/07-lifecycle.md research/2026-09-11-markup-round-0/08-review.md
It exited 1 and displayed the changes.

The six mock-driver probes supporting A2 and A5–A8 are reproducible with:
python3 "$TMPDIR/readme08-adversarial-probes.py"

That script uses the unchanged driver, temporary copies of the repository’s fake-app-server.mjs, and state/configuration/receipt directories under TMPDIR. These are protocol-fixture observations, not evidence that the installed Codex release emits the altered responses.

The actual cleanup deletion and actual driver reconciliation refusal supporting A1 and A3 used temporary fixtures. Their corresponding implementation paths and lines are given above.

Claude CLI lifecycle experiments used version 2.1.170, a fresh CLAUDE_CONFIG_DIR for each isolated lifecycle experiment, and local fixture marketplaces under TMPDIR. Uninstall with --keep-data retained the data sentinel; uninstall without it removed it; marketplace removal removed both installed plugins’ data sentinels. Each command exited 0.

Command diagnostic:
codex --version — started; exit 0; exact diagnostic: “WARNING: proceeding, even though we could not create PATH aliases: Operation not permitted (os error 1)”
Version output: “codex-cli 0.153.4”.

No test suite or live model turn was run. No nested codex sandbox was attempted. No network content was fetched. No repository files were modified.


D. Defects introduced or retained in changed sentences

D1. CONFIRMED — “Pinned” introduces an unenforced guarantee.

07: “codex-cli 0.153.4, the build this was measured against.”
08: “codex-cli 0.153.4, the build this is pinned to and was last measured on.”

Evidence: A8. “Pinned” is stronger than the implemented warning.

D2. CONFIRMED — Cleanup’s new exclusion is false.

07: “Lists what the plugin left on this machine, suggests what to remove, deletes only what you pick.”
08: “Lists the scratch and run directories the plugin left on this machine — not your answers, run records or reports — suggests what to remove, deletes only what you pick.”

Evidence: A1. The new reassurance conceals report deletion inside selected run directories.

D3. CONFIRMED — The new harvest qualification names an incomplete exclusion rule.

07: “Made for it, removed once what it did has been saved, and kept for you to look at when the turn or the saving fails.”
08: “Made for it, removed once what it did has been saved — its edits and new files, not anything your .gitignore covers — and kept for you to look at when the turn, the saving, or the run itself is cut short.”

Evidence: A4. The added qualification does not match Git’s tracked/untracked and standard-ignore rules.

D4. CONFIRMED — The new unsaved-file reassurance is false.

07: “a failed turn's copy until you remove it or a later run finds it clean; a crashed run's commits are kept under refs/codex-delegate/.”
08: “a failed turn's copy until you remove it or a later throwaway-copy run finds it clean and removes it, keeping any commits under refs/codex-delegate/; a copy with unsaved files is left as it is, commits and all.”

Evidence: A3. Unsaved ignored files do not prevent removal.

D5. CONFIRMED — Retention’s antecedent broadens while its promised timing becomes inaccurate.

07: “Answers, run records and that scratch age out by count and by age; reports and the private home stay until you remove them.”
08: “Answers, run records and a read-only agent's scratch age out — 14 days or 400 entries, trimmed when a later run starts; reports and the private home stay until you remove them.”

In 07, “that scratch” follows the explicitly identified private scratch for shells without a temp directory. In 08, “a read-only agent’s scratch” also encompasses caller-provided temp storage.

Evidence: A5. The newly stated scope and trigger are false.

D6. CONFIRMED — The new “only” adds a false isolation claim.

07: “a Codex home of the plugin's own, so your own Codex plugins, skills and memories cannot steer a turn.”
08: “a Codex home of the plugin's own, sharing only your sign-in and your session files, so your own Codex plugins, skills and memories cannot steer a turn.”

Evidence: A9. Four configuration values are also inherited.

D7. CONFIRMED — The execution explanation adds ambiguous instructions and retains an overstated floor.

07: “The exit code comes from what the turn actually did, not from what it says it did.”
08: “The exit code comes from what the turn actually did, not from what it says it did — by default, that it ran something under those rights; a command that failed does not fail the run unless you asked for that command by name, and a turn meant to run nothing can say so.”

Evidence: A6. Unresolved command records satisfy the default floor; “asked … by name” fails to identify the required explicit gate.

D8. CONFIRMED — The receipt repair remains unconditional.

07: “That a turn happened at all is backed by Codex's own session file, opened and its first record read rather than matched by name.”
08: “That the thread existed is backed by Codex's own session file, opened and read, not matched by name.”

Evidence: A7. Narrowing “turn happened” to “thread existed” still does not account for successful reports with receiptOk=false.

D9. CONFIRMED — Narrowing the opening guarantee does not make it true.

07: “You say what an agent may touch before it starts, and the run stops if the server grants anything else.”
08: “You say what an agent may touch before it starts, and the run stops if Codex grants a different sandbox or network than that.”

Evidence: A2. Sandbox differences remain that the driver accepts.


E. The two weakest sections

CONFIRMED — “What it stores, and what leaves your machine.”

It combines a false unsaved-file preservation promise, an overbroad expiration promise and a false “sharing only” statement. Those claims affect decisions about retaining artifacts, leaving worktrees unattended and handling sensitive scratch files. Evidence: A3, A5 and A9.

CONFIRMED — “How it works.”

Its core promises exceed the implemented checks: sandbox comparison is incomplete, unresolved command records satisfy the execution floor, task text does not establish an explicit command gate, and successful reports need not have verified receipts. Evidence: A2 and A6–A7.