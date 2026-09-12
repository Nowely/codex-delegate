# Filling the blocks, and the loop that is the method

Stage 4 of the four the method has. Stages 1 to 3 — what comparable documents solved, what things are
called, and what the document says in what order — are settled in `rethink` and arrive here as an agreed
skeleton: [stages.md](../../rethink/references/stages.md).

## Stage 4. The blocks

Only once the skeleton is agreed. Each block is written several ways and the best is kept, then written
again — the same selection the structure went through, at the scale of a section and then a sentence.
A block that survives one pass unexamined is the one that turns into water.

Two checks per block before it is kept:

- **Does this block have anything to say?** The failure mode an adversarial critic looks for is a
  section that sounded necessary in the outline and has nothing real in it. Cut it rather than pad it.
- **Does it repeat a neighbour?** Two sections that overlap read as length, and length is what the
  reader reports.

## The loop, which is the method rather than a refinement of it

Everything above reads as a pipeline: four stages, each settled, then the next. **It is not one.** A
single pass through stages 1 to 4 produces a first draft, and a first draft is what this file exists
because of.

Two loops, and the outer one is the one that is usually missing.

### The inner loop, per block

Write the block, hand it to critics, rewrite against what they found, hand it back. One round is not
a check; it is a first opinion.

Critics work in parallel and with **different lenses**, because a single critic asked twice returns its
own first answer twice. The three that earned their place here: one against the code, one against the
mechanical rules read as a grep would read them, and one hunting words whose score does not pay for
their space.

### The outer loop, over the whole document

When every block has gone quiet, the document is still not finished, because **no block-local critic can
see across blocks.** Measured on our own run: a water critic reading the assembled document found one
claim stated four times in four sections, each of which was defensible where it stood. Roughly 120 words
of pure repetition that every per-block pass had passed.

So the whole document goes back through critics who read it end to end, and their findings are **routed
by which stage they belong to**:

| A finding that says | goes back to | and costs |
|---|---|---|
| this sentence is wrong or unbacked | stage 4, that block | one block |
| these two sections repeat each other | stage 3 | a boundary, sometimes a merge |
| this term is read as something else | stage 2 | every occurrence, everywhere |
| every comparable document has X and we do not | stage 1 | a section, and its budget from another |

That routing is what makes it a cycle over the whole flow rather than a polish pass. A finding that
lands on stage 2 or 3 invalidates blocks written under the old answer, and rewriting them is the cost of
having been wrong early — which is the argument for spending on stages 1 and 2 in the first place.

### When to stop

Not at a score. A critic asked for findings will always produce findings, so a target number invites
either padding or capitulation. **Stop when a round is dry: two consecutive rounds in which the critics
find nothing they have not already found.** Cap the rounds, and report the cap as a result rather than a
success — a document still producing new findings at the cap is a document with a stage-3 problem
nobody has named.

Two things are gates rather than counts, and neither is allowed to be traded against anything:

- **No statement about behaviour survives without the file and line that backs it.** One false claim
  shipped in this document's own history, and a fourteen-agent exercise inherited it into two of ten
  proposals before an adversarial reader caught it.
- **The mechanical rules pass, read as a grep would read them.** They are written so that passing is a
  fact and not an opinion; if a rule cannot be checked that way, rewrite the rule.

Everything else — repetition, water, a section that turned out to have nothing to say — is counted per
round and expected to fall. Report the counts per round, because a count that stops falling is the
signal that the loop has stopped paying and the answer is upstream.


## Where a finding goes when it is not yours

Stage 4 owns sentences. A finding that is not about a sentence is not repaired here, and forcing it to be
is how a document ends up with a well-written section in the wrong place.

| A finding that says | belongs to | run |
|---|---|---|
| this sentence is wrong, unbacked, or water | stage 4 | fix it here |
| these two sections repeat each other | stage 3 | `rethink`, at the structure |
| this term is read as something else | stage 2 | `rethink`, at the vocabulary |
| every comparable document has X and we do not | stage 1 | `rethink`, at the survey |

Say which stage a finding belongs to when you report it. A batch of findings that are all stage 4 after
several rounds is a document converging; a batch that keeps producing stage 2 and 3 findings is a
document whose skeleton was agreed too early, and saying so is more useful than fixing them one at a
time.
