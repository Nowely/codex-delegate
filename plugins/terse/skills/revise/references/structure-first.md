# Structure first, then blocks

For a document being written or rebuilt, not one being repaired at named failures. `revise`'s four
passes assume a document that is mostly right and broke in places an audit found. This is the other
case: the shape itself is wrong, and no amount of sentence work reaches it.

## The measurement that forced this file

2026-09-11. Ten sections of documentation, 2233 words, written at the author's ordinary quality and
handed to the owner with one question: would you ship this unchanged. He stopped at the third section
and returned nine objections.

**Nine of nine were about what the document contained, where it sat, or how much of it there was. None
was about phrasing.**

| His objection | What kind |
|---|---|
| no statement of the goal or the project's philosophy | missing content |
| technical detail from almost the first line, where the opening should sell rather than frighten | arrangement |
| JSON-RPC, the process name, the exit ladder — "what problem is this meant to solve, frightening the user?" | content that does not belong |
| the rights section is also full of rubbish | content |
| technical detail needs its own "how it works" section | arrangement |
| no update block to match the install block | missing content |
| Node version and `PATH` — "nobody says you need Node when they tell you how to install codex" | noise |
| `auth.json`, an invented example path | noise |
| did not read further, it looks like a lot of water | length |

This is the finding, not the anecdote: **a writing rule about wording could not have moved any of it.**
A bake-off that scores three whole candidates on sentence quality will pick the best-phrased of three
documents with the wrong shape. The shape has to be settled and agreed before a sentence is written.

His first objection is also worth naming for what it is. "It is not clear what problem we are solving"
is not a preference; it is a reader failing to get an answer, which is what `audit` measures. Where a
document has never been audited, that objection is the one to expect first.

## Stage one: the structure, decided before any prose

Generate about ten structures, each from a **different reading of what the document is for** — not ten
runs of one prompt. Angles that produced distinct results: parity with the thing the reader already
uses; the sequence of decisions the reader makes; the Diátaxis split; the objections that stop adoption;
the shortest honest version; the reader's clock, from two minutes to the day it breaks; outcomes rather
than features; trust, for a tool that runs commands; one continuous argument; and what comparable tools
do, named.

Each returns section titles, one sentence of purpose each, **what the section deliberately leaves out**,
and a word budget. No prose. A structure is a set of decisions about what a reader needs and in what
order, and those decisions have to be legible on their own.

Then compare them **together, not one at a time.** Critics see all ten at once, because ranking is the
judgement being asked for and it cannot be made from isolated reviews. Give each critic a different
lens, and require a fatal flaw for every structure including the one it ranks first — a critic that
cannot fault its own winner has not looked.

Ask each critic one more thing: what all ten got wrong. That answer is usually worth more than the
ranking, because a failure every angle shares is a failure of the brief.

Synthesise from the winner, grafting only the specific ideas the critics named. Do not average ten
structures into a compromise; that is how a document ends up with everyone's sections and nobody's
order.

**Then stop and put the structure in front of the owner.** Rewriting two thousand words against the
wrong skeleton costs more than one round trip.

## Stage two: the blocks

Only once the skeleton is agreed. Each block is written several ways and the best is kept, then written
again — the same selection the structure went through, at the scale of a section and then a sentence.
A block that survives one pass unexamined is the one that turns into water.

Two checks per block before it is kept:

- **Does this block have anything to say?** The failure mode an adversarial critic looks for is a
  section that sounded necessary in the outline and has nothing real in it. Cut it rather than pad it.
- **Does it repeat a neighbour?** Two sections that overlap read as length, and length is what the
  reader reports.

## The rules this produced

Derived from what the owner changed, not from a standard. They are about content and order; the rules
about sentences are in [writing-rules.md](writing-rules.md) and are a different layer.

1. **Open with the problem and the goal.** What is this for, what is it trying to achieve. The project's
   own purpose — parity between a delegated seat and a native one — was absent from a ten-section draft
   about it.
2. **The opening sells; it does not warn.** No protocol names, no process names, no exit codes, no
   failure modes in the sections a reader meets first.
3. **Technical detail lives in one section of its own, below the middle.** Whoever reaches it came for
   it. Spread through the early sections it reads as a warning notice.
4. **A prerequisite that is satisfied on nearly every machine is noise.** Runtime versions, `PATH`,
   credential files. Nobody documents that a program needs a shell.
5. **Install is a block to copy, immediately.** This is the one thing in the rejected draft the owner
   said he liked.
6. **Update gets the same block, in the same form.** A document that says how to start and not how to
   move forward is half a document.
7. **No invented examples.** A fabricated file path in a sample command is water; use something real or
   nothing.

## What it costs

The structure stage was fourteen agents: ten proposals, three critics over all ten, one synthesis. That
is the expensive part and it is paid once. The block stage is proportional to the document.

Against it: one rejected draft cost 2233 words of writing and the owner's patience, and was abandoned at
its third section.
