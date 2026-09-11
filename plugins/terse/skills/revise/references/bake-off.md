# The bake-off

One writer produces one text and has no way to know whether a better one was available. Three writers
and a judge produce a comparison. The cost is real, so the pool stays small and the user agrees to it
before anything is spawned.

**Measured:** a bake-off of this shape — ten seats, models hidden from the judges — is how the writing
standards in this plugin were chosen, and it overturned the expected result. **Not measured:** that a
bake-off beats a single careful pass at repairing a document. The single chained pass is what produced
3/6 → 6/6, in one run whose result does not survive a significance test. Treat the comparison as
insurance against a bad draft, not as a proven improvement.

One more thing this sheet does not yet control. Model judges are measured to prefer longer answers and to
prefer their own writing, and this bake-off makes word count the tiebreak and defaults to a panel drawn
from one model family. Until that is corrected, read a narrow win on length as a tie.

## The pool

| Seats | Default | Notes |
|---|---|---|
| writers | 3 | one whole candidate each, same brief, different angle |
| judges | 2 | a third only when the two split |

Claude agents by default. When the `codex-delegate` plugin is installed, give one writer seat and one
judge seat to Codex: a panel that does not share a single model's blind spots is worth more than a larger
panel that does. The full form the author uses is three judges — Fable, Codex gpt-6-astra, and Opus —
and two are usually enough.

Judges never learn which model wrote which candidate. Label candidates A, B, C.

## The three angles

The brief is identical for every writer; only the angle differs. Which angle wins is worth recording
across runs, because nothing here has been measured yet.

- **Repair-first.** Start at the failures. Change as little else as possible.
- **Path-first.** Rebuild the route a reader walks through the document, then repair the failures on it.
- **Frame-first.** Rebuild the opening — what this is, when you need it — then repair the rest.

## The writer brief

Send the four parts assembled in Step 2 of the skill, then this:

```
Rewrite the whole of <FILE> by running the four parts above as four passes, in order. Keep each
intermediate draft as a separate file; name them 01-reader-pass, 02-writing-pass,
03-prerequisite-pass, and the final result last.

Your angle is <ANGLE>.

Six fresh readers have been measured against the current file and their failures are in part four.
They are the point of this exercise. A rewrite that improves prose without repairing those failures
has done nothing.

Do not modify the repository. Write every file into your own temporary directory and name the paths
in your return.

THE ACCURACY FLOOR: every statement about behaviour must be true of the code in this checkout, and
you must know the file and line that backs it. Correct what the current file gets wrong rather than
carrying it forward. Rewrites of this file have already failed by writing a cleaner sentence that
states something the code does not do.

CHECK:
a) For each measured failure, name what you changed and where.
b) Back every behavioural claim with a file and line.
c) List what you were tempted to cut and kept, because it is a condition, a limit or a warning at a
   point where a reader decides.
d) Report the word count before and after.
```

The instruction to keep intermediate drafts is not bookkeeping. In the measured run the drafts showed
that the second pass cut 105 words and the third added 105 back as framing — the net was small and the
change was not. Without the drafts that is invisible, and the pass that did the work cannot be told from
the pass that undid it.

## The judging sheet

One sheet per candidate. The first two rows are vetoes: a candidate that fails either is out, whatever
else it does well.

| Row | Question | Weight |
|---|---|---|
| new false claims | does any behavioural claim contradict the code, or exceed the evidence level its source supports? | veto |
| protected passages | was a condition, limit or warning at a decision point cut or weakened? was a passage the audit recorded as working damaged? | veto |
| failures repaired | how many of the measured failures are repaired, at their source, with the line shown? | primary |
| prerequisites | does the text answer the inventory's items where the reader meets them? | secondary |
| cuts justified | does every cut of twenty words or more carry a reason? | secondary |
| length | word count before and after | tiebreak only |

Judges state a line number for every claim they make about a candidate. A judgement without a line is an
opinion, and this sheet does not collect opinions.

Give the judges the audit's *What broke* section and the candidate. Do not give them the other judges'
sheets.

## Choosing and grafting

The winner is the surviving candidate with the most failures repaired. A tie there stays a tie: word
count is reported and never selects, because the bias it would encode has been measured and runs toward
length rather than against it. Break a real tie by re-auditing each surviving candidate and taking the
one with the higher score, no broken control and no new false claim; if that also ties, say so.

Then graft: where a loser repaired a failure the winner did not, take that repair into the winner. Take
the repair, not the paragraph around it — a wholesale merge of two prose styles produces a text neither
writer would have written, and no judge has scored it. Re-check every graft against the code, because a
sentence that was true inside its own candidate can be false in a document that says something different
around it.

Record what was grafted and from where. The next run's judges benefit from knowing which angle supplied
the repairs.
