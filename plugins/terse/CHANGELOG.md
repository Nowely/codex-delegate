# Changelog

Hand-written per release from the tagged git log. Dates are the tagged commit dates; detailed
forensics remain in the repository references and release notes.

## Unreleased

### Added

- The plugin, with two user-invoked skills. `audit` measures a document: it builds a reader profile,
  derives an answer key from the code, sends one fresh reader per question through the `.md` files and
  scores them. `revise` repairs what the audit measured, through a small bake-off judged on those
  failures. Neither writes into the audited repository without the user's word.
- Both skills carry `disable-model-invocation: true`. They spend real tokens and hold opinions about
  the text; the user decides when they run.
- The method they carry was measured on one repository on 2026-09-10, and the reference files keep the
  dates and numbers. What was measured and what was not is marked in place.
- `references/prior-art.md`, a survey of the field taken on 2026-09-11 across three rounds — sixteen
  Claude agents and twenty-one Codex seats, well over two hundred primary sources opened. It ranks a
  hundred and eight practices with the file and line each lives at, records what is still unread, and
  sits outside `skills/` so no skill pulls it into context. It carries the findings against this plugin's
  own numbers: the headline result is not distinguishable from chance, no arm ever ran without the
  document, and the plugin measures model answerability rather than human improvement. It also records
  that Anthropic's `doc-coauthoring` skill already tests a document with a fresh reader.
- `references/practices-full.md`, all 271 practices the survey returned, unranked and unedited, so a
  judgement to drop one stays reversible.
- The numbers this plugin publishes now carry their sample size and their uncertainty, in `README.md` and
  in every reference that quotes them. The plugin's own rule — no number without an n and an interval —
  applies to the plugin.
