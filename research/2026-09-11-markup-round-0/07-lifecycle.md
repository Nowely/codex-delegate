# codex-delegate

A Claude Code plugin that runs OpenAI Codex agents the way Claude Code runs its own subagents.

A review, a refutation or a competing implementation from the same model is one model's opinion twice. So
one task can go to a panel of Claude and Codex agents, each answer attributed to the model that gave it.

You say what an agent may touch before it starts, and the run stops if the server grants anything else.
Its verdict comes from the record of the turn, not from what it reports: by default, an agent that ran
nothing comes back failed, not finished.

## Quick start

```bash
claude plugin marketplace add Nowely/agent-skills
claude plugin install codex-delegate@nowely
```

An install from the shell does not reach a session that is already open: run `/reload-plugins` there, or
start a new one.

You need:

- `codex` installed and signed in — check with `codex login status`. Agents run under that sign-in and
  spend its quota
- Node 22 or newer
- codex-cli **0.153.4**, the build this was measured against. A newer codex is untested, and an upgrade
  of it is the likeliest thing to break a run

Then ask for the work in the conversation.

```text
you     Have Codex review the last commit and run the tests.

Claude  One Codex agent, gpt-5.6-sol. It reads your files, runs commands and
        reaches the network; it writes nothing of yours.

        Codex gpt-5.6-sol A1 — reviewed the commit and ran the suite green.
        Two findings, both in error handling. …
```

Claude briefs each agent by writing its prompt to a file outside your project, so the first run asks your
permission to write there.

## Commands

Most of the time you type nothing special — you name Codex, or ask for a second opinion, and the plugin
takes it from there:

```text
Have Codex check whether this lock is actually held.
Put this on a panel — two of you and one Codex.
Get Codex to refute the second finding.
Проверь через gpt, вторая имплементация.
No codex on this one, just you.
```

| Command | What it does |
|---|---|
| `/codex-delegate:orchestrate` | Agrees one plan with you, then pushes every verbose step — tests, tree-wide greps, diffs, logs — onto Claude and Codex agents, so the main conversation stays small. |
| `/codex-delegate:cleanup` | Lists what the plugin left on this machine, suggests what to remove, deletes only what you pick. |

Both are yours to start; nothing invokes them on your behalf.

## Update and uninstall

```bash
claude plugin marketplace update nowely
claude plugin update codex-delegate@nowely

claude plugin uninstall codex-delegate@nowely   # add --keep-data to keep your answers and run records
```

Restart Claude Code to apply an update; it keeps your stored answers and run records. Removing the
*marketplace* instead uninstalls every plugin that came from it and deletes their stored data too; if this
plugin's matters, copy its data directory, named under
[What it stores](#what-it-stores-and-what-leaves-your-machine), first.

## What a Codex agent can do, and what it may touch

Three kinds of access, one per call:

- **Reads and runs commands, writes nothing of yours.** It reads anything you can read, and one temp
  directory is the only thing it may write — yours, or the plugin's own when your shell names none.
  Enough for most test suites, not for browser tests.
- **Writes in a throwaway copy of the repository.** Made for it, removed once what it did has been
  saved, and kept for you to look at when the turn or the saving fails.
- **Writes in a directory you name.** Your live files: you choose the blast radius.

> [!WARNING]
> A throwaway copy starts at your **last commit**. Uncommitted edits, untracked files and installed
> dependencies are not in it, so an agent asked about work in progress finds nothing and reports success
> on an empty diff. Commit first. A continued agent rebuilds its copy from its last saved work, not from your new
> commits: for those, start a fresh one.

An agent keeps what a native subagent can do: stop one and keep what it earned, continue one with rights
set again, hand it an image, demand JSON against your schema, reach the network — off in one line.
Several run at once, and read-only ones can share one directory, unless your tooling keeps a daemon, a
socket or a pid file there. The one place the two differ is proof, and that is what
[How it works](#how-it-works) is about.

## What it stores, and what leaves your machine

The plugin sends nothing anywhere itself. What reaches OpenAI is the turn — your prompt, and whatever the
agent read on the way to its answer — exactly as if you had run `codex` yourself.

On disk it uses four places:

- **your system temp directory** — each agent's prompt and output files, and whatever a read-only agent
  writes while it works.
- **`~/.claude/plugins/data/codex-delegate-nowely`** — answers, run records, reports, write locks, the
  worktree ledger, images you attached, the scratch of read-only agents started from a shell that names no
  temp directory, and a Codex home of the plugin's own, so your own Codex plugins, skills and memories
  cannot steer a turn.
- **`.claude/worktrees` inside your repository** — the throwaway copies while a turn runs, and a failed
  turn's copy until you remove it or a later run finds it clean; a crashed run's commits are kept under
  `refs/codex-delegate/`.
- **`~/.codex/sessions`**, your own Codex home — each turn's full transcript lands there, so a check on
  what really ran has something to read.

Answers, run records and that scratch age out by count and by age; reports and the private home stay until
you remove them. A write lock goes when its run ends, and one a killed run left behind is reclaimed by the
next.

## Where parity stops

By default a Codex agent cannot commit: its rights stop short of your repository's git directory, so the
work comes back as a diff. Granting that directory is a widening to decide on its own.

It cannot widen its rights mid-run: the request is refused and recorded, and the run ends saying they
were sized too small — nothing pauses to ask you.

Browser tests need a writing agent: the override Chromium needs is a file in the tree.

A fan-out is bounded by your machine's memory: overshooting gets runs killed, not queued.

What was measured, and when: [parity.md](skills/seat/references/parity.md).

## Against the official `openai-codex` plugin

The same idea, richer in places, but not a substitute where rights matter. On a managed machine the
approval policy it hardcodes is overridden and its writes come back declined. On every machine its
read-only agents cannot run a test suite, a build, or anything that stages a file — so a review agent
launched through it reviews by reading and reports a confident verdict having run nothing. Neither
failure announces itself: both runs come back looking successful.

[The forensics](skills/seat/references/why-not-the-plugin.md), with line numbers and upstream issue
state.

## How it works

One Codex agent is one dependency-free Node script driving `codex app-server`, the only Codex interface with
both per-call rights — sandbox and approval policy — and a machine-checkable record of what ran.

The rights the server says it applied are checked against the ones asked for; a difference stops the run.
The exit code comes from what the turn actually did, not from what it says it did. That a turn happened
at all is backed by Codex's own session file, opened and its first record read rather than matched by
name.

The flags, the report's fields and every exit code are the driver's own help, which is where they stay
accurate:

```bash
node ~/.claude/plugins/marketplaces/nowely/plugins/codex-delegate/skills/seat/scripts/driver.mjs --help
```

<details>
<summary>Installing from a clone instead</summary>

```bash
git clone https://github.com/Nowely/agent-skills.git
mkdir -p ~/.claude/skills
for s in seat orchestrate; do ln -s "$PWD/agent-skills/plugins/codex-delegate/skills/$s" ~/.claude/skills/$s; done
export CODEX_DELEGATE_STATE_DIR="$HOME/.local/state/codex-delegate"
```

That last line belongs in your shell profile — Claude Code has to inherit it, and nothing else supplies
it on this route, where the driver refuses to start rather than invent a location under your home. The
modes lose the plugin's prefix here: `/seat`, not `/codex-delegate:seat`; `/cleanup` runs only from the
plugin install. Update the clone with `git pull`.

</details>

## Troubleshooting

| What you see | What it means | What to do |
|---|---|---|
| the agent reports success and changed nothing | it ran against your last commit, not your working tree | commit, then ask again. Stashing does not help — the copy is still cut at your last commit, and your own edits are gone until `git stash pop` |
| the run is refused before it starts | the report's `error` says why: a full Codex quota window, a held write lock, no state directory | for quota, wait or use a Claude subagent; for a lock, wait for the run that holds it or give each run its own directory |
| a run dies mid-way in a large fan-out, leaving no report | out of memory — runs are killed, not queued | ask for fewer at once |
| a run fails after a `codex` upgrade | the interface underneath is experimental | report it, with versions |

Report a problem at [issues](https://github.com/Nowely/agent-skills/issues) with `codex --version`, the
plugin version, and the failing run's report.

## Further reading

- The manual the agent reads: [SKILL.md](skills/seat/SKILL.md)
- What parity was measured, and when: [parity.md](skills/seat/references/parity.md)
- Environment, receipts, locks, worktrees: [environment-and-internals.md](skills/seat/references/environment-and-internals.md)

Young code, but every test case was mutation-checked and the survivors listed
([evals](evals/README.md)). Changes in [CHANGELOG.md](CHANGELOG.md). MIT — see [LICENSE](LICENSE).
