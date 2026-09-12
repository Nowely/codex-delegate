# Cut ledger

Every original paragraph or block of at least 20 whitespace-delimited words that is no longer verbatim in the final README is listed below. A moved or rewritten block is labelled as such; its word count is the original block size, not a net deletion count.

## 1. Original README.md:3-9 — 118 words

**Replaced.** Any-work framing; removed receipt/task-success guarantees; retained per-call rights and observed-event reporting.

Original passage:

````markdown
A Claude Code plugin whose main skill hands coding work to OpenAI Codex as a subagent, with the rights
for each call declared up front: analysis that reads and runs but writes nothing of yours, or writing
and running tests inside a git worktree the driver manages itself. Every completed turn leaves a receipt
— a rollout the driver locates, opens and checks — and the exit code is derived from what actually
happened rather than from a process status that says nothing about the task, so a seat that did nothing
cannot report as though it had. Two more skills ship beside it, both described below and both invoked by
the user rather than by the model.
````

## 2. Original README.md:13-21 — 159 words

**Removed and consolidated.** Deleted the Goal manifesto, repeated rationales, no-configuration promise and cannot-report-doing-nothing guarantee. Retained actual defaults, rights and limits where chosen.

Original passage:

````markdown
A coordinator agent, Sonnet or Opus, that has loaded this skill must be able to launch a Codex subagent
on the first attempt and get a finished, verifiable answer back, with nothing to configure and nothing
to know in advance. The defaults have to produce what a native Claude Code subagent does: one call, it
waits as long as the work takes, it returns the answer, and it is stopped only by silence or by the
coordinator. Everything else here serves that. Rights are declared per call so the coordinator never
wonders what the seat may touch; exit codes are derived from evidence so a seat that did nothing cannot
report as though it had; a prompt with no header at all is a read seat in the current directory. Where a
knob and a default compete, the default wins. Where a rule must be known to succeed, that is a defect in
this repository, not in the coordinator.
````

## 3. Original README.md:23-26 — 53 words

**Moved and shortened.** Orchestration now follows result inspection; describes skill instructions and user invocation.

Original passage:

````markdown
A second, user-invoked skill applies the same goal to the whole session. `/codex-delegate:orchestrate`
turns the main conversation into an orchestrator that scouts inline, agrees one plan, and pushes every
verbose step onto Claude and Codex seats; it is prompt only, adds no flag or field, and is a delta over
this skill ([skills/orchestrate/SKILL.md](skills/orchestrate/SKILL.md)).
````

## 4. Original README.md:28-37 — 168 words

**Moved and clarified.** Cleanup now has a dedicated heading and coverage table; retained numbered consent, four removable/four retained kinds and record-only liveness.

Original passage:

````markdown
A third, `/codex-delegate:cleanup`, is the cleanup: it lists what the plugin has left on this machine and
removes only what you pick by number ([skills/cleanup/SKILL.md](skills/cleanup/SKILL.md)). It removes four
kinds — this project's orchestrate run directories and seat scratch, the test suites' scratch
directories and the saved conversations they leave behind — and only ever reports the other four:
managed worktrees and their ledger, write locks, the shared Codex home, and the data of another copy of
the plugin, which is yours to remove with the shell-quoted command the listing hands you. It suggests
nothing that is running or that it could not fully read, never another project's, never a run or a saved
conversation without your number, and never on age. It runs no git. "Running" means what this plugin
records — a seat's startup line, a run's unreported seat, a job record, a live test suite — so a process
holding one of these open with none of that behind it is not something it can see.
````

## 5. Original README.md:41-56 — 206 words

**Rebuilt.** Numeric Node 22 requirement; CLI baseline 0.153.4 is a warning-only pin; optional config removed from prerequisites; CI/temp behavior moved to relevant decisions.

Original passage:

````markdown
- **`codex` CLI, installed and authenticated.** `codex` must be on `PATH` and signed in — check with
  `codex login status`. Runs reuse your credentials: `auth.json` is symlinked from your real `~/.codex`.
- **The codex-cli build the driver pins.** Every report names it as `codexVersionPinned`, and the
  `schema-<version>/` directory at the repository root is that build's protocol reference. After
  upgrading codex, run the fidelity suite (below) before trusting a run.
- **Node at or above the floor `package.json` declares** (`engines`); CI runs that floor and a current
  release, Linux and macOS. No dependencies: the driver is one file importing only `node:` builtins.
- **macOS and Linux are both measured.** CI runs every suite that needs no `codex` binary on both;
  the macOS-only call (the managed-preferences plist) is guarded. A stock Linux shell leaves `TMPDIR`
  unset, and at `--level read` it *is* the grant: the driver then makes a private one and names it in
  the report as `tmpDir` ([Environment](skills/seat/references/environment-and-internals.md#environment)).
  Export your own to put the seat's scratch files elsewhere.
- **Your `~/.codex/config.toml` is the default policy.** Model, reasoning effort and the other keys
  the driver inherits ([the isolated home](skills/seat/references/environment-and-internals.md#the-isolated-home))
  come from it unless overridden per call (`--model`, `--effort`); the driver deliberately sets no
  defaults of its own.
````

## 6. Original README.md:60-60 — 21 words

**Consolidated.** Recommends one plugin route; retains install/update commands. Removes duplicate shell-install spelling and repeated skill-name prose.

Original passage:

````markdown
As a plugin — the full set: all three skills, the driver and the suites (the repo is its own marketplace):
````

## 7. Original README.md:67-69 — 26 words

**Consolidated.** Recommends one plugin route; retains install/update commands. Removes duplicate shell-install spelling and repeated skill-name prose.

Original passage:

````markdown
This route exposes the skill as `codex-delegate:seat`, the orchestrator mode as
`codex-delegate:orchestrate` and the cleanup as `codex-delegate:cleanup`; the last two only the user can
turn on.
````

## 8. Original README.md:71-73 — 31 words

**Consolidated.** Recommends one plugin route; retains install/update commands. Removes duplicate shell-install spelling and repeated skill-name prose.

Original passage:

````markdown
The same two steps from a shell: `claude plugin marketplace add Nowely/codex-delegate`, then
`claude plugin install codex-delegate@nowely`. To update, refresh the marketplace clone and
then the plugin, and restart Claude Code:
````

## 9. Original README.md:80-81 — 26 words

**Moved and shortened.** Source install is optional; keeps mkdir, links, export and one names table, but cuts the explanatory fresh-account story.

Original passage:

````markdown
Or from source — clone and symlink, so the checkout stays the single source of truth (the `orchestrate`
symlink is only needed for the orchestrator mode):
````

## 10. Original README.md:83-90 — 33 words

**Moved and shortened.** Source install is optional; keeps mkdir, links, export and one names table, but cuts the explanatory fresh-account story.

Original passage:

````markdown
```bash
git clone https://github.com/Nowely/codex-delegate.git
cd codex-delegate
mkdir -p ~/.claude/skills                           # absent on a machine that has never run Claude Code
ln -s "$PWD/skills/seat" ~/.claude/skills/seat
ln -s "$PWD/skills/orchestrate" ~/.claude/skills/orchestrate
ln -s "$PWD/skills/cleanup" ~/.claude/skills/cleanup
```
````

## 11. Original README.md:92-94 — 25 words

**Moved and shortened.** Source install is optional; keeps mkdir, links, export and one names table, but cuts the explanatory fresh-account story.

Original passage:

````markdown
On this clone-and-symlink route the skill is `seat` and the modes are `/orchestrate` and
`/cleanup`; on the plugin route they are `codex-delegate:seat`, `/codex-delegate:orchestrate`
and `/codex-delegate:cleanup`.
````

## 12. Original README.md:96-97 — 33 words

**Moved and shortened.** Source install is optional; keeps mkdir, links, export and one names table, but cuts the explanatory fresh-account story.

Original passage:

````markdown
The `mkdir -p` is not decoration: without it every `ln -s` call fails with `No such file or directory`
on a fresh account, which is exactly the account this route is written for.
````

## 13. Original README.md:99-110 — 150 words

**Rebuilt.** States absolute state requirement/precedence and complete source export. Removes fixed-path and uninstall/permission-mode guarantees not established by this checkout; retains conditional folder-access guidance.

Original passage:

````markdown
**Where the driver's state lives.** `${CLAUDE_PLUGIN_DATA}`, the plugin's own data directory, which
Claude Code substitutes into the skill's recipes and which this install resolves to
`~/.claude/plugins/data/codex-delegate-nowely/` (the plugin's name, then the marketplace's). The
answers and the isolated Codex home, the
write locks, the worktree ledger and the orchestrator mode's run directories are all there. It survives
plugin updates; an uninstall deletes it unless you pass `claude plugin uninstall --keep-data`, and
`/codex-delegate:cleanup` lists what is in it and removes what you choose. The driver
keeps no default of its own: with neither that variable nor `CODEX_DELEGATE_STATE_DIR` it exits 2. In
every permission mode but auto and bypass, a write outside the working directory prompts, so add that
directory to `permissions.additionalDirectories` once — this plugin adds no rules on your behalf. On the
clone-and-symlink route nothing substitutes the placeholder, so export an absolute path of your own
instead, in your shell profile:
````

## 14. Original README.md:116-117 — 22 words

**Moved and qualified.** Checks moved below first use; preserves root location, skipped cases, version check and separate live opt-ins instead of an unconditional no-model/cost promise.

Original passage:

````markdown
Verify the install from the checkout (plugin installs carry the suites too, under the plugin root) —
costs nothing, calls no model:
````

## 15. Original README.md:123-124 — 28 words

**Moved and qualified.** Checks moved below first use; preserves root location, skipped cases, version check and separate live opt-ins instead of an unconditional no-model/cost promise.

Original passage:

````markdown
A plugin root carries no git metadata, so the `package` suite's tag and payload cases announce
themselves there as skipped instead of failing; from the checkout they run.
````

## 16. Original README.md:126-129 — 64 words

**Moved and qualified.** Checks moved below first use; preserves root location, skipped cases, version check and separate live opt-ins instead of an unconditional no-model/cost promise.

Original passage:

````markdown
The `fidelity` suite is what to watch after a `codex` upgrade: it performs a real handshake and diffs
it against the fixture, so protocol drift shows up as a failing case instead of a confident wrong
answer. Without `codex` on `PATH` it skips and exits 0, which is what CI does; the release checklist
([RELEASING.md](RELEASING.md)) runs it locally, where the skip becomes a failure.
````

## 17. Original README.md:131-135 — 68 words

**Shortened.** Keeps the repository/plugin-root and symlink-resolution instruction; cuts the explanatory ls-versus-Node anecdote.

Original passage:

````markdown
Run the suites from the **repository or plugin root**. Do not compute that root by appending `../..`
to the skill path: where the skill is a symlink (the clone-and-symlink install above), Node collapses
`..` lexically and lands somewhere that does not exist, while `ls` follows the link and appears to
work. Resolve the link, or use the install path announced when the skill loads, or `installPath` in
`installed_plugins.json`.
````

## 18. Original README.md:141-146 — 29 words

**Moved and completed.** Terminal example is optional, stack-neutral, and includes its own state assignment.

Original passage:

````markdown
```bash
node skills/seat/scripts/driver.mjs --cwd . --brief \
  --prompt 'TASK: describe this repository in two sentences, after listing its files.
CHECK: name three real files.
RETURN: the two sentences.'
```
````

## 19. Original README.md:148-153 — 66 words

**Corrected.** Replaces exit-0-means-command-ran and receipt-validation wording with the actual command-item floor, waivers and metadata-only receipt check.

Original passage:

````markdown
The JSON report — the only report — ends with the verdict: `exitCode: 0` means the turn completed, every
declared check passed, and a command really ran; anything else is a specific complaint — the driver's
`--help` documents the full ladder. `threadId` continues the conversation via `--resume`; `receiptPath` and
`receiptOk` locate and validate the run's rollout
([receipt details](skills/seat/references/environment-and-internals.md#receipt-validation-and-reporting)
say what that does and does not prove).
````

## 20. Original README.md:155-163 — 132 words

**Moved and qualified.** Normal Claude first use precedes optional shell use; preserves prompt/report contracts, modes and no-clobber behavior; missing report stays unknown.

Original passage:

````markdown
Inside Claude Code you rarely type this yourself: the skill's `SKILL.md` is the operating manual the
agent reads mid-task, including when to give a panel seat to Codex at all. With the plugin installed it
is `codex-delegate:seat` (the clone-and-symlink spellings are under Install). A seat is one
background Bash call of that same driver: the prompt in a file named by `--seat-file`, the report at
`--report-file`; add `SEAT: worktree <repo>` above `TASK:` for a managed writer. The
driver parses that header, launches one seat, waits as long as the work takes, makes the directories the
report path needs at 0700, and publishes the report there by hard link, never over an existing entry: the
coordinator reads the file when the call's exit notification arrives, and a missing file means unknown,
never success.
````

## 21. Original README.md:174-178 — 90 words

**Reworded, substance kept.** All-readable-path exposure, default network, no allowlist and separate provider search remain directly beside the rights table.

Original passage:

````markdown
Egress is on at both levels, as it is for a native subagent, and no host list narrows it; `--no-network`
is what takes it away, from the sandbox — the provider's own web search is a separate channel, off until
`--web-search` asks for it, and a denied sandbox and a granted search mode are accepted together. Egress
moves nothing on disk — a read seat still writes only `$TMPDIR` — but whatever a seat can read it can
send, and at read level that is every path you can read.
````

## 22. Original README.md:182-185 — 74 words

**Corrected.** Removes the false no-registry/no-collector assertion and unconditional lifetime/delivery wording; documents limits, best-effort interruption and job records.

Original passage:

````markdown
A run lives exactly as long as its call: there is no run registry and no collector, and the caller that
started a seat owns its lifetime. `--report-file` is the delivery that survives a broken pipe, and a
seat is stopped by `SIGTERM` to the pid the driver prints on its first stderr line — the turn is
interrupted, the report it had earned is written anyway, and the codex process group is swept.
````

## 23. Original README.md:189-206 — 239 words

**Consolidated and corrected.** Trust claims now sit with report inspection. Removes process-always-zero and receipt-per-run absolutes; keeps verifier privileges, proxies, sandbox assertions and optional host-home behavior.

Original passage:

````markdown
- **Exit codes from evidence.** The `codex` process always exits 0; the driver derives an ordered
  ladder of exit codes from the event stream. The driver's `--help` is the complete ladder;
  `SKILL.md` gives the decisions a coordinator makes on it.
- **Evidence gates.** `--verify '<shell>'` runs after the turn, executed by the driver, never authored by
  the model — but with the coordinator's own rights, env and network, so a verifier that executes tree
  contents (`npm test` runs the seat's `package.json` script) is running the seat's code; prefer one
  that does not, or add `--verify-sandboxed` to put it behind the read profile, which confines its
  writes to `$TMPDIR` and hands it the seat's own egress, a denial included;
  `--expect-command <regex>` demands the work matched a declared signature;
  `--output-schema <file>` demands a JSON answer matching a schema. Semantics, and how each gate can
  be fooled: the driver's `--help` and [references/result-gates.md](skills/seat/references/result-gates.md).
- **Sandbox asserted, not assumed.** The rights the server reports are compared against the rights that
  were asked for, and a mismatch refuses the run instead of proceeding under an unknown sandbox.
- **A receipt per run.** `receiptPath`/`receiptOk` locate the rollout and check it names this thread;
  what that does and does not prove is in
  [the internals reference](skills/seat/references/environment-and-internals.md#receipt-validation-and-reporting).
- **Isolation by default.** Runs use a private `CODEX_HOME`, so your plugins, skills and MCP servers
  stay out of the turn and no trust records are written back; `--host-home` opts out.
````

## 24. Original README.md:210-216 — 101 words

**Scoped to dated evidence.** Replaces current/universal upstream claims with the local 2026-08-31 comparison, plugin 1.0.6 and Codex 0.150.1; keeps the reference to advantages and defects.

Original passage:

````markdown
The official `openai-codex` plugin is architecturally the same idea and richer in places — background
jobs, resume UX, a stop-time review gate. It is not a substitute where rights matter: it hardcodes an
approval policy that managed (MDM) machines clamp into deny-everything, and it always sends an explicit
`sandbox` parameter, which suppresses the permission profile that makes read-level test runs possible —
on every machine, managed or not. Both defects are silent: the run still exits 0. The `codex
exec`-based skills and the official SDK hit the same walls. Full forensics, upstream issue state, and
what the plugin does better: [references/why-not-the-plugin.md](skills/seat/references/why-not-the-plugin.md).
````

## 25. Original README.md:220-226 — 79 words

**Scoped.** Keeps relevant browser/Node/network/concurrency limits as the reference's tested setup; avoids universal browser and current experimental-label claims without a local CLI check.

Original passage:

````markdown
Read level cannot run browser-mode tests: Chromium needs a one-file override at the tree root, which is
a write a read seat does not have — they run at write level
([Browser-mode sandbox](skills/seat/references/parity.md#browser-mode-sandbox)). Node-environment vitest at read level
needs `--configLoader runner`. Concurrency is memory-bound (figures in
[parity.md](skills/seat/references/parity.md#fan-out-and-reporting)) and exceeding the machine
budget gets runs killed by the OS, not throttled. The app-server protocol is `[experimental]` and
carries no stability promise — hence the pinned schema and the fidelity suite.
````

## 26. Original README.md:230-234 — 20 words

**Rebuilt.** Retains full-schema history and commit hash; supplies extraction prerequisite and moves pruning before conformance to match unused-file rejection.

Original passage:

````markdown
```bash
codex app-server generate-json-schema --out <tmp-new>/
git archive 7364f7b schema-<old-version> | tar -x -C <tmp-old>/
diff -r <tmp-old>/schema-<old-version>/ <tmp-new>/
```
````

## 27. Original README.md:236-242 — 87 words

**Rebuilt.** Retains full-schema history and commit hash; supplies extraction prerequisite and moves pruning before conformance to match unused-file rejection.

Original passage:

````markdown
Read the diff for anything structural. Commit `<tmp-new>/` as `schema-<new-version>/` in a commit of its
own: that commit holds the full tree the next upgrade diffs against, so replace `7364f7b` above with its hash.
`CODEX_DELEGATE_SCHEMA_DIR=schema-<new-version> node evals/conformance.test.mjs` validates it while
`schema-<old-version>/` is still the pinned one; once that is green, move `PINNED_CODEX`, prune the new
directory to the files [conformance](evals/conformance.test.mjs) loads in a second commit, and delete the old one. Then
`npm test` and `node evals/fidelity.test.mjs --require-live`, inspect any fixture/live difference, and
re-check [the dated parity reference](skills/seat/references/parity.md).
````

## 28. Original README.md:246-264 — 161 words

**Consolidated.** Layout becomes a compact purpose/file table; full-schema operational history remains only in the upgrade recipe.

Original passage:

````markdown
```
skills/seat/                     the main skill: SKILL.md (the operating manual), scripts/ (the driver
                                 and its companions, each self-describing under --help), references/
skills/orchestrate/SKILL.md      the orchestrator mode: a delta over the seat skill, prompt only
skills/cleanup/SKILL.md          the cleanup mode: runs scripts/cleanup.mjs, shows its listing and
                                 deletes what the user chose
.claude-plugin/                  plugin + marketplace manifests
evals/                           the suites, one file each; run-all.mjs lists them and runs them
                                 cheapest first, lib/harness.mjs and lib/scenarios.mjs are their
                                 shared machinery
package.json                     private; the Node floor and `npm test`
.github/workflows/ci.yml         the suites that need no `codex` binary, on its OS × Node matrix
schema-<version>/                the files evals/conformance.test.mjs loads out of the pinned protocol
                                 schema; kept in the repo (and therefore in plugin installs) because
                                 those are what the suites this README tells you to run validate
                                 against. The full generated tree is not kept here: the commit named in
                                 the upgrade recipe holds the last one (7364f7b for 0.153.4), and the
                                 recipe diffs the next regeneration against it.
```
````

## 29. Original README.md:268-277 — 94 words

**Consolidated.** Replaces canonical-homes rhetoric and duplicated paths with one files-and-references table.

Original passage:

````markdown
| Subject | Canonical home |
| --- | --- |
| composition, rights, workflow | [`SKILL.md`](skills/seat/SKILL.md) |
| orchestration: tiers, Codex share, seat bounds, returns | [`skills/orchestrate/SKILL.md`](skills/orchestrate/SKILL.md) |
| what the plugin leaves behind, and removing it | [`skills/cleanup/SKILL.md`](skills/cleanup/SKILL.md), `node skills/seat/scripts/cleanup.mjs --help` |
| flags and field formats | `node skills/seat/scripts/driver.mjs --help` (`--help-all` for the rest) |
| environment, seat files, receipts, worktree internals | [`environment-and-internals.md`](skills/seat/references/environment-and-internals.md) |
| native capability parity and dated measurements | [`parity.md`](skills/seat/references/parity.md) |
| measured failures behind rules | [`incidents.md`](skills/seat/references/incidents.md) |
| suite coverage and mutations | [`evals/README.md`](evals/README.md) |
````

## 30. Original README.md:281-290 — 122 words

**Removed and linked.** Removes confidence/age/adversarial-review rhetoric and blanket mutation guarantees; keeps coverage, change history and MIT license pointers without claiming fresh test results.

Original passage:

````markdown
Young code, adversarially reviewed by mixed Claude/Codex panels. What that produced is checkable in the
repository rather than in the claim: the home-directory guard is pinned against case variants, symlinks
and a hostile `$HOME`; the lock's critical section is pinned against overlapping holders; a seat file
cannot introduce a verifier; `$TMPDIR` is guarded like every other writable root; and each suite is
mutation-checked, with the surviving mutants and what was done about them listed in
[`evals/README.md`](evals/README.md). Changes are available offline in
[`CHANGELOG.md`](CHANGELOG.md); release notes and known issues also live on the
[releases page](https://github.com/Nowely/codex-delegate/releases). The Codex build each release was
measured against is stated there because that axis — not the skill's own code — is what usually breaks.
MIT — see [LICENSE](LICENSE).
````
