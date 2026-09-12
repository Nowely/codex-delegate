Goal 1

Temporary repository:

`/private/var/folders/mf/9v804k_57lq30kwtlr7468xr0000gn/T/codex-lifecycle.YKZh7l`

Commands and output:

```text
$ mktemp -d /private/var/folders/mf/9v804k_57lq30kwtlr7468xr0000gn/T/codex-lifecycle.XXXXXX
/private/var/folders/mf/9v804k_57lq30kwtlr7468xr0000gn/T/codex-lifecycle.YKZh7l

$ git init -b main
Initialized empty Git repository in /private/var/folders/mf/9v804k_57lq30kwtlr7468xr0000gn/T/codex-lifecycle.YKZh7l/.git/

$ git hash-object -w --stdin
[input: committed baseline]
ff254d77ca2e2e3e963857e9a2784308e50744e2

$ git update-index --add --cacheinfo 100644 ff254d77ca2e2e3e963857e9a2784308e50744e2 tracked.txt
[no output]

$ git checkout-index tracked.txt
[no output]

$ env GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_SYSTEM=/dev/null git \
    -c user.name=README-Test \
    -c user.email=readme-test@example.invalid \
    commit -m 'Initial commit'
[main (root-commit) 44c4757] Initial commit
 1 file changed, 1 insertion(+)
 create mode 100644 tracked.txt

$ git hash-object -w --stdin
[input: committed baseline, followed by work in progress]
2b1928dcbfff99f5983147ea8a32f4a1085fffd5

$ git update-index --cacheinfo 100644 2b1928dcbfff99f5983147ea8a32f4a1085fffd5 tracked.txt
[no output]

$ git checkout-index -f tracked.txt
[no output]

$ env GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_SYSTEM=/dev/null git reset HEAD tracked.txt
Unstaged changes after reset:
M	tracked.txt

$ git hash-object -w --stdin
[input: new untracked work]
2d7f1887379591a1fbc45aa93c33ba8f2182af3a

$ git update-index --add --cacheinfo 100644 2d7f1887379591a1fbc45aa93c33ba8f2182af3a new.txt
[no output]

$ git checkout-index new.txt
[no output]

$ env GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_SYSTEM=/dev/null git reset HEAD new.txt
Unstaged changes after reset:
M	tracked.txt

$ env GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_SYSTEM=/dev/null git status --short
 M tracked.txt
?? new.txt
```

The README says the work must be committed before starting the throwaway-copy agent:

Section “What a Codex agent can do, and what it may touch”:

> “A throwaway copy starts at your last commit. Uncommitted edits, untracked files and installed dependencies are not in it, so an agent asked about work in progress finds nothing and reports success on an empty diff. Commit first.”

I therefore ran:

```text
$ env GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_SYSTEM=/dev/null git add tracked.txt new.txt
[no output]

$ env GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_SYSTEM=/dev/null git \
    -c user.name=README-Test \
    -c user.email=readme-test@example.invalid \
    commit -m 'Commit work in progress for agent'
[main 787e2a0] Commit work in progress for agent
 2 files changed, 2 insertions(+)
 create mode 100644 new.txt

$ env GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_SYSTEM=/dev/null git status --short
[no output]

$ env GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_SYSTEM=/dev/null git log --oneline -3
787e2a0 Commit work in progress for agent
44c4757 Initial commit
```

Goal 2

Tell the teammate to commit the work in progress and start another agent. The throwaway copy used their last commit, not their working tree.

Section “Troubleshooting”:

> “the agent reports success and changed nothing”

> “it ran against your last commit, not your working tree”

> “commit, then ask again. Stashing does not help — the copy is still cut at your last commit, and your own edits are gone until `git stash pop`”

Thus, `git stash` would not help: it does not place the edits in the last commit, and it temporarily removes those edits from the teammate’s own working tree.

Goal 3

No. A continued agent will not see the new commit. Start a fresh agent.

Section “What a Codex agent can do, and what it may touch”:

> “A continued agent rebuilds its copy from its last saved work, not from your new commits: for those, start a fresh one.”

Goal 4

The review text itself does not establish success. The recorded activity determines the verdict and exit code. The exact cause of this particular failure is unknown from the symptom alone; the README only says that, by default, doing nothing produces failure.

Opening section:

> “Its verdict comes from the record of the turn, not from what it reports: by default, an agent that ran nothing comes back failed, not finished.”

Section “How it works”:

> “The exit code comes from what the turn actually did, not from what it says it did.”

I would treat the failure as authoritative, inspect the run report/record, and rerun the review with explicit actions such as examining the diff and running relevant checks. If the report showed an unexplained plugin failure, I would follow the README’s reporting instruction.

Section “Troubleshooting”:

> “Report a problem at issues with `codex --version`, the plugin version, and the failing run's report.”

Guesses and missing guidance

- I chose the filenames, contents, branch name, commit messages, and temporary Git identity. I wished the README contained a prescribed fixture if those details mattered.
- The README does not specify exactly what activity qualifies a review as having “actually” run. I guessed that explicitly requesting diff inspection and relevant checks would avoid an unsubstantiated review. I wished it said: “For a review to count as successful, the agent must perform these specific observable actions: …”
- The README says reports and records exist but does not give a reader-facing command for inspecting one. I guessed that inspecting the report is the first diagnostic step. I wished it supplied an exact command for locating and reading the relevant report.
- I did not invoke an actual agent because the README gives conversational examples but no standalone invocation for creating this exact throwaway-copy run without reading further documentation. I wished it contained a complete command or prompt demonstrating that mode.
- Patch-based creation in `$TMPDIR` was attempted but rejected before starting with the exact diagnostic `patch rejected by user`; I used Git plumbing instead.

Contradictions

I found no sentence that was clearly contradicted elsewhere in the README.