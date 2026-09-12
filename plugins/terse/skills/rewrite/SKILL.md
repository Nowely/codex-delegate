---
name: rewrite
description: >-
  Writes the text in rounds: one candidate, then critics with lenses that differ, then edits declared
  with the check behind each, until the owner reads a round and says whether they would send it as it
  is. Starts from a skeleton `rethink` agreed, or from the failures an `audit` measured. Proposes; writes
  into your tree only on your word.
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
| neither | say so, offer `/terse:audit` or `/terse:rethink`; if the user declines both, continue on your own guesses and say so in the report | — |
| a run directory with rounds in it already | step 4, at the next round | the last round's review |

Why it is rounds and not a pass, and the measurements behind every rule here:
[loop.md](references/loop.md) and [measurements.md](references/measurements.md). Neither is needed to
act; this file is.

## Step 1. The measurement, where there is one

Ask the user for the run directory from `audit` and read `audit.md` there. You need two headings:
**Reader profile** and **What broke**. The contract is in [ledgers.md](../audit/references/ledgers.md).

## Step 2. The brief

Assemble it once, for every writer, in this order. On the skeleton route parts 2 and 5 do not exist;
say so in the report rather than inventing them.

1. **The skeleton**, if there is one — its purpose, exclusions and budget for the section being written,
   unedited.
2. **Who reads this** — the profile from the run file, unedited.
3. **The writing rules** — [writing-rules.md](references/writing-rules.md), copied in as written.
4. **The curse of knowledge** — [curse-of-knowledge.md](references/curse-of-knowledge.md), likewise.
5. **Where the readers failed** — the entries under *What broke*, each with its line, its cause and its
   quote, plus the passages that worked and must not be damaged.
6. **The accuracy floor**: every statement about behaviour must be true of the code in this checkout,
   and the writer records the level of evidence it reached — the three levels are in
   [truth-pass.md](../audit/references/truth-pass.md#three-levels-of-evidence). A claim about a lifecycle
   (what stays, what is removed, what a continued or retried run sees) at level 2 is a guess: run it.

Copy the fixed parts; do not paraphrase them. The wording a seat receives is in
[bake-off.md](references/bake-off.md); do not write a third.

## Step 3. The first candidate

On a document that already exists, the first thing that runs is the adversarial whole-document read
(lens 3 in the table below) with the right to run the code; its findings join part 5 of the brief. Then
the bake-off: three writers, one whole candidate each with a different stance, and two judges — the
briefs and the judging sheet, for both routes, are in [bake-off.md](references/bake-off.md). That is the
only bake-off; every round after it edits the round before.

Announce before spawning: the count, the models, and that the cost of a writer or a judge has not been
measured (the critics' costs have; see the table). Wait for the user's word. If the user refuses the
fan-out, write one candidate yourself from the same brief and report that the comparison was skipped.

## Step 4. The rounds

Work in a run directory of the document's own — `research/<date>-<slug>/` in the repository that
holds the document; `audit` writes its run file elsewhere, and you copy `audit.md` in. Every round is
its own file, `NN-<pass>.md`, named for the pass that produced it; the original is `00-…`, the first
candidate `01-…`. Set `S` to the scripts once:

```bash
S="${CLAUDE_PLUGIN_ROOT:-/path/to/agent-skills/plugins/terse}/skills/rewrite/scripts"   # installed, or a checkout
node "$S/selftest.mjs"      # once per session: every check against its planted violation
```

Every command below runs with the run directory as the working directory.

1. **Once per document**, write `concepts.json` — one regex per idea the document carries, for the
   duplication count — and `budgets.json`, each heading mapped to the skeleton's budget; copy in
   `skeleton.md`. `ledger.json` starts empty and grows from the rounds.
2. **Write `edits/NN.json`**: for each edit the exact `old` text, which must occur once; the `new` text;
   `claims` it introduces and `retire` phrasings it removes as false; and `check` — `{"level": 1|2|3,
   "how": "command or file:line"}` — required whenever the edit carries claims. The format is the header
   of `round.mjs`.
3. **Produce the round**: `node "$S/round.mjs" <NN-1>-<pass>.md <NN>-<pass>.md edits/NN.json --ledger ledger.json`.
4. **Run the checks**, before any critic:
   - `node "$S/rule1.mjs" <NN>.md --cut "<technical section heading>" --except "<section that may carry paths>"` — the rule that keeps mechanism out of the sections a reader meets first, with the document's own headings;
   - `node "$S/dup.mjs" <NN>.md concepts.json` — one idea, one home;
   - `node "$S/sections.mjs" <NN>.md budgets.json` — words per section against the budget;
   - `node "$S/ledger.mjs" ledger.json 00-….md … <NN>.md` — the ratchet; exit 1 when the new round loses a verified claim or revives a retired phrase.
   A failure here is fixed before the critics see the round: remove the round file, fix `edits/NN.json`,
   regenerate. A round is frozen the moment its critics launch, not before.
5. **Launch the critics**, one seat per lens, with the briefs in
   [critic-briefs.md](references/critic-briefs.md); then the dedup seat over their reports, kept under
   `reviews/NN/`. The Codex lenses need the `codex-delegate` plugin; without it, run those lenses on
   Claude agents and say so.
6. **Verify every finding yourself** from the check it carries — a finding without one is discarded —
   and route each by the table in [loop.md](references/loop.md#where-a-finding-goes): a sentence to the
   next round's edits, a boundary or a term back to `rethink`, a code defect to the repository's
   `ISSUES.md`, a question the document does not answer to the user.
7. **Record the round** in `rounds.md`: what produced it, its words, the findings against it, and **its
   regression count** — the sentences it introduced that its critics showed false or overstated. That
   number is the round's verdict.

The lenses are fixed; the sizes are the user's, and the announcement names them. Costs are what one
wave measured on 2026-09-12 on a 1600-word README:

| Lens | Reads | Where it ran best | Size | Cost |
|---|---|---|---|---|
| 1. the code, with the right to run it | every behavioural claim; level 3 for anything about a lifecycle | Claude Opus | one | ~180k tokens, 17 min |
| 2. the mechanical rules and the water | the skeleton's rules as a grep would; words whose score does not pay | Claude Opus | one | ~70k tokens, 7 min |
| 3. adversarial, whole document | every sentence a reader acts on; scope words; CLI experiments in an isolated config | Codex gpt-6-astra | one | ~40 commands, 5 min |
| 4. a task | a starting state and a goal, acted on from the document alone; the resulting state | Codex gpt-5.6-sol | two | ~20 commands, 5 min each |
| 5. a reader's question | one question, one `cat` and nothing else; where they guessed | Codex gpt-5.6-luna | one per question | ~1 min each |
| 6. dedup and rank | every report above, into one list with a reproducible check per finding | Claude Fable, after the rest | one | ~160k tokens, 15 min |

Lenses differ; they are not disjoint, and a finding three of them raise is confirmed, not counted three
times.

## Step 5. The gate, and the stop

Before the user reads a round, three things, none tradeable against another:

- **no regression in the round**: the ledger passes, and no sentence the round introduced was shown
  false or overstated by its critics;
- **the task gate**: lens 4's two readers achieved their goals, and the sections no task reached are
  named;
- **the question readers**: lens 5, one per question, answered from the document; where they guessed is
  listed.

**The loop stops when the user reads the round and says whether they would send it as it is.** Two
consecutive rounds with no regression is the signal to hand a round over, not a finish. Then stop:
applying the candidate to the user's files needs their word, and a diff they have read is what earns it.

## Step 6. What you return

In the run directory:

- every round as its own file; `edits/NN.json`, `ledger.json`, `concepts.json`, `budgets.json`
- `skeleton.md`, kept current with every decision taken after it was agreed — a section added, a fact
  restored, a budget changed
- `rounds.md`, one row per round; `reviews/NN/`, every critic's report and the dedup, verbatim
- the diff of the last round against the original; the cut ledger — every removed passage of twenty
  words or more, with its reason; the sections no task reached; and, when one was made, the structure map

Formats for the ledgers are in [ledgers.md](../audit/references/ledgers.md).

The safeguards are the last lines of [writing-rules.md](references/writing-rules.md) and override the
rest of the rules wherever they collide: never cut a condition, a limit or a warning where a reader
decides; repetition at an independently read decision point is not redundancy; a dated measurement
keeps its date and its numbers.

## Reference

- Why rounds, the routing of findings, the ledger, the map and the checks: [loop.md](references/loop.md).
- The measurements behind every rule here, dated: [measurements.md](references/measurements.md).
- The three decisions before any sentence: [stages.md](../rethink/references/stages.md).
- Writer briefs and judging sheets, both routes: [bake-off.md](references/bake-off.md).
- Critic briefs, one per lens, and the seat header: [critic-briefs.md](references/critic-briefs.md).
- The checks as scripts with a planted-violation self-test: [scripts/](scripts/).
- The rules, fixed: [writing-rules.md](references/writing-rules.md); the third pass, fixed:
  [curse-of-knowledge.md](references/curse-of-knowledge.md).
- Run file and ledger formats: [ledgers.md](../audit/references/ledgers.md); evidence levels:
  [truth-pass.md](../audit/references/truth-pass.md).
