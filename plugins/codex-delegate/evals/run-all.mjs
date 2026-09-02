#!/usr/bin/env node
// Every suite under evals/, in one command.
//
//   node evals/run-all.mjs            (or: npm test)
//
// Cheapest first, so a red arrives early. It stops at the FIRST red suite: the later ones cost minutes,
// and a broken driver fails them all with the same cause. Each suite's own output is passed through as it
// arrives; the last line here is the one to read.
//
// Exit 0 only if every suite exited 0. fidelity self-skips when the codex binary is absent (that is not a
// fidelity defect) and the summary says so rather than counting it as verified — pass --require-live, or
// set REQUIRE_LIVE_CODEX=1, to make that skip a failure.

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SUITES = ["package", "agent-contract", "attach-pasted", "conformance", "protocol", "lock", "fidelity"];
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
    p.on("close", (code) => resolve({ code, out, ms: Date.now() - started }));
  });
}

// The count each suite states about itself, rather than a tally kept here: a second place to count is a
// second thing that can disagree with the suite it is counting.
const countOf = (out) => {
  const all = out.match(/^all (\d+)\b/m);
  const skipped = out.match(/^(\d+) skipped \(codex binary absent\)/m);
  if (skipped && !/\ball \d+ cases that ran agree/.test(out)) return `${skipped[1]} skipped`;
  return all ? all[1] : "?";
};

const results = [];
let failedName = null, failedCode = 0;
for (const name of SUITES) {
  console.log(`\n=== ${name} ===`);
  const { code, out, ms } = await runSuite(name);
  results.push(`${name} ${countOf(out)}`);
  if (code !== 0) { failedName = name; failedCode = code; break; }
  results[results.length - 1] += ` (${(ms / 1000).toFixed(0)}s)`;
}

console.log(failedName
  ? `\nrun-all: ${failedName} FAILED (exit ${failedCode}); ${results.length - 1}/${SUITES.length} suites green: ${results.slice(0, -1).join(", ")}`
  : `\nrun-all: all ${SUITES.length} suites green — ${results.join(", ")}`);
process.exit(failedName ? failedCode : 0);
