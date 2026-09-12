# Opus — every claim of 08-review.md against the code, with a stub codex (2026-09-12)

Checks ran with a `codex` shim pointing at `evals/fake-app-server.mjs`, `CODEX_DELEGATE_STATE_DIR` under `$TMPDIR`, and an isolated `CLAUDE_CONFIG_DIR`. No repository file modified.

## 1. FALSE / OVERSTATED / UNDERSTATED

- **F-a FALSE (L3).** "a copy with unsaved files is left as it is, commits and all" (L121). Dirtiness is `git status --porcelain` (`driver.mjs:1650-1656`), blind to ignored files; a preserved copy holding only a `.gitignore`d file was judged clean, removed by the next `--worktree` run, the file destroyed. The dirty case with an untracked file behaves as claimed.
- **F-b FALSE (L3).** cleanup row "not your answers, run records or reports" (L59). An orchestrate seat's report lives inside a run directory (`orchestrate/SKILL.md:103`) and run rows are selectable (`cleanup.mjs:867-869`); seeded `<state>/orchestrate/<slug>/run-42/seat-a/report.json`, selected the run: "I deleted the run 42", report gone, answers survive. The listing on a seeded state dir produced only *kept* rows.
- **F-c FALSE in "only" (L3).** "sharing only your sign-in and your session files" (L117-118). `<state>/home/config.toml` after one run carries `model`, `model_reasoning_effort`, `personality`, `service_tier` from the caller (`environment-and-internals.md:75-77`).
- **F-d OVERSTATED (L3).** "the run stops if Codex grants a different sandbox or network than that" (L8-9). `assertReadSandbox` reads type, egress, workspace root, writable roots only; a fixture reporting `excludeSlashTmp: false` ran to completion, exit 0. The refusals that do fire were confirmed (`profile-widened`, `profile-network-dropped` → exit 4).
- **F-e OVERSTATED, and a regression against the retired sentence (L3).** Row 2's cure "when that run is dead, stop the Codex processes the refusal names" (L190). Three cases in `acquireLock` (`driver.mjs:1444-1456`): a live holder's refusal says the opposite ("leave it there, a lock whose holder is gone is reclaimed on the next attempt without your help"); only a dead driver with a live codex group names a process; a plain dead holder is reclaimed silently (planted, exit 0). 07's "reclaimed by the next" was true and was retired.
- **F-f FALSE for the scratch the document located; trigger imprecise (L3).** "Answers, run records and a read-only agent's scratch age out — 14 days or 400 entries, trimmed when a later run starts" (L124-125). `pruneDir` runs only on `<state>/tmp`, `jobs`, `answers`; with `TMPDIR` exported no `<state>/tmp` exists and nothing in the system temp directory is pruned. Answers are pruned when a run *writes* one (402+3 old → a refused run left 405, a completed run left 400); the newest entry is always kept (`:3018`).
- **F-g OVERSTATED (L2).** "mutation-checked on 2026-08-31" (L203): only the external audit is dated; whole suites postdate it (`agent-contract` 09-01, `orchestrate` 09-07, `cleanup` 09-10).
- **F-h OVERSTATED (L1).** "The one thing it has that a native subagent does not is proof" (L103) — the decorrelated model, the document's opening premise, is the other thing.
- **F-i UNDERSTATED (L3).** L90-91 says what is not saved, not that ignored files are deleted with the copy (`driver.mjs:1863-1872`; measured: `debug.log`, `node_modules/x` destroyed).
- **F-j vaguer and at odds with the skill (L2).** "pushes the verbose steps — tests, greps, diffs, logs" (L58): `orchestrate/SKILL.md:23-27` keeps targeted greps with the coordinator and sends tree-wide greps and source reading to seats; 07's wording matched.
- **F-k UNDERSTATED (L2).** The data-directory bullet dropped `<state>/tmp/<runId>` and `<state>/pasted/<pid>-<hex>`; both exist; a SIGKILLed run leaves pasted images until a later run's `scavenge` (`attach-pasted.mjs:214-228`).
- **F-l OVERSTATED for one mode (L2/3).** "cannot commit … so the work comes back as a diff" (L129-130): the `.git` refusal proven (`touch <root>/.git/a` → Operation not permitted under a write profile); the diff harvest exists only for `--worktree`; a `SEAT: write <dir>` seat's work stays in the live files.
- **F-m minor (L2/3).** "unless you asked for that command by name" omits `--verify` (exit 9).
- **F-n minor (L3).** The help command path is the marketplace clone, not the installed copy under `plugins/cache/…`; after `marketplace update` without `plugin update` the documented help is a different version.

## 2. The 27 edits

All landed mechanically. Produced a false, overstated or vaguer sentence: edits 1 (F-d), 7 (F-j), 8 (F-b), 11 (F-i), 12 (F-h), 14 (F-c, F-k), 15 (F-a), 17 (F-f, and retiring the lock sentence left F-e), 25 (F-e), 27 (F-g). Confirmed at the level claimed or better: 2, 3, 4, 5, 6, 9, 10, 13, 16, 18 (first half, L3), 19, 20, 21, 22, 23, 24, 26.

Writer's checks that did not hold: edit 19 cites `:2360` for a stderr notice on a declined approval — there is none; the recording is `report.escalations`. Edit 8's check did not test its conclusion. Edit 14's check misdescribes `attach-pasted.mjs`. Edit 11's check cites the pre-turn path for a message the normal path never prints (the claim is still true on the normal path: `worktreePreserved: "turn interrupted"`).

## 3. Level 1 only

`/reload-plugins` on an open session; the first-run permission prompt; the six example prompts (no trigger harness, `evals/README.md:61-63`); "likeliest thing to break a run"; the memory-bound fan-out (parity.md dated 2026-08-30/31, other hardware); data survival across a real version change; framing sentences.
