---
name: calibrate
description: >-
  Measures which forms of writing a particular person prefers, by blind paired choice with repeats,
  and turns the result into rules a writer can follow and a number a model judge can be corrected by.
  Run once per person; re-run when the result stops predicting.
disable-model-invocation: true
metadata:
  version: "0.1.0"
license: MIT
---

`audit` measures whether a reader gets the right answer. That is comprehension, and it is not the same
thing as whether a person would rather read the text. The two are measured separately in every field
study that reports both, and they sometimes move in opposite directions: revisions that raised
comprehension have been measured lowering readability scores. This skill measures the second thing.

**The rule that keeps this from becoming a taste standard:** a preference never overrides a measured
comprehension failure. It decides a tie, and it chooses the form where comprehension is equal. The
moment it outranks a reader getting the answer wrong, this plugin has rebuilt the thing its own
evidence rejected.

Nothing in this skill has been run yet.

## What it produces

Two artifacts, and they are deliberately separate:

- **The item bank** — the pairs themselves, fixed and version-controlled. It is the instrument. Two
  people measured on different items cannot be compared, and a bank that drifts between runs cannot
  measure drift in the person.
- **The result** — one person's choices, the per-factor counts, their agreement with themselves, and
  the agreement of each model judge with them.

## Step 1. The bank, or the one that exists

If a bank is already in the repository, use it unchanged. Building a fresh one for each run destroys the
only thing that makes two runs comparable.

To build one, follow [item-bank.md](references/item-bank.md). The rules that matter most: within a pair,
one engine writes both sides from two different instructions, so the voice is held constant where the
comparison happens; across the bank, the engine rotates, so no single voice is what is being measured.
Where genuine before-and-after pairs exist — a rewrite somebody already did, for their own reasons — use
those, because nobody staged them.

Build the held-out set at the same time and keep it out of the session. It is what the transfer test in
Step 5 runs on, and an item seen during calibration cannot test transfer.

## Step 2. The session

Present one pair at a time. The side that carries each variant is randomised per item, and you record
the mapping before you ask. Say nothing about which side is the rewrite, which factor is under test, or
what you expect.

- Allow "no preference" and count it. A factor that produces no preference is a factor that does not
  matter, and that is a result.
- Repeat items, scattered and not adjacent. They measure the person against themselves, and without them
  a preference cannot be told from a coin.
- Never explain a choice back to the person mid-session. Explaining teaches them your theory, and from
  that point they are choosing your theory.
- Code-comment items offer three options, one of which is removing the comment. Some items must be ones
  where removing it is right, or the choice is not a choice.

Stop when the person wants to stop. A partial bank yields fewer factors, not a worthless result; say
which factors reached enough observations and which did not.

## Step 3. What can be concluded

The arithmetic is in [scoring-and-transfer.md](references/scoring-and-transfer.md), and it is short
enough to state here: a factor needs **six observations** before a perfect run of choices reaches
two-sided significance, and a self-consistency below about four fifths means the instrument is measuring
noise rather than the person. Report both numbers beside every conclusion.

A factor that reached six observations and went one way becomes a rule, written in the person's own
terms. A factor that split is recorded as split — that is information about the factor, not a failure of
the run.

## Step 4. Calibrating a judge

Give the same items to each model you might use as a judge, one item at a time, in both orders. Record
per model: agreement with the person, and whether reversing the order changes its answer.

A judge that flips on order is not a judge; position bias has been measured at three quarters of first
choices for one model family. The agreement rate that survives becomes that judge's known error, and a
verdict from it carries the error rather than standing alone.

A judge drawn from the same model family as the writer it scores is not independent: models have been
measured recognising their own prose without labels and preferring it. Blind labels are necessary and
they are not sufficient.

## Step 5. The transfer test

This is the point of the whole skill. Write new text under the rules the calibration produced, then put
it against an alternative in a blind pair drawn from the **held-out** set, and measure how often the
person prefers it.

Report that pass rate with the number of items behind it. It is the only honest answer to "does the
calibration work", and it is the number to move. Where the rate is low, the factor responsible is where
the next round of items goes.

Nothing here is fixed by adding more rules. A rule earns its place by separating what the person chose
from what they rejected; one that does not is removed, including one of ours.

## Step 6. What the artifact records

Beyond the numbers: who was measured, on which bank, on what date, how many items they saw, where they
stopped, and every limit the run inherited. The limits are not decoration. One person is not a
population, and the items are only as single-factored as the instructions that produced them.

## Reference

- Building items, the factors, and the authorship rule: [item-bank.md](references/item-bank.md).
- The arithmetic, the thresholds, the transfer target:
  [scoring-and-transfer.md](references/scoring-and-transfer.md).
- Why comprehension and preference are kept apart:
  [prior-art.md](../../references/prior-art.md).
