# Prior art

## Evidence and access

Surveyed 2026-09-11. **Measured** means an observed count or outcome; it does not mean a causal effect.
**Argued** means a mechanism with a reason. **Asserted** means a prescription without a reported test.
For formatting, **craft consensus** means convergent practitioner advice, not an experiment.
A source opened by a research seat is second-hand evidence here. This writer opened the supplied
returns, the plugin, and the additional sources named in the access record below. Source-only reading,
reported execution, search-only discovery and direct verification are kept separate.
Citations to `A*.md` and `round2/*.json` name the supplied research returns. Their source paths and
line numbers belong to the snapshots those returns identify. `R1:line` means the supplied 262-line
`prior-art.md`, committed as `1a3a014`; it is evidence of the earlier judgement, not a second reader.
Plugin paths below are relative to `plugins/terse/`. Costs are implementation estimates unless a
measurement is identified. No research seat's test result is claimed as a test run by this writer.

## The nearest methods already test readers

Anthropic's `doc-coauthoring` asks for five to ten questions, gives each question and the document to a
fresh sub-agent, records right and wrong answers, then checks ambiguity. The fresh-reader test is not
new. Opened directly: [SKILL.md][anthropic-skill], Stage 3, lines 242–340; question generation at 259,
fresh readers at 265–267, ambiguity at 273. A0 found this after a Claude scout said it did not measure.
R1:28–35 also understated its exit rule: lines 329–331 require correct answers **and** no new gaps,
not merely a reader who stops complaining. Retain the originality correction; correct the caricature.

Its key is not explicitly derived from code; it pastes the document rather than testing a route through
files; it specifies no preservation controls. Those are real differences. Its final review suggests
checking facts and links, so R1's “no claim is checked against code” should mean **no required code-grounded
truth pass**, not an absence of factual review. An independent oracle and controls strengthen terse's
protocol; the present experiment does not establish that its implementation is uniquely necessary.
No reuse licence was established. R1 reports none; the root licence API returned 404 in this pass.
That is not an exhaustive legal search. Treat the skill as ideas-only until a grant is found.

**SWD-Bench** evaluates documentation by downstream answers against a no-document arm. R1:3 said almost
nobody measures; this benchmark and the opened human studies make that field-wide judgement too broad. The opened paper reports 4,170
entries across 12 repositories, 480 evaluated instances, and 57 SWE-bench cases. No-document balanced
accuracy was 48.68%, with MCC −3.43%; documentation added 5.39–16.22 percentage points. SWE-bench success
rose from 43.86% to 47.37–52.63%. These are reported model results, not human readability results.
It scores Boolean functionality, implementing-file sets and masked details with deterministic metrics,
using PR-derived keys. A 100-entry audit by two annotators reports κ>.90; merge-time proxies and later
reverts still limit the key. Its task construction is close to terse's independent-grounding requirement. The one Pylint example where rubric scores both equal 5/5 but QA is 4/4 versus 0/4 is illustrative,
not a full rubric-validity study. Opened primary LaTeX: [SWD-Bench][swd], methods and evaluation/results;
`round2/protocol-benchmarks.json:214–267`.

CodeQA-Bench independently separates code-answerable from documentation-dependent questions and checks
answer leakage. It reports 528 and 100 questions respectively over ten repositories: closed-book .629,
code .860, code-plus-docs .931; the latter gain is .071, corrected p<.003. Yet its key audit marks 38.4%
pass and 61.6% warn, retains the warnings, and uses one judge without human validation. Take the split
and key audit; do not treat its oracle as established truth. Opened paper/repository sources:
[CodeQA-Bench][codeqa], question construction and evaluation; `round2/protocol-benchmarks.json:160–213`.

## Findings against terse's own claims

A5 weakened all six conclusions. The observed repair survives; its interpretation narrows.
Direct sources: `skills/audit/references/measure.md:91–98`; `README.md:54–69`;
`skills/revise/references/bake-off.md:1–12`. Detailed attacks: `A5.md:3–32`.

| Claim | What was observed | What survives |
|---|---|---|
| Fresh-reader QA is the only ruler that worked | One README, six paired questions, one response per question/version: 3/6 → 6/6; departures 1 → 0; two controls preserved | Responsiveness to a repair targeting those questions. No comparison establishes exclusivity, transfer or human validity. |
| The key must come from code before any reader starts | Two false claims; zero comparisons of key source or timing | Independent grounding and protection against hindsight. A blinded independent verifier can work after readers start; code can also be misread. |
| Clarity self-report is worthless | Two wrong answers called unconfusing; one correct answer called confusing | Clarity cannot replace correctness. Three discordant judgements do not estimate its diagnostic value. |
| Published standards produce audits instead of rewrites | Ten seats; seven left the first 116 words unchanged; only a control shortened that passage | Those prompts often did not elicit revisions. Standard, prompt, model and output request are confounded. |
| Three writers and two judges improve the outcome | Zero comparative repair experiments | A proposed selection procedure. More computation and shared judging error remain alternative explanations. |
| Lie / placement / findability is the right taxonomy | Two false claims among six reported failure instances, but only three wrong initial answers | A useful provisional vocabulary. No mapping or reliability study establishes completeness; omission, bad keys and reader errors need room. |

The exact two-sided McNemar result is **p = .25**: three improved pairs, zero reversed pairs,
`2 × (1/2)^3`. Even that calculation treats the six question pairs as independent, although they share
one document. R1:157–160 said +50 percentage points cleared SkillsBench's “below 30 pp is likely noise”
heuristic. A5.md:38–39 refutes that inference. An effect-size cutoff is not a significance test; p=.25
also does not prove no effect. Two controls observed once establish those outcomes, not preservation
of the whole document. Raw responses, version hashes and failure-to-question mapping remain missing.

The publication gate in `avoid-ai-writing corpus/README.md:229–234` requires n≥100, intervals and more
than one register; its own AUC .501 is kept out of the README. Wilson intervals live at
`scripts/fp-measure.js:48–55`. This is a repository policy worth learning from, not a universal sample-size
threshold. Terse names five standards but says “both standards”; allocations and per-standard n remain
unresolved (`README.md:65–67`; `A5.md:20`). A percentage cannot repair that missing denominator.

A10 reached the held-out-test objection independently from Anthropic's evaluation guidance. Writers see
terse's five to eight questions, then the same questions grade the repair. Keep them as regression
checks; use hidden questions to test generalization. Opened official [evaluation guide][eval-guide],
held-out examples at lines 53 and 102, task distribution at 111, grader reliability at 2839–2848;
`A10.md:59,64–69`. Its “10k tweets” example is not a required sample size for documentation.

The plugin is internally cautious in one place and causal in another. `bake-off.md:7` says superiority
over one careful pass is unmeasured. `skills/revise/SKILL.md:13–18` credits repair with the win, while
`measure.md:96–98` says the four passes were not isolated. Keep the latter limit. README's 2725 → 2571
words is −154, about −5.65%; pass two cut 105 words and pass three added 105. `README.md:45–46`.
A5.md:46–57 also identifies bundled treatment, uncertain control-selection timing, ceiling effects,
selection/stopping and model readers as human proxies. None was resolved by rereading the result.

The cheapest discriminating bake-off test designates the repair-first writer as baseline **before**
drafting. Produce three candidates; let two blinded judges select on known failures. Independently
prepare ten hidden decision questions, including preservation cases. Compare baseline and winner with
three fresh readers per question/version, interleave versions, and grade blind against a checked key.
Analyze ten question-level differences, not sixty independent documents. Cost: three writers, two
selection judges, 60 readers and independent key/grade work; 30 extra readers over winner-only testing.
At an assumed 5,000 input and 300 output tokens per reader, that is 300,000 input and 18,000 output tokens, or
`0.30 × input price + 0.018 × output price` at per-million-token prices. Other costs are unspecified.
This settles a sufficiently clear local comparison; general superiority needs replication. `A5.md:59–67`.

## Practices worth taking, ranked

Take safeguards before another mandatory prose pass. Each entry names the source, evidence, cost and
part of terse it changes. “Mechanical” describes a check's execution, not a zero-false-positive guarantee.
A1's 141-body scan converges on reader/task fit, reasons, provenance and repairing observed failures
while preserving working material. It counts copied agent/skill twins once; recurrence prioritizes
trials, not validation. `A1.md:81–85`.

1. **Check the oracle before scoring.** A full-access run must reach its expected result or the item
   returns to key review. Argued safeguard. `skillsbench .agents/skills/task-review/scripts/run_experiments.sh:96–101`.
   Cost: one extra run and adjudication. Touches `audit/measure`; an agreeing model is not independent proof.
2. **Reserve hidden questions for selection claims.** Keep visible failures and controls for repair;
   use independent hidden decisions for the claimed gain. Argued. `A5.md:61–65`; `develop-tests.md:53,102`.
   Cost: the 60-reader comparison above. Touches `revise/bake-off` and published results.
3. **Gate candidates on preservation before judging quality.** Compare code, frontmatter, quotations,
   tables, inline code, URLs, paths and headings; review legitimate repairs instead of freezing false text.
   `avoid-ai-writing detector/validate.js:165–319`. Mechanical. Cost: a local diff and exceptions; `revise`.
4. **Make a fact-preservation map.** Map numbers, qualifiers and conditions from old text to new; verify
   deliberate factual corrections against their sources. Argued. `agent-stylebooks skills/sec-plain-english/SKILL.md:51–55`; `EXAMPLES.md:103`.
   Cost: one inventory/comparison per candidate. Touches `revise` prerequisites and both judge vetoes.
5. **Enforce reader isolation in the runner.** Pin model, effort, settings and tools, then record them.
   `SimpleEnglish evals/run_bench.py:47–57` implements settings/tool isolation. Mechanical, not a reader-validity result.
   Cost: runner work. Touches `audit/measure`; retain sandboxed Markdown reads, since banning `Read` would erase findability.
6. **Save the document version and raw decisions.** Preserve keys, answers, scores, tool traces and
   SHA-256s. `avoid-ai-writing corpus/README.md:11–33` supplies a hash/provenance model; `A5.md:57` names the missing record.
   Cost: storage and record format. Touches audit ledgers, bake-off and README numbers; respect source licences.
7. **Count regressions separately and quote the misleading line.** `hurt` at −10 pp is SkillsBench's
   house threshold, not an established noise floor. `skillsbench references/audit-skillsbench.md:79–87`.
   Cost: retain control cases and a `misled_quote`. Touches audit ledgers and bake-off vetoes.
8. **Validate command-shaped claims against the actual build.** Record exit, output and skipped cases.
   `doc-detective src/skills/doc-detective-doc-testing/SKILL.md:139–166`; engine `.github/workflows/test-docs.yml:1–52`.
   Reported dogfooding; AGPL, ideas-only. Cost: setup/runtime and safe fixtures. Touches truth-pass level 3.
9. **Separate not run, model-only and executed.** Host evidence is required for the last state.
   `avoid-ai-writing skills/avoid-ai-writing-router/references/handoff-contract.md:26–29`. Argued contract.
   Cost: one field and receipt per check. Touches truth ledger, writer handoff and final claims.
10. **Bind verdicts to the text judged.** Reject a digest mismatch; include the computed digest when absent.
    `riekelt plugins/technical-writer/agents/prose-reviewer.md:15`. Mechanical identity check, not validity.
    Cost: one hash per candidate. Touches bake-off sheets and adoption.
11. **Calibrate judges before relying on them.** Assess evidence against the rubric before emitting scores.
    Official `develop-tests.md:2839–2848`; ARES human-label correction in `A7.md:61–63`. Argued procedure.
    Cost: expert labels; ARES asks for at least 50, ideally hundreds. Touches answer grading and both judges.
12. **Make deterministic grades first-class.** Start model judges as tracked, then soft thresholds, then
    gates only with support. `eve docs/evals/judge.mdx:6,31–39,66–80` also separates judge and tested model.
    Cost: receipts and calibration. Touches scoring; changing model family reduces one shared bias, not all bias.
13. **Derive navigation failures from tool logs.** Distinguish no page opened from router-only access.
    `skillsbench references/audit-skillsbench.md:7–62`, including `top_level_only`. Mechanical observations.
    Cost: verified path traces, already requested by `measure`. Do not infer why the reader stopped from the trace alone.
14. **Test routing with distractors and negative cases.** Accept a valid sibling destination, not only
    one exact path. `riekelt plugins/technical-writer/evals/trigger-evals.json:1` and its case records.
    Cost: cheap model queries, about ten distractors per case in the source. Touches findability; not comprehension.
15. **Attach a verbatim excerpt to a finding and verify it exists.** Driftcheck asks for the excerpt
    but does not enforce the match. `driftcheck src/config.rs:27–32`; `src/llm.rs:252–261`. Argued extension.
    Cost: one exact-source check. Touches truth ledger; a matching quotation still needs interpretation.
16. **Re-resolve line numbers just before reporting.** Delayed citations fail even when the earlier read
    was correct. `review-skills skills/docs-sync-audit/SKILL.md:90–94`; real trial `evals/results/2026-09-05-real-code-trial.json:42`.
    Reported defect, unmeasured remedy. Cost: final line lookup; touches every audit and judge finding.
17. **Route an invalid item back to the method.** Repair a bad key or criterion before blaming the page.
    `agent-rules-books _rule-workbench/PROCESS.md:137–172`. Argued; protocol drift needs a recorded version.
    Cost: rerun affected items. Touches audit classification and comparability between runs.
18. **Allow unclassified failures.** Attach competing explanations instead of forcing one of three labels.
    `trogera .skills/docs-reorg/SKILL.md:54–57`; `A5.md:29–32`. Asserted safeguard; trogera's own confidence rules conflict.
    Cost: adjudication and fewer classified items. Touches `lie / placement / findability` and ledgers.
19. **Give diagnostic signals explicit counterexamples.** A step's expected result is not an intrusive
    explanation; “you will see” is not necessarily a learning objective. `trogera references/page-types.md:40–59`.
    Argued. Cost: longer rule definitions. Touches audit classification; test counterexamples before adopting signals.
20. **Describe placement through the reader's task.** A forced switch from doing to studying can be a
    defect; multiple topics alone are not. `trogera references/reasoning.md:110–121`. Argued, no outcome test.
    Cost: a task-specific hypothesis. Touches reader profile, placement and repair; no mandatory Diataxis label.
21. **Track code dependencies in an audit sidecar.** A fingerprint plus monitored paths makes a diff
    a cheap re-audit trigger. `grounded-vault SKILL.md:41–53,67–75`; `references/details.md:136–138`.
    Four script scenarios were reported by its reader. Cost: metadata/git; touches key freshness, not proof of truth.
22. **Treat literal mismatches as suspects.** Preserve provenance for derived figures, but adjudicate
    formatting and token boundaries. `PALAN-K/llm-wiki-loop skills/wiki-manager/references/wiki-protocol.md:70–74,126–136`.
    Argued; the downstream strict gate produced a false positive. Cost: local scan plus review; truth pass.
23. **Check definite code/doc invariants before calling a model.** Imports against exports, npm/make
    targets and specified env names can have exact answers. `eve scripts/check-doc-snippets.mjs:8–12,29–33`;
    `review-skills skills/docs-sync-audit/scripts/docs_drift.py:11–29`. Cost: parsers/fixtures; truth pass, with bounded scope.
24. **Check relative links and printed inventory counts.** `riekelt test/repository.test.cjs:89–112`.
    Mechanical claims, not prose taste. Cost: local checks. Touches truth pass and revisions that move content.
    Resolve against the real renderer/build; literal source paths do not cover generated destinations.
25. **Check orphan pages and hub coverage.** `eve scripts/check-docs.mjs:183–190` computes rendered URLs
    and checks required body links. Mechanical. Cost: a graph/build pass. Touches findability across files.
    A reachable page may still be undiscoverable for a reader's query.
26. **Regenerate facts that already have a structured source.** `doc-detective docs/content-strategy/README.md:65–75`
    maps schema to reference generation; `mdt docs/src/concepts/how-it-works.md:1–20` maps providers to consumers.
    Cost: generator/check mode. Touches truth and maintenance. AGPL source ideas-only; stale providers still mislead.
27. **Recompute published figures from retained raw data.** `SimpleEnglish evals/check_numbers.py:34,88,102,116`.
    Mechanical arithmetic and version checks. Cost: a small reproducibility script. Touches README and evidence ledger.
    It catches transcription drift, not invalid experimental design.
28. **Measure rule false positives and remove weak rules.** `avoid-ai-writing scripts/fp-measure.js:181–185`
    defines lift; `corpus/README.md` reports it. Cost: labelled positives and negatives; touches fixed writing rules.
    Lift below 1 fires more on the unintended class. Detector discrimination is not reader comprehension.
29. **Close a metric's demonstrated loophole.** `SimpleEnglish evals/ste_lint.py:185–214,240` counts list
    items and table rows after a sentence cap rewarded bullet conversion. Reported gaming and fixture.
    Cost: adversarial examples. Touches metric design; do not import its sentence cap as a quality criterion.
30. **Require operational writing rules.** `agent-stylebooks CONTRIBUTING.md:52–56` rejects advice that
    cannot specify an observable decision. Argued. Cost: rewrite or delete vague rules. Touches `writing-rules.md`.
    Observable compliance remains a surrogate until a reader outcome supports the rule.
31. **Reject boilerplate findings.** Require a specific passage, its consequence and why that evidence
    supports the finding. `agent-rules-books _rule-workbench/CHECK_COMPATIBILITY.md:286–321`.
    Argued. Cost: review time; touches audit and judges. Brevity is not a substitute for the missing reason.
32. **Check exact terminology against the interface.** `developer-docs-framework rules/style-consistent-terminology.md:30–36`.
    Argued, no reader experiment. Cost: a scoped UI/API vocabulary. Touches truth and findability.
    Vale's configured-pair consistency can report both variants; it cannot decide which one is correct.
33. **Put prerequisites before use and recovery beside failure.** `thegooddocsproject/templates dev/how-to/about-how-to.md:55–61`,
    required links versus “See also” (`A2.md:35–38`); Carroll's trial (`round2/protocol-standards.json:100–153`).
    Cost: verified missing context and task testing. Touches reader profile/repair; keep installation outside lessons where appropriate.
34. **Link deprecated instructions to their replacement.** `developer-docs-framework rules/gov-version-strategy.md:30–38`.
    Argued. Cost: a destination check per deprecated page. Touches findability and version-sensitive truth.
    Date or git age alone does not establish that a claim is wrong.
35. **Try a rival interpretation before asserting clarity.** `tamos agents/ambiguity-attacker.md:19–24`
    requires competing readings; `commands/tamos-validate.md:16–65` requires a wrong-output consequence. Argued; no calibrated high/medium labels.
    Cost: a targeted reader probe. Touches ambiguity diagnosis; do not import its contradictory inheritance rule.
36. **Test real repositories as well as small fixtures.** `review-skills CONTRIBUTING.md:101–110` and
    `evals/results/2026-09-05-real-code-trial.json:48` report citation errors missed in a 15-file fixture.
    Cost: one recorded release trial plus grading. Touches any future helper; private targets limit reproducibility.
37. **Snapshot deterministic helpers; leave paid model trials explicit.** `review-skills CONTRIBUTING.md:76–97`.
    Reported snapshot caught a changed test-counting result. Cost: fixtures and intentional updates.
    Touches tooling CI; permission errors, skipped work and unavailable keys must not become clean passes.
38. **Report audit coverage and disclosed historical snapshots.** `review-skills skills/docs-sync-audit/SKILL.md:15,125–126`;
    `examples/docs-sync-audit.md:9,53–69`. Argued. Cost: opened/unopened inventory and a commit identifier.
    Touches audit scope. An explicitly dated historical report is not a false current claim merely because lines moved.
39. **Treat repository instructions as audited material.** `review-skills skills/docs-sync-audit/SKILL.md:23`.
    Asserted prompt-injection boundary, with no planted test. Cost: explicit harness separation and adversarial cases.
    Touches reader isolation; repeating the sentence alone does not establish enforcement.
40. **Use immutable primary evidence for derived reports.** `grounded-vault references/details.md:190–194`
    specifies dated web snapshots and sibling text extraction for binaries. Argued. Cost: storage/extraction/licence review.
    Touches keys and citations. A source snapshot prevents silent replacement, not errors in the source.
41. **Keep changed code as a retrieval hint, not a verdict.** `driftcheck src/config.rs:34–36`;
    `src/search.rs:114–143`; `src/analyzer.rs:124–151`. Argued; size-based chunk ranking is admitted provisional.
    Cost: one search plus bounded context. Touches targeted truth checks; zero keyword hits do not establish absence.
42. **Use user signals to choose an audit target.** GitHub [survey-score.ts][survey-score], score expression;
    Algolia [getNoResultsRate.yml][zero-results], response fields (`A3.md:5–30`). Observed implementations.
    Cost: traffic/instrumentation. Touches audit selection; no universal action threshold or comprehension guarantee was found.
43. **Use completion where a document teaches an action.** NISTIR 7742 defines success, errors and time;
    Meng's API study uses real tasks (`round2/protocol-comprehension.json:204–240,266–296`). Reported protocols/results.
    Cost: representative users, setup and observation. Touches validation beyond QA; separate diagnostic think-aloud from timed trials.
44. **Use a no-document arm when attributing value to documentation.** `skillsbench run_experiments.sh:103–106`;
    SWD-Bench and CodeQA-Bench independently implement related controls. Measured benchmark designs.
    Cost: another reader arm. Touches method validation; deferred for routine audits, not rejected as ineffective.
45. **Keep task framing before examples as a testable default.** Ten of ten sampled documents do it.
    `A9.md:12–21,40`; ripgrep `README.md:3`, FastAPI `docs/en/docs/tutorial/first-steps.md:3` at pinned commits.
    Measured prevalence, not effect. Cost: a small rewrite; touches placement. Do not convert 400 words into a cap.
46. **Preserve a visible route to installation or the next task.** Eight of ten sampled pages offer an
    installation route; two lessons intentionally omit it. `A9.md:25–36,46`. Measured prevalence.
    Cost: link/placement check; touches findability. Only two of five READMEs put an install command in the first 400 words.
47. **Use old-to-new sentence flow as a repair hypothesis.** Gopen/Swan topic strings at `gopen_psu.txt:100–115`
    and verbs at `:156–179`; Williams notes `sdsu.txt:83–124` (`round2/craft-sentence.json:4–107`). Craft argument.
    Cost: a local rewrite and rescore; touches clear/direct pass. Neither an active-voice ban nor a measured universal law.
48. **Test missing explanation, not only deletions.** Flower's NIH rewrite roughly doubles the passage;
    `flower1979.txt:705–783` (`round2/craft-structure.json:28`). Worked example, not an outcome experiment.
    Cost: verify additions against source; touches curse-of-knowledge and repair. Reader-oriented prose can be longer.
49. **Validate the rendered view when the hypothesis is visual.** `A8.md:65–74` distinguishes source checks
    from overflow, browser search and warning visibility. Argued measurement requirement.
    Cost: a named renderer/browser and human tasks; touches formatting audits. Raw Markdown readers see collapsed content.
50. **Budget prompts by role and model, then test them.** `A10.md:26–49,53–59` distinguishes writer/judge
    advice from reader contamination. Official guidance, mostly asserted. Cost: controlled prompt comparisons.
    Touches all seats; do not improve reader scores by quietly adding expert roles, CoT, retries or answer-bearing examples.

## Formatting Markdown for human readers

A8 opened 36 sources. Its measured findings, craft consensus and asserted conventions must stay apart.
Source checks can find syntax and structure; raw Markdown reader seats cannot measure viewport,
visual prominence, scrolling, hidden disclosure or a screen reader's experience. `A8.md:65–74`.

| Decision | Evidence class and limit | What terse can check |
|---|---|---|
| Let prose reflow; control rendered width in CSS | **Craft consensus:** Bringhurst 45–75 characters, ideal 66, from Rutter's secondary quotation; Butterick 45–90. Neither supplies experimental derivation. **Asserted/normative:** WCAG 1.4.8 AAA asks for a mechanism permitting ≤80 characters, or 40 CJK, not those defaults. `A8.md:5–8`. | Forced breaks and source widths; render to measure actual width. No universal 80-character Markdown gate. |
| Use semantic line breaks when they help review | **Craft consensus:** SemBr gives local diffs and unchanged paragraphs. Its 80-character source maximum and Uber's mandate are **asserted house rules**. No reader-outcome experiment; A9 finds no convergence. `A8.md:10–13`; `A9.md:57`. | Compare parsed output before/after; avoid accidental hard breaks. This improves source review, not rendered line length. |
| Encode hierarchy and name the section's actual scope | **Asserted/normative:** WCAG 1.3.1 A, 2.4.6 AA, 2.4.10 AAA differ. WAI advises against downward rank skips; neither a three-level cap nor automatic failure for each skip follows. APG is informative. `A8.md:15–18`. | Heading nodes, ranks and duplicates. Meaning and exception scope need review; a one-word heading can be sufficient. |
| Use bullets for alternatives, numbers for order/count, tables for comparison | **Measured, qualitative:** NN/g observed numbered alternatives mistaken for steps; sample size omitted. **Craft consensus:** aligned attributes aid comparison. Two-level nesting is a heuristic. `A8.md:20–23`. | List type, nesting, table headers/shape; render overflow. Keep connected explanations and their qualifications in prose. |
| Put a warning before the decision it changes | **Craft consensus/synthesis:** placement protects the decision. **Asserted:** GitHub's one-or-two-alert quota and syntax; Material's `!!!`/`???` require extensions. `A8.md:25–28`. | Flag decision-critical warnings inside collapsed content; do not delete a warning to meet a quota. |
| Use boxes selectively | **Measured, indirect:** 26 people overlooked an inline promotion partly differentiated by a colored box. This was not a warning study. No opened identical-content boxed-versus-inline trial. `A8.md:28`. | A/B test the actual warning. Presence of a box does not establish salience. |
| Collapse optional detail only | **Craft consensus:** accordions add actions and fragment context. **Asserted compatibility:** MDN reports search opening in Chrome 97+, Firefox 148+ (139–147 partial), Safari 26.2+ partial. `A8.md:30–33`. | Summary/open state and hidden descendants; test the target browser. “Find-in-page cannot find details” is false as a universal claim. |
| Frame code, tag its language, separate input from output | **Craft consensus:** explain the operation and show recognizable success. **Asserted house rule:** GitHub targets about 60 characters per code line and discourages copyable `$` prompts. `A8.md:35–38`. | Fence closure/tags, command/output distinction, copy/run checks. No measured universal block-height cap was found. |
| Make diagrams' essential information available in text | **Asserted/normative:** WCAG 1.1.1 A requires alternatives, with decorative exceptions; 1.4.5 AA generally prefers actual text. ASCII is not inherently accessible. `A8.md:40–43`. | Image paths, alt presence, Mermaid `accTitle`/`accDescr`; equivalence and renderer support require review. Empty alt may be correct. |
| Give links an identifiable purpose | **Asserted/normative:** WCAG 2.4.4 A permits programmatically determined context; 2.4.9 AAA requires a mechanism for link-text-only purpose. `A8.md:45–48`. | Generic labels and bare URLs are review signals, not automatic compliance failures. Local link checks do not establish useful labels. |
| Support scanning with meaningful headings and selective emphasis | **Measured:** NN/g's F-pattern study had 232 users; the later tiger heatmap had 47. Layer-cake shows a nine-person heatmap, not a stated total study sample. `A8.md:50–53`. | Test whether the relevant exception is found. F-scanning often reflects weak formatting and limited motivation; do not design an F-shaped page. |
| Put purpose and a safe route near the start | **Craft consensus:** GitHub's README content priorities. **Asserted platform limit:** truncation beyond 500 KiB. **Measured:** 120 participants, >130,000 fixations, 1920×1080 screens: 57% of time in screen one, 74% in the first two, 81% in three. `A8.md:55–58`. | Source order and bytes; render for the fold. These are attention shares, not percentages of readers who stopped scrolling. |

Morkes and Nielsen provide the directly relevant controlled formatting result. Study 3 had 51 people
across five conditions; 81 was the total across all three studies. Scannable users made fewer task
errors, t(19)=2.16, one-tailed p<.05. The reported 47% improvement was composite usability, not
47% better comprehension. Bullets, bold keywords, captions, sections and headings changed together.
Opened [study][nielsen-study], Study 3 methods/results; `A8.md:60–63`.
`craft-structure.json:132` calls the combined 124% gain greater than the sum of 58%, 47% and 27%.
Their sum is 132%; no superadditivity follows. Scannable sitemap time was 198 seconds versus 185
for control; without significance, that adverse direction does not establish harm either.

### What ten documents actually do

A9 fetched raw source at pinned commits: five READMEs and five selected introductory pages, not five
whole documentation sets. The reputation sample was purposive; it is not a quality ranking. Words
exclude markup/metadata; sentence figures are estimates. The 400-word window is not a browser fold.
Pinned URLs and definitions: `A9.md:3–8,60,64–73`; measured rows at `A9.md:12–21`.

| Document | Words before fenced code | Maximum heading / downward skip | Tables / folds | Estimated median paragraph sentences |
|---|---:|---|---|---:|
| ripgrep README | 1447 | 3 / no | 6 / 0 | 1 |
| fd README | 209 | 4 / no | 0 / 0 | 1 |
| HTTPie README | 144 | 2 / no | 0 / 0 | 1 |
| uv README | 126 | 4 / yes | 0 / 0 | 1 |
| pageres README | 48 | 5 / no | 0 / 0 | 1 |
| Rust, Hello, World! | 203 | 3 / no | 0 / 0 | 2 |
| Vite, Getting Started | 374 | 4 / yes | 1 / 1 | 1 |
| Astro, Getting started | 33 | titles in metadata/components | 0 / 0 | 1 |
| FastAPI, First Steps | 10 | 4 / yes | 0 / 0 | 1 |
| Docusaurus, Introduction | 127 | 3 / no | 0 / 0 | 1 |

Eight practices meet A9's prespecified ≥8/10 convergence threshold (`A9.md:38–47`):

- 10/10 frame purpose or task before executable examples.
- 9/10 reach a code block within 400 counted words; ripgrep puts benchmark tables first.
- 9/10 start with explicit headings; Astro generates titles from metadata/components.
- 9/10 use lists; the selected Rust lesson uses prose and code.
- 9/10 have an estimated one-sentence median prose paragraph; Rust has two.
- 9/10 use no collapsible blocks; Vite uses one.
- 8/10 supply an installation route; Rust and FastAPI's selected lessons omit instructions.
- 8/10 have no tables; ripgrep and Vite use them for actual comparisons.

Do not turn prevalence into benefit. Only 6/9 explicit outlines avoid rank skips. Only 2/5 READMEs put
an install command within 400 words. One sentence per source line does not converge. Source wrapping
changes prose/code/list/table ratios, and the sample supports no universal ratio, sentence ceiling or
punctuation gate. Accessibility advice survives even when admired examples depart from it. `A9.md:56–62`.

## Other instruments and what they can settle

**QASPER** separates question writers, who saw title/abstract, from answer/evidence annotators: 5,049
questions over 1,585 papers. An audit found 207/273 answers correct, 75.8%; 98% of questions had at least
one correct answer. Human free-form answer F1 was 39.71 versus 58.92 extractive: string overlap is not
semantic correctness. 55.5% need multiple evidence pieces and 10.2% are unanswerable; some “No” answers
rely on absence. Its document-derived key tests reading, not agreement with an external system. The
return's “paper cannot be wrong” overstates that scope. Opened [paper][qasper], dataset, analysis and
baselines; `round2/protocol-benchmarks.json:4–57`. Cost: separate key/evidence preparation and adjudication.

**DocBench** has 229 PDFs and 1,102 QA pairs, including 350 hand-written pairs. Its judge sees question,
answer, key and evidence. On 200 labelled cases, reported agreement was 98% for GPT-4, 67% for GPT-3.5,
55% for string match. Unanswerable questions were 11.3%; GPT-4 systems scored 37.1–70.2% on them; human
accuracy overall was 81.2%. These warn against guessing, not that terse's 6/6 is “inside the noise” of
another instrument. Opened [repository][docbench], evaluator/prompt and linked paper's evaluation;
`round2/protocol-benchmarks.json:58–99`. Cost: a judge call per item and human calibration.

**RAGAS** distinguishes faithfulness to context, relevance, and factual comparison with a reference.
Atomic entailment can expose unsupported additions; faithfulness to a false document is not truth.
Regenerating questions checks alignment, not correctness. Cost: extraction/entailment or generation
calls plus calibration. Opened implementation: `round2/protocol-benchmarks.json:100–159`. ARES adds
human-labelled aggregate correction; DeepEval's expert-label guide has no reported held-out agreement
result in A7's read. `A7.md:59–69`. Do not replace an external oracle with agreement between prompts.

**Schriver** argues for choosing along a continuum of text checks, expert judgement and reader
protocols according to audience, purpose and failure. The full paper does not demand discarding cheap
checks. Think-aloud diagnoses causes; timed tasks estimate performance, so combining them changes the
instrument. `round2/protocol-evaluation-theory.json:4–76`; `protocol-comprehension.json:204–240`.

**Eye tracking** weakens both formula worship and “formulas measure nothing.” The opened v5 [study][eye]
has 638 adults, 30 news articles, 790 aligned sentence pairs and about 3.7 million fixations. Content-controlled
total-fixation correlations: word length .412, Coleman–Liau .388, surprisal .383, Claude Sonnet 4 .211,
Flesch–Kincaid .164. None of 24 LLM prompts significantly predicts skip rate; regression rate has one
exception, GPT-5 simple at −.075. The return's blanket dismissal loses that exception, and surprisal is
not best on total fixation. These modest English-news correlations do not validate README navigation.
Opened methods/results/CSVs: `round2/protocol-evaluation-theory.json:77–119`.

**Readability formulas** were calibrated against specific human tests: Flesch reports multiple R=.7047,
Dale–Chall about .70, SMOG roughly 1.5 grades of prediction error for complete comprehension. This
contradicts zero association, not the rejection of universal documentation thresholds. Flesch/Dale–Chall
reprint access is ambiguously described; SMOG was opened, Kincaid's original was not. Different cloze
and multiple-choice criteria cannot be treated as a verified conversion. `protocol-evaluation-theory.json:120–239`.

**Cloze, tree testing and paraphrase** measure restoration, route choice and explanation respectively.
Taylor was partly opened; Spencer's pilot used 20 people, ten minutes and 10–15 tasks. Vendor sample
recommendations are not universal minima. Model cloze is not human cloze: the 3,085-context comparison
with ≥100 humans per context used models up to 2.8B, leaving frontier substitution unsettled. Cost:
tasks/keys and representative participants. `protocol-comprehension.json:4–203`; [Jarrett/Redish][paraphrase],
“Tell me in your own words” and technique-selection table. No single instrument covers the others' outcomes.

**Task completion** is the missing independent ruler. NISTIR 7742 specifies expected outcomes, errors
and a task budget; time reported only for successes censors failures. NISTIR 7804 recommends 15–20 people
per user group in its regulated context. Meng's API study used 11 people, five tasks, 40–70 minutes,
about 49% reading and 51% editor time. Cost: users and runnable tasks; model latency is not human time.
`protocol-comprehension.json:204–296`. Synthetic-reader validity needs its own calibration: a card-sort
study with 28 humans, 1,399 cards and four models reports best aggregate agreement about .42, persona
agreement about .10. This is information architecture, not QA. `protocol-comprehension.json:297–359`.

**Subjective difficulty** has narrower counterevidence to the blanket rejection. Sauro/Dumas used 26
people doing five tasks on each of two applications. A5 read the abstract only; it does not validate
terse's model-clarity instrument. `A5.md:13–17`. Pair performance with effort, not effort in place of accuracy.

**Carroll's minimalist instruction** has two experiments, n=19 and n=32. The first reports 10.0 versus
16.4 hours learning, about 40% less, t(17)=3.06, p<.01. The second reports 58% more subtasks and 93% more
per unit time; the 20% error reduction was not significant. The intervention was bundled and genre-specific;
it does not establish deleting indexes or forcing first action onto pages 1–2. The return's “2.7×” beside
28.9/10.2 is inconsistent: retain components, about 2.83×. Opened paper: `protocol-standards.json:100–153`.

**Horn, ISO and GSA** do not justify “standards merely prescribe.” Horn's 32% reading-time reduction was
supervisors' recollection after training 180 managers; 83% reported faster approval. His 1998 Note 2
retracts literal 7±2 limits. ISO's full text was unopened, but official/support material describes
relevant, findable, understandable, usable and evaluation. GSA's opened guidance includes testing.
This does not establish a standard-prompt benefit. `protocol-standards.json:4–99,154–195`.

**Sentence craft** supplies hypotheses, not a validated mandatory pass. Gopen/Swan use worked revisions;
Williams's book was represented by notes, Pinker by an essay repost. Pullum finds three of four alleged
passives are not passive. Williams 1981 plants roughly 100 errors but reports no returned results;
Kimble compiles 25 heterogeneous studies, so no one rule owns the gains. Britton/McNamara abstracts
suggest prior knowledge moderates coherence benefits. `round2/craft-sentence.json:4–324`.

**Structure craft** needs the same separation. Flower's 1979 reader-/writer-based distinction and the
1981 recursive-process theory are different sources. Pinker says imagining a generic reader is insufficient;
external readers provide missing information. Heath's book was unopened: votes among authorities do not
test a cure. Minto's book was search-only; SCQA can delay the answer that answer-first advice prioritizes.
Test page/audience fit, not prestige. `round2/craft-structure.json:4–89,139–220`.

**Beyond English**, A4's Japanese, Russian and Chinese guidance is not replication of terse's experiment.
FDA usability distinguishes safe performance from verbal understanding; EMA's 90%-find × 90%-understand
criterion becomes 16/20 per question, not aggregate accuracy. Legal tasks and ToolSandbox's state milestones
supply consequential outcomes; τ-bench's repeats expose fragility. Cost: domain expertise and environments.
`A4.md:5–75`. Keep the access and sample limits below; do not transfer an aggregate score to every user.

## Candidates to test, not evidence to adopt

**Anthropic's mannered-prose instruction.** The Fable 5.1 [prompting page][fable51], “Writing density,”
lines 762–774, documents this long form and says to put it in the user message preferably, or the system
prompt. This writer read A10's saved page and fetch record; a new live fetch failed certificate checking
and the escalated retry was rejected. This is an attributed quotation, not a measured effect or a reuse grant.

> Mannered prose substitutes metaphor and flourish for direct statement. Instead of "a parameter worth
> varying," the mannered writer produces "a dial worth turning." Instead of "this point still matters,"
> they write "this point earns its keep." The phrases exist to display the writer, not to convey the
> idea, and readers can tell. That is why mannered prose irritates: it makes the reader work harder so
> the writer can perform. It is also imprecise. Metaphors drag in connotations the writer did not choose
> and cannot control. The fix is to say what you mean. When a literal phrase is available, use it.

The documented short form is **“Please remove all mannered prose.”** The page says these instructions
help; it gives no sample, effect size or reader test in that section. Compare baseline, long and short
forms under one pinned model/effort and identical source. Test hidden answers, preservation and blinded
human preference separately; preference alone does not validate comprehension. Proposed cost: ten
passages × three arms × three reader replicates = 90 reader calls, plus 30 writer outputs, judging and
key preparation. Long versus short isolates the added explanation; both versus baseline tests benefit.
This is a proposed local experiment, not a power calculation. Check reuse terms before shipping the text.

**The owner's ASD/Minto line.** The task supplies its two names and the typo, not a complete verbatim
sentence. Preserve that limit. A normalized candidate for testing is: “Use ASD-STE100 Simplified
Technical English and the Minto Pyramid Principle.” This is a reconstruction, not a quotation of the owner.
The owner's copy says **“ASD-STE 1000”**. The standard is **ASD-STE100**; **S1000D** is a different
specification. A4 opened the standard's official access/FAQ/AI pages, not Issue 9 itself (`A4.md:27–30`).
Minto's book remained lending-restricted/search-only (`round2/craft-structure.json:139–181`). Naming a
standard is not the same intervention as supplying its rules; misspelling may change model associations.

First recover and freeze the owner's exact line. Then compare baseline, exact typo, corrected name,
ASD-only and Minto-only wording, with the same hidden-task and preservation outcomes. Five arms × ten
passages × three readers = 150 reader calls plus 50 writer outputs and grading; a baseline/combined
pilot costs 60 readers plus 20 outputs but cannot separate the two components. Prompt length, model
knowledge and task genre remain moderators. The SimpleEnglish result below is a reason to test a short
instruction, not evidence that this untested combination works. No paid standard/book text was obtained.

## Rejected on evidence, with the scope of the rejection

Keep **mandatory standards passes, sentence ceilings and punctuation/style gates** out of the default
repair. Terse's ten-seat observation is one weak local test, not proof against standards. Independent
support is narrower and concrete: SimpleEnglish's 299-byte micro-prompt beat its full 53-rule ASD-STE100
skill on sentence length, em-dashes, bold, headers and bullets across eight scenarios; the full skill
won on its own compliance linter. `evals/results/rebuild-2026-09-02/micro-prompt.txt:1` and
`evals/results/WHY-USELESS-2026-09-02.md:1` as reported in R1:166–172. These are surface outcomes, not
comprehension. Gopen/Swan reject a 29-word ceiling; Pullum shows misclassified passives; A9 finds no
uniform heading cap or source-line convention. Together they reject unsupported universal gates.

The stylebook collections independently expose the missing evaluation. `agent-rules-books docs/CRITICISM.md:17`
reports no clear measurement. `agent-stylebooks scripts/validate_repo.py:390` rejects an `evals/` directory,
and `AGENTS.md:9` excludes evaluation infrastructure in v0.2. Its CDC adaptation removes the 20 scored
questions and thresholds (`PROVENANCE.md:44–45`; `skills/cdc-clear-communication/SKILL.md:72`). That is
loss of an instrument, not evidence that the original CDC instrument fails. The collections impose
neither hard word limits nor prose CI gates in R1's inspected scope. R1:173–185.

Keep **generic quality scores** out of correctness decisions. Readme-score's code/list/image bonuses
and HTML-length term can reward different meanings identically (`lib/readme-score/document/score.rb:5–47,86–96`;
`A6.md:29–38`). ai-docs-reviewer's 60-word default and keyword coverage reward form, miss synonyms and
can suppress the model for a falsely “missing” topic (`src/ai_docs_reviewer/coverage.py:21–38`;
`judge.py:39–41`). Filled templates and Diataxis labels are hypotheses, not outcome measurements.

Keep **literal-fidelity gates without adjudication** out. The grounded-vault reader reports a genuine
correct-page false positive from its number-token guard, plus Python 3.9 incompatibility. Its upstream
calls them “fidelity suspects”; the repackaging turns them into a strict pre-commit/CI gate.
`round2/repo-wshobson-agents.json:15–26,52`. The idea survives as an advisory check; that implementation does not.

Do not call a linter's detector **zero false positives** merely because it is deterministic. `had had`
can be valid, NOTE/TODO can be intentional, a/an depends on pronunciation, and hidden Unicode may be
needed for a language. The 17-character Unicode set detects presence, not harm; ZWJ/ZWNJ and bidi use
need context. “$5 dollars” is redundancy, not inconsistent prices. The two linter returns disagree on
its classification; keep it stylistic. `round2/linter-textlint.json:4–39,80–154`; `linter-vale.json:53–96`.

Narrow structural checks survive: markdownlint MD051 uses a file's GFM-style anchors; MD052 covers
full/collapsed reference links, with shortcut checking off by default. remark's CLI can validate across
files but its lower-level use needs the right file set. Lychee's external URL checks need network and
body retrieval for fragments; HEAD success alone cannot validate a fragment. Generated routes and
renderer differences need explicit scope. `round2/linter-structural.json:4–96`. LanguageTool's tuned
accept/except confusion pair reports precision .998, recall .659; adapting .991/.156. These are limited
pair experiments, not a fact checker; model storage/API availability adds cost. `linter-structural.json:97–118`.

The no-document arm and Doc Detective's three-vote ensemble were **deferred for cost**, not rejected on
evidence. They roughly double reader arms and triple judgement calls respectively (`R1:150–153`;
`doc-detective src/agents/doc-detective-specialist.md:181–203`). New benchmarks strengthen the case for
an occasional no-document validation arm. They do not establish that routine large fan-outs pay for terse.

## Disagreements to retain

The sections above carry the statistical, formatting and standards corrections. These additional
collisions matter when someone tries to compose the source implementations.

| Inputs in conflict | Finding and decision |
|---|---|
| R1:202 versus A1.md:1–3,81–87 | The old awesome-copilot count was 370 skills. A1 enumerated 848 entries: 222 agents, 193 instructions, 433 skills; it read 141 text-related bodies. Keep the dated census, not the old current count. |
| R1:206–208 versus `repo-deichrenner-driftcheck.json:54–60` | “Suppresses recently fixed issues” is not enforced as described. The prompt asks for recent logs that the assembled input does not supply; `src/config.rs:19` says skip recently modified docs, `:21` says only flag them. Reject the claim; do not guess which rule wins. |
| Driftcheck README versus implementation, `repo-deichrenner-driftcheck.json:60` | Missing config permits proceeding; `auto_apply`/`show_diff_preview` are declared but unused; TUI writes at `src/tui/app.rs:645–647` without the advertised preview. Source intent is not execution evidence. |
| `repo-trogera-diataxisSkills.json:16–18,46` versus its other confidence instructions | Signal-count confidence, mixed/low labels and “unclassifiable” conflict across files. Keep the escape hatch and explicit counterexamples; do not transplant the rubric. |
| Trogera's no-invention rule versus terse repair, `repo-trogera-diataxisSkills.json:28–32` | A split plan redistributes existing text; a factual repair may need verified missing facts. Ban unsupported invention, not source-grounded additions. Flower's longer repair independently supports that distinction. |
| `repo-gurevich89-ai-docs-reviewer.json:41–45,53` versus `skills/audit/SKILL.md:66–73,108–110` and `skills/audit/references/measure.md:19–21,85–89` | The return says terse lacks persistence and suggests rechecking only failed items. The plugin already saves the key/run and requires controls. Keep controls; a TOML topic inventory is optional coverage, not a replacement key. |
| `repo-gurevich89-ai-docs-reviewer.json:5` versus its source-access record | “All” files opened overstates coverage: test/coverage/loader count paths were not all inspected. Fifteen test definitions are not fifteen executed tests. Record reading, not a passed suite. |
| `repo-specialone0007-review-skills.json:95` versus confident drift detection | Two private trials report 106 findings = 91 correct + 15 wrong, then 117 = 95 + 16 citation errors + 6 substantive errors. The rubric changed, so totals are not a measured improvement. One absence claim had recommended removing a transitive dependency. |
| `repo-specialone0007-review-skills.json:30–42,95` versus the skill's negative instructions | A ban on estimated counts was ignored twice; a positive “show the count command” instruction is proposed, not retested. “Read-only” checks created two ignored `.pyc` files. Git status alone did not establish no writes. |
| `repo-specialone0007-review-skills.json:18–24,95` versus broad path/env claims | 211 path findings were mostly create/historical paths; path checks became opt-in. DEBUG/PORT-style names can be missed, basename reachability misses dynamic use, and `list(code_dirs)[:40]` makes staleness sampling arbitrary. Keep bounded checks and caveats. |
| `linter-vale.json:53–76` versus A6.md:5–10 | The rule-pack pass missed `proselint/Spelling.yml:1–17`. A6 opened 21 registered archives and 1,157 YAML files; one uses Vale consistency with twelve pairs. Retain the implemented cross-block mechanism. |
| Linter returns' factual-gate claims versus their own code | Acronym expansion checks can accept a later expansion instead of enforcing first use; duplicate-word and a/an checks are conditional. Shared upstream rule lists are not independent confirmation. `linter-vale.json:4–41,108–128`; `linter-textlint.json:62–154`. |
| A7.md:3–22 versus “the three Diataxis skills duplicate each other” | Main-file 5-gram Jaccards were 0%, 0%, .262%; reference comparisons .076%, .023%, .145%. Shared four-quadrant vocabulary does not make the operational procedures duplicates. Keep the distinct placement, governance and evidence prompts. |
| A7.md:35–57 versus “unslop/deslop/HADS only prescribe” | Unslop has regex/CLI/stop-gate machinery; deslop supplies a checkable legal-writing rubric, not Google's guide. HADS's validator is planned, not implemented; its small-model benefit claim is asserted. Reject the blanket description and the unmeasured benefit. |
| A6.md:20, tamos README versus contradiction validator | README allows more-specific overrides; the validator says there is no override mechanism. Keep rival readings and consequence-based severity; reject the universal inheritance assumption. |
| `repo-doc-detective.json:5,59` versus automatic test coverage | The docs config sets `detectSteps:false`; explicit inline tests do the dogfooding. Regex detection can infer unsafe/incomplete steps and schema-invalid steps are dropped with warnings. Core engine was not opened. Do not call markup coverage executed coverage. |
| `repo-doc-detective.json:49,59` versus Diataxis mandate and coverage scores | Its persona/journey strategy explicitly rejects Diataxis as the organizing principle. ADR 00103 removes 943 lines of coverage machinery; that records a design decision, not proof the metric never helps. |
| `protocol-standards.json:196–251` versus treating prose CI as a factual exception | Write the Docs runs blocking Vale style checks. Its 28-word rule is suggestion-level below the warning threshold, with 16 disabled settings. Existence of this gate neither validates it nor makes it a fact checker. Its ARID guidance agrees with terse's repair bias. |
| `craft-structure.json:220` versus A8.md:62–63 and arithmetic | The 124% composite gain is smaller than 58+47+27=132%, and not isolated comprehension. The return's “greater than the sum” claim is removed. |
| `protocol-evaluation-theory.json:77–119` versus its broad LLM dismissal | GPT-5 simple has a significant −.075 regression-rate correlation; word length beats surprisal on total fixation. Preserve outcome-specific results, not the tidier universal claim. |
| A10.md:53–58, general prompting guidance versus terse's reader construct | Documents-first, expert roles, CoT/retries and persistent agents may improve answers while removing discovery or independence. Apply writer/judge advice selectively; keep the tested reader conditions fixed. |
| A10.md:44,47,57, Opus 5 versus Fable advice | One advises removing redundant verification agents; another recommends fresh verification. Neither measures this three-writer/two-judge panel. Treat model-dependent advice as test candidates. |
| R1:54 versus licence scope | “AGPL spreads to what links it” was an unsupported legal universal. Keep Doc Detective ideas-only for this plugin; do not infer every linking arrangement's legal status. |

## Licences and reuse

R1's eight repository reads remain useful. Its licence records (`R1:40–54`) are inherited, not freshly
re-audited: `neeeophytee/agent-stylebooks`, `ciembor/agent-rules-books`, `AminBlg/SimpleEnglish`,
`riekelt/technical-writer` and `conorbronsdon/avoid-ai-writing` are MIT; `vercel/eve` and
`benchflow-ai/skillsbench` are Apache-2.0; `doc-detective/agent-tools` is AGPL-3.0. The engine is also
reported AGPL-3.0 (`round2/repo-doc-detective.json:5`). Take Doc Detective ideas only. The stylebooks'
16 upstream guides keep their own terms; a wrapper's MIT licence does not relicense those texts.

Additional opened licence records: developer-docs-framework MIT (`A2.md:5`); Good Docs templates
Zero-Clause BSD (`A2.md:27`); Vale and tamos MIT, mdt declared Unlicense, readme-score MIT
(`A6.md:3,12,22,29`). Preserve required notices when taking implementation or prompt text.
The returns do not establish a reusable grant for each other quoted skill/rule pack. Check the exact
file's licence before copying; until then, take the idea only. Unknown terms are not proof of no licence.
Anthropic's skill has no established grant in this record; the Fable quotation is evidence of a proposed
treatment, not permission to redistribute the prompting guide. Minto, Heath, Williams, Pinker and the
standards are not treated as freely reusable because a search engine or teaching note quotes them.

## Unread, partly read or unverified

These are open work items, not negative verdicts. A returned summary does not make its unopened sources
opened. Backlogs below preserve both rounds; runtime and external-validity gaps remain separate.

- `round2/critic-completeness.json`: absent at the final access check; no completeness-critic findings used.
- Original round-one scouts/readers and raw logs were not supplied separately. The 41-candidate, eight-deep-read,
  33-unread census is historical; overlap prevents a reliable new unique-candidate total. `R1:7–13,238–262`.
- Awesome-copilot: 704 other bodies and 1,982 ancillary files remain unopened; seven selected supporting files were read.
  Three extra entry bodies were read but excluded, reconciling 141 + 3 + 704 = 848. `A1.md:87–90`.
- Developer-docs-framework: compiled `AGENTS.md`, `.github/FUNDING.yml`, linked studies and discussions.
  Good Docs: `DCO.txt`; main/dev content-type issue templates; dev `our-team/*`, `quickstarts/*`,
  `style-guide/*`, `incubator/*`, `.vscode/settings.json`, `ia-guide/{example.html,ia-cyoa.tw,ia-site.md,images/*}`
  and external sources. Archived main/dev branches differ. `A2.md:25,45–47`.
- Telemetry: live analytics, session recordings, real helpfulness response rates, refinement/exit formulas,
  causal ticket deflection, a page-to-product-completion join and numeric intervention thresholds were not verified.
  Zendesk's original lead remains unverified. GitHub internal A/B and Kusto guides returned 404; WTD sitemap
  returned 403, with publication source recovered via GitHub. Garnett/Kiss and Keegan recordings were not
  watched; Campaign Monitor's Yoda case and Moir's article exceeded allowed hosts. `A3.md:58–70`.
- Non-English: GOST is normative; Glavred is a heuristic, not validated quality; Japanese/Chinese guidance has
  no measured transfer to terse. Full ASD-STE100 Issue 9, IEC/IEEE 82079-1, most paywalled safety standards,
  the full legal-trial adjudication and cited recordings remain unread. VK's guide could not be verified;
  German/VK searches returned zero results, not proof of no work. Journal searches produced no verified
  full empirical paper; arXiv timed out and retry permission was rejected. `A4.md:5–67,76–87`.
- Legal data: reported raw 5,096 trials/364 IDs precede exclusions, not a verified final experimental n.
  Racial/linguistic and domain effects are not settled by aggregate model performance. `A4.md:56–67`.
- A5's Sauro/Dumas counterexample: abstract only. Its proposed bake-off experiment has not run. `A5.md:16–17,59–67`.
- A6: mechanism source was read; no human trial of Vale, tamos, mdt or readme-score was run. Tamos's
  inheritance conflict is unresolved; third-party rules need individual licence checks. `A6.md:5–38`.
- A7: original ARES/G-Eval papers and human-label datasets unopened; DeepEval's guide supplies a protocol,
  not the requested held-out validation. HADS validator and small-model result unverified. `A7.md:55–69`.
- A8: Bringhurst's original book and historical ventilated-prose originals unopened. Two NN/g old URLs and
  Home Manager's old path returned 404; replacement NN/g articles opened. No browser tests ran. `A8.md:76–80`.
- A9: rendered sites/chrome, 19 off-host badge images, ripgrep's external screenshot and uv's S3 chart
  were not fetched; information-bearing image totals stay ranges. No Tailwind Markdown installation page
  was located. Counter/manifest/measurement artifacts were linked, not rerun by this writer. `A9.md:60–62`.
- A10: all seven current section pages plus evaluation opened by that seat; twelve legacy originals redirect,
  including generator/improver/template pages without dedicated replacements. Linked notebooks, implementations
  and underlying internal evaluation data were not fully audited. `A10.md:7–20,71–73`.
- Driftcheck: four parser test definitions were read, not executed. Recent-commit suppression and preview
  claims conflict with code; the 4-chars/token estimate and size ranking are unvalidated. `repo-deichrenner-driftcheck.json:5,60`.
- ai-docs-reviewer: missing tests/coverage/loader paths, runtime behaviour and useful coverage thresholds;
  malformed model output becomes missing/partial data, not a clean quality grade. `repo-gurevich89-ai-docs-reviewer.json:5,29–33,53`.
- review-skills: helper execution was rejected during approval review, so the 475-line helper was source-read
  only. Private trial targets and changed grading rubric prevent independent reproduction. `repo-specialone0007-review-skills.json:95–96`.
- Grounded-vault: the reader reports four local scenarios, not a broad test suite; source-directory escape
  guard was read, not exercised. `plugins/plugin-eval/` and `docs/plugin-eval.md` were not opened. The four
  scenarios do not validate arbitrary numeric claims. `repo-wshobson-agents.json:5,40–44,52`.
- Trogera: seven files read; eight-page case study self-graded, with no independent reader comparison.
  Confidence calibration, signal-count threshold and restructuring benefits remain unmeasured. `repo-trogera-diataxisSkills.json:5,46`.
- Doc Detective: core execution package not opened; ADR 00135 title only; external assertions/screenshots and
  all-skipped outcomes need runtime checks. Runner/schema reading is not product execution. `repo-doc-detective.json:5,35–38,59–60`.
- Linters: complete LanguageTool confusion corpus and deployment/hosted n-gram availability unverified;
  GDS testthedocs-derived rules share ancestry, not independent evidence. Browser/render integration and
  language-specific false-positive rates remain unmeasured. `linter-structural.json:97–118`; `linter-vale.json:108–128`.
- Benchmarks: human validation of CodeQA keys, SWD's unevaluated 3,690 entries and transfer to terse's users;
  DocAgent evaluator code/README were read but its paper was not; comment/code inconsistency had a directly
  opened README and a fetch-tool summary of the paper. No benchmark reran here. `protocol-benchmarks.json:160–317`.
- Comprehension: Taylor pages 428–432, Shanahan's full critique, larger tree-test originals, Lost in Simulation
  full text and source datasets remain unread; Bormuth's other threshold conventions are search-only.
  No model-to-human calibration study for terse was found. `protocol-comprehension.json:4–203,334–359`.
- Terse's no-code variant explicitly says it has not been measured; retain that limit for essays and other
  world claims. `skills/audit/references/truth-pass.md:73–80`.
- Evaluation theory: Kincaid and Coleman–Liau originals unopened. Flesch/Dale–Chall records say “complete”
  reprints but give narrower page spans; mark that access discrepancy. Bruce/Rubin/Starr, Redish/Selzer
  and Redish 2000 were read in full; their source datasets were not reanalysed. `protocol-evaluation-theory.json:120–345`.
- Standards: ISO full text, Horn's 1969 book and 1992 study collection, original studies behind vendor gains
  and Carroll's 1995 heuristics remain unopened. Government/author summaries are not substitutes for their
  full instruments. `protocol-standards.json:4–38,100–195`.
- Craft: Williams's, Pinker's, Minto's, Heath's and Redish's books; Strunk/White beyond quotations;
  Britton/McNamara full papers; studies underlying Kimble's compilation; Pirolli/Card and Weinreich originals.
  Gopen's reader-expectation evidence includes indirect analogies, not isolated sentence-position trials.
  `craft-sentence.json:59–324`; `craft-structure.json:47–220`.
- Owner's complete ASD/Minto sentence and its original provenance were not present in the supplied inputs.
  The exact typo is in the task. The reconstructed candidate above is labelled accordingly.

## How the survey was run

Round one reports four Sonnet scouts, eight Opus readers, 966,000 agent tokens, 401 tool calls and about
15 minutes. Its Codex A0 seat stopped at a usage limit after 34 commands, leaving commentary, not an
answer. Its Anthropic finding contradicted the scout and was then verified directly. The output guard
flagged `bypass-permissions` in Doc Detective's harness description; the flag-name match was a false
positive, while the harness's bypass is still not an adoption recommendation. `R1:238–262`; `A0-commentary.md:1–11`.

Round two supplied fifteen Claude returns: six repositories, three linter groups, four protocol groups,
two craft groups. The sixteenth completeness critic was pending. Ten further Codex seats returned text:
A1, A2, A5, A6 and A9 exited 0; A3, A4, A7, A8 and A10 exited 6. The INDEX does not identify the cause
of those five exits; do not silently call them successes or infer that each hit A0's usage limit.
Their prose returns remain usable within their stated access. `INDEX.md:5–40`.

This synthesis used no web search and ran no benchmark or reader experiment. It read all 28 supplied
files and the ten requested plugin files before writing. It directly fetched Anthropic's current skill,
read A10's cached Fable/evaluation sections, checked arithmetic, and checked citations and coverage.
The evidence is mostly single-seat source reading. Shared sources, model families, WebFetch summaries,
OCR, selected examples, unpinned main-branch citations and private fixtures limit independence.
Reputation samples are not random; normative standards are not empirical effects; a failed retrieval
is not a negative result. The next expensive step should settle a named uncertainty, not add another opinion.

### Opened-input inventory

Base: `/var/folders/mf/9v804k_57lq30kwtlr7468xr0000gn/T/terse-synthesis.rY6VW1/`.
These supplied files were opened in full; none of the files present in the INDEX was skipped:

- `INDEX.md`; `prior-art.md` (the supplied 262-line version).
- `A0-commentary.md`; `A1.md`; `A2.md`; `A3.md`; `A4.md`; `A5.md`; `A6.md`; `A7.md`; `A8.md`; `A9.md`; `A10.md`.
- `round2/repo-trogera-diataxisSkills.json`.
- `round2/repo-gurevich89-ai-docs-reviewer.json`.
- `round2/repo-deichrenner-driftcheck.json`.
- `round2/repo-wshobson-agents.json`.
- `round2/repo-specialone0007-review-skills.json`.
- `round2/repo-doc-detective.json`.
- `round2/linter-vale.json`.
- `round2/linter-structural.json`.
- `round2/linter-textlint.json`.
- `round2/protocol-benchmarks.json`.
- `round2/protocol-evaluation-theory.json`.
- `round2/protocol-comprehension.json`.
- `round2/protocol-standards.json`.
- `round2/craft-sentence.json`.
- `round2/craft-structure.json`.

Plugin files opened directly: `README.md`; `skills/audit/SKILL.md`;
`skills/audit/references/reader-profile.md`; `truth-pass.md`; `measure.md`; `ledgers.md` in that directory;
`skills/revise/SKILL.md`; `skills/revise/references/bake-off.md`; `writing-rules.md`; `curse-of-knowledge.md`
in that directory. Source and plugin claims were checked against these files, not just their summaries.

Additional access: [Anthropic skill][anthropic-skill] opened in full; its [root licence endpoint][anthropic-licence]
returned 404. A10's saved `prompting-claude-fable-5-1.md:746–786` and `develop-tests.md:1–132,2818–2852`
were read as sections, not full pages; its `page-results.json:1` fetch manifest was read in full.
Copies of those four source records and `input-manifest.json` accompany this temporary survey.

[anthropic-skill]: https://raw.githubusercontent.com/anthropics/skills/main/skills/doc-coauthoring/SKILL.md
[anthropic-licence]: https://api.github.com/repos/anthropics/skills/license
[swd]: https://arxiv.org/abs/2604.06793
[codeqa]: https://arxiv.org/abs/2605.29277
[qasper]: https://aclanthology.org/2021.naacl-main.365/
[docbench]: https://github.com/Anni-Zou/DocBench
[eye]: https://arxiv.org/abs/2502.11150
[nielsen-study]: https://www.nngroup.com/articles/concise-scannable-and-objective-how-to-write-for-the-web/
[paraphrase]: https://www.uxmatters.com/mt/archives/2020/05/how-to-test-the-usability-of-documents.php
[fable51]: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5-1.md
[eval-guide]: https://platform.claude.com/docs/en/test-and-evaluate/develop-tests.md
[survey-score]: https://github.com/github/docs/blob/main/src/metrics/queries/survey-score.ts
[zero-results]: https://github.com/algolia/api-clients-automation/blob/main/specs/analytics/paths/search/getNoResultsRate.yml
