# codex-delegate

A Claude Code plugin that runs OpenAI Codex agents the way Claude Code runs its own subagents.

A review, a refutation or a competing implementation from the same model is one model's opinion twice. So
one task can go to a panel of Claude and Codex agents, each answer attributed to the model that gave it.

You say what an agent may touch before it starts, and the run stops if Codex grants a different sandbox
or network than that.
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
- codex-cli **0.153.4**, the build this is pinned to and was last measured on. A newer codex is untested,
  and an upgrade of it is the likeliest thing to break a run

```text
you     Have Codex review the last commit and run the tests.

Claude  One Codex agent, gpt-5.6-sol. It reads your files, runs commands and
        reaches the network; it writes nothing of yours.

        Codex gpt-5.6-sol A1 — reviewed the commit and ran the suite green.
        Two findings, both in error handling. …
```

Claude writes each agent's prompt outside your project, so the first run asks permission to write there.

## Commands

You name Codex, or ask for a second opinion, and the plugin takes it from there:

```text
Have Codex check whether this lock is actually held.
Put this on a panel — two of you and one Codex.
Get Codex to refute the second finding.
Let Codex try the fix in a throwaway copy.
Проверь через gpt, вторая имплементация.
No codex on this one, just you.
```

| Command | What it does |
|---|---|
| `/codex-delegate:orchestrate` | Agrees a plan with you, then pushes the verbose steps — tests, greps, diffs, logs — onto Claude and Codex agents, so the main conversation stays small. |
| `/codex-delegate:cleanup` | Lists the scratch and run directories the plugin left on this machine — not your answers, run records or reports — suggests what to remove, deletes only what you pick. |

Both are yours to start; nothing invokes them on your behalf.

## Update and uninstall

```bash
claude plugin marketplace update nowely
claude plugin update codex-delegate@nowely

claude plugin uninstall codex-delegate@nowely --keep-data   # keeps your answers and run records; drop the flag to delete them
```

Restart Claude Code to apply an update; it keeps your stored answers and run records. Removing the
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
- **Writes in a throwaway copy of the repository.** Made for it, removed once what it did has been
  saved — its edits and new files, not anything your `.gitignore` covers — and kept for you to look at
  when the turn, the saving, or the run itself is cut short.
- **Writes in a directory you name.** Your live files: you choose the blast radius.

> [!WARNING]
> A throwaway copy starts at your **last commit**. Uncommitted edits, untracked files and installed
> dependencies are not in it, so an agent asked about work in progress finds nothing and reports success
> on an empty diff. Commit first. A continued agent rebuilds its copy from its last saved work, not from your new
> commits: for those, start a fresh one.

An agent keeps what a native subagent can do: stop one and keep what it earned, continue one with rights
set again, hand it an image, demand JSON against your schema, reach the network, or not — you say which; the model's own web search is a separate switch, off unless
you ask. Several run at once, and read-only ones can share one directory, unless your tooling keeps a
daemon, a socket or a pid file there. The one thing it has that a native subagent does not is proof —
[How it works](#how-it-works); what it lacks is in [Where parity stops](#where-parity-stops).

## What it stores, and what leaves your machine

The plugin sends nothing anywhere itself. What reaches OpenAI is the turn — your prompt, whatever the
agent read on the way to its answer, and the plugin's standing instructions to it — as if you had run
`codex` yourself.

On disk it uses four places:

- **your system temp directory** — each agent's prompt and output files, and whatever a read-only agent
  writes while it works.
- **`~/.claude/plugins/data/codex-delegate-nowely`** — answers, run records, reports, write locks, the
  ledger of throwaway copies, and a Codex home of the plugin's own, sharing only your sign-in and your
  session files, so your own Codex plugins, skills and memories cannot steer a turn.
- **`.claude/worktrees` inside your repository** — the throwaway copies while a turn runs, and a failed
  turn's copy until you remove it or a later throwaway-copy run finds it clean and removes it, keeping any
  commits under `refs/codex-delegate/`; a copy with unsaved files is left as it is, commits and all.
- **`~/.codex/sessions`**, your own Codex home — each turn's full transcript lands there.

Answers, run records and a read-only agent's scratch age out — 14 days or 400 entries, trimmed when a
later run starts; reports and the private home stay until you remove them.

## Where parity stops

By default a Codex agent cannot commit to your repository: its rights stop short of its git directory, so
the work comes back as a diff. Grant that directory only deliberately.

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
come back looking successful.

[The forensics](skills/seat/references/why-not-the-plugin.md), with line numbers and upstream issue
state.

## How it works

One Codex agent is one dependency-free Node script driving `codex app-server`, the only Codex interface with
both per-call rights — sandbox and approval policy — and a machine-checkable record of what ran.

The rights the server says it applied are checked against the ones asked for; a difference stops the run.
The exit code comes from what the turn actually did, not from what it says it did — by default, that it
ran something under those rights; a command that failed does not fail the run unless you asked for that
command by name, and a turn meant to run nothing can say so. That the thread existed is backed by Codex's
own session file, opened and read, not matched by name.

Flags, report fields and exit codes live in the driver's own help, `--help` and `--help-all`:

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
| the run is refused before it starts | the report says why — a full Codex quota window, a held write lock, no state directory; a refusal about the report path itself is on stderr only and leaves whatever was at that path untouched | for quota, wait or use a Claude subagent; for a lock, wait for the run that holds it — or, when that run is dead, stop the Codex processes the refusal names — or give each run its own directory |
| a run dies mid-way in a large fan-out | most likely memory — runs are killed, not queued; a missing report means unknown, never success | ask for fewer at once |
| a run fails after a `codex` upgrade | the interface underneath is experimental | report it, with versions |

Report a problem at [issues](https://github.com/Nowely/agent-skills/issues) with `codex --version`, the
plugin version, and the failing run's report.

## Further reading

- The manual the agent reads: [SKILL.md](skills/seat/SKILL.md)
- What parity was measured, and when: [parity.md](skills/seat/references/parity.md)
- Environment, receipts, locks, worktrees: [environment-and-internals.md](skills/seat/references/environment-and-internals.md)

Young code, but the test cases were mutation-checked on 2026-08-31 and the survivors listed
([evals](evals/README.md)). Changes in [CHANGELOG.md](CHANGELOG.md). MIT — see [LICENSE](LICENSE).
