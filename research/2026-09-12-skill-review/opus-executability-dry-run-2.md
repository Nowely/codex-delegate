# Opus — executing `/terse:rewrite` from its text, dry run 2 (2026-09-12, on commit 7036878)

Same prompt as the first dry run, on the restructured text, with the run directory named as already holding rounds.

## Reading cost

- **677 words** of SKILL.md (lines 1-76) before the first world-touching action, the announcement; **1,867** with the skeleton the user named; **≈2,769** for an executor who assembles step 2 first (writing-rules 489, curse-of-knowledge 413); **≈4,100** before the first seat launches (critic-briefs 1,139, loop.md:30-43, round.mjs's header). The first run needed 9,650.
- Read and changed no action: `bake-off.md` in full (dead on the resume route, yet SKILL.md:49-50 sends there); `loop.md:9-29, 44-102, 117-145`; `writing-rules.md:27-51`; `curse-of-knowledge.md:22-42`; `truth-pass.md:21-79`; `ledgers.md:7-89`; `selftest.mjs` (read to learn whether it writes).
- Needed and searched for: what drives a resumed round (route table only); the `edits/NN.json` contract (a script header); the `rounds.md` row shape (reconstructed from the file); which `--cut`/`--except` values to pass.

## The nineteen prior gaps

Closed (11): resume branch; accuracy-floor wordings; judging sheet on the skeleton route; selftest in the step list; rule1 arguments; concepts.json authored; the impossible fix rule; critic briefs; readers × questions; task-gate size; gate seats = wave seats.

Not closed or partly (8): skeleton route without a run file (route closed, contradicted at SKILL.md:55); whole-document vs per-section writer brief; writer/judge cost (now a required disclosure, no figures); `<NN>-<pass>.md` vs `<NN>.md` in the checks; `$S` fallback is the literal `/path/to/…` and `CLAUDE_PLUGIN_ROOT` was unset (measured); `budgets.json` specified but absent, unhandled ENOENT (measured), 7 skeleton budgets against 10 headings; `CLAUDE_CONFIG_DIR` named, the recipe unstated; the structure map's trigger only in loop.md.

## Nineteen new gaps

Route table: the skeleton row and the run-directory row both match the stated state (1). Step 4 has no announce-and-wait of its own (10). Step 2 on a resumed run (2). "its findings join part 5 of the brief" on a route where part 5 does not exist (3). Pass names are unspecified (E). The ledger command contains an ellipsis (9). Inherited failures of the previous round: block or finding (8). Lens 4's tasks and lens 5's questions have no author (11); lens 5's count has no source (12). The seat skill is named, not pathed (13). Wave minimum: lenses 1 and 2 vs one seat per lens (18). `rounds.md` has no row format (14). The curse-of-knowledge inventory is a promised artifact not in the return list (15). Map trigger (16). No cap (17). Where the diff goes and who applies it (19). `$S` fallback (6); rule1 headings (7); budgets (4); file names (5).

Most confusing sentence: SKILL.md:54-55, "On a document that already exists, the first thing that runs is the adversarial whole-document read … its findings join part 5 of the brief" — part 5 declared absent fifteen lines earlier; "first" contradicts the route table; "the table below" is sixty lines later.

## What changed after this run (commit following 7036878)

All nineteen closed in the text: route precedence; announce-and-wait in step 4.5 with the minimum stated; step 2 not reassembled on a resumed run; the part-5 sentence rewritten per route; pass names by example; `$S` defined by where the file is; `budgets.json` keyed to the document's own headings with added sections budgeted and written back into the skeleton; `tasks.json` and `questions.json` authored once per document, reused on a resumed run; the ledger command as `$(ls [0-9][0-9]-*.md | sort)`; inherited failures are findings, not blocks; the seat skill pathed; the isolated-config recipe in critic-briefs.md; the `rounds.md` row format; the inventory, the map's trigger, the cap and `diff-NN.patch` in the return list; `sections.mjs` reports a missing budgets file instead of throwing; the skeleton-route brief writes the whole document. Not re-measured.
