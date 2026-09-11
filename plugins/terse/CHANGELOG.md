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
- Eighty of those items were then rewritten against a rule the first build did not have: **the two sides
  of a pair differ in exactly one contiguous span of words and are identical everywhere else**, checked
  with a diff rather than trusted. Nought of forty tone pairs met it before and all forty do now. The
  blind check, re-run from scratch on fresh readers, moved to 73% for tone and 80% for metaphor, against
  an answer-first control that stayed where it was. `item-bank.md` carries the rule, the measurement that
  forced it, and the changed metaphor instruction — "no constraint on figurative language" does not make
  a figure of speech appear.
- One of those re-runs found the fault in the question rather than the items: thirteen tone pairs were
  filed under "something else" by readers who had just described the intended difference in their own
  words, because the category offered said *adds* justification and the rewritten items substitute one.
  Counting those thirteen as hits would have been the move this plugin warns about, where filtering to
  the favourable items moved a published judge from 66% to 85%. The category was fixed and the check paid
  for again. All three runs of verdicts are kept.
- The first five human answers were spent on the tool rather than on the measurement, and found the worst
  defect in it: **side was the same variable as time.** Sides were assigned by index in a shuffled list,
  and that index also set the running order, so across a 144-trial walk the on-variant sat left 45 times
  against 3 in the opening third and 0 against 48 in the closing one — while the per-factor totals stayed
  an innocent 20/20. Every early answer came from one side, which is exactly what early stopping was
  promised to survive. Sides are now dealt in consecutive pairs after the order exists: 23/25, 25/23,
  24/24 across the thirds, with the totals still exact.
- Three more from the same five answers. The recorded time ran to the moment of posting, so an answer
  with a comment recorded the typing — 286 seconds against 24 for one without; time to the first choice
  is now recorded beside it. A note could not be opened before choosing, though the reason for an answer
  is often what a reader thinks first. The note field did not grow with its text.
- **The session fingerprint guarded the bank and not the scheduler.** A change to the ordering code left
  every identifier in place, passed the check, and would have realigned saved answers to different items.
  It now carries a scheduler version, and the refusal message names both causes.
- Where two sides differ is now highlighted on both of them, computed server-side so it says where and
  never which. It answers a real complaint — both metaphor items in the first sitting came back as ties
  with a note saying the difference was invisible — and it changes the question the session asks, which
  `SKILL.md` now states in place rather than leaving to be discovered.
- `skills/revise/references/structure-first.md`, for a document whose shape is what is wrong rather than
  its sentences. It carries the measurement that forced it: ten sections written at ordinary quality
  were handed to a reader who stopped at the third and returned nine objections, **none of them about
  wording** — every one was about what the document contained, where it sat, or how much of it there
  was. A bake-off that scores whole candidates on phrasing returns the best-phrased document in the
  wrong order, so the structure is decided first, by about ten proposals from deliberately different
  readings of what the document is for, compared together rather than one at a time, with the reader's
  word on the skeleton before a sentence is written. Seven content rules came out of the same reading,
  and they outrank the sentence rules, which are a different layer.
- `calibrate` has been run once and the result is against it, which its own page now says. One person,
  42 answers: one factor separated, one was undetermined, and one was unjudgeable — eight of fourteen
  answers on answer-first were a tie or a refusal. Then the same person rejected a draft on nine grounds
  that this skill cannot see, because it measures which of two phrasings a reader prefers and the
  question was whether the document said the right things in the right order.
- **A white page was the tool's answer to every failure.** Restarting the server under an open tab left
  the fetch rejected, the container never filled and nothing on screen: no cause, no instruction, on a
  measurement meant to run five hours. Every failure now renders what happened, says that answers are
  saved one at a time and are not lost, and offers a reload; a rejected promise or a thrown error
  anywhere on the page reaches the same place. The page is also served `no-store`, because it is edited
  between sittings on one fixed port, and a cached copy is a copy of a different instrument.
- Building that bank found two defects in `session.mjs` that a four-item fixture could not show, and both
  are fixed. Groups of unequal size were dealt one per round, which put every whole-text item in the
  opening third; each group is now spread across the whole session, with the six Latin orders still
  deciding precedence between the equal-sized factors. A repeat whose original fell near the end was
  clamped next to it — a gap of two trials in a 144-trial run — so repeats are now drawn only from
  originals with room behind them, a bank nominates more candidates than it needs, and the tool says so
  when it cannot place them all.
