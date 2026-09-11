# Invisible prerequisites

1. **Scope.** The reader may infer that an agent plugin only handles code. Name analysis, document review and designs in the opening.

2. **Two installations.** Claude Code being installed does not establish that Codex CLI is installed and authenticated. Name both, plus Node 22, in the first setup paragraph.

3. **Configuration versus prerequisites.** A reader treats every item under Prerequisites as mandatory. State that creating config.toml is unnecessary at the install decision; describe inheritance under settings.

4. **Entry point.** The reader cannot choose between plugin commands, symlinks and a shell invocation. Recommend the plugin; give a Claude-language first task; label source and terminal routes optional.

5. **Names.** A skill is instructions Claude reads, and a seat is one delegated assignment. Namespace spellings differ between plugin and source installations; show the mapping once.

6. **Process environment.** An export affects programs started from that shell. Plugin recipes forward one state variable; source shells must export another. Missing or relative state means exit 2.

7. **Storage boundaries.** TMPDIR, the plugin state directory and the real ~/.codex are distinct. Scratch writes, saved answers, shared credentials and session records have different locations and cleanup coverage.

8. **Read permission.** Read means a write boundary, not confinement to the chosen folder or denial of network. Retain the rights table and the readable-data/network warning.

9. **Permission notation.** DIR, REPO, cwd and worktree assume shell/Git knowledge. Define placeholders at the table and define the committed snapshot before choosing a worktree.

10. **Worktree starting point.** A fresh checkout does not include unsaved/uncommitted work or installed dependencies. A stash does not change HEAD. Harvesting and final exit are separate.

11. **Instructions versus checks.** TASK/CHECK/RETURN are prose for the model. CLI flags and leading seat-file headers configure the driver; a CHECK sentence is not an executable verifier.

12. **Turn and thread.** A thread is a Codex conversation; the report's command floor counts the main thread, not child agents. A session receipt can predate a resumed turn.

13. **Verdict versus accomplishment.** Exit 0 summarizes implemented checks. A recorded command item may have failed or lack an exit status. Inspect commands and deliverables.

14. **Waiver.** Both --allow-no-commands and ALLOW_NO_COMMANDS: yes permit exit 0 with no main-thread command items; neither cancels --expect-command.

15. **Receipt.** A rollout is a saved session record. Opening metadata proves a matching thread id only. A failed receipt check does not alter the exit verdict; an old session may evade the two-directory search.

16. **Independent checks.** A command-text match and a JSON schema are proxies. A verifier runs with caller rights unless sandboxed and can execute files the seat changed.

17. **Report delivery.** The report file must be absolute and unused. Failure to publish and an absent report cannot be interpreted as task success; neither is a receipt guaranteed.

18. **Lifetime.** No elapsed-time limit does not mean unbounded operation. Silence and command-volume limits still apply; a busy conversation may refuse resume.

19. **Cleanup selection.** Suggested cleanup excludes runs and saved conversations until their numbers are chosen. Selective cleanup is not complete uninstallation.

20. **Cleanup visibility.** Cleanup recognizes only its recorded activity; arbitrary open processes are invisible. It also needs the original temporary root and rejects stale snapshots.

21. **Verification scope.** Fixture tests, live protocol handshakes and real model turns measure different things. Skips are not passes; live-turn opt-ins can spend account usage.

22. **Measurements and comparisons.** Dated parity and official-plugin observations do not prove behavior of today's upstream release. Preserve dates, version numbers and pointers.

23. **Repository-root commands.** A symlinked skill directory is not the repository root. Maintenance commands must start at the checkout/plugin root.

24. **Upgrade order.** The conformance validator rejects unreferenced schema files. Preserve a full schema commit for future diffs, then prune before running conformance.
