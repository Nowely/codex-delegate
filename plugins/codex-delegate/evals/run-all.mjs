#!/usr/bin/env node
// Every suite under evals/, in one command.
//
//   node evals/run-all.mjs            (or: npm test)
//
// Cheapest first, so a red arrives early. It stops at the FIRST red suite: the later ones cost minutes,
// and a broken driver fails them all with the same cause. Each suite's own output is passed through as it
// arrives; the last line here is the one to read.
//
// Exit 0 only if every suite exited 0. A suite that needs a live binary or an opt-in variable exits 0
// without it and says so in its own last line; the summary repeats that as skipped or not run rather than
// counting it green. --require-live (or REQUIRE_LIVE_CODEX=1) turns fidelity's skip into a failure.

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { measured, parseCount } from "./lib/harness.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
// Hand-ordered, because the order is information (cheapest first), and checked against the directory,
// because a suite file nobody listed here would otherwise never run.
const SUITES = ["orchestrate", "package", "agent-contract", "attach-pasted", "cleanup", "worktree", "cli",
                "conformance", "lock", "protocol", "fidelity", "orchestrate-live"];
const onDisk = fs.readdirSync(HERE).filter((f) => f.endsWith(".test.mjs")).map((f) => f.slice(0, -".test.mjs".length));
const unlisted = onDisk.filter((n) => !SUITES.includes(n)), missing = SUITES.filter((n) => !onDisk.includes(n));
if (unlisted.length || missing.length) {
  console.log(`run-all: SUITES disagrees with evals/: ${[...unlisted.map((n) => `${n}.test.mjs is not listed`),
    ...missing.map((n) => `${n}.test.mjs does not exist`)].join("; ")}`);
  process.exit(2);
}
const requireLive = process.argv.includes("--require-live") || process.env.REQUIRE_LIVE_CODEX === "1";

function runSuite(name) {
  return new Promise((resolve) => {
    const args = [path.join(HERE, `${name}.test.mjs`), ...(name === "fidelity" && requireLive ? ["--require-live"] : [])];
    const p = spawn(process.execPath, args, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    const started = Date.now();
    // Passed through AND captured: a suite that takes minutes must not look hung, and the summary needs
    // the counts out of the line each suite already prints.
    p.stdout.on("data", (d) => { out += d; process.stdout.write(d); });
    p.stderr.on("data", (d) => { out += d; process.stderr.write(d); });
    p.on("close", (code, signal) => resolve({ code, signal, out, ms: Date.now() - started }));
  });
}

const results = [];
let failedName = null, failedCode = 0, failedWhy = "", notRun = 0;
for (const name of SUITES) {
  console.log(`\n=== ${name} ===`);
  const { code, signal, out, ms } = await runSuite(name);
  const count = parseCount(out);
  results.push(`${name} ${count}`);
  // A suite killed by a signal reports `code` null, and `process.exit(null)` exits 0: a killed suite
  // used to end the run green.
  if (code !== 0 || signal) {
    failedName = name;
    failedCode = code ?? 1;
    failedWhy = signal ? `killed by ${signal}` : `exit ${code}`;
    break;
  }
  // Counted below the break, so the red suite is subtracted once — as the red one — and not again here.
  if (!measured(count)) notRun++;
  results[results.length - 1] += ` (${(ms / 1000).toFixed(0)}s)`;
}

console.log(failedName
  // notRun is subtracted on this branch too: a suite that measured nothing is not green whether the run
  // reached the end or stopped at a red one.
  ? `\nrun-all: ${failedName} FAILED (${failedWhy}); ${results.length - 1 - notRun}/${SUITES.length} suites green: ${results.slice(0, -1).join(", ")}`
  : notRun
    ? `\nrun-all: ${SUITES.length - notRun}/${SUITES.length} suites green, ${notRun} not run — ${results.join(", ")}`
    : `\nrun-all: all ${SUITES.length} suites green — ${results.join(", ")}`);
process.exit(failedName ? failedCode : 0);
