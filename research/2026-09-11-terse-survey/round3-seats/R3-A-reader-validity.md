Codex gpt-6-astra | R3-A | Opened: Harding’s article-text mirror, Holmback’s PDF, terse’s protocols, and primary papers on comprehension, ratings, priming and reading times. Best find: a 31-model study directly observed both floor and ceiling failures when models were used to detect human comprehension differences.

**Verdict — argued:** terse currently measures model answerability. Its numbers are **not valid evidence of human improvement yet**. The literature does not establish that a calibrated proxy is impossible: it supplies successful narrow proxies and concrete failures. No opened study validates Haiku navigating repository Markdown and predicting the benefit of documentation edits.

**1. Harding, D’Alessandro, Laskowski & Long, “AI language models cannot replace human research participants” (2023/24).**  
Evidence: opened [article-text mirror](https://github.com/tegorman13/lit_git/blob/125512801f58f0288423c67632fe9cdb2c2003b9/unsorted/Harding%20et%20al.%20-%202024%20-%20AI%20language%20models%20cannot%20replace%20human%20research%20participants.md#L28); publisher PDF unopened; extraction/layout loss is visible. Measures **nothing**, N=0; an opinion column (lines 56–58).  
**Argued**, line 28: piloting must discover human misinterpretation and comprehension/reasoning difficulty; because LLMs are “exemplary text processors by design,” their responses will not accurately reveal those difficulties; human piloting remains necessary.  
Their further objections concern interpreting surprising outputs on novel items without human confirmation (line 38), and moral judgments changing beyond the training snapshot (line 50).  
What this supports: rejecting substitution justified merely by fluent output or selected aggregate correlations. What it does **not** establish: an impossibility theorem for calibrated proxies. The construction-to-difficulty inference is not measured here and is challenged by sources 2–3.  
Take/cost: retain human validation for the claimed population and task. Collision: directly challenges terse’s reader substitution; does not invalidate code-grounded fact checking. Moral-opinion drift transfers less directly to versioned software facts.

**2. Amouyal, Meltzer-Asscher & Berant, “When the LM misunderstood the human chuckled” (2025 preprint).**  
Evidence: opened [PDF](https://arxiv.org/pdf/2502.09307v1), §§3–5, PDF pp. 4–7. **Measured:** 456 sentence–question pairs, ten native-English readers per pair: 4,560 single-trial human responses; 228 sentence variants; eight prompts per model.  
Humans and models answered the same comprehension questions. Both showed effects of garden-path syntax, semantic plausibility and verb type; larger models generally tracked individual-item difficulty better (§§4–5).  
Important denominator: condition-level Spearman correlations compare **six condition means**; the separate Kendall analysis compares individual items (§5, p. 6). These are different strengths of evidence.  
Take — **argued:** use paired difficult/control items and measure error agreement, not just total accuracy. Cost: public materials make a model screening exercise cheap; README transfer still needs humans.  
Collision: contradicts the categorical claim that models cannot reproduce comprehension difficulties. It does not validate terse: humans saw timed, word-by-word sentences; models saw complete sentences; document navigation was absent.

**3. Same authors, “Comparing Human and Language Models Sentence Processing Difficulties on Complex Structures” (2025 preprint).**  
Evidence: opened [PDF](https://arxiv.org/pdf/2510.07141v2), §§2.5–4.3, pp. 3–8. **Measured:** seven structure types, 31 models, 5,380 single-trial human responses, ten per sentence–question pair. Some materials/human data were reused from source 2.  
Best reported structure-ranking agreement: o4-mini, Spearman **ρ=.929**, over **seven structure averages**, not 5,380 independent rankings (§4.2, p. 6).  
Most useful result: models sometimes failed to distinguish difficult sentences from easier baselines because both were too difficult **or both were too easy**. The useful model-capacity range varied by construction (§4.3, pp. 6–8).  
Take — **argued:** calibrate model and reasoning budget against the actual defect classes, using difficult/easy pairs; freeze the configuration afterwards. Cost: a calibration suite plus a human anchor.  
Collision: “use a cheap model” is not a validity argument. Neither maximum capability nor minimum price selects the sensitive instrument. A zero delta can be an instrument floor/ceiling effect.

**4. Gruteke Klein et al., “Eye Tracking Based Cognitive Evaluation of Automatic Readability Assessment Methods.”**  
Evidence: opened [arXiv v5](https://arxiv.org/pdf/2502.11150v5), accepted *Computational Linguistics* July 2026; also opened v1. **Measured in v5:** 638 adults—360 L1, 278 L2—30 articles, 162 original/simplified paragraph pairs (§2.1, pp. 4–6).  
The evaluation correlates **changes** in text scores with changes in eye-movement measures, controlling content through paired simplifications (§3.1, pp. 12–14).  
The updated result is “low and, in many cases, non-significant” correlations for traditional, supervised and prompted-LLM readability methods—not universally zero correlation (§3.1, pp. 13–14). Surprisal generally predicts reading ease better.  
Take — **argued:** distinguish answer correctness from effort while reading; validate edit deltas against the intended human outcome. Cost: timing human tasks is cheap; an eye tracker is not necessary to begin.  
Collision: supports keeping model readability ratings out of the gate, but does **not** test terse’s QA score. Equal comprehension scores can conceal reading-effort differences. No formula or surprisal gate is recommended.

**5. Trott & Rivière, “Measuring and Modifying the Readability of English Texts with GPT-4” (2024).**  
Evidence: opened [PDF](https://arxiv.org/pdf/2410.14028v1), §§3–6, pp. 2–5. **Measured:** 4,724 CLEAR excerpts; GPT-4 Turbo/human-rating **r=.76**, GPT-4o-mini **r=.74**. Unique teacher-rater N is not reported here (§3).  
A separate preregistered study used 100 excerpts in three versions and **59 retained of 69 recruited people**; easier/original/harder versions received mean ratings 4.48/3.97/2.50 (§4). Ten people were excluded for insufficient agreement with original gold ratings.  
Take — **argued:** this establishes useful prediction of a particular human **rating** outcome. Cost: ratings are inexpensive, but cannot replace comprehension or task-performance observations.  
Collision: contradicts “a model’s readability rating never carries human information.” It does not justify restoring the rejected rating gate: comprehension and navigation were not measured; rewrite fidelity was explicitly unassessed (§6).

**6. Amouyal et al., “Large Language Models for Psycholinguistic Plausibility Pretesting” (2024).**  
Evidence: opened [PDF](https://arxiv.org/pdf/2402.05455v1), §§2.1, 4.2–5, pp. 3, 7–9. **Measured focal sample:** 50 sentences forming 40 pairs, 40 human ratings per sentence; unique human N not reported.  
Model–human average-rating correlation was **r=.792**, but correlation between **within-pair differences** was only **r=.312**; best F1 for reproducing the human pair-selection decision was **.55** (§4.2, pp. 8–9).  
Take — **argued:** validate the decision actually made by the proxy. High agreement across texts can coexist with poor discrimination between nearby versions. Cost: paired human observations and analysis of their differences.  
Collision: even a high overall model–human correlation would not establish terse’s before/after validity. These coefficients concern plausibility ratings and must not be transferred numerically to documentation QA.

**7. Li et al., “Can LLMs Estimate Student Struggles?” (May 2026 preprint revision).**  
Evidence: opened [PDF](https://arxiv.org/pdf/2512.18880v2), §2.4, Tables 1, 3–4, pp. 3–7. **Measured relevant subset:** 793 Cambridge reading questions, 120 passages, 21 models; human difficulty uses provided IRT parameters; human participant N not supplied here.  
Difficulty estimated from models’ **actual correctness**, rather than their ratings, correlated with human difficulty at **Spearman ρ=.309**; **35.6%** of Cambridge items were solved by over 90% of models (Table 3, p. 6).  
A “weak student” instruction barely changed GPT-5’s Cambridge accuracy: **.958 baseline versus .957 weak-persona**, on the same 793 items (Table 4, p. 7).  
Take — **argued:** test whether model task performance predicts human difficulty; verify novice simulation behaviorally. Cost: existing questions can screen candidate models; project-specific calibration remains additional work.  
Collision: avoiding self-ratings does not automatically solve validity. A fresh context or novice role does not establish novice knowledge. These test passages still differ from README retrieval.

**8. Oh & Schuler, “Why Does Surprisal From Larger Transformer-Based Language Models Provide a Poorer Fit to Human Reading Times?” (*TACL*, 2023).**  
Evidence: opened [preprint PDF](https://arxiv.org/pdf/2212.12131v1), §§3.1–3.4, pp. 3–5; publication verified in ACL’s official repository metadata.  
**Measured:** 17 model variants; Natural Stories: 181 people, ten stories, 770,102 retained word observations; Dundee: ten people, 67 editorials, 195,507 retained observations (§3.1). Word observations are not independent people.  
Within the three tested model families, larger variants’ surprisal provided poorer reading-time fits (§3.4): a published failure of “better language model → better human proxy,” alongside positive predictive signal from smaller models.  
Take — **argued:** select models using held-out human predictive validity. Cost: inexpensive offline computation where token probabilities are available.  
Collision: supports the possibility of small useful proxies, but validates token surprisal—not model answers, file-opening counts or latency. It cannot justify Haiku by analogy.

**9. Lam et al., “Large Language Models Are Partially Primed in Pronoun Interpretation” (2023).**  
Evidence: opened [PDF](https://arxiv.org/pdf/2305.16917v1), §§3.3–4.4, pp. 5–8. **Measured:** two models; 24, 24 and 60 simulated participant runs for three experiment replications; human comparisons reused Johnson–Arnold data, whose participant Ns are not supplied here.  
InstructGPT reproduced syntactic adaptation but not the semantic source/goal exposure effect; FLAN-UL2 did not produce useful comparable patterns (§4). These are model-specific partial replications.  
Take — **argued:** validate by phenomenon, including failures; one successful replication is insufficient. Cost: existing stimuli are reusable.  
Collision: fresh model calls are not sampled humans. Demographic prompts did not improve response diversity in this experiment (§3.3); temperature/persona variation cannot simply be counted as human variation.

**10. Holmback, Shubert & Spyridakis, “Issues in Conducting Empirical Evaluations of Controlled Languages,” CLAW ’96.**  
Evidence: opened [original PDF](https://mt-archive.net/90/CLAW-1996-Holmback.pdf), printed pp. 166–177. **Measured:** 130 engineering students; two procedures × SE/non-SE = four documents; 20 two-part comprehension/location questions; 30-minute limit (p. 167).  
SE improved comprehension and content-location accuracy for Procedure A; no significant effects appeared for B. A’s greater complexity was identified **after** the differential result, not as the planned manipulation (pp. 167, 169, 171–172).  
**Argued by authors:** complexity may moderate benefit, but its threshold is unknown; there was only one harder/easier procedure comparison (p. 172). No significant time advantage was found (p. 171).  
Take/cost — **argued:** separate correctness, information location and task time; test execution where feasible (recommendation 4, p. 176). This costs human task sessions, not necessarily a controlled-language program.  
Collision: does not establish that a README is easy, that simplification helps **only** above a known floor, or that SE beats equally good unrestricted writing (p. 172). It supplies no reason to reinstate mandatory writing standards.

**11. Chervak, Drury & Ouellette (1996), “Field Evaluation of Simplified English for Aircraft Workcards.”**  
Evidence: **original report unopened; human N could not be determined.** Identified by author, title and year as an FAA report in Holmback’s references (p. 177).  
**Asserted here only through the secondary account:** Holmback p. 172 reports two easy workcards with no significant accuracy change and two difficult workcards with superior SE accuracy; p. 170 identifies maintenance technicians as the population.  
Take/cost — **argued:** obtain the original interaction analysis, group sizes and baseline scores before claiming independent confirmation of a complexity threshold. The guessed MT-Archive Chervak PDF URL returned 404.  
Collision: corroborating secondhand evidence, not an opened replication. I cannot independently confirm Chervak’s effect sizes, statistical design or sample size.

**Validity contract — argued synthesis.**  
For a human-success percentage, the model needs calibration to the specified population. For choosing between versions, absolute ability may differ, but the proxy must reliably preserve the **direction and useful magnitude of human edit effects** on new tasks and repositories. Sources 3, 6 and 7 show why one kind of agreement does not establish another.  
A proxy need not implement human cognition. Repeated human improvements paired with model ties or reversals would reject that configuration for that edit class. Model-only checks can falsify prerequisites; they cannot establish the missing human relationship.

**Checks worth running — argued proposals; none was run here.**

1. **Document dependence:** compare full docs, no docs, and the answer-bearing passage removed; include a synthetic identifier/value counterfactual. Answers should follow changed documentary evidence and become unsupported when it disappears. Cost: two or three additional calls per sampled question; verify citations separately.
2. **A/A repeatability:** run unchanged docs under blinded version labels, repeated fresh contexts and fixed settings. Estimate answer flips and judge disagreement before treating any decrease as a refusal. Example: six questions × two labels × three repeats = 36 calls; a screening exercise, not a precision guarantee.
3. **Sensitivity and saturation:** inject and repair a false claim, ambiguous condition and broken navigation path; include a harmless edit. Compare models/budgets. If all variants score 100% or all fail, the instrument is uninformative there. Synthetic sensitivity alone does not establish human sensitivity.
4. **Human edit effects:** counterbalance original/revised tasks with representative humans starting at the actual entry page; record answer, time and navigation. Compare paired deltas, wrong answers and sign reversals—not just pooled correlation. Budget example: 24 readers × 15 minutes = six participant-hours; a feasibility/falsification pilot, not a powered validation claim.
5. **Population and interface:** examine novices/experienced readers and language groups separately where relevant. Prevent repeated project exposure within freshness tests. File-open counts, tokens and model latency require separate validation before representing human effort.
6. **Held-out transfer:** hide questions from writers, freeze scoring/model settings, and evaluate another repository. Report repair of exposed failures separately from unseen-task gains.
7. **Uncertainty:** predeclare a meaningful human gain and estimate intervals respecting shared participants, questions and repositories. Nonsignificance does not establish equivalence; additional model samples do not create independent human participants or independent documents.

**contradictions**

- **Argued:** Harding’s categorical comprehension objection is too strong given shared-error results; his demand for human confirmation remains pertinent. Differences from humans do not imply uselessness as a proxy.
- **Argued:** “README means easy” is unsupported. Holmback established no universal complexity floor. A document-difficulty floor would manifest as a reader-accuracy **ceiling**.
- **Argued:** terse’s original 3/6 baseline was not an aggregate ceiling; 6/6 afterwards leaves no upward accuracy range on those items. Neither establishes human benefit. Its updated [measure.md](/Users/ruliny/Git/agent-skills/plugins/terse/skills/audit/references/measure.md:3) records one README, six questions, one trial each and p=.25 (lines 3–6, 94–100).
- **Argued:** “the failures were real” can support specific factual repairs, but does not establish the prevalence or causes of human failures. Retain factual findings and the model regression score; withhold human-outcome claims pending calibration. The rejected mandatory style, length, linter, punctuation, formula and self-rating gates remain rejected.

**unopened**

Chervak’s original 1996 report and separate Chervak–Drury 2003 paper; Harding’s publisher PDF—the article-text transcription was read; Irwin et al.’s *BERT Shows Garden Path Effects* beyond ACL’s official abstract; Hu et al.’s grammatical-judgment paper beyond metadata. No first-hand empirical findings above are attributed to these unopened texts.

No human validation or model-reader experiment was conducted here. [Report and evidence archive](/var/folders/mf/9v804k_57lq30kwtlr7468xr0000gn/T/terse-r3a/R3-A-report.md) reside under `$TMPDIR`; nothing was written to the checkout.