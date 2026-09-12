# The measurements behind the rules

Every rule in `SKILL.md` and [loop.md](loop.md) rests on something that happened, dated. This file keeps
those events so the rules can be re-examined and so the skill's own text does not have to carry them.
All of them are from one run — one README, one owner, 2026-09-10 to 2026-09-12 — and the record of that
run is `research/2026-09-11-markup-round-0/rounds.md` in this repository. One document is enough to
justify a rule; it is not enough to state a rate.

<a id="m1"></a>**M1. No block-local critic can see across blocks.** A water critic reading an assembled
draft end to end found one claim stated four times in four sections, each defensible where it stood —
roughly 120 words of repetition that every per-block pass had passed.

<a id="m2"></a>**M2. The outer loop runs first on an inherited document.** On 2026-09-12 an adversarial
reader given the whole document and an isolated `CLAUDE_CONFIG_DIR` found thirteen defects older than the
round it was asked about, which three earlier reading-only reviews had all passed. A wave of eleven
critics on round 07 then found forty-one sentence defects in a document six rounds of one or two critics
had reviewed.

<a id="m3"></a>**M3. Compression is how regression enters.** A repair that applied nine verified fixes
correctly turned "your system temp directory is the only thing it may write" (true) into "a scratch space
of its own, one per agent" — shorter, cleaner, and false of `driver.mjs:2001-2015`, which grants exactly
the caller's own shared `$TMPDIR`. The sentence got better by every measure the method had and became a
lie.

<a id="m4"></a>**M4. A claim about a lifecycle is level 3 or a guess.** Round 06 made nine edits, each
checked against a resolving line; four were false and two overstated, every one about what stays on
disk, what is removed and when, or what a continued run sees. The rule was recorded. Round 07 then
introduced five more of the same kind, found by a critic who ran a stub Codex and killed drivers
mid-run. Reading the lines a rule names is not running them.

<a id="m5"></a>**M5. Every round is its own file.** `01-candidate.md` was overwritten in place several
times before the rule existed — the parity table cut, the commands table added, the section names
changed — and those states do not exist; the ratchet could not have been applied to them.

<a id="m6"></a>**M6. A round is frozen when its critics launch.** Two refinements were applied to round
04 while its critics were reading it. The file was regenerated from its deterministic script to the state
they saw, and the refinements became round 05.

<a id="m7"></a>**M7. A level-2 ledger entry about a lifecycle is provisional.** Three claims — a crashed
run's commits kept under a ref, a killed run's lock reclaimed by the next, no report left by an
out-of-memory kill — were entered as verified at level 2 and each fell to a level-3 run in the next
wave. A ratchet on that ledger would have rejected the fixes.

<a id="m8"></a>**M8. A retired phrase is searched for everywhere it could survive.** The retired phrase
"cleanup lists what the plugin left" survived in a table cell with a capital letter; the ledger's
pattern did not match, and the ledger stayed green while the claim stood.

<a id="m9"></a>**M9. A repair is a new draft of every sentence it touches.** A writer handed nine verified
fixes applied all nine and, rewriting one sentence for fix 5, made two neighbouring sentences false;
neither task in that round's gate touched storage layout, so the gate passed it.

<a id="m10"></a>**M10. No count of findings stops the loop.** Seven rounds of one README never met the
earlier stopping rule — two rounds with no regression and no new class of defect — and the wave after
round 07 found forty-one sentence defects and five regressions of the round's own. The owner had not
read any round since the draft; that read is the measurement the rounds were for.

<a id="m11"></a>**M11. The task gate.** A draft's only alert said "Commit or stash first." Run it:
`git stash` takes the changes out of the working tree, a detached worktree made afterwards is still at
`HEAD`, so the agent sees nothing and the reader's own tree has been reverted. Every sentence was
individually true; the recipe as a sequence destroyed work, and no reader answering a question would
have found it.

<a id="m12"></a>**M12. What the task gate cannot see.** Three readers, three tasks, all passed, on a round
that still carried four false sentences no task had to act on and three sections with no level-3
evidence at all. In the wave on round 07 both task readers passed again while five introduced claims
were wrong.

<a id="m13"></a>**M13. The map is not the gate.** An architect-critic given the first structure map raised
four objections that hold: its first column is circular (intended benefit, from the skeleton); provenance
kept standing in for justification; the stopping rule measured exhausted discovery, not correctness;
requiring every map to name weaknesses makes criticism a performance. The first map had marked two blocks
sound that its reader rejected within a minute.

<a id="m14"></a>**M14. Contradiction is its own defect class.** One section of a draft said an agent
reaches the network by default; the next section, "What it stores, and what leaves your machine", opened
with "Nothing leaves your machine." Both passed per-block critics; the duplication counter scored them
as unrelated, sharing no vocabulary. `network: true` is the default and the opt-out is one flag.

<a id="m15"></a>**M15. One idea, one home, counted.** On a draft that had grown from 1158 to 1436 words
because two sections were added and nothing they duplicated was removed, the count read: quota /
sign-in in six sections, the prompt file and its permission in six, the last-commit warning in five.

<a id="m16"></a>**M16. A check is worth its pattern.** The rule-1 check was written as `(?<![\w~])/…`,
whose lookbehind excluded paths beginning with `~` — every path in the document. It reported clean for
three rounds, through two independent reviews, while four violations stood; an auditor found them by
reading. Three more checks in the same project had a line-wrap hole until text was whitespace-normalised.

<a id="m17"></a>**M17. When a rule fires, the rule may be wrong.** The fixed checker flagged
`~/.claude/plugins/data/…` inside the section whose job is to say where things are kept, where the survey
of comparable documents had established literal paths as the convention. Two rules in conflict; the
younger one, the survey's, won as a stated exception.

<a id="m18"></a>**M18. Two safeguards.** A true sentence moved to line 8 met two readers before they
knew what the tool was, and both remarked on it: position is not repaired by truth. And a stronger claim
beats a truer one when a reader meets both, so a weakened claim has to be the only claim left standing.

<a id="m19"></a>**M19. Writing standards lost to no standard.** On 2026-09-10 five published writing
standards were put against two unguided controls, on one README, across ten seats, models hidden from
the judges. Both controls beat both entries of both standards; seven seats of ten proposed nothing. One
observation per cell — enough not to adopt a standard, not enough to state a rate. The chain that moved
that README from 3/6 to 6/6 ran once, one trial per question, and its result is not distinguishable from
chance; which of its four parts produced the gain was not measured.

<a id="m20"></a>**M20. A reader seat told not to run commands reads nothing.** Five Codex `gpt-5.6-luna`
readers briefed "do not run commands" returned "I could not read the document": Codex reads files
through the shell. Told "read it with `cat` and run nothing else", the same five answered thirteen of
fifteen questions with a quote.

<a id="m23"></a>**M23. A qualification is not a fix.** Rounds 04 to 08 of one README repaired findings by
qualifying sentences — "not your reports", "sharing only your sign-in", "a copy with unsaved files is
left as it is", "trimmed when a later run starts" — and two critics with a stub server showed each
qualification wrong at the next level of detail; the regression count went 1, 0, 6, 5, 10. The sections
that regressed were the three that transcribe mechanism, against the skeleton's own rule that generated
reference is linked, never transcribed. Round 09 removed the sentences instead.

<a id="m22"></a>**M22. Budgets are a report.** The owner asked what a budget does for the text; the answer is nothing
directly. Rounds 04 to 07 grew from 1383 to 1611 words, every added word in four sections and every one
of them making a claim truer; a per-section count per round shows that as it happens, which is the
whole use. So `sections.mjs` reports and never blocks.

<a id="m21"></a>**M21. What one wave costs.** On 2026-09-12, on a 1600-word README: Opus with execution
rights ~180k tokens and 17 minutes; Opus on rules and water ~70k and 7 minutes; the Fable dedup ~160k
and 15 minutes; the Astra adversarial seat about forty commands in five minutes; each Sol task seat about
twenty commands in five minutes; each Luna question seat about a minute. Eleven agents, about 410k Claude
tokens plus eight Codex seats.
