# One README, nine rounds: what the rewrite method did and did not do

The question: can the `terse` method produce a document its owner would send as it is? The document:
`plugins/codex-delegate/README.md`, 2726 words. The owner's bar, stated 2026-09-11: "отправил бы как есть"
— no edit they would make. The full record is [rounds.md](rounds.md); this page is the result.

## What happened

| Round | Words | Produced by | Regressions |
|---|---|---|---|
| 00 draft | 2233 | written cold | rejected at §3 on nine grounds, none of them phrasing |
| 01 | 1383 | 10 writers, 5 engines, 3 critics, a skeleton the owner reviewed | — |
| 02 | 1394 | 2 writers, 3 auditors | 1 |
| 03 | 1424 | 1 writer, 9 verified fixes; task readers | 2 |
| 04 | 1439 | 4 fixes; ledger; 2 critics | 1 |
| 05 | 1443 | 3 fixes on the critics' findings | 0 |
| 06 | 1578 | 9 fixes of pre-existing defects | 6 |
| 07 | 1611 | 8 fixes; a wave of 11 critics | 5 |
| 08 | 1711 | 27 checked edits; 3 critics incl. a naive reader | 10 |
| 09 | 1531 | 15 edits under the rule "a qualification is not a fix" | not critic-read; **the owner reads this one** |

**The result about the method.** Every round of fixes introduced regressions, and from 06 the count rose.
Every regression was a sentence about a lifecycle — what stays on disk, what is removed, what a
continuation sees — written from reading a line of code and shown wrong by a critic who ran the code.
Rules recorded after 06 ("level 3 or a guess") did not stop 07 and 08. What did: the owner's rule that a
qualification is an anti-pattern, applied in 09 by saying less and linking the reference. The sections
that regressed were the three that transcribe mechanism, which the skeleton's own rule 2 had forbidden.

**The result about reviewing.** Critics that ran things found what critics that read did not: one
adversarial reader with an isolated `CLAUDE_CONFIG_DIR` found thirteen defects three reading-only reviews
had passed; a wave of eleven found forty-one sentence defects after six rounds of one or two critics. The
most productive single lens was a critic with a stub Codex server killing drivers mid-run. Lenses
overlap; a finding three raise is confirmed, not counted thrice.

**The result about the owner's question.** The first "would you send it" since the draft, from a reader
who had never seen the plugin, on round 08: **not yet** — nothing said how to choose the model or the
rights, and the version pin read as fragility. Neither is a lifecycle sentence. Round 09 answers the
first and softens the second; the owner has not read it.

**Costs.** About 1.5M Claude tokens across rounds 04–09 and the wave, plus some twenty Codex seats; the
wave alone was ~410k tokens and eleven agents in twenty minutes.

## What is in this directory

- `NN-<pass>.md` — every round, never overwritten; `00-draft.md` is the rejected draft, `00-draft-instructions.md` what produced it
- `edits/NN.json` — the edits that produced rounds 04–09, each with the check behind its claims; `round.mjs` reproduces every round byte for byte
- `ledger.json` — 66 claims with the level each was verified at; `concepts.json`, `budgets.json`, `tasks.json`, `questions.json`
- `reviews/07/`, `reviews/08/` — every critic's report and the dedup, verbatim
- `skeleton.md`, `structure-map.md` — the agreed structure and the one block audit
- `diff-09.patch` — round 09 against the original
- `rounds.md` — the row-by-row record, the claim ledger's history, the findings still open

## Still open

The owner's read of 09. Nine codex-delegate defects this run surfaced, in `ISSUES.md` at the repository
root. Level-1 claims 09 inherits from the live README — the memory bound on fan-outs, "likeliest thing to
break", the `--help` path through the marketplace clone — verified by nobody.
