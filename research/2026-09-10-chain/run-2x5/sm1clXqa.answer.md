Codex gpt-6-astra A2: done, audited repository comments and prose and produced a paste-ready standard.

**1. Diagnosis**

The existing rule at [/Users/ruliny/.claude/CLAUDE.md:15](/Users/ruliny/.claude/CLAUDE.md:15), verbatim:
> Code comments only for what the code can't say — no narration, no "fixed X" markers.

The gap: explanations of *why* already satisfy that rule, even when padded, repetitive, historical or wrong.

I manually scored **69 comment blocks; 27 need editing**, sometimes only a sentence. Sample: first ten contiguous standalone `//` blocks per file, or all nine in `attach-pasted.mjs`. Additional spot reads are excluded from these counts.

| File | Examined | Need editing |
| --- | ---: | ---: |
| `evals/lib/harness.mjs` | 10 | 6 |
| `evals/lib/scenarios.mjs` | 10 | 2 |
| `evals/cli.test.mjs` | 10 | 1 |
| `evals/package.test.mjs` | 10 | 6 |
| `skills/seat/scripts/driver.mjs` | 10 | 4 |
| `skills/seat/scripts/cleanup.mjs` | 10 | 3 |
| `skills/seat/scripts/attach-pasted.mjs` | 9 | 5 |

Observed failures, ordered by frequency; each block receives one primary classification:

- **Argumentative padding: 16.** Useful constraints buried in emphasis, metaphors and explanations of obvious consequences.
  [evals/lib/harness.mjs:66](/Users/ruliny/Git/codex-delegate/evals/lib/harness.mjs:66): “A bounded run, because a HANG is worse than a failure”.
  [skills/seat/scripts/cleanup.mjs:109](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/cleanup.mjs:109): “ONE way to read anything, and one shape for the answer”.
  [skills/seat/scripts/attach-pasted.mjs:327](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/attach-pasted.mjs:327): “code it never chose, or the published exit ladder stops meaning anything.” Keep signal propagation’s purpose; cut the rhetoric.
- **Development history and machine anecdotes: 7.** Comments explain how the author arrived here instead of the constraint a maintainer must preserve.
  [skills/seat/scripts/driver.mjs:48](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/driver.mjs:48): “were scattered over the file beside whichever line first needed one”.
  [skills/seat/scripts/attach-pasted.mjs:140](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/attach-pasted.mjs:140): “Streamed, never read whole: the largest transcript on this machine is 28.9 MB and grows.”
  [skills/seat/scripts/cleanup.mjs:52](/Users/ruliny/Git/codex-delegate/skills/seat/scripts/cleanup.mjs:52): “All 43 of this machine's answer to this shape.”
- **Repeated information: 2.**
  [evals/package.test.mjs:24](/Users/ruliny/Git/codex-delegate/evals/package.test.mjs:24): “Every skill page the tree holds, read from the directory rather than listed” narrates the adjacent directory enumeration.
  [evals/package.test.mjs:76](/Users/ruliny/Git/codex-delegate/evals/package.test.mjs:76): “Everything git tracks, which under `source: "./"` is exactly what an install copies.” This repeats lines 6–7.
- **Incorrect or misplaced explanation: 2.**
  [evals/lib/harness.mjs:52](/Users/ruliny/Git/codex-delegate/evals/lib/harness.mjs:52): “`undefined` in a spawn env is stringified to "undefined"”. A local Node v24.11.0 `spawnSync` probe with `{env:{COMMENT_AUDIT_UNSET:undefined}}` returned `false` for the child’s `Object.hasOwn(process.env, "COMMENT_AUDIT_UNSET")`; exit 0.
  [evals/lib/scenarios.mjs:80](/Users/ruliny/Git/codex-delegate/evals/lib/scenarios.mjs:80): “Same filename convention, a session_meta naming a DIFFERENT thread” sits above protected-state setup; the mismatched receipt is created at lines 98–101.

The prose has the same problems. I read README.md, CHANGELOG.md lines 1–120, and all three SKILL.md files:

- [README.md:96](/Users/ruliny/Git/codex-delegate/README.md:96): “The `mkdir -p` is not decoration” introduces a defence of a command already shown and explained by the inline comment at line 86.
- [CHANGELOG.md:56](/Users/ruliny/Git/codex-delegate/CHANGELOG.md:56): “ONE way to read anything, and one shape for the answer: a value, or the reason it could not be had.” The following review history turns a release entry into implementation forensics.
- [skills/orchestrate/SKILL.md:14](/Users/ruliny/Git/codex-delegate/skills/orchestrate/SKILL.md:14): “this page re-cuts only what the mode changes.” The following inventory of unchanged flags and files delays actionable instructions.
- [skills/seat/SKILL.md:52](/Users/ruliny/Git/codex-delegate/skills/seat/SKILL.md:52): “Write a prompt you were handed VERBATIM: not a quote, not a `$`, not a header line it has, and add nothing.” “Copy the supplied prompt exactly” carries this instruction more clearly.

**2. Artifact**

In `/Users/ruliny/.claude/CLAUDE.md`, replace only the quoted comment sentence with this block:

```markdown
**Comments and docs.** Keep comments that expose a contract, constraint or non-obvious reason needed to change code safely. Delete what adjacent code, test names or prose already explain.
State current behavior. Move development history and machine anecdotes to a linked, dated reference when needed.
README: purpose, setup, usage. SKILL.md: conditions, actions, checks. CHANGELOG: change and impact; link investigations.
Use direct sentences. Cut rhetorical emphasis, metaphors and repeated rationale; preserve evidence and necessary caveats.
Before returning a diff, read changed comments and prose beside the relevant code and canonical docs. Delete, shorten, relocate or correct them.
```

**3. What I rejected**

- **Loadable skill:** ordinary code edits create these failures without a documentation trigger. A broad trigger would load a larger instruction repeatedly; a narrow one would miss them.
- **Mechanical check:** these are semantic failures. Capitalization checks would flag useful protocol names; length limits would penalize necessary constraints while missing short false claims. No checker proposed.
- **Separate review workflow:** too much ceremony for routine edits. The block carries the standard; its final sentence carries a review limited to changed text. Always-loaded cost: about 100 words.

**4. Least sure**

Whether this block improves agent behavior consistently: the audit supports its contents, but I have not run a before/after agent evaluation.