# README rewrite audit

Repository: /Users/ruliny/Git/codex-delegate at ad8cd99a08b944c02b50a40b7111f4dce346e7ad. The checkout was not edited.

The deliverable is README.md in this temporary directory. Intermediate drafts show the ordered chain; only the final README is proposed for use.

## The four passes

### Part 1: Who reads this

01-reader-pass.md: 2725 → 2482 words (-243).

Rewrote the whole page around a Claude Code user's decisions: any-work scope, recommended plugin entry, same-session first task, rights, result inspection and cleanup. Replaced the Goal manifesto and moved maintainer/source material below the main path. Corrected already-confirmed overclaims rather than deliberately retaining them in a draft.

### Part 2: Writing rules

02-writing-pass.md: 2482 → 2377 words (-105).

Cut repeated explanations and framing, reduced the orchestration summary, consolidated first-run prose, and kept state, verifier, cleanup and worktree conditions at their decisions. Removed 105 words from pass 1.

### Part 3: Curse of knowledge

03-prerequisite-pass.md: 2377 → 2482 words (+105).

Inventoried 24 hidden prerequisites. Defined driver, seat, thread, worktree and path placeholders where needed; moved required state before the first task; distinguished optional config, prompt instructions, automated gates, source exports and the repository root. Added 105 words for missing framing rather than more implementation background.

### Part 4: Six reader failures and accuracy floor

README.md: 2482 → 2571 words (+89).

Checked each measured failure against the draft, preserved the rights table verbatim, made the no-command waiver explicit beside exit 0, retained cleanup selection boundaries, and tightened version, worktree, verifier, schema, TMPDIR and upgrade claims against code. Final accuracy/reflow edits are part of this pass.

## Invisible prerequisites

1. **Scope.** The reader may infer that an agent plugin only handles code. Name analysis, document review and designs in the opening.
2. **Two installations.** Claude Code being installed does not establish that Codex CLI is installed and authenticated. Name both, plus Node 22, in the first setup paragraph.
3. **Configuration versus prerequisites.** A reader treats every item under Prerequisites as mandatory. State that creating config.toml is unnecessary at the install decision; describe inheritance under settings.
4. **Entry point.** The reader cannot choose between plugin commands, symlinks and a shell invocation. Recommend the plugin; give a Claude-language first task; label source and terminal routes optional.
5. **Names.** A skill is instructions Claude reads, and a seat is one delegated assignment. Namespace spellings differ between plugin and source installations; show the mapping once.
6. **Process environment.** An export affects programs started from that shell. Plugin recipes forward one state variable; source shells must export another. Missing or relative state means exit 2.
7. **Storage boundaries.** TMPDIR, the plugin state directory and the real ~/.codex are distinct. Scratch writes, saved answers, shared credentials and session records have different locations and cleanup coverage.
8. **Read permission.** Read means a write boundary, not confinement to the chosen folder or denial of network. Retain the rights table and the readable-data/network warning.
9. **Permission notation.** DIR, REPO, cwd and worktree assume shell/Git knowledge. Define placeholders at the table and define the committed snapshot before choosing a worktree.
10. **Worktree starting point.** A fresh checkout does not include unsaved/uncommitted work or installed dependencies. A stash does not change HEAD. Harvesting and final exit are separate.
11. **Instructions versus checks.** TASK/CHECK/RETURN are prose for the model. CLI flags and leading seat-file headers configure the driver; a CHECK sentence is not an executable verifier.
12. **Turn and thread.** A thread is a Codex conversation; the report's command floor counts the main thread, not child agents. A session receipt can predate a resumed turn.
13. **Verdict versus accomplishment.** Exit 0 summarizes implemented checks. A recorded command item may have failed or lack an exit status. Inspect commands and deliverables.
14. **Waiver.** Both --allow-no-commands and ALLOW_NO_COMMANDS: yes permit exit 0 with no main-thread command items; neither cancels --expect-command.
15. **Receipt.** A rollout is a saved session record. Opening metadata proves a matching thread id only. A failed receipt check does not alter the exit verdict; an old session may evade the two-directory search.
16. **Independent checks.** A command-text match and a JSON schema are proxies. A verifier runs with caller rights unless sandboxed and can execute files the seat changed.
17. **Report delivery.** The report file must be absolute and unused. Failure to publish and an absent report cannot be interpreted as task success; neither is a receipt guaranteed.
18. **Lifetime.** No elapsed-time limit does not mean unbounded operation. Silence and command-volume limits still apply; a busy conversation may refuse resume.
19. **Cleanup selection.** Suggested cleanup excludes runs and saved conversations until their numbers are chosen. Selective cleanup is not complete uninstallation.
20. **Cleanup visibility.** Cleanup recognizes only its recorded activity; arbitrary open processes are invisible. It also needs the original temporary root and rejects stale snapshots.
21. **Verification scope.** Fixture tests, live protocol handshakes and real model turns measure different things. Skips are not passes; live-turn opt-ins can spend account usage.
22. **Measurements and comparisons.** Dated parity and official-plugin observations do not prove behavior of today's upstream release. Preserve dates, version numbers and pointers.
23. **Repository-root commands.** A symlinked skill directory is not the repository root. Maintenance commands must start at the checkout/plugin root.
24. **Upgrade order.** The conformance validator rejects unreferenced schema files. Preserve a full schema commit for future diffs, then prune before running conformance.

## Six reader repairs

1. **What is this?** Any work, with analysis/document review/design examples; removed guaranteed-receipt and cannot-fake-success promises; receipt meaning and independence from exit are explicit. Locations: README.md:3, README.md:8, README.md:102.

2. **What must I install?** Names Node 22; says creating config.toml is unnecessary at the install decision and explains optional inheritance under settings. Locations: README.md:12, README.md:211.

3. **How do I run it the first time?** Recommends plugin installation, provides a same-session task, explains critical state before launching, labels source/terminal routes optional, and embeds state in the complete terminal command. Locations: README.md:19, README.md:26, README.md:32, README.md:187.

4. **What may it touch?** Preserves the full rights table byte-for-byte and retains the read/network warning; adds nearby definitions and limits without changing the choice table. Locations: README.md:52, README.md:63.

5. **How do I know the work happened?** Separates a completed turn and applicable checks from task success; states both no-command waivers, root-thread counting, failed/unknown outcomes, metadata-only receipt and gate limitations. Locations: README.md:83, README.md:86, README.md:91, README.md:102, README.md:108.

6. **How do I remove what it left?** Gives cleanup its own heading and one recommended invocation; preserves numbered consent, four removable/four retained categories and liveness limits; unifies state terminology and maps source spellings once. Locations: README.md:133, README.md:148, README.md:171.

## Behavior claim ledger

README locations below refer to the final temporary file. Source paths refer to the unchanged checkout. Code supports implementation behavior; skills support instructions given to Claude. Host CLI recipes and historical measurements are labelled. Citation existence checks are not runtime verification.

### C01 — README.md:3

Any work; per-call rights; structured observed-event report.

Sources: [skills/seat/SKILL.md:4-10](/Users/ruliny/Git/codex-delegate/skills/seat/SKILL.md:4); [skills/seat/scripts/driver.mjs:583-644](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:583); [skills/seat/scripts/driver.mjs:670-705](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:670); [skills/seat/scripts/driver.mjs:3483-3503](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:3483).

### C02 — README.md:8

Exit success and matching receipt do not establish task success.

Sources: [skills/seat/scripts/driver.mjs:232-275](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:232); [skills/seat/scripts/driver.mjs:2914-2955](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:2914); [skills/seat/scripts/driver.mjs:3297-3303](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:3297).

### C03 — README.md:12

Node 22; no package dependencies; CLI resolution and credentials.

Sources: [package.json:1-9](/Users/ruliny/Git/codex-delegate/package.json:1); [skills/seat/scripts/driver.mjs:24-29](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:24); [skills/seat/scripts/driver.mjs:1030-1044](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:1030); [skills/seat/scripts/driver.mjs:1216-1232](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:1216).

### C04 — README.md:13

Codex login-status setup instruction.

Sources: [README.md:41-42](/Users/ruliny/Git/codex-delegate/README.md:41); [skills/seat/scripts/driver.mjs:1030-1044](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:1030).

External CLI recipe, not executed; this checkout does not implement codex login.

### C05 — README.md:14

Creating config.toml is unnecessary.

Sources: [skills/seat/scripts/driver.mjs:1047-1098](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:1047); [skills/seat/scripts/driver.mjs:1252-1284](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:1252).

### C06 — README.md:16

Pinned baseline and warning-only version comparison.

Sources: [skills/seat/scripts/driver.mjs:34-36](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:34); [skills/seat/scripts/driver.mjs:3743-3748](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:3743).

### C07 — README.md:22

Plugin installation names and recipe.

Sources: [.claude-plugin/marketplace.json:1-17](/Users/ruliny/Git/codex-delegate/.claude-plugin/marketplace.json:1); [.claude-plugin/plugin.json:1-9](/Users/ruliny/Git/codex-delegate/.claude-plugin/plugin.json:1); [README.md:60-69](/Users/ruliny/Git/codex-delegate/README.md:60).

Local manifest and existing installation recipe; external plugin-manager behavior not executed.

### C08 — README.md:26

Required absolute state; precedence; early exit 2.

Sources: [skills/seat/scripts/driver.mjs:995-1006](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:995); [skills/seat/scripts/driver.mjs:2026-2065](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:2026); [skills/seat/scripts/driver.mjs:31](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:31); [skills/seat/SKILL.md:27-40](/Users/ruliny/Git/codex-delegate/skills/seat/SKILL.md:27).

### C09 — README.md:27

Plugin forwards data variable; source needs exported alternative.

Sources: [skills/seat/SKILL.md:27-40](/Users/ruliny/Git/codex-delegate/skills/seat/SKILL.md:27).

### C10 — README.md:30

No automatic allow-rule changes is a skill instruction.

Sources: [skills/seat/SKILL.md:60-68](/Users/ruliny/Git/codex-delegate/skills/seat/SKILL.md:60).

The README makes a conditional recommendation about host permission prompts; it does not claim a universal Claude Code permission-mode rule.

### C11 — README.md:36

Seat meaning, skill launch/report instructions and default permissions.

Sources: [skills/seat/SKILL.md:19-40](/Users/ruliny/Git/codex-delegate/skills/seat/SKILL.md:19); [skills/seat/scripts/driver.mjs:670](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:670); [skills/seat/scripts/driver.mjs:2089-2092](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:2089); [skills/seat/scripts/driver.mjs:2152-2172](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:2152).

### C12 — README.md:40

Plugin update instructions.

Sources: [README.md:71-78](/Users/ruliny/Git/codex-delegate/README.md:71); [.claude-plugin/marketplace.json:2](/Users/ruliny/Git/codex-delegate/.claude-plugin/marketplace.json:2); [.claude-plugin/plugin.json:2](/Users/ruliny/Git/codex-delegate/.claude-plugin/plugin.json:2).

Retained host-tool recipe, not a locally executed update or verified update/uninstall guarantee.

### C13 — README.md:49

Working-folder selector and read default.

Sources: [skills/seat/scripts/driver.mjs:670](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:670); [skills/seat/scripts/driver.mjs:685](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:685); [skills/seat/scripts/driver.mjs:751-755](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:751); [skills/seat/scripts/driver.mjs:2102-2104](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:2102).

### C14 — README.md:54

Rights table: read all readable paths; TMPDIR writes; network and commands.

Sources: [skills/seat/scripts/driver.mjs:1989-2015](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:1989); [skills/seat/scripts/driver.mjs:2152-2163](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:2152); [skills/seat/scripts/driver.mjs:2593-2598](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:2593).

### C15 — README.md:55

Rights table: managed detached worktree.

Sources: [skills/seat/scripts/driver.mjs:746-755](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:746); [skills/seat/scripts/driver.mjs:1684-1738](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:1684); [skills/seat/scripts/driver.mjs:1795-1898](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:1795).

### C16 — README.md:56

Rights table: chosen live write folder and extra roots.

Sources: [skills/seat/scripts/driver.mjs:748-755](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:748); [skills/seat/scripts/driver.mjs:1975-1986](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:1975); [skills/seat/scripts/driver.mjs:2089-2104](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:2089); [skills/seat/scripts/driver.mjs:2138-2172](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:2138).

### C17 — README.md:57

Rights table: extra-root opt-in and sandbox network denial.

Sources: [skills/seat/scripts/driver.mjs:694](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:694); [skills/seat/scripts/driver.mjs:701-703](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:701); [skills/seat/scripts/driver.mjs:2091-2092](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:2091); [skills/seat/scripts/driver.mjs:2152-2172](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:2152).

### C18 — README.md:59

Read test-write limit and write-only --writable.

Sources: [skills/seat/scripts/driver.mjs:2091-2092](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:2091); [skills/seat/scripts/driver.mjs:2159-2163](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:2159).

### C19 — README.md:60

Unset TMPDIR creation, existing grant and report tmpDir.

Sources: [skills/seat/scripts/driver.mjs:1137-1158](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:1137); [skills/seat/scripts/driver.mjs:2111-2123](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:2111); [skills/seat/scripts/driver.mjs:3383-3385](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:3383).

### C20 — README.md:63

Network defaults, readable-data exposure and independent search.

Sources: [skills/seat/scripts/driver.mjs:665-670](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:665); [skills/seat/scripts/driver.mjs:2144-2172](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:2144).

### C21 — README.md:68

Reported sandbox/policy assertion and refusal.

Sources: [skills/seat/scripts/driver.mjs:1946-2015](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:1946); [skills/seat/scripts/driver.mjs:3794-3803](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:3794).

### C22 — README.md:69

Approval requests refused and recorded.

Sources: [skills/seat/scripts/driver.mjs:2514-2519](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:2514); [skills/seat/scripts/driver.mjs:2529-2541](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:2529).

### C23 — README.md:71

Fresh worktree HEAD and exclusion of live uncommitted/untracked/ignored files.

Sources: [skills/seat/scripts/driver.mjs:1688-1717](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:1688).

Derived from git worktree add --detach without a commit argument for a fresh seat; stashing does not alter HEAD.

### C24 — README.md:75

Harvest, ignored-file loss, preservation, independent exit verdict.

Sources: [skills/seat/scripts/driver.mjs:1795-1898](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:1795); [skills/seat/scripts/driver.mjs:3297-3303](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:3297); [skills/seat/scripts/driver.mjs:3354-3361](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:3354).

### C25 — README.md:83

Exit 0 contract, applicable ladder, answer required.

Sources: [skills/seat/scripts/driver.mjs:232-275](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:232); [skills/seat/scripts/driver.mjs:3297-3303](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:3297).

### C26 — README.md:86

Main-thread command floor; child commands excluded; failed/unknown items count.

Sources: [skills/seat/scripts/driver.mjs:264-274](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:264); [skills/seat/scripts/driver.mjs:2593-2598](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:2593); [skills/seat/scripts/driver.mjs:2701](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:2701); [skills/seat/scripts/driver.mjs:3092-3100](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:3092).

### C27 — README.md:91

Both no-command waivers; declared expectation remains binding.

Sources: [skills/seat/scripts/driver.mjs:194](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:194); [skills/seat/scripts/driver.mjs:630-637](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:630); [skills/seat/scripts/driver.mjs:697](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:697); [skills/seat/scripts/driver.mjs:264-266](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:264).

### C28 — README.md:97

commands records text/status/exit; failed commands not standalone verdict.

Sources: [skills/seat/scripts/driver.mjs:2593-2598](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:2593); [skills/seat/scripts/driver.mjs:271-274](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:271); [skills/seat/scripts/driver.mjs:3483](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:3483).

### C29 — README.md:98

Failed/unknown/pager counters and limits of piped output.

Sources: [skills/seat/scripts/driver.mjs:3097-3130](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:3097); [skills/seat/scripts/driver.mjs:3404-3411](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:3404).

Pipeline semantics and concrete bypass also recorded in skills/seat/references/result-gates.md:21-26.

### C30 — README.md:99

Answer saving, possible null saved path.

Sources: [skills/seat/scripts/driver.mjs:2968-2977](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:2968); [skills/seat/scripts/driver.mjs:3135-3149](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:3135); [skills/seat/scripts/driver.mjs:3476-3480](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:3476).

### C31 — README.md:100

Receipt report fields.

Sources: [skills/seat/scripts/driver.mjs:3434-3442](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:3434).

### C32 — README.md:102

Receipt window, bounded first-record read, thread id only; false leaves exit unchanged.

Sources: [skills/seat/scripts/driver.mjs:89-92](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:89); [skills/seat/scripts/driver.mjs:2914-2955](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:2914); [skills/seat/scripts/driver.mjs:3297-3303](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:3297); [skills/seat/scripts/driver.mjs:3359-3361](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:3359); [skills/seat/scripts/driver.mjs:3436-3442](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:3436).

### C33 — README.md:108

Seat-file aliases; VERIFY requires explicit CLI opt-in.

Sources: [skills/seat/scripts/driver.mjs:185-197](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:185); [skills/seat/scripts/driver.mjs:603-614](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:603); [skills/seat/scripts/driver.mjs:683](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:683).

### C34 — README.md:112

Expectation requires successful main-thread command text match; bypasses.

Sources: [skills/seat/scripts/driver.mjs:264-266](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:264); [skills/seat/scripts/driver.mjs:3095-3096](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:3095); [skills/seat/scripts/driver.mjs:3118-3126](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:3118); [skills/seat/references/result-gates.md:21-26](/Users/ruliny/Git/codex-delegate/skills/seat/references/result-gates.md:21).

### C35 — README.md:115

Verifier schedule, budget skip blocks exit 0, caller privileges.

Sources: [skills/seat/scripts/driver.mjs:254-257](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:254); [skills/seat/scripts/driver.mjs:3170-3176](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:3170); [skills/seat/scripts/driver.mjs:3186-3193](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:3186); [skills/seat/scripts/driver.mjs:3240-3275](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:3240).

### C36 — README.md:118

Sandboxed verifier write/network limit.

Sources: [skills/seat/scripts/driver.mjs:3170-3176](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:3170); [skills/seat/scripts/driver.mjs:3190-3193](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:3190).

### C37 — README.md:120

Output-schema object/strict requirements, unchecked keywords and factual limits.

Sources: [skills/seat/scripts/driver.mjs:775-831](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:775); [skills/seat/scripts/driver.mjs:3399-3403](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:3399).

### C38 — README.md:125

Driver help inventory and exit ladder.

Sources: [skills/seat/scripts/driver.mjs:232-276](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:232); [skills/seat/scripts/driver.mjs:708-711](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:708).

### C39 — README.md:129

Orchestration workflow is instructions; both modes user-invoked.

Sources: [skills/orchestrate/SKILL.md:1-16](/Users/ruliny/Git/codex-delegate/skills/orchestrate/SKILL.md:1); [skills/orchestrate/SKILL.md:35-54](/Users/ruliny/Git/codex-delegate/skills/orchestrate/SKILL.md:35); [skills/cleanup/SKILL.md:1-6](/Users/ruliny/Git/codex-delegate/skills/cleanup/SKILL.md:1).

### C40 — README.md:135

Cleanup consent, suggestion excludes run/session numbers.

Sources: [skills/cleanup/SKILL.md:25-63](/Users/ruliny/Git/codex-delegate/skills/cleanup/SKILL.md:25); [skills/seat/scripts/cleanup.mjs:862-865](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/cleanup.mjs:862).

Consent behavior is the skill's instruction to Claude, while the script consumes an explicit number list.

### C41 — README.md:141

Cleanup four removable categories, four report-only categories.

Sources: [skills/seat/scripts/cleanup.mjs:846-865](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/cleanup.mjs:846); [skills/seat/scripts/cleanup.mjs:479-507](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/cleanup.mjs:479).

### C42 — README.md:143

Cleanup read/liveness protection, stale snapshot refusal, no age selection or Git.

Sources: [skills/seat/scripts/cleanup.mjs:191-213](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/cleanup.mjs:191); [skills/seat/scripts/cleanup.mjs:377-431](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/cleanup.mjs:377); [skills/seat/scripts/cleanup.mjs:814-869](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/cleanup.mjs:814); [skills/seat/scripts/cleanup.mjs:1035-1052](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/cleanup.mjs:1035); [skills/seat/scripts/cleanup.mjs:1095-1154](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/cleanup.mjs:1095); [skills/seat/scripts/cleanup.mjs:8-24](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/cleanup.mjs:8).

### C43 — README.md:145

Cleanup activity visibility bounded by records.

Sources: [skills/seat/scripts/cleanup.mjs:15-18](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/cleanup.mjs:15); [skills/seat/scripts/cleanup.mjs:397-431](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/cleanup.mjs:397); [skills/seat/scripts/cleanup.mjs:814-865](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/cleanup.mjs:814); [skills/seat/scripts/cleanup.mjs:1035-1052](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/cleanup.mjs:1035).

### C44 — README.md:148

Cleanup state and absolute TMPDIR required; incomplete coverage.

Sources: [skills/seat/scripts/cleanup.mjs:218-258](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/cleanup.mjs:218); [skills/seat/scripts/cleanup.mjs:377-380](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/cleanup.mjs:377); [skills/seat/scripts/cleanup.mjs:479-495](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/cleanup.mjs:479); [skills/seat/scripts/cleanup.mjs:846-865](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/cleanup.mjs:846).

### C45 — README.md:155

Source symlink instructions, existing-link warning and exported state.

Sources: [README.md:80-94](/Users/ruliny/Git/codex-delegate/README.md:80); [skills/seat/SKILL.md:37-40](/Users/ruliny/Git/codex-delegate/skills/seat/SKILL.md:37).

Shell setup instructions are retained; clone/install/symlink creation not executed.

### C46 — README.md:171

Plugin/source invocation spelling.

Sources: [.claude-plugin/plugin.json:2](/Users/ruliny/Git/codex-delegate/.claude-plugin/plugin.json:2); [skills/seat/SKILL.md:1-2](/Users/ruliny/Git/codex-delegate/skills/seat/SKILL.md:1); [skills/orchestrate/SKILL.md:1-6](/Users/ruliny/Git/codex-delegate/skills/orchestrate/SKILL.md:1); [skills/cleanup/SKILL.md:1-6](/Users/ruliny/Git/codex-delegate/skills/cleanup/SKILL.md:1); [README.md:92-94](/Users/ruliny/Git/codex-delegate/README.md:92).

### C47 — README.md:176

Source cleanup placeholder limitation and read-only list fallback.

Sources: [skills/cleanup/SKILL.md:28-29](/Users/ruliny/Git/codex-delegate/skills/cleanup/SKILL.md:28); [skills/seat/scripts/cleanup.mjs:70-93](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/cleanup.mjs:70); [skills/seat/scripts/cleanup.mjs:218-229](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/cleanup.mjs:218).

Placeholder expansion under a source install could not be live-tested; fallback invokes an actual checked-in script.

### C48 — README.md:183

Cleanup help describes snapshot-bound deletion.

Sources: [skills/seat/scripts/cleanup.mjs:70-98](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/cleanup.mjs:70); [skills/seat/scripts/cleanup.mjs:1071-1154](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/cleanup.mjs:1071).

### C49 — README.md:187

Direct example flags, required state, repository-root instruction.

Sources: [skills/seat/scripts/driver.mjs:670-706](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:670); [skills/seat/scripts/driver.mjs:995-1006](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:995); [README.md:131-135](/Users/ruliny/Git/codex-delegate/README.md:131); [package.json:8](/Users/ruliny/Git/codex-delegate/package.json:8).

### C50 — README.md:200

JSON stdout and prose CHECK not an automated gate.

Sources: [skills/seat/scripts/driver.mjs:585-605](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:585); [skills/seat/scripts/driver.mjs:693](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:693); [skills/seat/scripts/driver.mjs:3483-3503](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:3483).

### C51 — README.md:203

Seat-file default rights and background report delivery.

Sources: [skills/seat/SKILL.md:24-40](/Users/ruliny/Git/codex-delegate/skills/seat/SKILL.md:24); [skills/seat/scripts/driver.mjs:645-655](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:645); [skills/seat/scripts/driver.mjs:751-755](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:751).

### C52 — README.md:205

Absolute unused report path, directory mode, complete publication, absent-report interpretation.

Sources: [skills/seat/scripts/driver.mjs:923-963](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:923); [skills/seat/scripts/driver.mjs:3498-3503](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:3498); [skills/seat/SKILL.md:140-141](/Users/ruliny/Git/codex-delegate/skills/seat/SKILL.md:140).

### C53 — README.md:211

Inherited settings and per-call model/effort overrides.

Sources: [skills/seat/scripts/driver.mjs:1047-1098](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:1047); [skills/seat/scripts/driver.mjs:1252-1284](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:1252); [skills/seat/scripts/driver.mjs:2165-2166](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:2165); [skills/seat/scripts/driver.mjs:3776](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:3776).

### C54 — README.md:215

State precedence and stored artifacts.

Sources: [skills/seat/scripts/driver.mjs:216-224](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:216); [skills/seat/scripts/driver.mjs:995-1006](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:995); [skills/seat/scripts/driver.mjs:1522-1534](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:1522).

### C55 — README.md:217

Shared isolated home, linked auth/sessions, host config exclusion/opt-out.

Sources: [skills/seat/scripts/driver.mjs:1047](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:1047); [skills/seat/scripts/driver.mjs:1216-1251](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:1216); [skills/seat/scripts/driver.mjs:1272-1279](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:1272); [skills/seat/scripts/driver.mjs:2136](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:2136); [skills/seat/scripts/driver.mjs:3675-3678](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:3675).

### C56 — README.md:223

No default wall limit, 900-second idle and 1000 root-command limits.

Sources: [skills/seat/scripts/driver.mjs:65-69](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:65); [skills/seat/scripts/driver.mjs:670](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:670); [skills/seat/scripts/driver.mjs:689-691](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:689); [skills/seat/scripts/driver.mjs:2471-2479](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:2471); [skills/seat/scripts/driver.mjs:2603-2604](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:2603).

### C57 — README.md:227

Stop signal pid, attempted report and teardown; resume and busy refusal.

Sources: [skills/seat/SKILL.md:159-160](/Users/ruliny/Git/codex-delegate/skills/seat/SKILL.md:159); [skills/seat/scripts/driver.mjs:3730-3731](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:3730); [skills/seat/scripts/driver.mjs:3889-3931](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:3889); [skills/seat/scripts/driver.mjs:1572-1577](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:1572); [skills/seat/scripts/driver.mjs:3781-3784](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:3781).

### C58 — README.md:241

npm test runner, first failure, skipped package cases.

Sources: [package.json:7-8](/Users/ruliny/Git/codex-delegate/package.json:7); [evals/run-all.mjs:23-24](/Users/ruliny/Git/codex-delegate/evals/run-all.mjs:23); [evals/run-all.mjs:48-75](/Users/ruliny/Git/codex-delegate/evals/run-all.mjs:48); [evals/package.test.mjs:60-92](/Users/ruliny/Git/codex-delegate/evals/package.test.mjs:60).

### C59 — README.md:243

Live opt-ins and CI configured OS/Node matrix.

Sources: [evals/fidelity.test.mjs:676-690](/Users/ruliny/Git/codex-delegate/evals/fidelity.test.mjs:676); [evals/orchestrate-live.test.mjs:876-879](/Users/ruliny/Git/codex-delegate/evals/orchestrate-live.test.mjs:876); [.github/workflows/ci.yml:22-24](/Users/ruliny/Git/codex-delegate/.github/workflows/ci.yml:22); [.github/workflows/ci.yml:39-49](/Users/ruliny/Git/codex-delegate/.github/workflows/ci.yml:39).

CI configuration inspected; no CI or project-suite pass claimed.

### C60 — README.md:252

Fidelity handshake and missing-binary behavior; live turn separate.

Sources: [evals/fidelity.test.mjs:626-690](/Users/ruliny/Git/codex-delegate/evals/fidelity.test.mjs:626); [RELEASING.md:26-49](/Users/ruliny/Git/codex-delegate/RELEASING.md:26).

### C61 — README.md:256

Scoped Node/browser constraints and dated concurrency reference.

Sources: [skills/seat/references/parity.md:3-5](/Users/ruliny/Git/codex-delegate/skills/seat/references/parity.md:3); [skills/seat/references/parity.md:34-47](/Users/ruliny/Git/codex-delegate/skills/seat/references/parity.md:34); [skills/seat/references/parity.md:108-112](/Users/ruliny/Git/codex-delegate/skills/seat/references/parity.md:108); [skills/seat/references/parity.md:127-171](/Users/ruliny/Git/codex-delegate/skills/seat/references/parity.md:127).

Historical measurements referenced, not rerun or generalized to all browsers/platforms.

### C62 — README.md:264

on-request and read-level sandbox omission.

Sources: [skills/seat/scripts/driver.mjs:2152-2174](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:2152); [skills/seat/scripts/driver.mjs:3763-3803](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:3763).

### C63 — README.md:267

Official-plugin comparison date, versions, observations and richer features.

Sources: [skills/seat/references/why-not-the-plugin.md:3-6](/Users/ruliny/Git/codex-delegate/skills/seat/references/why-not-the-plugin.md:3); [skills/seat/references/why-not-the-plugin.md:10-49](/Users/ruliny/Git/codex-delegate/skills/seat/references/why-not-the-plugin.md:10); [skills/seat/references/why-not-the-plugin.md:113-122](/Users/ruliny/Git/codex-delegate/skills/seat/references/why-not-the-plugin.md:113).

Historical local reference only; no claim about current external release.

### C64 — README.md:276

Schema generation and full historical tree recipe.

Sources: [README.md:230-242](/Users/ruliny/Git/codex-delegate/README.md:230).

git ls-tree inspected commit 7364f7b schema-0.153.4; generator not executed.

### C65 — README.md:282

Conformance override, unused-schema rejection and pin coherence.

Sources: [evals/conformance.test.mjs:21-42](/Users/ruliny/Git/codex-delegate/evals/conformance.test.mjs:21); [evals/conformance.test.mjs:45-75](/Users/ruliny/Git/codex-delegate/evals/conformance.test.mjs:45); [skills/seat/scripts/driver.mjs:34-36](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:34).

### C66 — README.md:288

Release gates and dated capability recheck instruction.

Sources: [RELEASING.md:14-49](/Users/ruliny/Git/codex-delegate/RELEASING.md:14).

### C67 — README.md:293

Reference layout, license and coverage pointers.

Sources: [skills/seat/SKILL.md:198-213](/Users/ruliny/Git/codex-delegate/skills/seat/SKILL.md:198); [skills/seat/references/environment-and-internals.md:6-7](/Users/ruliny/Git/codex-delegate/skills/seat/references/environment-and-internals.md:6); [skills/seat/references/incidents.md:1-4](/Users/ruliny/Git/codex-delegate/skills/seat/references/incidents.md:1); [skills/seat/references/adversarial-review.md:1-5](/Users/ruliny/Git/codex-delegate/skills/seat/references/adversarial-review.md:1); [evals/README.md:14-25](/Users/ruliny/Git/codex-delegate/evals/README.md:14); [CHANGELOG.md:1-4](/Users/ruliny/Git/codex-delegate/CHANGELOG.md:1); [LICENSE:1-21](/Users/ruliny/Git/codex-delegate/LICENSE:1).

## Conditions retained at decisions

- README.md:26 — Required absolute state and variable forwarding before the first task; repeated in the independently usable terminal example.
- README.md:52 — The working rights table, including read scope and network access.
- README.md:63 — Readable files may be sent over the network; sandbox denial and provider web search are separate.
- README.md:71 — HEAD excludes uncommitted work and live-only dependencies; stashing is not committing.
- README.md:75 — Harvest/remove may fail; ignored files may be lost; an exit-0 verdict does not check the harvest.
- README.md:91 — Both no-command waivers and their non-effect on a declared expectation.
- README.md:102 — Metadata-only receipt check, bounded search and unchanged exit verdict when false.
- README.md:112 — Text-match/pipeline weakness; verifier caller privileges, sandbox option and budget limit; schema validation limits.
- README.md:135 — Cleanup needs explicit approval; runs and conversations require their numbers.
- README.md:143 — Unreadable, in-use or changed items are retained; record-only liveness is not process omniscience.
- README.md:148 — Cleanup's absolute TMPDIR requirement and incomplete coverage.
- README.md:155 — mkdir -p, no replacement of existing skills, absolute export and start Claude from the exported environment.
- README.md:205 — Absolute unused report path and absent-report-is-unknown warning.
- README.md:223 — 900-second silence and 1000-command defaults despite no wall clock.
- README.md:241 — Skip notices are not passes; real model usage is separately opted in.
- README.md:256 — Scoped browser/Vitest restrictions and link to dated measurements with their original numbers intact.
- README.md:267 — 2026-08-31, plugin 1.0.6 and Codex 0.150.1 remain attached to historical comparison.
- README.md:282 — Full schema commit and its hash remain an operational dependency; prune before conformance.

## Cuts of at least 20 words

cut-ledger.md contains all 30 replaced, moved or removed source blocks with original text, line span, word count and disposition. README.diff is the complete original-to-final diff; chain.diff contains all four transformations.

## Limits and tensions

- No new six-reader experiment was run; repairs were checked structurally and against local implementation. No project test suite, model turn, network call, installation, update, cleanup deletion or schema regeneration was run.
- External Claude Code plugin installation/update commands, skill discovery and codex login status were not live-tested. Their local provenance is recorded separately from driver implementation claims.
- The source cleanup recipe references CLAUDE_PLUGIN_ROOT (skills/cleanup/SKILL.md:29). Whether the host supplies that placeholder under symlink installation could not be determined from this checkout; the README gives a direct checked-in-script fallback.
- The existing seat/parity documents still say 'commit or stash' before a HEAD worktree (skills/seat/SKILL.md:129-130; skills/seat/references/parity.md:41-43). The new README states that stashing alone does not move work into HEAD. Repository files were not edited.
- Part 2 brevity and Part 3 missing framing required judgment: 24 prerequisites were inventoried, but only decision-critical framing was added. Part 2 itself permits repeating conditions at independent decisions.
- Preserving the successful rights passage and enforcing accuracy were reconciled by keeping the entire original table and placing qualifications directly below it. No unresolved contradiction between the four parts remains.
- Relative links in the replacement README target the checkout layout and were checked against the repository root; the temporary directory is a review artifact, not a relocated installation.
- The patch-tool write and an escalation attempt were rejected. The same requested temporary output was then written successfully using a normal sandboxed command with the temporary directory as cwd; no outstanding permission request remains.
