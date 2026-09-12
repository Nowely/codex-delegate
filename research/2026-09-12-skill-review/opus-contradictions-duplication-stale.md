# Opus — contradictions, duplication and stale references across the terse skill files (2026-09-12, on commit 1e3f5b2)

Base for all paths: `plugins/terse/`.

## 1. Contradictions (25)

1.1 The gate is defined four times, differently: `rewrite/SKILL.md:157` (three checks); `loop.md:134-137` (two conditions over two waves); `loop.md:149` (two gates: file+line per claim, mechanical rules); `loop.md:282` and `:215` (the gate is a task; the map does not accept).
1.2 No-regression window: "the last round" (`rewrite/SKILL.md:159`) vs "the last two waves" (`loop.md:136`).
1.3 One bake-off (`rewrite/SKILL.md:78`) vs each block written several ways (`loop.md:9-10`).
1.4 Outer loop first on an existing document (`loop.md:64-65`) vs the first candidate from a bake-off (`rewrite/SKILL.md:77`); every audit-route run starts from an existing document.
1.5 Minimum lens count: "three — code, rules, water" (`loop.md:34-36`) is two seats in the table (`rewrite/SKILL.md:112` merges rules and water).
1.6 Task-gate size: one (`loop.md:288`), two (`rewrite/SKILL.md:161`; `audit/SKILL.md:105`), three (`loop.md:298`).
1.7 Word count is the tiebreak (`bake-off.md:14`, `:118`) and never selects (`bake-off.md:128-129`).
1.8 The skeleton route has no scoreable judging sheet (`bake-off.md:78` vs `:123`, `:128`).
1.9 Neither artifact: "run one first" (`rewrite/SKILL.md:19`) vs "continue" (`:31-32`).
1.10 Four causes (`ledgers.md:87`, `measure.md:89`) vs five (`audit/SKILL.md:127`).
1.11 Audit "six steps" (`audit/SKILL.md:13`) vs Step 5b (`:103`).
1.12 The score is right/questions (`audit/SKILL.md:115`) vs the difference from the no-document arm (`:92`; `measure.md:73`).
1.13 Run artifacts under `$CLAUDE_PLUGIN_DATA` (`audit/SKILL.md:33`, `:40`) vs `research/<date>-<slug>/` in the repository (`rewrite/SKILL.md:141`).
1.14 README "the other two" (`README.md:40`) vs four skills (`:7`).
1.15 README three failure kinds (`README.md:21-23`) vs five causes.
1.16 "All four skills announce" (`README.md:48`) — calibrate has no announce instruction (grep).
1.17 README "file and line behind every behavioural claim" (`README.md:36`) vs the level, not the line (`rewrite/SKILL.md:60-61`).
1.18 CHANGELOG Unreleased: two skills (`:10`, `:14`), a third (`:27`), the split (`:86`), four (plugin.json).
1.19 CHANGELOG old stopping rule (`:121-122`) and new (`:180-182`).
1.20 Writer brief hard-codes six readers (`bake-off.md:53`) vs five to eight (`audit/SKILL.md:67`).
1.21 `check` mandatory in prose (`rewrite/SKILL.md:89-90`), optional in the tool (`loop.md:349-350`; `round.mjs:29`).
1.22 The skeleton's handover file has no agreed name or place (`rethink/SKILL.md:72`; `rewrite/SKILL.md:146`; `ledgers.md:3-4`).
1.23 The coverage column the map does not have (`loop.md:306-307` vs `:170-177`).
1.24 One regression fails the loop (`loop.md:78-79`) vs the gate looks back one round (`rewrite/SKILL.md:159`).
1.25 2,725 words (`README.md:64`) vs 2726 (`stages.md:34`).

## 2. Duplication (13)

2.1 Safeguards: `writing-rules.md:21-25` (canonical, copied into briefs), `rewrite/SKILL.md:127-137`, `README.md:68-70`, `bake-off.md:68-70`, `:96-98`, `:114`.
2.2 Accuracy floor and levels: `truth-pass.md:8-19` (canonical), `rewrite/SKILL.md:56-70`, `bake-off.md:60-73`, `:89-98`, `loop.md:42-46`, `:107-125`; the same anecdote at `SKILL.md:63-70` and `loop.md:42-46`.
2.3 "A lifecycle claim at level 2 is a guess": five homes (`rewrite/SKILL.md:64-66`, `:91`, `bake-off.md:73`, `:91`, `loop.md:117-121`).
2.4 "That number is the verdict; findings are its yield": `loop.md:101`, `:123`, `rewrite/SKILL.md:104`.
2.5 The routing table: `loop.md:54-62`, `:370-380`, `rewrite/SKILL.md:99-101` (only the last has the ISSUES.md row).
2.6 "Never ask a reader whether the text was clear": `audit/SKILL.md:98-101`, `measure.md:62-65`, `README.md:83-85`.
2.7 Controls and the planted question: `audit/SKILL.md:73-78`, `measure.md:20-26`.
2.8 The no-document arm: `audit/SKILL.md:90-96`, `measure.md:70-81`, `README.md:92-96`.
2.9 The task gate and "commit or stash": `loop.md:260-313`, `audit/SKILL.md:103-112`, `rewrite/SKILL.md:161-163`.
2.10 The nine objections: `stages.md:37-64`, `rethink/SKILL.md:17-21`, `calibrate/SKILL.md:25-39`, `README.md:27-30`, `CHANGELOG.md:129-137`.
2.11 "Five standards lost to two controls" and 3/6→6/6: `writing-rules.md:35-47`, `rewrite/SKILL.md:35-40`, `README.md:86-89`, `bake-off.md:7-15`, `measure.md:3-6`, `:125-128`.
2.12 "One idea, one home": `loop.md:231-258` and `dup.mjs:2-6`.
2.13 The lexicographic gate: `calibrate/SKILL.md:17-20` and `scoring-and-transfer.md:160-164`.

## 3. Stale references (14)

3.1 "the four parts assembled in Step 2" (`bake-off.md:44`) — five. 3.2 "the four passes below" (`rewrite/SKILL.md:35`) — five items. 3.3 "Part two/three of the four-part chain" (`writing-rules.md:3`, `curse-of-knowledge.md:3`, `reader-profile.md:3`). 3.4 `edits.json` (`loop.md:346`) vs `edits/NN.json`; `NN-1.md NN.md` vs pass-named files. 3.5 "rule 1" in `rule1.mjs:2` and `loop.md:332`, `:366` names the wrong rule of `stages.md:268-294`; defaults hard-code one document's headings. 3.6 `sections.mjs` takes no budget. 3.7 The illustrated `dup.mjs` header row does not exist. 3.8 "Seven content rules" (`CHANGELOG.md:136`) — ten. 3.9 "byte for byte from PART 2" — the target is indented four spaces; the SHA claims hold. 3.10 "The four are defined in Step 6" (`measure.md:90`) — five. 3.11 `revise` in `CHANGELOG.md:12`, `:43-44`. 3.12 `plugin.json` 0.1.0 with only an Unreleased section. 3.13 Provenance paths resolve only in the monorepo. 3.14 `ledgers.md:53` example path is not a path in this checkout.

Checked and matching: every markdown link target; both anchors; ledgers.md's eight sections; the six script names; ISSUES.md and CLAUDE.md exist; the lens table sums to eleven.

## 4. What an executor cannot find

- How many agents one round costs, on which models: partly, once (`rewrite/SKILL.md:106-116`); the required size is nowhere; bake-off and gate seats are counted in no total.
- The gate before the user reads: `rewrite/SKILL.md:157-166`, contradicted three times (1.1) plus 1.2.
- Files in the run directory at the end: `rewrite/SKILL.md:141-153`, incomplete (map, coverage list; edits path conflicts; audit's `$RUN` vs rewrite's dir unstated).
- The writer's brief on the skeleton route: `bake-off.md:76-99`; silently drops parts 2 and 5; no judging sheet.
- Routing to `rethink`: named three times, mechanism nowhere.
- What `round.mjs` requires: `round.mjs:4-9` only; prose disagrees (1.21); the provisional keyword list is documented only in code (`round.mjs:30`).
