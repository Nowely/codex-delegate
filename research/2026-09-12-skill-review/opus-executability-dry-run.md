# Opus — executing `/terse:rewrite` from its text, dry run (2026-09-12, on commit 1e3f5b2)

Read in the order the skill sends: SKILL.md → loop.md (link at SKILL.md:23) → ledgers.md (28) → writing-rules.md (49) → curse-of-knowledge.md (50) → truth-pass.md (59) → bake-off.md (78) → scripts/ (180). Nothing was written; only read-only commands run.

## 1. The plan I would execute

**Step A — route.** SKILL.md:17 sends a skeleton-holder to step 2.

**GAP 1 (blocker).** `research/2026-09-11-markup-round-0/` already holds rounds 00–07, edits, ledger, reviews. SKILL.md has no resume branch: SKILL.md:78 "That is the only bake-off. Every round after it edits the round before" vs SKILL.md:141 "Into a run directory of its own — `research/<date>-<slug>/`". Two readings: (a) a new dir and a bake-off from the skeleton, discarding eight rounds; (b) continue at round 08. Guessed (b). Consequence: step 3 is skipped, and with it the only announce-and-wait gate (SKILL.md:74-75) — step 4 launches 11 seats with no gate of its own.

**Step B — the brief (SKILL.md:44-70).** **GAP 2.** SKILL.md:48 requires "the profile from the run file" and :51-52 the entries under *What broke*; on the skeleton route there is no run file (`find research -name 'audit*.md'` → nothing). SKILL.md:31-33 handles "no run file and no skeleton", not skeleton-without-run-file. **GAP 3.** Two verbatim accuracy floors for one "add verbatim" instruction: SKILL.md:56-61 and bake-off.md:89-91, different wordings, against SKILL.md:54 "do not paraphrase them".

**Step C — step 3.** **GAP 4.** bake-off.md:47 briefs a whole document; bake-off.md:83 briefs one section and is titled the skeleton route — 7 sections × 3 writers = 21 seats for one candidate, while SKILL.md:78 calls the output "the first candidate". **GAP 5.** The judging sheet is unscoreable on this route: its primary row (bake-off.md:115) counts measured failures; :114 checks passages the audit recorded; :123 gives judges *What broke*. None exists. **GAP 6.** SKILL.md:74 demands "roughly what it costs"; no cost figure for writers or judges exists (bake-off.md:4 "The cost is real"); SKILL.md:110-116 costs critics only.

**Step D — round 08 (SKILL.md:86-104).**
1. **GAP 7**: SKILL.md:94 lists four scripts; loop.md:338 says every check is tested first; `selftest.mjs` appears only in the Reference list (SKILL.md:180).
2. `edits/08.json` per round.mjs:4-9.
3. `round.mjs` — **GAP 8**: SKILL.md:92 writes `NN-1.md NN.md`, SKILL.md:144 requires pass-named files; the placeholder and the rule cannot both be literal. **GAP 9**: `node scripts/round.mjs …` (SKILL.md:92; loop.md:340-347) is relative to nothing stated; `ls scripts` from the repo root → "No such file or directory"; round.mjs resolves operands against cwd, so no single cwd makes the line work.
4. Checks: **GAP 10** rule1's `--cut`/`--except` exist only at loop.md:342 and rule1.mjs:4-6; which headings to excuse is unstated; the default cut heading matches nothing in today's README. **GAP 11** no step tells me to author `concepts.json`. **GAP 12** "sections.mjs against the skeleton's budgets" — the script takes a file only; the mapping from the skeleton's numbered entries to prose headings is nowhere. Ledger over 00→07: "0 failure(s)". **GAP 13** SKILL.md:95-96 "A failure is fixed in a new `edits/NN.json`; the round file is never touched" — round.mjs:15 refuses to overwrite `NN.md`, so a new edits file cannot regenerate the round.
5. Critics — **GAP 14 (largest)**: there is no critic brief anywhere in `skills/rewrite/`; bake-off.md briefs writers and judges only. I would write 11 briefs from the table's one-line descriptions plus the Codex seat header from `seat/SKILL.md:52-80`. **GAP 15**: SKILL.md:115 five readers × three questions vs SKILL.md:165 "one fresh reader per question"; where questions come from on the skeleton route is unstated. **GAP 16**: "CLI experiments in an isolated config" — `CLAUDE_CONFIG_DIR` appears only inside the anecdote at SKILL.md:119, with no command.
6. Verify and route (SKILL.md:99-101): `ISSUES.md` exists at the monorepo root only.
7. `rounds.md` row.

**GAP 17.** loop.md:162-215 makes a structure map what the outer loop reads, by another author — an extra seat; SKILL.md never mentions it and the artifact list (SKILL.md:143-151) does not collect it.

**Step E — the gate.** **GAP 18**: "two fresh readers" (SKILL.md:162) vs loop.md:288 "One such test per round" vs loop.md:298 "three readers, three tasks". **GAP 19**: whether the gate's seats are the wave's `sol`×2 and `luna`×5 or a second wave is never said.

**Step F — stop.** Present round 08, its diff, the cut ledger; the user's read is the stop (SKILL.md:168, 171).

Files I would create: `08-<pass>.md`, `edits/08.json`, `reviews/08/`, updates to `ledger.json`, `rounds.md`, `skeleton.md` (SKILL.md:146 asks me to edit the file whose agreement is the mandate).

## 2. Reading cost

First world-touching action (the announcement at SKILL.md:74) after **9650 words**: SKILL.md 1954 + loop.md 4064 + ledgers.md 666 + writing-rules.md 489 + curse-of-knowledge.md 413 + truth-pass.md 730 + bake-off.md 1334. Deferring loop.md to step 4: 5586. The first action possible at all — the resume question to the user — after SKILL.md alone: 1954.

Read and changed no action: SKILL.md:37-40 (writing standards measured); SKILL.md:66-70 (the nine-edits anecdote); SKILL.md:118-121 (the thirteen-defects anecdote); SKILL.md:134-137 (two failures this guards against); loop.md:20-52 (pipeline-not-pipeline; the routing table appears again at 57-62 and 375-380 and at SKILL.md:99-101); loop.md:73-98 (do not count rounds as a cost; compression); loop.md:162-192 (the map, dead since SKILL.md never mentions it); loop.md:194-215 (the architect and the map); loop.md:231-258 (one idea one home — dup.mjs does this); loop.md:327-338, 354-368 (grep holes); writing-rules.md:27-47 and curse-of-knowledge.md:22-41 (provenance); bake-off.md:7-15 (measured/not measured); truth-pass.md:27-59; ledgers.md:43-88 (audit-side formats).

Needed and had to search for: the scripts' argument forms (loop.md:340-347, reachable only via the Reference bullet); the critic brief (not found).

## 3. Followable from a checkout?

- `node scripts/…` is relative to nothing; neither the installed form `${CLAUDE_PLUGIN_ROOT}/skills/rewrite/scripts/…` nor a checkout path is given, though codex-delegate's `seat/SKILL.md:52` spells its own.
- Four of six lenses are Codex seats and presuppose codex-delegate; SKILL.md:110-116 states no such condition; the seat needs `CODEX_DELEGATE_STATE_DIR` or `CLAUDE_PLUGIN_DATA` and `${CLAUDE_SKILL_DIR}/scripts/driver.mjs`, none of it mentioned here.
- writing-rules.md:30 and curse-of-knowledge.md:25 cite `research/2026-09-10-chain/chain-source-prompt.txt` "in this repository" — absent from an installed plugin.
- SKILL.md:141-142 "in the repository, never into the audited tree": here one tree.
- Needs the user: SKILL.md:27, 74-75, 106, 168, 171.

## 4. Most confusing sentence

> "A failure is fixed in a new `edits/NN.json`; the round file is never touched." — SKILL.md:95-96

round.mjs:15 exits 1 if the target exists, so a new edits file cannot re-produce `NN.md`; the fix can only land in a later round, which contradicts item 3's place inside the round whose checks just failed, and leaves item 6 recording a round that never passed its own checks. It also collides with loop.md:103-105, which freezes a round only once its critics launch — one step later.
