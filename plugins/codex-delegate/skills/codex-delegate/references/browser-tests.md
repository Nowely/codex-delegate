# Browser-mode tests under the sandbox

<!-- Extracted from SKILL.md: depth a caller does not need while deciding what to run.
     Read it when the pointer in SKILL.md sends you here. -->

Chromium dies under the seatbelt sandbox with `MachPortRendezvousServer: Permission denied`: the profile is
`deny default` and never grants `mach-register`, so `bootstrap_check_in()` fails in the browser process.
`--single-process` never constructs that server. With the override below the full suite runs green inside
the sandbox — 121 files, 2518 passed, identical to an unsandboxed reference run, serial and ~1.6× slower.

Write this **untracked** file at the worktree root, so the repo's own config is untouched:

```ts
// <worktree>/vite.codex.config.ts
import {playwright} from '@vitest/browser-playwright'
import baseConfig from './vite.config'
const config = baseConfig as any
for (const project of config.test.projects) {
	if (project.test?.browser) {
		project.test.browser.provider = playwright({launchOptions: {args: ['--single-process']}})
	}
}
export default config
```

Then run with `--network` (needed for `pnpm install`) and `--no-file-parallelism` (both mandatory):

```
pnpm install --frozen-lockfile && pnpm -w exec vitest run --config vite.codex.config.ts --no-file-parallelism
```

`--single-process` is not a supported Chromium configuration: the renderer shares the browser process's
thread, and it supports exactly ONE BrowserContext — a second context, a popup or a real second tab kills
the browser rather than failing a test. That is a Chromium limit, reproduced identically outside the
sandbox, which is why `--no-file-parallelism` is mandatory and the whole run is serial (~1.6× slower).
`--network` is needed twice over: for `pnpm install`, and because vitest's Vite server binds loopback TCP,
which the base profile refuses. The override casts the imported config to `any` and mutates
`test.projects[].test.browser`; if the repo's `vite.config.ts` is ever refactored into a function, the flag
silently stops applying and the run reverts to the Mach-port crash — loudly, at least.

