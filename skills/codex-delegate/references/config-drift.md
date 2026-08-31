# Config drift and the key oracle

<!-- Extracted from SKILL.md: depth a caller does not need while deciding what to run.
     Read it when the pointer in SKILL.md sends you here. -->

Misspelled config keys are swallowed silently by both `-c` and the app-server. `tools.web_search` is a real
key that looks like the web-search switch and does nothing; the actual one is top-level `web_search`, which
the driver sets to `disabled`. Validate any new key offline first:

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

This is why the driver's read-level assert checks the **effect** — sandbox type `workspaceWrite` and
`writableRoots` equal to exactly `[$TMPDIR]`, canonicalised on both sides — rather than the profile's name.
A name-only check passes in both cases above; verified live, introducing exactly this typo now exits 4
before any model turn. Check a profile the same way yourself:

```bash
codex sandbox -c 'permissions.codex_delegate_read.extends=":read-only"' \
  -c 'permissions.codex_delegate_read.filesystem={":tmpdir"="write"}' \
  -P codex_delegate_read -C /tmp -- /bin/sh -c \
  'printf x > "$TMPDIR/p" && echo TMPDIR_OK; printf x > /tmp/p 2>/dev/null && echo SLASHTMP_LEAK; true'
# expect TMPDIR_OK and no SLASHTMP_LEAK.
# TMPDIR_DENIED -> the grant stopped applying; read-level vitest is broken again.
# SLASHTMP_LEAK -> ":read-only" widened upstream; re-check what else the profile now grants.
```

