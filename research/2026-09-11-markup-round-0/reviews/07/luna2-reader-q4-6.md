1. Stored data if removing the marketplace

Section: Update and uninstall

“Removing the *marketplace* instead uninstalls every plugin that came from it and deletes their stored data too; if this plugin's matters, copy its data directory, named under [What it stores](#what-it-stores-and-what-leaves-your-machine), first.”

This answer took one section.

2. Several agents and the limit

Sections: What a Codex agent can do, and what it may touch; Where parity stops

“Several run at once, and read-only ones can share one directory, unless your tooling keeps a daemon, a socket or a pid file there.”

“A fan-out is bounded by your machine's memory: overshooting gets runs killed, not queued.”

So, several agents can run simultaneously. The limit is your machine’s available memory; excessive concurrency causes runs to be killed rather than queued.

This answer took more than one section.

3. Whether code is sent to OpenAI

Section: What it stores, and what leaves your machine

“The plugin sends nothing anywhere itself. What reaches OpenAI is the turn — your prompt, and whatever the agent read on the way to its answer — exactly as if you had run `codex` yourself.”

Thus, the plugin itself sends nothing; the turn sent to OpenAI includes your prompt and anything the agent reads while producing its answer.

This answer took one section.