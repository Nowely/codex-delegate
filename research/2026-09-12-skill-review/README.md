# Measuring the `terse` skill as a skill, 2026-09-12

The question: can a fresh agent execute `/terse:rewrite` from its text alone, and does the text agree
with itself and with its own record? Three agents on commit `1e3f5b2`, one re-measurement on `7036878`.

## Results

| Measurement | Before | After the restructuring |
|---|---|---|
| words a fresh Opus read before its first action | 9,650 | 677 (SKILL.md alone); ~4,100 before the first seat launches |
| gaps where the text did not say what to do | 19 | 19 new, smaller ones; 11 of the old 19 closed, 8 partly — all 19 new ones then closed in `70c1dcb`, not re-measured |
| largest gap | no critic brief existed anywhere | — |
| contradictions across the skill files | 25 | not re-measured |
| duplicated instructions / stale references | 13 / 14 | not re-measured |

The reports: [opus-executability-dry-run.md](opus-executability-dry-run.md),
[opus-executability-dry-run-2.md](opus-executability-dry-run-2.md),
[opus-contradictions-duplication-stale.md](opus-contradictions-duplication-stale.md),
[astra-method-attack.md](astra-method-attack.md).

**What the architect found (Astra, against the method's own record):** twelve rules that no outcome
could refute — "a round that finds a new class has paid for itself", the compulsory fatal flaw, the
knapsack score with no scoring procedure; fifteen places where the record contradicts the text — a
stopping rule never met, a rule recorded and then broken by its author, a green ledger beside a false
claim; thirteen rules that were one anecdote generalised into a law; an arithmetically wrong sentence
("a zero cannot register a repair"); and a ten-step core that would fit in 500 words.

**What changed (commits `7036878`, `70c1dcb`, `a3c2e80`):** `rewrite/SKILL.md` is the only file needed
to act; `critic-briefs.md` ships one brief per lens; `loop.md` is instruction-only, less than half its
size; every dated measurement lives in `measurements.md`; the ten content rules say whose they are and
gained an eleventh, the owner's, that a qualification is not a fix; `calibrate` left the plugin; the
changelog waits for the release. The checks ship as scripts with a self-test that plants a violation for
each.

## The ruler

The dry-run prompt is the measurement for skill text: a fresh agent, the invocation as the user would
type it, "plan without acting, stop at every gap". It is cheap — ~90k tokens, six minutes — and it found
in one pass what no amount of reading by the author had. Run it before and after any restructuring.

## Not done

`rethink` and `audit` were not dry-run measured. The third dry run after `70c1dcb` was not run. The
frozen blocks (`writing-rules.md`, `curse-of-knowledge.md`) carry generalisations the architect named and
were left as measured.
