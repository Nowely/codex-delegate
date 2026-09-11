Codex gpt-5.6-terra C-T — opened all four calibrate files, `prior-art.md`, and read all 271 entries in `practices-full.md`; single highest-value change: remove every six-item decision rule and replace it with a predeclared, powered two-sided design.

## Checked claims

- **Calculated:** the power correction is itself wrong if the test remains the stated two-sided exact sign test at α=.05.

  - At n=6, reject only 0/6 or 6/6. Power at p=.8 is `.8^6 + .2^6 = 0.262208`; at p=.7 it is `0.118378`. This confirms the first objection.
  - At n=16, reject only x≤3 or x≥13; power at p=.8 is `0.598135`, not 0.80. The quoted ≈0.80 is the one-sided result for x≥12 (`0.798245`), inconsistent with the file’s two-sided p-value table.
  - At n=30, two-sided power at p=.7 is `0.588816`; one-sided power is `0.730370`. The first n reaching .80 is 49 two-sided (`0.810002`) or 37 one-sided (`0.807096`).
  - This assumes independent forced binary choices. “No preference” responses reduce the effective n, so the session needs more presented items than the target number of informative choices.

  `scoring-and-transfer.md:20-30` correctly warns not to use six; but `item-bank.md:35-46` still says “six observations” and “six per factor,” and `scoring-and-transfer.md:46-50` still makes “six of six” a rule. Those are direct internal contradictions.

- **Measured / primary code opened:** the PPI objection is substantially right, with one qualification. ARES requires ≥50 human-labelled triples and “a much larger” unlabelled set ([ARES README:82-86](https://github.com/stanford-futuredata/ARES/blob/c7c9018/README.md#L82-L86)). Its estimator is:

  `mean(model_unlabelled) − mean(model−human_labelled)`

  and its interval is:

  `z × sqrt(var(model_unlabelled)/N + var(model−human_labelled)/n)`

  in `ppi.py:77-86`, which I opened at commit `c7c9018`. So PPI is aggregate estimation with human correction plus model-supplied volume, not merely “subtract the judge’s error.” It is not guaranteed to tighten an interval: that depends on residual judge–human variance and N. The current skill has neither a large unlabelled preference bank nor a PPI interval, so it cannot claim this architecture yet.

The hard rule is sound and should remain: preference is a separate outcome and never defeats a demonstrated comprehension failure.

## Returned practices — 46 of 271 read

Evidence labels below are the survey’s recorded class; “L” is the line in `practices-full.md`.

### Preference, comprehension, and what is being measured

1. **L179, `williams-1981-phenomenology-of-error`** — “**Distinguish first-reading response from deliberate search, and record which mode produced each finding.**” Source locus: Williams, p.165. **Evidence:** designed measurement.  
   Calibrate: record initial choice and any post-reread change separately; do not treat reconsidered choices as equivalent evidence.

2. **L183, `williams-1981-phenomenology-of-error`** — “**Validate a proposed writing rule by seeding a document with its violations and seeing whether readers report them — not by asking readers whether they approve of the rule.**” Source locus: pp.164-165. **Evidence:** measured design plus methodological critique.  
   Calibrate: derive rules from blinded choices, then validate their effect on unseen writing; never ask whether a participant endorses a rule.

3. **L196, `kimble-1996-writing-for-dollars`** — “**Report a rewrite’s effect as a four-tuple — answer accuracy, time to answer, error/rework rate, reader preference.**” Source locus: VA letter, Navy memo, manuals, statute studies. **Evidence:** measured across 25 field studies.  
   Calibrate: report preference beside the comprehension gate and a light effort measure; never collapse them into one score.

4. **L286, `redish-letting-go-of-the-words`** — “**Pick the measuring instrument from the document’s purpose rather than using one instrument everywhere.**” Source locus: Jarrett & Redish, Table 1. **Evidence:** asserted practitioner judgement.  
   Calibrate: label paired preference as suitable for form/taste only; use task or paraphrase testing for explanatory and procedural text.

5. **L319, `nielsen-nng`** — “**Score more than right answers. Add a structure-recall measure… and report it beside the score.**” Source locus: Morkes & Nielsen 1997, n=51. **Evidence:** measured.  
   Calibrate: add a held-out structure/navigation control, so a preferred form cannot silently damage document structure.

6. **L327, `nielsen-nng`** — “**Name promotional tone as its own defect class. Stripping promotional language… was worth +27% measured usability on its own.**” Source locus: Morkes & Nielsen 1997, n=51. **Evidence:** measured.  
   Calibrate: retain promotional tone as an exploratory factor, but describe its evidence as usability, not personal preference.

7. **L360, `minto-pyramid-principle`** — “**Open with Situation, Complication, Question before the answer.**” Source locus: Minto’s SCQA passages. **Evidence:** asserted; recorded as directly conflicting with NN/g front-loading.  
   Calibrate: keep “answer first versus context first” as a contested paired factor, not as a presumed winner.

8. **L1231, `arxiv-2502-11150-eye-tracking`** — “**Do not treat a comprehension score as a measure of how easy the text was to read.**” Source locus: `main.tex:493-498`. **Evidence:** argued, supported by cited studies.  
   Calibrate: preference is not an effort proxy either; record time, rereads, or navigation burden separately where feasible.

9. **L1472, `carroll-minimalism`** — “**Measure the document by time-to-first-success and by subtasks completed, not by reader opinion.**” Source locus: Carroll et al. 1987 §4.1, p.139; experiments n=19 and n=32. **Evidence:** measured.  
   Calibrate: retain preference as a tie-breaker only after comprehension/action outcomes are equal.

10. **L1350, `redish-selzer-1985`** — “**Measure… how long it took to find each answer, whether the answer was right, whether the reader looked in the right place, and how easy the reader thought it was.**” Source locus: FCC case, p.50. **Evidence:** reported conducted study.  
    Calibrate: store answer, path, time/turns, and preference as distinct fields.

### Blinding, contamination, order, and instrument construction

11. **L702, `qasper`** — “**Split question-writing from answering across different people/agents, and show the question-writer only the surface a real reader enters through.**” Source locus: `dataset.tex:10,18`; two-expert classification κ=.94. **Evidence:** argued with measured support.  
    Calibrate: keep pair author, factor designer, participant, and judge roles separated.

12. **L706, `qasper`** — “**Attach a reader profile to every question as data.**” Source locus: QASPER record fields; 94% first-seen abstracts. **Evidence:** asserted method with measured support.  
    Calibrate: attach participant context, prior exposure, session position, and item source to every preference.

13. **L714, `qasper`** — “**Write explicit tie-break rules for choosing evidence, and check annotator agreement on them.**” Source locus: `dataset.tex:27-28`; evidence-type agreement 84%. **Evidence:** measured consequence.  
    Calibrate: define in advance how “no preference,” ties, and ambiguous replies are coded, then check a second coder on a sample.

14. **L739, `docbench`** — “**Deliberately plant unanswerable questions… and score any confident answer as a failure.**” Source locus: `neurips_data_2024.tex:295-296,487-489`. **Evidence:** measured and discriminative.  
    Calibrate: include a small set of equivalence/control pairs where neither form should win, to detect compelled or hallucinated model choices.

15. **L809, `code-qa-bench`** — “**Add a closed-book condition… Only the lift over closed-book counts as something the document did.**” Source locus: `paper_concise.tex:328-353,473-478`. **Evidence:** measured.  
    Calibrate: before treating model agreement as text-sensitive judgement, run text-free controls and report the excess agreement.

16. **L813, `code-qa-bench`** — “**Audit the answer key for source-leakage before using it.**” Source locus: `paper_concise.tex:293-301`. **Evidence:** method with tested falsifiable consequence.  
    Calibrate: audit factor labels and pair metadata so neither visible wording nor filenames leak the expected answer.

17. **L829, `code-qa-bench`** — “**Use a judge from a different provider/model family than whatever wrote the text or the key.**” Source locus: `paper_concise.tex:389-397,438-441`. **Evidence:** measured mitigation.  
    Calibrate: require cross-family judges and report writer/judge family per item.

18. **L850, `swd-bench`** — “**Always run a No-Doc control arm and report it next to the score.**” Source locus: `5_Experimental_Result.tex:5`. **Evidence:** measured.  
    Calibrate: add a same-content/neutral-presentation control to distinguish preference for the manipulation from general response bias.

19. **L858, `swd-bench`** — “**Check that your document score is reader-independent: run… two different reader models and require the ranking to hold.**” Source locus: `5_Experimental_Result.tex:34`. **Evidence:** measured.  
    Calibrate: select a cheap judge only after its candidate ranking is stable against at least one independent model family.

20. **L1029, `treetest-tooling-optimalworkshop`** — “**Cap the instrument at ~10 tasks per run, and never let a task reuse the wording of the heading that contains the answer.**” Source locus: Tree Testing 101, “Write your tasks.” **Evidence:** asserted, mechanism argued.  
    Calibrate: limit any block of novel factors and prohibit variant labels or factor language from leaking into text or prompts.

21. **L1059, `usability-cif-nistir7742`** — “**Declare, before the test, … the correct outcome, the optimal path… and the time budget.**” Source locus: NISTIR 7742, pp.18-19. **Evidence:** argued standardised practice.  
    Calibrate: preregister factor, stopping rule, test tail, power target, tie policy, and transfer success criterion.

22. **L1071, `usability-cif-nistir7742`** — “**Do not ask for narration while the reader is working; collect explanations after the task.**” Source locus: NISTIR 7742, p.14. **Evidence:** asserted standard requirement.  
    Calibrate: obtain the choice before asking why; explanations after a choice must be stored as qualitative data, not treated as the measurement.

23. **L1107, `docs-taskbased-meng-2019`** — “**Instrument which parts of the documentation the reader actually opens… not just whether they got the answer.**” Source locus: Meng et al. data analysis; 11 sessions. **Evidence:** measured.  
    Calibrate: log model prompt, side order, retries, and token use; this is needed to diagnose order and length effects.

24. **L1111, `docs-taskbased-meng-2019`** — “**Cap the session and record what was unfinished.**” Source locus: 70-minute termination rule. **Evidence:** measured practice.  
    Calibrate: predeclare a human session ceiling and record uncompleted items as censoring, not as missing data.

### Sample size, agreement, proxy validity, and uncertainty

25. **L722, `qasper`** — “**Compute a human lower bound on your own instrument before reading model scores.**” Source locus: `baselines.tex:15`; Answer-F1 60.9, Evidence-F1 71.6. **Evidence:** measured.  
    Calibrate: measure human test–retest and/or a second human coder before interpreting model–person agreement.

26. **L726, `qasper`** — “**Audit the answer key itself and publish its error rate.**” Source locus: `analysis.tex:61`; 207/273 answers correct, 98% questions with at least one correct answer. **Evidence:** measured.  
    Calibrate: audit shuffled-side mappings, factor assignments, and pair equivalence; do not assume the bank is an errorless instrument.

27. **L743, `docbench`** — “**Give the judge the reference evidence text alongside the reference answer.**” Source locus: `docbench_evaluate.py:94-96`; 98% agreement with humans over 200 sampled answers. **Evidence:** measured indirectly.  
    Calibrate: when testing comprehension equality, give a judge the relevant evidence; do not let a stylistic preference verdict impersonate a factual verdict.

28. **L923, `cloze-taylor-1953`** — “**Pick deleted items by a mechanical rule… never by judging which words matter.**” Source locus: Taylor pp.418-423. **Evidence:** argued design plus measured ranking stability.  
    Calibrate: randomise item selection and item order with a recorded seed; do not hand-pick only persuasive-looking pairs.

29. **L931, `cloze-taylor-1953`** — “**Use enough blanks: at least 25-35 per passage. Below ~16 the test stops discriminating.**” Source locus: Taylor pp.423-426. **Evidence:** measured; 16-blank condition failed at 5%.  
    Calibrate: do not infer a stable factor from six choices; plan sufficient informative comparisons per factor.

30. **L935, `cloze-taylor-1953`** — “**Never read a single score as an absolute. Compare two or more texts… and test the difference statistically.**” Source locus: Taylor pp.416,433. **Evidence:** argued and applied throughout.  
    Calibrate: report interval and test assumptions for transfer and judge agreement, not just a pass rate.

31. **L965, `cloze-criterion-bormuth`** — “**If you ever state a pass threshold… cite the study that derived it and the population it was derived on.**” Source locus: ED028901; 130 matched pairs. **Evidence:** measured but contradicted by related work.  
    Calibrate: label the 4/5 self-consistency floor as an unvalidated convention or remove it; it is not an established threshold.

32. **L1084, `usability-samplesize-nistir7804`** — “**Fix the number of readers per distinct audience segment before the run.**” Source locus: NISTIR 7804 footnote 49, 15-20 people per group. **Evidence:** argued from cited sources.  
    Calibrate: specify that one person is the population of interest, while model calls are not additional human participants.

33. **L1128, `synthetic-participants-cardsort-kuric-2025`** — “**Ask [a model] once for the aggregate judgement; do not have it role-play N individual participants.**” Source locus: Table 2; 28 studies, 1,399 people. **Evidence:** measured.  
    Calibrate: do not count temperature/persona samples as independent people; model replicates estimate model instability only.

34. **L1132, `synthetic-participants-cardsort-kuric-2025`** — “**Expect model-reader fidelity to fall as the material gets bigger and the labels get more complex.**” Source locus: RQ4/Figure 8. **Evidence:** measured.  
    Calibrate: keep pair stimuli short, constrain factors, and validate agreement separately for whole-text items.

35. **L1140, `synthetic-participants-cardsort-kuric-2025`** — “**Treat synthetic results as preliminary feedback that a human still validates.**” Source locus: Discussion 6.1. **Evidence:** argued from measured disagreement.  
    Calibrate: call cheap-model output a screen, not a substitute, until a held-out human agreement study supports the stated use.

36. **L1151, `synthetic-participants-lost-in-simulation`** — “**Never report a success rate obtained from model readers as if it were a human rate, and never compare two documents measured with different reader models.**” Source locus: abstract; up to 9-point model-user variation. **Evidence:** measured, body not opened in the survey.  
    Calibrate: pin judge model and settings; report model–person agreement with uncertainty, never as human preference accuracy.

37. **L1175, `schriver-1989-continuum`** — “**Add a concurrent measure… Record what the reader opened, in what order, [and] where it went back.**” Source locus: pp.247-249,252. **Evidence:** argued consensus.  
    Calibrate: retain a compact interaction log for both people and models, especially side order, rereads, and timeout/abstention.

38. **L1187, `schriver-1989-continuum`** — “**Do not let anyone who knows the system be the only judge…**” Source locus: p.245. **Evidence:** measured in cited studies.  
    Calibrate: participant preference is valid for that participant, but factor rules must not be represented as novice- or population-level without separate participants.

39. **L1195, `schriver-1989-continuum`** — “**Treat a judging panel’s agreement with suspicion… hold the surface constant or hide it.**” Source locus: pp.246-247. **Evidence:** argued from Charney’s review.  
    Calibrate: match or nuisance-balance length, headings, typography, and visible formatting across sides; labels alone do not control length bias.

40. **L1219, `arxiv-2502-11150-eye-tracking`** — “**Hold the content constant and compare the SAME content in two forms.**” Source locus: `main.tex:349-367,437-447`; n=790 aligned sentence pairs. **Evidence:** measured.  
    Calibrate: require every single-factor pair to preserve propositions and factual content, then document any residual change.

41. **L1235, `arxiv-2502-11150-eye-tracking`** — “**Report the effect sizes with confidence intervals and run the same analysis under several plausible alternative choices… before claiming a result is general.**” Source locus: `main.tex:389-435`. **Evidence:** demonstrated method norm.  
    Calibrate: give agreement and transfer Wilson/exact intervals; perform a small order/model sensitivity analysis before promoting a judge.

42. **L331, `nielsen-nng`** — “**When isolating which part of a chain produced a gain, vary one factor at a time against a fixed control.**” Source locus: Morkes & Nielsen five-version study, n=51. **Evidence:** measured.  
    Calibrate: retain single-factor pairs, but do not infer additive rule effects from separately preferred factors.

### Repeats, repair, and stopping

43. **L1431, `plainlanguage-gov`** — “**Run paraphrase testing as a cheap second measurement alongside the answer-key questions.**” Source locus: `guidelines/test/paraphrase-testing.md`. **Evidence:** argued plus three VBA cases.  
    Calibrate: add a comprehension confirmation before preference can decide; preserve the present hard rule.

44. **L1439, `plainlanguage-gov`** — “**Order the measurements: small qualitative tests first… A/B last.**” Source locus: controlled-comparative-studies guidance. **Evidence:** argued.  
    Calibrate: use the calibration session to diagnose and refine factors; make held-out blind transfer the final confirmatory test.

45. **L1443, `plainlanguage-gov`** — “**Plan to test at least twice — test, repair, retest.**” Source locus: test index and NCI case. **Evidence:** case evidence.  
    Calibrate: add an A/A repeat and a later re-test session; five within-session duplicates are not enough to establish temporal stability.

46. **L1677, `gurevich89/ai-docs-reviewer`** — “**Make unparseable or malformed model output degrade to ‘no verdict’, never to a pass and never to a crash.**” Source locus: `judge.py:27-34,51-52`. **Evidence:** argued and unit-tested.  
    Calibrate: add `abstain/invalid` as a fourth judge outcome; exclude it transparently rather than silently calling it disagreement.

## Practices that contradict or materially unsettle calibrate as written

- **Taylor’s sample-size and statistical-comparison practices** (L931, L935) contradict the remaining six-item bank/rule examples. The file’s current two-sided arithmetic makes 16 and 30 inadequate too.

- **Bormuth’s threshold practice** (L965) contradicts treating 4/5 repeat agreement as a meaningful floor. `scoring-and-transfer.md:41-42` already admits it is merely convention.

- **Schriver’s superficial-cue warning** (L1195) contradicts the sufficiency of shuffled labels and same-engine authorship. The skill controls position and identity labels, but not visible length, density, headings, or formatting.

- **Synthetic-participant validity practices** (L1128, L1140, L1151) contradict the implication that a one-person calibration turns cheap-model verdicts into a dependable stand-in. They support screening only after explicit human validation, fixed model settings, and uncertainty reporting.

- **QASPER human-lower-bound/key-audit practices** (L722, L726) contradict calling an unintervalled raw agreement proportion a judge’s “known error.” The agreement measurement itself needs reliability and key/instrument audit.

- **The confidence-interval practice** (L1235) contradicts Step 5’s “report pass rate with denominator” as sufficient. A denominator is necessary, but an interval and predeclared decision rule are required for a 90% transfer claim.

- **The promotional-tone practice** (L327) does not support the item bank’s implicit personal-preference rationale. It measured a usability composite in n=51, not a person’s blind preference. It supports testing the factor, not predicting its direction.

The comprehension-over-preference rule is not contradicted. Kimble (L196), Carroll (L1472), Redish & Selzer (L1350), and the eye-tracking caution (L1231) all support keeping outcomes separate.

## What I could not settle

- Whether PPI improves precision for this exact paired-preference task. ARES validates an aggregate RAG-evaluation architecture, not this individual’s blind choices; its code supports the architecture claim, not transfer of its performance.
- The human sample needed to establish 90% held-out transfer for one person. It depends on the predeclared estimand, tie handling, test tail, target effect, and acceptable interval width.
- Whether five scattered repeats predict between-session preference stability. No returned practice established that threshold.
- Whether a cheap judge’s agreement on the calibration bank generalizes to held-out factors or texts. Nothing in calibrate has been run.

## Unopened

- No practice entries were left unread: **271 read, 46 returned**.
- I opened ARES’s README and `ppi.py` directly; I did not open the original ARES paper or its human-label dataset.
- Relevant underlying sources the survey itself marks incomplete include Minto’s full book, the Bormuth 1968 JEM paper, and the body of `lost-in-simulation`; their evidence labels above retain those limits.