# Rounds

Every iteration kept as its own file, named for the pass that produced it — the convention
`research/2026-09-10-chain/chain/` already uses. A round that is not a file cannot be diffed, and the
ratchet is a diff. A round is frozen the moment its critics are launched.

| File | Words | Produced by | Findings against it | Regressions |
|---|---|---|---|---|
| [00-draft.md](00-draft.md) | 2233 | written cold, to no agreed structure | 9, from the reader, who stopped at §3 | — |
| [01-candidate.md](01-candidate.md) | 1383 | 10 writers over 5 engines, then per-section selection, then 3 critics | 41 | — |
| [02-revision.md](02-revision.md) | 1394 | 2 Opus writers against a fix list, audited by 3 | 27 across three audits | **1** |
| [03-repair.md](03-repair.md) | 1424 | 1 Opus writer, 9 verified fixes; then 3 task readers and a map | 6 outstanding, 4 of 11 blocks failing | **2** |
| [04-ratchet.md](04-ratchet.md) | 1439 | the coordinator alone, 4 fixes each at level 2 or 3; ledger, rule 1 and duplication run before critics; then 1 Opus critic against the code and 1 Astra critic on the whole document, who ran the CLI in an isolated config | 21 verified: 1 on the edits, 8 pre-existing confirmed, 7 plausible, 3 unsettled | **1** |
| [05-critics.md](05-critics.md) | 1443 | the coordinator, against the critics' findings on its own edits only; ledger, rule 1 and duplication re-run | folded into 06's review | 0 |
| [06-preexisting.md](06-preexisting.md) | 1578 | the coordinator, 9 edits against the 8 confirmed pre-existing defects; then 1 Opus critic against the code, who measured 4 of the claims by running the driver, the CLI and `codex exec` | 9 verdicts, 10 regressions listed, 4 unsettled | **4**, plus 2 overstatements |
| [07-lifecycle.md](07-lifecycle.md) | 1611 | the coordinator, 8 edits against 06's review, each re-verified from the code; then a wave of eleven — 2 Opus, 1 Astra, 2 Sol, 5 Luna, 1 Fable to dedup — see [reviews/07/](reviews/07/) | 87 deduplicated: 41 sentence, 12 unsettled, 9 scope, 7 structure, 7 superseded, 6 code, 5 method | **5** of its own: 2 false, 3 overstated |

Beside them: [skeleton.md](skeleton.md), the structure all of these were written against, and
[structure-map.md](structure-map.md), the first block audit.

## The claim ledger

The ratchet needs to know what was true, so that a later round cannot quietly end it. The ledger is a
script over whitespace-normalised text — 18 claims that must be present, 15 phrasings that must be
absent, one planted-absent control — run on every round. Its state after 07:

- every one of the 18 present in 07, and each appears in the round that introduced it and every round
  after, except where a later round replaced it with a truer form;
- every one of the 15 absent from 07; the round that introduced each false phrasing is visible as the
  single `YES` in its row.

The round-by-round table is the script's output, not a hand-kept copy; two of its own bugs — a claim
broken across a line, an anchor that did not match — were found by re-running it, which is the argument
for keeping it a script.

| Claim, present in 07 | Evidence |
|---|---|
| the ran-nothing claim is qualified *by default* | `driver.mjs:266`, level 2 |
| a temp directory is the only thing a read agent may write; the plugin's own when the shell names none | `driver.mjs:2003-2019, 2113-2114, 1139-1146`, level 2 |
| stashing is named as not helping | run, level 3 |
| the network default is stated honestly | `driver.mjs:672` |
| an update needs a restart | `claude plugin update --help`, level 2 |
| marketplace removal deletes stored data | observed 2026-09-11 and 2026-09-12 in an isolated config, level 3; bundled CLI source, level 2 |
| the directory to copy is the plugin's data directory | bundled CLI, `raH()`, level 2 |
| a rights mismatch stops the run before the turn | `driver.mjs:3802-3820`, level 2 |
| the verdict comes from the record of the turn | `driver.mjs:232-270, 3313-3320`, level 2 |
| `/reload-plugins` activates a shell install in an open session | bundled CLI strings "Run /reload-plugins to activate successfully installed plugins", "Run /reload-plugins to load it now", level 2 |
| four places on disk, `.claude/worktrees` among them | `driver.mjs:1693, 216-224`; `seat/SKILL.md:62-64`, level 2 |
| a failed turn's or a failed save's copy is kept | `seat/SKILL.md:156`, level 2 |
| app-server is the only interface with both per-call rights and a machine-checkable record | `why-not-the-plugin.md:74`; `codex exec --json` probe showed no rights echo, level 2 |
| a continuation is rebuilt from its last saved work | `driver.mjs:1716-1719, 1746-1790, 3505-3513`, level 2 |
| a killed run's lock is reclaimed by the next attempt | `driver.mjs:1447, 1481-1484`, level 2 |
| a crashed run's commits are kept under `refs/codex-delegate/` | `driver.mjs:1668-1678`, level 2 |
| an out-of-memory kill leaves no report | `publishReport` runs at exit, `driver.mjs:948-965`; a SIGKILL never reaches it, level 2 by construction |

## What each review found, and what the next round did with it

### 04 — one regression, the coordinator's

The opening was rewritten to say the rights "are read from the record of the turn"; the driver asserts
them on the thread-start response, before any turn runs, and §9 of the same document already said so.
Found by the Opus critic, confirmed from the code, fixed in 05. Beyond the edits, the two critics
confirmed eight pre-existing defects, which 06 was written against:

1. Quick start claimed the shell install summary says whether to run `/reload-plugins`; on 2.1.170 it
   prints one line, "Successfully installed plugin", observed twice in an isolated `CLAUDE_CONFIG_DIR`.
2. §6 "three places" omitted `<repo>/.claude/worktrees`, which the live README had named.
3. §6 "age out" was wrong about reports, which nothing prunes, and — found while fixing it — "the write
   locks stay" was wrong about a normal run, which releases its lock at exit (`driver.mjs:1481-1484`).
4. §9 "the only Codex interface that takes rights per call" — contested by `codex exec --sandbox`.
5. The clone route symlinked `cleanup`, whose command needs `${CLAUDE_PLUGIN_ROOT}`, which a symlinked
   skill never gets. **A defect in codex-delegate's cleanup skill as much as in this README.**
6. "your system temp directory" is wrong when the shell exports no `TMPDIR`; both critics independently.
7. Troubleshooting rows 2 and 3 each named one cause where the code has several.
8. The warning and its troubleshooting row were true of a fresh copy only.

### 06 — four regressions and two overstatements, all the coordinator's, in nine edits

Each was a sentence about a lifecycle — what stays, what is removed, what a continuation sees — written
from one line of code and not from running it. The critic ran the driver, the CLI and `codex exec` and
found:

- **"A continued agent keeps the copy it had"** — false. The tree is rebuilt at the recorded base from
  the last successful harvest (`driver.mjs:1746-1790`); after a cut, the harvest is absent and the real
  copy sits preserved for a human while the continuation gets an older one (`3505-3513`).
- **"a failed turn's copy stay[s] until you remove [it]"** — false. The next `--worktree` run removes a
  crashed run's clean tree, after saving its commits to `refs/codex-delegate/` (`1627-1682`).
- **"`/codex-delegate:cleanup` lists what the plugin left"** — false for `reports/`, in the sentence that
  names them. Its subdirectory list is `answers, jobs, tmp, pasted, locks, worktrees, home`
  (`cleanup.mjs:256`); the critic ran it and got no reports row one minute after writing one. **A
  codex-delegate defect: cleanup cannot see the directory the seat recipe tells every run to write.**
- **Row 2's "a report path already used"** — false. That refusal happens one line before the report path
  is recorded (`driver.mjs:943-944`), so no report is written at all; the critic measured it, and the
  path still held the *other* run's report.
- "A write lock lasts as long as its run" — overstated; a killed run's stays and is reclaimed by the next
  (`1447`).
- "a cut run continues from where it stopped" — overstated; `--resume` continues a thread with a new
  prompt, and a worktree seat's unsaved files do not come along.

Two more of its findings changed 07 without being regressions: the §9 rewrite had dropped the half of
the claim the plugin's own reference makes (`why-not-the-plugin.md:74`) and kept the half `codex exec`
also satisfies; and the preserved-tree fact had been stated three times.

### 07 — five regressions of its own, found by a wave of eleven

Eight edits, each checked against a resolving line; then eleven critics with lenses that do not overlap
(the pool is in `rewrite/SKILL.md` step 3), their ten reports and the dedup kept under
[reviews/07/](reviews/07/). Two task readers achieved their goals from the document alone with no
sentence observed untrue; five question readers answered 13 of 15 with a quote. The code lenses found what
reading had not, again by running: a stub Codex, drivers killed mid-run, a seeded state directory.

Of 07's own eight edits, five were wrong. **Two false**: "a crashed run's commits are kept under
`refs/codex-delegate/`" (only a clean tree gets the ref, `driver.mjs:1663-1682`; a dirty one keeps its
commits as a detached HEAD and nothing else) and "images you attached" in the data directory (`--attach`
copies nothing; `pasted/` holds pasted images and is removed when the run ends, `attach-pasted.mjs:207-226`).
**Three overstated**: a killed run's lock is reclaimed only once its Codex process group is gone too
(`driver.mjs:1365`); "a later run finds it clean" is a later `--worktree` run only (`:1689`); "leaving no
report" fits SIGKILL, and the memory kill parity.md describes is SIGTERM, after which the report is written.

Every one of the five is again a lifecycle sentence written from one line of code. The rule recorded after
06 was not enough: I read the lines it named and still did not run them.

The five method findings from the dedup stage, each verified:

- **The ledger pinned what the wave disproved.** "reclaimed by the next", "refs/codex-delegate/",
  "leaving no report" were entered as verified at level 2 and each fell to a level-3 run; "grants anything
  else" and "off in one line" were narrowed. A ratchet on that ledger would have rejected the fixes. Every
  entry now carries its level; a level-2 entry about a lifecycle is provisional until a run confirms it.
- **A negative pattern missed a surviving occurrence**: the retired phrase "cleanup lists what the plugin
  left" survives at line 61 with a capital L in a table cell; the ledger was green and the claim stood.
- **This file carried a false open item** — "`pasted/` is left by attachments and never pruned" — with no
  evidence beside it, and it would have become a wrong sentence in the next round. An open item without a
  file and line is a guess and is marked as one.
- Astra's runnable checks live in its temp directory, one of them on an instrumented copy of the driver;
  they are not reproducible from the repository.
- The install/update task ran with no data directory and no second version, so "an update keeps your
  stored answers" was tested by nobody.

What the wave did not reach: no live Codex turn, no in-session lens (`/reload-plugins` on an open session,
the first-run permission prompt, the two slash commands), no Linux, no naive whole-document reader asked
"would you ship this". The full list is in the dedup file.

### Still open after 07, the reader's call

The ranked list with a check per finding is [reviews/07/fable-dedup-and-rank.md](reviews/07/fable-dedup-and-rank.md);
the items below predate it and are kept where it confirmed them.

- §5 headline "writes nothing of yours" beside "one temp directory is the only thing it may write"; the
  driver's own words for the read level (`driver.mjs:2117`).
- §5 "reach the network — off in one line" leaves web search untouched, a channel disabled unless asked
  for (`seat/SKILL.md:100-102`, `driver.mjs:2155`).
- §4 is unconditional; a `--scope` removal that leaves the marketplace declared elsewhere keeps its
  plugins (bundled CLI).
- Install activates with `/reload-plugins`, an update "requires a restart" per its own help; nothing
  explains the asymmetry, and whether `/reload-plugins` also applies an update is unsettled.
- Whether `claude plugin uninstall` takes effect in a running session: its help and its output say
  nothing (observed); left unstated.
- "Not for browser tests" rests on one Chromium/Vitest measurement (`parity.md:36-39`), which also names
  `tsc --noEmit` as the same failure in a commoner shape.
- §8 "on a managed machine … on every machine" — the forensics condition the first on a policy that
  excludes `never` (`why-not-the-plugin.md:14-27`).
- §3's row for cleanup repeats the skill's own description, which the `reports/` gap above makes
  overstated; the fix belongs in the skill.

## Two codex-delegate defects this run surfaced

Not README work. Recorded here so they are not lost:

1. `cleanup/SKILL.md:29` runs `${CLAUDE_PLUGIN_ROOT}/skills/seat/scripts/cleanup.mjs`; from a
   clone-and-symlink install that placeholder is empty and the command resolves to `/skills/…`. The seat
   recipe uses `${CLAUDE_SKILL_DIR}` and is unaffected.
2. `cleanup.mjs:256` enumerates `answers, jobs, tmp, pasted, locks, worktrees, home` and never `reports`,
   the directory `seat/SKILL.md:62-64` tells every run to write under. Nothing prunes it either.

## What was lost before this file existed

`01-candidate.md` was overwritten in place several times — the parity table cut, the commands table
added, the section names changed to the genre's conventions. Those intermediate states do not exist.
The ratchet could not have been applied to them, and this file exists because of that.

And once more on round 04: two refinements were applied to the file while the critics were reading it.
The file was regenerated from its deterministic script to the state they saw, and the refinements moved
into 05. The rule is now in `loop.md`.

## The open piece

An independent judge on the whole diff — *did round N read better than round N−1* — is not built. The
instrument for it already exists in this plugin: `calibrate` compares two texts blind, with the side
mapping held outside the browser. Rounds are exactly such a pair. What is not settled is what the judge
should be asked: a preference between two versions of the same document is not the same question as a
preference between two phrasings of one sentence, and the second is what that tool was calibrated on.

Until then the ratchet runs on the claim ledger, which is mechanical and catches the failure that has
now occurred in four rounds out of six.
