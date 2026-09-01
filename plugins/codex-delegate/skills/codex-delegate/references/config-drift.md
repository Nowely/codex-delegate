# Config drift and the key oracle

<!-- Extracted from SKILL.md: depth a caller does not need while deciding what to run.
     Read it when the pointer in SKILL.md sends you here. -->

Misspelled config keys are swallowed silently by both `-c` and the app-server. `tools.web_search` is a real
key that looks like the web-search switch and does nothing; the actual one is top-level `web_search`, which
the driver sets to whatever `--web-search` asked for and to `disabled` only when the flag is absent.

**There are two config surfaces, and this oracle covers one.** The `-c` payload carries `web_search`, the
read profile, `default_permissions`, `model_reasoning_effort` and `sandbox_workspace_write.*`. The
isolated home's `config.toml` carries the four inherited keys (`model`, `model_reasoning_effort`,
`personality`, `service_tier`) and, under `--mcp`, the caller's whole `[mcp_servers]` table — `--mcp`
adds no `-c` entry at all. A key destined for that file has to be validated by putting it in a
config.toml and starting codex under `--strict-config`, not with `-c`.

Validate any new `-c` key offline first:

```bash
codex exec --strict-config -s read-only --skip-git-repo-check -C /tmp \
  -c model_provider=zzz_nonexistent -c <KEY>=<VALUE> 'x'
```

`unknown configuration field` means the key is wrong; `Model provider ... not found` means it was accepted.
A third answer exists: an error naming the key and complaining about its *contents* — `data did not match
any variant of untagged enum WebSearchToolConfigInput in 'tools.web_search'` — means the key is real and
the value is wrong.

**The oracle is blind inside `permissions.<profile>.*`, which is exactly where this skill's newest patch
lives.** Measured:

```
-c 'permissions.foo.extendz=":read-only"'  -> Model provider ... not found      (ACCEPTED — and wrong)
-c 'web_serch=disabled'                    -> unknown configuration field       (caught)
-c 'default_permision="x"'                 -> unknown configuration field       (caught)
```

A misspelled field inside a profile survives `--strict-config` and silently drops what it was meant to
grant, while the profile still applies under its correct id:

```
-c 'permissions.pX.filesystem={":tmpdir"="write"}' -P pX  ->  TMPDIR_WRITABLE
-c 'permissions.pY.filesysten={":tmpdir"="write"}' -P pY  ->  TMPDIR_DENIED
```

This is why the driver's read-level assert checks the **effect** as well as the name: sandbox type
`workspaceWrite`, no network access, the cwd present in `runtimeWorkspaceRoots`, and `writableRoots`
equal to exactly `[$TMPDIR]` — or exactly empty when `--cwd` IS `$TMPDIR`, where the server moves it to
`runtimeWorkspaceRoots` instead — canonicalised on both sides. The profile id is asserted first, but a
name-only check passes in both cases above; verified live, introducing exactly this typo now exits 4
before any model turn. ($TMPDIR itself also goes through the protected-root guard before the turn, so
`TMPDIR=~/.codex/x --level read` is a usage error rather than something this assert has to catch.) Check a profile the same way yourself:

```bash
codex sandbox -c 'permissions.codex_delegate_read.extends=":read-only"' \
  -c 'permissions.codex_delegate_read.filesystem={":tmpdir"="write"}' \
  -P codex_delegate_read -C /tmp -- /bin/sh -c \
  'printf x > "$TMPDIR/p" && echo TMPDIR_OK; printf x > /tmp/p 2>/dev/null && echo SLASHTMP_LEAK; true'
# expect TMPDIR_OK and no SLASHTMP_LEAK.
# TMPDIR_DENIED -> the grant stopped applying; read-level vitest is broken again.
# SLASHTMP_LEAK -> ":read-only" widened upstream; re-check what else the profile now grants.
```

