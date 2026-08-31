# Why not the official plugin, or the exec-based skills

The evidence behind the one-paragraph verdict in README.md. Code claims re-verified 2026-08-31 against
the locally cached plugin source (`~/.claude/plugins/cache/openai-codex/codex/1.0.6/`, the same v1.0.6
/ commit db52e28 the line references below pin), independently by a Claude seat and a Codex seat; the
sandbox behaviour was reproduced live with a raw JSON-RPC probe against codex-cli 0.150.1.

## The two defects, and which machines they bite

**1. Hardcoded approval policy (bites managed machines).** The plugin sends
`approvalPolicy: options.approvalPolicy ?? "never"` at
[`codex.mjs:67`](https://github.com/openai/codex-plugin-cc/blob/db52e28f4d9ded852ab3942cea316258ae4ef346/plugins/codex/scripts/lib/codex.mjs#L67)
and [`:80`](https://github.com/openai/codex-plugin-cc/blob/db52e28f4d9ded852ab3942cea316258ae4ef346/plugins/codex/scripts/lib/codex.mjs#L80),
and no caller in the plugin ever overrides it. A managed profile at
`/Library/Managed Preferences/com.openai.codex.plist` (root-owned, pushed by device management) can
restrict the allowed policies:

```toml
allowed_approval_policies = ["untrusted", "on-request"]
allowed_sandbox_modes    = ["read-only", "workspace-write"]
allowed_web_search_modes = ["cached"]
```

`never` is not in that set, so Codex clamps it to `untrusted` and says so on stderr. Under `untrusted`,
commands, reads and writes raise approval requests — which the plugin's app-server client answers with
JSON-RPC `-32601` (`app-server.mjs:155-159` replies that to EVERY server-to-client request), which
Codex reads as a refusal. The job log shows `File changes declined.` and the run still exits 0.
Reproduced in a clean process: `codex exec -c approval_policy=never … ` → `approval: untrusted`.

**2. Suppressed permission profile (bites every machine).** The plugin sends an explicit `sandbox` on
every `thread/start` — `sandbox: request.write ? "workspace-write" : "read-only"` at
[`codex-companion.mjs:491`](https://github.com/openai/codex-plugin-cc/blob/db52e28f4d9ded852ab3942cea316258ae4ef346/plugins/codex/scripts/codex-companion.mjs#L491)
(and `"read-only"` for reviews) — and sending that parameter at all suppresses any configured
permission profile, the only mechanism that can add `$TMPDIR` to a read-only sandbox. Measured three
ways with a raw probe: omit the parameter and a configured profile applies
(`writableRoots: ["$TMPDIR"]`); send `"read-only"` and `activePermissionProfile` comes back `null` with
no writable roots at all; send `"workspace-write"` and the profile is suppressed too, but `$TMPDIR` and
`/tmp` are open. So a review seat launched through the plugin cannot create a temp directory, and
therefore cannot run a test suite, a build, or anything that stages a file — on ANY machine, MDM or
not (upstream #482 reports the same mechanism from an unmanaged machine). Observed:
`EPERM: operation not permitted, mkdtemp`, and the seat reviewed the code by reading it while the
Claude seats beside it ran the suites — a decorrelated opinion bought and a crippled one delivered.
No flag reaches this: the plugin's surface is
`[--background] [--write] [--resume-last|--resume|--fresh] [--model] [--effort]`.

**Scope this honestly.** On an unmanaged machine the plugin's `--write` path is serviceable for
in-repo tasks (`workspace-write` opens `$TMPDIR` and `/tmp` as a side effect). It is the read/review
seats that are structurally unable to run tests everywhere, and the failure is silent where it counts:
a review comes back with a confident verdict having run nothing.

**Reading the plugin's logs.** `(exit ?)` in
`~/.claude/plugins/data/codex-openai-codex/state/*/jobs/*.log` marks a command whose `exitCode` came
back null — a command with unknown status, emitted per command-execution item (`codex.mjs:274-277`).
A turn that truly ran nothing has no such line at all, which is exactly why the absence is the harder
thing to notice. An earlier version of this analysis read it backwards.

## Why not the exec-based skills

Every surveyed Claude-to-Codex delegation skill drives `codex exec`: `skills-directory/skill-codex`
(~1400 stars), `eddiearc/codex-delegator`, `wywwzjj/cc-skill-codex`, `veithly/codex-skill`, and the MCP
wrappers around it. `codex exec` forces `approval_policy=Never` internally, after config is loaded, so
it hits the same clamp on managed machines — no `-c` override reaches it (three spellings tried, all
`approval: untrusted`). OpenAI's own automation recommendation, `@openai/codex-sdk`, builds
`["exec", "--experimental-json"]` and inherits the same wall.

| | `codex exec` | `codex mcp-server` | `codex app-server` |
| --- | --- | --- | --- |
| status | stable | stable, not measured here | `[experimental]` per `codex --help` |
| per-call approval / sandbox | no — forces `never` | yes | yes |
| works under the managed profile | no | yes | yes |
| proof a command really ran | `--json` | not exposed | `exitCode` + `status` |
| structured output | `--output-schema` | no | `outputSchema` |

`app-server` is the only surface with both per-call rights and a machine-checkable execution signal —
and it is what the official plugin itself uses, so it is the de facto integration path despite the
label.

## Shared skeleton, divergent rights layer

Both this driver and the plugin spawn `codex app-server` and speak thread/turn/item JSON-RPC over
stdio — parallel evolution of one obvious design. The divergence is exactly where trust lives: the
plugin stubs every server-to-client request with `-32601` and asserts nothing about the rights it was
granted; this driver answers each approval method with a schema-correct refusal, pins the approvals
reviewer, asserts the applied sandbox/policy against what was asked, and derives its exit code from the
event stream. That layer is the part upstream has not merged.

## Upstream state (as of 2026-08-31)

- `openai/codex-plugin-cc#426` (PR, open): passes `on-request` for write-capable runs — not enough
  alone, the read paths still send `never`.
- `#482` (open since 2026-07-12): the sandbox-suppression mechanism above, filed from an unmanaged
  machine. **Its fix was written and dropped**: PR `#508` stopped sending the hardcoded value, was
  third-party-verified, and was closed unmerged on 2026-08-11.
- `#273`: the linked-worktree commit failure this skill solves with the git-common-dir writable root.
- `#499` / `#640` / `#641`: the `-32601` stubbing from the other side — every approval and MCP
  request auto-rejected; answering those requests is most of what this driver does.
- `#412` (open since 2026-07-04): the write-path symptom as users meet it — `/codex:rescue` "always
  returns a read-only sandbox error", reported from an unmanaged Windows machine.
- `#240` (open since 2026-04-23): the override mechanism itself — "plugin overrides Codex sandbox
  config", from the bwrap angle.
- Maintainer engagement: every participant on #482/#508 is `NONE`, and 0 of the last 40 closed PRs
  were merged (measured 2026-08-31; an earlier count said 2 of 40). Do not plan around upstream.

A merged #426 plus a merged successor to #508 is the day the write path can go back to the plugin.
The managed-profile case is not reported as such, but its every ingredient is — the hardcoded policy
(#426), the override (#240/#482), the symptom (#412), the auto-rejection (#499/#640/#641) — so a
separate MDM report would add little, and none was filed from here.

## What the plugin does better, and is worth adopting

Verified in its source: a persisted background-job index with progress logs, session-scoped status and
cancel (`lib/state.mjs`, `tracked-jobs.mjs`, `job-control.mjs`); a stop-time review gate as a Claude
Stop hook (`hooks/hooks.json`, `stop-review-gate-hook.mjs`); native `review/start` with target
resolution and a review output schema; `turn/interrupt` through a shared broker; Claude-session import
via `externalAgentConfig`. Adoption order that pays: a job record + resume-by-id status for long runs;
`review/start` at read level (test it with the sandbox-omission trick first); the stop-gate as an
optional companion, not skill machinery.

Nothing here modifies the plugin. Patching `?? "never"` in the plugin cache works and was measured —
and the cache is overwritten on every plugin update, so a fix that silently reverts is worse than none.
