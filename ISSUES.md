# Defects found and not yet fixed

One entry per defect, with the evidence that establishes it, written so that each can become an issue as
it stands. Found while working on something else; fixing belongs to its own change. Remove an entry when
the fix lands and the changelog names it.

Evidence levels are the ones `plugins/terse` uses: **1** the line resolves, **2** an independent reader of
the code says the same, **3** the behaviour was made to happen.

## codex-delegate

### C1. `/cleanup` cannot run from a clone-and-symlink install

`skills/cleanup/SKILL.md:29` and `:59` run `${CLAUDE_PLUGIN_ROOT}/skills/seat/scripts/cleanup.mjs`. That
placeholder is substituted for installed plugins only; a skill symlinked into `~/.claude/skills` gets
nothing, and the command resolves to `/skills/seat/scripts/cleanup.mjs`. The seat skill's own recipe uses
`${CLAUDE_SKILL_DIR}` (`skills/seat/SKILL.md:55`) and is unaffected; `skills/seat/SKILL.md:70` already
records that the clone route substitutes nothing for the sibling placeholder. Level 2, 2026-09-12. The
README's clone route no longer symlinks `cleanup` from round 06 of the rewrite on.

### C2. `cleanup.mjs` never lists `<state>/reports/` or `<state>/answers/`, and nothing prunes reports

`skills/seat/scripts/cleanup.mjs:846-847` builds its rows from orchestrate runs, seat scratch, evals, test
sessions, worktrees, locks, the home and data directories — never from `answers/` or `reports/`. Measured
2026-09-12 with a seeded answer and a seeded report: `--list --json` returned `rows: []` and "Nothing this
cleanup covers is on this machine" while both files remained. `:256` names `answers` only as a guard.
`skills/seat/SKILL.md:62-64` tells every run to write its report under `<state>/reports/<run>/`, and
`skills/seat/references/environment-and-internals.md:132-135` says nothing prunes what `--report-file`
makes. Measured 2026-09-12: `cleanup.mjs --list` printed six rows and no row for `reports/`, one minute
after a report had been written there. Level 3. The cleanup skill's frontmatter, "Lists files left by
codex-delegate", is therefore overstated.

### C3. The read level's writable root is described as `$TMPDIR` where the driver may substitute its own

`skills/seat/SKILL.md:61` and `:96` say a read seat writes only `$TMPDIR`. When the caller exports no
`TMPDIR`, `driver.mjs:2113-2114` sets one to `<state>/tmp/<runId>` (`:1139-1146`), and that is the root the
sandbox is asserted against. The driver's own `--help` (`:322-325`) says so; the skill text does not.
Level 2, found by two independent critics on 2026-09-12.

### C4. The comparison table conflates approval policy and sandbox for `codex exec`

`skills/seat/references/why-not-the-plugin.md:69` gives `codex exec` "per-call approval / sandbox: no —
forces `never`". `codex exec --help` (0.153.4) offers `-s, --sandbox <read-only|workspace-write|…>` per
call; what it lacks is a per-call approval policy that survives the managed clamp. The sentence at `:74`,
"the only surface with both per-call rights and a machine-checkable execution signal", stands if "rights"
means both together; the row should say which. Level 2.

### C5. The read-level sandbox assertion ignores `excludeSlashTmp`

`assertReadSandbox` (`skills/seat/scripts/driver.mjs:1991-2017`) checks the sandbox type, egress, the
workspace root and the writable roots, and never reads `excludeSlashTmp`, a field the pinned schema
carries (`schema-0.153.4/v2/ThreadStartResponse.json:1086`) and every report records as `true`. A server
that reported `false` — `/tmp` writable beside `$TMPDIR` — would pass the assertion. `grep -n
excludeSlashTmp driver.mjs` returns nothing. Level 2; a synthetic response through the unchanged function
was accepted either way (Astra, 2026-09-12). The README's "the run stops if the server grants anything
else" is stronger than the check.

### C6. `cleanup.mjs` refuses to run when `TMPDIR` is unset, which the driver itself tolerates

`skills/seat/scripts/cleanup.mjs:227-230` dies with "TMPDIR is not set to an absolute path … Nothing was
deleted", while the driver substitutes `<state>/tmp/<runId>` in that case (`driver.mjs:2113-2114`). A
setup the seat supports cannot be cleaned up. Measured 2026-09-12 with `env -u TMPDIR`: exit 2. Level 3.

### C7. The isolated home links `auth.json` from the passwd home, not from `CODEX_HOME`

`isolatedHome()` (`skills/seat/scripts/driver.mjs:1218-1228`) links `auth.json` and `sessions` from
`passwdHome()/.codex`, while the configuration probe inherits the caller's `CODEX_HOME`
(`:1055-1058`) and `codex login status` reads `CODEX_HOME`. A user with a custom `CODEX_HOME` can pass
the README's sign-in check under one account and have the driver spend another's quota. Level 2; not
observed on a machine with a custom `CODEX_HOME`.

### C8. A pre-turn refusal's report never carries `worktreePreserved`, though the skill says to read it there

`skills/seat/SKILL.md:156` tells the coordinator that a preserved tree is reported as `worktreePreserved`.
The report a run publishes when it ends before a turn — killed or cut while the app-server process
exists — is built at `skills/seat/scripts/driver.mjs:972-973` from `ok, exitCode, threadId,
turnStatus, answer, error, reportPath` only, while `worktreeLastResort()` (`:1919-1932`) preserves
the tree and announces it on stderr alone. A caller that reads only the report file learns nothing
about a tree it must harvest. Measured 2026-09-12 with SIGTERM at 16 s and with `--timeout 14`: "worktree
PRESERVED at … (run ended before disposition)" on stderr, no such field in the report. Level 3.

### C9. `--help` says an argument error "prints none" while a no-state-directory refusal writes a report

`driver.mjs --help` (source `skills/seat/scripts/driver.mjs:539`): "So 2 means either, and the report
tells them apart: an argument error prints none." Measured twice on 2026-09-12: with no state directory
and a fresh `--report-file`, the driver exits 2 and writes `{"ok":false,"exitCode":2,"turnStatus":null,
"error":"no state directory: …"}` (`preTurnReport`, `:970-973`). The two pages a reader is told to trust
disagree; either the help sentence is wrong or "argument error" needs to say it means the flag parser
only. Level 3.

