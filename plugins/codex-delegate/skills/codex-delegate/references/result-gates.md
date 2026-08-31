# How the result gates can be fooled, and what `--verify` measures

<!-- Extracted from SKILL.md: depth a caller does not need while deciding what to run.
     Read it when the pointer in SKILL.md sends you here. -->

## Bypasses of `--expect-command`

One accidental bypass is worth knowing, because it needs no intent: `pnpm -w exec vitest run | tail -5`
exits with `tail`'s status, so a failing suite reports success, and Codex pipes to `head`/`tail` routinely
just to cap output. The contrived bypass is real too — a command that is literally `true # vitest` scores
`commandsMatchingExpectation: 1`, measured — though it has not been observed in practice: asked directly to
claim work it had not done, Codex refused and said so.

## What `--verify` can and cannot measure

The verifier runs under `/bin/sh`, gets whatever is left of your `--timeout` capped at 300 s, is killed
with `SIGKILL` at that deadline, and its output is captured up to 64 MB.

`verify.measured` splits "your verifier broke" from "the work is not there", because those call for
opposite responses — one means fix the check, the other means redo the work. It is decided by the observed
exit status, not by whether anything went wrong around it:

| observed | meaning | exit |
| --- | --- | --- |
| any status, including non-zero | **measured.** The check ran and gave its verdict | `0` passes, else **9** |
| `127` / `126` | **not measured.** The shell never ran the command — a typo, or a tool missing from the *driver's* `PATH`, which a launchd or hook context routinely lacks | **12** |
| no status at all | **not measured.** Killed at the deadline, or the spawn itself failed | **12** |

A verifier that exits `0` while a background process still holds its stdout is a **pass**: the deadline
fires on the pipe, but the exit status was observed and is proof. Keep verifiers cheap and quiet anyway —
`test -f`, `grep -q`, a targeted test project.

