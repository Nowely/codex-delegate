# Why `--commit` grants the whole git directory

<!-- Extracted from SKILL.md: depth a caller does not need while deciding what to run.
     Read it when the pointer in SKILL.md sends you here. -->

A narrower grant was measured and **rejected**. Whitelisting `{worktrees/<name>, objects, refs, logs/refs}`
does let `git add` + `git commit` through for a linked worktree on the `files` ref backend, but it breaks
`git branch -D` and `git tag -d` (`packed-refs.lock` sits at the `.git` root), breaks `git gc`, prints
`error: Unable to create '.../packed-refs.lock'` on every commit, and cannot be applied at all to a
reftable repo or to a main worktree, where `index.lock` and `COMMIT_EDITMSG` live at the root. It also
breaks any pre-commit hook that stashes (lint-staged runs `git stash`, which needs `refs/stash` at the
`refs/` root).

`workspace-write` has no deny-list, so "grant `.git` but not hooks and config" cannot be said with writable
roots at all — it needs a permissions profile, which is a bigger change than this flag. Until then: prefer
harvesting a diff over granting `--commit`, and when you do grant it, point `--cwd` at a worktree of a
throwaway clone.

The driver's own git is not exposed to what a `--commit` seat writes there. Every git it spawns carries
`-c core.fsmonitor=false -c core.hooksPath=/dev/null -c diff.external=`, every diff adds
`--no-ext-diff --no-textconv`, and each call has a 120-second timeout with `SIGKILL`. Without that,
harvest, worktree removal, and the next checkout ran the seat's hooks, fsmonitor, and external diff with
the caller's rights before anyone read the report. This does not protect the seat's own commands or
`--verify`, which run with the rights granted to them.
