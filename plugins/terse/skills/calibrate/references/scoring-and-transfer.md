# The arithmetic, and the number to move

Small samples are the whole difficulty here. One person answering thirty questions is a real
measurement of that person and a very weak one of anything else, and the arithmetic below is what keeps
the conclusions inside what was actually observed.

## How many observations a factor needs

A factor is a run of binary choices. If the person chooses the same way every time, the two-sided
probability of that under chance is 2^(1−k) for k choices:

| Observations | Two-sided p if every choice goes one way |
|---|---|
| 3 | 0.250 |
| 4 | 0.125 |
| 5 | 0.062 |
| 6 | **0.031** |
| 8 | 0.008 |

**Six is the floor for detecting a perfect preference, and that is a much smaller claim than it looks.**
The table above answers "how surprising is a clean run under chance". It does not answer "how often will
this design find a preference that is really there", and the second question is the one that matters.
The power of a sign test at six items is **0.26** against a true preference of 0.8 and **0.12** against
0.7: three real preferences in four would be missed. Eighty percent power at 0.8 needs sixteen items per
factor; a preference of 0.7 needs about thirty and is probably out of reach in one sitting.

**This file shipped the smaller claim as though it were the larger one.** The error was found by its own
author after it was committed, and a review of the whole design against the paired-comparison literature
is running; the numbers below stand until that lands, and the design above them may not. Do not build an
item bank on the six-per-factor figure.

This is the same arithmetic that showed this plugin's own headline result — three improvements, no
reversals, six paired questions — sits at p = 0.25.

## The person against themselves

The five repeated items give a self-consistency rate. It is the ceiling on everything else: a person who
answers a repeated item differently half the time has no measurable preference to find, and the run
should say so and stop rather than producing per-factor numbers.

Treat four fifths as the working floor. It is not a measured threshold — nobody has established one for
this task — and it is recorded as a convention, not as a finding.

## What a result may say

- **"Prefers X over Y, six of six, self-consistency four of five."** A rule.
- **"Split, four to two."** Not a rule. Recorded, with the count.
- **"Four observations, all one way."** Not a rule, and not evidence. Recorded as a lead for more items.
- **"No preference on five of six."** The factor does not matter to this person. This is a useful result
  and it should delete a rule, including one of ours.

Never aggregate across factors into a single score. Factors are not commensurable, and a total would
hide exactly the splits that carry the information. The one field study that reports both comprehension
and preference reports them as separate numbers for the same reason.

## Calibrating a judge against the person

Give each candidate judge the same items, one at a time, in both orders.

- **Order sensitivity first.** A model whose answer changes when the sides swap is not measuring the
  text. Position bias has been measured at three quarters of first choices for one model family and
  around half for another; this is not a rare defect.
- **Agreement rate second**, computed only over the items where the model was order-stable and the
  person was self-consistent.
- **Independence third.** A judge from the same model family as the writer is not independent: models
  have been measured recognising their own output without any label — around three quarters accuracy —
  and preferring it once recognised.

The surviving agreement rate is that judge's **known error**, and every later verdict from it carries
that error rather than standing alone. This is the only way a cheap screen can be used without either
trusting it blindly or asking the person every time.

## The transfer test, and the number to move

The calibration exists to change what gets written. The test of that is not whether the rules sound
right; it is how often text written under them is preferred, on items nobody saw while deriving them.

```
write under the rules  →  blind pair from the held-out set  →  pass rate
```

Report the pass rate with its denominator, always. Twenty held-out items give a 95% interval roughly
±20 points around any rate near the middle, which means a target stated to the nearest percent is a
target stated more precisely than it can be measured. Say the rate, say the count, and let the reader
see the width.

Where the rate is low, do not add rules. Find which factor the failures share and put the next round of
items there. A rule earns its place by separating what the person chose from what they rejected, and a
rule that does not separate is removed — including one this plugin shipped.

## What this cannot do

It measures one person. It does not establish what a population prefers, it does not measure
comprehension, and a preference it finds may point the opposite way from an answer a reader gets right.
Where the two conflict, comprehension wins, and the conflict itself is worth recording: it is the most
interesting thing a run of this kind can produce.
