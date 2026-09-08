---
name: orchestrate
description: >-
  User-invoked mode that turns this conversation into an orchestrator: scout inline, agree one plan, then push every verbose
  step (tests, tree-wide greps, source files, diffs, logs) onto Claude and Codex seats so the main context stays small.
disable-model-invocation: true
metadata:
  version: "0.10.0"
license: MIT
---

Load [codex-delegate](../codex-delegate/SKILL.md) now (Skill tool, `codex-delegate:codex-delegate`; bare `codex-delegate` on a
clone-and-symlink install) and follow it for every Codex seat: rights, header fields, worktree lifecycle, envelopes and the exit
ladder live there and stay authoritative; this page re-cuts only what the mode changes. The mode is prompt only: no driver or
relay change, no new header field or flag, the relay's temp file and the driver's state directory unchanged. You are the
orchestrator; the work-list, the plan, the composition and the synthesis are yours, the rest is a seat's.

## Your own hands

| You do this yourself | You send this to a seat |
| --- | --- |
| scout the work-list with cheap commands (`ls`, `git status`, targeted `grep`) before any fan-out | test output, greps over the tree, reading source files, diffs, logs |
| a quick targeted edit that needs no exploration | any edit that needs exploring first |
| plan | design: the Fable seat, whatever your own model |
| synthesise, attributing every finding to the seat that produced it | verify: you never grade your own work, a fresh seat does |

Scouting is the only exploration you do; report a failed seat and never backfill it. After "go" and before the first seat,
create `.orchestrate/<run>/` under the repository root, `<run>` unique, holding a `.gitignore` whose single line is `*` so it
ignores itself; not under `.claude/`, where every write is refused as a sensitive file. Claude seats write their artifacts
there and every brief names the path; Codex artifacts are the paths the driver's envelope names; the directory is kept after
the task and the user deletes it. Redirect a check you run yourself into that directory and read back only a 5-line tail
with the counts.

## The plan

1. Load the sibling skill with the Skill tool if it is not loaded yet, scout, then decide the composition and the seats.
2. Show the plan and stop: the tasks; every seat with its side (Claude or Codex) and its model; the run directory path; and every
   `SEAT: write`, `SEAT: worktree`, `NETWORK:`, `WRITABLE:` and `COMMIT:` a seat needs, a worktree seat named as such because
   a worktree will be made. Announce the composition here, and the pool beside it: your own model and the default caps below,
   one Fable, one `gpt-6-astra`, six alive. A cap the user overrides in words ("two Fable") replaces the default for this run;
   composition words ("only codex", "no codex") follow the sibling's table. One plan when there is one; when several approaches
   are viable, show them all with a recommendation and let the user pick.
3. The user's "go" covers only what the plan listed. After it, live-tree implementers write in the live working directory and a
   seat the plan put in a worktree stays there; no commit to the live tree without a separate word from the user.
4. A worktree is cut at `HEAD`, so a worktree seat suits only work that starts there: competing implementations, a suite on
   committed code, atomically parallel work that must run its own tests. Never use one to test uncommitted live edits: it sees
   none of them and passes untouched code. When a plan needs both, the commit or stash that feeds the worktree is a live-tree
   commit and goes into the plan. Use one only where a fresh tree can run: dependencies installable inside it under the planned
   rights (the live checkout's are absent), no daemon or socket. You decide; ask when unsure. A seat may commit freely inside
   its own worktree, a Codex worktree seat needs `COMMIT: yes`. Land the harvest by proposal: apply `worktreeDiffPath` and
   restore `worktreeUntrackedPath`, or merge or cherry-pick `worktreeCommitsRef` when the seat committed; show it, then wait,
   unless the plan said "land the winner".
5. Fan out, verify, cross-review, then synthesise; name the composition that actually ran and what you dropped.

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
  with a slug from the table, never the config default: pass neither `model` nor `effort` to a `codex-seat` call, in the Agent
  tool or in a Workflow; those reshape the relay, not the seat.
- Subagents may spawn subagents, but a Fable seat never spawns Fable: it tags its own Agent calls `opus` or `sonnet`; only you launch
  the pool's Fable seat.
- Send no `EFFORT:` line; the user's configured Codex effort is inherited by every `MODEL:`. In a Workflow, `effort: 'low'` is
  for mechanical Claude Sonnet stages only.

## Composition and bounds

This mode replaces one row of the sibling's [composition table](../codex-delegate/SKILL.md#composition), the "nothing" row:
when the user states no allocation, half the seats beyond the implementers, rounded up, are Codex, in the judgement roles: plan
critique, review, skeptics and refuters, judges. A one-seat task has no judgement seat and so no Codex seat unless cross-review
adds one. Everything else there holds: an allocation or refusal the user states, the announcement, attribution, no backfill, no
allow-rules. Implementers are not duplicated: one per task, split by ownership, and which side takes which is your call.
Cross-review runs the other way round, a Claude implementer's diff to a Codex seat and a Codex seat's diff to a Claude seat; a
cross-review seat is a prompt seat with the diff's path in `TASK:`, not a `REVIEW:` seat, which takes no body and no
`OUTPUT_SCHEMA:` and returns the server reviewer's own output instead of the template below.

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

Your user's invocation of this skill authorises Workflow: use it for any fan-out of two or more seats and for verify chains, the
Agent tool for a single seat and for continuing an agent. Load the `workflow-authoring` skill before writing the script when the session lists it.
`agent(prompt, {label, phase, schema, model, effort, agentType, isolation})` returns the agent's final text, or the validated
object when `schema` is given; `agentType: 'codex-delegate:codex-seat'` (bare `codex-seat` on a clone-and-symlink install) makes
it a Codex seat. `pipeline(items, ...stages)` runs items through stages with no barrier, `parallel(thunks)` is a barrier for when
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
| `exitCode: null` or a Bash timeout | the seat may still be running: `node "<driver>" --jobs --cwd "<dir>"` first; collect a live run with `node "<driver>" --relay-collect <threadId> --cwd "<dir>"`; relaunch once, same rights, only when none is live |
| `DRIVER_NOT_FOUND` | report it; no relaunch fixes an install |
| `exitCode: 3`, a cut | read the partial; if the work is unfinished, continue that thread once with `RESUME:` |
| `exitCode: 10` with no `collect:` line | a held lock or a busy thread: read the stderr block, wait for the holder, then run again; not a retry |
| exit 4, or a pre-turn 2, 3 or 10 | no report was printed: read the stderr block |
| any other non-zero `exitCode` with an answer | a gate verdict: do not retry, read the answer |
| a Claude seat that returns `blocked` | do not retry, report it |

## The seat's return

Ask every prompt seat, Claude and Codex alike, for exactly these five fields, and send no `BRIEF:` line: the template is the
bound, and `BRIEF:` would clip the answer at 20 lines.

    status:    done | partial | blocked
    result:    at most 30 lines
    evidence:  what ran, with counts; a test without its count is not evidence
    artifacts: paths
    open:      questions and risks

In a Workflow they are a JSON schema. Give a Claude seat the `schema` option and never a `codex-seat` call: measured, the relay
then wraps the whole envelope into `result` and the seat's own fields are lost inside it. A Codex seat takes the same five fields
as a strict JSON Schema file (`additionalProperties: false` on every object, every property in `required`) named on its
`OUTPUT_SCHEMA:` line, and the script parses the JSON below the envelope's `--- answer` line:

    {"type":"object","additionalProperties":false,"required":["status","result","evidence","artifacts","open"],"properties":{"status":{"type":"string","enum":["done","partial","blocked"]},"result":{"type":"string"},"evidence":{"type":"array","items":{"type":"string"}},"artifacts":{"type":"array","items":{"type":"string"}},"open":{"type":"array","items":{"type":"string"}}}}
