# The arithmetic, and the number to move

This file has been wrong twice and rewritten from two independent reviews. Both recomputed every figure
below; where they disagreed with the earlier text, the earlier text lost. Read the history at the end
before trusting any future edit to it.

## What is actually being estimated

Not a scale over a fixed set of objects. Every pair holds **different text**, and the question is whether
one form of writing tends to win across passages. State the estimand in those terms and nothing wider:

> For passages drawn from this declared source frame, how often does this person choose the
> factor-on variant over its matched factor-off variant?

Without a declared frame and a balanced allocation across source, engine and session position, an exact
p-value describes this bank of items and no other. That is a real result about this person and this bank.
It is not a result about people, and the founder of paired comparison said so about exactly this case:
extending single-observer reasoning to a population judging English composition is, in his words, not so
certain.

## How many decisive answers a factor needs

Two-sided exact sign test, α = 0.05. Both reviews computed this independently and agree to six decimals.

| Decisive items | Reject when | Actual α | Power at 0.8 | Power at 0.7 |
|---|---|---|---|---|
| 6 | 0 or 6 | 0.031 | **0.262** | 0.118 |
| 16 | ≤3 or ≥13 | 0.021 | 0.598 | 0.246 |
| **20** | ≤5 or ≥15 | 0.041 | **0.804** | 0.416 |
| 30 | ≤9 or ≥21 | 0.043 | 0.939 | 0.589 |
| **49** | ≤17 or ≥32 | 0.044 | 0.995 | **0.810** |

Power is jagged: at 0.8 it falls from 0.804 at twenty items to 0.769 at twenty-one, because the rejection
count moves. **Declare the exact item count and the exact rejection rule before the session**, not a
round number.

**Multiplicity.** Three factors tested at α = 0.05 give a family-wise false-positive rate of 0.143. Under
a Bonferroni correction the requirement rises to **28 decisive items per factor** at a true preference of
0.8, and 67 at 0.7. Twenty-eight is the number this plugin uses.

**Independence is the assumption that breaks first.** Items sharing a source passage are correlated, and
the cost is not small: six items on one source with an intracluster correlation of 0.2 have an actual
null probability of a clean run of **0.167**, not 0.031 — five times the nominal rate. Twenty items over
five sources, four each, at the same correlation give an effective n of 12.5 and a real error rate of
0.111 against a nominal 0.05. **The repair is more independent source passages, not a cleverer model.**
One item per source is the target.

## The four responses, and what each does to the arithmetic

Record four outcomes, not three: **A preferred**, **B preferred**, **genuinely equal**, and **cannot
judge or both unacceptable**. The fourth is not a tie; it is a failed item.

The primary analysis is the sign test over decisive answers, which estimates P(A | A or B). Report the
tie rate separately and never fold it in:

| Treatment | What it estimates | What it costs |
|---|---|---|
| Exclude ties (used here) | P(win given a decision) | loses how often the factor matters at all |
| Three-category model | P(win), P(loss), P(tie) | keeps the meaning, needs more data |
| Half credit for ties | a utility score | not the probability the person prefers anything |
| Ties count as losses | P(strict win) | a stricter claim than "at least as good" |

The same run can read 16/20 = 0.80 decisive, 16/30 = 0.53 strict, and 0.70 half-credit. Three different
claims from one set of answers; say which one is being made.

Ties cost presentations. At a 30% tie rate, twenty-eight decisive answers need **forty presentations**,
and the session must be planned on presentations, not on decisions.

A high tie rate does not mean the factor is unimportant. It can equally mean the manipulation was weak,
the two texts were both bad, or the person was tired. "No preference on five of six" has a tie-rate
interval of [0.36, 1.00] and concludes nothing.

**Three-way items are not pairs with a tie.** The code-comment items offer keep, rewrite, or delete.
Analyse them as predeclared separate binary contrasts or as a multinomial choice; never count one
three-way answer as several independent votes.

## The person against themselves

Five repeated items were previously proposed as a gate. They cannot be one.

- 4 of 5 agreement has an exact 95% interval of **[0.28, 0.99]**.
- A fair coin passes "at least four of five" **19%** of the time.
- Repeat agreement is **not a ceiling** on anything. A person who picks X with probability 0.9 agrees
  with themselves at 0.9² + 0.1² = **0.82**, while a perfect deterministic judge agrees with them at 0.9.
- A real preference of 0.8 produces repeat agreement of 0.68 — below the old floor — while twenty items
  detect that same preference with 0.80 power. The gate would have thrown away what the test can find.

Gating on test–retest at all would need **thirty repeats** to detect a consistency of 0.95, or
**eighty-two** for 0.90. That is not worth the session time.

**So: keep five repeats as a diagnostic.** They catch gross contradiction, side-following and session
trouble. Publish the count and the interval, call it a diagnostic, and let transfer decide whether the
rules work. Put each repeat on the **opposite side** from its first appearance, and separate
within-session repeatability from stability across sessions.

## Calibrating a judge against the person

**Agreement alone is not calibration, and this is provable.** A judge that answers "A" every time agrees
90% of the time with a person whose true rate is 0.9, and carries no information whatever.

**Never compute agreement on a filtered subset.** The measured cost of doing so: one published panel
reports judge–human agreement of **66% over 1,343 answers including ties, and 85% over the 859 without
them**. Same judge, same people; the filter is worth nineteen points. An earlier version of this file
proposed exactly that filter, restricted to order-stable and self-consistent items, and called the result
"known error". Report agreement over the **whole preregistered sample**, with every tie and every order
flip still in it.

What to report, all of it:

- judge–human agreement over all sampled items, with numerator, denominator and interval;
- the full A / B / tie / unjudgeable confusion matrix;
- the judge's order-flip rate, from running both orders — and the two orders are **one** observation,
  never two;
- agreement conditional on comprehension eligibility;
- a paired comparison when several judges see the same items.

**What agreement is normal.** In the published alignment work: labeler-to-researcher 77%, researcher to
researcher 73%, worker to researcher 63%, GPT-4 to human 66% with ties and 85% without, human to human
63% with ties and 81% without, crowd to expert 73–83%. **Anything near 90% per item is not the norm**,
and a judge reporting it is more likely filtered than good.

**Prediction-powered inference, stated correctly.** Its estimator is the model's mean over the unlabelled
set plus the mean of (human − model) over the labelled set; the human labels supply a signed rectifier,
not an agreement percentage. It tightens an aggregate estimate; it never makes a per-item verdict
trustworthy. Under balanced assumptions the original form only beats human-only estimation above **75%**
agreement, and there is no effective-sample-size formula that depends on agreement alone. It needs a
frozen judge, human items drawn at random from the same population as the model-only items, and a
clustered variance where items share sources. We have none of that yet, so **this plugin does not claim
the PPI architecture** — it is a later option, not the plan.

## The transfer test

The calibration exists to change what gets written; the test is how often text written under the rules is
preferred on sources nobody saw while deriving them.

| Distinguish 0.90 from | Power | Held-out items | Reject at |
|---|---|---|---|
| 0.75 | 0.80 | **45** | ≥39 |
| 0.75 | 0.90 | 55 | ≥47 |
| 0.80 | 0.80 | **82** | ≥72 |
| 0.80 | 0.90 | 112 | ≥97 |

One-sided, predeclared direction, ties counted as non-passes. **Rejecting 0.80 does not establish 0.90**:
the acceptance threshold of 72 out of 82 is itself 0.88. For an estimate good to about five points near
0.90, budget **160 items** — 144/160 gives [0.843, 0.942]. If "90%" is meant literally, as a 95% interval
wholly inside [0.85, 0.95], that needs **386**.

Twenty items are not evidence: 18/20 = 0.90 has an interval of [0.68, 0.99], and a true rate of 0.80
produces 18-or-better a fifth of the time.

**The held-out set excludes source passages and their relatives, not just item identifiers.** And once
failures have been used to revise a rule, that set is development data; the next confirmatory test needs
fresh sources.

**One caution about the target itself.** Ninety percent preference requires the alternative to be clearly
worse. Where both texts are decent, published human-to-human agreement on close pairs runs at 63%, and no
amount of calibration will push a genuine near-tie to 90%. If the measured rate settles near 60%, that
may be the ceiling of the comparison rather than a failure of the rules.

## The comprehension gate, stated precisely

A comparison enters preference analysis **only after both alternatives meet the predeclared comprehension
requirement**. It is lexicographic: comprehension first, preference second, and no model and no
correction may average a comprehension failure away.

## What this file got wrong, in order

1. It said six observations per factor was the floor for a conclusion. That is the number at which a
   perfect run stops looking like chance, which is not the same as finding a preference that exists.
2. The correction to that quoted sixteen — a **one-sided** power figure placed beside a two-sided
   decision rule in the same file — and fixed only the headline, leaving "six" standing in three other
   places.
3. It proposed agreement computed on a filtered subset and called it known error. A published panel
   measures that filter as worth nineteen points.
4. It called repeat agreement a ceiling. It is not.
5. It said a high tie rate shows the factor does not matter. It does not.

Each was caught by somebody other than the author of the sentence.
