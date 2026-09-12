# The loop: why rounds, where findings go, what the ledger and the map are for

Stage 4 of the four the method has. Stages 1 to 3 — what comparable documents solved, what things are
called, and what the document says in what order — are settled in `rethink` and arrive here as an agreed
skeleton: [stages.md](../../rethink/references/stages.md). The commands and the order of a round are in
`SKILL.md` step 4; this file says why each part is there. Every dated measurement referred to below is
in [measurements.md](measurements.md).

## Why it is a loop

A single pass through stages 1 to 4 produces a first draft, and a first draft is what this method exists
because of. Two loops, and the outer one is the one usually missing:

- **The inner loop, per block.** Write it, hand it to critics, edit against what they found, hand it
  back. One round is a first opinion, not a check. Two questions before a block is kept: does it have
  anything to say, and does it repeat a neighbour.
- **The outer loop, over the whole document.** No block-local critic can see across blocks; a claim
  stated four times in four sections was defensible in each ([M1](measurements.md#m1)). On a document
  that already exists, the outer loop runs first — one adversarial reader over the whole document, with
  the right to run the code, before any block is touched — because that pass found thirteen defects three
  per-block reviews had passed ([M2](measurements.md#m2)).

Critics work in parallel with lenses that differ: a single critic asked twice returns its own first
answer twice. The least a round runs is lenses 1 and 2 of the table in `SKILL.md`; the ones that found
the most were the ones that ran things. Every finding carries a reproducible check, because
re-verifying findings was the slowest step of every round, and a command re-runs in seconds where a code
path re-reads in minutes. The critic against the code does not check that a cited line exists; it checks
that an independent reader of the code would say the same — and for a lifecycle, that a run does.

## Where a finding goes

Stage 4 owns sentences. A finding that is not about a sentence is not repaired here; forcing it is how a
document ends up with a well-written section in the wrong place.

| A finding that says | belongs to | what happens |
|---|---|---|
| this sentence is wrong, unbacked, or water | stage 4 | the next round's `edits/NN.json` |
| these two sections repeat each other | stage 3 | written into `skeleton.md` under *open decisions*; the user is asked; `rethink` re-enters at the structure |
| this term is read as something else | stage 2 | the same, at the vocabulary; every occurrence is then rewritten |
| every comparable document has X and we do not | stage 1 | the same, at the survey; a section and its budget from another |
| the code does this, the document cannot say otherwise | the code | the repository's `ISSUES.md`, with the check; the document says what the code does today |
| the document does not answer this, and should it | the owner | asked, with the cost of answering it |

A batch of findings that are all stage 4 after several rounds is a document converging; a batch that
keeps producing stage 2 and 3 findings is a document whose skeleton was agreed too early, and saying so
is more useful than fixing them one at a time. A finding routed upward invalidates the blocks written
under the old answer, and rewriting them is the cost of having been wrong early.

## The ratchet and the ledger

Rounds are the process; regression is the enemy. A document may take two or ten rounds, and each costs
what the lens table says — the user sizes them. What the loop measures is whether any round made
something worse: **a sentence the round introduced that its critics showed false or overstated is a
regression, and one regression is a failing round however many findings it also produced**, because
the reader cannot tell a sentence that was never right from one that stopped being right.

Compression is how regression enters: the first thing cut is the qualification that made a claim true
([M3](measurements.md#m3)). Reading is how it enters next: every regression in three consecutive rounds
was a sentence about a lifecycle written from one line of code, and the critic who found them ran the
driver ([M4](measurements.md#m4)).

So:

- **Every round is its own file**, named for the pass that produced it. A round that is not a file
  cannot be diffed, and the ratchet is a diff ([M5](measurements.md#m5)).
- **A round is frozen the moment its critics launch.** A fix applied while they read leaves them
  reviewing a document that no longer exists; the fix is the next round ([M6](measurements.md#m6)).
- **`ledger.json` carries every verified claim**: the pattern that finds it, whether it must be present
  or absent, and the level it was verified at. `round.mjs` grows it from each edit's `claims` and
  `retire`; `ledger.mjs` fails a round that loses a claim or revives a retired phrase. A level-2 entry
  about a lifecycle is marked provisional, because three such entries were pinned as true and each fell
  to a run in the next wave ([M7](measurements.md#m7)). A retired phrase is searched for everywhere it
  could survive, table cells included ([M8](measurements.md#m8)).
- **Every changed sentence is re-verified from the code, not from the ledger**: a ledger entry proves
  the old sentence was true, which is exactly the thing an edit can end. A repair is a new draft of
  every sentence it touches, including the ones nobody asked to change ([M9](measurements.md#m9)).
- **`rounds.md` records each round's regression count.** That is the verdict; findings are the yield.

A round that simplifies without re-verifying is not a round, it is a bet.

## When to stop

The loop stops when the owner reads a round and says whether they would send it as it is. That
judgement is what every round exists to prepare for; the gate in `SKILL.md` step 5 says what must hold
before their time is asked for. Two consecutive rounds with no regression is the hand-over signal, not a
finish: a critic asked for findings always produces findings, so no count of them stops anything. Seven
rounds of one document never reached a quiet round, and the wave after the seventh found forty-one
sentence defects ([M10](measurements.md#m10)). Cap the rounds and report the cap as a result.

## The task gate

`audit` gives each fresh reader one question and scores the answer. That finds a document that cannot be
understood. It cannot find a document that is understood, followed exactly, and still leaves the reader
worse off, because no reader in that protocol ever acts ([M11](measurements.md#m11)). So a gate is a
task: a fresh reader is given a starting state and an outcome they want, acts from the document alone,
and the resulting state is checked, not what they said. It is the only check in the method at level 3.

It sees only what a task exercises: report, beside the pass, which sections no task reached — three
tasks passed a round with four false sentences no task touched ([M12](measurements.md#m12)). The forced
guesses are worth more than the pass; ask for every place the document made a reader invent something,
and treat a guess that turned out right like one that turned out wrong.

## The structure map, when a structural question needs one

The document seen as blocks, one entry per section: what the block buys the reader (from the
skeleton), its budget against `wc -w`, the ideas it shares with other sections, its rule violations, the
evidence level of its claims, which tasks reached it, and a verdict with the stage it routes to. Written
by someone other than the writer. It also records what was deliberately refused, so the next round does
not re-propose it, and the blocks that fail with the cost of fixing each, including the ones with no
known fix.

It explains; it does not accept. Its first column derives the intended benefit from the skeleton, so a
mistaken skeleton produces a perfectly faithful map, and a rationale for a section never outranks a
failed task ([M13](measurements.md#m13)). Make one when a stage-3 question is open; do not maintain one
as a matter of course.

## Contradiction, which the duplication count cannot see

The duplication count finds the same idea twice. It is blind to two statements that cannot both be
true; the code settles which ([M14](measurements.md#m14)). So: take every claim the document makes about
what cannot happen — *nothing*, *never*, *only*, *always*, *by default* — and find the sentence
elsewhere that says it can.

## Duplication: one idea, one home

A reader who meets the same thing three times learns nothing the second and third times and pays in
attention. `dup.mjs` counts, per idea, the sections it lands in; three or more is a finding
([M15](measurements.md#m15)). The one exception is narrow: repetition at an independently read decision
point — a symptom row in a troubleshooting table a reader reaches without the section that explained
the cause. The test is whether the second reader plausibly skipped the first occurrence, not whether the
fact is important. Everything else is cut at the occurrence furthest from where the reader acts on it.

## A mechanical check is worth exactly what its pattern is worth

"The rules pass, read as a grep would read them" is a claim about a regular expression and inherits
every hole in one: a rule-1 check that excluded `~`-paths reported clean for three rounds while the
document violated the rule in four places ([M16](measurements.md#m16)). So every check is tested against
a planted violation before its output is believed — `scripts/selftest.mjs` does that for the five that
ship — and text is whitespace-normalised before matching, because a claim broken across a line has
defeated two checks.

When a rule fires, ask whether the rule is wrong. Two rules of this method collided — no paths before the
technical section, and literal paths in the section whose job is to say where things are kept — and the
resolution is a stated exception (`rule1.mjs --except`), not a silent one ([M17](measurements.md#m17)). A
violation is a question, not a verdict; the first thing to test is which of the two rules is younger.
