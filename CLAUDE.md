# agent-skills

Claude Code plugin marketplace `nowely`. One plugin per `plugins/<name>/`, each with its own README,
CHANGELOG, tests and evals; release tags are `<name>@X.Y.Z`.

## Rules for this repository

- **Defects found in passing go in `ISSUES.md`** at the root: file:line evidence, an evidence level, and
  wording that can become an issue unchanged. Do not fix a defect in the change that records it. Remove
  the entry when the fix lands and the changelog names it.
- **Evidence levels**, wherever a claim about behaviour is made: 1 — the line resolves; 2 — an
  independent reader of the code would say the same; 3 — the behaviour was made to happen. A claim about
  a lifecycle (what stays, what is removed, what a continuation sees) is level 3 or a guess.
- **Commits** carry one theme each, and the message is a sentence that says what changed and why it was
  worth it. A version bump is its own commit; CHANGELOG entries stay under Unreleased until the release.
  No attribution trailers.
- **Research runs** live under `research/<date>-<slug>/`. Every iteration of a document is its own
  numbered file, never overwritten; a round is frozen once its critics launch; `rounds.md` beside them
  records the findings and the regression count of each round.
- **Frozen blocks**: `plugins/terse/skills/rewrite/references/writing-rules.md` and
  `curse-of-knowledge.md` carry the SHA-256 of their own text. Check it after any edit or move nearby; a
  change to the text changes the measurement it was made under, so the SHA line and the note beside it
  are updated together, never the text alone.
- **Fan-outs**: state the agent count and the models before spawning, and wait for the word.
