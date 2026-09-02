# Parity with native subagents

Measured 2026-08-30/31 on this repo (driver 0.1.0–0.4.0); the memory and overhead figures are the
oldest numbers here. Re-check after a codex upgrade.

## Contents

- Capability table
- Qualifications
- Fan-out and reporting

## Capability table

The driver's `--help` is canonical for flags and formats; each cell here gives only the routing choice
and one qualification.

| Native capability | Codex equivalent | Parity |
| --- | --- | --- |
| `Explore` (read-only) | `--cwd <repo>` | reads and runs node tests with constraints; see `--help` |
| agent with `isolation: "worktree"` | `--worktree <repo>` | writes from HEAD without implicit network; see `--help` |
| the same, committing | `--worktree <repo> --commit` | commits persist at `worktreeCommitsRef`; see `--help` |
| fan-out of many agents | concurrent driver invocations | memory-bound rather than throttled; see [Fan-out and reporting](#fan-out-and-reporting) |
| a subagent's MCP tools | `--mcp` | copies representable servers into a private run home; see `--help` |
| web search | `--web-search cached\|indexed\|live` | off unless requested; see `--help` |
| a local image or audio file | `--attach <file>` | repeatable and command-line only; see `--help` |
| an image the user pasted | `scripts/attach-pasted.mjs` | decodes transcript images before delegation; see `--help` |
| watching a running subagent | `--progress` | reports item starts without delta noise; see `--help` |
| a review pass | `--review uncommitted\|branch:<ref>\|commit:<sha>` | uses the server's native reviewer; see `--help` |
| correcting a running subagent | `--steer-file <file>` | changes input but never rights; see `--help` |
| a schema-validated return | `--output-schema <file>` | spends one corrective turn before exit 13; see `--help` |
| a short return plus transcript | `--brief` | full generated text remains at `answerPath`; see `--help` |
| a permission prompt | none — refused, recorded, exit 6 | deliberate; see Escalations |

“Escalations” refers to [SKILL.md's escalation and lock rules](../SKILL.md#escalations-and-locks).

## Qualifications

### Read and isolated write

A read seat matches native reading, grep, git, node, lint, and node-environment vitest when vitest uses
`--configLoader runner`. Browser-mode vitest cannot run because loopback TCP is refused, and a
composite-project `tsc --noEmit` fails when it writes `tsbuildinfo`.

`--worktree` starts from repository HEAD, not the live tree: commit or stash relevant WIP first, or use
`--level write --cwd <repo>` after settling that blast radius with the user. Dependencies and ignored
files are absent; a verifier that needs them exits 1 unless they are installed in the seat's tree.
Browser tests need `--network`, the serial Chromium override in
[browser-tests.md](browser-tests.md), and no file parallelism. Install egress is separate from the base
isolation choice: `npm install --cache "$PWD/.npm-cache"` keeps its cache in the tree, while
`pnpm install --frozen-lockfile` works against a warm store.

With `--commit`, add and commit succeed because the git common directory is writable. A completed
driver-managed seat retains moved commits at `worktreeCommitsRef` even when the tree is otherwise clean.

### Isolation, MCP, and search

The default private `CODEX_HOME` excludes the user's plugins, skills, MCP tools, and trust records.
`--mcp` copies only representable `[mcp_servers]` entries into a private per-run home, names skipped
entries on stderr, and deletes the home at exit; those servers run with the user's rights. `--host-home`
restores the whole host configuration, including its nondeterminism.

Web search is disabled unless a mode is requested. A managed device may allow only some modes; the
driver refuses a forbidden mode with exit 2 instead of accepting a silent substitution.

### Attachments and pasted images

`--attach` emits protocol `localImage` or `localAudio` items before the prompt and validates every file
before starting a turn. It is unavailable in seat files because an injected field could upload an
unapproved file. Native `--review` refuses attachments because `review/start` carries no input items.
Formats and limits are canonical in `--help`; ordering details are in
[environment-and-internals.md](environment-and-internals.md).

Claude Code retains pasted images only inside its transcript. `attach-pasted.mjs` decodes them before it
calls the driver and preserves turn order; selection, age limits, storage, and downscaling are in
[pasted-images.md](pasted-images.md).

### Progress, review, steering, and answer shape

`--progress` writes one stderr line for each run/edit/search item start; the rollout under
`~/.codex/sessions` remains the full live transcript. `--review` returns the native review payload as
the answer; failed reviewer probes do not themselves fail the run, and no prompt is required.
`--steer-file` polls once per second, drains appended text into the active turn, and never changes rights.

`--output-schema` constrains generation and then validates independently. Every object in the schema
must set `additionalProperties: false` and list all properties in `required`; express optionality with a
nullable type. `--answer-json` is the lighter syntax-only requirement.

`--brief` both asks the model for a short answer and caps the inline copy. The full text the model
actually generated is normally at `answerPath`, but text it never generated cannot be recovered; a null
path is explained in [environment-and-internals.md](environment-and-internals.md).

## Fan-out and reporting

Each delegation has its own app-server and, under `--host-home` or `--mcp`, its own MCP-server load.
Measured median memory was about 181 MB per isolated seat and 471 MB with `--host-home`; turn overhead
was 7–12 seconds and dominated by provider round-trips. Exceeding the machine budget ends runs with
SIGTERM rather than degrading gracefully. Count every in-flight delegation, drain waves, and give each
concurrent writer its own cwd; read seats take no lock and may share one.

| Launch shape | Notification behaviour | Use when |
| --- | --- | --- |
| one background call per delegation | each reports as it finishes | normal fan-out |
| native wrapper agents launched together | each reports separately | each run needs wrapper reasoning |
| Workflow agents | each reports by phase | verification and synthesis are staged |
| one shell that ends in `wait` | reports after the slowest child | the next step requires all results |

Do not background a wrapper script that forks driver calls with `&` and exits: the harness tracks its
parent, the children are reparented, and no result returns. The driver finds `codex` through PATH and
standard install locations, so a non-login shell needs no PATH export.
