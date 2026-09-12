# The calibration bank, built 2026-09-11

139 items for `terse`'s `calibrate` skill: 120 single-factor pairs, 12 code-comment items offering three
ways to write one comment, and 7 whole-text pairs. `bank.json` is what the session tool reads.

`build/` holds the scripts that produced it and the source partition they produced it from. It is a
record, not a rebuild: `assemble.mjs`, `merge-v2.mjs` and the two `gen-*` task writers read writer output
under `/tmp` that is not kept here, so a rebuild means running the engines again. Three do run against
`bank.json` as it stands and should be re-run after any edit to it — `verify.mjs` for the balance and
span properties, `fidelity.mjs` for whether an item really comes from the lines it cites, and
`mkcheck.mjs` with `manipulation-check.workflow.js` and `score-check.mjs` for the blind check.

Run it with:

```bash
node research/2026-09-11-calibration-bank/tool/scripts/session.mjs \
  --bank research/2026-09-11-calibration-bank/bank.json \
  --out <somewhere outside the repository>/session.json --participant <name> --seed <n>
```

## The frame

**English project documentation in this repository.** The estimand travels with the bank and does not
leave it: results describe one person, on passages from these files, and say nothing about other people
or about text from anywhere else. The decision to build no Russian items is recorded in
[item-bank.md](tool/references/item-bank.md).

| | Files | Words |
|---|---|---|
| Discovery — items are built from these | `plugins/codex-delegate/**` (13 `.md`), `chain/{cut-ledger,audit,README,invisible-prerequisites}.md` | ~39,900 |
| Whole-text pairs | `chain/00-original.md` against `chain/03-prerequisite-pass.md` | 2,725 each |
| Held out, pinned at commit `d66a2ef` | `plugins/terse/**`, `research/2026-09-11-terse-survey/**` | ~55,000 |

The hold-out is by **whole file**, so a passage's relatives are held out with it rather than by a
judgement call per passage. `plugins/terse/**` is excluded from sources entirely: those files were being
edited and argued over the same week, and a passage the person has just rewritten is not a passage they
read fresh.

## How it was built

Ten writers across five engines. Each engine wrote **both sides of its own pairs**, so the voice is
constant where the comparison happens, and the rotation is balanced within each factor, so engine and
factor are not confounded.

| Engine | Workers | Items each |
|---|---|---|
| `gpt-6-astra` | 1 Codex seat | 24 + 3 code-comment |
| `gpt-5.6-sol` | 1 Codex seat | 24 + 3 code-comment |
| `gpt-5.6-terra` | 2 Codex seats | 12 + 12, 3 code-comment |
| `claude-opus-5` | 2 agents | 12 + 12, 3 code-comment |
| `claude-sonnet-5` | 4 agents | 6 each |

The coordinator selected sources and wrote no variant. Source files were cut into 40-line blocks and
dealt round-robin, so **engine and source file are crossed rather than nested** — no engine is tied to
one file, and a weak engine cannot be mistaken for a difficult file. The 124 blocks are disjoint by
construction, which is how one-item-per-source-passage survives ten writers who never spoke.

The whole-text pairs were not written at all. They are the same seven sections of one README before and
after the 2026-09-10 audit-and-revise chain ran on it — a rewrite somebody already did, for their own
reasons, before this measurement existed.

## What was checked, and what it showed

`build/verify.mjs` reports **0 failures**. Engine against factor is exactly 8 in all fifteen cells. No two
items share a source passage — the property the whole arithmetic rests on, since six items on one source
at an intracluster correlation of 0.2 carry a real error rate of 0.167 against a nominal 0.031. Every
word count an engine claimed was recomputed and matched. All 40 promotional-tone pairs are length-matched
within 10%, which is the one confound that would otherwise report length as tone.

`build/fidelity.mjs`: median content-word overlap between an item and the lines it cites is **0.62**. No
engine invented a line number. One item, `astra-tone-3`, sits at 0.23 against a 0.25 threshold; reading it
beside its three source lines shows it is faithful and paraphrased, over a source of only 23 content
words. The threshold is a heuristic with a small denominator, and it is left failing rather than tuned
until it passes.

The whole bank was then run through the real session server end to end — 144 presentations, 139 items
plus 5 repeats — and the recorded session shows exact side balance per factor and all five repeats on the
opposite side the second time.

### The blind manipulation check

Ten `haiku` checkers, each given twelve pairs with **no factor name, no instruction, no variant key**, and
the sides shuffled. Each was asked to describe the difference in its own words first and only then pick a
category. The item ids name the factor — `astra-tone-1` — so they were replaced with opaque tokens; that
leak was caught before the check ran, not after.

It was run three times. The first run measured the bank's first version; the tone and metaphor items were
rewritten because of what it found; the second run measured the rewrite and exposed a flaw in the question
itself; the third measured the rewrite with the question fixed. All three sets of verdicts are kept.

| Factor | Run 1, first version | Run 3, after the rewrite |
|---|---|---|
| answer-first — never rewritten, so a control on the checkers | 36/40 (90%) | 34/40 (85%) |
| metaphor | 21/40 (52%) | **32/40 (80%)** |
| promotional tone | **12/40 (30%)** | **29/40 (73%)** |

**Run 1 found that the promotional-tone items were not single-factored.** Twenty of the forty read as
changing more than one thing at once. `item-bank.md` had predicted exactly this — "nobody has verified
that *state what it does and why it is good* changes tone and nothing else" — and it became measured
rather than suspected.

The objection that the checker leans on a safe answer does not hold. Edit size failed to predict the
verdict — median 0.28 of the pair changed on "more than one" verdicts against 0.25 on single-factor ones —
and answer-first had the largest median edit of the three factors, 0.32, while scoring 90%. How much text
moved and how legible the move is are independent.

### What the rewrite changed

The instruction now carries a mechanical rule: **the two sides differ in exactly one contiguous span of
words and are identical everywhere else**, checked with a diff rather than trusted. Before the rewrite,
nought of forty tone pairs and seven of forty metaphor pairs met it. After three passes — the third
showing each engine the exact spans where its own pair still parted company twice — all forty of each do.

Answer-first is exempt: moving a sentence is a deletion and an insertion, two spans by nature, and 22 of
its 40 pairs have exactly that signature. It was the factor that already read cleanly.

### The question was wrong, and re-asking it was cheaper than arguing

Run 2 put the rewritten items to fresh checkers and returned 58% for tone, with thirteen items filed under
"something else". Reading what those thirteen described settled it: every one named the intended span —
"one describes the benefit, the other describes what the tool does". The category offered was *one adds
justification*, and after the rewrite nothing is added; a benefit clause and a factual clause occupy the
same span. The checkers had nowhere to put the answer they had given.

Adding those thirteen to the twenty-three would have been the exact move `SKILL.md` warns about, where
filtering to the favourable items moved a published judge from 66% to 85%. The category was corrected to
*one side claims a benefit where the other states a plain fact* and the check re-run from scratch: 73%.

One conclusion survives whichever label is used, because it does not depend on one: **"the two differ in
more than one of these at once" went from 20 of 40 tone items to 0.**

### A finding about the checker, not the bank

In run 1 the checkers called one side worse in 52 of 120 items, and the side they called worse was the
`off` side 36 times against 16 — in the same direction in all three factors, though `off` is the plain
version in one and the figurative version in another. That is taste, not a defect count, and it is why
"43% of items have a bad side" appears nowhere above.

Runs 2 and 3 judged **identical items** and disagreed with each other about it: "neither side is worse"
came back 29/32/26 times per factor in one and 21/16/13 in the other. A judgement that unstable between
two passes over the same text cannot gate anything, and is reported here rather than used.

The live hypothesis run 1 left — that the `on` instruction, being the more specific one, simply produced
more deliberate prose — is now largely answered. Once neither side could be rewritten around its span, the
asymmetry stopped being systematic, which puts it down to unconstrained rewriting rather than to the
instructions themselves.

## Two defects in the session tool, found by running a real bank

Both were invisible against the four-item demo fixture, and both were fixed against this one. The same
144-presentation walk measures the before and the after.

**Small item groups landed entirely in the first third.** `buildOrder` dealt one item per group per
round, so with groups of 40/40/40/12/7 the short queues emptied first. It now spreads each group across
the whole session by fractional position; the six Latin orders still decide which of the three
equal-sized factors goes first at each collision, so directed-transition balance survives the change.

**A repeat whose original fell near the end landed next to it.** The copy is placed 8 to 13 positions
later, but the old code clamped that to the end of the array, so an original at trial 141 of 142 took its
repeat at 143. It now draws repeats only from originals with room behind them, and says on stderr when it
cannot place as many as the bank asked for. That warning is why the bank **nominates twelve candidates
for five repeats**: which items fall too late is not knowable when the bank is built.

| Measured over 144 presentations | Before | After |
|---|---|---|
| whole-text, early / middle / late | **7 / 0 / 0** | 2 / 3 / 2 |
| code-comment | **10 / 2 / 0** | 4 / 4 / 4 |
| the three factors | 10–11 / 14–17 / 15–17 | 13–15 / 13–14 / 14 |
| repeat gaps | **[2, 7,** 9, 10, 10] | [9, 9, 10, 10, 11] |

Exact side balance per factor and the opposite-side rule for repeats both survive the change. The demo
fixture now declares `"repeats": 0`: four items have nowhere to put a copy eight trials away, and the
honest answer is to place none rather than to clamp one next to its original.

## Limits to read beside any result

- **Everything here is text the person has already read.** It is their repository. No passage is novel,
  and familiarity is uncontrolled rather than balanced. Excluding `plugins/terse/**` reduces the worst of
  it and does not remove it.
- **The whole-text pairs are not length-matched, deliberately.** 196 words become 349, 260 become 95.
  Matching them would stage a pair that is currently unstaged, and the genuineness is the point of the
  item type. They are also the only items where one side is this plugin's own output, so they test the
  September chain as much as they test the person.
- **Five items cite lines outside their writer's assigned blocks.** None collided with another item, so
  one-item-per-passage holds, but the disjointness was enforced by construction and not by the writers.
- **Eleven tone items and eight metaphor items still do not read as single-factored** to a blind checker,
  even though every one of them differs in exactly one span. A single span is necessary and not
  sufficient: eight metaphor pairs were read as one side simply being written better, which is what
  swapping a phrase for a figure of speech can amount to.
- The metaphor factor's free side used to be "no constraint on figurative language", which does not make a
  figure of speech appear — three pairs came back with no difference a reader could see. It is now told to
  use one, and `item-bank.md` records the change with its reason.
- **The tone factor now substitutes rather than adds.** Both sides carry a clause in the same span; one
  claims a benefit, the other states a fact. That is what makes it length-matched and single-span, and it
  is a narrower question than "does promotional language help", which is what the 27%-of-usability figure
  behind the factor was measuring.

## The run on the owner, and the result

One sitting, 2026-09-11, participant `ruliny`, seed 20260911, 42 answers before the owner stopped;
`session-2.json` beside this file is the record, copied in from the plugin's data directory on 2026-09-12.
Mapped from side to variant with the recorded `onLeft`:

| Factor | n | on | off | tie | unjudgeable | two-sided sign test on on/off |
|---|---|---|---|---|---|---|
| metaphor | 12 | 10 | 2 | 0 | 0 | p = 0.039 |
| promotional tone | 11 | 6 | 4 | 0 | 1 | p = 0.75 |
| answer-first | 14 | 4 | 2 | 1 | 7 | p = 0.69 |
| code-comment | 3 | — | — | — | — | three-way, too few to read |
| whole-text | 2 | 1 | 1 | | | — |

Metaphor separated at 0.05 and not at the Bonferroni level of 0.0167 the plan set for three factors, on
twelve answers of the twenty-eight the plan needed. Tone is undetermined. Answer-first is unjudgeable: eight
of fourteen answers were a tie or a refusal, and the owner said why — "answer-first feels indifferent",
"the choice is between complex and simpler English". Four items were shown twice; none came back with
the same on/off choice both times, three of them because at least one showing was refused. Median time to
a choice: 7.6 s for metaphor, 14 s for tone, 17.5 s for answer-first.

The owner stopped the session with five objections, none of them about an item: the answer-first pairs
felt indifferent; the whole-text pairs "just differ"; the tool restarted instead of resuming; the pairs
read as complex versus simpler English rather than as a single factor; the code-comment items needed
context. The same evening the owner read a ten-section draft and rejected it on nine grounds, none of
them phrasing (`../2026-09-11-markup-round-0/`). **The instrument measures an axis that did not decide
whether that reader would ship a document.** The skill was retired from the plugin on 2026-09-12 and
its tool moved to `tool/` here; the blind-pair machinery is intact for a judge of one round against the
next, if that judge is ever built.
