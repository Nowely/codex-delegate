// What every suite under evals/ needed a copy of: the paths, the `codex` shim, one spawn helper, the
// case registrar and the pass/fail loop.
//
// It holds no assertions and no cases of its own. A suite keeps its own scenarios, its own runner
// arguments and its own summary line; what moves here is only the machinery three or more of them had
// written out identically — where a fix to one copy (the SIGKILL bell, the deleted-env-var rule, the
// per-case try/catch that stops one bad property access from aborting the rest) reached the others only
// if someone remembered.

import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Straight out of the driver, never restated: a suite holding its own copy of EXIT, of the seat-file
// vocabulary or of the lock's key has a copy that can disagree with the thing it is testing — which is
// what each of them did. Importing is safe because driver.mjs runs main() only as an entry point.
export { ATTACH_KINDS, EFFORTS, ENVELOPE_ANSWER_RE, EXIT, LADDER, LEVELS, SEAT_FIELDS, STATE_SUBDIRS, USAGE, VERSION,
         WEB_SEARCH, lockKey, renderEnvelope } from "../../skills/codex-delegate/scripts/driver.mjs";

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
  // A bounded run, because a HANG is worse than a failure: an undeclared variable in the driver once
  // threw inside an event handler and the suite stalled forever instead of reporting anything.
  const done = new Promise((resolve) => {
    const bell = killAfterMs ? setTimeout(() => { try { child.kill("SIGKILL"); } catch {} }, killAfterMs) : null;
    child.on("close", (code, signal) => {
      if (bell) clearTimeout(bell);
      resolve({ code, signal, out, err, ms: Date.now() - startedAt });
    });
  });
  return { child, done, stdoutSoFar: () => out, stderrSoFar: () => err };
}

// The shape three suites had written out: a name, the reason the case exists, and a function returning
// `true` or the reason it did not.
export function registry() {
  const cases = [];
  return { cases, test: (name, why, fn) => cases.push({ name, why, fn }) };
}

// A THROWING case is a failed case, not a dead suite: without the per-case guard one bad property access
// aborts every case after it and skips the cleanup.
export async function runCases(cases) {
  let failed = 0;
  for (const c of cases) {
    let verdict;
    try { verdict = await c.fn(); }
    catch (e) { verdict = `threw: ${e.message}`; }
    if (verdict === true) console.log(`ok    ${c.name}`);
    else { failed++; console.log(`FAIL  ${c.name}: ${verdict}\n      ${c.why}`); }
  }
  return failed;
}

// The line run-all.mjs parses a suite's count out of; returns the process exit code.
export function summarize(failed, total) {
  console.log(failed ? `\n${failed}/${total} failed` : `\nall ${total} passed`);
  return failed ? 1 : 0;
}

export const readJson = (p) => { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } };
