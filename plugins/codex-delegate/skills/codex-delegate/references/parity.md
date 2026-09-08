# Parity with native subagents

Measured 2026-08-30/31 on this repo (driver 0.1.0–0.4.0); the memory and overhead figures are the oldest
numbers here and were not re-measured for the 0.153.4 pin. Treat them as an order of magnitude, and
re-check them on your own machine before sizing a fan-out against them.

## Capability table

The driver's `--help` and `--help-all` are canonical for flags and formats; each cell here gives only the routing choice
and one qualification.

| Native capability | Codex equivalent | Parity |
| --- | --- | --- |
| `Explore` (read-only) | `--cwd <repo>` | reads and runs node tests with constraints; see `--help` |
| agent with `isolation: "worktree"` | `--worktree <repo>` | writes from HEAD without implicit network; see `--help` |
| the same, committing | none | a seat's sandbox ends at its own tree; the work returns as a diff ([Git-directory grant](environment-and-internals.md#git-directory-grant)) |
| one-call wrapped subagent | one background Bash call, `--seat-file` in and `--report-file` out | the call is the seat's lifetime and the file is the delivery; see `--help` |
| fan-out of many agents | concurrent driver invocations | memory-bound rather than throttled; see [Fan-out and reporting](#fan-out-and-reporting) |
| stopping a running agent | `SIGTERM` to the announced pid, or stopping its task | the turn is interrupted and the report it earned is still written; see `--help` |
| continuing an agent's context | `--resume <threadId\|last>` | rights are declared again per call; see `--help` |
| a subagent's MCP tools | `--host-home` | the caller's whole host configuration comes with them; see `--help-all` |
| web search | `--web-search <mode>` | off unless requested; see `--help-all` |
| a local image or audio file | `--attach <file>` | repeatable and command-line only; see `--help` |
| an image the user pasted | `scripts/attach-pasted.mjs` | decodes transcript images before delegation; see `--help` |
| a schema-validated return | `--output-schema <file>` | spends one corrective turn before exit 13; see `--help` |
| a short return plus transcript | `--brief` | full generated text remains at `answerPath`; see `--help` |
| a review pass | [adversarial-review.md](adversarial-review.md) plus [`review-output.schema.json`](../schemas/review-output.schema.json) | one prompt seat under a strict schema, grounded ship/no-ship |
| a permission prompt | none — refused, recorded, exit 6 | widen only the rights settled with the user |

Settle rights through [SKILL.md's rights rules](../SKILL.md#rights).

## Qualifications

### Read and isolated write

A read seat matches native reading, grep, git, node, lint, and node-environment vitest when vitest uses
`--configLoader runner`. Browser-mode vitest cannot run because loopback TCP is refused, and a
composite-project `tsc --noEmit` fails when it writes `tsbuildinfo`.

`--worktree` starts from repository HEAD, not the live tree: commit or stash relevant WIP first, or use
`--level write --cwd <repo>` after settling that blast radius with the user. Dependencies and ignored
files are absent; a verifier that needs them exits 1 unless they are installed in the seat's tree.
Browser tests need `--network`, the serial Chromium override in
[Browser-mode sandbox](#browser-mode-sandbox), and no file parallelism. Install egress is separate from the base
isolation choice: `npm install --cache "$PWD/.npm-cache"` keeps its cache in the tree, while
`pnpm install --frozen-lockfile` works against a warm store.

A seat cannot commit inside its own sandbox, so `worktreeCommitsRef` carries commits only where the
caller's own `--verify` made them; a completed seat retains them even when the tree is otherwise clean.

### Isolation, MCP, and search

Isolation is described in [environment-and-internals.md](environment-and-internals.md#the-isolated-home);
what matters for parity is that the private home carries none of the caller's MCP servers, and that
`--host-home` restores the whole host configuration, its servers and its nondeterminism together.

Supplying a model or effort triggers `model/list` validation before the thread starts. The driver also
reads `account/rateLimits/read` once: an exhausted primary window is refused, while an unavailable
snapshot is reported on stderr and does not block the seat.

Web search is disabled unless a mode is requested. A managed device may allow only some modes; the
driver refuses a forbidden mode with exit 2 instead of accepting a silent substitution.

### Effort

| Effort | Use |
| --- | --- |
| `low` | fact lookup |
| `medium` | ordinary review |
| `high`, `xhigh` | refutation, competing designs, a second implementation |
| `max`, `ultra` | the hardest problems; delegating to its own subagent threads is the model's choice at any effort, measured on 0.153.4 |

### Attachments and pasted images

`--attach` emits protocol `localImage` or `localAudio` items before the prompt and validates every file
before starting a turn. It is unavailable in seat files because an injected field could upload an
unapproved file. Formats and limits are canonical in `--help` and `--help-all`; ordering details are in
[environment-and-internals.md](environment-and-internals.md).

Claude Code retains pasted images only inside its transcript. `attach-pasted.mjs` decodes them before it
calls the driver and preserves turn order; selection, age limits, storage, and downscaling are in
[Pasted-media handling](#pasted-media-handling).

### Watching a turn, and answer shape

There is no progress stream: `threadId` reaches stderr as soon as the thread exists and the rollout under
`~/.codex/sessions` is the full live transcript to tail. The latest `turn/diff/updated` payload is
retained at `turnDiffPath`.

`--output-schema` constrains generation and then validates independently. Every object in the schema
must set `additionalProperties: false` and list all properties in `required`; express optionality with a
nullable type. `--answer-json` is the lighter syntax-only requirement.

`--brief` both asks the model for a short answer and caps the inline copy. The full text the model
actually generated is normally at `answerPath`, but text it never generated cannot be recovered; a null
path is explained in [environment-and-internals.md](environment-and-internals.md).

## Fan-out and reporting

Each delegation has its own app-server and, under `--host-home`, its own MCP-server load.
Measured median memory was about 181 MB per isolated seat (four processes) and 471 MB with `--host-home`
(seven); turn overhead was 7–12 seconds and dominated by provider round-trips. Exceeding the machine budget ends runs with
SIGTERM rather than degrading gracefully. Count every in-flight delegation, drain waves, and give each
concurrent writer its own cwd; read seats take no lock and may share one.

From the main conversation a seat is the blocking driver in a `run_in_background: true` Bash call, which
has no call cap and notifies on completion (measured).

| Launch shape | Notification behaviour | Use when |
| --- | --- | --- |
| one background Bash call per seat | each reports as its own call ends | normal fan-out |
| Workflow agents | each reports by phase | verification and synthesis are staged |
| one shell that ends in `wait` | reports after the slowest child | the next step requires all results |

Do not background a wrapper script that forks driver calls with `&` and exits: the harness tracks its
parent, the children are reparented, and no result returns. The driver finds `codex` through PATH and
standard install locations, so a non-login shell needs no PATH export.

## Browser-mode sandbox

Chromium dies under the seatbelt sandbox with `MachPortRendezvousServer: Permission denied`: the profile is
`deny default` and never grants `mach-register`, so `bootstrap_check_in()` fails in the browser process.
`--single-process` never constructs that server. With the override below the full suite ran green inside
the sandbox — 121 files, 2518 passed, identical to an unsandboxed reference run, serial and ~1.6× slower
(measured once on another repository, before driver 0.4.0 and codex 0.150.1; the shape of the fix is what
carries over, not the numbers — re-measure on yours).

Write this **untracked** file at the worktree root, so the repo's own config is untouched. Note that a
completed `--worktree` turn now archives every untracked file into `worktreeUntrackedPath`, so this
config rides into the harvest: drop it before applying the archive anywhere.

```ts
// <worktree>/vite.codex.config.ts
import {playwright} from '@vitest/browser-playwright'
import baseConfig from './vite.config'
const config = baseConfig as any
for (const project of config.test.projects) {
	if (project.test?.browser) {
		project.test.browser.provider = playwright({launchOptions: {args: ['--single-process']}})
	}
}
export default config
```

Then run with `--network` and `--no-file-parallelism` (both mandatory). `--network` is necessary but not
sufficient for `pnpm install`: the store under `$HOME` is not writable at write level and the driver
refuses to grant `$HOME`, so a COLD store fails even with egress — the run below assumes a warm one.

```
pnpm install --frozen-lockfile && pnpm -w exec vitest run --config vite.codex.config.ts --no-file-parallelism
```

`--single-process` is not a supported Chromium configuration: the renderer shares the browser process's
thread, and it supports exactly ONE BrowserContext — a second context, a popup or a real second tab kills
the browser rather than failing a test. That is a Chromium limit, reproduced identically outside the
sandbox, which is why `--no-file-parallelism` is mandatory and the whole run is serial (~1.6× slower).
`--network` is needed twice over: for `pnpm install`, and because vitest's Vite server binds loopback TCP,
which the base profile refuses. The override casts the imported config to `any` and mutates
`test.projects[].test.browser`. If the repo's `vite.config.ts` is refactored into a FUNCTION, `config.test`
is undefined and the config load throws a `TypeError` — vitest never starts, which is loud. The silent
path is the `project.test?.browser` guard: reshape `test.projects` and the loop quietly becomes a no-op,
the flag stops applying, and the run reverts to the Mach-port crash.

## Pasted-media handling

Selection flags, the `--list` window and the reach-back guard are in
`node "${CLAUDE_SKILL_DIR}/scripts/attach-pasted.mjs" --help`.
Everything after a bare `--` is the driver's; that `--` is what ends attach-pasted's own flags. If the
latest human turn carries no image it refuses with exit 2 and names `--list` rather than reaching back.

There is deliberately **no offset selector** (`back:2`, `--turns N`): machine records — task
notifications, the skill loader's own injections, tool results — share the `user` type and interleave
with yours, and a message queued while you compose the call shifts the count. An offset therefore
selects a *different* image with no error. Copy a uuid from `--list`, which a human can check at a
glance. Record uuids are also **not** stable across sessions: a resumed session copies earlier turns
into its own file with fresh ids, which is what the reach-back guard (`--pasted-allow-old`) is for.

Each image is validated before anything is written (media type against the record, magic bytes against
the media type, and the count and size limits `--help` states), lands in a
per-run directory under the state dir's `pasted/` (the file keeps the source type's extension), mode 0600
in a 0700 directory, and is removed when the run ends. The stderr receipt names
each image — turn, timestamp, the turn's text, index, stored dimensions, size, sha256, path — and says
out loud that it goes to the model provider.

The destination is deliberately not `$TMPDIR`: that is the read level's one writable root, so the very
seat being shown the images could edit them. Two facts before asking for pixel coordinates: Claude Code
**downscales** a paste to at most ~2000 px before storing it (its own meta records say "Multiply
coordinates by 1.73 to map to the original"), so the receipt's `WxH` is the space the seat answers in;
and the images carry no names, so a prompt that says "the first screenshot" must number them itself —
the driver adds no sentence of its own to a prompt you wrote.
