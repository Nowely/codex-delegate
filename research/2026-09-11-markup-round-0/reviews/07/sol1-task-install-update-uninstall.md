Lifecycle result

All four goals completed using only the specified README. All writes were directed under `$TMPDIR`. The marketplace was fetched from `https://github.com/Nowely/agent-skills.git`.

State after each goal:

Goal 1 — install
claude plugin list: codex-delegate@nowely 0.13.0, enabled, user scope
Data directory: absent

Goal 2 — update
claude plugin list: codex-delegate@nowely 0.13.0, enabled, user scope
Update result: already latest
Data directory: absent

Goal 3 — uninstall with preserved data
claude plugin list: no plugins installed
Data directory: absent before and after uninstall, so there were no stored answers or run records to preserve. The documented `--keep-data` option was used.

Goal 4 — reinstall and remove marketplace
After reinstall: codex-delegate@nowely 0.13.0, enabled
The requested pre-removal copy failed because the data directory did not exist.
After marketplace removal: no plugins installed
Data directory afterwards: absent

Commands, exit codes, and output

1.
Command:
sed -n '1,240p' /Users/ruliny/Git/agent-skills/research/2026-09-11-markup-round-0/07-lifecycle.md

Exit code: 0

Output:
The complete contents of the specified README were printed. They are the README text supplied as the sole source for this run, beginning with “# codex-delegate” and ending with “MIT — see [LICENSE](LICENSE).”

2.
Command:
export CLAUDE_CONFIG_DIR="$TMPDIR/s1-config"; mkdir -p "$CLAUDE_CONFIG_DIR"

Exit code: 0

Output:
(no output)

3.
Command:
export CLAUDE_CONFIG_DIR="$TMPDIR/s1-config"; claude plugin marketplace add Nowely/agent-skills

Exit code: 0

Output:
Adding marketplace…SSH not configured, cloning via HTTPS: https://github.com/Nowely/agent-skills.git
Refreshing marketplace cache (timeout: 120s)…
Cloning repository (timeout: 120s): https://github.com/Nowely/agent-skills.git
Clone complete, validating marketplace…
Cleaning up old marketplace cache…
✔ Successfully added marketplace: nowely (declared in user settings)

4.
Command:
export CLAUDE_CONFIG_DIR="$TMPDIR/s1-config"; claude plugin install codex-delegate@nowely

Exit code: 0

Output:
Installing plugin "codex-delegate@nowely"...✔ Successfully installed plugin: codex-delegate@nowely (scope: user)

5.
Command:
export CLAUDE_CONFIG_DIR="$TMPDIR/s1-config"; claude plugin list

Exit code: 0

Output:
Installed plugins:

  ❯ codex-delegate@nowely
    Version: 0.13.0
    Scope: user
    Status: ✔ enabled

6.
Command:
export CLAUDE_CONFIG_DIR="$TMPDIR/s1-config"; if [ -d "$CLAUDE_CONFIG_DIR/plugins/data/codex-delegate-nowely" ]; then echo exists; else echo absent; fi

Exit code: 0

Output:
absent

7.
Command:
export CLAUDE_CONFIG_DIR="$TMPDIR/s1-config"; claude plugin marketplace update nowely

Exit code: 0

Output:
Updating marketplace: nowely...Refreshing marketplace cache (timeout: 120s)…
✔ Successfully updated marketplace: nowely

8.
Command:
export CLAUDE_CONFIG_DIR="$TMPDIR/s1-config"; claude plugin update codex-delegate@nowely

Exit code: 0

Output:
Checking for updates for plugin "codex-delegate@nowely" at user scope…
✔ codex-delegate is already at the latest version (0.13.0).

9.
Command:
export CLAUDE_CONFIG_DIR="$TMPDIR/s1-config"; claude plugin list

Exit code: 0

Output:
Installed plugins:

  ❯ codex-delegate@nowely
    Version: 0.13.0
    Scope: user
    Status: ✔ enabled

10.
Command:
export CLAUDE_CONFIG_DIR="$TMPDIR/s1-config"; if [ -d "$CLAUDE_CONFIG_DIR/plugins/data/codex-delegate-nowely" ]; then echo exists; else echo absent; fi

Exit code: 0

Output:
absent

11.
Command:
export CLAUDE_CONFIG_DIR="$TMPDIR/s1-config"; claude plugin uninstall codex-delegate@nowely --keep-data

Exit code: 0

Output:
✔ Successfully uninstalled plugin: codex-delegate (scope: user)

12.
Command:
export CLAUDE_CONFIG_DIR="$TMPDIR/s1-config"; claude plugin list

Exit code: 0

Output:
No plugins installed. Use `claude plugin install` to install a plugin.

13.
Command:
export CLAUDE_CONFIG_DIR="$TMPDIR/s1-config"; if [ -d "$CLAUDE_CONFIG_DIR/plugins/data/codex-delegate-nowely" ]; then echo exists; else echo absent; fi

Exit code: 0

Output:
absent

14.
Command:
export CLAUDE_CONFIG_DIR="$TMPDIR/s1-config"; claude plugin install codex-delegate@nowely

Exit code: 0

Output:
Installing plugin "codex-delegate@nowely"...✔ Successfully installed plugin: codex-delegate@nowely (scope: user)

15.
Command:
export CLAUDE_CONFIG_DIR="$TMPDIR/s1-config"; claude plugin list

Exit code: 0

Output:
Installed plugins:

  ❯ codex-delegate@nowely
    Version: 0.13.0
    Scope: user
    Status: ✔ enabled

16.
Command:
export CLAUDE_CONFIG_DIR="$TMPDIR/s1-config"; if [ -d "$CLAUDE_CONFIG_DIR/plugins/data/codex-delegate-nowely" ]; then echo exists; else echo absent; fi

Exit code: 0

Output:
absent

17.
Command:
export CLAUDE_CONFIG_DIR="$TMPDIR/s1-config"; cp -R "$CLAUDE_CONFIG_DIR/plugins/data/codex-delegate-nowely" "$TMPDIR/codex-delegate-nowely.backup"

Exit code: 1

Output:
cp: /var/folders/mf/9v804k_57lq30kwtlr7468xr0000gn/T//s1-config/plugins/data/codex-delegate-nowely: No such file or directory

18.
Command:
export CLAUDE_CONFIG_DIR="$TMPDIR/s1-config"; claude plugin marketplace remove nowely

Exit code: 0

Output:
✔ Successfully removed marketplace: nowely

19.
Command:
export CLAUDE_CONFIG_DIR="$TMPDIR/s1-config"; claude plugin list

Exit code: 0

Output:
No plugins installed. Use `claude plugin install` to install a plugin.

20.
Command:
export CLAUDE_CONFIG_DIR="$TMPDIR/s1-config"; if [ -d "$CLAUDE_CONFIG_DIR/plugins/data/codex-delegate-nowely" ]; then echo exists; else echo absent; fi

Exit code: 0

Output:
absent

Points where the README left me guessing

1. Marketplace removal syntax

Guess:
claude plugin marketplace remove nowely

Why:
The README says to remove the marketplace but never provides the command. I inferred `remove` from its demonstrated `marketplace add` and `marketplace update` forms. The guess succeeded.

Sentence wished for:
“To remove the marketplace, run `claude plugin marketplace remove nowely`.”

2. Backup destination

Guess:
I chose `$TMPDIR/codex-delegate-nowely.backup`.

Why:
The README says to copy the data directory first but does not give a destination. The task prohibited writes outside `$TMPDIR`.

Sentence wished for:
“Before removing the marketplace, copy `$CLAUDE_CONFIG_DIR/plugins/data/codex-delegate-nowely` to a backup location outside `$CLAUDE_CONFIG_DIR`.”

3. Missing data directory before backup

Guess:
I attempted the copy literally, recorded its failure, and continued because there was no data to lose.

Why:
Neither installation nor update created the named directory, and the task did not ask me to run an agent or fabricate stored records.

Sentence wished for:
“The data directory is created only after the plugin first stores run data; if it does not exist, no backup is necessary.”

4. Position of `--keep-data`

Guess:
I placed it after the plugin identifier:
`claude plugin uninstall codex-delegate@nowely --keep-data`

Why:
The README says “add `--keep-data`” without showing the complete resulting command. The guessed placement succeeded.

Sentence wished for:
“Run `claude plugin uninstall codex-delegate@nowely --keep-data` to preserve its data.”

5. Restart after update

Guess:
I did not restart Claude Code because no Claude Code session was open.

Why:
The README says to restart Claude Code to apply an update but the task began from a shell, and the update found no newer version.

Sentence wished for:
“If no Claude Code session is open, no restart action is needed.”

README sentences observed to be untrue

None conclusively.

The statement that marketplace removal “deletes their stored data too” could not be tested: the documented data directory was already absent before marketplace removal. The plugin itself was observably uninstalled when the marketplace was removed.