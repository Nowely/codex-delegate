# Fable — dedup and rank of the ten reports on 07-lifecycle.md

87 findings, 11 conflicts, 5 method gaps. Line refs the dedup stage re-checked in the code are marked "confirmed"; the coordinator re-verified F1–F20 against the code before this file was kept (see rounds.md).

## 1. Deduplicated findings, most harmful first

**F1 · L116–117** "a crashed run's commits are kept under `refs/codex-delegate/`." — False as written: the ref is created only when a LATER `--worktree` run reconciles AND finds the tree clean; a crashed tree with a commit plus one untracked file has no ref anywhere. Raised by opus-a (#2, run), astra (A3). Check: driver.mjs:1663–1665 (dirty → `continue` before the ref), 1676–1682. SENTENCE. Edit: "…and a failed turn's copy until you remove it or a later throwaway-copy run finds it clean and removes it, keeping its commits under `refs/codex-delegate/`. A copy with unsaved files is left as it is, commits and all."

**F2 · L86–87** "removed once what it did has been saved" — "Saved" covers tracked changes and non-ignored untracked files only; ignored output is counted in the report and deleted with the tree. Raised by astra (A2). Check: driver.mjs:1854, 1863–1872 ("Counted, not archived"), 1889. SENTENCE. Edit: "removed once what it did has been saved — its edits and new files, not anything your `.gitignore` covers — and kept…"

**F3 · L122–123** "A write lock goes when its run ends, and one a killed run left behind is reclaimed by the next." — Reclaimed only when the driver AND its app-server process group are gone. Raised by opus-a (#4, stub run), astra (A4), opus-b (water #1). Check: driver.mjs:1365 `reclaimable = !holderAlive && !holderGroupAlive`; opus-a: kill -9 the driver, group survives → exit 10 until `kill -TERM -<pgid>`. SENTENCE. Edit: cut the sentence; move the condition into L189's cure.

**F4 · L61** cleanup row "Lists what the plugin left on this machine" — omits answers, run records and reports. Raised by astra (A10, seeded), opus-a (#5: 51 answers/, 52 jobs/, 24 reports/ unlisted). Check: cleanup.mjs:8–12, 846–847. CODE (ISSUES C2); README edit until then: "Lists the scratch and run directories the plugin left on this machine — not your answers, run records or reports — …"

**F5 · L99–100** "The one place the two differ is proof" — contradicted by "Where parity stops" and parity.md:15–16, :28. Raised by astra (B1), opus-a (#1), opus-b. SENTENCE. Edit: "The one place the two differ in this plugin's favour is proof…"

**F6 · L190** "leaving no report | out of memory" — a SIGTERMed driver writes its report (exit 4); parity.md:113 says overshoot ends runs with SIGTERM; "no report" fits SIGKILL or a publication failure. Raised by opus-a (#7), astra (A9). SENTENCE. Edit: "| a run dies mid-way in a large fan-out | most likely memory — runs are killed, not queued; a missing report means unknown, never success | ask for fewer at once |"

**F7 · L189** "the report's `error` says why" — a refusal for a `--report-file` that already exists writes nothing and leaves the OLD file (driver.mjs:940–944; astra probe "taken-report"). SENTENCE.

**F8 · L189** same row vs `--help` "an argument error prints none" (driver.mjs:539) — the two trusted pages disagree. Raised by opus-a (#14), astra (A6). CODE (ISSUES C9).

**F9 · L8, L155** "the run stops if the server grants anything else" — the assertion ignores `excludeSlashTmp` (schema ThreadStartResponse.json:1086; `grep excludeSlashTmp driver.mjs` → none). Raised by astra (A1). CODE (ISSUES C5); README can only narrow: "…if Codex grants a different sandbox or network than that."

**F10 · L9–10, L156, L38** — four lenses could not learn what the verdict certifies or how the default is changed: exit 0 coexists with a failed command (no ladder rung, driver.mjs:270–274). Raised by luna4 (Q10 GUESSED), opus-b, sol2, astra (E1, C4). SCOPE.

**F11 · L160–161** "the driver's own help, which is where they stay accurate" — half the report fields are under `--help-all` (driver.mjs:455–458); "which is where they stay accurate" argues for an instruction. Raised by opus-a (#11), astra (A6), opus-b. SENTENCE. Edit: "Flags, report fields and exit codes live in the driver's own help, `--help` and `--help-all`:"

**F12 · L121** "age out by count and by age" — the skeleton required the numbers (14 days or 400 entries, driver.mjs:80–81); pruning is lazy, inside a later run only. Raised by opus-b, astra (E3), opus-a (#10). SENTENCE. Edit: "age out — 14 days or 400 entries, trimmed when a later run starts; …"

**F13 · L86–87** "kept … when the turn or the saving fails" — also kept when the run is cut or killed before any turn starts (driver.mjs:1921–1932 `worktreeLastResort` removes only `if (!child)`). Raised by opus-a (#13, SIGTERM at 16 s). SENTENCE. Edit: "…when the turn, the saving, or the run itself is cut short."

**F14 · L156–158** "That a turn happened at all is backed by Codex's own session file" — the receipt proves a session with that id exists (driver.mjs:2956–2963; environment-and-internals.md:147–148), not that this turn ran. Raised by astra (A5). SENTENCE. Edit: "That the thread existed is backed by…"

**F15 · L104–106** "exactly as if you had run `codex` yourself" — every thread also carries the driver's developer instructions (driver.mjs:3558–3600, sent at :3794), approval policy, web search off. Raised by opus-a (#8). SENTENCE. Edit: "…plus the plugin's standing instructions to it — as if you had run `codex` yourself."

**F16 · L111–114** "images you attached" — `--attach` copies nothing into the state directory; `<state>/pasted/` holds pasted images, removed when the run ends (attach-pasted.mjs:207–210, 215–226). Raised by opus-a (#3). SENTENCE. Edit: cut.

**F17 · L115–116** "a later run finds it clean" — only a later `--worktree` run reconciles (reconcileWorktreeLedgers called once, driver.mjs:1689). Raised by opus-a (#6). SENTENCE. Edit: "a later throwaway-copy run".

**F18 · L188** row 1 symptom does not imply the cause — a read agent correctly changes nothing (SKILL.md:85–86). Raised by astra (A8); counter: sol2 used the row correctly. SENTENCE. Edit: "| an agent working in a throwaway copy reports success and changed nothing | …"

**F19 · L130–131** "the run ends saying they were sized too small" — the run says "an approval request was declined…" (driver.mjs:248, 2360); "sized too small" is a source comment. Raised by opus-a (#9). SENTENCE. Edit: "…and the run ends on a declined approval — nothing pauses to ask you."

**F20 · L113–114 vs L118** private home vs transcripts in your own — the private home symlinks `auth.json` and `sessions` from `~/.codex` (driver.mjs:1218–1228). Raised by opus-b. SENTENCE. Edit: "…a Codex home of the plugin's own, sharing only your sign-in and your session files, so…"

**F21 · L97** "reach the network — off in one line" — web search is a separate switch (SKILL.md:100–101; driver.mjs:2155 vs 2164). Raised by astra (A12). SCOPE (open since 06).

**F22 · L97** same phrase — a fresh reader could not say how; "one line" withholds the mechanism rule 1 keeps out, so the phrase pays for nothing. Raised by luna3 (Q7 GUESSED), opus-b. SENTENCE. Edit: "reach the network, or not — you say which."

**F23 · L112** "the worktree ledger" — "worktree" never defined; the document's word is "throwaway copy". Raised by opus-b. SENTENCE. Edit: "the ledger of throwaway copies".

**F24 · L8** "the server" unglossed for 144 lines. Raised by opus-b. SENTENCE. Edit: "if Codex grants…" (one edit with F9).

**F25 · L71** `# add --keep-data …` — a task reader guessed the flag's position; rules critic scores the flag. Raised by sol1 (#4), opus-b. SENTENCE (rule-1 reading superseded by the uninstall-block decision). Edit: a second fence line: `claude plugin uninstall codex-delegate@nowely --keep-data   # keeps your answers and run records`

**F26 · L74** "it keeps your stored answers and run records" across an update — observed by nobody (no second version; sol1's data dir absent). UNSETTLED.

**F27 · L74–77** the marketplace-removal warning never shows the command; sol1 inferred `claude plugin marketplace remove nowely` (right; deleted seeded data with no prompt). SCOPE.

**F28 · L76–77** "copy its data directory" — absent until a run stores something; sol1's `cp` failed. SENTENCE (low). Edit: "if this plugin's matters and exists yet, …"

**F29 · L24–25** `codex login status` honours `CODEX_HOME`; the driver links credentials from the passwd home (driver.mjs:1218–1228). Raised by astra (A13). CODE (ISSUES C7).

**F30 · L24–25** a fresh reader could not say whether an API key or separate account is needed (luna1 Q1 GUESSED). SCOPE. Edit if in: "…signed in — the same sign-in, no key of its own — …"

**F31 · L19–20 vs L74** reload for install, restart for update, no reason; whether reload applies an update: no check. Raised by opus-b, sol1 (#5). SCOPE.

**F32 · L83–84** "writes nothing of yours" vs "yours" temp directory (driver.mjs:2117 is the driver's phrase). Raised by opus-b. SCOPE.

**F33 · L127** "cannot commit" needs its object; a reader answered correctly anyway (luna1 Q2). SENTENCE (low). Edit: "cannot commit to your repository: its rights stop short of its git directory…"

**F34 · L63 vs L179** "Both are yours to start" vs `/seat` in the clone route. SENTENCE (low). Edit: L179 "`/orchestrate`, not `/codex-delegate:orchestrate`; `/cleanup` runs only from the plugin install."

**F35 · L130–131 vs L42–43** two askers never distinguished. SENTENCE (low).

**F36 · L133** Chromium clause excluded by skeleton §5; a reader used it (luna5 Q14). STRUCTURE (decide).

**F37 · L107–120** contents list vs skeleton exclusion vs map's literal path; two readers answered from it in one section. UNSETTLED (which decision governs).

**F38 · L141–142** "On a managed machine" — the clamp needs a policy excluding `never` (why-not-the-plugin.md:14–24). Astra (A14, PLAUSIBLE). UNSETTLED.

**F39 · L142–143** "On every machine … cannot run a test suite" — reproduced failure is `EPERM: mkdtemp`; astra's counter-run did not start. UNSETTLED.

**F40 · L202–203** "every test case was mutation-checked" — nine mutants over 117 cases on 2026-08-31; twelve suites now. Astra (A16) vs opus-a "matches evals/README.md:174". UNSETTLED.

**F41 · L27–28** "the build this was measured against" — parity.md's figures "were not re-measured for the 0.153.4 pin"; the sandbox probe was on 0.150.1. Opus-a (#12). SENTENCE (low); inclusion superseded.

**F42 · L152–153** the app-server claim survives only as the conjunction (why-not-the-plugin.md:74). UNSETTLED.

**F43 · L42–43** first-run permission prompt — harness behaviour, unsettled. **F44 · L85** "most test suites" unmeasured; `tsc --noEmit` the commoner shape (parity.md:36–39). **F45 · L98–99** shared directory with a daemon — asserted, unmeasured. **F46 · L135** fan-out numbers self-declared stale. **F47 · L179** symlinked skill loading untested. **F48 · L27–28** "likeliest thing to break" unfalsifiable. All UNSETTLED.

**F49 · L86–94** no reader-facing way to find, apply or inspect saved work; a preserved tree may hold no harvest (SKILL.md:151–160). Astra (E2), sol2. SCOPE.

**F50 · L24–25, L121** no runtime defaults (no wall clock, 900 s silence, 1,000 commands; driver.mjs:65–69). Astra (E3). SCOPE.

**F51 · L32–56** no standalone way to start exactly a throwaway-copy run (sol2). SCOPE.

**F52 · whole file** 1611 words vs 1383 the accepted map recorded; all growth in four sections (rights 190→248, stores 104→215, how 103→205, troubleshooting 128→181); no budget recorded for the accepted shape. Opus-b. STRUCTURE.

**F53 · duplication** dup.mjs: four concepts in ≥3 sections; opus-b adds: stored data survives ×4, write locks ×3, browser tests ×2, parity.md pointer ×2, temp fallback ×2. STRUCTURE.

**F54 · L98, L135** concurrency answer needed two sections (luna2 Q5). **F55 · L85, L133** browser-test answer needed two sections (luna5 Q14). STRUCTURE (low).

**F56–F59** inline commands against rule 3: L24 `codex login status`, L180 `git pull`, L188 `git stash pop`, L193 `codex --version`. SENTENCE (low).

**F60 · L50–56** phrasings block not in rule 1's list. **F61 · L198–200** three pointers, skeleton asked four. STRUCTURE (low).

**F62–F73 water (opus-b, words saved):** F62 L177–179 → "Claude Code must inherit it; without it the driver refuses to start" (−15). F63 L5–6 → "One model reviewing its own answer is one opinion twice, so a task can go to a panel" (−14). F64 L112–113 cut the fallback clause; L84 carries it (−14). F65 L118–119 cut "so a check on what really ran has something to read" (−11). F66 L47–48 → "You name Codex, or ask for a second opinion, and the plugin takes it from there:" (−9). F67 L30 cut "Then ask for the work in the conversation." (−8). F68 L128 → "Grant it only deliberately." (−7). F69 L42–43 → "Claude writes each agent's prompt outside your project, so the first run asks permission." (−7). F70 L144–145 → "Both come back looking successful." (−6). F71 L60 → "Agrees a plan, then pushes the verbose steps — tests, greps, diffs, logs" (−4). F72 L157–158 → "opened and read, not matched by name" (−4). F73 L76–77 → "(see [What it stores](#…)) first" (−2).

**CODE-only:** F74 pre-turn report carries no `worktreePreserved` (ISSUES C8). F75 cleanup.mjs refuses when `TMPDIR` is unset while the driver falls back (ISSUES C6).

**METHOD:** F76 (dedup's own) the claim ledger pinned as must-be-present three sentences this wave disproved and two it narrowed — "reclaimed by the next", "refs/codex-delegate/", "leaving no report", "grants anything else", "off in one line" — each entered at level 2 and overturned by level-3 runs; the ratchet as built would reject the fixes. F77 (dedup's own) the NEG pattern "cleanup` lists what the plugin left" missed the surviving table cell at L61 ("Lists what the plugin left", capital L). F78 astra's runnable checks live in a temp dir and one imports an instrumented driver copy — not reproducible from the repo. F79 the install/update task ran with no data directory and no second version; L74 tested by nobody. F80 rounds.md's open item "`<state>/pasted/` … never pruned" is contradicted by attach-pasted.mjs:207–210.

**SUPERSEDED (skeleton applied as written; younger decisions settle them):** F81 Node floor (restored on the reader's word, stages.md). F82 uninstall block (added on survey evidence). F83 seven sections / 1005 words (ten sections accepted, structure-map.md:3). F84 `--help` block (structure-map.md:130–132). F85 four sentences in the official-plugin paragraph (now its own section). F86 the experimental-interface sentence in Quick start (the pin restored there). F87 literal paths in §6 (structure-map.md:102; rule1.mjs excuses them).

## 2. Conflicts between critics

C1 L99–100: structure-map.md:90–91 says "the single place the two differ" vs three critics; parity.md decides — the critics win. C2 L190 mechanism: opus-a (SIGTERM writes a report) vs astra (publication failure); both say the row overclaims. C3 L202–203: astra vs opus-a on the mutation claim; unsettled. C4 L71 `--keep-data`: opus-b (rule hit) vs sol1 (show the full command); the uninstall-block decision sides with sol1. C5 L133: opus-b (excluded) vs luna5 (used it). C6 L188: astra (ambiguous) vs sol2 (row worked). C7 L107–120: opus-b vs structure-map.md:102 vs two readers. C8 `<state>/pasted/`: rounds.md:126 vs opus-a's file:line — opus-a wins. C9 L61: rounds.md "fix belongs in the skill" vs astra/opus-a (false today for answers/ and jobs/ too). C10 L27 "measured against": opus-a vs the reader's restore argument. C11 L142–143: astra vs the source's upstream #482.

## 3. What the wave did not cover

No live Codex turn (astra: synthetic responses and pre-turn probes; opus-a: a stub codex) — L155–158, the L32–40 exchange and L104–106 never observed end to end. No in-session lens: `/reload-plugins` on an open session, the first-run permission prompt, `/codex-delegate:cleanup` or `:orchestrate` from the conversation. No version pair for L74. Clone route L167–182 not executed. Not exercised: shared directory with a daemon, fan-out under memory pressure, the Russian phrasing, the issues URL and relative links, anchor slugs against GitHub rendering, the `[!WARNING]` and `<details>` rendering. All runs on darwin. Missing lens: one naive whole-document reader asked "would you ship this". Sections with no finding beyond mechanical rules: Further reading, the Commands phrasings block.

## 4. Count by category

SENTENCE 41 · UNSETTLED 12 · SCOPE 9 · STRUCTURE 7 · SUPERSEDED 7 · CODE 6 · METHOD 5 — total 87.
