Codex gpt-6-astra C-A — opened all four requested files, the PPI and PPI++ papers, ARES’s PPI implementation, and BradleyTerry2’s methods; the most valuable change is a powered, source-held-out validation stage separate from rule discovery.

The author’s six-item power figures are correct. **The proposed correction to sixteen and roughly thirty items is not.** The PPI criticism identifies a missing purpose, but subtracting model error is exactly what the cited estimator does.

All **measured** findings below are calculations executed during this review, not observations from a preference study: **human observations collected = 0**. **Argued** identifies deductions and design recommendations; **asserted** identifies chosen operating conventions.

The working files changed during review. I saved [snapshots and hashes](/var/folders/mf/9v804k_57lq30kwtlr7468xr0000gn/T/terse-stat-review-8_g3pqu8/snapshot.json), including the correction notice. Loci below use those snapshots:

- **S:** [SKILL.md](/var/folders/mf/9v804k_57lq30kwtlr7468xr0000gn/T/terse-stat-review-8_g3pqu8/SKILL.md)
- **B:** [item-bank.md](/var/folders/mf/9v804k_57lq30kwtlr7468xr0000gn/T/terse-stat-review-8_g3pqu8/item-bank.md)
- **Q:** [scoring-and-transfer.md](/var/folders/mf/9v804k_57lq30kwtlr7468xr0000gn/T/terse-stat-review-8_g3pqu8/scoring-and-transfer.md)
- **P:** [prior-art.md](/var/folders/mf/9v804k_57lq30kwtlr7468xr0000gn/T/terse-stat-review-8_g3pqu8/prior-art.md)

The [calculation script](/var/folders/mf/9v804k_57lq30kwtlr7468xr0000gn/T/terse-stat-review-8_g3pqu8/calculate.py) and [results](/var/folders/mf/9v804k_57lq30kwtlr7468xr0000gn/T/terse-stat-review-8_g3pqu8/calculations.json) are reproducible with standard-library Python. **24 numerical checks passed**, including independent integer-arithmetic verification of eight sample-size minima. Nothing was written into the checkout.

1. **The sign test can fit; changing its name will not repair dependent items.**  
   **Argued; loci: Q:9–30; B:26–28, 35–47.**

For independently sampled passages, with one binary response per passage, the estimand can be:

> The probability this person prefers variant X on a randomly drawn passage from the specified source and engine mixture.

An exact binomial sign test is appropriate under that sampling model. One participant is sufficient to estimate that person’s preference over passages; it supplies no inference about other people.

The file requires the same engine within a pair and rotation across the bank. **It does not guarantee independent source passages or that engines are crossed with factors.** Sharing a fixed engine alone does not prove stochastic dependence, but confounding engine with factor prevents separating their effects.

| Instrument | Fit to this task |
|---|---|
| Exact binomial/sign test | Best simple analysis when independent source passages supply the observations. Cannot adjust for source reuse, side effects or fatigue. |
| Bradley–Terry | Useful with shared feature coefficients or a connected comparison graph. Giving every unique passage its own “ability” leaves isolated pairs and does not identify a common factor effect. |
| Thurstone Case V | A probit alternative based on normal latent utility differences. It changes distributional assumptions, not the amount of evidence. |
| Mixed-effects logistic model | Appropriate when repeated comparisons are clustered by source. Use factor effects, source-specific variation in the **factor contrast**, engine effects, side and session position. Requires enough independent sources to estimate the variance components. |
| Exact conditional/randomization tests | Useful when their conditioning or randomization scheme matches the design. Conditioning does not make correlated observations independent; randomization tests must respect the actual assignment constraints. |

The primary [BradleyTerry2 methods document, introduction, lines 99–128](https://github.com/cran/BradleyTerry2/blob/a6ce24eeadb1eafe36c336c27567a47e9d8e2e7a/vignettes/BradleyTerry.Rmd#L99-L128), explicitly assumes independent contests for ordinary fitting and describes random effects inducing correlation among comparisons.

A subtle implementation trap: a common source intercept in both alternatives’ utilities cancels:

\[
(\alpha_s+\beta_f)-\alpha_s=\beta_f.
\]

To model variation in which form a source favors, the source must affect the **difference**, for example \(\beta_f+b_{sf}\). “Add source as a random effect” is insufficiently specified. With only one observation per item, a separate item-level variance component also cannot rescue the design.

For an intercept-only model, both links merely describe the same observed preference probability. At \(p=.8\), I calculated:

\[
\operatorname{logit}(.8)=\log(4)=1.386294,\qquad
\Phi^{-1}(.8)=.841621.
\]

Neither transformation creates power.

**Measured: the corrected power arithmetic.** For a two-sided exact test at \(\alpha=.05\), choose the smallest \(c\) satisfying

\[
2\sum_{k=c}^{n}{n\choose k}2^{-n}\le .05.
\]

Then calculate power under preference \(p\) as

\[
\sum_{k\le n-c\ \text{or}\ k\ge c}{n\choose k}p^k(1-p)^{n-k}.
\]

| Independent decisive items | Reject when | Power at \(p=.8\) | Power at \(p=.7\) |
|---:|---|---:|---:|
| 6 | 0 or 6 choose X | .262208 | .118378 |
| 16 | ≤3 or ≥13 | .598135 | .245889 |
| 20 | ≤5 or ≥15 | .804208 | .416414 |
| 30 | ≤9 or ≥21 | .938913 | .588816 |
| 49 | ≤17 or ≥32 | .995089 | .810002 |

Thus:

- The perfect-run probability is correctly \(2/2^6=.03125\).
- The author’s six-item powers check: \(.8^6+.2^6=.262208\), and \(.7^6+.3^6=.118378\).
- The first sample sizes reaching 80% power are **20 at \(p=.8\)** and **49 at \(p=.7\)**.
- Sixteen gives approximately 80% only under a **one-sided** test: \(P_{\!.8}(K\ge12)=.798245\). That changes the stated test and requires a direction chosen before seeing responses.

Exact power is jagged: at \(p=.8\), it falls from .804208 at \(n=20\) to .769296 at \(n=21\), because the rejection threshold changes. Specify the actual count and rejection rule.

There is also multiplicity. Across three independent null factors, promoting any perfect six-item run has false-positive probability

\[
1-(1-.03125)^3=.090851.
\]

Using Bonferroni’s \(.05/3\) per factor, the first sample size with 80% power at \(p=.8\) is **28 per factor**, rejecting at ≤7 or ≥21; calculated power is .818230. For \(p=.7\), it becomes **67 per factor**, power .818523.

**Measured sensitivity analysis: source dependence can invalidate even the perfect-run calculation.** These are assumed correlations, not measured ones.

For clusters of \(m\) items with intracluster correlation \(\rho\),

\[
\operatorname{Var}(\bar Y)=\frac{p(1-p)}n[1+(m-1)\rho],
\qquad
n_{\rm eff}=\frac n{1+(m-1)\rho}.
\]

For six items sharing one source, I also calculated the exact perfect-run probability under a symmetric beta-binomial model. Set \(a=(1/\rho-1)/2\); then

\[
P(K=0\text{ or }6)=2\prod_{j=0}^{5}\frac{a+j}{2a+j}.
\]

| Assumed \(\rho\) | Variance multiplier | Effective \(n\) | Actual null probability of a perfect run |
|---:|---:|---:|---:|
| 0 | 1 | 6 | .031250 |
| .10 | 1.5 | 4 | .090123 |
| .20 | 2 | 3 | .166667 |

A second example: **20 items from five sources, four per source**, with \(\rho=.2\), gives

\[
n_{\rm eff}=20/[1+3(.2)]=12.5.
\]

Convolving five beta-binomial \((4,2,2)\) distributions and applying the nominal independent-item rejection rule gives an actual null rejection probability of **.111348**.

The cheapest repair is more independent source passages, not a more elaborate model fitted to the same few sources.

2. **PPI needs residual calibration, not merely an agreement percentage.**  
   **Argued and measured; loci: P:577–580; Q:58–71.**

The [original PPI paper, §1.2–1.3, p. 3](https://arxiv.org/pdf/2301.09633), and [ARES’s implementation, lines 77–86](https://github.com/stanford-futuredata/ARES/blob/c7c9018/ares/RAG_Automatic_Evaluation/ppi.py#L77-L86), agree:

\[
\hat\mu_{\rm PPI}
=\bar Z_U+\overline{Y-Z}_L.
\]

Here \(Y\) is the human response, \(Z\) the frozen judge’s prediction, \(n\) the human-labeled sample size, and \(N\) the additional model-only sample size. Under independent samples from the same distribution,

\[
V_{\rm PPI}
=\frac{\operatorname{Var}(Z)}N+
 \frac{\operatorname{Var}(Y-Z)}n.
\]

An asymptotic interval is \(\hat\mu_{\rm PPI}\pm1.96\sqrt{\hat V_{\rm PPI}}\).

**The author’s second criticism is partly right:** the prior-art entry omits the variance-reduction purpose and its consequences for sampling. **It is not an opposite-direction correction:** subtracting mean judge-minus-human error is literally the estimator.

Its assumptions matter:

- Human calibration items must represent the population receiving model-only labels.
- The judge must be frozen independently of the labels used to estimate its residuals, or fitted using a justified cross-fitting procedure.
- Dependence requires an appropriate clustered variance calculation.
- Estimating a fixed bank’s mean requires distinguishing that target from performance on future passages.
- Aggregate correction does not make individual model verdicts reliable.

For binary labels, define agreement \(a=P(Y=Z)\), human prevalence \(p=E[Y]\), and signed bias \(\delta=E[Y-Z]\). Since \((Y-Z)^2\) indicates disagreement,

\[
\operatorname{Var}(Y-Z)=1-a-\delta^2.
\]

Consequently,

\[
n_{\rm eff}
=\frac{p(1-p)}
{\operatorname{Var}(Z)/N+(1-a-\delta^2)/n}.
\]

**There is no universal effective-sample-size function of agreement alone.**

Under the additional assumptions of balanced outcomes, symmetric independent classification errors, and \(N\to\infty\), this simplifies to

\[
n_{\rm eff}/n=\frac1{4(1-a)}.
\]

For this particular estimator and model, extra labels outperform human-only estimation only when **agreement exceeds 75%**. With finite \(N\), the threshold is higher.

The variance-optimized alternative is

\[
\hat\mu_\lambda=\bar Y_L+\lambda(\bar Z_U-\bar Z_L),
\]

\[
\lambda^*=
\frac{\operatorname{Cov}(Y,Z)}
{(1+n/N)\operatorname{Var}(Z)}.
\]

Writing \(R=\operatorname{Corr}(Y,Z)\), direct minimization gives

\[
V_{\min}=\frac{\operatorname{Var}(Y)}n
\left[1-\frac{R^2}{1+n/N}\right],
\quad
n_{\rm eff}=\frac n{1-R^2/(1+n/N)}.
\]

This is [PPI++, §6.1–6.2 and Example 6.1, pp. 10–12](https://arxiv.org/pdf/2311.01453). Its improvement is asymptotic when the tuning parameter is estimated.

Under balanced symmetric errors, \(R=2a-1\):

| Agreement | Original PPI: \(n_{\rm eff}/n\), \(N\to\infty\) | Optimized: \(n_{\rm eff}/n\), \(N\to\infty\) |
|---:|---:|---:|
| .50 | \(1/[4(.50)]=.50\) | \(1/[1-0^2]=1\) |
| .75 | 1 | \(1/[1-.5^2]=1.333\) |
| .80 | 1.250 | \(1/[1-.6^2]=1.5625\) |
| .90 | 2.500 | \(1/[1-.8^2]=2.778\) |
| .95 | 5.000 | \(1/[1-.9^2]=5.263\) |

With optimal weighting, labels stop helping when **covariance is zero**, corresponding to 50% agreement only under these balanced assumptions. Consistently reversed predictions can carry information too.

**The 90% transfer target makes the balanced table optimistic.** Suppose \(p=.9\) and the judge flips each true binary label independently with probability .1. Then

\[
a=.9,\quad E[Z]=.1+.8(.9)=.82,
\]
\[
\delta=.08,\quad \operatorname{Var}(Y-Z)=.1-.08^2=.0936.
\]

Human-only variance is \(.9(.1)/n=.09/n\). Original PPI has variance approaching **.0936/n**, slightly worse.

Optimized PPI gives

\[
R^2=\frac{.072^2}{.09(.1476)}=.390244,
\quad
n_{\rm eff}/n\to1/(1-.390244)=1.64.
\]

An always-“pass” judge also has 90% agreement when \(p=.9\), but its constant predictions buy **no information**. This alone disproves agreement as sufficient calibration.

**Human sample sizes for agreement precision.** Choosing a 95% interval with approximate half-width \(h\) is an **asserted planning convention**. The normal approximation is

\[
n\simeq\left\lceil1.959964^2a(1-a)/h^2\right\rceil.
\]

| Expected agreement | Approximate ±10 points | Approximate ±5 points |
|---:|---:|---:|
| .80 | 62 | 246 |
| .90 | 35 | 139 |
| Unknown: worst case .50 | 97 | 385 |

These are planning approximations, not exact guarantees. Exact binomial intervals show the practical limits:

- **40/50 agreement:** 95% interval **[.6628, .8997]**.
- **45/50 agreement:** **[.7819, .9667]**.
- **144/160 agreement:** **[.8427, .9418]**.

ARES’s [README, Requirements, lines 82–86](https://github.com/stanford-futuredata/ARES/blob/c7c9018/README.md#L82-L86), asks for at least 50 examples and ideally several hundred. That is a recommendation, not proof that 50 suffices here.

For a gate distinguishing agreement .80 from .75, my exact one-sided \(\alpha=.05\), 80%-power calculation needs **437 human labels**, accepting at ≥343; actual power .803031.

Finally, **Q:63–64 estimates agreement after selection**. For example, keeping 40 items with 36 agreements gives \(36/40=.90\); if the excluded 60 contain 30 agreements, actual whole-bank agreement is

\[
(36+30)/100=.66.
\]

Report agreement on the random sample, plus order-instability, abstention, confusion counts and any restricted screen’s coverage. Human self-consistency cannot ordinarily be checked on items that were not repeated.

3. **Five repeats support a diagnostic, not the proposed gate.**  
   **Measured and argued; loci: B:58–62; Q:35–42; S:76–79.**

I inverted binomial tails to obtain exact 95% Clopper–Pearson intervals. For \(k\) agreements out of \(r\), the endpoints solve

\[
P_L(K\ge k)=.025,\qquad P_U(K\le k)=.025.
\]

| Repeat agreements | Exact 95% interval | Width |
|---:|---:|---:|
| 4/5 | [.2836, .9949] | .7114 |
| 5/5 | [.4782, 1] | .5218 |

Even a fair binary coin passes the proposed “at least four of five” rule with probability

\[
P(K\ge4)=\frac{\binom54+\binom55}{2^5}
=\frac6{32}=.1875.
\]

To gate against a true consistency of .8, specifying one-sided \(\alpha=.05\) and 80% power:

| Consistency worth detecting | Repeated items needed | Acceptance rule | Calculated power |
|---:|---:|---:|---:|
| .95 | 30 | ≥28 agreements | .812179 |
| .90 | 82 | ≥72 agreements | .805706 |

The cheaper 30-repeat design has only \(P_{\!.9}(K\ge28)=.411351\) power if consistency is .9.

**The “ceiling” claim is also false.** If a person independently chooses X with probability .9 on each presentation:

\[
P(\text{repeat agreement})=.9^2+.1^2=.82,
\]

while an ideal deterministic judge choosing X agrees with them with probability .9.

Likewise, a real .8 preference produces repeat agreement

\[
.8^2+.2^2=.68,
\]

below the proposed .8 floor, while the 20-item sign test detects that preference with .804208 power. Calling everything below .8 “noise” discards a detectable preference.

**Cheaper alternative:** retain five hidden repeats to identify gross contradictions, possible side-following and session problems; publish their counts and wide interval. Do not make them a statistical pass/fail gate. Use independent transfer performance to decide whether the resulting rules work. Distinguish within-session repeatability from stability across sessions.

4. **“No preference” changes the estimand; it cannot remain an accounting footnote.**  
   **Argued and measured; loci: S:55–56, 61–62; Q:46–50; B:53–56.**

Record wins \(W\), losses \(L\), and ties \(T\) separately.

| Treatment | What it estimates | Cost |
|---|---|---|
| Exclude ties from the sign test | \(P(W\mid W\text{ or }L)\) | Valid directional evidence among decisive responses; loses information about how often the factor matters. |
| Three-category model | \(P(W),P(L),P(T)\) | Preserves the question’s meaning; needs more data and assumptions for elaborate factor/source effects. |
| Half-credit ties | \(P(W)+\tfrac12P(T)\) | A utility score, not the probability the person prefers the text. Requires the actual score variance. |
| Count ties as non-passes | \(P(W)\) | Fits the stated strict preference goal; more demanding than “at least as good.” |

For a hypothetical **30 items**, with \(W=16,L=4,T=10\):

\[
\text{decisive preference}=16/20=.80,
\]
\[
\text{strict preference}=16/30=.5333,
\]
\[
\text{half-credit score}=(16+10/2)/30=.70.
\]

Those are different claims.

For the half-credit variable \(H\in\{0,.5,1\}\),

\[
\operatorname{Var}(H)
=\frac{16+.25(10)}{30}-.7^2
=.126667,
\]

rather than the Bernoulli variance \(.7(.3)=.21\). Fractional wins do not turn ties into binary observations.

If 30% of presentations yield ties, the expected presentations needed for 20 decisive observations are

\[
20/(1-.3)=28.57;
\]

49 decisive observations require \(49/.7=70\). This assumes stationary tie and preference probabilities.

The statement “no preference on five of six means the factor does not matter” is unsupported. Its tie-rate interval is **[.3588, .9958]**. Even a precisely estimated tie rate would describe these items and conditions; it would not distinguish indifference from an ineffective manipulation.

Code-comment items are another problem: **three alternatives are not a binary comparison with a tie**. Use a multinomial choice model, or predefine separate binary comparisons. Do not count the same three-way choice as multiple independent votes.

5. **The transfer target needs a declared statistical claim.**  
   **Measured and argued; loci: Q:73–89; S:94–105; B:64–69.**

For a directional test of \(H_0:p\le p_0\) against performance \(p=.9\), I searched for the smallest \(n\) and integer \(c\) satisfying

\[
P_{p_0}(K\ge c)\le .05,\qquad
P_{\!.9}(K\ge c)\ge\text{desired power}.
\]

These calculations assume independent held-out items and count ties as non-passes.

| Distinguish .90 from | Desired power | Held-out items | Reject baseline at | Actual null rejection | Actual power |
|---:|---:|---:|---:|---:|---:|
| .75 | .80 | **45** | ≥39 wins | .044607 | .841493 |
| .75 | .90 | **55** | ≥47 wins | .045399 | .905637 |
| .80 | .80 | **82** | ≥72 wins | .045848 | .805706 |
| .80 | .90 | **112** | ≥97 wins | .046709 | .907795 |

If a two-sided equal-tail test is required, the corresponding 80%-power minima are **54** against .75 and **107** against .80. The one-sided test fits a predeclared “better than baseline” claim.

**Rejecting .80 does not establish .90.** The acceptance threshold of 72/82 is itself only \(72/82=.8780\).

Twenty items are weak evidence even with an observed 90% rate:

\[
18/20=.90,\qquad
95\%\text{ exact interval}=[.6830,.9877].
\]

Under a true rate of .80,

\[
P(K\ge18\mid n=20,p=.8)=.206085.
\]

The file’s “roughly ±20 points near the middle” is reasonable for Wilson intervals: at 10/20, I calculated **[.2993,.7007]**. The exact interval is wider: **[.2720,.7280]**.

For approximately five-point precision near .90, normal planning gives

\[
n=\left\lceil1.959964^2(.9)(.1)/.05^2\right\rceil=139.
\]

Exact intervals suggest budgeting around **160**: 144/160 gives **[.8427,.9418]**, total width .0991. That supports reporting an estimate near .90 with uncertainty; it does not certify “at least .90.”

If “nearest ten percent” literally requires the **entire 95% interval inside [.85,.95]**, that is a stronger claim. My fixed-sample calculation first reaches 80% power at **386** items, requiring **342–357 wins**:

\[
P_{\!.9}(342\le K\le357)=.802955.
\]

This upper bound would reject exceptionally good performance too, so use that interpretation only if literal equivalence is intended.

**Session feasibility is unmeasured.** As an explicit planning assumption, at 30 seconds per pair:

\[
45(30)/60=22.5\text{ minutes},\quad
82(30)/60=41\text{ minutes},\quad
160(30)/60=80\text{ minutes}.
\]

These exclude calibration, repeats and breaks. A short session can distinguish .90 from .75; it cannot both derive several rules and estimate transfer to roughly five-point precision.

The holdout must exclude **source passages and related variants**, not just item IDs. After failures are used to revise rules, that holdout becomes development data; the next confirmatory test needs fresh sources.

6. **Side shuffling and scattered repeats leave important confounding uncontrolled.**  
   **Argued, with calculated illustrations; loci: S:49–65, 83–88; B:26–28, 58–69.**

The [BradleyTerry2 methods document’s order-effect section, lines 382–397](https://github.com/cran/BradleyTerry2/blob/a6ce24eeadb1eafe36c336c27567a47e9d8e2e7a/vignettes/BradleyTerry.Rmd#L382-L397), explicitly adds a signed presentation-position term. A side swap is a useful diagnostic, but an observed flip can also reflect stochastic responding; it is not proof that the text had no effect.

| Needed control | What omission costs |
|---|---|
| Balance variant side within factor and session block | Chance side imbalance can resemble a factor preference. |
| Cross engines with factors | An engine’s particular implementation can be mistaken for the factor’s effect. |
| Interleave factors and balance early/late positions | Fatigue, practice or adaptation can become a factor effect. |
| Balance immediate factor transitions where feasible | Previous-item contrast or priming can become a current-factor effect. |
| Separate reused sources; specify repeat lag and orientation | Memory and recognition contaminate repeatability. |
| Record trial index, timing, breaks and stopping | Cannot diagnose drift or characterize the circumstances to which the result transfers. |
| Prespecify analysis and stopping | Extending a factor until it becomes significant invalidates ordinary fixed-sample significance. |

Independent side flips are not guaranteed to balance a short factor. With six items, the probability one variant appears on the same side at least five times is

\[
2\{\binom65+\binom66\}/2^6=14/64=.21875.
\]

For three factors, the six orders

\[
ABC,\ ACB,\ BAC,\ BCA,\ CAB,\ CBA
\]

put each factor in each position twice and each directed within-block transition twice. I enumerated these counts. This balances first-order structure; it does not remove longer carryover. Randomization tests must use the assignments actually allowed by such constraints.

An illustrative fatigue effect: if preference falls from .9 early to .7 late, placing one factor entirely early and another late creates an apparent difference of

\[
.9-.7=.2.
\]

Balancing both across periods yields \((.9+.7)/2=.8\) for each.

No opened evidence establishes a sufficient washout duration for these passages. A break and unrelated intervening material are reasonable precautions, but repeated text cannot be assumed forgotten.

The smallest defensible design depends on what “supports 90%” means. **Argued; operating targets explicitly asserted.** I would retain S:18–21 unchanged: **a preference never overrides a measured comprehension failure.** Apply that as a separate comprehension gate before preference-based selection; do not average the two scores.

For **three strong factor preferences plus an honestly estimated transfer rate**, the smallest practical fixed plan supported by the arithmetic here is:

- **Discovery:** 28 independent, decisive source comparisons per factor: \(3(28)=84\). This targets \(p=.8\) with familywise error controlled across three factors. Derive the writer rules from this stage.
- **Repeats:** five additional presentations, reported diagnostically.
- **Validation:** freeze rules, writer configuration, alternatives and judge prompts; obtain **160 human responses on fresh held-out sources**. Evaluate every frozen judge on those same items, retaining all response categories and reporting uncertainty.

Total:

\[
84+5+160=\boxed{249\text{ human judgments}}.
\]

At the assumed 30 seconds per judgment, that is \(249/2=124.5\) minutes before breaks, spread across sessions. With a 30% discovery tie rate, expected discovery presentations become \(84/.7=120\), making the total **285**.

PPI may reduce the validation component, but no observed judge performance presently justifies doing so. For example, under the explicitly assumed \(p=.9\), symmetric 95%-accurate judge model, \(R^2=.605482\); **60 human labels plus 1,000 model-only items** give approximately the variance of 139 human labels:

\[
n_{\rm eff}
=\frac{60}{1-.605482/(1+60/1000)}
\approx140.
\]

That is conditional planning arithmetic, not a demonstrated guarantee. A random held-out human sample must establish the residual behavior; agreement measured during rule construction cannot substitute.

If the requested claim instead requires a **95% interval wholly within [.85,.95] with 80% power**, substitute 386 validation items: \(84+5+386=\boxed{475}\) judgments. The smaller design estimates the rate; the larger design can support that stricter acceptance claim.

**what I could not settle:** Actual source correlation, engine interactions, tie frequency, judge residual variance, human consistency, fatigue, washout and session tolerance. There are no observations from this instrument. Therefore no unconditional PPI savings or universally sufficient session length can be justified.

**unopened:** Original Bradley–Terry, Thurstone and Davidson papers; behavioral experiments establishing washout for this task; the empirical position-bias and self-preference papers cited indirectly by the skill; PPI proofs and appendices beyond the methods inspected. I did not verify or reuse those empirical effect sizes.