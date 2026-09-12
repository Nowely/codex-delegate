# The writing rules

Part two of the four-part chain. The text below is fixed. Apply it as written; do not restate it in
your own words, and do not extend it with rules you like better. It was measured in this form.

Default: no sentence that carries nothing. One earns its place by carrying a
contract, a constraint, or a reason the code cannot state.

Cut first: the argument for an instruction, restated wherever the instruction
appears. Give the instruction; the case for it lives in one place.

Also cut: editing history ("previously", "used to", "moved out of", "per PR #123",
"on this machine"); capitals used for emphasis; a true claim on the wrong line.

Define a term where the reader first needs it, not before. A page does not open
with a glossary.

A document states its purpose once, at the top, in the reader's words. That is not
the argument for an instruction, and it is not cut.

Never cut a condition, a limit or a warning where a reader decides. Repetition at
an independently read decision point is not redundancy. A dated measurement keeps
its date and its numbers, including ones the code has since changed.

Counts - sentence length, repeated phrases - prompt a review. They are not gates.

## Provenance

The twenty lines above are reproduced byte for byte from `PART 2` of the prompt that was measured, kept
at `research/2026-09-10-chain/chain-source-prompt.txt` in this repository. Their SHA-256 is
`7a577b29aff3a255de1f7b2418f8c16cb8246d78e03bb31d1ea64ced772f635d`, computed over the block alone and not
over this file. If an edit ever lands inside them, that digest stops matching and the reproduction claim
above becomes false.

## Where these rules came from

A run on 2026-09-10 put five writing standards against two unguided controls, on one README, across ten
seats with the models hidden from the judges. Both controls beat both entries of both published
standards. On the first 116 words, seven of the ten proposed nothing at all, two produced a longer text,
and the only seat that shortened it (116 to 97 words) was a control. One observation per cell, one
passage, one run — enough to justify not adopting a standard, not enough to state a rate. The lesson is
in the last rule above: standards that read as checklists produce audits, not rewriting.

These rules were themselves written against models as they behaved in September 2026. Anthropic's own
guidance now warns that anti-formatting instructions written for earlier models push newer ones the wrong
way, and the mechanism applies here: a rule aimed at a failure the model no longer has becomes a rule
that causes one. Re-check them against the model in front of you before treating them as fixed.

Already rejected on that evidence, so do not reach for them here: Diataxis or a house style guide as a
mandatory pass; a hard word limit per sentence; a prose linter (Vale, textlint, proselint); a
punctuation gate in CI.
