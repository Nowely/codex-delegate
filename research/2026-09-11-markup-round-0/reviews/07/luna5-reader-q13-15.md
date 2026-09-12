1. Why use this instead of OpenAI’s official “openai-codex” plugin?

Section: “Against the official `openai-codex` plugin”

“On every machine its read-only agents cannot run a test suite, a build, or anything that stages a file — so a review agent launched through it reviews by reading and reports a confident verdict having run nothing.”

“Neither failure announces itself: both runs come back looking successful.”

More than one section: No.

2. Why can a read-only agent not run browser tests?

Sections: “What a Codex agent can do, and what it may touch”; “Where parity stops”

“Reads and runs commands, writes nothing of yours. It reads anything you can read, and one temp directory is the only thing it may write — yours, or the plugin's own when your shell names none. Enough for most test suites, not for browser tests.”

“Browser tests need a writing agent: the override Chromium needs is a file in the tree.”

More than one section: Yes.

3. What should a bug report include?

Section: “Troubleshooting”

“Report a problem at [issues](https://github.com/Nowely/agent-skills/issues) with `codex --version`, the plugin version, and the failing run's report.”

More than one section: No.