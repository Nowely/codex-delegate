Codex gpt-5.6-sol C-S — opened all four requested `terse` files, original Thurstone and Bradley–Terry scans, and primary work on DCE/MaxDiff/conjoint, alignment preferences, demand effects, and PPI/ARES; David’s book was lending-locked. Single highest-value change: replace outcome-filtered “surviving agreement” with a preregistered, balanced, counterbalanced full analysis set in which every held-out tie and order-flip remains in the reported judge score.

Evidence classes: **measured** means source data or a calculation reproduced here; **argued** means a methodological implication; **asserted** means guidance stated by a source without validation in this exact setting.

## Executive findings

1. **The power claim in the supplied context is stale.** The files now directly contradict it: [SKILL.md](/Users/ruliny/Git/agent-skills/plugins/terse/skills/calibrate/SKILL.md:67), [item-bank.md](/Users/ruliny/Git/agent-skills/plugins/terse/skills/calibrate/references/item-bank.md:33), and [scoring-and-transfer.md](/Users/ruliny/Git/agent-skills/plugins/terse/skills/calibrate/references/scoring-and-transfer.md:20) already record 20 comparisons for \(p=.8\) and 49 for \(p=.7\). **Measured:** those corrected values are right for the stated two-sided exact binomial test.

2. **The PPI diagnosis is only partly right.** **Measured:** PPI really does subtract a signed judge-minus-human rectifier. Its larger purpose is to combine that rectifier with many model-labelled observations for tighter aggregate inference. But the human labels do **not** merely “pin the model’s agreement rate”: agreement is unsigned and is not the PPI rectifier. PPI also does not turn corrected aggregate inference into a trustworthy per-item screen.

3. **The most damaging live defect is post-selection.** [scoring-and-transfer.md](/Users/ruliny/Git/agent-skills/plugins/terse/skills/calibrate/references/scoring-and-transfer.md:70) estimates agreement only on judge-order-stable and human-self-consistent items, then calls it “known error.” **Measured contradiction:** MT-Bench reports GPT-4/human agreement as 66% on 1,343 tie-inclusive observations but 85% after retaining only 859 non-ties.[15] The skill’s filter selects the easy cases and cannot estimate error on the intended bank.

4. **The design is not a classical paired-comparison scale.** Each pair contains different text and estimates a factor-level tendency across passages. It is closer to a one-person repeated discrete-choice experiment. Pooling its signs assumes the factor has an exchangeable effect across content, engine, source and session position—none of which the current bank balances.

5. **Two claims about repeats are wrong.** Repeats measure test–retest reliability; they are not required to distinguish a preference from chance, and repeat agreement is not literally a prediction ceiling. Five repeats are much too few to estimate reliability usefully.

6. **The comprehension-over-preference rule should remain.** **Argued:** formalize it as a lexicographic gate: a comparison enters preference analysis only after both alternatives meet the predeclared comprehension requirement. Neither choice modelling nor PPI may average that failure away.

## 1. Classical paired comparison

### Thurstone, 1927

**Measured — model and assumptions.** Thurstone treats each presentation as a noisy “discriminal process.” Repeated perceptions of a stimulus form a distribution with a scale value and dispersion; for two stimuli,

\[
S_i-S_j=z_{ij}\sqrt{\sigma_i^2+\sigma_j^2-2r\sigma_i\sigma_j}.
\]

The \(z_{ij}\) comes from the observed proportion choosing \(i\). His Case I is explicitly one observer repeatedly comparing every pair, with **no equal judgments allowed** (p. 276). Case III sets the correlation to zero; Case V additionally assumes equal dispersions, which Thurstone says should not be adopted without experimental testing (pp. 279–286).[1]

**Measured — comparison count.** With \(m\) stimuli a complete design has \(\binom m2\) distinct pairs, each repeated “a sufficient number of times” to estimate its proportion. Thurstone supplies no universal stable-\(N\) rule. Case I has \(2m-1\) unknowns and first becomes algebraically soluble at five stimuli—ten pair cells—but solubility is not stability (p. 277).[1]

**Argued — intransitivity and ties.** The one-dimensional scale cannot reproduce a persistent \(A>B,\ B>C,\ C>A\) cycle. It compromises among the observations; cycles/context effects should appear as residual lack of fit. Thurstone explicitly recommends examining observed-versus-predicted residuals (p. 285). Ties are outside the original model, not observations to discard silently.

**Measured contradiction relevant to prose.** Thurstone says extending the single-observer reasoning to a population judging handwriting or English composition “is not so certain” (p. 278).[1] This supports the skill’s one-person scope and rejects population generalization.

**Transfer:** applicable to one participant if the *same small set of alternatives* is compared repeatedly. It does not naturally fit 30–60 unique passage pairs pooled by a presumed writing factor.

### Bradley–Terry, 1952

**Measured — model and assumptions.** Each alternative has positive worth \(\pi_i\), with

\[
P(i\succ j)=\frac{\pi_i}{\pi_i+\pi_j}.
\]

The original paper assumes comparisons are probabilistically independent; log-worths form the scale (pp. 325–326).[2] It permits separate judge/time-specific worths and says pooling should be decided from prior knowledge, not after observing whether judges agree (pp. 329–330).

**Measured — comparison count.** Bradley and Terry do not give a stable-scale rule. Their statement that an approximation is “fairly good” for \(n>15\) refers to **more than 15 complete-design repetitions**, not 15 comparisons (p. 331).[2] Thus:

- Three alternatives: at least \(16\binom32=48\) comparisons.
- Five alternatives: at least \(16\binom52=160\) comparisons.

Even these are approximation guidance, not power or precision guarantees. The authors explicitly say they did not calculate power (p. 334).

**Argued — intransitivity and ties.** Raw cycles can occur, but a single worth vector imposes transitive odds and cannot represent systematic cycles. The original outcome is only rank 1 versus rank 2; ties require an extension. Chatbot Arena’s later nonparametric BT analogue explicitly permits nontransitive win rates and remains statistically valid under logistic misspecification (Appendix B, pp. 15–16).[16]

**Measured — efficiency warning.** Bradley and Terry themselves say pairwise comparison becomes inefficient when more than two alternatives can be ranked and more than a few alternatives exist (p. 334).[2] That is the classical motivation for MaxDiff/ranking tasks.

**Transfer:** fitting a small individual BT scale is possible if the comparison graph is connected. Thirty to sixty observations are not enough for a richly parameterized scale, but might estimate one or two large contrasts. They do not justify a generic “stable” scale.

### David, *The Method of Paired Comparisons*

The 1963 and 1988 editions located in Internet Archive were access-restricted; the 1988 loan was unavailable.[3] I therefore make no substantive claim from David’s book. The original Thurstone and Bradley–Terry articles above establish the needed contrast, but they do not substitute for reporting David as opened.

### What this means for `calibrate`

**Argued — locus:** [item-bank.md](/Users/ruliny/Git/agent-skills/plugins/terse/skills/calibrate/references/item-bank.md:45). The skill does not repeatedly compare a common set of objects. It pools different passages that allegedly instantiate the same factor. The estimand should therefore be stated as something like:

> For passages sampled from this declared source frame, what is this person’s probability of selecting the factor-on variant over the matched factor-off variant?

Without a sampling frame or a balanced allocation across source, engine and session block, the exact sign-test \(p\)-value applies only to this fixed convenience bank.

## 2. Power and reliability

**Measured — exact calculation.** For \(n=6\), the two-sided rejection region is \(K\in\{0,6\}\), so:

\[
\operatorname{Power}_{.8}=.8^6+.2^6=.262208,
\]
\[
\operatorname{Power}_{.7}=.7^6+.3^6=.118378.
\]

For the exact two-sided test at \(\alpha=.05\):

| \(n\) | Rejection region | Actual \(\alpha\) | Power \(p=.8\) | Power \(p=.7\) |
|---:|---|---:|---:|---:|
| 6 | \(K=0,6\) | .03125 | .26221 | .11838 |
| 16 | \(K\le3\) or \(K\ge13\) | .02127 | .59813 | .24589 |
| 20 | \(K\le5\) or \(K\ge15\) | .04139 | .80421 | .41641 |
| 30 | \(K\le9\) or \(K\ge21\) | .04277 | .93891 | .58882 |
| 49 | \(K\le17\) or \(K\ge32\) | .04438 | .99509 | .81000 |

Thus the supplied \(n=6\) powers are correct; “16 at .8” and “about 30 at .7” are incorrect for this test. The current files have already corrected them.

**Argued — assumptions still absent.** The calculation assumes independent binary outcomes with a common success probability. Exact repeats are correlated, and content-dependent preferences need not share a common probability. Repeated items should not be counted again toward factor power.

**Measured — multiplicity.** Three independent factor tests at \(\alpha=.05\) have family-wise false-positive probability

\[
1-.95^3=.142625.
\]

The skill never says whether factors are exploratory, whether directions are preregistered, or whether Holm/another multiplicity control applies.

**Measured — five repeats are inconclusive.** A calculated 95% Wilson interval for four agreements in five repeats is approximately \([.376,.964]\); even five of five gives \([.566,1]\). The asserted four-of-five floor in [scoring-and-transfer.md](/Users/ruliny/Git/agent-skills/plugins/terse/skills/calibrate/references/scoring-and-transfer.md:49) cannot reliably separate stable from unstable behaviour.

**Measured contradiction — “ceiling.”** In Orme’s empirical MaxDiff study, 116 respondents completed 15 tasks; repeated holdouts agreed 81%, while the theoretical maximum prediction rate was 89% under an independent symmetric-error model (pp. 2–3).[6] The relation is

\[
\pi_{\max}=\frac{1+\sqrt{2r-1}}2.
\]

At \(r=.80\), this is .887, not .80. Repeat agreement is a reliability diagnostic, not literally the ceiling stated by the skill.

## 3. Discrete choice, conjoint and MaxDiff

### What efficient design contributes

**Measured — actual DCE practice, not a rule.** A review of 69 healthcare DCEs found that 4–6 attributes and 9–16 choice sets per respondent were common; 22/69 studies had fewer than 100 respondents, and 49/69 did not clearly report a sample-size method (pp. 374–375).[4] These are population-study descriptions, not recommendations for one participant.

**Asserted, then explicitly qualified.** The common main-effect heuristic is

\[
N>\frac{500c}{ta},
\]

where \(N\) is respondents, \(c\) the largest number of attribute levels, \(t\) tasks per respondent and \(a\) alternatives. The same paper says such rules were not intended to be strictly accurate or reliable (p. 376).[4] It does not transfer to \(N=1\).

**Measured — proper planning inputs.** Prospective DCE power requires the significance level, desired power, statistical model, expected coefficient/effect size and the actual design matrix (pp. 376–378).[4] The design determines the coefficient covariance. This is precisely what the original six-item rule omitted.

**Measured — orthogonality and D-efficiency.** In Chrzan and Orme’s simulations with 300 respondents per scenario, a symmetric main-effects random design was 68% D-efficient versus 100% for orthogonal/optimized designs (p. 10).[5] That implies \(1/.68=1.47\), or roughly 47% more observations for equivalent precision. For the asymmetric case, 76% efficiency implies about 32% more. The exact gain is design- and model-specific, but ad-hoc allocation can squander a scarce one-person bank.

The transferable design properties are:

- Equal frequency for each factor level.
- Orthogonality: factor is not correlated with engine, source, passage type or session phase.
- Connectivity if a common scale is wanted.
- Exact or near-exact left/right position balance.
- Balance across early, middle and late blocks.
- Utility balance: avoid only-obvious comparisons when estimating subtle effects.

**Measured:** in MaxDiff, the standard design criteria additionally include within-set and across-set positional balance; the algorithm searches many candidate plans rather than accepting an arbitrary set (MaxDiff Technical Paper, pp. 8–10).[10]

### MaxDiff / best–worst

**Measured — information per task.** Choosing best and worst among four alternatives supplies five of six implied pairwise relations; among five it supplies seven of ten (MaxDiff Technical Paper, p. 6).[10] This is more efficient than isolated pairs when the goal is scaling several alternatives.

**Measured — task-size evidence.** Three randomized commercial studies used:

- \(n=884\), 17 tasks, 4–7 items/set.
- \(n=1{,}236\), 19 tasks, 3/5/8 items/set.
- \(n=904\), 12 tasks, 3/5/7 items/set.

Predictive results were broadly similar, but larger sets took longer; the authors recommend four or five items per set and more smaller tasks rather than fewer large tasks (pp. 3–7).[7]

**Measured, limited transfer.** A simulation used 300 synthetic respondents, 10/20/30 items, 3/5/7 items per task and 10/20/30 tasks. It recommended at least three exposures per item and approximately 20 tasks for 12 or more items (pp. 4–8).[6] But the individual scores used hierarchical Bayes, which borrows information across respondents. That recommendation does not establish sufficiency for one isolated participant.

**Asserted — pure individual conjoint.** Orme’s sample-size chapter says traditional full-profile individual estimation often seeks roughly \(3(K-k+1)\) observations, while pure individual logit requires few parameters, a highly efficient design and many tasks; standard hierarchical Bayes obtains individual estimates by borrowing from many respondents (PDF pp. 6–8).[9]

### Transfer to this study

**Argued:** use DCE design mechanics, not population sample-size rules. Cross every factor with source, engine and session block; match or record length; and precompute exact side balance. A D-optimal design can use pilot effect estimates, while an orthogonal balanced design is safer before priors exist.

**Argued:** MaxDiff is useful if the objective becomes ranking several complete writing forms. It is a poor replacement for the current causal question because showing four variants usually changes more than one thing and sacrifices the “one varied factor” interpretation.

## 4. Human preferences in model alignment

| Primary study | Sample and agreement actually reported | Handling relevant to `calibrate` |
|---|---|---|
| Stiennon et al. | **Measured:** 64,832 summary comparisons. Labeler–researcher 77%±2; researcher–researcher 73%±4. Labeler–labeler 72%; a three-labeler mode raised researcher agreement from 72% to 77%. The agreement denominator for the headline cell is not printed beside it (main §3.3; Appendix C.1–C.2, pp. 19–20).[11] | 10–20% shared calibration items per labeler; indifference excluded from headline agreement; confidence recorded on nine points; regular anchor comparisons monitored drift. |
| Ouyang et al. | **Measured:** about 40 contractors; 33,207 reward-model prompts, each with 4–9 ranked completions. Training-labeler agreement 72.6%±1.5 and held-out-labeler agreement 77.3%±1.3; per-agreement denominators are not printed (§3.4, p. 8; Tables 9 and 13).[12] | Ties encouraged in the interface, then dropped when converting rankings to pair comparisons (Appendix C.2, pp. 39–42). |
| Bai et al. | **Measured:** core data had 44,000 helpfulness plus 42,000 harmlessness comparisons. Researcher–worker agreement was about 63% on 320 static-test samples (§2.1 and Fig. 10, pp. 10–15).[13] | Weakest preferences/ties were excluded. Roughly 30 select workers; no claim that 63% represented a population preference. |
| AlpacaFarm | **Measured:** 16 of 34 workers passed a 25-item qualification; 10,000 preference instructions and an 805-item evaluation. Simulated-majority agreement was 65%, versus 66% for a held-out human against a three-human majority; the agreement plot does not state its item denominator (§4.3, p. 7).[14] | Human workers preferred longer answers 62% and lists 69%; simulated annotators preferred them 64% and 63%. Order was randomized because model annotators preferred the first answer (Appendix C.1–C.2, pp. 20–21). |
| MT-Bench | **Measured:** 58 experts, at least 20 questions each, about 3,000 votes. GPT-4/human first-turn agreement was 66% on 1,343 all-outcome observations and 85% on 859 non-ties; human/human was 63% on 721 versus 81% on 479 (§4, Tables 5 and 13).[15] | Both orders were judged; an order flip was counted as a tie in the inclusive analysis. Excluding ties creates the much larger number. |
| Chatbot Arena | **Measured:** 243,329 votes, 90,051 users and 50 models. Expert validation relabelled 160 battles; crowd/expert agreement was 72.8–83.1%, expert/expert 79.4% and 89.8% (§3, §6.3, pp. 3–7).[16] | Anonymous randomized sides; separate “tie” and “both are bad” outcomes. Expert fact-checking took 3–5 minutes per item. |

### What alignment practice says

**Measured:** 63–85% agreement is normal in the opened work; approximately 90% is not a routine per-item judge agreement. Agreement rises when comparisons are easy or ties are removed. Therefore the factor-discovery bank and judge-calibration bank should include close cases, but their difficulty distribution must be declared.

**Measured:** these papers principally report raw percent agreement, its standard error/bootstrap uncertainty, mode agreement, denominators and a chance baseline. The opened headline analyses do not use Cohen’s \(\kappa\). Tie handling varies and materially changes the estimand.

**Argued:** for one participant, “inter-annotator agreement” is inapplicable. Report:

- Human test–retest agreement with its numerator, denominator and interval.
- Judge–human agreement over **all** sampled items.
- The complete A/B/tie confusion matrix.
- Judge order-flip rate.
- Agreement conditional on comprehension eligibility.
- A paired interval/comparison when candidate judges see the same items.

Do not count the two model orders as two independent observations.

### Length and position bias

**Measured:** Stiennon restricted reference summaries to 24–48 tokens specifically to reduce the length confound (§3.2, p. 4).[11] AlpacaFarm found its humans chose the longer answer 62% of the time.[14]

**Measured:** in an 80-item swap experiment, model-judge consistency was only 23.8% for Claude-v1, 46.2% for GPT-3.5 and 65.0% for GPT-4; first-position preference accounted for 75%, 50% and 30% of cases respectively (Zheng et al., Table 2, p. 5).[15] On 23 deliberately duplicated-list attacks, failure rates were 91.3%, 91.3% and 8.7%. Merely instructing judges to ignore length and position did not remove them.

**Argued — loci:** [SKILL.md](/Users/ruliny/Git/agent-skills/plugins/terse/skills/calibrate/SKILL.md:49) and [item-bank.md](/Users/ruliny/Git/agent-skills/plugins/terse/skills/calibrate/references/item-bank.md:21). Randomizing human sides once is directionally right but insufficient for a 30–60-item bank: use exact balance, and put each repeated item on the opposite side. Engine rotation must also be balanced *within each factor*; otherwise engine and factor remain confounded. Promotional wording that adds justification is also inherently confounded with length unless length is matched or modelled.

## 5. Psychophysics and survey mechanics

### Order and counterbalancing

**Measured:** the original Bradley–Terry example randomized pair order (p. 333).[2] MaxDiff designs explicitly balance item position both within and across tasks.[10] Alignment studies either randomize sides or evaluate both orders.[14][15][16]

**Argued:** one participant cannot counterbalance order across people, but can counterbalance across items. Allocate every factor equally to left/right and early/late blocks; reverse sides on retest; and separate side bias from preference in the analysis.

### Fatigue

**Measured:** Johnson and Orme reanalysed 21 commercial conjoint studies, each with 50–1,205 respondents, 8–20 tasks and about 100,000 tasks total. Later answers were slightly more reliable through task 20; the average 20-task section took about five minutes (PDF pp. 4–8 and 16–17).[8] This rules out a universal “quality collapses after a few choices” claim, but only for short conjoint tasks.

**Measured:** AlpacaFarm budgeted about one minute per comparison and issued 15-pair work units (Appendix D, pp. 24–25).[14] Chatbot Arena’s expert fact-checking took 3–5 minutes per item.[16] Thus 60 passage judgments plausibly occupy 60–300 minutes depending on verification demands; neither study validates 60 in one sitting.

**Argued:** the skill’s “stop when the person wants” is humane but creates informative missingness if harder/late factors are unfinished. Randomize within balanced blocks, schedule multiple sessions, record latency and block, and carry anchor/repeat items across sessions. There is no defensible universal maximum from the opened evidence.

### Forced choice versus explicit tie

**Measured:** original Thurstone and Bradley–Terry require binary outcomes; modern alignment practice is divided. Stiennon and Ouyang allowed indifference but excluded/dropped it, AlpacaFarm discouraged it through “slightly better,” while Chatbot Arena separates tie from both-bad.[11][12][14][16]

**Argued:** neither is universally better. Forced choice supplies more binary observations but invents random directions under genuine indifference. A tie option sacrifices binary power but is appropriate when “no meaningful difference” is itself a target outcome. For this study, retain it, but distinguish:

1. A preferred.
2. B preferred.
3. Genuinely equal.
4. Cannot judge / both unacceptable.

The present statement that many no-preference answers prove “the factor does not matter” ([SKILL.md](/Users/ruliny/Git/agent-skills/plugins/terse/skills/calibrate/SKILL.md:55)) is too strong: they can also mean poor manipulation, contextual interaction, fatigue or two bad alternatives.

### Asking for explanations

**Measured correction:** the skill does **not** forbid asking the person to explain. It forbids the experimenter explaining the choice back mid-session ([SKILL.md](/Users/ruliny/Git/agent-skills/plugins/terse/skills/calibrate/SKILL.md:57)).

**Argued/supportive:** Orne identifies explicit and implicit experimenter communications as demand characteristics and recommends open-ended inquiry after the experimental procedure so the inquiry does not itself supply cues (pp. 779–781; his compliance pilot used only three or four participants per group).[17] This supports withholding theory-confirming feedback during measurement.

**Measured practice, not causal proof:** Stiennon gave explanatory feedback during paid onboarding, not ordinary production, while allowing production labelers to leave concerns or explanations (Appendix C.1–C.4, pp. 19–21).[11] AlpacaFarm provided an optional explanation box for near-random cases (Appendix D, p. 25).[14]

**Argued recommendation:** lock the choice first, then optionally collect a short rationale; discuss interpretations only after the block/session. Use rationales to phrase rules in the participant’s language, not as independent causal evidence. The opened work does not settle whether contemporaneous explanation changes this particular person’s subsequent preferences.

## 6. Prediction-powered inference and neighbours

### What PPI actually does

**Measured:** for mean human outcome \(Y\) and model prediction \(f(X)\),

\[
\hat\theta_{\mathrm{PPI}}
=
\frac1N\sum_{i=1}^{N}f(\widetilde X_i)
-
\frac1n\sum_{i=1}^{n}\left(f(X_i)-Y_i\right).
\]

The first term supplies volume from model-labelled target examples; the second is the human-labelled, **signed and estimand-specific rectifier**. Its variance is approximately

\[
\frac{\operatorname{Var}(f-Y)}n+
\frac{\operatorname{Var}(f)}N.
\]

These are §1.1–1.3, pp. 2–3 of the original paper.[18]

Therefore:

- “Subtract mean judge-minus-human error” is mathematically correct for the mean.
- Calling overall agreement the correction is wrong.
- Calling agreement “known error” is wrong; it is an estimate with uncertainty.
- PPI estimates an aggregate parameter. It does not correct each individual judge verdict.

### Validity requirements

**Measured:** the original method initially requires independently and identically distributed labelled and unlabelled observations from the same population and a prediction rule independent of the observed data (§1.2, p. 3).[18] Distribution-shift extensions require specific known structure: known covariate-shift weights or a label-shift model (§4.2, pp. 14–16). A fixed finite bank has a separate finite-population treatment with sampled labels (Appendix B, pp. 22–24).

**Argued failures for `calibrate`:**

- Choosing/tuning the judge or its prompt on the same human labels later used to report agreement breaks the independence story and makes the best judge optimistic.
- Human calibration items and the large model-only bank must represent the same target distribution.
- A scalar agreement measured on factor-isolated calibration pairs need not transfer to unconstrained production prose.
- Filtering human-unstable or model-flipping observations changes the target population before estimating the rectifier.
- A screen needs class-conditional false accepts/rejects and an abstention path; overall agreement alone is inadequate.
- PPI cannot soften the comprehension gate.

### When PPI fails to improve precision

**Measured:** the original paper states that PPI is narrower only when prediction residuals explain enough outcome variance and \(N\gg n\). In the binary example, at outcome prevalence .5 the model error must be below 25%; near prevalence .1 or .9 it must be below about 9.5% (Appendix G, pp. 35–36).[18] This is especially relevant to a target transfer rate near 90%: a judge agreeing only 70–85% may make original PPI *less* precise than human labels alone.

**Measured:** PPI++ adds a tuned weight \(\lambda\), interpolating between classical inference (\(\lambda=0\)) and PPI (\(\lambda=1\)), to avoid the original method’s loss of efficiency with poor predictions (§1 and §2.2, pp. 1–4).[19] Its “never worse” result is asymptotic and assumption-dependent, not a 30-item finite-sample guarantee.

### Published model-label extension: ARES

**Measured contradiction — locus:** [prior-art.md](/Users/ruliny/Git/agent-skills/plugins/terse/references/prior-art.md:577). It says ARES asks for “at least 50” labels. The paper says approximately **150 or more** (pp. 2 and 4) and uses **300 human annotations** for its main PPI experiments (Table 1, p. 7).[20]

ARES varied the labelled set from 25 to 400. Below roughly 100–150, it could not meaningfully distinguish its nine pseudo-RAG systems (Table 3, p. 15). Its real-system PPI intervals with 300 human labels averaged 7.4 percentage points wide for context relevance and 6.1 for answer relevance (p. 8).

**Argued transfer:** PPI can target one participant if “gold standard” means that participant’s choices and both banks sample that participant’s intended future-use distribution. It does not require a population of people. But it does require a much larger model-labelled bank. With only 30–60 total items, \(N\gg n\) does not exist and ordinary human-only inference is usually simpler.

### Precision of the stated 90% goal

**Measured calculation:** if 27/30 held-out choices favour the rules, the 95% Wilson interval is approximately \([.744,.965]\). At 54/60 it is \([.799,.953]\). Thirty to sixty items can report an observed rate near 90%; they cannot establish it tightly.

Under the favourable illustration of binary outcomes, huge \(N\), symmetric judge error and 80% judge agreement, the residual-only 95% half-width is approximately:

\[
1.96\sqrt{.2/30}=.160,\qquad
1.96\sqrt{.2/60}=.113.
\]

Even infinite model volume does not remove uncertainty in the human rectifier.

## Transfer check

| Literature | One participant? | Bank of 30–60? |
|---|---|---|
| Thurstone | Yes; originally a repeated single-observer model. | Only for a very small common alternative set; no universal stability guarantee. |
| Bradley–Terry | Yes if the comparison graph is connected. | Limited to few worth parameters and large effects. |
| Population DCE rules | No. Their \(N\) is respondents. | Do not use. |
| Orthogonal/D-efficient design principles | Yes. | Highly valuable because observations are scarce. |
| MaxDiff task format | Yes in principle. | Efficient for ranking several alternatives, but weakens one-factor causal interpretation. |
| HB individual conjoint/MaxDiff | No, not without a respondent population to borrow from. | Pure individual logit would need fewer parameters and more tasks. |
| Alignment collection procedures | Yes: masking, side randomization, anchors, ties and full denominators transfer. | Their population agreement rates do not predict this individual. |
| Survey fatigue counts | Mechanics partly transfer. | Twenty short conjoint tasks do not validate 60 prose judgments. |
| PPI/PPI++ | Yes if the estimand is explicitly this person over a fixed target distribution. | Not useful unless a separate, much larger model-labelled bank exists. |
| ARES’s label-count rule | No direct transfer; it evaluated RAG classifiers/systems. | Its observed failure below 100–150 is evidence against assuming 30–60 will suffice. |

## Recommended redesign

**Argued:**

1. Preserve the comprehension rule as an eligibility gate and report every comprehension failure separately.
2. Declare the target distribution: repository areas, passage types, lengths, engines and production conditions to which “90%” refers.
3. Build one design matrix before data collection. Balance factor × source × engine × passage type × left/right × session block; validate that factor prompts did not systematically change length or other attributes.
4. Treat the first run as a pilot unless its effect assumptions and design were fixed prospectively. Recompute power from the pilot effect and tie rate.
5. Split the work into balanced blocks; use repeats as reliability/position/drift diagnostics, not factor observations.
6. Keep all A/B/equal/unjudgeable outcomes. Report binary preference both unconditionally and, if justified, conditionally—never only the easier subset.
7. Freeze each judge and prompt before evaluation. Run both orders, count an order flip as an inconsistent/tie prediction, and include it in all-item accuracy.
8. Use separate data for judge selection and final agreement estimation. Report confusion matrices and uncertainty, not “known error.”
9. Use PPI++ only if a representative model-only bank is much larger than the human-labelled bank. Otherwise report the human estimate.
10. Run the final blind transfer test on untouched items, with the writer blind to item content. Report numerator, denominator and interval; do not claim 90% from a point estimate alone.

## Sources

1. [Thurstone, “A Law of Comparative Judgment,” *Psychological Review* 34 (1927), pp. 273–286](https://archive.org/download/sim_psychological-review_1927-07_34_4/sim_psychological-review_1927-07_34_4.pdf)
2. [Bradley & Terry, “Rank Analysis of Incomplete Block Designs: I. The Method of Paired Comparisons,” *Biometrika* 39 (1952), pp. 324–345](https://archive.org/download/sim_biometrika_1952-12_39_part-3-4/sim_biometrika_1952-12_39_part-3-4.pdf)
3. [David, *The Method of Paired Comparisons*, 2nd ed.—catalog/loan record](https://archive.org/details/methodofpairedco0000davi)
4. [de Bekker-Grob et al., “Sample Size Requirements for Discrete-Choice Experiments in Healthcare”](https://doi.org/10.1007/s40271-015-0118-z)
5. [Chrzan & Orme, “An Overview and Comparison of Design Strategies for Choice-Based Conjoint Analysis”](https://sawtoothsoftware.com/resources/technical-papers/an-overview-and-comparison-of-design-strategies-for-choice-based-conjoint-analysis)
6. [Orme, “Accuracy of HB Estimation in MaxDiff Experiments”](https://sawtoothsoftware.com/resources/technical-papers/accuracy-of-hb-estimation-in-maxdiff-experiments)
7. [Chrzan & Patterson, “Testing for the Optimal Number of Attributes in MaxDiff Questions”](https://sawtoothsoftware.com/resources/technical-papers/testing-for-the-optimal-number-of-attributes-in-maxdiff-questions)
8. [Johnson & Orme, “How Many Questions Should You Ask in Choice-Based Conjoint Studies?”](https://sawtoothsoftware.com/resources/technical-papers/how-many-questions-should-you-ask-in-choice-based-conjoint-studies)
9. [Orme, “Sample Size Issues for Conjoint Analysis Studies”](https://sawtoothsoftware.com/resources/technical-papers/sample-size-issues-for-conjoint-analysis-studies)
10. [Sawtooth Software, “MaxDiff Technical Paper”](https://sawtoothsoftware.com/resources/technical-papers/maxdiff-technical-paper)
11. [Stiennon et al., “Learning to Summarize from Human Feedback”](https://arxiv.org/abs/2009.01325)
12. [Ouyang et al., “Training Language Models to Follow Instructions with Human Feedback”](https://arxiv.org/abs/2203.02155)
13. [Bai et al., “Training a Helpful and Harmless Assistant with RLHF”](https://arxiv.org/abs/2204.05862)
14. [Dubois et al., “AlpacaFarm”](https://arxiv.org/abs/2305.14387)
15. [Zheng et al., “Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena”](https://arxiv.org/abs/2306.05685)
16. [Li et al., “Chatbot Arena: An Open Platform for Evaluating LLMs by Human Preference”](https://arxiv.org/abs/2403.04132)
17. [Orne, “On the Social Psychology of the Psychological Experiment,” *American Psychologist* 17 (1962), pp. 776–783](https://archive.org/details/sim_american-psychologist_1962-11_17_11)
18. [Angelopoulos et al., “Prediction-Powered Inference”](https://arxiv.org/abs/2301.09633)
19. [Angelopoulos, Duchi & Zrnic, “PPI++”](https://arxiv.org/abs/2311.01453)
20. [Saad-Falcon et al., “ARES”](https://arxiv.org/abs/2311.09476)

## What I could not settle

- No primary source opened provides a universal number of paired comparisons for a “stable scale”; the required number depends on alternatives, expected separation, design and desired precision.
- No opened experiment establishes the forced-choice-versus-tie optimum for this exact one-person prose task.
- No opened study identifies a universal fatigue breakpoint for 40–60-word passage comparisons.
- The sources show that post-choice explanations are operationally compatible with preference collection, but do not isolate whether requiring explanations changes later choices.
- Judge agreement and transfer for this person cannot be measured until an actual balanced bank is run.

## Unopened

- H. A. David, *The Method of Paired Comparisons*, both 1963 and 1988 full texts: located, but both scans were access-restricted and the 1988 loan was unavailable.
- Davidson’s and Rao–Kupper’s classical tie extensions: located through citations, but accessible primary full text was not obtained; no claim above depends on them.
- Wilson & Schooler on reasons and preference, Ericsson & Simon on verbal reports, and Galesic & Bosnjak on questionnaire length: publisher copies returned access denials, so they were not used as evidence.
