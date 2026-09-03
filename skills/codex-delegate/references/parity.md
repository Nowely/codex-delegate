# Parity with native subagents

Measured 2026-08-30/31 on this repo (driver 0.1.0–0.4.0); the memory and overhead figures are the
oldest numbers here. Re-check after a codex upgrade.

## Contents

- Capability table
- Qualifications
- Relay transport
- Fan-out and reporting
- Browser-mode sandbox
- Pasted-media handling

## Capability table

The driver's `--help` and `--help-all` are canonical for flags and formats; each cell here gives only the routing choice
and one qualification.

| Native capability | Codex equivalent | Parity |
| --- | --- | --- |
| `Explore` (read-only) | `--cwd <repo>` | reads and runs node tests with constraints; see `--help` |
| agent with `isolation: "worktree"` | `--worktree <repo>` | writes from HEAD without implicit network; see `--help` |
| the same, committing | `--worktree <repo> --commit` | commits persist at `worktreeCommitsRef`; see `--help` |
| fan-out of many agents | concurrent driver invocations | memory-bound rather than throttled; see [Fan-out and reporting](#fan-out-and-reporting) |
| one-call wrapped subagent | `--relay <file>` | launches detached, waits, and returns one envelope with the whole answer; see [Relay transport](#relay-transport) |
| a subagent that outlives the call | `--detach` | returns a handle (exit 10, `turnStatus` running) and the run survives the session; see `--help` |
| collecting a finished subagent | `--wait <id\|last>` | delivers the run's own report byte for byte under its own exit code; see `--help` |
| listing / stopping running agents | `--jobs`, `--cancel <id>` | status derived from pid liveness; a cancel lands the full interrupted report; see `--help` |
| a subagent's MCP tools | `--mcp` | copies representable servers into a private run home; see `--help-all` |
| web search | `--web-search cached\|indexed\|live` | off unless requested; see `--help-all` |
| a local image or audio file | `--attach <file>` | repeatable and command-line only; see `--help` |
| an image the user pasted | `scripts/attach-pasted.mjs` | decodes transcript images before delegation; see `--help` |
| watching a running subagent | `--progress` | reports item starts without delta noise; see `--help` |
| a review pass | `--review uncommitted\|branch:<ref>\|commit:<sha>` | uses the native reviewer; `uncommitted` excludes a fresh `--worktree`; see `--help` |
| correcting a running subagent | `--steer-file <file>` | changes input but never rights; see `--help` |
| a schema-validated return | `--output-schema <file>` | spends one corrective turn before exit 13; see `--help` |
| a short return plus transcript | `--brief` | full generated text remains at `answerPath`; see `--help` |
| branch an existing agent context | `--fork <threadId> [--fork-through <turnId>]` | creates a new resumable thread with the caller's declared rights |
| compact a long continuation | `--resume <threadId> --compact` | compacts before the next turn |
| a subset of MCP tools | `--mcp --mcp-server <name>` | repeatable allowlist; filesystem and network flags still govern built-in tools |
| per-turn reasoning-summary density | `--reasoning-summary auto\|concise\|detailed` | passed as `turn/start.summary` |
| structured adversarial review | [adversarial-review.md](adversarial-review.md) plus [`review-output.schema.json`](../schemas/review-output.schema.json) | strict, grounded ship/no-ship result |
| optional stop-time review | `CODEX_DELEGATE_STOP_GATE=1 node scripts/stop-gate.mjs` | reviews uncommitted work; intentionally not registered as a hook |
| a permission prompt | none — refused, recorded, exit 6 | widen only the rights settled with the user |

Settle rights through [SKILL.md's rights rules](../SKILL.md#rights).

## Qualifications

### Relay transport

The shipped wrapper writes the coordinator's whole prompt to one file, runs `driver.mjs --relay <file>`,
and returns the driver's output verbatim. The driver reads the header and body, starts one detached seat,
waits up to 560 seconds by default, and renders one envelope. A header-less relay file defaults to a read
seat in the current directory; `--seat-file` still requires `SEAT`. The wrapper adds neither a rights line
nor a prompt line.

If the seat is still running, the envelope starts with exit 10 and includes a complete, quoted `collect:`
command using `--relay-collect`. The wrapper repeats that exact command up to 24 times; a caller can repeat
it again by hand. The same envelope always ends with the full answer and its byte count. Use `--wait` when
the JSON report, rather than the relay envelope, is the desired transport.

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

With `--commit`, add and commit succeed because the git common directory is writable. A completed
driver-managed seat retains moved commits at `worktreeCommitsRef` even when the tree is otherwise clean.

### Isolation, MCP, and search

The default private `CODEX_HOME` excludes the user's plugins, skills, MCP tools, and trust records.
`--mcp` copies only representable `[mcp_servers]` entries into a private per-run home, names skipped
entries on stderr, and deletes the home at exit; those servers run with the user's rights. `--host-home`
restores the whole host configuration, including its nondeterminism.

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
| `max`, `ultra` | the hardest problems; `ultra` delegates to its own subagent threads |

### Attachments and pasted images

`--attach` emits protocol `localImage` or `localAudio` items before the prompt and validates every file
before starting a turn. It is unavailable in seat files because an injected field could upload an
unapproved file. Native `--review` refuses attachments because `review/start` carries no input items.
Formats and limits are canonical in `--help` and `--help-all`; ordering details are in
[environment-and-internals.md](environment-and-internals.md).

Claude Code retains pasted images only inside its transcript. `attach-pasted.mjs` decodes them before it
calls the driver and preserves turn order; selection, age limits, storage, and downscaling are in
[Pasted-media handling](#pasted-media-handling).

### Progress, review, steering, and answer shape

`--progress` writes one stderr line for each run/edit/search item start; the rollout under
`~/.codex/sessions` remains the full live transcript. `--review` returns the native review payload as
the answer; failed reviewer probes do not themselves fail the run, and no prompt is required.
`--steer-file` polls once per second, **claims** the file by renaming it aside, sends its text into the
active turn, and never changes rights. The inbox path is free as soon as text is claimed, so a correction
written while the previous one is in flight lands in a fresh file for the next tick.
The latest `turn/diff/updated` payload is retained at `turnDiffPath`.

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
| `--detach` plus a later `--wait` | no notification; poll `--jobs` or block in `--wait` | workflows, `-p` sessions, or direct-driver work past a call cap |
| `--relay` plus its printed `--relay-collect` command | one final envelope after repeated bounded waits | the shipped wrapper or another decision-free text relay |

From the main conversation the short-seat route is the blocking driver in a `run_in_background: true`
Bash call, which has no cap and notifies on completion (measured).

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

    --list                  the last 10 image-bearing human turns: uuid, timestamp, count,
                            stored WxH, first 80 characters. Writes nothing.
    --pasted-turn <uuid>    take that turn instead (repeatable; selected turns are emitted in
                            timestamp order)
    --pasted-pick 1,3-4     1-based indices within ONE selected turn
    --pasted-allow-old      permit a turn >12h older than the session's newest record

Everything after a bare `--` is the driver's; that `--` is what ends attach-pasted's own flags. If the
latest human turn carries no image it refuses with exit 2 and names `--list` rather than reaching back.

There is deliberately **no offset selector** (`back:2`, `--turns N`): machine records — task
notifications, the skill loader's own injections, tool results — share the `user` type and interleave
with yours, and a message queued while you compose the call shifts the count. An offset therefore
selects a *different* image with no error. Copy a uuid from `--list`, which a human can check at a
glance. Record uuids are also **not** stable across sessions: a resumed session copies earlier turns
into its own file with fresh ids, which is what the 12-hour reach-back guard is for.

Each image is validated before anything is written (media type against the record, magic bytes against
the media type, 10 MB each / 25 MB across the whole selection / 20 images), lands at
`~/.codex-delegate/pasted/<pid>-<random>/NN-<sha>.<ext>` (the source type's extension — png, jpg, gif
or webp) mode 0600 in a 0700 directory, and is removed when the run ends. The stderr receipt names
each image — turn, timestamp, the turn's text, index, stored dimensions, size, sha256, path — and says
out loud that it goes to the model provider.

The destination is deliberately not `$TMPDIR`: that is the read level's one writable root, so the very
seat being shown the images could edit them. Two facts before asking for pixel coordinates: Claude Code
**downscales** a paste to at most ~2000 px before storing it (its own meta records say "Multiply
coordinates by 1.73 to map to the original"), so the receipt's `WxH` is the space the seat answers in;
and the images carry no names, so a prompt that says "the first screenshot" must number them itself —
the driver adds no sentence of its own to a prompt you wrote.
