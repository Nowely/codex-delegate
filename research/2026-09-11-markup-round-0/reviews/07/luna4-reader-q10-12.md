1. If an agent runs no commands, the plugin reports it as “failed, not finished” by default. GUESSED: The document does not say whether this can be changed. I wished it said how to configure the no-commands result.

Quote — section “codex-delegate”:
“by default, an agent that ran nothing comes back failed, not finished.”

2. Update it with these commands:
“claude plugin marketplace update nowely”
“claude plugin update codex-delegate@nowely”

No, an update does not lose stored answers or run records.

Quote — section “Update and uninstall”:
“Restart Claude Code to apply an update; it keeps your stored answers and run records.”

3. Yes. Install from a clone using the instructions under “Installing from a clone instead.” You lose the plugin command prefix, and `/cleanup` is available only from the plugin install.

Quotes — section “How it works”, subsection “Installing from a clone instead”:
“Update the clone with `git pull`.”
“The modes lose the plugin's prefix here: `/seat`, not `/codex-delegate:seat`; `/cleanup` runs only from the plugin install.”

The document does not state any other losses.

No answer required more than one section.