# Measuring with fresh readers

A fresh reader is the only ruler in this plugin that has been shown to move. Standards produced audits;
readers produced a number that changed from 3/6 to 6/6 when the text was repaired. That was one run on
one README, six questions, one trial each — McNemar two-sided *p* = 0.25, which is not distinguishable
from chance. Everything else here exists to make that number trustworthy, and it is not there yet.

## Before any reader exists

Two things must already be written, and both come from earlier steps:

- **The questions.** One per decision the reader must make, in the reader's words, from the profile.
  Five to eight. The measured run used six.
- **The answer key**, derived from the claim ledger. Written from the code, not from the documentation.

The order is the whole point. A key written after reading the readers' answers is a key written to agree
with them, and the earlier ruler this one replaces failed exactly there: it assumed a correct answer
without ever saying where the answer came from.

At least two questions must be ones the current text already answers correctly. They are the controls.
A rewrite that raises the score while breaking a control has traded one failure for another, and without
controls that trade is invisible.

Plant at least one question the documentation does not answer at all, keyed as unanswerable. A confident
answer to it is a failure of the reader, not of the text, and it is the cheapest way to catch a reader
answering from what it already knew rather than from what it read.

## The reader's rights

One reader per question. A reader that answers two questions has learned the file from the first
question, and is no longer fresh for the second.

| Allowed | Forbidden |
|---|---|
| the `.md` files in the repository | source code, tests, config |
| starting at the entry file | starting anywhere else |
| following links it finds in the text | a table of contents you supply |
| saying it could not find the answer | another reader's output, or yours |

Use a cheap model; the 2026-09-10 run used Haiku and the failures it found were real. Announce the count
and the model to the user and wait for their word before spawning. A measurement the user did not agree
to pay for is not a measurement they asked for.

## The reader's brief

```
You are reading a project's documentation for the first time. You have never seen this project.

Start at <ENTRY FILE>. You may open only .md files in <REPO>. You may not open source code,
tests or configuration, and you may not search the web.

Answer this question: <QUESTION>

Return:
  answer:    your answer, in your own words
  files:     every file you opened, in the order you opened them
  steps:     how many files you opened before you could answer
  departed:  yes if you needed anything outside the .md files, no otherwise
  quote:     the line you based your answer on, with its file and line number
```

Ask nothing else. In particular, **never ask whether the text was clear**. On 2026-09-10 that self-report
ran against the truth: two readers who reported no confusion answered wrong, and the one who called a
section scattered and confusing answered right. If a reader volunteers the judgement, record it as a
hint and keep it out of the score.

The `quote` field is what makes a wrong answer diagnosable. It names the line that misled the reader, and
that line is where the repair goes.

## The no-document arm

The baseline runs every question twice: once through the documentation, once with no files at all, same
model, same brief minus the corpus. **The score this audit reports is the difference.**

Without it a document that teaches cannot be told from a document about something the reader has already
seen. Two benchmarks that ran this arm found the gap large — one scored between .56 and .68
closed-book on tasks built to require documentation, and treats a high closed-book score as contamination. A third of
our questions could plausibly sit there, which is more than the whole effect we have ever measured.

It doubles the reader seats, so it runs at the baseline only. A re-measurement after a rewrite reuses the
same no-document score; the questions have not changed, and neither has what the reader already knew.

## Scoring

Right answers over questions, and then the delta against the no-document arm. Beside it, two numbers that
are not the score but predict it: steps taken, and how many readers departed from the documentation. A
right answer found by reading the source is a documentation failure with a correct answer attached.

Then give every wrong answer a cause — refuted, missing, placement, findability or harmful. The five are defined
in Step 6 of [SKILL.md](../SKILL.md), the evidence rules behind `refuted` are in
[truth-pass.md](truth-pass.md), and the ledger entry in [ledgers.md](ledgers.md) records which one.
`missing` is the one most easily mistaken for `findability`: if the answer is nowhere in the `.md` files,
no path leads to it and no rewrite of the path will help.

**Say when the instrument has no room.** A baseline of every question right cannot register an
improvement; report that and stop rather than producing a number that cannot move. A zero can rise.

## Establishing this instrument's own noise floor

Optional, and worth it once per project. Run the unchanged document through the same questions two or
three times under blinded version labels and count how many answers flip. That flip rate is **this**
instrument's noise floor, and until it exists, "the score fell" in a re-measure is being judged against a
threshold borrowed from somebody else's benchmark. Six questions × two labels × three repeats is 36
cheap calls.

## Re-measuring after a rewrite

Same questions, same key, same entry file, same model. Change any of them and the two scores are not
comparable; a new question set is a new measurement with a new baseline, not a result.

Three ways a rewrite fails the re-measure:

- the score falls by more than the measured noise floor, or by anything at all if no floor was measured
- a control question that passed now fails
- a claim confirmed before is refuted now, which means the rewrite introduced a false statement

## Keeping the number as a regression test

A score sitting in the audited repository turns documentation rot into a failing check: the text drifts,
the number falls, and the fall is the refusal. Storing it there requires the user's word, because it
means writing into their tree. The run file keeps it either way.

## What is measured and what is not

**Measured, at the size of one run:** the four-part chain moved one README from 3/6 to 6/6, took
departures from 1 to 0, and broke neither control. One trial per question; the result does not survive a
significance test and must not be quoted as a rate. Two of the six failures were refuted claims rather
than findability failures.

**Not measured:** which part of the chain produced the gain. The experiment that would isolate it —
three writers given different subsets, eighteen readers — was designed and deliberately not run. Do not
report a single part as the cause.
