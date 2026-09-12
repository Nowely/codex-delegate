---
name: rewrite
description: >-
  Writes the text, in a loop rather than a pass: blocks drafted, criticised by lenses that do not
  overlap, rewritten, and checked again until a round finds nothing new. Starts from a skeleton `rethink`
  agreed, or from the failures an `audit` measured. Proposes; writes into your tree only on your word.
disable-model-invocation: true
metadata:
  version: "0.1.0"
license: MIT
---

Two ways in, and they differ only in what tells you where the text is wrong:

| You have | Start at | What drives the writing |
|---|---|---|
| a skeleton `rethink` agreed | step 2 | the skeleton's purpose, exclusions and budget per section |
| an `audit` run file | step 1 | the named failures, each at its line, with its cause |
| neither | neither — run one first | — |

**The loop is the method, not a polish pass.** One pass through a skeleton produces a first draft, and a
first draft is what this whole method exists because of. The shape of the loop, the routing of findings
back to the stages above, and the stopping rule are in [loop.md](references/loop.md).

## Step 1. The measurement, where there is one

Ask the user for the run directory from `audit` and read `audit.md` there. You need two headings:
**Reader profile** and **What broke**. The contract is in [ledgers.md](../audit/references/ledgers.md).

If there is no run file and no skeleton, say so in one sentence and offer `/terse:audit` or
`/terse:rethink` first. If the user declines both, continue — and say in the report that the writing ran
on your guesses about where readers fail. Three parts of a four-part method is not the thing that was
measured.

The first three of the four passes below are a writing standard, and writing standards were measured
losing to no standard at all: given a published one, seven seats of ten proposed nothing and two produced
a longer text. What moved a README from 3/6 to 6/6 was the fourth, where named readers failed at named
lines. That chain ran once, on one document, one trial per question, and its result is not
distinguishable from chance — so treat the fourth pass as the mechanism worth keeping, not as a proven
gain.

## Step 2. The brief

Assemble it once, for every writer, in this order:

1. **The skeleton**, if there is one — its purpose, exclusions and budget for the section being written,
   unedited.
2. **Who reads this** — the profile from the run file, unedited.
3. **The writing rules** — [writing-rules.md](references/writing-rules.md), copied in as written.
4. **The curse of knowledge** — [curse-of-knowledge.md](references/curse-of-knowledge.md), likewise.
5. **Where the readers failed** — the entries under *What broke*, each with its line, its cause and its
   quote, plus the passages that worked and must not be damaged.

Copy the fixed parts; do not paraphrase them. They were measured in the form they are in.

Add the accuracy floor verbatim: **every statement about behaviour must be true of the code in this
checkout, and the writer must record which level of evidence it actually reached** — the line resolves,
the code says this, or the behaviour was made to happen. The three levels are defined in
[truth-pass.md](../audit/references/truth-pass.md#three-levels-of-evidence), and the reason to name the
level rather than the line is written there: **citing a line is the weakest of the three and the one
that feels like proof.**

This is a gate, not a preference, and level 1 does not clear it for anything a reader will act on. A
claim about a lifecycle — what stays on disk, what is removed and when, what a continued or retried run
sees — clears it only at level 3: run it. One measured round made nine edits, each checked against a
resolving line, and the four that were false were all of that kind. One false
claim has shipped in this plugin's own history — a draft said a directory was never pruned when the
code prunes it by age and by count — and a fourteen-agent exercise inherited it into two of ten proposals
before an adversarial reader caught it. A line number was available for that claim the whole time. What
was missing was a reader of the code who would have said the same thing.

## Step 3. The first candidate

Announce it before spawning: how many writers, judges and critics, which models, roughly what it costs.
Wait for the user's word.

The first candidate comes from a bake-off — three writers with different stances, two judges scoring on
the failures rather than on taste — in [bake-off.md](references/bake-off.md). That is the only bake-off.
Every round after it edits the round before. If the user refuses the fan-out, write one candidate yourself
from the same brief and report that the comparison step was skipped.

## Step 4. The rounds

A round is one file produced from the previous one: its edits declared, its checks run, its critics
launched, their findings deduplicated and verified — in that order, and nothing in it edited once the
critics start. The shape of the loop and why each part is there: [loop.md](references/loop.md).

1. **Write `edits/NN.json`.** For each edit: the exact `old` text, which must occur once; the `new`
   text; the claims it introduces and the phrasings it retires as false; and for every claim about
   behaviour a `check` — the level reached and the command or line that reached it. A claim about a
   lifecycle at level 2 is a guess.
2. **Produce the round**: `node scripts/round.mjs NN-1.md NN.md edits/NN.json --ledger ledger.json`. It
   refuses an anchor that is not unique and refuses to overwrite a round.
3. **Run the checks**: `rule1.mjs`, `dup.mjs`, `sections.mjs` against the skeleton's budgets,
   `ledger.mjs` over every round so far. A failure is fixed in a new `edits/NN.json`; the round file is
   never touched.
4. **Launch the critics**, one seat per lens, then the dedup seat over their reports. A finding without a
   reproducible check is discarded.
5. **Verify the list yourself**, from the command each finding carries, and route each: a sentence goes to
   the next round's edits; a boundary or a term goes back to `rethink`; a code defect goes to the
   repository's `ISSUES.md`; a question the document does not answer goes to the user.
6. **Record the round** in `rounds.md`: what produced it, its words, the findings against it, and **its
   regression count** — the sentences it introduced that its critics showed false or overstated. That
   number is the verdict; findings are the yield.

The lenses are fixed and the sizes are the user's. Costs are what one wave of eleven measured on
2026-09-12, on a 1600-word README:

| Lens | Reads | Where it ran best | Cost |
|---|---|---|---|
| the code, with the right to run it | every behavioural claim; level 3 for anything about a lifecycle | Claude Opus | ~180k tokens, 17 min |
| the mechanical rules and the water | the skeleton's rules as a grep would; words whose score does not pay | Claude Opus | ~70k tokens, 7 min |
| adversarial, whole document | every sentence a reader acts on; scope words; CLI experiments in an isolated config | Codex gpt-6-astra | ~40 commands, 5 min |
| a task | a starting state and a goal, acted on from the document alone; the resulting state | Codex gpt-5.6-sol, two | ~20 commands, 5 min each |
| a reader's questions | three questions each, one `cat` and nothing else; where they guessed | Codex gpt-5.6-luna, five | ~1 min each |
| dedup and rank | every report above, into one list with a reproducible check per finding | Claude Fable, after the rest | ~160k tokens, 15 min |

The ones that found the most were the ones that ran things: a critic with an isolated
`CLAUDE_CONFIG_DIR` and the driver found thirteen defects in one pass that three reading-only reviews had
passed, and one wave found forty-one sentence defects in a document six rounds of one or two critics had
already reviewed. A reader seat told not to run commands reads nothing — Codex reads files through the
shell — so a reader is told which one command it may run. Judges and critics never learn which model
wrote what.

## Step 5. The safeguards

These override the writing rules wherever they collide, and the rules say so themselves.

- Never cut a condition, a limit or a warning at a point where a reader decides.
- Repetition at an independently read decision point is not redundancy.
- A dated measurement keeps its date and its numbers, including ones the code has since changed.
- Counts — sentence length, repeated phrases — prompt a review. They are not gates.

Two failures this guards against, both measured. A true sentence moved to line 8 met two readers before
they knew what the tool was, and both remarked on it: position is not repaired by truth. And a stronger
claim beats a truer one when a reader meets both, so a weakened claim has to be the only claim left
standing, not an accurate footnote under a confident headline.

## Step 6. What you return

Into a run directory of its own — `research/<date>-<slug>/` in the repository, never into the audited
tree:

- every round as its own file, `00-…` to `NN-…`, named for the pass that produced it
- `edits/NN.json` for every round after the first, `ledger.json`, `concepts.json`
- `skeleton.md`, kept current with every decision taken after it was agreed
- `rounds.md`: one row per round with its producer, words, findings and regression count
- `reviews/NN/`: every critic's report and the dedup, verbatim
- the diff of the last round against the original, and the cut ledger — every removed passage of twenty
  words or more, with its reason
- word count before and after, and the findings per round with the stage each belonged to

Formats for the ledgers are in [ledgers.md](../audit/references/ledgers.md).

## Step 7. The gate, and the stop

Three checks before the user reads, none of them tradeable against another:

- **no regression in the last round** — the ledger passes and the critics showed nothing it introduced to
  be false or overstated;
- **a task gate** — two fresh readers given a starting state and a goal, acting from the document alone,
  checked on the state they produce; the only level-3 evidence the loop makes, and its forced guesses are
  the yield;
- **question readers** — one fresh reader per question a reader arrives with, `.md` files only; this is
  `audit`'s own protocol at round size, and re-running `/terse:audit` with the same key is the same
  measurement at full size.

**The loop stops when the user reads the round and says whether they would send it as it is.** Every
round before that exists to make that read worth their time. Two consecutive waves with no regression and
no new class of defect is the signal to hand the round over, not a finish: a critic asked for findings
always produces findings. Then stop; applying the candidate to the user's files needs their word, and a
diff they have read is what earns it.

## Reference

- The loop, the routing, and when to stop: [loop.md](references/loop.md).
- The three decisions before any sentence: [stages.md](../rethink/references/stages.md).
- The writer brief, the judging sheet, and how the winner absorbs the losers:
  [bake-off.md](references/bake-off.md).
- The checks, as scripts with a planted-violation self-test: [scripts/](scripts/) — `selftest.mjs`,
  `rule1.mjs`, `dup.mjs`, `sections.mjs`, `ledger.mjs`, `round.mjs`.
- The rules, fixed: [writing-rules.md](references/writing-rules.md).
- The third pass, fixed: [curse-of-knowledge.md](references/curse-of-knowledge.md).
- Run file and ledger formats: [ledgers.md](../audit/references/ledgers.md).
- Evidence levels and the rule on guarantee words: [truth-pass.md](../audit/references/truth-pass.md).
