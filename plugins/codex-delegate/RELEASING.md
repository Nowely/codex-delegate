# Releasing codex-delegate

Do not publish from an unclean tree. Releases use annotated `vX.Y.Z` tags and matching GitHub release
notes; never move or recreate a published tag.

## Checklist

1. Choose the version and update `.claude-plugin/plugin.json`, `skills/codex-delegate/SKILL.md` and
   `skills/orchestrate/SKILL.md` at `metadata.version`. Confirm the three values and the intended
   `vX.Y.Z` tag match. The package eval enforces this version agreement against the newest tag.
2. Record user-visible changes in `CHANGELOG.md`, including compatibility or breaking-contract notes.
3. For a Codex CLI upgrade, regenerate the versioned schema directory:

   ```bash
   codex app-server generate-json-schema --out schema-<codex-version>/
   ```

   Update the pinned-version references and fixture only to match observed live protocol output.
4. Run the syntax checks under the oldest supported runtime (Node 18), then run every suite:

   ```bash
   node --check skills/codex-delegate/scripts/driver.mjs
   node --check skills/codex-delegate/scripts/attach-pasted.mjs
   npm test
   ```

   `npm test` runs eight suites and includes `package`, which checks the payload and version agreement.
   Do not call a suite green without its final count.
5. Run the local live fidelity gate separately:

   ```bash
   node evals/fidelity.test.mjs --require-live
   ```

   Verify the authenticated Codex build, inspect every fixture/live difference, and re-measure the
   dated parity table after a CLI change. Add `CODEX_DELEGATE_LIVE_TURN=1` when item-shape or probe
   classification changes warrant spending one real turn. Do not make the fixture convenient; it must
   emit what the live server emits.
6. Run the manual live goal-check for the orchestrate skill. It is not in CI: it costs two real
   sessions and a model of each tier.

   - One orchestrated task in a Fable session and one in an Opus session, each starting from
     `/codex-delegate:orchestrate` with no other priming.
   - Record the orchestrator's own context growth from scout to final report (start and end token
     counts from the session), and keep both plans and both final reports with the release notes.
   - Confirm all three hypotheses, and treat any one of them failing as a release blocker:
     self-detection reads the right tier from the system prompt in both sessions; a `gpt-6-astra` seat
     at `EFFORT: xhigh` opens no Codex subagent threads (check the report's command list, root thread
     only); an Opus session accepts the explicit `model` tag on every Claude Agent call.
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
