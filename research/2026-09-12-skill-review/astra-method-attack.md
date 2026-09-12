Citations are relative to /Users/ruliny/Git/agent-skills/:

README = plugins/terse/README.md
WRITE = plugins/terse/skills/rewrite/SKILL.md
LOOP = plugins/terse/skills/rewrite/references/loop.md
RETHINK = plugins/terse/skills/rethink/SKILL.md
STAGES = plugins/terse/skills/rethink/references/stages.md
BAKE = plugins/terse/skills/rewrite/references/bake-off.md
AUDIT = plugins/terse/skills/audit/SKILL.md
RULES = plugins/terse/skills/rewrite/references/writing-rules.md
CURSE = plugins/terse/skills/rewrite/references/curse-of-knowledge.md
MEASURE = plugins/terse/skills/audit/references/measure.md
TRUTH = plugins/terse/skills/audit/references/truth-pass.md
ROUNDS = research/2026-09-11-markup-round-0/rounds.md
DEDUP = research/2026-09-11-markup-round-0/reviews/07/fable-dedup-and-rank.md
RULE-REVIEW = research/2026-09-11-markup-round-0/reviews/07/opus-b-rules-water-contradictions.md

A. UNFALSIFIABLE OR CIRCULAR

A1. CONFIRMED — The method declares its expenditure justified by definition.

“Do not count rounds as a cost” and “a round that finds a new class of defect has paid for itself” (LOOP:75–76).

There is no price, severity threshold, avoided-loss estimate or alternative against which “paid for itself” is evaluated. Discovering an arbitrarily minor new class after arbitrarily expensive work satisfies the rule.

Refutation would require a round whose marginal benefit was smaller than its marginal cost. The rule explicitly refuses to count one side of that comparison.

A2. CONFIRMED — An absence of criticism is classified as critic failure.

“A map that reports every block sound has not been written independently” (LOOP:191–192). Require “a fatal flaw for every structure including the one it ranks first — a critic that cannot fault its own winner has not looked” (STAGES:239–242). “A critic asked for findings will always produce findings” (LOOP:129).

These instructions make both a clean result and a critical result support continued criticism. The method itself recognizes that compulsory weaknesses produce “the appearance of independence, not independence,” but retains the instruction (LOOP:210–211).

Refutation would be an independently produced, adequately examined structure with no fatal flaw. The rules disqualify that result before examining it.

A3. CONFIRMED — The central optimization has no independently assigned values.

“Every word and every sentence carries a score — what it delivers to the reader — and the document is a knapsack” (STAGES:24–27). “Water” means words “whose score does not pay for their space” (STAGES:29–32).

Neither passage supplies a scoring procedure, units or a reader-benefit measurement independent of the editorial decision. Calling a deleted sentence low-scoring restates the decision to delete it.

Refutation would require scores assigned before editing, followed by worse reader outcomes from the supposedly higher-value selection. No such prospective comparison is specified. The method later admits that a connecting instruction’s score changes with the reader’s next action (LOOP:292–294).

A4. CONFIRMED — The structure map derives achieved benefit from intended benefit.

“What this block buys the reader” comes from “the skeleton’s purpose for it”; its verdict supposedly “follows from the above, not from taste” (LOOP:170–177).

The method supplies its own refutation: “A mistaken skeleton produces a perfectly faithful map” (LOOP:198–200). This admission does not remove the circular column.

Refutation would be a block faithfully implementing its declared purpose while readers fail the associated task. The later task gate can expose that, but the map’s derivation cannot (LOOP:213–215).

A5. CONFIRMED — Continued failure is automatically diagnosed as an upstream failure.

“A document still producing new classes at the cap has a stage-3 problem nobody has named” (LOOP:146–147). A count that stops falling means “the answer is upstream” (LOOP:157–159).

Those are diagnoses without a diagnostic test. They exclude alternatives such as poor code reading, incomplete execution coverage or noisy critics. The recorded lifecycle regressions were attributed to reading lines without running them, not to section structure (ROUNDS:120–121).

Refutation would be persistent findings eliminated by better execution checks without changing the skeleton. The quoted rules provide no branch for that outcome.

A6. CONFIRMED — “Convergence” depends on an undefined classification.

“No new class of defect in the last two waves” is a handover condition (LOOP:136–138). The routing examples distinguish sentence, boundary, term and missing-section problems, but do not define how to determine whether two findings instantiate the same previously checked failure class (LOOP:57–62).

The method admits that two quiet rounds can repeat an unresolved consequential defect and call it convergence (LOOP:207–208).

Refutation would require a fixed classification and a criterion for consequential unresolved defects established before the waves. Without those, the same results can be described as either new discovery or familiar residual findings.

A7. CONFIRMED — Owner willingness is substituted for the outcome the method advertises.

“The loop stops when the owner reads the round and says whether they would send it as it is. That judgement is the measurement every round exists to prepare for” (LOOP:132–134). The advertised outcome is documentation that gives readers the right answer (README:3–5).

Willingness to publish is observable, but defining it as the terminal measurement makes it self-validating as acceptance. It does not establish reader correctness.

Refutation of the advertised outcome would be an owner-approved document that causes wrong answers or failed tasks. That outcome would not refute the stopping rule: the required owner judgment still occurred.

A8. CONFIRMED — Familiarity is promoted into proof of effectiveness.

“People have converged on a shape, and the convergence is evidence” (STAGES:68–71), followed by “take the shape that has been proven” (STAGES:107–108). The weighting rule uses stars to infer exposure and survival of confusion (STAGES:98–100).

The method itself states the missing inference: usage is evidence of familiarity, not evidence that a convention caused reader success (LOOP:202–205).

Refutation would be worse task performance under the popular shape than under another shape, holding content and readers comparable. The survey collects headings and usage signals, not that comparison (STAGES:95–105).

A9. CONFIRMED — Stage ownership is used to prove stage necessity.

“An error at stage 1 cannot be repaired at stage 4” is the “whole argument” for deciding before writing (STAGES:10–11). Yet a missing section is assigned to stage 1 by the routing table (LOOP:57–62).

A writer who notices and inserts a missing section can simply be described as having returned to stage 1. The classification makes the claimed impossibility true by naming.

Refutation would be a missing-content problem repaired during drafting without the prescribed survey or structural redesign, at lower total cost. The method does not specify a comparison that would count this as evidence against its ordering.

A10. CONFIRMED — Vocabulary is judged by whether it supports the thesis it should help readers examine.

“Where a document’s thesis is that A is like B, call A by B’s word. Any other choice is an argument against the document” (RETHINK:49–50).

The thesis supplies the justification for suppressing a distinction. Whether that distinction helps the reader assess the thesis is not tested.

Refutation would be readers making better decisions when related but non-equivalent things retain different names. The rule treats that naming choice as wrong because it contradicts the thesis, before measuring comprehension.

A11. CONFIRMED — Having been measured is used to justify preserving an unisolated treatment.

“Copy the fixed parts; do not paraphrase them. They were measured in the form they are in” (WRITE:54).

That establishes treatment provenance, not the value of retaining each part. The measurement reference expressly says that component attribution was not measured and the isolating experiment was not run (MEASURE:130–132).

Refutation would be a controlled omission or paraphrase producing equal or better outcomes at lower cost. Until that comparison exists, “measured in this form” cannot justify mandatory execution in this form.

A12. CONFIRMED — A citation is used to distinguish judgment from opinion.

“Judges state a line number for every claim … A judgement without a line is an opinion, and this sheet does not collect opinions” (BAKE:120–121).

The sheet asks whether prerequisites are adequately answered and protected passages damaged—judgments that a location alone cannot settle (BAKE:113–117). The recorded critics disagreed about the same located passages, including material used successfully by readers (DEDUP:119).

Refutation would be two incompatible, equally cited judgments. The record already supplies that outcome. A citation makes a judgment inspectable; this rule treats it as something categorically stronger.


B. THE METHOD AGAINST ITS OWN RECORD

B1. CONFIRMED — The advertised stop was never demonstrated.

Rule: critics continue “until a round finds nothing new and nothing got worse” (README:34–35).

Record: the later formulation admits that seven rounds never met its two handover conditions (LOOP:136–144). Round 07 still had 41 sentence findings and five regressions of its own (ROUNDS:16).

The record demonstrates continued defect discovery, not the promised completed loop. Owner acceptance after round 07 is unknown; the wave explicitly lacked that reader (ROUNDS:139–141).

B2. CONFIRMED — The author recorded the execution requirement and then repeated the violation.

Rule: lifecycle claims clear the accuracy floor only by running them (WRITE:63–70).

Record: round 06 introduced four false claims and two overstatements in nine edits (ROUNDS:77–98). Round 07 introduced another five wrong edits, followed by the admission: “The rule recorded after 06 was not enough: I read the lines it named and still did not run them” (ROUNDS:112–121).

This is evidence against the efficacy of adding the instruction alone. It is not evidence that a fully executed version of the current protocol failed.

B3. CONFIRMED — The ratchet protected errors against correction.

Rule: wanted claims must remain present; retired phrases must remain absent (LOOP:107–115).

Record: three “verified” lifecycle claims were disproved, two others narrowed, and “a ratchet on that ledger would have rejected the fixes” (ROUNDS:125–128; DEDUP:113).

The mechanism enforced preservation of previously accepted wording. That was not equivalent to preservation of truth.

B4. CONFIRMED — A green ledger coexisted with the supposedly retired false claim.

Rule: retired phrases must be searched everywhere, including table cells (LOOP:113–115).

Record: “cleanup lists what the plugin left” survived with a capital L in a table cell while the ledger was green (ROUNDS:129–130).

The present wording incorporates the lesson. The green result in the cited run did not establish the claimed absence.

B5. CONFIRMED — The mechanical gate passed violations through multiple reviews.

Rule: mechanical rules must pass “as a grep would read them,” making passage “a fact and not an opinion” (LOOP:154–155).

Record: the path expression excluded tilde-prefixed paths, which were all the paths in the document. It reported clean for three rounds through two independent reviews while four violations remained (LOOP:332–335).

The deciding evidence is the method’s own account; I did not rerun those historical versions.

B6. CONFIRMED — Task success left false claims and untested workflows untouched.

Rule: acceptance depends on task completion (LOOP:213–215); two task readers form a gate (WRITE:161–163).

Record: round 07’s two task readers achieved their goals while five introduced claims were wrong (ROUNDS:108–118). The install/update task had neither a data directory nor a second version, so nobody tested preservation across an update (ROUNDS:136–137; DEDUP:57).

“Task passed” did not mean the named lifecycle claim was exercised.

B7. CONFIRMED — The claimed reader protocol was not the recorded protocol.

Rule: one fresh reader per question (AUDIT:85–88). A reader answering a second question is explicitly declared no longer fresh (MEASURE:30–31).

Record: five readers answered fifteen questions (ROUNDS:106–109). The current rewrite cost table still assigns three questions to each reader (WRITE:115), while calling this audit’s own protocol at round size (WRITE:164–166).

These are incompatible instructions and incompatible measurements.

B8. CONFIRMED — “Non-overlapping” lenses repeatedly overlap.

Rule: lenses “do not overlap” (WRITE:4–5; README:34).

Record: the same lock claim was raised by the code critic, adversarial critic and water critic (DEDUP:11). The parity claim was raised by three critics (DEDUP:15). The wave produced eleven conflicts (DEDUP:3,119).

Different briefs did not create disjoint work. The record cannot support the advertised absence of overlap.

B9. CONFIRMED — Frozen rounds were not consistently preserved.

Rule: one immutable file per round, frozen when criticism starts (WRITE:84–96; ROUNDS:3–5).

Record: several intermediate versions of 01 were overwritten and no longer exist (ROUNDS:177–179). Round 04 was edited while critics read it, then restored and the edits moved to 05 (ROUNDS:181–183).

The round-04 violation was repaired. The missing earlier states remain missing.

B10. CONFIRMED — Structural rules outlived the decisions that invalidated them.

Rule: maintain the skeleton as the contract for budgets and checks (STAGES:254–261; WRITE:146).

Record: seven findings were superseded because the critic applied stale structural instructions (DEDUP:115). The accepted ten-section shape had no recorded replacement budget; round 07 was 1,611 words against the old approximately 1,005-word total (RULE-REVIEW:45–55).

The method incurred criticism and reconciliation costs by failing its own bookkeeping requirement.

B11. CONFIRMED — The method retains the prerequisite prohibition after recording its reversal.

Rule: runtime versions, PATH and credential prerequisites are noise (STAGES:275–276).

Record: the same reader restored the deleted prerequisites after the survey and suggested the original objection concerned presentation (STAGES:152–158). The subsequent critic still found the Node requirement forbidden by the skeleton; dedup marked that finding superseded (DEDUP:115).

This is a current contradiction, not merely an obsolete historical mistake.

B12. CONFIRMED — “A table beats prose” survived the removal of its own comparison table.

Rule: “Where a section states a comparison, a table beats prose” (STAGES:287–289).

Record: the comparison table was cut because eight of nine rows said “yes” in both columns. The rules critic had to exempt that accepted decision from the still-written table requirement (RULE-REVIEW:7).

The example used to build the method supplies a counterexample to its universal rule.

B13. CONFIRMED — Reproducible evidence was not preserved in the required form.

Rule: every finding carries a reproducible check, and the coordinator reruns it (LOOP:38–40; WRITE:97–99).

Record: Astra’s checks lived in a temporary directory, and one depended on an instrumented driver copy; they were not reproducible from the repository (ROUNDS:134–135).

This confirms a preservation gap. Whether those temporary files remain recoverable is unknown.

B14. CONFIRMED — Component causality is asserted despite an explicit prohibition on asserting it.

Claim: “What moved a README from 3/6 to 6/6 was the fourth” pass (WRITE:35–39).

Counter-record: README says which pass produced the gain was not measured (README:91). The measurement reference says the isolating experiment was deliberately not run and instructs: “Do not report a single part as the cause” (MEASURE:130–132).

The qualification that the overall gain was statistically inconclusive does not repair the separate unsupported attribution.

B15. CONFIRMED — Findings are counted where improvement was never measured.

Claim: the method makes documentation “truer and easier to answer from” (README:63).

Record: there was no built independent comparison of whether round N read better than round N−1; the question to ask that judge remained unsettled (ROUNDS:187–194). Round 07 still had substantial untested coverage, including no live turn and no in-session operation (DEDUP:123).

The record supports particular detected defects. It does not establish a monotonic improvement in reading quality.


C. NOT WORTH ITS COST

C1. PLAUSIBLE — Ten structure proposals are an expensive way to discover that the brief is wrong.

Cost: fourteen agents—ten proposals, three critics, one synthesis (STAGES:308–309).

Yield: none of the ten proposals found the shared defect identified by the critics (RETHINK:63–65). The synthesis also omitted the commands table despite a comparable-tools proposal placing second (STAGES:73–77).

Cheaper substitute: one skeleton, a brief-first adversarial review and a small fetched comparison set. This targets the two recorded failure mechanisms directly. Equal performance at lower cost was not tested; actual savings are unknown.

C2. PLAUSIBLE — Mandatory writer competition has no demonstrated marginal return.

Cost: the recorded first candidate used ten writers over five engines and three critics; the following revision used two writers and three auditors (ROUNDS:10–11). The current default still requires three writers and two judges (BAKE:19–22).

Yield: 41 findings against the first candidate, then 27 findings and one regression against the revision (ROUNDS:10–11). Whether competition beat one careful writer is explicitly unmeasured (BAKE:7–11).

Cheaper substitute: one repair writer and one independent executable review; request an alternative only when a consequential design disagreement remains.

C3. PLAUSIBLE — The dedup seat is disproportionately expensive for its demonstrated unique discovery.

Cost: approximately 160,000 tokens and fifteen minutes (WRITE:116).

Yield: consolidation of 87 findings and eleven conflicts; two method findings are explicitly marked as dedup’s own—the pinned false claims and missed negative pattern (DEDUP:3,113). The remaining three method findings are attributed to material already in the inputs (DEDUP:113).

Cheaper substitute: normalize and group reports mechanically, then have the coordinator verify unresolved conflicts and ledger interactions. The value of consolidation may justify some expense, but no comparison establishes this model, context size or cost as necessary.

C4. PLAUSIBLE — The water pass has an unmeasured benefit and a substantial bill.

Cost: approximately 70,000 tokens and seven minutes for the combined rules/water critic (WRITE:112). The portion attributable to cutting prose is unknown.

Yield: approximately 144 proposed words saved in its raw report (RULE-REVIEW:64–88). The deduplicated water-only entries F62–F73 total 101 proposed words saved (DEDUP:109). Neither figure is measured reader benefit or confirmed applied savings.

Cheaper substitute: combine obvious repetition review with the substantive repair diff. Escalate to a separate prose pass only for a demonstrated reading problem.

C5. PLAUSIBLE — The compulsory map and stale skeleton generate their own review workload.

Cost: maintaining a separate skeleton, structure map, budgets, exclusions and verdicts; the map must have a different author (WRITE:145–147; LOOP:168–192). Its isolated token and time cost is unknown.

Yield: seven superseded findings, a budget for the wrong accepted shape, and conflicts over exceptions (DEDUP:99,115,119). The map’s benefit column is acknowledged to be circular (LOOP:198–200).

Cheaper substitute: one current outline with exclusions, plus an unresolved-decisions list. Do not maintain a second evaluative representation unless a reviewer uses it to answer a specific structural question.

C6. PLAUSIBLE — Repeating the complete critic wave lacks a demonstrated stopping benefit.

Cost: round 07 used eleven agents (ROUNDS:16). Three reported seats alone total approximately 410,000 tokens: 180,000 for code, 70,000 for rules/water and 160,000 for dedup, excluding the other eight seats (WRITE:111–116).

Yield: 41 sentence findings, including five regressions, but no achieved handover condition and substantial untested workflows (ROUNDS:16,112–118; LOOP:142–144; DEDUP:123).

Cheaper substitute: run the whole-document executable review early, then target changed claims and unresolved risks. The method itself says the early adversarial pass found thirteen defects missed by three previous reviews (LOOP:64–67). A comparative cost-per-corrected-defect experiment remains absent.

C7. PLAUSIBLE — Compulsory four-pass intermediate drafting preserves attribution data that the method does not use to establish attribution.

Cost: every candidate retains separate reader, writing and prerequisite drafts before its final result (BAKE:44–49). Isolated token and storage costs are unknown.

Yield: visibility that one pass removed 105 words and another restored 105 as framing (BAKE:101–104). Which pass caused the comprehension gain remains unknown (MEASURE:130–132).

Cheaper substitute: preserve the input, final candidate and meaningful repair diffs. Keep stage-by-stage drafts when running an actual component experiment, rather than imposing research instrumentation on every repair.


D. WHAT A COMPETENT TECHNICAL WRITER WOULD DISCARD

D1. CONFIRMED — The owner-specific opening rules presented as genre-independent laws.

Discard “The opening sells; it does not warn” and “Technical detail lives in one section of its own, below the middle” as unconditional instructions (STAGES:271–274).

Anecdote: one owner stopped at section three of one 2,233-word draft and objected to its technical opening (STAGES:39–56). That supports changing that opening. It does not establish where warnings or technical detail belong in every document.

D2. CONFIRMED — The prerequisite blacklist.

Discard the universal noise classification for runtime versions and PATH (STAGES:275–276).

Anecdote: the owner initially called them rubbish, then restored them after seeing differently presented evidence (STAGES:152–158). The generalization survives its own reversal.

D3. CONFIRMED — The three-format deletion ritual.

Discard the requirement to try a rejected fact as a titled list, table row and clause before treating it as noise (STAGES:160–161).

Anecdote: the same prerequisite reversal (STAGES:152–158). The record does not show that all three forms were tested, much less that exactly these three are necessary for other rejected facts.

D4. CONFIRMED — The claim-driven naming law.

Discard “where … A is like B, call A by B’s word” (STAGES:196–197).

Anecdote: “seat” was replaced by “Codex agent” because the project argued for parity with native agents (STAGES:181–194). No reader comparison is reported there to establish the general naming rule.

D5. CONFIRMED — The specific fan-out sizes as methodological necessities.

Discard six survey slices and approximately ten structures as defaults justified by measurement (RETHINK:27–32,56–61).

Anecdote: a fourteen-agent exercise omitted a commands table; one glance at a popular README exposed the omission (STAGES:73–81). That establishes a missed check, not an optimum of six surveyors or ten proposal writers.

D6. CONFIRMED — Forced fatal flaws and compulsory weakest blocks.

Discard both (STAGES:239–242; LOOP:191–192).

Anecdote: the author’s first map marked two blocks sound that the reader rejected within a minute (LOOP:179–181). That indicts that map. It does not show that every independent review must discover a fatal flaw or that a clean map proves dependence.

D7. CONFIRMED — The hard repetition allowance.

Discard “one home … plus at most one symptom-keyed repeat” (LOOP:257–258).

Anecdote: a whole-document critic found one claim repeated four times, roughly 120 words, and a later count found concepts across several sections (LOOP:49–52,241–249). Neither observation establishes a universal maximum of two occurrences. The method’s own safeguard allows repetition at independently read decisions without imposing that maximum (WRITE:129–132).

D8. CONFIRMED — Universal format superiority.

Discard “a table beats prose” for every comparison and the claim that language highlighting makes a command legible as a command (STAGES:287–294).

Anecdote: the owner liked a copyable install block (STAGES:277–278); the method’s comparison table was subsequently removed because eight of nine rows merely agreed (RULE-REVIEW:7). No comparative legibility measurement is supplied for the language-tag claim in STAGES:290–294.

D9. CONFIRMED — The prohibition on asking about clarity.

Discard “Never ask a reader whether the text was clear” as a ban on collecting diagnostic evidence (AUDIT:98–101).

Anecdote: two confident readers answered incorrectly and one confused reader answered correctly in one run (AUDIT:98–100). That defeats substituting clarity ratings for correctness. It does not establish that asking both questions has no value.

D10. CONFIRMED — The blanket rejection of writing tools and standards.

Discard the categorical exclusion of house-style passes, prose linters and punctuation gates (RULES:49–51).

Anecdote: ten seats, one passage, one run, with unguided controls outperforming standard-guided entries (RULES:37–42). That comparison does not establish the costs or benefits of every listed tool or narrower use.

D11. CONFIRMED — The universal curse-of-knowledge diagnoses.

Discard “Every ‘obviously’, ‘simply’ or ‘just’ hides a prerequisite” and the rule against repairing the problem by adding detail (CURSE:18–20).

Anecdotes: the song-tapping experiment and three selected items from a 24-item inventory on one README (CURSE:6–9,31–42). Neither establishes that every occurrence of those words signals an omitted prerequisite, or that missing detail cannot be the problem.

D12. CONFIRMED — A single execution treated as sufficient support for a universal guarantee.

Discard the implication that reaching level 3 resolves an “every/always/never” claim (TRUTH:23–25). Level 3 is defined merely as “a check that runs and shows it” (TRUTH:16).

Anecdote: false guarantees survived cleaner rewrites in the September 10 run (TRUTH:27–36). One counterexample can refute a universal claim; one successful run cannot establish it. The rule must bound the claim to what was exercised.

D13. CONFIRMED — The extreme-score stopping rule is arithmetically wrong.

Discard “a baseline of every question right, or every question wrong, cannot register a repair” (MEASURE:95–96; AUDIT:145–147).

A zero score can increase; a perfect score can decrease. The anecdotal pilot began at 3/6 (MEASURE:125–127), so it supplies no observation of either extreme. This is an unsupported assertion about the instrument, not a measured limitation.


E. THE 500-WORD VERSION

These are recommendations, not an experimentally validated reduced protocol. Each is PLAUSIBLE. In execution order:

E1. Set the document scope, intended reader, entry point and decisions the reader needs to make.
Sources: AUDIT:23–28,44–48,67–68.
Cut loses: compulsory survey fan-out and its coverage of comparable genres (RETHINK:27–38).

E2. For new or structurally broken material, agree one brief outline: purpose, sections, exclusions and essential terminology.
Sources: RETHINK:45–47,76–82.
Cut loses: ten-way structure comparison, full ranking and alternative candidates (RETHINK:56–68).

E3. Record actionable behavioral claims, their evidence and uncertainty. Seek counterexamples; exercise lifecycle claims.
Sources: AUDIT:52–63; WRITE:63–70.
Cut loses: none of the evidence obligation; omit rhetorical claims that a line or a successful run proves more than it does (TRUTH:14–16,23–25).

E4. Write representative questions and their answers before testing readers; include existing successes and an explicitly unanswerable item.
Sources: AUDIT:67–78.
Cut loses: arbitrary five-to-eight sizing as a universal prescription (AUDIT:67–68).

E5. Use independent readers for questions and realistic tasks. Check resulting state, forced guesses and uncovered workflows. If claiming a measured comprehension gain, retain the no-document baseline.
Sources: AUDIT:85–96,105–112.
Cut loses: fixed model assignments and the full recurring eleven-seat pool (WRITE:109–116).

E6. Repair the identified cause: false claim, missing answer, misleading placement, failed navigation or harmful sequence.
Sources: AUDIT:119–143.
Cut loses: default three-writer competition and stance selection (BAKE:19–22,33–40).

E7. Preserve decision-critical conditions, warnings, independently needed repetition and dated measurement context.
Sources: WRITE:129–137.
Cut loses: universal compression, repetition and formatting quotas (LOOP:257–258; STAGES:271–294).

E8. Preserve reviewable versions and inspect every changed claim, including incidental changes.
Sources: WRITE:84–96; LOOP:323–325.
Cut loses: mandatory JSON edits, expanding phrase ledger and every intermediate stylistic pass (WRITE:88–93; BAKE:47–49).

E9. Review the complete document for contradictions and cross-section duplication; use tested mechanical checks only where they answer a real question.
Sources: LOOP:49–55,227–229,337–345.
Cut loses: a separate compulsory structure map and its derived verdicts (LOOP:164–192).

E10. Recheck repaired failures and previously working cases; report remaining defects, untested coverage, cost and uncertainty. Hand over a diff for the owner’s decision.
Sources: MEASURE:108–115; WRITE:149–172; LOOP:146–147,306–313.
Cut loses: the two-wave novelty ritual and the claim that each newly discovered defect class automatically justifies another round (LOOP:75–76,136–147).


F. EVIDENCE LIMITS

CONFIRMED means the cited text or recorded result supplies the deciding evidence for the finding. It does not mean I reproduced the historical runtime experiment. Historical execution coverage is limited even in the source record: no live Codex turn, no in-session lens, no version-pair update test, and all runs on Darwin (DEDUP:123).

The measured superiority of any cheaper substitute is unknown. The method expressly lacks both a bake-off-versus-single-writer comparison and component attribution for the earlier comprehension gain (BAKE:7–11; MEASURE:130–132). Those economic recommendations are therefore PLAUSIBLE, not reported experimental results.
