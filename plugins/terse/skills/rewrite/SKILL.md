---
name: rewrite
description: >-
  Writes the text, in a loop rather than a pass: blocks drafted, criticised by lenses that do not
  overlap, rewritten, and checked again until a round finds nothing new. Starts from a skeleton `rethink`
  agreed, or from the failures an `audit` measured. Proposes; writes into your tree only on your word.
disable-model-invocation: true
metadata:
  version: "0.1.0"
license: MIT
---

Two ways in, and they differ only in what tells you where the text is wrong:

| You have | Start at | What drives the writing |
|---|---|---|
| a skeleton `rethink` agreed | step 2 | the skeleton's purpose, exclusions and budget per section |
| an `audit` run file | step 1 | the named failures, each at its line, with its cause |
| neither | neither — run one first | — |

**The loop is the method, not a polish pass.** One pass through a skeleton produces a first draft, and a
first draft is what this whole method exists because of. The shape of the loop, the routing of findings
back to the stages above, and the stopping rule are in [loop.md](references/loop.md).

## Step 1. The measurement, where there is one

Ask the user for the run directory from `audit` and read `audit.md` there. You need two headings:
**Reader profile** and **What broke**. The contract is in [ledgers.md](../audit/references/ledgers.md).

If there is no run file and no skeleton, say so in one sentence and offer `/terse:audit` or
`/terse:rethink` first. If the user declines both, continue — and say in the report that the writing ran
on your guesses about where readers fail. Three parts of a four-part method is not the thing that was
measured.

The first three of the four passes below are a writing standard, and writing standards were measured
losing to no standard at all: given a published one, seven seats of ten proposed nothing and two produced
a longer text. What moved a README from 3/6 to 6/6 was the fourth, where named readers failed at named
lines. That chain ran once, on one document, one trial per question, and its result is not
distinguishable from chance — so treat the fourth pass as the mechanism worth keeping, not as a proven
gain.

## Step 2. The brief

Assemble it once, for every writer, in this order:

1. **The skeleton**, if there is one — its purpose, exclusions and budget for the section being written,
   unedited.
2. **Who reads this** — the profile from the run file, unedited.
3. **The writing rules** — [writing-rules.md](references/writing-rules.md), copied in as written.
4. **The curse of knowledge** — [curse-of-knowledge.md](references/curse-of-knowledge.md), likewise.
5. **Where the readers failed** — the entries under *What broke*, each with its line, its cause and its
   quote, plus the passages that worked and must not be damaged.

Copy the fixed parts; do not paraphrase them. They were measured in the form they are in.

Add the accuracy floor verbatim: **every statement about behaviour must be true of the code in this
checkout, and the writer must record which level of evidence it actually reached** — the line resolves,
the code says this, or the behaviour was made to happen. The three levels are defined in
[truth-pass.md](../audit/references/truth-pass.md#three-levels-of-evidence), and the reason to name the
level rather than the line is written there: **citing a line is the weakest of the three and the one
that feels like proof.**

This is a gate, not a preference, and level 1 does not clear it for anything a reader will act on. One
false claim has shipped in this plugin's own history — a draft said a directory was never pruned when the
code prunes it by age and by count — and a fourteen-agent exercise inherited it into two of ten proposals
before an adversarial reader caught it. A line number was available for that claim the whole time. What
was missing was a reader of the code who would have said the same thing.

## Step 3. The writing, in rounds

Announce it before spawning: how many writers, how many critics, which models, roughly what it costs.
Wait for the user's word. Default pool, small on purpose:

| Seats | Job |
|---|---|
| 3 writers | one whole candidate each, same brief, different stance |
| 3 critics | one against the code, one against the mechanical rules, one hunting water |

Writers take a stance rather than an instruction to write well: plain, dense, concrete. Three drafts of
one voice are one draft.

Critics do not overlap. A single critic asked twice returns its own first answer twice; three lenses
return three answers. Judges never see which model wrote which candidate.

Then the loop — inner per block, outer over the whole document, findings routed by which stage owns them.
Stop when two consecutive rounds find nothing new, and report the round counts. A count that stops
falling means the answer is upstream, in `rethink`. Details in [loop.md](references/loop.md); the writer
brief and the judging sheet are in [bake-off.md](references/bake-off.md).

If the user refuses the fan-out, write one candidate yourself from the same brief and report that the
comparison step was skipped.

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
- the invisible-prerequisite inventory
- the file and line behind every behavioural claim you changed or added
- word count before and after
- the findings per round, and which stage each belonged to

Formats for the middle three are in [ledgers.md](../audit/references/ledgers.md).

## Step 6. The gate

A rewrite is not finished because it reads better. Re-run `/terse:audit` on the candidate with the same
questions, the same key, the same entry file and the same model. Three outcomes are refusals:

- the score fell
- a control question that passed now fails
- a claim that was confirmed is now refuted — the rewrite introduced a false statement

Report the two scores side by side. Then stop: applying the candidate to the user's files needs their
word, and a diff they have read is what earns it.

## Reference

- The loop, the routing, and when to stop: [loop.md](references/loop.md).
- The three decisions before any sentence: [stages.md](../rethink/references/stages.md).
- The writer brief, the judging sheet, and how the winner absorbs the losers:
  [bake-off.md](references/bake-off.md).
- The rules, fixed: [writing-rules.md](references/writing-rules.md).
- The third pass, fixed: [curse-of-knowledge.md](references/curse-of-knowledge.md).
- Run file and ledger formats: [ledgers.md](../audit/references/ledgers.md).
- Evidence levels and the rule on guarantee words: [truth-pass.md](../audit/references/truth-pass.md).
