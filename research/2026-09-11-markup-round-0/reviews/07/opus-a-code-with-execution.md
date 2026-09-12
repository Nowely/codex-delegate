# Opus critic A — every claim vs the code, run what can run — on 07-lifecycle.md

Environment: codex-cli 0.153.4, node v24.11.0, plugin 0.13.0. All tests ran with `CODEX_DELEGATE_STATE_DIR` and `CLAUDE_CONFIG_DIR` under `$TMPDIR`; nothing in the repository was modified.

### FALSE

**1. "The one place the two differ is proof, and that is what [How it works](#how-it-works) is about."**
FALSE — contradicted by the document's own next section. "Where parity stops" names four other differences (no commit, no mid-run widening, browser tests, memory-bound fan-out), and `skills/seat/references/parity.md` adds more: `the same, committing | none`, `a permission prompt | none — refused, recorded, exit 6`, `--host-home` carrying the whole host configuration, and "There is no progress stream".

**2. "a crashed run's commits are kept under `refs/codex-delegate/`"**
FALSE as written — the ref is created only when a *later `--worktree` run* reconciles and finds the tree otherwise **clean**. A crashed tree with a commit plus one untracked file keeps its commit only as the worktree's detached HEAD, with no ref anywhere. Proven:
```
git -C $R/.claude/worktrees/codex-mtyjce9l-c6ac99cb commit -m "seat work"   # HEAD bfc9030
echo scratch > .../untracked.txt
node driver.mjs --worktree $R --prompt hi --timeout 12
  stderr: a crashed run left work at .../codex-mtyjce9l-c6ac99cb; harvest it, then: git ... worktree remove --force ...
git -C $R for-each-ref --format='%(refname)'  ->  refs/heads/main        # no refs/codex-delegate/*
```
Code: driver.mjs:1663-1682 (`committed` requires `headSha !== e.baseSha`, and the ref branch sits behind `st.stdout.trim() === ""`).

**3. "…the worktree ledger, images you attached, the scratch of read-only agents…" (contents of the data directory)**
FALSE on two counts. `--attach` copies nothing into the state directory — it validates the caller's own paths and emits protocol items (`grep -n "copyFileSync\|cpSync" driver.mjs` → no hits). What lands under `<state>/pasted/` are images the user **pasted into the conversation**, staged by `attach-pasted.mjs`, and they are **removed when that run ends** (attach-pasted.mjs:209 `fs.rmSync(runDir…)`, :215-226 `scavenge`). Real machine: `ls ~/.claude/plugins/data/codex-delegate-nowely` → `answers home jobs locks reports worktrees` — no `pasted/`.

### OVERSTATED

**4. "A write lock goes when its run ends, and one a killed run left behind is reclaimed by the next."**
Second half OVERSTATED: reclaimed only when the driver **and** its app-server process group are gone. Proven with a stub codex (`CODEX_DELEGATE_CODEX` → `sh -c 'exec sleep 600'`):
```
kill -9 43662 ; pgrep -f "sleep 600" -> 44627
node driver.mjs --level write --cwd $W/live --prompt hi --report-file C.json   -> EXIT 10
  ".../live is still being written by the codex process group 44627 of codex-delegate pid 43662, which is itself gone; wait for it, or stop it with kill -TERM -44627"
kill -TERM -44627 ; rerun -> past the lock
```
Code: driver.mjs:1365 `const reclaimable = (held) => !holderAlive(held) && !holderGroupAlive(held);`

**5. Commands table: "`/codex-delegate:cleanup` | Lists what the plugin left on this machine, suggests what to remove, deletes only what you pick."**
OVERSTATED — it lists neither the answers, the run records nor the reports. Real listing: 18 sets of seat temp files, saved test conversations, the shared Codex home (512 MB, "never removes them") — while `<state>` holds 51 `answers/`, 52 `jobs/` and 24 `reports/` entries. Code: cleanup.mjs:8-12, :82-87, :253-258, :878-888 (`notCovered` scans only `$TMPDIR/codex-*`).

**6. "a failed turn's copy until you remove it or a later run finds it clean"**
OVERSTATED — only a later `--worktree` run reconciles. A read seat in the same repository left the stale tree untouched. `reconcileWorktreeLedgers` defined 1627, called once, at 1689 inside `createWorktree`.

**7. Troubleshooting: "a run dies mid-way in a large fan-out, leaving no report | out of memory — runs are killed, not queued"**
OVERSTATED/inconsistent. parity.md says overshoot "ends runs with SIGTERM rather than degrading gracefully", and on SIGTERM the driver *does* write the report — proven: a driver SIGTERMed mid-run wrote `exitCode 4`, `"error": "interrupted by SIGTERM before the thread existed"`, and released its lock. The "no report" symptom fits only a SIGKILL.

**8. "What reaches OpenAI is the turn — your prompt, and whatever the agent read on the way to its answer — exactly as if you had run `codex` yourself."**
OVERSTATED. Every thread also carries the driver's own `developerInstructions()` (driver.mjs:3558-3600, sent at :3838), `approvalPolicy: "on-request"`, `approvalsReviewer: "user"`, `web_search` disabled unless asked; and the same bullet list says the turn runs in a Codex home of the plugin's own — precisely *not* "as if you had run codex yourself". ("The plugin sends nothing anywhere itself" is true: no `fetch(`/`node:http*`/`node:net`/`node:tls` in the three scripts.)

**9. "the request is refused and recorded, and the run ends saying they were sized too small"**
OVERSTATED about what the run says. Exit 6's text is "an approval request was declined; inspect the report, if delivered, before judging task completeness" (LADDER driver.mjs:248), stderr "approval requests declined: N; read the answer before judging task completeness" (:2360). "Sized too small" appears only in source comments (:20, :2431).

**10. "Answers, run records and that scratch age out by count and by age"**
OVERSTATED — pruning is lazy: `pruneDir` runs only inside a later run (1145, 1535, 2991/3003). A machine that stops using the plugin keeps everything past 14 days forever. The bound is right (`PRUNE_DAYS: 14`, `PRUNE_MAX_ENTRIES: 400`).

**11. "The flags, the report's fields and every exit code are the driver's own help"**
OVERSTATED for the report fields: `--help` ends its Report paragraph with "`--help-all` lists the rest"; the environment variables and roughly half the report fields appear only under `--help-all`.

**12. "codex-cli 0.153.4, the build this was measured against."**
OVERSTATED. The pin is real (`driver.mjs:36`), but parity.md's header says the memory and overhead figures "were not re-measured for the 0.153.4 pin", and why-not-the-plugin.md's sandbox probe was against 0.150.1.

### UNDERSTATED

**13. "Made for it, removed once what it did has been saved, and kept for you to look at when the turn or the saving fails."**
UNDERSTATED — a worktree is also left behind when the run is killed or cut **before any turn starts**, whenever the app-server process exists. Proven: SIGTERM at 16 s → "worktree PRESERVED at … (run ended before disposition)"; same for a `--timeout 14` cut. `worktreeLastResort()` removes a clean tree only `if (!child)` (driver.mjs:1919-1932). Empty trees plus ledger entries accumulate until another `--worktree` run.

**14. Troubleshooting: "the run is refused before it starts | the report's `error` says why: … no state directory"**
UNDERSTATED — true only when `--report-file` was named (which the skill always does); otherwise nothing is printed. `--help` says of exit 2 "like a 2 it then prints no report", so a reader comparing the two pages gets opposite answers.

### Verified TRUE (level 3)

`claude plugin marketplace add Nowely/agent-skills` and `claude plugin install codex-delegate@nowely` succeed as written (throwaway `CLAUDE_CONFIG_DIR`). `claude plugin uninstall --keep-data` exists, "Preserve the plugin's persistent data directory (~/.claude/plugins/data/{id}/)". `claude plugin update` prints "(restart required to apply)". **Removing the marketplace deletes plugin data**: after `marketplace remove nowely`, `plugins/data/codex-delegate-nowely/answers/a.md` was gone, no confirmation prompt. `/reload-plugins` is a real command (34 hits in the CLI binary, one "Run /reload-plugins to activate" right after install). `codex login status` exists. The `--help` path runs. A held write lock gives exit 10 with the reason in the report's `error`. A taken `--report-file`, a `--worktree` on a non-repo, and `--cwd` at `~/.codex`, at the state dir, or at `$HOME` are all refused before any thread. "Dependency-free": only `node:` builtins. `app-server` is `[experimental]` in `codex --help`. Mutation claim matches evals/README.md:174.

### Reached level 1 only

- "so the first run asks your permission to write there" — harness behaviour; nothing in the repo settles it.
- "An install from the shell does not reach a session that is already open" — the remedy string is in the binary; the negative claim untested.
- "Restart Claude Code to apply an update; it keeps your stored answers and run records" — data preservation across `plugin update` untested.
- "an upgrade of it is the likeliest thing to break a run" — unfalsifiable ranking.
- "Enough for most test suites" — parity.md measures node/vitest-node, not "most".
- "read-only ones can share one directory, unless your tooling keeps a daemon, a socket or a pid file there" — asserted, no measurement.
- "A fan-out is bounded by your machine's memory" — parity.md's numbers self-declared stale (driver 0.1.0–0.4.0).
- "The modes lose the plugin's prefix here: `/seat`" — that a **symlink** in `~/.claude/skills` loads is untested.
- "the only Codex interface with both per-call rights — sandbox and approval policy — and a machine-checkable record of what ran" — rests on why-not-the-plugin.md's 2026-09-01 survey; survives only on the conjunction (exec forces `approval_policy=never`).

### Aside (code, not this document)

The pre-turn report shape carries no `worktreePreserved`: a killed run's report held only `ok/exitCode/threadId/turnStatus/answer/error/reportPath` while stderr announced a preserved tree. seat/SKILL.md tells the coordinator "the driver preserves it and reports `worktreePreserved`" — a caller that reads only the report file learns nothing about the tree it must harvest.
