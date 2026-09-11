Codex gpt-6-astra A1: complete; I audited the proposal against the global instructions, 13 repository comments, and the documentation without changing files.

1. **The strongest failure: it leaves the documentation problem untouched.**

**Proven:** README repeats the same claim within its opening paragraphs: “cannot report as though it had” at [README.md:8](/Users/ruliny/Git/codex-delegate/README.md:8) and “report as though it had” at [README.md:19](/Users/ruliny/Git/codex-delegate/README.md:19). Neither passage is a code comment, so neither enters the proposed review.
[README.md:96](/Users/ruliny/Git/codex-delegate/README.md:96) adds “The `mkdir -p` is not decoration”; [skills/seat/SKILL.md:52](/Users/ruliny/Git/codex-delegate/skills/seat/SKILL.md:52) says “Write a prompt you were handed VERBATIM: not a quote, not a `$`, not a header line it has, and add”. The latter never supplies the verb governing those prohibitions. The proposal cannot improve either sentence.

The existing comment rule, verbatim, from [CLAUDE.md:15](/Users/ruliny/.claude/CLAUDE.md:15):

> Code comments only for what the code can't say — no narration, no "fixed X" markers.

The proposal **duplicates** that gate and its narration/history bans; **extends** it with examples, alternatives and a comment-specific check. The global file already requires verification and cutting sentences that change no action. “Match density” can contradict that economy; indiscriminate “delete on sight” conflicts with its scope restriction at [CLAUDE.md:13](/Users/ruliny/.claude/CLAUDE.md:13).

2. **The rules misfire on meaning and under-fire on accuracy and writing quality.**

Below, quotations are comment excerpts. “Survives” means the delete-list does not reject it. Literal keyword readings are identified explicitly: the proposal does not resolve those against its semantic “keep” rule.

- [skills/seat/scripts/driver.mjs:45](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:45): “Search stays disabled by default because it makes repository work depend on today's index.” **Delete if `today` includes its possessive. Incorrect:** this explains dependence on changing search results, not when the comment was written.
- [evals/fake-app-server.mjs:375](/Users/ruliny/Git/codex-delegate/evals/fake-app-server.mjs:375): “must not truncate a previously inherited config.” **Delete under literal `previously`. Incorrect:** this describes state preserved after a failed probe, not development history.
- [evals/lock.test.mjs:125](/Users/ruliny/Git/codex-delegate/evals/lock.test.mjs:125): “Replace, rather than overwrite, the driver's lock: the pathname now belongs to a peer.” **Delete under `now`. Incorrect:** “now” identifies a transition inside the test. Preserve the ownership explanation.
- [evals/lib/harness.mjs:26](/Users/ruliny/Git/codex-delegate/evals/lib/harness.mjs:26): “Node warns past ten listeners”. **Delete under “a number stays only if…” Incorrect:** this platform default explains using one exit handler. I queried the local Node runtime; `defaultMaxListeners` returned `10`. The proposal dropped the source skill’s platform-constant exception.
- [evals/run-all.mjs:55](/Users/ruliny/Git/codex-delegate/evals/run-all.mjs:55): “A suite killed by a signal reports `code` null, and `process.exit(null)` exits 0”; the next line says “used to end the run green.” **Delete as history. Incorrect for the whole comment:** remove the historical tail; retain the explanation for handling a signalled child specially.
- [skills/seat/scripts/attach-pasted.mjs:140](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/attach-pasted.mjs:140): “Streamed, never read whole: the largest transcript on this machine is 28.9 MB and grows.” **Delete as a perishable measurement. Correct for the measurement, excessive for the whole explanation:** retain that transcripts grow and should be streamed.
- [skills/seat/scripts/driver.mjs:143](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:143): “the driver reads item/completed and turn/completed and”, followed by “nothing else.” **Survives inside the explanation for suppressing unused notifications. Incorrect:** the handler processes `item/agentMessage/delta` at [driver.mjs:2674](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:2674) and `thread/tokenUsage/updated` at [driver.mjs:2686](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:2686). A plausible “why” shelters a demonstrably false claim.
- [skills/seat/scripts/attach-pasted.mjs:305](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/attach-pasted.mjs:305): “mkdir's mode is umask-masked; the chmod is not decoration”. **Survives as a non-obvious why. Incorrect to accept unchanged:** the first clause explains the call; “not decoration” adds no technical information. None of the proposed stylistic rules removes it.
- [skills/seat/scripts/driver.mjs:55](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:55): “The prompt cap, over --prompt, over stdin and over the whole seat file including its header.” **Survives. Correct:** it defines the cap’s scope, which `MAX_PROMPT_BYTES` alone does not express.
- [skills/seat/scripts/driver.mjs:48](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:48): “were scattered over the file beside whichever line first needed one”. **Delete as history. Correct:** the former arrangement does not help maintain the constants table.
- [evals/lib/harness.mjs:41](/Users/ruliny/Git/codex-delegate/evals/lib/harness.mjs:41): “The driver spawns `codex` from PATH, so the shim has to be called exactly that.” **Survives. Correct:** explains a naming constraint imposed elsewhere.
- [skills/seat/scripts/cleanup.mjs:40](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/cleanup.mjs:40): “SKILL.md's mktemp template”. **Survives the delete-list. Correct:** identifies the regex’s owning contract. But the keep-list expressly permits pointers *outside* the repository and gives no explicit home to this useful internal pointer.
- [skills/seat/scripts/driver.mjs:1050](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:1050): “Cap the stderr buffer: diagnostics use only its tail.” **Delete as narration. Correct:** immediately adjacent code both slices the buffer and extracts the diagnostic tail.

“No answer → rename, split … or add a type” also chooses the wrong next action: when a comment adds nothing, omit it. The narration example above needs no code refactor.
“Match density” preserves the surrounding verbosity; banning em-dashes does nothing to the false notification claim or “not decoration.”
“Re-read the added comments” neither checks claims against implementation nor catches unchanged comments invalidated by a code edit.

3. **Entire omissions.**

There is no documentation procedure: intended reader, task order, executable examples, duplication, terminology, cross-file consistency, or placement of detail.
Nor can the comment bans simply be extended to all prose: [CHANGELOG.md:3](/Users/ruliny/Git/codex-delegate/CHANGELOG.md:3) explicitly says “Hand-written per release from the tagged git log.” History belongs there.
Dates and citations are treated as permission to retain numbers, without asking whether those numbers help anyone. Global skill installation supplies no stated invocation condition, conflict resolution, or demonstrated improvement on these examples.

4. **adopt with changes**

Replace the proposed section with this final text:

- Apply these rules to comments and documentation within the task’s scope. Do not refactor code solely to avoid a comment.
- Before adding a comment, identify the information missing from the code. If none, omit it. Otherwise consider a clearer name, smaller function or type only when that improves the code independently.
- Keep accurate contracts, non-obvious reasons, non-local consequences, and useful pointers inside or outside the repository. Remove narration, obsolete code, conversational residue and development history; preserve necessary explanations when cutting a bad clause.
- Judge words in context, not by keyword. Preserve operational ordering and compatibility conditions. Keep relevant platform constants, budgets and targets; retain measurements only with useful provenance and a reason the reader needs them.
- Verify explanations against implementation and cited evidence. A date, citation or plausible “because” does not establish accuracy.
- Write direct technical sentences. Remove rhetorical filler, repeated explanations and unnecessary detail. Let information determine comment density.
- For documentation, identify the reader and task; put prerequisites, actions and expected results in usable order. Define necessary terms, consolidate repeated explanations, and move detailed rationale to linked references. Keep release history in the changelog.
- Before completion, review changed prose, affected existing comments and linked contracts. Check examples where feasible; report what was checked and what remains unverified.