# Building the item bank

The bank is the instrument. Build it once, keep it in the repository, and change it only by adding —
never by editing an item that has already been answered, because that silently invalidates every result
taken on it.

## Where the text comes from

Real text, from the project the person actually works on. Invented examples measure preferences about
invented examples.

Three sources, in order of how much they can be trusted:

1. **Genuine before-and-after pairs** — a rewrite somebody already did, for their own reasons, before
   this measurement existed. Nobody staged them, so nobody staged them to prove anything. The repository
   holds one such set under `research/2026-09-10-chain/`, stage by stage.
2. **Passages from the project's own documentation**, rewritten to vary one thing.
3. **Code with its comment**, taken together. This is the only item type where the text has a competitor
   that says the same thing — the code itself.

## Who writes the variants

Not you. A coordinator who writes both sides of a pair is measuring the difference between two of their
own moods and calling it a factor.

**Within one pair, one engine writes both sides from two different instructions.** The voice is then
constant across the comparison, and what differs is the instruction. **Across the bank, the engine
rotates**, so the bank is not a measurement of one model's habits.

Neither engine is told which factor is under test in the other's items, and none is told what the person
is expected to prefer.

## The three factors of the first bank

Three, not eight — and the honest count per factor is twenty, not the six an earlier draft of this bank
asserted. Eight factors in one sitting means eight things nobody can conclude anything about. See
[scoring-and-transfer.md](scoring-and-transfer.md), which is under review: the design may not survive it.

| Factor | The two instructions | Why this one |
|---|---|---|
| promotional tone | "state what it does" against "state what it does and why it is good" | the only formatting factor ever isolated cleanly: worth 27% of a measured usability score on its own, n=51 |
| metaphor against literal | "use the literal phrase where one exists" against no such constraint | a documented rule with no measurement behind it, and our own writing rules say nothing about metaphor |
| answer first against context first | "open with the answer" against "open with the situation, then the complication, then the question" | the highest-stakes one. Structure explained 86% of the explained variance in comprehensibility in the one experiment that separated it from wording, against 3.5% for linguistic simplicity — and the best-known authority on answer-first contradicts herself on exactly this |

## The three item types

**Single-factor pairs.** Same content, one instruction different. Twenty per factor for a conclusion
about that factor; fewer makes a lead, not a finding. Short — forty to sixty words a side — because a
long passage varies in more than one way whatever the instruction said.

**Whole-text pairs.** A real passage against a real rewrite of it, both a screen or less. These do not
isolate anything; they check that the instrument registers a difference at all, and they answer the
question the person actually cares about — which would you rather read.

**Code-comment items, three ways.** A real fragment of code with: the comment as written, a rewritten
comment, and no comment at all. Some items must be ones where removing it is right, or the third option
is decoration. This is the direct test of the first writing rule — no sentence that carries nothing —
in the one place where the code is a competing author.

## Repeats

Five items repeated later in the session, not adjacent to their first appearance and not flagged. They
measure the person against themselves. A run without them cannot distinguish a preference from a coin,
and every number it produces is unfalsifiable.

## The held-out set

Built at the same time, from the same sources, by the same engines, and never shown during calibration.
It exists to answer whether the rules derived from the bank transfer to text nobody saw while deriving
them. An item used in calibration cannot test transfer; using one is teaching to the test, which is the
failure this plugin has already caught itself committing twice.

## What the bank file records per item

Its identifier, its type, its factor if it has one, the source the text came from, the engine that wrote
each side, the two instructions, and the text of each option. Not which side is which — that mapping is
generated per session, so the file can be read by the person being measured without spoiling it.

## The limit that must be written down

An item is only as single-factored as the instructions that produced it. Nobody has checked that
"state what it does and why it is good" changes tone and nothing else. Where a conclusion depends on the
isolation being clean, say that it does.
