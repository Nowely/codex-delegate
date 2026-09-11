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
- A third skill, `calibrate`, which measures which forms of writing a particular person prefers by blind
  paired choice with repeated items, and turns the result into rules a writer can follow and a known
  error rate for each model judge. It exists because a right answer and a text somebody would rather
  read are different measurements that sometimes disagree. Its arithmetic was written down before its
  first run, got two figures wrong, and was rebuilt from three independent reviews: twenty-eight decisive
  answers per factor once the family-wise rate across three factors is controlled, one item per source
  passage because shared sources destroy the error rate, four response categories, and a held-out set
  that holds out sources rather than item identifiers. The whole plan is 249 decisive answers, about 285
  presentations, roughly five hours across sessions. A preference never overrides a measured
  comprehension failure: the gate is lexicographic, not a tiebreak.
- `skills/calibrate/scripts/session.mjs`, which runs a session as a local page. The side mapping stays in
  the server process, so nothing in the page or its devtools reveals which side carries which variant;
  each answer records its timing, its position, the side it was shown on and an optional comment; the
  file is written after every answer, because a five-hour measurement that cannot resume will not
  finish. A malformed request costs one answer and never the run.
- `research/2026-09-10-chain/`, the evidence every 2026-09-10 claim rests on, which until now lived in a
  directory under no version control and was named nowhere here. The two blocks `revise` reproduces byte
  for byte now carry the SHA-256 of their own text.
- The numbers this plugin publishes now carry their sample size and their uncertainty, in `README.md` and
  in every reference that quotes them. The plugin's own rule — no number without an n and an interval —
  applies to the plugin.
- The first real bank, 139 items, is in `research/2026-09-11-calibration-bank/` rather than inside the
  plugin: the method ships, the passages do not, because a bank is built from the documentation the
  person actually works on. Ten writers across five engines, each writing both sides of its own pairs
  from disjoint blocks of source. A blind check by ten more readers, who were told neither the factor nor
  which side was which, then measured how single-factored the items really are: 90% for answer-first, 52%
  for metaphor, **30% for promotional tone**, which confirms the doubt `item-bank.md` had already
  recorded about that instruction.
- Building that bank found two defects in `session.mjs` that a four-item fixture could not show, and both
  are fixed. Groups of unequal size were dealt one per round, which put every whole-text item in the
  opening third; each group is now spread across the whole session, with the six Latin orders still
  deciding precedence between the equal-sized factors. A repeat whose original fell near the end was
  clamped next to it — a gap of two trials in a 144-trial run — so repeats are now drawn only from
  originals with room behind them, a bank nominates more candidates than it needs, and the tool says so
  when it cannot place them all.
