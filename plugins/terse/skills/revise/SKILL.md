---
name: revise
description: >-
  Repairs a document against a measurement: the reader profile, the writing rules, the curse of
  knowledge, then the failures an audit recorded. Runs a small bake-off and judges the candidates on
  those failures rather than on taste. Proposes; writes into your tree only on your word.
disable-model-invocation: true
metadata:
  version: "0.1.0"
license: MIT
---

The method is four passes in a fixed order, and the fourth is the one that works. The first three are a
writing standard, and writing standards were measured losing to no standard at all: given a published
one, seven seats of ten proposed nothing and two produced a longer text. What separated the chain that
moved a README from 3/6 to 6/6 was the fourth pass, where named readers failed at named lines. That
chain ran once, on one document, one trial per question, and its result is not distinguishable from
chance — so treat the fourth pass as the mechanism worth keeping, not as a proven gain.

So: no measurement, no fourth pass, no mechanism. Step 1 is not a formality.

## Step 1. The measurement

Ask the user for the run directory from `audit` and read `audit.md` there. You need two headings from it:
**Reader profile** and **What broke**. The contract is in
[ledgers.md](../audit/references/ledgers.md).

If there is no run file, say so plainly in one sentence and offer `/terse:audit` first. If the user
declines, continue — but the fourth pass then runs on your guesses about where readers fail, and you say
that in the report. Three parts of a four-part method is not the thing that was measured.

## Step 2. The brief

Assemble it once, for every writer, from four pieces in this order:

1. **Who reads this** — the profile from the run file, unedited.
2. **The writing rules** — [writing-rules.md](references/writing-rules.md), copied in as written.
3. **The curse of knowledge** — [curse-of-knowledge.md](references/curse-of-knowledge.md), likewise.
4. **Where the readers failed** — the entries under *What broke*, each with its line, its cause and its
   quote, plus the passages that worked and must not be damaged.

Copy the fixed parts; do not paraphrase them. They were measured in the form they are in.

Add the accuracy floor verbatim: every statement about behaviour must be true of the code in this
checkout, and the writer must know the file and line that backs it. The claim ledger is in the run file,
so this costs a lookup, not an investigation.

## Step 3. The bake-off

Announce it before spawning: how many writers, how many judges, which models, roughly what it costs.
Wait for the user's word. Default pool, small on purpose:

| Seats | Job |
|---|---|
| 3 writers | one whole candidate each, same brief, different angle |
| 2 judges | score every candidate against the measured failures; a third only if they split |

Each writer runs the four passes in order and keeps every intermediate draft, because a pass that cannot
be pointed at cannot be blamed. Judges never see which model wrote which candidate. Details, including
the writer brief and the judging sheet, are in [bake-off.md](references/bake-off.md).

If the user refuses the fan-out, write one candidate yourself from the same brief, in the same four
passes, and report that the comparison step was skipped.

## Step 4. The safeguards

These override the writing rules wherever they collide, and the rules say so themselves.

- Never cut a condition, a limit or a warning at a point where a reader decides.
- Repetition at an independently read decision point is not redundancy.
- A dated measurement keeps its date and its numbers, including ones the code has since changed.
- Counts — sentence length, repeated phrases — prompt a review. They are not gates.

Two failures this guards against, both measured. A true sentence moved to line 8 met two readers before
they knew what the tool was, and both remarked on it: position is not repaired by truth. And a stronger
claim beats a truer one when a reader meets both, so a weakened claim has to be the only claim left
standing, not an accurate footnote under a confident headline.

## Step 5. What you return

Into the run directory, never into the audited tree:

- the winning candidate, whole
- the diff against the original
- the repair list: each measured failure, what changed, and where
- the cut ledger — every removed passage of twenty words or more, with its reason
- the invisible-prerequisite inventory from the third pass
- the file and line behind every behavioural claim you changed or added
- word count before and after

Formats for the last three are in [ledgers.md](../audit/references/ledgers.md).

## Step 6. The gate

A rewrite is not finished because it reads better. Re-run `/terse:audit` on the candidate with the same
questions, the same key, the same entry file and the same model. Three outcomes are refusals:

- the score fell
- a control question that passed now fails
- a claim that was confirmed is now refuted — the rewrite introduced a false statement

Report the two scores side by side. Then stop: applying the candidate to the user's files needs their
word, and a diff they have read is what earns it.

## Reference

- The writer brief, the judging sheet, and how the winner absorbs the losers:
  [bake-off.md](references/bake-off.md).
- The rules, fixed: [writing-rules.md](references/writing-rules.md).
- The third pass, fixed: [curse-of-knowledge.md](references/curse-of-knowledge.md).
- Run file and ledger formats: [ledgers.md](../audit/references/ledgers.md).
- Evidence levels and the rule on guarantee words:
  [truth-pass.md](../audit/references/truth-pass.md).
