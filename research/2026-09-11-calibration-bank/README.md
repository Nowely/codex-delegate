# The calibration bank, built 2026-09-11

139 items for `terse`'s `calibrate` skill: 120 single-factor pairs, 12 code-comment items offering three
ways to write one comment, and 7 whole-text pairs. `bank.json` is what the session tool reads.

`build/` holds the scripts that produced it and the source partition they produced it from. It is a
record, not a rebuild: `assemble.mjs` reads writer output under `/tmp` that is not kept here, so a rebuild
means running the ten writers again. `verify.mjs` and `fidelity.mjs` do run against `bank.json` as it
stands, and should be re-run after any edit to it.

Run it with:

```bash
node plugins/terse/skills/calibrate/scripts/session.mjs \
  --bank research/2026-09-11-calibration-bank/bank.json \
  --out <somewhere outside the repository>/session.json --participant <name> --seed <n>
```

## The frame

**English project documentation in this repository.** The estimand travels with the bank and does not
leave it: results describe one person, on passages from these files, and say nothing about other people
or about text from anywhere else. The decision to build no Russian items is recorded in
[item-bank.md](../../plugins/terse/skills/calibrate/references/item-bank.md).

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

`build/fidelity.mjs`: median content-word overlap between an item and the lines it cites is **0.64**, and
nothing falls below 0.25. No engine invented a line number.

The whole bank was then run through the real session server end to end — 144 presentations, 139 items
plus 5 repeats — and the recorded session shows exact side balance per factor and all five repeats on the
opposite side the second time.

### The blind manipulation check

Ten `haiku` checkers, each given twelve pairs with **no factor name, no instruction, no variant key**, and
the sides shuffled. Each was asked to describe the difference in its own words first and only then pick a
category. The item ids name the factor — `astra-tone-1` — so they were replaced with opaque tokens; that
leak was caught before the check ran, not after.

| Factor | Checker named the intended factor |
|---|---|
| answer-first | **36/40 (90%)** |
| metaphor | 21/40 (52%) |
| promotional tone | **12/40 (30%)** |

**The promotional-tone items are not single-factored, and this is the bank's main defect.** Twenty of the
forty read as changing more than one thing at once and six as one side simply being written better.
`item-bank.md` predicted exactly this — "nobody has verified that *state what it does and why it is good*
changes tone and nothing else" — and it is now measured rather than suspected.

The obvious objection is that the checker leans on the safe answer. It does not: edit size fails to
predict the verdict (median 0.28 of the pair changed on "more than one" verdicts against 0.25 on
single-factor ones), and **answer-first has the largest median edit of the three factors, 0.32, while
scoring 90%.** How much text moved and how legible the move is are independent here.

### A finding about the checker, not the bank

The checkers called one side worse in 52 of 120 items, which reads like a defect count and is not one.
**The side they called worse was the `off` side 36 times against 16** — and in the same direction in all
three factors, though `off` means the plain version in one and the figurative version in another. That is
the checker's taste, not a quality report, and it is the reason "43% of items have a bad side" is not
stated anywhere above.

It leaves a live hypothesis, **not proven**: in every factor the `on` instruction is the more specific one,
and a more specific instruction may simply produce more deliberate prose. If so, variant identity
correlates with craft across the whole bank, and all three factors would lean the same way for a reason
that has nothing to do with any of them. The transfer test is where this would show up.

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
- The metaphor factor's `off` instruction is "no constraint on figurative language", which does not
  guarantee a figure of speech appears. Three items were judged to have no difference worth noticing.
