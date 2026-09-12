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
| [04-ratchet.md](04-ratchet.md) | 1439 | the coordinator alone, 4 fixes each at level 2 or 3; ledger, rule 1 and duplication run before critics; then 1 Opus critic against the code and 1 Astra critic on the whole document, who ran the CLI in an isolated config | 19 verified below: 1 on the edits, 8 pre-existing confirmed, 7 plausible, 3 unsettled | **1** |
| [05-critics.md](05-critics.md) | 1443 | the coordinator, against the critics' findings on its own edits only; ledger, rule 1 and duplication re-run | not critic-read | 0 by the ledger; uncritiqued |

Beside them: [skeleton.md](skeleton.md), the structure all of these were written against, and
[structure-map.md](structure-map.md), the first block audit.

## The claim ledger

The ratchet needs to know what was true, so that a later round cannot quietly end it. Load-bearing claims,
tracked across rounds with whitespace normalised — the first version of this check missed a claim that
was present but broken across a line, and the duplication counter had the same hole until round 05.

| Claim | 01 | 02 | 03 | 04 | 05 | Evidence |
|---|---|---|---|---|---|---|
| the ran-nothing claim is qualified *by default* | yes | **lost** | yes | yes | yes | `driver.mjs:266`, level 2 |
| the read-level grant is your system temp directory | no | yes | **lost** | yes | yes | `driver.mjs:2003-2019`, level 2; caveat below |
| stashing is named as not helping | no | no | yes | yes | yes | run, level 3 |
| the network default is stated honestly | yes | yes | yes | yes | yes | `driver.mjs:672` |
| an update needs a restart | no | no | yes | yes | yes | `claude plugin update --help`, level 2 |
| marketplace removal deletes stored data | no | no | no | yes | yes | observed 2026-09-11 and 2026-09-12 in an isolated config, level 3; bundled CLI source, level 2 |
| a rights mismatch stops the run before the turn | no | no | no | **wrong** | yes | `driver.mjs:3802-3820`, level 2 |
| the verdict comes from the record of the turn | no | no | no | narrowed | yes | `driver.mjs:232-270, 3313-3320`, level 2 |
| the directory to copy is the plugin's data directory | no | no | no | vague | yes | `claude.exe`, `raH()`; Opus, level 2 |

**04's regression was the coordinator's own.** The opening was rewritten to say the rights "are read from
the record of the turn"; the driver asserts them on the thread-start response, before any turn runs, and
§9 of the same document already said so correctly. The old sentence had been true of every post-turn gate.
Found by the Opus critic, confirmed from the code, fixed in 05 — the third round in a row where the fix
list was applied correctly and something else broke, and the first where the something else was the
coordinator's sentence rather than a writer's.

## What the critics found against 04

Verified by the coordinator from the code or the CLI before being listed. "Since" names the round that
introduced the defect; the live README is the 2726-word document these rounds would replace.

### On the edits — fixed in 05

1. Opening ¶3, the regression above. Rewritten: the run stops if the server grants anything else; the
   verdict comes from the record of the turn.
2. §4 "copy the directory named under What it stores" — that section names three; only the plugin's data
   directory is deleted. Now "copy its data directory".
3. §6 "each agent's prompt file" — `<DIR>` also holds `out.json` and `err.txt`, a second copy of the report
   (`seat/SKILL.md:55`). Now "prompt and output files".

### Pre-existing, confirmed

4. **Quick start: "The install summary says whether the plugin is active or whether to run
   `/reload-plugins`" — false.** On Claude Code 2.1.170 a shell install prints only "Successfully installed
   plugin: … (scope: user)"; observed by Astra and again by the coordinator, both in an isolated
   `CLAUDE_CONFIG_DIR`. Since 02. A reader acting on this sentence gets no such guidance.
5. **§6 "three places" omits the repository itself.** Managed worktrees live at `<repo>/.claude/worktrees`
   (`driver.mjs:1693`) and are preserved after a failed turn or harvest (`seat/SKILL.md:156-160`); §5 says
   the copy is "removed once what it did has been saved", silent about the failed case. The live README
   names the worktrees; every round dropped them. Since 01.
6. **§6 "answers and run records age out"** — reports under `<state>/reports`, the path every recipe
   uses, are never pruned (`environment-and-internals.md:132-135`, `driver.mjs:948-965`). The state
   directory also holds `tmp/`, `jobs/`, `worktrees/`, `pasted/` (`driver.mjs:216-224`), none named.
7. **§9 "the only Codex interface that takes rights per call and reports what ran"** — `codex exec` takes
   `--sandbox` and `--add-dir` per call and reports events with `--json`, and the plugin's own comparison
   table credits it with exactly that (`why-not-the-plugin.md:66-71`). The true distinction is the
   approval policy it forces and the managed-profile clamp. Since 01.
8. **§9 clone route breaks `/cleanup`.** `cleanup/SKILL.md:29` runs
   `${CLAUDE_PLUGIN_ROOT}/skills/seat/scripts/cleanup.mjs`; the clone route sets `CODEX_DELEGATE_STATE_DIR`
   and nothing sets `CLAUDE_PLUGIN_ROOT`, so the command resolves to `/skills/…`. A defect in
   codex-delegate's cleanup skill as much as in this README; inherited from the live README's route.
9. **§5 and §6 "your system temp directory"** — when the caller's shell exports no `TMPDIR`, the driver
   makes `<state>/tmp/<run>` and grants that instead (`driver.mjs:2113-2114, 1139-1146`; its own `--help`
   at 322-325 says so). Both critics independently. The grant is narrower in that case, so no reader is
   endangered, but the sentence is wrong on most Linux shells. Since 02; 03's false "space of its own" was
   truer in exactly this respect.
10. **Troubleshooting rows 2 and 3 each name one cause.** A run is also refused before it starts by a
    missing state directory, a taken report path or a held lock (`driver.mjs:999-1007, 925-943`;
    `seat/SKILL.md:173-176`); a run also dies mid-way from the idle cut (`driver.mjs:2490-2494`). Waiting
    for quota or reducing the fan-out repairs neither. Since 01.
11. **§5 warning and the troubleshooting row are true of a fresh copy only.** A resumed worktree starts at
    its recorded base and restores its harvested diff (`seat/SKILL.md:145`, `driver.mjs:1716-1719`), so
    "commit first" does not put new work in front of a continuation. Since 02.

### Plausible, or a judgement the reader should make

12. §5 headline "writes nothing of yours" beside "your system temp directory is the only thing it may
    write". The tension is real; the wording is the driver's own for the read level (`driver.mjs:2117`),
    kept on purpose.
13. §5 "reach the network — off in one line" — web search is a channel of its own that the line does not
    touch (`seat/SKILL.md:100-102`), disabled unless asked for (`driver.mjs:2155`). True by default.
14. §4 is unconditional; a `--scope` removal that leaves the marketplace declared elsewhere keeps its
    plugins (Opus, from the bundled CLI). The fence uses no `--scope`.
15. 03's "your machine clears it" was dropped in 04 without replacement; for the private scratch it is the
    plugin's own pruner (`driver.mjs:3008-3010`). Vaguer, not false.
16. "Not for browser tests" — the measurement is one Chromium/Vitest shape (`parity.md:36-39`), and the
    same passage names `tsc --noEmit` writing `tsbuildinfo` as the same failure with a commoner shape.
17. §8 "on a managed machine … on every machine" — the forensics condition the first on a policy that
    excludes `never` (`why-not-the-plugin.md:14-27`). Astra's counter-probe could not run: a nested
    `codex sandbox` is refused by seatbelt.
18. Opus rated the opening's "the rights it got" a fair summary of *what* `assertSandbox` checks — type,
    egress, writable roots, cwd — and only its *source* wrong. Kept in 05 as "grants anything else".

### Unsettled

19. Whether `claude plugin uninstall` takes effect in a running session. Its `--help` and its output say
    nothing (observed); no session was watched across a removal. Left unstated in the document.
20. The session receipt: reported (`receiptOk`) and never a gate (`driver.mjs:232-278`). The document does
    not claim it is one; the coordinator's ledger had cited it as if it were, and that citation is gone.
21. §6 "the private home and the write locks stay" — outside every diff so far, not verified.

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
now occurred three times.
