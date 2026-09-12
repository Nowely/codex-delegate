I’m Codex, a GPT-6 reviewer, review complete: keep the product name `codex-delegate`, but rename the main skill and the cleanup skill.

**NAME — keep the product; change two skills.**

`codex-delegate` describes the differentiated capability accurately: Claude delegates work to Codex. “Delegate” describes the action; “seat” describes the participant. Their word frequencies do not establish a naming mismatch.

My ranked choices are:

| Rank | Product | Main skill | Orchestration skill | Cleanup skill |
|---|---|---|---|---|
| 1 — recommended | `codex-delegate` | `run` | `orchestrate` | `cleanup` |
| 2 — minimum disruption | `codex-delegate` | `codex-delegate` | `orchestrate` | `cleanup` |
| 3 — full rename, currently unjustified | `codex-seats` | `run` | `orchestrate` | `cleanup` |

The recommended surface is `codex-delegate:run`, `/codex-delegate:orchestrate`, and `/codex-delegate:cleanup`. Prioritize `clear` → `cleanup`: it communicates maintenance better and avoids borrowing a conversation-reset name. `orchestrate` accurately names a session-wide behavior. `run` removes the full-name repetition; its disadvantage is being generic on the bare source-install route.

The costs differ substantially:

- **Main-skill rename:** update its directory, sibling links, invocation examples, source-install symlink, and eval expectations. Existing explicit invocations need migration. It does **not** require changing the repository, marketplace, environment variables, or state directory.
- **Cleanup-skill rename:** update its frontmatter/directory, documented commands and symlink. The internal `clear.mjs` filename and `CODEX_DELEGATE_CLEAR_*` variables can stay. Any retained `/clear` compatibility entry should explain the new command.
- **Keeping the product:** preserves `Nowely/codex-delegate`, `codex-delegate@codex-delegate`, and `~/.claude/plugins/data/codex-delegate-codex-delegate/`. The installation repetition is unattractive but unambiguous.
- **Full rename:** changing both identities to `codex-seats` produces `codex-seats@codex-seats` and `~/.claude/plugins/data/codex-seats-codex-seats/`—still repetitive. Removing that repetition requires a separately named marketplace. Repository links, install/update instructions, saved invocations, cleanup recognition and state migration all become work.

I verified six distinct variables under `skills/`: `CODEX_DELEGATE_STATE_DIR`, `CODEX_DELEGATE_SESSIONS_DIR`, `CODEX_DELEGATE_CODEX`, `CODEX_DELEGATE_VERIFY_FLOOR_MS`, `CODEX_DELEGATE_CLEAR_PS`, and `CODEX_DELEGATE_CLEAR_COLUMNS`. A full prefix rename would require compatibility handling for all six; evals introduce five additional names.

State migration carries the substantial risk. Answers, resume records, worktree ledgers and write locks live under that root. The [driver’s help source](/Users/ruliny/Git/codex-delegate/skills/codex-delegate/scripts/driver.mjs:498) explicitly says:
>                                 different values do NOT exclude each other

A rename that leaves old and new installations using separate roots can split their write-lock protection.

**POSITIONING**

The artifacts justify this sentence:

> A Claude Code plugin that runs Codex subagents with explicit permissions, managed worktrees and inspectable execution reports, and adds an optional Claude/Codex orchestration mode plus approved artifact cleanup.

Use that as the replacement README opening.

The current [README.md:3](/Users/ruliny/Git/codex-delegate/README.md:3) says:
> A Claude Code skill that hands coding work to OpenAI Codex as a subagent, with the rights for each call

That is narrower than the package: one skill instead of three, coding instead of the documented analysis/design/review tasks, and no indication of the session mode. A first-time reader can reasonably classify it as a task runner and miss the broader workflow.

Its assurance also runs wider than the implementation: “Every run leaves a receipt” excludes pre-turn refusals, and a receipt establishes that a matching session record exists, not that the answer is correct. [The main skill](/Users/ruliny/Git/codex-delegate/skills/codex-delegate/SKILL.md:144) explicitly includes:
>   no receipt.

The [plugin manifest](/Users/ruliny/Git/codex-delegate/.claude-plugin/plugin.json:4) says:
>   "description": "Delegate tasks to OpenAI Codex as verifiable subagent seats: rights declared per call, exit codes derived from evidence, a rollout receipt per run.",

The marketplace’s plugin entry repeats that description. Both describe the core runner reasonably, but omit orchestration and cleanup. “Verifiable” is defensible as inspectable; it should not imply certified correctness.

Replace **both plugin-description fields** with:
> "Delegate work to Codex from Claude Code with explicit permissions and inspectable execution reports; includes optional Claude/Codex orchestration and approved artifact cleanup."

The marketplace also has a separate [metadata description](/Users/ruliny/Git/codex-delegate/.claude-plugin/marketplace.json:7):
>     "description": "The codex-delegate plugin: Codex seats for Claude Code, with rights declared per call and a receipt per run."

Replace that with:
> "Codex delegation with explicit permissions and execution reports, optional Claude/Codex orchestration, and artifact cleanup for Claude Code."

For a coordinator model, distinguish package discovery from skill selection. The main [skill description](/Users/ruliny/Git/codex-delegate/skills/codex-delegate/SKILL.md:4) already names panels, refuters, competing designs and explicit Codex requests. README wording alone does not demonstrate a routing failure. Preserve those specific triggers when renaming it; a generic orchestration description could encourage unnecessary launches. Both auxiliary skills disable model invocation, so the broader pitch must make their **user-invoked** nature clear.

**DISAGREEMENTS**

**(a) Refuted: the zero count and the conceptual conclusion are wrong; 536 holds under a particular definition.**

I ran:
```sh
rg --no-filename -io --pcre2 '(?<!codex-)\bdelegate\b' skills README.md | wc -l
# 1
rg --no-filename -io 'seat' skills README.md | wc -l
# 536
rg --no-filename -io '\bseat\b' skills README.md | wc -l
# 418
```

The first expression excludes the product-name occurrence; word boundaries already exclude `CODEX_DELEGATE_*`. The exact remaining line is [environment-and-internals.md:4](/Users/ruliny/Git/codex-delegate/skills/codex-delegate/references/environment-and-internals.md:4):
> delegate — the recipes at the top of that file cover the decision.

The main skill also literally titles itself [SKILL.md:16](/Users/ruliny/Git/codex-delegate/skills/codex-delegate/SKILL.md:16):
> # Delegating to Codex

Thus **536 is a case-insensitive substring count across documentation and code**, including plurals and identifiers. It is not 536 prose uses of the word “seat.” The claim that delegation is absent from the product’s prose is directly contradicted.

**(b) Extended: eight occurrences confirmed; the filesystem explanation needs correction.**

My repository search, including hidden files and excluding `.git` and `CHANGELOG.md`, found **8 literal occurrences across 5 files**. Some are eval code/comments, so they are not eight separate user-facing interfaces.

The directory repetition comes from **plugin + marketplace**, independently of the skill name. [clear.mjs:64](/Users/ruliny/Git/codex-delegate/skills/codex-delegate/scripts/clear.mjs:64) states:
```js
const DATADIR_RE = /^codex-delegate-.+$/;                  // <plugin>-<marketplace>, this plugin's ids
```
Renaming the main skill fixes invocation repetition without moving state.

**(c) Extended: highest-priority naming fix, but a plugin-route command collision is overstated.**

`/codex-delegate:clear` and `/clear` are different command strings. The source-install instructions do advertise bare `/clear`, creating the direct naming conflict there. I did not determine Claude Code’s actual dispatch precedence from these artifacts.

The cleanup also does not delete immediately on invocation. [skills/clear/SKILL.md:12](/Users/ruliny/Git/codex-delegate/skills/clear/SKILL.md:12) says:
> Run the script, show its listing as it is, propose a set, and wait for the

The following line completes “user’s word.” Selection and approval mitigate accidental deletion. I agree it is the clearest consequential naming defect; I cannot establish the coordinator’s stronger claim that it is the **only** one with user-facing risk.

**(d) Extended: scope drift confirmed; “seat layer” overstates the implemented abstraction.**

[skills/orchestrate/SKILL.md:5](/Users/ruliny/Git/codex-delegate/skills/orchestrate/SKILL.md:5) explicitly says:
>   step (tests, tree-wide greps, source files, diffs, logs) onto Claude and Codex seats so the main context stays small.

It prescribes model allocation, planning, cross-review and session behavior. But it is prompt policy over native Claude agents and a Codex driver. Running `driver.mjs --help` produced:
> codex-delegate 0.11.1 — run one Codex turn with rights declared per call.

Calling this a general seat runtime would imply more unified machinery than exists. It is a Codex integration with optional mixed-model orchestration. The README also still says “both skills” at line 59, reinforcing the packaging drift.

**RENAME VERDICT**

**A full rename is not worth it at 0.11.1 on this evidence.** Published tags do not make renaming impossible; persistent state and external configuration make it a migration. I found no evidence measuring adoption or name-caused discovery failures. The current name still truthfully identifies the differentiated capability.

**The single condition that would flip my answer:** a user study demonstrates persistent, material misclassification caused by `codex-delegate` after correcting the pitch and skill names.

I read the requested artifacts and ran both help modes and the counts above. No files changed; no test suites or live command-routing tests ran.