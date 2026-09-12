# codex-delegate

A Claude Code plugin that runs OpenAI Codex agents the way Claude Code runs its own subagents.

A review, a refutation or a competing implementation from the same model is one model's opinion twice. So
one task can go to a panel of Claude and Codex agents, each answer attributed to the model that gave it.

You say what an agent may touch before it starts, and the rights Codex reports are checked against that.
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
- codex-cli **0.153.4**, the build this was measured on; a different one is warned about, not refused

```text
you     Have Codex review the last commit and run the tests.

Claude  One Codex agent, gpt-5.6-sol. It reads your files, runs commands and
        reaches the network; it writes nothing of yours.

        Codex gpt-5.6-sol A1 — reviewed the commit and ran the suite green.
        Two findings, both in error handling. …
```

Claude writes each agent's prompt outside your project, so the first run asks permission to write there.

## Commands

You name Codex, or ask for a second opinion, and the plugin takes it from there. Say which model and what
it may touch when you care; say nothing and the agent reads and runs commands but writes nothing, on the
model Claude picks for it:

```text
Have Codex check whether this lock is actually held.
Put this on a panel — two of you and one Codex.
Get Codex to refute the second finding.
Let Codex try the fix in a throwaway copy.
Use Astra for this one, read-only.
No codex on this one, just you.
```

| Command | What it does |
|---|---|
| `/codex-delegate:orchestrate` | Agrees a plan with you, then pushes every verbose step — tests, tree-wide greps, source reading, diffs, logs — onto Claude and Codex agents, so the main conversation stays small. |
| `/codex-delegate:cleanup` | Lists the agents' scratch, orchestration runs, throwaway copies and locks it left, and deletes only what you pick. |

## Update and uninstall

```bash
claude plugin marketplace update nowely
claude plugin update codex-delegate@nowely

claude plugin uninstall codex-delegate@nowely --keep-data   # keeps your answers and run records; drop the flag to delete them
```

Restart Claude Code to apply an update. Removing the
*marketplace* instead uninstalls every plugin that came from it and deletes their stored data, without
asking:

```bash
claude plugin marketplace remove nowely   # copy this plugin's data directory first, if it exists and matters
```

That directory is named under [What it stores](#what-it-stores-and-what-leaves-your-machine).

## What a Codex agent can do, and what it may touch

Three kinds of access, one per call:

- **Reads and runs commands, writes nothing of yours.** It reads anything you can read, and one temp
  directory is the only thing it may write — yours, or the plugin's own when your shell names none.
  Enough for most test suites, not for browser tests.
- **Writes in a throwaway copy of the repository.** Its edits and new files come back to you; the copy
  goes, and with it anything git ignores. A copy whose run was cut short is kept for you to look at.
- **Writes in a directory you name.** Your live files: you choose the blast radius.

> [!WARNING]
> A throwaway copy starts at your **last commit**. Uncommitted edits, untracked files and installed
> dependencies are not in it, so an agent asked about work in progress finds nothing and reports success
> on an empty diff. Commit first. A continued agent rebuilds its copy from its last saved work, not from your new
> commits: for those, start a fresh one.

An agent keeps what a native subagent can do: stop one and keep what it earned, continue one with rights
set again, hand it an image, demand JSON against your schema, reach the network, or not — you say which; the model's own web search is a separate switch, off unless
you ask. Several run at once, and read-only ones can share one directory, unless your tooling keeps a
daemon, a socket or a pid file there. What it adds is proof —
[How it works](#how-it-works); what it lacks is in [Where parity stops](#where-parity-stops).

## What it stores, and what leaves your machine

The plugin sends nothing anywhere itself. What reaches OpenAI is the turn — your prompt, what the
agent read on the way to its answer, and the plugin's standing instructions to it.

On disk it uses four places:

- **your system temp directory** — each agent's prompt and output files, and a read-only agent's scratch.
- **`~/.claude/plugins/data/codex-delegate-nowely`** — answers, run records, reports, locks, and a Codex
  home of the plugin's own: your sign-in and four settings come in, your Codex plugins, skills and
  memories do not.
- **`.claude/worktrees` inside your repository** — the throwaway copies; a failed turn's copy stays until
  you remove it, or until a later throwaway-copy run finds it clean and removes it.
- **`~/.codex/sessions`**, your own Codex home — each turn's transcript.

Answers and run records age out after 14 days or 400 entries; reports and the private home stay until
you remove them.

## Where parity stops

By default a Codex agent cannot commit: its rights stop short of your repository's git directory. Grant
that directory only deliberately.

It cannot widen its rights mid-run: the request is refused and recorded, and the run ends on a declined
approval — nothing in the run pauses to ask you.

Browser tests need a writing agent: the override Chromium needs is a file in the tree.

A fan-out is bounded by your machine's memory: overshooting gets runs killed, not queued.

What was measured, and when: [parity.md](skills/seat/references/parity.md).

## Against the official `openai-codex` plugin

The same idea, richer in places, but not a substitute where rights matter. On a managed machine the
approval policy it hardcodes is overridden and its writes come back declined. On every machine its
read-only agents cannot run a test suite, a build, or anything that stages a file — so a review agent
launched through it reviews by reading and reports a confident verdict having run nothing. Both
come back looking successful ([the forensics](skills/seat/references/why-not-the-plugin.md)).

## How it works

One Codex agent is one dependency-free Node script driving `codex app-server`, the only Codex interface with
both per-call rights — sandbox and approval policy — and a machine-checkable record of what ran.

The rights the server reports are checked against the ones asked for. The exit code comes from the
record of the turn: by default a turn passes if it ran at least one command; a command it must have
run, or a check of your own that must pass, are gates you ask for. The report says whether Codex's own
session file for the thread was found and read.

Flags, gates, report fields and exit codes are the driver's own help, `--help` and `--help-all`:

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

That last line belongs in your shell profile — Claude Code must inherit it; without it the driver refuses
to start. The modes lose the plugin's prefix here: `/orchestrate`, not `/codex-delegate:orchestrate`;
`/cleanup` runs only from the plugin install. Update the clone with `git pull`.

</details>

## Troubleshooting

| What you see | What it means | What to do |
|---|---|---|
| an agent working in a throwaway copy reports success and changed nothing | it ran against your last commit, not your working tree | commit, then ask again. Stashing does not help — the copy is still cut at your last commit, and your own edits are gone until `git stash pop` |
| the run is refused before it starts | the refusal says why: a full Codex quota window, a held write lock, no state directory | do what the refusal says; for quota, wait or use a Claude subagent |
| a run dies mid-way in a large fan-out | most likely memory — runs are killed, not queued; a missing report means unknown, never success | ask for fewer at once |
| a run fails after a `codex` upgrade | the interface underneath is experimental | report it, with versions |

Report a problem at [issues](https://github.com/Nowely/agent-skills/issues) with `codex --version`, the
plugin version, and the failing run's report.

## Further reading

- The manual the agent reads: [SKILL.md](skills/seat/SKILL.md)
- What parity was measured, and when: [parity.md](skills/seat/references/parity.md)
- Environment, receipts, locks, worktrees: [environment-and-internals.md](skills/seat/references/environment-and-internals.md)

Young code; the test suite and what it cannot see are in [evals](evals/README.md). Changes in [CHANGELOG.md](CHANGELOG.md). MIT — see [LICENSE](LICENSE).
