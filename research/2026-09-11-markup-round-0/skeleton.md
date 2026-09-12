# README skeleton — codex-delegate

7 sections, ~1005 words. Today's README is 2726.

**What the document claims:** you drive Codex agents the way you drive Claude Code's own subagents —
the same control over what they may touch, the same ability to check what they did — and you can put
both kinds in one panel.

Every section states that claim, shows it, delivers it, bounds it, or explains what is behind it.

## Terminology

**They are called Codex subagents, or Codex agents. Not "seats".** If the claim is parity with native
subagents, a separate word for them denies the claim in the vocabulary. `seat` stays as the skill's
name and in the reference files, where the reader is the agent rather than the user.

## Two rules, checkable by grep rather than by opinion

1. **No mechanism before the decision it would inform.** No flag name, header field, exit code, protocol
   name, environment variable or absolute path before §6. The only code blocks are the two install
   commands, the two update commands, the one worked exchange, and the from-source route in §6.
2. **Generated reference is linked, never transcribed.** Flags, the exit ladder and report fields are
   `driver.mjs --help` output; a copy is stale on the next release. This rule is what deletes the Node
   floor, `PATH`, `auth.json` and the exit ladder — by rule, not by taste.
3. **Every command is in a fenced block with a language, in the form that runs from a shell.**
   `claude plugin install …`, not `/plugin install …`: the slash form works only for a reader already
   inside Claude Code.

---

## 1. `codex-delegate` — title and opening · 110w

The plugin lets Claude Code delegate work to Codex agents and drive them the way it drives its own
subagents: you say what an agent may touch, it does the work, and what it did is checked rather than
taken on its word. Beyond one agent, the same control covers a panel of Claude and Codex agents working
on one task.

Answers "what is it and why would I want it" in the first screen, with no setup step and no mechanism.

*Not here:* driver, JSON-RPC, app-server, report, receipt, exit code, sandbox, Node, flags, paths.
Badges, feature lists, the competitor.

## 2. Install and first run · 210w

```bash
claude plugin marketplace add Nowely/agent-skills
claude plugin install codex-delegate@nowely
```

Then the one real prerequisite — a `codex` you are signed in to — and **one real exchange end to end**:
the sentence a user types, what Claude announces it is handing over and under what rights, and the
agent's own attributed return.

Two clauses of small print documented nowhere else: the first agent writes its prompt file outside the
project, so Claude asks permission once; and an agent spends the user's own Codex quota.

*Not here:* Node version, `PATH`, `TMPDIR`, the OS matrix, `auth.json`, config inheritance, the state
directory, the from-source route, `npm test`, any `node driver.mjs …` line, invented file names.

## 3. Update · 55w

```bash
claude plugin marketplace update nowely
claude plugin update codex-delegate
```

Its own heading. One clause that a restart is what applies it, and one that settings and stored data
survive.

*Not here:* the codex-upgrade recipe, the fidelity suite, pin bookkeeping, uninstall, migration notes.

## 4. What a Codex agent can do, and what it may touch · 230w

**A table is the section.** Rows are the things a user already expects of a native subagent; two columns
say what each kind gives. The claim is either visible in the table or it is not true.

| | Claude subagent | Codex agent |
|---|---|---|
| several at once | | |
| read-only, or writes only where you say | | |
| writes in a copy of the repo, not your tree | | |
| stop it and keep what it did | | |
| continue it | | |
| hand it an image | | |
| demand a fixed answer shape | | |
| reaches the network | | |
| proof that a command actually ran | | |

Below the table, the three kinds of access in the user's own terms — reads everything and runs commands
but writes nothing of yours; writes in a throwaway copy of the repository, **which starts at your last
commit, so uncommitted work is invisible to it**; writes in a directory you name.

The last row is where the two differ in this plugin's favour, and it is the reason the project exists.
It is stated as a row, not as a paragraph of argument.

*Not here:* flag spellings, `$TMPDIR`, locks, host allowlists, effort tables, exit codes, and every
"see `--help`".

## 5. Where parity stops · 110w

The debit column, in the same vocabulary as the claim and immediately after it. An agent cannot commit —
work comes back as a diff. It cannot ask for wider rights mid-run; it is refused and recorded rather
than prompting you. Browser tests need a writing agent. A fan-out is bounded by machine memory. The
interface underneath is experimental, which is why a codex upgrade is the thing that breaks.

*Not here:* the Chromium override, the vitest flag, dated megabyte figures — `parity.md`, one link.

## 6. How it works · 190w

Every mechanism kept out of the sections above, each fact stated only as the promise it backs: one
dependency-free Node script per agent driving `codex app-server`; the rights the server actually applied
are asserted against the ones requested, and a mismatch refuses the run; the verdict is computed from
what the turn did rather than from the model's account of itself; every completed turn leaves a receipt;
the turn runs in a Codex home private to the plugin; everything written lives in one directory, where
answers and run records are bounded at 14 days or 400 entries and worktrees, locks and the shared home
are not.

Ends with the one-paragraph verdict on the official plugin, and the from-source route.

*Not here:* the exit ladder and its numbers, the report's field inventory, gate semantics, lock design,
the state directory's tree, the upgrade recipe, the plugin's line numbers and issue state. Three
sentences and one link per paragraph.

## 7. What else ships, and where the details live · 100w

One line each for the two modes the user turns on — the orchestrator over Claude and Codex agents, and
the cleanup — then four canonical pointers, one line of status, and the licence.

*Not here:* the repository layout tree, the canonical-homes table, the suite inventory, orchestrate's
tiers and caps, cleanup's inventory.

---

## One edit this requires outside the README

`RELEASING.md:15` points at "README.md › After a codex upgrade". Deleting that section without folding
the recipe into `RELEASING.md` step 3 breaks a live cross-reference and loses the procedure.

## Deleted outright, not moved

The Node floor, `PATH`, the OS matrix, `auth.json`, config inheritance, the invented `src/parser.ts`, the
`npm test` walkthrough, the repository layout tree. The stated cost: a reader on an ancient Node meets a
crash instead of a warning.
