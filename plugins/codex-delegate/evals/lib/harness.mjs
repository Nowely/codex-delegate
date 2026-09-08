// What every suite under evals/ needed a copy of: the paths, the `codex` shim, one spawn helper, the
// case registrar and the pass/fail loop.
//
// It holds no assertions and no cases of its own. A suite keeps its own scenarios, its own runner
// arguments and its own summary line; only the machinery every suite needs identically lives here, so a
// fix to it reaches all of them.

import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Straight out of the driver, never restated: a suite holding its own copy of EXIT, of the seat-file
// vocabulary or of the lock's key has a copy that can disagree with the thing it is testing. Importing
// is safe because driver.mjs runs main() only as an entry point.
export { ATTACH_KINDS, EFFORTS, EXIT, LADDER, LEVELS, PINNED_CODEX, SEAT_FIELDS, STATE_SUBDIRS,
         VERSION, WEB_SEARCH, lockKey } from "../../skills/codex-delegate/scripts/driver.mjs";

export const EVALS = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const ROOT = path.dirname(EVALS);
export const SCRIPTS = path.join(ROOT, "skills", "codex-delegate", "scripts");
export const DRIVER = path.join(SCRIPTS, "driver.mjs");
export const FAKE = path.join(EVALS, "fake-app-server.mjs");

// One exit handler for every temp directory, not one per directory: Node warns past ten listeners, and a
// suite that makes a dozen shims would spend that budget on cleanup alone.
const temps = [];
process.on("exit", () => {
  for (const d of temps) { try { fs.rmSync(d, { recursive: true, force: true }); } catch {} }
});

// Removed on EXIT, not only at the happy end of a suite: a crashed run left the whole tree behind, and
// they accumulate silently in $TMPDIR.
export function tempDir(prefix) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  temps.push(d);
  return d;
}

// The driver spawns `codex` from PATH, so the shim has to be called exactly that.
export function codexShim(dir, target = FAKE) {
  const p = path.join(dir, "codex");
  fs.writeFileSync(p, `#!/bin/sh\nexec "${process.execPath}" "${target}" "$@"\n`, { mode: 0o755 });
  return p;
}

// Spawns `node <args>` and hands back the child beside a promise of its result, so a case that only wants
// the outcome awaits `done` while one that must act mid-run (signal it, close its stdout, read the stderr
// it has produced so far) has the handle to do it.
//
// `undefined` in a spawn env is stringified to "undefined", so a variable a case wants UNSET has to be
// deleted outright — either by giving it that value or by naming it in unsetEnv.
export function spawnNode(args, { env = {}, unsetEnv = [], cwd, stdio = ["ignore", "pipe", "pipe"],
                                  killAfterMs = 0, encoding = "utf8" } = {}) {
  const e = { ...process.env, ...env };
  for (const [k, v] of Object.entries(env)) if (v === undefined) delete e[k];
  for (const k of unsetEnv) delete e[k];
  const child = spawn(process.execPath, args, { env: e, ...(cwd ? { cwd } : {}), stdio });
  let out = "", err = "";
  child.stdout?.setEncoding(encoding);
  child.stderr?.setEncoding(encoding);
  child.stdout?.on("data", (d) => { out += d; });
  child.stderr?.on("data", (d) => { err += d; });
  const startedAt = Date.now();
  // A bounded run, because a HANG is worse than a failure: a throw inside one of the driver's event
  // handlers would stall the suite forever instead of reporting anything.
  const done = new Promise((resolve) => {
    const bell = killAfterMs ? setTimeout(() => { try { child.kill("SIGKILL"); } catch {} }, killAfterMs) : null;
    child.on("close", (code, signal) => {
      if (bell) clearTimeout(bell);
      resolve({ code, signal, out, err, ms: Date.now() - startedAt });
    });
  });
  return { child, done, stdoutSoFar: () => out, stderrSoFar: () => err };
}

// The shape every suite's case has: a name, the reason the case exists, and a function returning
// `true`, skip(why), or the reason it did not.
export function registry() {
  const cases = [];
  return { cases, test: (name, why, fn) => cases.push({ name, why, fn }) };
}

// What a case returns when the machine it is on cannot answer its question: no git repository, no
// mkfifo, a case-sensitive volume. `return true` there is a pass that measured nothing, which is the
// shape these suites exist to refuse — so a skip says so in its own line and leaves the passed count.
const SKIP = Symbol("skip");
export const skip = (why) => ({ [SKIP]: why });
// Written by runCases and read by summarize, which is handed a count and not the cases: the two are
// always called as a pair, once per suite process.
const skipped = [];

// A THROWING case is a failed case, not a dead suite: without the per-case guard one bad property access
// aborts every case after it and skips the cleanup.
export async function runCases(cases) {
  let failed = 0;
  for (const c of cases) {
    let verdict;
    try { verdict = await c.fn(); }
    catch (e) { verdict = `threw: ${e.message}`; }
    if (verdict === true) console.log(`ok    ${c.name}`);
    else if (verdict && verdict[SKIP] !== undefined) {
      skipped.push(c.name);
      console.log(`skip  ${c.name}: ${verdict[SKIP]}`);
    }
    else { failed++; console.log(`FAIL  ${c.name}: ${verdict}\n      ${c.why}`); }
  }
  return failed;
}

// The line run-all.mjs parses a suite's count out of; returns the process exit code.
export function summarize(failed, total) {
  console.log(failed ? `\n${failed}/${total} failed`
    : skipped.length ? `\nall ${total - skipped.length} passed, ${skipped.length} skipped: ${skipped.join("; ")}`
      : `\nall ${total} passed`);
  return failed ? 1 : 0;
}

// The count a suite states about itself in that line, parsed beside the printer rather than tallied by
// run-all: a second place to count is a second thing that can disagree with the suite it is counting.
// A live-only suite exits 0 having run nothing and says so in its own words; those are repeated as
// "skipped" or "not run" so that "all N suites green" cannot come to mean "nothing was measured".
// A suite that ran with some cases announced reports both numbers, which run-all counts as green.
export function parseCount(out) {
  const all = out.match(/^all (\d+)\b/m);
  const partial = out.match(/^all (\d+) passed, (\d+) skipped/m);
  const absent = out.match(/^(\d+) skipped \(codex binary absent\)/m);
  if (absent && !/\ball \d+ cases that ran agree/.test(out)) return `${absent[1]} skipped`;
  if (!all && /NOT RUN/.test(out)) return "not run";
  if (partial) return `${partial[1]} passed, ${partial[2]} skipped`;
  return all ? all[1] : "?";
}

// Which of those forms means the suite measured something. A bare number and the partial form did; a
// whole suite that skipped, a summary line nobody could parse ("?") and "not run" did not, and they
// have to leave the green numerator or "all 9 suites green" comes to mean "nothing was measured".
export const measured = (count) => /^\d+( passed, \d+ skipped)?$/.test(count);

export const readJson = (p) => { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } };
