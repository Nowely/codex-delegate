1. GUESSED: Turn off network access in the agent’s per-call rights, using the plugin’s one-line option. The document does not specify the option’s exact syntax.

Section: “What a Codex agent can do, and what it may touch”

Quote: “An agent keeps what a native subagent can do: stop one and keep what it earned, continue one with rights set again, hand it an image, demand JSON against your schema, reach the network — off in one line.”

I wished it said exactly which command-line flag or setting disables network access.

2. It is measured against codex-cli 0.153.4. A newer version is untested and may break a run.

Section: “Quick start”

Quote: “codex-cli **0.153.4**, the build this was measured against. A newer codex is untested, and an upgrade of it is the likeliest thing to break a run”

3. “/codex-delegate:orchestrate” agrees one plan with you, then delegates verbose work such as tests, greps, diffs, and logs to Claude and Codex agents, keeping the main conversation small.

Section: “Commands”

Quote: “Agrees one plan with you, then pushes every verbose step — tests, tree-wide greps, diffs, logs — onto Claude and Codex agents, so the main conversation stays small.”

A plain request in the conversation lets the plugin handle the requested Codex work, but does not provide this explicit planning-and-delegation behavior.

Assembling the answer took more than one section.