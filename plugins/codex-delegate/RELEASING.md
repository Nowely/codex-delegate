# Releasing codex-delegate

Do not publish from an unclean tree. Releases use annotated `vX.Y.Z` tags and matching GitHub release
notes; never move or recreate a published tag.

## Checklist

1. Choose the version and set it in the four places `evals/package.test.mjs` compares:
   `.claude-plugin/plugin.json`, the `metadata.version` line of every `skills/*/SKILL.md`, and the
   driver's `VERSION`. Its version case fails naming the one you missed. Confirm the value and the
   intended `vX.Y.Z` tag match: the package eval compares them once a `v*` tag is on `HEAD`, and
   announces itself as skipped before that (this checklist tags at step 8, after `npm test` at step 4).
2. Record user-visible changes in `CHANGELOG.md`, including compatibility or breaking-contract notes.
3. For a Codex CLI upgrade, follow README.md › After a codex upgrade, then update the pinned-version
   references and fixture only to match observed live protocol output.
4. Run the syntax checks under the oldest supported runtime (the floor `package.json` declares), then run
   every suite:

   ```bash
   for f in skills/codex-delegate/scripts/*.mjs evals/*.mjs evals/lib/*.mjs; do node --check "$f"; done
   npm test
   ```

   `npm test` runs every suite, `package` among them, which checks the payload and version agreement.
   Do not call a suite green without its final count.
5. Run the local live fidelity gate separately:

   ```bash
   CODEX_DELEGATE_LIVE_TURN=1 node evals/fidelity.test.mjs --require-live
   ```

   Verify the authenticated Codex build, inspect every fixture/live difference, and after a CLI change
   confirm the dated parity figures still hold as an order of magnitude. `CODEX_DELEGATE_LIVE_TURN=1`
   spends one real turn and is what makes the delivery route measured: the `--report-file` assertions —
   the file written, byte-identical to stdout, at 0600, with the pid on the first stderr line — live only
   in that case, so a run without it checks none of them against a real server. For 0.11.0 it is
   mandatory; record its lines in the release notes. Do not make the fixture convenient; it must emit
   what the live server emits.
6. Run the live orchestrate gate. It is not in CI: it spends real sessions and a Codex turn.

   ```bash
   CODEX_DELEGATE_LIVE_ORCHESTRATE=1 node evals/orchestrate-live.test.mjs
   ```

   Add `CODEX_DELEGATE_LIVE_ORCHESTRATE_DELEGATE=1` after a codex upgrade: it spends a second Codex turn
   on a probe that invites the seat to delegate. Whether the seat delegates is the model's choice, but
   when it does the probe checks what the driver made of it: every announced child in `subagentThreads`
   with an `agentPath`, `status: "completed"` and at least one command, and exit 5 whose cause names
   them. Its line beside the case prints the list.

   - Keep the artifact directory the last line prints, plans and session output and reports together,
     with the release notes.
   - Treat any failed case as a release blocker. A skipped case is not a pass: the summary names it.
   - What the cases prove as they now stand: self-detection reads the right tier out of the system
     prompt in both plan-only sessions, one under Opus and one under Fable; an explicit `model` tag is
     obeyed, read back out of each subagent's own system prompt (the model-tag case) and over the whole
     fan-out of a real run (the full-run case); and a `gpt-6-astra` seat answers on its own thread when
     it is not invited to delegate, with the commands in its report (the case of that name). Delegation
     is the model's choice, not effort-gated, so no case asserts that it happens; the probe behind
     `CODEX_DELEGATE_LIVE_ORCHESTRATE_DELEGATE=1` is what checks `subagentThreads` when it does.
   - Record the codex-cli and Claude Code builds used, as the fidelity gate does.

7. Review the complete release diff, confirm no generated scratch files or credentials are tracked, and
   commit the release changes.
8. Create one annotated tag form only:

   ```bash
   git tag -a vX.Y.Z -m 'codex-delegate X.Y.Z'
   ```

9. Push the commit and tag only after the checks above, then create a GitHub release from that tag. Use
   the matching `CHANGELOG.md` entry as the notes, add measured Codex/Node versions and known issues,
   and verify the release page exists. Do not describe a tag alone as a published release.
