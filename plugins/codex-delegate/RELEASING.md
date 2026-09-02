# Releasing codex-delegate

Do not publish from an unclean tree. Releases use annotated `vX.Y.Z` tags and matching GitHub release
notes; never move or recreate a published tag.

## Checklist

1. Choose the version and update both `.claude-plugin/plugin.json` and
   `skills/codex-delegate/SKILL.md` at `metadata.version`. Confirm the two values and the intended
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

   `npm test` runs seven suites and includes `package`, which checks the payload and version agreement.
   Do not call a suite green without its final count.
5. Run the local live fidelity gate separately:

   ```bash
   node evals/fidelity.test.mjs --require-live
   ```

   Verify the authenticated Codex build, inspect every fixture/live difference, and re-measure the
   dated parity table after a CLI change. Add `CODEX_DELEGATE_LIVE_TURN=1` when item-shape or probe
   classification changes warrant spending one real turn. Do not make the fixture convenient; it must
   emit what the live server emits.
6. Review the complete release diff, confirm no generated scratch files or credentials are tracked, and
   commit the release changes.
7. Create one annotated tag form only:

   ```bash
   git tag -a vX.Y.Z -m 'codex-delegate X.Y.Z'
   ```

8. Push the commit and tag only after the checks above, then create a GitHub release from that tag. Use
   the matching `CHANGELOG.md` entry as the notes, add measured Codex/Node versions and known issues,
   and verify the release page exists. Do not describe a tag alone as a published release.
