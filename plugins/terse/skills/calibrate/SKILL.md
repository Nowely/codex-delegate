---
name: calibrate
description: >-
  Measures which forms of writing one person prefers, by blind paired choice on a balanced item bank,
  and turns the result into rules a writer can follow and a judge score that is honest about its own
  error. Run across several sessions; re-run when it stops predicting.
disable-model-invocation: true
metadata:
  version: "0.1.0"
license: MIT
---

`audit` measures whether a reader gets the right answer. That is comprehension, and it is not the same
thing as whether a person would rather read the text. Every field study that reports both reports them
apart, and they have been measured moving in opposite directions. This skill measures the second thing.

**The gate that keeps this from becoming a taste standard is lexicographic.** A comparison enters
preference analysis **only after both alternatives meet the predeclared comprehension requirement**.
Comprehension first, preference second; no model and no correction may average a comprehension failure
away.

Its arithmetic has been wrong twice and was rebuilt from two independent reviews — read
[scoring-and-transfer.md](references/scoring-and-transfer.md) before changing any number in it.

**It has now been run once, and the result is against it.** On 2026-09-11 one person gave 42 answers on
a 139-item bank. Of the three factors, one separated — the literal phrase over the figure of speech, ten
of twelve decisive answers, no ties — one was undetermined at ten, and one was unjudgeable: eight of
fourteen answers on answer-first were a tie or a refusal to judge.

Then the same person was shown 2233 words the author had written, and asked whether he would ship them
unchanged. He stopped at the third section and returned nine objections. **None of the nine was about
wording.** Every one was about what the document contained, where it sat, or how much of it there was.

Read that as the limit of this skill rather than as its failure. It measures which of two phrasings a
person prefers, and it does that honestly. What it cannot see is whether the document says the right
things in the right order, which is what decided the question this measurement existed to serve. Before
spending hours here, spend one evening on
[stages.md](../rethink/references/stages.md) and find out which axis your reader is
actually judging on.

## What it costs, before anything else

| Stage | Human answers |
|---|---|
| Discovery: 28 decisive answers × 3 factors | 84 |
| Repeats, as a diagnostic | 5 |
| Validation on fresh held-out sources | 160 |
| **Total decisive** | **249** |

At a 30% tie rate the discovery stage needs about 120 presentations, so the real figure is nearer
**285 presentations**. Published practice budgets about a minute per comparison and hands out work in
units of fifteen: this is roughly **five hours across many sessions**, not an afternoon. Say that number
out loud before the first item, and do not start a session that cannot be resumed.

Smaller honest variants exist. Forty-five held-out items alone distinguish a 90% pass rate from 75% and
cost about forty-five minutes; that measures the goal without producing a single rule. Anything under
twenty-eight decisive answers per factor produces leads, and must be labelled as leads.

## Step 1. The bank

If a bank exists in the repository, use it unchanged: a bank that drifts between runs cannot measure
drift in the person. To build one, follow [item-bank.md](references/item-bank.md), which carries the
balance requirements — they are cheap when the bank is generated and impossible to add later.

Build the held-out set at the same time. It holds out **source passages and their relatives**, not item
identifiers.

## Step 2. The session

A session runs through a local page, not through this conversation. Two hundred and eighty-five
presentations cannot go through a chat, and the mechanics below need a clock.

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/calibrate/scripts/session.mjs" \
  --bank <bank.json> --out <session.json> --participant <name> --seed <n>
```

It serves one page on `127.0.0.1`, opens it, and writes the session file after every answer. Run the
same command again to resume; it refuses a different seed against an existing file, because a new order
would make the two halves incomparable. `fixtures/demo-bank.json` exists to check that the tool runs
before anyone spends an hour on it.

**The side mapping lives outside the browser.** The page receives left text, right text and an item id;
the answer comes back as left, right, tie or unjudgeable. Nobody reading the page — including through its
developer tools — can see which side carries which variant.

**Where the two sides differ is highlighted, and this changes the question.** Without it the reader hunts
for a changed phrase through forty identical words and calls the pair equal because they never found it:
in the first sitting, both metaphor items came back as ties, both with a note saying the difference was
invisible. The marking is symmetric — it says where, never which — so it costs no blinding. What it does
cost is the "did you notice" part of the measurement. The question is now *given that this is what
changed, which passage would you rather read*, which is the question a writing rule needs answered, and
it is not the same as asking whether the change is noticeable at all. Report the tie rate as belonging to
the highlighted procedure. Where more than half the wording moved, nothing is highlighted and the page
says so instead; a wall of colour points at nothing.

**Two clocks per answer.** Time to the first choice is the decision. Time to submit includes writing a
note, and in the first sitting that was the difference between 24 seconds and 286.

Four responses, not three: **A**, **B**, **genuinely equal**, and **cannot judge or both unacceptable**.
The fourth is a failed item, not a tie, and it is counted separately.

Record per presentation: item, position in the session, which side carried which variant, the answer,
the time taken, and whether a break preceded it. Save after every answer, because a five-hour measurement
that cannot resume is a five-hour measurement that will not finish.

Three rules about what is said:

- **Never explain a choice back to the person mid-session.** Experimenter feedback is a demand
  characteristic; open-ended inquiry belongs after the procedure, where it cannot supply cues.
- The person **may** explain a choice if they want to, and that text is recorded beside the answer. What
  is forbidden is the coordinator's theory, not the participant's.
- A person may revise an earlier answer. Record the revision **separately** rather than overwriting: a
  first-reading response and a reconsidered one are different evidence, and which mode produced a finding
  is part of the finding.

Stopping early is allowed and creates a real problem: if the late blocks are the unfinished ones, the
missingness is informative. This is why factors are interleaved and balanced across early, middle and
late blocks rather than run one after another.

## Step 3. What can be concluded

The primary analysis is an exact two-sided sign test over **decisive** answers per factor, with the item
count and rejection rule declared before the session. Twenty-eight decisive answers per factor, which
carries 0.82 power against a true preference of 0.8 with the family-wise correction for three factors.

Report beside every conclusion: the tie rate, the unjudgeable rate, and the repeat diagnostic with its
interval. Never aggregate factors into one score — they are not commensurable, and a total hides the
splits that carry the information.

A factor that splits is recorded as split. A high tie rate is **not** evidence that the factor does not
matter; it can equally mean a weak manipulation, two poor alternatives, or fatigue.

## Step 4. Calibrating a judge

Give each candidate judge the same items, both orders. The two orders are **one** observation, not two.

**Compute agreement over the whole preregistered sample**, with every tie and every order flip still in
it. Filtering to the items where the judge was order-stable and the person was self-consistent inflates
the number: one published panel measures the same judge at 66% with ties included and 85% with them
removed. Report the full confusion matrix, the order-flip rate, and agreement conditional on
comprehension eligibility.

Agreement alone is not calibration. A judge that always answers "A" agrees 90% of the time with a person
whose rate is 0.9 and carries nothing. And in the published work, 63–85% is the normal range for
judge-to-human and even human-to-human agreement; a per-item figure near 90% is more likely filtered
than good.

A judge from the writer's own model family is not independent — models recognise their own prose without
labels and prefer it. Blind labels are necessary and insufficient.

## Step 5. The transfer test

Write new text under the derived rules, put it against an alternative in a blind pair drawn from the
**held-out** sources, and measure how often the person prefers it. Declare the direction and the
threshold first; ties count as non-passes.

Forty-five items distinguish 0.90 from 0.75; eighty-two distinguish it from 0.80; about 160 estimate the
rate to within five points. Rejecting 0.80 does not establish 0.90.

One caution about the target. A 90% preference requires the alternative to be clearly worse. Where both
texts are decent, human-to-human agreement on close pairs runs near 63%, and no calibration pushes a
genuine near-tie to 90%. A rate settling near 60% may be the ceiling of the comparison rather than a
failure of the rules.

Where the rate is low, do not add rules. Find the factor the failures share and put the next items
there. A rule earns its place by separating what the person chose from what they rejected; one that does
not is deleted, including one this plugin shipped.

## Step 6. What the artifact records

The bank it was run on, who was measured, the dates and session boundaries, the seed that generated the
order, every answer with its timing and position, where the person stopped, and the limits the run
inherited.

The estimand travels with it: **this person, on English passages from this declared source frame.** Not
people, not other languages, and not text from anywhere else.

## Reference

- Items, balance, and the length confound: [item-bank.md](references/item-bank.md).
- The arithmetic, the judge rules, and what this file got wrong before:
  [scoring-and-transfer.md](references/scoring-and-transfer.md).
- Why comprehension and preference are kept apart:
  [prior-art.md](../../references/prior-art.md).
