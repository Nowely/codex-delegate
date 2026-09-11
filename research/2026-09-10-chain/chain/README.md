# codex-delegate

Get a second opinion from Codex without leaving Claude Code. This plugin lets Claude hand Codex any
work, including analysis, document review, competing designs or an implementation. Each call declares
what Codex may write. A launcher called the **driver** returns a structured report (JSON) of the
events it observed.

Neither a successful exit nor a matching session record proves that the requested task succeeded.

## Install and first run

You need Claude Code, an installed and authenticated Codex CLI, and **Node.js 22 or later**.
Put `codex` on your shell's `PATH`; check the login with `codex login status`. The plugin has no package
dependencies to install. You do not need to create `~/.codex/config.toml`.

The protocol reference is **Codex CLI 0.153.4**. A detected version mismatch produces a warning;
version alone does not refuse a run. Run the compatibility check below after upgrading Codex.

For a first install, use the plugin route. In Claude Code:

```text
/plugin marketplace add Nowely/codex-delegate
/plugin install codex-delegate@nowely
```

Every run needs a **state directory**, the folder for the driver's saved answers and operating files.
The plugin's skill recipe passes `CLAUDE_PLUGIN_DATA` for this. The source install and terminal example
below set `CODEX_DELEGATE_STATE_DIR` explicitly. With neither variable, the driver exits 2 before a turn
starts. The path must be absolute. If Claude Code requests access to this folder, grant that folder
through your own permission settings. The seat skill instructs Claude not to add allow-rules for you.

Then ask Claude, from the folder you want inspected:

> Have Codex describe the files in this folder and name three files it actually inspected. Keep it at read level.

A **seat** is one delegated assignment. The `codex-delegate:seat` skill supplies Claude's instructions
for launching it and reading the report. Read level allows commands and network access, with writes
confined to the temporary directory. See [Rights, per call](#rights-per-call).

For plugin updates, run these in a terminal and restart Claude Code:

```bash
claude plugin marketplace update nowely
claude plugin update codex-delegate@nowely
```

## Rights, per call

`DIR` is a folder path; `REPO` is a Git repository. `--cwd` chooses the working folder.
`$TMPDIR` names the writable temporary directory. A worktree is a separate Git checkout.

| Call | Codex may |
| --- | --- |
| `--level read` (the default; `--cwd DIR` is optional and defaults to the current directory) | read any readable path, reach the network, run commands, write only `$TMPDIR` — enough to run tests |
| `--worktree REPO` | write level in a managed detached tree the driver creates, harvests and removes; what it starts from and lacks is in [parity.md](skills/seat/references/parity.md#read-and-isolated-write) |
| `--level write --cwd DIR` | write anywhere under a directory you chose |
| `+ --writable DIR` / `--no-network` | an extra root, an explicit opt-in; or a sandbox that reaches nothing |

Tests that write outside `$TMPDIR` need write level. `--writable` also requires write level.
If `TMPDIR` is unset at read level, the driver creates a private temporary directory and reports it
as `tmpDir`. If you set it yourself, its contents are writable too.

Network access is on at both levels, with no host allowlist. Whatever Codex can read, it can send;
at read level that includes every readable path. `--no-network` denies network access from the
sandbox. The provider's web search is separate: it is disabled unless `--web-search` selects a mode.
The driver accepts sandbox network denial together with an allowed web-search mode.

The driver checks the server's reported sandbox, writable roots, network setting and approval policy.
A mismatch refuses the run. An approval request during the turn is refused and recorded.

A fresh worktree starts at `HEAD`, the repository's current commit. Uncommitted edits and untracked
or ignored files are absent, including dependencies installed only in the live checkout. Commit
relevant changes before choosing it; stashing them alone does not put them into `HEAD`.

After a completed turn, the driver tries to save tracked changes as `worktreeDiffPath` and non-ignored
untracked files as `worktreeUntrackedPath`. After a successful harvest it attempts to remove the tree;
a clean tree needs no harvest. Ignored files are not archived and can be lost when the tree is removed.
An incomplete turn or a failed harvest or removal leaves the tree preserved. Inspect the worktree
fields even on exit 0: the exit verdict does not test whether harvesting succeeded.

## How to check the work

Exit 0 means the turn completed, supplied an answer and passed the driver's applicable checks.
Read the report and inspect the cited files before accepting the answer.

By default, the report must contain at least one command item from the main Codex conversation,
called a **thread**. Commands reported only by Codex's own subagents do not count toward that check.
A failed command or one with an unknown outcome can satisfy the default count; look at its `status`
and `exitCode`.

**Exit 0 can mean no command was reported.** `--allow-no-commands` on the command line, or
`ALLOW_NO_COMMANDS: yes` in the leading seat-file header, waives the count. Use it when commands are
unnecessary, such as recalling an earlier answer. It does not waive a declared `--expect-command` check.

| Report field | What to inspect |
| --- | --- |
| `commands` | Each main-thread command's text, status and exit code. Failed commands do not by themselves make the run fail. |
| `commandsFailed`, `commandsBlocked`, `commandsPipedToPager` | Failures, unknown command outcomes and commands whose final pipe stage may hide output or supply the pipeline's exit status. |
| `answer`, `answerPath` | The answer and its saved full text. `answerPath` can be null if there was no answer or saving failed. |
| `receiptPath`, `receiptOk`, `receiptWhy` | A session-record location, whether its opening metadata names this thread, and why that check failed. |

A **receipt** is Codex's saved session record, also called a rollout. The driver searches today's and
yesterday's session directories and checks only the opening `session_meta` record, within a 64 KiB
read. `receiptOk: true` establishes that this metadata names the reported thread. It does not validate
commands, task completion or the answer. **`receiptOk: false` does not change the exit verdict.** An
older resumed session can be outside the search window; inspect `receiptWhy` and the record.

Choose automated checks before the run. These are driver flags; the seat-file equivalents are
`EXPECT:` and `OUTPUT_SCHEMA:`. The driver refuses `VERIFY:` in a seat file unless the caller also
passes `--allow-seat-verify`.

- `--expect-command '<regex>'`: require a completed main-thread command with exit 0 whose text matches
  the pattern. Text can mislead: `true # vitest` matches `vitest` without running it, and a pipeline can
  return its final command's status.
- `--verify '<shell command>'`: have the driver run your check after a completed turn, if budget remains.
  A check skipped for lack of budget prevents exit 0. By default it uses the caller's rights,
  environment and network. Running a script Codex changed executes that script
  with those rights. Add `--verify-sandboxed` to restrict writes to `$TMPDIR` and use the seat's network
  setting. A check that writes outside `$TMPDIR` cannot use that profile.
- `--output-schema <file>`: constrain the JSON answer's structure. The top level must be an object;
  declare every object's properties required and set `additionalProperties: false`. The report lists
  keywords the driver's validator did not recheck. Structure does not establish factual correctness.

The [result-gates reference](skills/seat/references/result-gates.md) explains the limits.
`node skills/seat/scripts/driver.mjs --help` lists the exit codes; run it from the checkout or plugin root.

## Use Claude and Codex together

Invoke `/codex-delegate:orchestrate` to plan work across Claude and Codex agents. Its instructions call
for an initial inspection, an agreed plan, delegated work, verification and synthesis. Orchestration
and cleanup are user-invoked skills.

## Remove what it left

In the project where you ran the work, invoke `/codex-delegate:cleanup`. It shows a numbered inventory
and asks before deleting the selection you approve. A run or saved conversation needs its number;
agreeing to the suggested cleanup does not include those items.

| Cleanup can remove | Cleanup lists but does not remove |
| --- | --- |
| This project's orchestration runs and seat scratch; test scratch and test-created saved conversations | Managed worktrees and their ledger; write locks; the shared Codex home; another copy's plugin data |

Cleanup preserves items it cannot fully read or identifies as in use, and refuses an item that changed
since the listing. It does not choose by age or run Git. Its activity checks cover recorded seats,
unfinished run reports, job records and running test suites. A process with none of those records is
invisible to it. Check that limitation before approving deletion.

Cleanup uses the same state-directory choice as the driver and also requires an absolute `TMPDIR`.
If that variable is missing, set it to the temporary root used for the earlier seat files. The command
is selective cleanup; it does not remove all plugin state or ordinary Codex session records.
See [the cleanup skill](skills/cleanup/SKILL.md) for items outside its coverage.

## Optional: install from source

Choose source installation for an editable checkout. It requires Git. In a terminal:

```bash
git clone https://github.com/Nowely/codex-delegate.git
cd codex-delegate
mkdir -p ~/.claude/skills
ln -s "$PWD/skills/seat" ~/.claude/skills/seat
ln -s "$PWD/skills/orchestrate" ~/.claude/skills/orchestrate
ln -s "$PWD/skills/cleanup" ~/.claude/skills/cleanup
export CODEX_DELEGATE_STATE_DIR="$HOME/.local/state/codex-delegate"
```

Keep the export in your shell profile and start Claude Code from a shell that has it. Source installs
do not supply the plugin's data-directory placeholder. Do not overwrite an existing skill at one of
these link destinations.

| Install | Delegation skill | Orchestration | Cleanup |
| --- | --- | --- | --- |
| Plugin | `codex-delegate:seat` | `/codex-delegate:orchestrate` | `/codex-delegate:cleanup` |
| Source links | `seat` | `/orchestrate` | `/cleanup` |

If the cleanup skill's plugin-root placeholder is unavailable, run this from the checkout root,
with the same state directory and temporary root:

```bash
node skills/seat/scripts/cleanup.mjs --list
```

Its `--help` describes saving a listing and deleting selected numbers against that snapshot.

## Optional: run the driver yourself

For a direct terminal run, use the complete block from the checkout or installed plugin root,
the folder containing `package.json` and `skills/`. Resolve a source symlink before locating that root.
The state-directory assignment is required. This example uses the source route's state folder;
to inspect it later, use that same value for cleanup.

```bash
CODEX_DELEGATE_STATE_DIR="$HOME/.local/state/codex-delegate" \
node skills/seat/scripts/driver.mjs --cwd . --brief \
  --prompt 'TASK: describe this folder in two sentences, after listing its files.
CHECK: name three real files.
RETURN: the two sentences.'
```

The report is JSON on standard output. `CHECK:` is an instruction to the model, not an automated
check; use the flags under [How to check the work](#how-to-check-the-work) for that.

For Claude's normal background call, `--seat-file` supplies the prompt and `--report-file` names the
report. A prompt without a rights header uses read level in the current directory. The report path
must be absolute and unused. The driver creates missing parent directories with mode 0700 and publishes
the complete report at mode 0600 without replacing an existing entry. A missing report means the outcome
is unknown. See [the seat skill](skills/seat/SKILL.md#one-call).

## Settings and saved files

The driver inherits configured model, reasoning effort, personality and service tier through Codex's
configuration interface. `--model` and `--effort` override the first two for a call. If reading the configuration fails, the driver retains a saved
configuration when available; otherwise it leaves those values to Codex's defaults.

The state directory is selected by `CODEX_DELEGATE_STATE_DIR` first, then `CLAUDE_PLUGIN_DATA`.
It holds answers, job records, locks, worktree records and the isolated Codex home. That home is shared
among this installation's runs. Existing `~/.codex/auth.json` and `~/.codex/sessions` are linked into it,
so credentials and session records are not separate copies. Host-home plugins, skills and MCP-server
configuration are not copied. `--host-home` opts out of this isolation.

## Stop or continue a run

There is no elapsed-time limit by default. The defaults cut a run after 900 seconds without qualifying
activity or at 1,000 recorded main-thread command items. The caller can set `--timeout`,
`--idle-timeout` and `--max-commands`.

Stop the background task or send `SIGTERM` to the driver's process id on its first diagnostic line.
The driver attempts to interrupt the turn, deliver the available report and stop Codex's process
group. Continue with `--resume <threadId>` or `RESUME: <threadId>` in a seat file.
A still-running thread can refuse continuation with exit 10. Read any retained answer even on a
nonzero exit.

## Checks and compatibility

From the checkout or installed plugin root (the folder containing `package.json`):

```bash
npm test
```

The runner stops at the first failing suite. Git-dependent package cases skip when the install has no
Git metadata. Live cases require their binaries or opt-in variables; read the counts and skip notices.
Without the live-turn opt-ins, these checks do not request a model turn. CI is configured for Linux
and macOS with Node 22 and 24.

After upgrading Codex, run:

```bash
node evals/fidelity.test.mjs --require-live
```

This compares the real Codex connection handshake against the test server. A missing Codex binary is
a failure with `--require-live`; without it, missing-binary cases skip. `--require-live` alone does
not request a model turn. The paid checks are separate opt-ins in [RELEASING.md](RELEASING.md).

For tests of your own project, read the [parity reference](skills/seat/references/parity.md) before
choosing rights. Its Node/Vitest setup uses `--configLoader runner` at read level. Its Chromium workaround
requires a file in the working tree, write access, a warm package store and serial execution; it is not
a general browser-testing guarantee. The local test server also needs network access. Concurrency
measurements there are dated; remeasure before choosing how many agents to run together.

## Why this driver

The driver requests `on-request` approval policy and omits the explicit sandbox parameter at read
level so the temporary-directory grant can apply. It checks the reported permissions before proceeding.

The [comparison with the official plugin](skills/seat/references/why-not-the-plugin.md) records tests
dated **2026-08-31**, against official plugin **1.0.6** and Codex CLI **0.150.1**. It covers managed-device
approval failures and loss of temporary-directory writes, plus features the official plugin offered.
Check current upstream behavior before using that comparison to choose an integration.

## After a codex upgrade

For maintainers updating the protocol reference:

1. Generate the full new schema into a temporary directory with
   `codex app-server generate-json-schema --out <tmp-new>/`.
2. Compare it with the full old schema from Git, not only the subset in this checkout.
   Commit `7364f7b` contains the full `schema-0.153.4/` tree. Extract it with
   `git archive 7364f7b schema-0.153.4 | tar -x -C <tmp-old>/`, after creating that temporary directory.
   Compare with `diff -r <tmp-old>/schema-0.153.4/ <tmp-new>/`.
3. Commit the full new tree as `schema-<new-version>/` in its own commit and record that commit's hash
   for the next comparison. Prune the working copy to the files loaded by
   [conformance.test.mjs](evals/conformance.test.mjs) before running conformance: it rejects unused schemas.
4. Run `CODEX_DELEGATE_SCHEMA_DIR=schema-<new-version> node evals/conformance.test.mjs` while the old
   version is still pinned. Resolve structural differences, then update `PINNED_CODEX` and remove the
   old schema directory in a second commit.
5. Run `npm test` and the live gates in [RELEASING.md](RELEASING.md). Inspect differences and recheck
   the dated capability measurements before release.

## Files and references

| Need | File |
| --- | --- |
| Delegation instructions and prompt headers | [skills/seat/SKILL.md](skills/seat/SKILL.md) |
| Driver flags and report fields | `node skills/seat/scripts/driver.mjs --help`; `--help-all` adds less common options |
| Orchestration and cleanup | [orchestrate](skills/orchestrate/SKILL.md), [cleanup](skills/cleanup/SKILL.md) |
| State, receipts, locks and worktrees | [environment-and-internals.md](skills/seat/references/environment-and-internals.md) |
| Capabilities and dated measurements | [parity.md](skills/seat/references/parity.md) |
| Recorded failures and review procedure | [incidents.md](skills/seat/references/incidents.md), [adversarial-review.md](skills/seat/references/adversarial-review.md) |
| Test coverage and mutation ledger | [evals/README.md](evals/README.md) |
| Plugin packaging | [.claude-plugin/](.claude-plugin/), [package.json](package.json) |
| Changes and license | [CHANGELOG.md](CHANGELOG.md), [MIT license](LICENSE) |
