#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const enabled = process.env.CODEX_DELEGATE_STOP_GATE === "1";
if (!enabled) process.exit(0);

let hook = {};
if (!process.stdin.isTTY) {
  try { hook = JSON.parse(fs.readFileSync(0, "utf8") || "{}"); }
  catch (e) { process.stderr.write(`codex-delegate stop gate: invalid hook input (${e.message})\n`); process.exit(1); }
}

const cwd = path.resolve(hook.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd());
const git = spawnSync("git", ["-c", "core.fsmonitor=false", "-c", "core.hooksPath=/dev/null",
  "-C", cwd, "status", "--porcelain", "--untracked-files=all"],
  { encoding: "utf8", timeout: 10000 });
if (git.status !== 0) {
  process.stderr.write(`codex-delegate stop gate: cannot inspect ${cwd}: ${String(git.stderr || git.error?.message || `git exit ${git.status}`).trim()}\n`);
  process.exit(1);
}
if (!git.stdout.trim()) process.exit(0);

const driver = path.join(path.dirname(fileURLToPath(import.meta.url)), "driver.mjs");
const run = spawnSync(process.execPath, [driver, "--level", "read", "--cwd", cwd,
  "--review", "uncommitted", "--brief", "--timeout", "300"],
  { cwd, env: process.env, encoding: "utf8", timeout: 310000, maxBuffer: 16 * 1024 * 1024 });
if (run.error?.code === "ETIMEDOUT") {
  process.stderr.write("codex-delegate stop gate: review timed out after 300 seconds\n");
  process.exit(1);
}
// A non-zero exit is a POST-TURN verdict — a failed command, a missed expectation, a cut turn — and the
// driver still reports the ANSWER beside it. Reading only stderr on a non-zero status threw away the
// very review this hook exists to print, so the report is parsed first whatever the status; the driver's
// stderr is the fallback for a run that produced no verdict to show.
let report = null;
try { report = JSON.parse(run.stdout); } catch {}
const answer = typeof report?.answer === "string" ? report.answer.trim() : "";
if (run.status !== 0) {
  if (answer) {
    process.stdout.write(`${answer}\n`);
    process.stderr.write(`codex-delegate stop gate: review exit ${run.status ?? "unknown"}\n`);
  } else {
    process.stderr.write(`codex-delegate stop gate: review failed (exit ${run.status ?? "unknown"})\n${String(run.stderr || run.stdout).trim()}\n`);
  }
  process.exitCode = 1;
} else if (!report) {
  process.stderr.write("codex-delegate stop gate: review returned invalid JSON\n");
  process.exit(1);
} else {
  process.stdout.write(`${answer || "No review verdict was returned."}\n`);
}
