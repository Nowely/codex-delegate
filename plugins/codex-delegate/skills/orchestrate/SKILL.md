---
name: orchestrate
description: >-
  User-invoked mode that turns this conversation into an orchestrator: scout inline, agree one plan, then push every verbose
  step (tests, tree-wide greps, source files, diffs, logs) onto Claude and Codex seats so the main context stays small.
disable-model-invocation: true
metadata:
  version: "0.13.0"
license: MIT
---

Load [seat](../seat/SKILL.md) now (Skill tool, `codex-delegate:seat`; bare `seat` on a
clone-and-symlink install) and follow it for every Codex seat: rights, header fields, worktree lifecycle, the report and the exit
ladder live there and stay authoritative; this page re-cuts only what the mode changes. The mode is prompt only: no driver
change, no new header field or flag, the seat's own prompt file and the driver's state directory unchanged. You are the
orchestrator; the work-list, the plan, the composition and the synthesis are yours, the rest is a seat's.

## Your own hands

| You do this yourself | You send this to a seat |
| --- | --- |
| scout the work-list with cheap commands (`ls`, `git status`, targeted `grep`) before any fan-out | test output, greps over the tree, reading source files, diffs, logs |
| a quick targeted edit that needs no exploration | any edit that needs exploring first |
| plan | design: the Fable seat, whatever your own model |
| synthesise, attributing every finding to the seat that produced it | verify: you never grade your own work, a fresh seat does |

Scouting is the only exploration you do; report a failed seat and never backfill it. The run directory is
`<state>/orchestrate/<project-slug>/<run>/`, `<state>` the driver's state directory (`${CLAUDE_PLUGIN_DATA}` on a plugin install, the exported `CODEX_DELEGATE_STATE_DIR` on the clone route), `<run>` unique and `<project-slug>` the working directory's absolute path with every character that is not a letter or
a digit replaced by `-`, the name Claude Code gives it under `~/.claude/projects/`. It is outside every repository, so no `.gitignore`; not the repository root, not the project's
`.claude/`, whose writes prompt whatever the allow rules say. The driver creates it, through `--report-file`, and it is what those report files make of it: nothing else is written there. Never run `mkdir`, Write or a shell redirect under that data directory yourself, because a headless session refuses each of them as a sensitive file with no prompt anyone can answer, while a subprocess handed the same path as an argument writes it unopposed (measured 2026-09-08).
A Claude seat's artifact is its returned text, and a file it must leave goes under `$TMPDIR` with the path in that text; Codex artifacts are the paths the seat's
own report names, under the same data directory; it is kept after the task and the user deletes it. A read seat is never asked to write, not under the repository and not in the
run directory: its artifact is its report, and a brief that asks a Codex read seat for a file there costs a refused write and exit 6 (measured 2026-09-08). Redirect a check you run yourself into a `mktemp` file and read back only a 5-line tail with the counts.

## The plan

1. Load the sibling skill with the Skill tool if it is not loaded yet, scout, then decide the composition and the seats.
2. Show the plan and stop, in the user's own language and in ordinary words: what will be done, who does each part by model name, what each may write, that the seats reach the network and any you are keeping off it, and that
   artifacts land outside the repository. Name no path and no header field. A worktree seat is named as such, because a worktree will be made. Browser and end-to-end runs go to a Claude seat, or to a write seat with the grants parity.md's
   [Browser-mode sandbox](../seat/references/parity.md#browser-mode-sandbox) section names; a read seat cannot, because that section's Chromium override is a file in the tree it may not write.
   Announce the composition here, and the caps beside it in a sentence: your own model, one Fable and one `gpt-6-astra` at a time, six alive. A cap the user overrides in words ("two Fable")
   replaces the default for this run; composition words ("only codex", "no codex") follow the sibling's table. One plan when there is one; when several approaches are viable, show them all with a
   recommendation and let the user pick.
3. The user's "go" covers only what the plan listed. After it, live-tree implementers write in the live working directory and a
   seat the plan put in a worktree stays there; no commit to the live tree without a separate word from the user.
4. A worktree is cut at `HEAD`, so a worktree seat suits only work that starts there: competing implementations, a suite on
   committed code, atomically parallel work that must run its own tests. Never use one to test uncommitted live edits: it sees
   none of them and passes untouched code. When a plan needs both, the commit or stash that feeds the worktree is a live-tree
   commit and goes into the plan. Use one only where a fresh tree can run: dependencies installable inside it under the planned
   rights (the live checkout's are absent), no daemon or socket. You decide; ask when unsure. A Codex worktree seat cannot
   commit under the rights a `SEAT:` line makes: its sandbox ends at the tree, so its work comes back as a diff. Land the harvest by proposal: apply `worktreeDiffPath` and
   restore `worktreeUntrackedPath`, or merge or cherry-pick `worktreeCommitsRef` when the seat committed; show it, then wait,
   unless the plan said "land the winner".
5. Fan out, verify, cross-review, then synthesise; name the composition that actually ran and what you dropped. After any seat returns, Claude or Codex, write one short paragraph of your own, in the user's language and naming the agent by its model, in the same shape for both sides; the five fields are your own input, so never paste a five-field block, a header field name or a path into user-facing text.

## Model tiers

| Tier | Claude | Codex `MODEL:` | Work |
| --- | --- | --- | --- |
| top | Fable | `gpt-6-astra` | design, mentoring, final review and verdict, decomposition you cannot do, a case stuck after two failed attempts. Never implementation |
| strong | Opus | `gpt-5.6-sol` | write seats, non-trivial analysis |
| cheap | Sonnet | `gpt-5.6-terra` | mechanical, hard-to-get-wrong work |
| unused | Haiku | `gpt-5.6-luna` | not used |

Your own model is in your system prompt ("You are powered by the model named ..."); nothing else carries it. You are outside the
pool, and the pool is the same whatever you are: at most one Fable seat and one `gpt-6-astra` seat alive at a time, each taking
the top-row roles in turn, architect for one task and judge for the next, and the strong and cheap seats the alive cap admits.

- Tag every Claude Agent call with an explicit `model`: `opus` or `sonnet`, and `fable` only for the one Fable seat;
  untagged, a subagent inherits your session model. A Codex seat's model is its `MODEL:` line, and every Codex seat carries one
  with a slug from the table, never the config default: a Codex seat is a Bash task, so no tool-side `model` or `effort`
  option reaches it, and one written there would be silently spent on nothing.
- Subagents may spawn subagents, but a Fable seat never spawns Fable: it tags its own Agent calls `opus` or `sonnet`; only you launch
  the pool's Fable seat.
- Send no `EFFORT:` line; the user's configured Codex effort is inherited by every `MODEL:`. In a Workflow, `effort: 'low'` is
  for mechanical Claude Sonnet stages only.

## Composition and bounds

This mode replaces one row of the sibling's [composition table](../seat/SKILL.md#composition), the "nothing" row:
when the user states no allocation, half the seats beyond the implementers, rounded up, are Codex, in the judgement roles: plan
critique, review, skeptics and refuters, judges. A one-seat task has no judgement seat and so no Codex seat unless cross-review
adds one. Everything else there holds: an allocation or refusal the user states, the announcement, attribution, no backfill, no
allow-rules. Implementers are not duplicated: one per task, split by ownership, and which side takes which is your call.
Cross-review runs the other way round, a Claude implementer's diff to a Codex seat and a Codex seat's diff to a Claude seat; a
cross-review seat is a prompt seat with the diff's path in `TASK:` and the template below in `OUTPUT_SCHEMA:`.

| Bound | Default |
| --- | --- |
| simple task | 1 seat |
| comparison or design | 2 to 4 seats |
| complex | 5 seats or more, launched in batches inside the alive cap |
| alive at once | 6, Claude and Codex together, the top pair counted in |
| Fable seats, `gpt-6-astra` seats | 1 each, alive at a time |
| Codex write seats per directory | 1: a second on the same directory exits 10 at once, before its turn runs |

Allocate inside those bounds by judgement, not to fill a band. Usually one autonomous implementer per task; several writers only
on disjoint files that cannot interfere, and then as Claude seats or in separate worktrees, never two Codex write seats on one
directory. A writer may run the suite while it iterates, but the evidence that decides comes from a seat that did not write the
code, or from you under the redirect rule.

## Mechanism

A Codex seat is one background Bash task, the sibling's `One call` verbatim, with `run_in_background` true: `<DIR>` is the sibling's own `mktemp -d`, holding `prompt.txt`, `out.json` and `err.txt`, and `<REPORT>` is `<run>/<seat>/report.json` under the run directory above, which the driver creates. The task's exit notification is when you read that report. It is not an `agentType` and there is no other route to it. Stop one by stopping its task. The Bash call carries a `description` of the form "Codex <model> <id>: <task in a few words>", so the row the user sees names the agent by its model, not the command line.
Wait on every seat you launch in the background, Claude or Codex, with `TaskOutput(<task_id>, block: true, timeout: 600000)`, again while the task still runs, and never end your turn with a seat alive: a headless session ends with the turn and the task is killed with it (measured 2026-09-08).
Your user's invocation of this skill authorises Workflow. A Workflow reports nothing until its last agent returns, so a seat that ends early stays invisible behind its siblings (measured 2026-09-08: a seat's exit at minute 9 surfaced only when the user asked, while its sibling ran 18 minutes). Launch independent Claude seats as background Agent calls, one notification each; use Workflow only for a chain a script must decide (refute, then judge), and the Agent tool for continuing an agent. Load the `workflow-authoring` skill before writing the script when the session lists it.
`agent(prompt, {label, phase, schema, model, effort, agentType, isolation})` returns the agent's final text, or the validated
object when `schema` is given. `pipeline(items, ...stages)` runs items through stages with no barrier, `parallel(thunks)` is a barrier for when
every result must exist before the next decision. A subagent's final text is its return value, not a message to a human: say so
in the brief.

## Verification

- Scout inline first: the work-list is yours, before any fan-out.
- Adversarial verify: a refuter defaults to `refuted` when it is uncertain.
- Perspective-diverse verify: vary the angle across verifiers instead of N identical refuters.
- Judge panel for a design task.
- Completeness critic at the end: what is missing, unverified, unread.
- No silent caps: name every seat, check or item you dropped.

Fix, then cross-review, at most two rounds; then escalate to the Fable seat or the `gpt-6-astra` seat, and to the user only when
that round fails too.

| Result | What to do |
| --- | --- |
| no report file at all | the seat may still be running, whatever its task says: `kill -0 <pid>` with the pid on the first line of its stderr file; relaunch once, same rights and a report path of its own, only when none is live. A relaunch at the previous path exits 2 before it prints that pid line |
| a stderr file naming no driver | report it; no relaunch fixes an install |
| `exitCode: 3`, a cut | read the partial; if the work is unfinished, continue that thread once with `RESUME:`, under a report path of its own |
| `exitCode: 10` | a held lock or a busy thread: read `error` and the stderr file, wait for the holder, then run again; not a retry |
| `ok: false` with `turnStatus: null`, exit 2 or 4 | no turn ran, or it was aborted: read `error` and the stderr file |
| exit 4 with a `turnStatus` | the server died mid-turn or the report was not delivered: the report is complete, read it as a gate verdict |
| any other non-zero `exitCode` with an answer | a gate verdict: do not retry, read the answer |
| a Claude seat that returns `blocked` | do not retry, report it |

## The seat's return

Ask every prompt seat, Claude and Codex alike, for exactly these five fields, and send no `BRIEF:` line: the template is the bound, and `BRIEF:` would clip the answer at 20 lines. The first line of `result` is one sentence a
reader can take on its own: the agent's model and id, its status and what it did ("Sonnet W5: done, four flaky width checks replaced by threshold checks"); the rest of the fields follow unchanged, and all five are yours to read, never to forward.

    status:    done | partial | blocked
    result:    at most 30 lines
    evidence:  what ran, with counts; a test without its count is not evidence
    artifacts: paths
    open:      questions and risks

In a Workflow they are a JSON schema, and a Claude seat takes the `schema` option. A Codex seat takes the same five fields
as a strict JSON Schema file (`additionalProperties: false` on every object, every property in `required`) named on its
`OUTPUT_SCHEMA:` line, and you read them from `answerJson` in its report file:

    {"type":"object","additionalProperties":false,"required":["status","result","evidence","artifacts","open"],"properties":{"status":{"type":"string","enum":["done","partial","blocked"]},"result":{"type":"string"},"evidence":{"type":"array","items":{"type":"string"}},"artifacts":{"type":"array","items":{"type":"string"}},"open":{"type":"array","items":{"type":"string"}}}}
