# Building the item bank

The bank is the instrument. Build it once, keep it in the repository, and change it only by adding —
never by editing an item that has already been answered, because that silently invalidates every result
taken on it.

A random allocation of items is roughly **68% as efficient** as a balanced one, which means about 47%
more of the person's time for the same precision. In a bank this scarce, ad-hoc allocation is the most
expensive mistake available.

## Where the text comes from

Real text, from the project the person actually works on. Invented examples measure preferences about
invented examples.

Three sources, in order of how much they can be trusted:

1. **Genuine before-and-after pairs** — a rewrite somebody already did, for their own reasons, before
   this measurement existed. Nobody staged them. `research/2026-09-10-chain/` holds one such set, stage
   by stage.
2. **Passages from the project's own documentation**, rewritten to vary one thing.
3. **Code with its comment**, taken together. The only item type where the text has a competitor that
   says the same thing — the code itself.

**One item per source passage.** Items that share a source are correlated, and the arithmetic that
justifies the item counts assumes they are not: six items on one source at an intracluster correlation of
0.2 carry an actual error rate of 0.167 against a nominal 0.031. Reusing a passage to save writing time
costs more than it saves.

## Who writes the variants

Not the coordinator. Whoever writes both sides of a pair is measuring the difference between two of their
own moods and calling it a factor.

**Within one pair, one engine writes both sides from two different instructions**, so the voice is
constant where the comparison happens. **Across the bank the engine rotates — and the rotation must be
balanced within each factor**, or engine and factor stay confounded and no result separates them.

No engine is told which factor is under test in another's items, or what the person is expected to
prefer.

## The three factors, and the trap in one of them

Three, not eight: at twenty-eight decisive items each, three factors already cost eighty-four decisive
answers before anything else.

| Factor | The two instructions | Why this one |
|---|---|---|
| promotional tone | "state what it does" against "state what it does and why it is good" | the only formatting factor ever isolated cleanly: worth 27% of a measured usability score on its own, n=51 |
| metaphor against literal | "use the literal phrase where one exists" against no such constraint | a documented rule with no measurement behind it, and this plugin's writing rules say nothing about metaphor |
| answer first against context first | "open with the answer" against "open with situation, complication, question" | structure explained 86% of the explained variance in comprehensibility in the one experiment that separated it from wording, against 3.5% for linguistic simplicity — and the best-known authority on answer-first contradicts herself here |

**The promotional-tone instruction adds justification, which adds length, and length is not neutral.**
Human annotators have been measured choosing the longer answer 62% of the time and the one with lists 69%
of the time. Unmatched, this factor measures length and reports it as tone. Either match word counts
between the two sides within a stated tolerance, or record the difference per item and model it. The
published fix is the first: one study capped its reference texts to a fixed token band precisely to kill
this confound.

## What a balanced bank looks like

Six properties, each cheap to enforce when the bank is generated and impossible to add afterwards:

- every factor level appears equally often;
- factor is uncorrelated with engine, with source, with passage type and with session phase;
- left and right carry each variant exactly equally, computed rather than randomised — with six items,
  independent coin flips put one variant on the same side five times or more in **22%** of banks;
- every factor appears equally in the early, middle and late blocks;
- a repeated item appears on the **opposite** side the second time;
- comparisons are not all obvious, or the subtle factors have nothing to register.

For three factors, the six orders `ABC ACB BAC BCA CAB CBA` put each factor in each position twice and
each directed transition twice. That balances first-order sequence. It does not remove longer carryover,
and nothing opened establishes a washout time for passages a person has already read.

## The item types

**Single-factor pairs.** Same content, one instruction different. **Twenty-eight decisive answers per
factor**, which at a 30% tie rate means about forty presentations. Short — forty to sixty words a side —
because a long passage varies in more than one way whatever the instruction said.

**Whole-text pairs.** A real passage against a real rewrite, a screen or less each. They isolate nothing;
they check that the instrument registers anything at all, and they answer the question the person
actually has — which would you rather read.

**Code-comment items, three ways.** A real fragment with the comment as written, a rewritten comment, and
no comment at all. Some items must be ones where deleting is right, or the third option is decoration.
These are **not pairs with a tie**: analyse them as predeclared separate contrasts or as a multinomial
choice, never as several votes from one answer.

## Repeats

Five, scattered, not adjacent, not flagged, each on the side opposite its first appearance. They are a
**diagnostic**, not a gate: five repeats cannot estimate consistency to any useful width, and the earlier
rule built on them would have discarded preferences the test can detect. Report their count and their
interval and let transfer decide whether the rules work.

## The held-out set

Built at the same time, from the same sources, by the same engines, never shown during calibration — and
it must hold out **source passages and their relatives**, not merely item identifiers. An item derived
from a source seen during calibration is not held out.

Once failures from the held-out set have been used to revise a rule, that set has become development
data. A confirmatory test after that needs fresh sources again.

## What the bank file records per item

Identifier, type, factor, source passage, the engine that wrote it, both instructions, both texts, the
word count of each side, and the block it belongs to. **Not** which side is which — that mapping is
generated per session and held outside the file, so the bank can be read by the person being measured
without spoiling it.

## Limits to write down beside the bank

**The frame is English project documentation**, by decision on 2026-09-11. The bank carries no Russian
items. Nothing measured here says anything about Russian text — including the Russian this coordinator
writes in conversation. A rule derived on English passages is a hypothesis about Russian until a Russian
block measures it.

An item is only as single-factored as the instructions that made it. Nobody has verified that "state what
it does and why it is good" changes tone and nothing else; length is known not to be held constant, which
is why it is measured per item.

And the estimand travels with the bank: results describe this person on passages from this declared
source frame. They are not about other people, and they are not about text drawn from anywhere else.
