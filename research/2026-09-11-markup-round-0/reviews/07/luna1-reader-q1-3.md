1. GUESSED: It uses your existing Codex sign-in, not a separate plugin account. The document does not explicitly address an OpenAI API key.

Section: Quick start

“You need:

- `codex` installed and signed in — check with `codex login status`. Agents run under that sign-in and spend its quota”

Wished-for sentence: “The plugin does not require an OpenAI API key or a separate account.”

2. Yes, if granted access to the repository’s git directory; otherwise no by default.

Section: Where parity stops

“By default a Codex agent cannot commit: its rights stop short of your repository's git directory, so the work comes back as a diff. Granting that directory is a widening to decide on its own.”

3. Answers and run records are stored at `~/.claude/plugins/data/codex-delegate-nowely`; reports remain there until removed.

Section: What it stores, and what leaves your machine

“`~/.claude/plugins/data/codex-delegate-nowely` — answers, run records, reports, write locks, the worktree ledger, images you attached, the scratch of read-only agents started from a shell that names no temp directory, and a Codex home of the plugin's own”

“Answers, run records and that scratch age out by count and by age; reports and the private home stay until you remove them.”

Assembling each answer took one section; none required more than one section.