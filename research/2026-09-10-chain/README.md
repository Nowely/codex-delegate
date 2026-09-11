# The 2026-09-10 chain and bake-off

The evidence the `terse` plugin was built on, moved into the repository because it was living in a
directory outside any version control and nothing in the plugin said where to find it. Every measured
claim in `plugins/terse/references/prior-art.md` dated 2026-09-10 traces here.

## Why this had to be copied

`plugins/terse/skills/revise/references/writing-rules.md` and `curse-of-knowledge.md` each carry a block
reproduced byte for byte from `chain-source-prompt.txt` below. Until now that provenance could only be
checked against a folder on one laptop. The two files now also carry the SHA-256 of their own block, so
drift is detectable even where this archive is not.

## `chain/`

The four-pass rewrite of one README, stage by stage, and the artifacts it produced.

| File | What it is |
|---|---|
| `00-original.md` | the README as it stood, 2,725 words |
| `01-reader-pass.md` | after the reader profile, 2,482 words |
| `02-writing-pass.md` | after the writing rules, 2,377 words |
| `03-prerequisite-pass.md` | after the curse of knowledge, 2,482 words |
| `README.md` | the final result after repairing the measured reader failures, 2,571 words |
| `audit.md` | 540 lines: the invisible-prerequisite inventory, the six reader repairs, and the claim ledger C01–C67 that `skills/audit/references/ledgers.md` takes its entry format from |
| `cut-ledger.md` | every removed passage of twenty words or more, with its reason |
| `invisible-prerequisites.md` | the twenty-four items the third pass found |
| `chain.diff`, `README.diff` | the full diffs |
| `audit.json`, `audit-data.json`, `return.json`, `validation.json` | the same material structured, as returned |
| `build_audit.py` | the script that assembled the audit |

The word counts above are the measured ones: the second pass cut 105 words and the third added 105 back
as missing framing, which is why the net change across the whole chain is six percent and the claim that
this plugin compresses text is false.

## `run-2x5/`

Forty Codex seat returns from that day, one `.answer.md` and one `.prompt.txt` each, plus `index.json`
with the model, exit code and command count per seat. Thirty-four ran on `gpt-6-astra`, five on
`gpt-5.6-sol`, one on `gpt-5.6-terra`.

The seats are **not labelled by role**. Reading one means opening its prompt. A crude classification of
the prompt text suggests writers, judges, readers and a remainder that is none of those, but that is a
guess from keyword matching and is recorded here as a guess, not as an index.

This is the raw material behind the finding that decided most of the plugin's shape: five published
writing standards put against two unguided controls, models hidden from the judges, both controls
winning. If that finding is ever challenged, it is challenged here.

## What was left behind

The source directory also held release-note drafts and a work-in-progress copy of the plugin, neither of
which is evidence for anything. The per-seat `report.json` files were reduced to their answers; the
driver metadata they also carried — token counts, timings, sandbox settings — is not evidence about
documentation and was dropped.
