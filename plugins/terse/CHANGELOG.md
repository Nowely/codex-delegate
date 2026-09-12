# Changelog

Hand-written per release from the tagged git log. Dates are the tagged commit dates; detailed
forensics remain in the repository references and release notes.

## 0.1.0 — 2026-09-12

First release. Three user-invoked skills; none starts on its own, and nothing is written into your
tree without your word.

### Added

- `audit` builds a profile of who reads the project, derives the correct answers from the code, sends
  one fresh reader per question through the `.md` files, and returns a score with the cause of each
  failure. It never suggests wording.
- `rethink` decides what a document should be — what the genre already solved, what things are called,
  what is said in what order — and stops at a skeleton for your word.
- `rewrite` writes against a skeleton or an audit's run file: one bake-off, then rounds of critics whose
  lenses do not overlap, every round kept as its own file, a ratchet that refuses a round that got worse,
  and a stop that is the owner's read. Its checks ship as scripts with a planted self-test; two reference
  blocks are frozen under their SHA-256.
- `references/`: the survey of the field over three rounds. Raw returns and every research run live
  under `research/` in the repository, outside the payload.

### Known limits

- The audit's ruler measures whether a model can answer from the text, not whether a human reader
  improved.
- `calibrate`, which measured one person's preferences, left the plugin for
  `research/2026-09-11-calibration-bank/` with its result.
