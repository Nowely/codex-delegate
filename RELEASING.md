# Releasing codex-delegate

Do not publish from an unclean tree. Releases use annotated `vX.Y.Z` tags and matching GitHub release
notes; never move or recreate a published tag.

## Checklist

1. Choose the version and update both `.claude-plugin/plugin.json` and
   `skills/codex-delegate/SKILL.md` at `metadata.version`. Confirm the two values and the intended
   `vX.Y.Z` tag match.
2. Record user-visible changes in `CHANGELOG.md`, including compatibility or breaking-contract notes.
3. For a Codex CLI upgrade, regenerate the versioned schema directory:

   ```bash
   codex app-server generate-json-schema --out schema-<codex-version>/
   ```

   Update the pinned-version references and fixture only to match observed live protocol output.
4. Run the driver syntax check under the oldest supported runtime (Node 18), then run all six suites:

   ```bash
   node --check skills/codex-delegate/scripts/driver.mjs
   node --check skills/codex-delegate/scripts/attach-pasted.mjs
   node evals/protocol.test.mjs
   node evals/lock.test.mjs
   node evals/attach-pasted.test.mjs
   node evals/conformance.test.mjs
   node evals/agent-contract.test.mjs
   node evals/fidelity.test.mjs
   ```

   The baseline on codex-cli 0.150.1 and Node 24 is protocol 120, lock 52, attach-pasted 10,
   conformance 50, agent-contract 9, and fidelity 10. Do not call a suite green without its final
   `all N passed` line.
5. Treat fidelity as a live compatibility gate: verify the authenticated Codex build, inspect every
   fixture/live difference, and re-measure the dated parity table after a CLI change. Do not make the
   fixture convenient; it must emit what the live server emits.
6. Review the complete release diff, confirm no generated scratch files or credentials are tracked, and
   commit the release changes.
7. Create one annotated tag form only:

   ```bash
   git tag -a vX.Y.Z -m 'codex-delegate X.Y.Z'
   ```

8. Push the commit and tag only after the checks above, then create a GitHub release from that tag. Use
   the matching `CHANGELOG.md` entry as the notes, add measured Codex/Node versions and known issues,
   and verify the release page exists. Do not describe a tag alone as a published release.
