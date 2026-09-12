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

The one against the code does not check that the cited line exists. It checks that an independent reader
of that code would state the same thing — level 2 of
[the three](../../audit/references/truth-pass.md#three-levels-of-evidence). Every false claim this method
has caught so far had a resolving line number.

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

### The ratchet: rounds are the process, regression is the enemy

Do not count rounds as a cost. A document may take two or ten, and a round that finds a new **class** of
defect has paid for itself — that is the machinery growing, not the document failing.

The thing to measure instead is whether any round made something worse. **One regression per round is a
failing loop however many findings it also produced**, because the reader cannot tell a sentence that was
never right from one that stopped being right.

**Compression is how regression enters.** The knapsack principle pushes toward cutting, and the first
thing to go is the qualification that made a claim true. Measured on 2026-09-12, in a repair that applied
nine verified fixes correctly:

```
before:  your system temp directory is the only thing it may write     ← true
after:   a scratch space of its own, one per agent                     ← shorter, cleaner, false
```

`driver.mjs:2001-2015` takes `process.env.TMPDIR` — the caller's own, shared — and refuses unless the
granted roots are exactly that. Neither "of its own" nor "one per agent" survives contact with it. The
sentence got better by every measure this method had, and became a lie.

So carry a **ledger of verified claims** across rounds: the sentence, the claim, the file and line, and
the evidence level reached. Then each round is mechanical rather than hopeful:

1. Diff the round against what it replaced, sentence by sentence.
2. Intersect the changed sentences with the ledger.
3. **Every hit is re-verified from the code, not from the ledger.** A ledger entry proves the old sentence
   was true, which is exactly the thing a rewrite can end.
4. Count the regressions. That number is the round's verdict; findings are its yield.

A round that simplifies without re-verifying is not a round, it is a bet.

### When to stop

Not at a score. A critic asked for findings will always produce findings, so a target number invites
either padding or capitulation.

Two conditions, and the first one is the ratchet:

- **No regressions in the last two rounds.** Nothing that was verified true has become false or vaguer.
- **No new class of defect in the last two rounds.** Individual findings are expected to keep arriving;
  what should stop arriving is a *kind* of failure the machinery had no check for.

The second condition is deliberately about classes rather than counts, because a method under
construction earns a new check every round, and each new check finds things the last round could not
see. That is the machinery growing. Counting those as failures to converge would stop the loop exactly
when it is paying best.

Cap the rounds, and report the cap as a result rather than a success — a document still producing new
classes at the cap has a stage-3 problem nobody has named.

Two things are gates rather than counts, and neither is allowed to be traded against anything:

- **No statement about behaviour survives without the file and line that backs it.** One false claim
  shipped in this document's own history, and a fourteen-agent exercise inherited it into two of ten
  proposals before an adversarial reader caught it.
- **The mechanical rules pass, read as a grep would read them.** They are written so that passing is a
  fact and not an opinion; if a rule cannot be checked that way, rewrite the rule.

Everything else — repetition, water, a section that turned out to have nothing to say — is counted per
round and expected to fall. Report the counts per round, because a count that stops falling is the
signal that the loop has stopped paying and the answer is upstream.


## The structure map, which is what the outer loop reads

The outer loop needs something to read. Prose does not present its own shape, and a critic handed a
finished document reviews sentences because that is what is in front of it. **The map is the document
seen as blocks**, one entry per section, and it is what makes a structural failure visible at all.

One entry per section, and every column derived rather than asserted:

| Column | Where it comes from |
|---|---|
| what this block buys the reader | the skeleton's purpose for it — and a block that cannot fill this has already failed |
| budget against actual | the skeleton's number against `wc -w` on the section |
| ideas shared with other sections | the duplication count below, per section |
| rule violations inside it | the mechanical rules, read as a grep would |
| evidence level of its claims | level 1, 2 or 3 from [truth-pass.md](../../audit/references/truth-pass.md#three-levels-of-evidence) |
| verdict, and the stage it routes to | follows from the above, not from taste |

**It is written by someone other than the writer.** A map whose verdicts are the author's own is the
author grading himself, and the first one produced this way marked two blocks as sound that its reader
rejected within a minute.

Two entries that are not sections and earn their place anyway:

- **What was deliberately refused**, with the reason. Otherwise the next round re-proposes it, and a
  survey's do-not-copy list evaporates the moment it is acted on.
- **The blocks that fail, in a table of their own**, with the cost of fixing each — including the ones
  with no known fix. A failure recorded as unresolved is worth more than one quietly dropped: the first
  map's third failure had no answer, and saying so is what stopped it being smoothed over.

A map that reports every block sound has not been written independently. Ask for the two weakest blocks
by name; a reviewer who cannot rank them has not read them as blocks.

### The map is not the gate, and believing it is was the first thing an architect broke

An architect-critic was given the map and told to attack it. Four objections, all of which hold:

**The first column is circular.** "What this block buys the reader" is derived from the skeleton's
purpose for it — which is the *intended* benefit. Whether the reader receives it is not measured
anywhere in the map. **A mistaken skeleton produces a perfectly faithful map.**

**Provenance keeps standing in for justification.** "Promoted by four surveys", "the section the reader
asked for by name" — those say how a section arrived, not whether it earns its place now. Prior art
weighted by usage is evidence about what is familiar; it is not evidence that the convention caused a
reader to succeed.

**The stopping rule measures exhausted discovery, not correctness.** Two rounds finding nothing new can
repeat one unresolved consequential defect twice and call it convergence.

**Requiring every map to name weaknesses makes criticism a performance.** A reviewer who must find two
weakest blocks will find two. That produces the appearance of independence, not independence.

So: **keep the map as the record of structural choices and outstanding failures, and make acceptance
depend on a reader completing a task.** A persuasive rationale for a section must never outrank a failed
task. The map explains; it does not accept.

### Contradiction is a defect class of its own, and the duplication count cannot see it

The duplication count finds the same idea twice. It is blind to two statements that cannot both be true.

Measured on 2026-09-12. One section of a draft said an agent *reaches the network by default*; the next
section, titled "What it stores, and what leaves your machine", opened with **"Nothing leaves your
machine."** Both sentences passed the per-block critics, because each is defensible where it stands, and
the duplication counter scored them as unrelated — they share no vocabulary. The code settles it:
`network: true` is the default and the opt-out is a single flag.

A false assurance is worse than a missing one. Add the check: **take every claim the document makes
about what cannot happen, and find the sentence elsewhere that says it can.** Scope words — *nothing*,
*never*, *only*, *always* — are where to start looking.

## Duplication, which is the defect the outer loop exists to catch

**One idea, one home.** A reader who meets the same thing three times learns nothing the second and third
times and pays for them in attention. This is the failure no per-block pass can see, because each
occurrence is defensible where it stands.

Check it mechanically rather than by impression. Split the document at its headings, give each idea a
pattern, and count which sections each one lands in. A concept in three or more sections is a finding,
and the count is not a matter of taste:

```
concept                      times  where
quota / sign-in                 6   install×3, storage×2, troubleshooting×1   <<<
prompt file + permission        6   install×2, rights×1, storage×3            <<<
last commit / empty diff        5   install×1, rights×3, troubleshooting×1    <<<
```

That is a real run, on a draft that had just grown from 1158 words to 1436 because two sections were
added and nothing they duplicated was removed. Growth after an addition is the moment to run it.

**The one justified exception, and it is narrow.** Repetition at an independently read decision point is
not redundancy: a reader who arrives at a troubleshooting table with a symptom never read the section
where the cause was explained, so the fact belongs in both. The test is whether the second reader
plausibly skipped the first occurrence — not whether the fact is important. A warning repeated three
paragraphs below itself fails that test; the same warning as a symptom row passes it.

So: one home for each idea, plus at most one symptom-keyed repeat. Everything else is cut at the
occurrence that is furthest from where the reader acts on it.

## The acceptance test: a reader carrying a task, not answering a question

`audit` gives each fresh reader one question and scores the answer. That finds a document that cannot be
understood. It cannot find a document that is understood, followed exactly, and still leaves the reader
worse off — because no reader in that protocol ever acts.

**The instance that proved it, on 2026-09-12.** A draft carried this warning, and it was the only alert
in the document:

> A throwaway copy starts at your last commit. Uncommitted edits are not in it … **Commit or stash
> first.**

Half of that advice is wrong, and the half that is wrong destroys work. Run it: `git stash` takes the
changes out of the working tree, and a detached worktree created afterwards is still at `HEAD`, so the
agent sees nothing **and the reader's own tree has been reverted**. A reader who obeys the document ends
up worse than one who ignores it. Every sentence in the warning is individually true; the recipe as a
sequence is not.

Nothing in the method caught it. The claim reads as behaviour, so the accuracy floor applies — but the
floor asks whether the code says this, and no single line says "stash does not help". It took running
the recipe.

So the gate is a task, not a score:

- give a fresh reader a starting state and an outcome they want
- let them choose their actions from the document alone, with no skeleton and no answer locations
- check the **resulting state**, not what they said

One such test per round, on the workflow the document most wants a reader to perform. It is the only
check here that reaches evidence level 3 — the behaviour was made to happen — and every other check in
this file stops at level 2.

It also exposes a limit of the knapsack principle. **A fact's score depends on what the reader must do
next**, and a connecting instruction scored on its own looks expendable. Cut by score alone and the
sentence that makes a sequence work is the first to go.

### What the task gate cannot see, stated before anyone trusts it

The gate was run on 2026-09-12, three readers, three tasks. **All three succeeded**, and that result is
worth less than it looks.

A task gate sees only what a task exercises. Four of the six defects still outstanding after that run
were false sentences no reader had to act on, and three whole sections finished with no level-3 evidence
at all, because nothing made anybody touch them. **A gate that passes everything has told you about your
tasks, not about your document.**

So report, beside the result, **which blocks no task reached**. That list is the gate's own coverage gap
and it belongs in the map as a column, not in a footnote. A section nobody could be given a task for is
a section to ask harder questions about.

The forced guesses are worth more than the pass. Every reader reported where the document made them
invent something, and each of those was a real gap — which access kind a plain request selects, whether
an uninstall needs a restart, whether one instruction applied to the path above it. Ask for them, and
treat a guess that turned out right exactly like one that turned out wrong.

### A repair against a verified list breaks things the list did not mention

Measured in the same run. A writer was handed nine verified fixes and applied all nine correctly — and
in rewriting one sentence for fix 5, made two other sentences false. The previous version had been
right: the read level's writable root is the caller's own exported `$TMPDIR`, shared, and the repair
called it "a scratch space of its own, one per agent". Neither task touched storage layout, so the gate
passed it.

**A repair is a new draft of every sentence it touches**, and the accuracy floor applies to those
sentences again, not only to the ones the list named. Diff the repair against what it replaced and check
every changed claim — including the ones nobody asked to be changed.

## A mechanical check is worth exactly what its pattern is worth

"The rules pass, read as a grep would read them" is a claim about a regular expression, and it inherits
every hole in one.

Measured on 2026-09-12. The check for rule 1 — no absolute path before the technical section — was
written as `(?<![\w~])/[A-Za-z]…`, whose negative lookbehind **excludes paths beginning with `~`**. Every
path in the document began with `~`. The check reported clean for three rounds, through two independent
reviews, while the document violated the rule in four places; an auditor found them by reading.

So: **every mechanical check is itself tested, against a planted violation, before its output is
believed.** One line, once:

```bash
printf 'use --no-network and ~/.codex/sessions\n\n## How it works\n' > /tmp/planted.md
node check.mjs /tmp/planted.md   # must report both, or the check is decoration
```

A check that has never caught anything is indistinguishable from a check that cannot.

### And when a rule fires, ask whether the rule is wrong

The same run found `~/.claude/plugins/data/…` inside a section whose whole job is to say where things are
kept — and the survey of comparable documents had already established the convention it was obeying:
**literal paths, not abstractions**, because "a scratch directory outside your project" tells a reader
nothing they can check.

Two rules of this method, in direct conflict, neither noticed until a checker was fixed. The resolution
is a stated exception rather than a silent one: rule 1 forbids mechanism **that the reader has not asked
for yet**, and in a section titled *what it stores*, a path is the answer rather than the mechanism.

A violation is a question, not a verdict. The first thing to test is which of the two rules is younger.

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
