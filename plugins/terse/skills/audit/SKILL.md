---
name: audit
description: >-
  Measures a document against two rulers: whether fresh readers get the right answer, and whether every
  claim about behaviour is true of the code. Returns a reader profile, a claim ledger, reader scores and
  the list of what broke. It never proposes wording; `revise` does that.
disable-model-invocation: true
metadata:
  version: "0.1.0"
license: MIT
---

An audit here is a measurement, not an opinion. You run six steps in order, and the order carries the
method: the profile decides which questions are worth asking, the code decides what the right answers
are, and both exist before the first reader is spawned. A reader sent out before the answer key is
written measures the text against your memory of it, and your memory has already read the code.

Say what you found. Do not say what to write instead — the moment this skill starts proposing
sentences, it becomes the thing that was measured and lost: an audit that rewrites a little, badly.

## Step 1. Scope and the run directory

Settle three things with the user in one exchange, not six:

- Which files are the documentation. Default to every tracked `.md`.
- Which repository backs them, if any. Text with no code behind it still gets audited; the truth pass
  runs in its weaker form, described in [truth-pass.md](references/truth-pass.md).
- Where a reader arrives. Usually `README.md`. This is the entry file for every reader.

Then make the run directory:

```bash
RUN="${CLAUDE_PLUGIN_DATA:-${TMPDIR:-/tmp}/terse}/runs/$(date +%Y%m%d-%H%M%S)" && mkdir -p "$RUN" && echo "$RUN"
```

`CLAUDE_PLUGIN_DATA` is empty when this skill runs from a source checkout rather than an installed
plugin, which is why the fallback is there. Name the absolute path in your report and in the run file;
`revise` is given that path by the user and cannot guess it.

Write nothing into the audited repository. Not a report, not a note, not a fix.

## Step 2. The reader profile

Build it from the repository and from the user's own words, following
[reader-profile.md](references/reader-profile.md). Show it and ask for corrections before Step 3.

A wrong profile is not a small error. It chooses the questions, so the whole measurement ends up
answering a question nobody arrives with, and every number after it is precise about the wrong thing.

## Step 3. The truth pass

Every sentence that states what the software does becomes one ledger entry: the claim, the doc line,
the code that backs it, an evidence level and a verdict. Follow
[truth-pass.md](references/truth-pass.md) for the levels, the rule on guarantee words, and the three
verdicts. Use the entry format in [ledgers.md](references/ledgers.md).

Two habits decide whether this step is worth running:

- Work to refute, not to confirm. When in doubt, the verdict is **unconfirmed**, and unconfirmed is the
  dangerous one: it survives because nobody proved it false. Both false claims found on 2026-09-10
  lived there.
- A citation that resolves proves only that a line exists. Reading the code proves what it says.
  Running it proves what it does. Do not report the first as the third.

## Step 4. The questions and the answer key

One question per decision the reader must make, taken from the profile's *what brings them here*. Five
to eight; the measured run used six. Phrase each in the reader's words, not the project's.

Write the correct answer to each from the ledger, and write it now. The ledger already holds the code
and the line, so the key costs nothing extra here and is impossible to reconstruct honestly later.

At least two of the questions must be ones the current text answers correctly. These are the controls.
Without them a later rewrite can raise the score by breaking something nobody asked about.

Plant at least one question the documentation genuinely does not answer, and record it as unanswerable in
the key. A confident answer to it is a failure, and it is the only thing that separates a reader who read
from a reader who knew. Benchmarks that do this plant about one in ten.

## Step 5. The readers

Announce the plan before spawning anything: how many readers, which model, roughly what it costs. Wait
for the user's word. Fan-outs that surprise the user are not measurements, they are bills.

One fresh reader per question, per [measure.md](references/measure.md). Each one starts at the entry
file, may open only `.md` files, may not read source, and may not see another reader's work. It returns
its answer, the files it opened, how many steps from the entry file it took, and whether it left the
documentation to find out.

**The baseline measurement runs a second arm with no documentation at all**: the same questions, the same
model, no files. Its score is what a reader already knew, and the number this audit reports is the
difference between the two. A raw score without that arm cannot tell a document that teaches from a
document that is merely about something the reader has seen before; the two published benchmarks that ran
this arm found the effect large enough to swallow a result our size. It doubles the reader seats, so it
runs once, at the baseline. A re-measurement after a rewrite reuses the same no-document score and does
not pay again.

Never ask a reader whether the text was clear. On 2026-09-10 the self-report ran against the truth: two
readers who reported no confusion answered wrong, and the one who called the section scattered and
confusing answered right. If a reader volunteers the judgement, keep it as a hint and keep it out of the
score.

## Step 6. The score and what broke

The score is right answers over questions. Report steps taken and departures from the documentation
beside it; a right answer found in the source code is a documentation failure.

Give every wrong answer a cause, because the cause decides what a rewrite must do:

| Cause | What happened | What a rewrite must do |
|---|---|---|
| refuted | the text states what the code does not do | correct the claim at its source |
| missing | the documentation does not answer the question anywhere | write the answer, and say where it goes |
| placement | the sentence is true and sits where it misleads | put it at the decision — by moving it, or by repeating it there |
| findability | true, in the right place, not found | change the path to it |

Keep the causes apart. Two of six failures on 2026-09-10 were refuted claims, and a rewrite aimed at
findability would have carried both forward in cleaner prose. A true sentence under the wrong heading is
not fixed by making it truer: readers turned "you need not create this file" into a requirement because
it sat under Prerequisites.

**Missing is the largest class, not the rarest.** In the one study that counted — 805,939 candidates
mined, 878 classified by hand — the answer being absent accounted for 268 of 485 documentation defects,
against 190 stale and 72 wrong. A question the documentation never answers is not a findability failure,
and sending a rewrite to improve the path to an answer that does not exist wastes the run.

**Placement is repaired by repetition as often as by relocation.** Written procedure in the field where
a misreading kills settles it this way: state the fact early, and require it again at the point of use.
A local warning belongs immediately before its action; a global one is stated once and repeated locally.
Do not move a fact away from where it is currently read correctly in order to put it where it is also
needed — put it in both places.

Report the score with its own limits beside it. If the baseline is a perfect score or a zero, say so and
stop: an instrument with no room left cannot register a repair, and a later "the score did not fall" will
mean nothing.

Write the run file to `$RUN/audit.md` using the section contract in
[ledgers.md](references/ledgers.md), then report to the user: the score, the failures with their
causes, the refuted claims, and the absolute path. Offer `revise` as the next step; do not run it.

## Reference

- Building the profile, with a worked example: [reader-profile.md](references/reader-profile.md).
- Evidence levels, guarantee words, verdicts: [truth-pass.md](references/truth-pass.md).
- The reader protocol and re-measurement: [measure.md](references/measure.md).
- Entry formats and the run file contract: [ledgers.md](references/ledgers.md).
