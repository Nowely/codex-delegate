// The machinery protocol.test.mjs and cli.test.mjs drive evals/fake-app-server.mjs with: the `codex`
// shim, the files a case points the driver at, one run of the driver per table row under a state root
// of its own, and the loop that grades the rows.
//
// It holds no cases and no assertions. Each suite keeps its own table, its own flows and its own
// summary line; what lives here is only what both need identically, so a fix to it reaches both.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { SCENARIOS } from "../fake-app-server.mjs";
import { DRIVER, ROOT, codexShim, readJson, spawnNode, tempDir } from "./harness.mjs";

const REVIEW_SCHEMA = path.join(ROOT, "skills", "codex-delegate", "schemas", "review-output.schema.json");

const shimDir = tempDir("codex-delegate-test-");
// Use a unique name per run to avoid collisions in the shared $TMPDIR.
const survivorPidName = `verify-survivor-${crypto.randomBytes(4).toString("hex")}.pid`;
codexShim(shimDir);

// A STRICT schema for --output-schema and a non-executable file for verify-126. Measured against the
// live server, a non-strict schema returns 400 invalid_json_schema: additionalProperties must be false
// and required must include every property key.
const schemaFile = path.join(shimDir, "verdict.schema.json");
fs.writeFileSync(schemaFile, JSON.stringify({
  type: "object", additionalProperties: false, required: ["verdict", "count"],
  properties: { verdict: { type: "string", enum: ["ok", "bad"] }, count: { type: "integer" } }
}));
// A $TMPDIR the caller exports, distinct from --cwd: with the two equal the server subtracts the root
// and the "an explicit TMPDIR is honoured" case would pass on an empty list.
const explicitTmp = path.join(shimDir, "explicit-tmp");
fs.mkdirSync(explicitTmp);
const notExec = path.join(shimDir, "not-executable");
fs.writeFileSync(notExec, "#!/bin/sh\necho unreachable\n", { mode: 0o644 });
const laxSchemaFile = path.join(shimDir, "lax.schema.json");
fs.writeFileSync(laxSchemaFile, "{}");
const oneOfSchemaFile = path.join(shimDir, "oneof.schema.json");
fs.writeFileSync(oneOfSchemaFile, JSON.stringify({
  type: "object", additionalProperties: false, required: ["verdict", "count"],
  properties: { verdict: { type: "string" }, count: { type: "integer" } },
  oneOf: [{ required: ["verdict"] }]
}));
// Provider-rejected schema shapes that admission must catch before a delegation starts.
const looseSchemaFile = path.join(shimDir, "loose.schema.json");
fs.writeFileSync(looseSchemaFile, JSON.stringify({
  type: "object", required: ["verdict"], properties: { verdict: { type: "string" } }
}));
const looseNestedSchemaFile = path.join(shimDir, "loose-nested.schema.json");
fs.writeFileSync(looseNestedSchemaFile, JSON.stringify({
  type: "object", additionalProperties: false, required: ["meta"],
  properties: { meta: { type: "object", required: ["n"], properties: { n: { type: "integer" } } } }
}));
const optionalSchemaFile = path.join(shimDir, "optional.schema.json");
fs.writeFileSync(optionalSchemaFile, JSON.stringify({
  type: "object", additionalProperties: false, required: ["verdict"],
  properties: { verdict: { type: "string" }, note: { type: "string" } }
}));
// A required key named after a member of Object.prototype must be treated as absent, not validated
// against an inherited function that adds a spurious error.
const protoSchemaFile = path.join(shimDir, "proto.schema.json");
fs.writeFileSync(protoSchemaFile, JSON.stringify({
  type: "object", additionalProperties: false, required: ["verdict", "count", "toString"],
  properties: { verdict: { type: "string" }, count: { type: "integer" }, toString: { type: "string" } }
}));

// A realistic rollout provides a positive receipt-locator case so an always-null locator cannot pass.
const sessionsDir = path.join(shimDir, "sessions");
const rolloutDay = (() => {
  const d = new Date();
  return path.join(sessionsDir, String(d.getFullYear()),
    String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0"));
})();
fs.mkdirSync(rolloutDay, { recursive: true });
const rolloutLine = (id) => JSON.stringify({
  timestamp: new Date().toISOString(), type: "session_meta",
  payload: { session_id: id, id, cwd: shimDir, originator: "Claude Code",
             cli_version: "0.153.4", source: "vscode", model_provider: "openai" }
});
fs.writeFileSync(path.join(rolloutDay, "rollout-2026-01-01T00-00-00-thr_root.jsonl"), `${rolloutLine("thr_root")}\n`);
// Same filename convention, a session_meta naming a DIFFERENT thread: the file exists, the receipt is
// not this run's, and receiptOk must say so rather than trusting the name.
// A pre-existing state directory with $TMPDIR inside it: the read-level grant must not expose the
// driver's protected state to writes.
const protectedState = path.join(shimDir, "state");
const protectedTmp = path.join(protectedState, "tmp");
fs.mkdirSync(protectedTmp, { recursive: true });

// A directory name with consecutive spaces checks that seat-file parsing preserves the literal path.
const spacedDir = path.join(shimDir, "two  spaces");
fs.mkdirSync(spacedDir);

// A local "screenshot" for the --attach cases: only the extension matters, the fixture never opens it.
const attachFile = path.join(shimDir, "shot.png");
fs.writeFileSync(attachFile, "not-really-a-png");
const attachFile2 = path.join(shimDir, "shot2.png");
fs.writeFileSync(attachFile2, "nor-is-this");

const mismatchSessions = path.join(shimDir, "sessions-mismatch");
const mismatchDay = rolloutDay.replace(sessionsDir, mismatchSessions);
fs.mkdirSync(mismatchDay, { recursive: true });
fs.writeFileSync(path.join(mismatchDay, "rollout-2026-01-01T00-00-00-thr_root.jsonl"), `${rolloutLine("thr_someone_else")}\n`);

// The RPC log for the interrupt case: the effect of turn/interrupt is server-side and otherwise
// invisible, so the fixture records what it was sent.
const interruptLog = path.join(shimDir, "rpc-interrupt.log");
// One log per case that reads it: the fixture APPENDS, so a shared file would let one case read
// another's requests and an "exactly once" assertion would depend on the order the suite runs in.
const modelListLog = path.join(shimDir, "rpc-model-list.log");
const unknownModelLog = path.join(shimDir, "rpc-unknown-model.log");
const rateLimitLog = path.join(shimDir, "rpc-rate-limit.log");

// Read out of the fixture's own inventory rather than trusted: a scenario name a suite misspells
// would reach the fixture's default branch, and a case that measures nothing looks exactly like a
// case that passes.
export function assertKnownScenarios(cases) {
  const unknown = [...new Set(cases.map((c) => c.scenario))].filter((s) => !Object.hasOwn(SCENARIOS, s));
  if (unknown.length) {
    console.log(`FAIL  scenario(s) not in the fixture's inventory: ${unknown.join(", ")}`);
    process.exit(1);
  }
}

let seatSeq = 0;
// One state root per table case: a shared root made every case's config probe, job record and answer
// log an input to the next case's, and the fixture reports the same thread id for all of them.
let caseSeq = 0;
function run(c) {
  return new Promise((resolve) => {
    const stateRoot = path.join(shimDir, "case-state", String(caseSeq++));
    // A seat-file case writes its declaration to disk and passes only --seat-file, exactly as a
    // coordinator does — the point being that no value ever passes through a shell.
    let seatArgs = [];
    if (c.seat) {
      const f = path.join(shimDir, `seat-${seatSeq++}.txt`);
      fs.writeFileSync(f, c.seat.replaceAll("<CWD>", shimDir).replaceAll("<CWDSP>", spacedDir));
      seatArgs = ["--seat-file", f];
    }
    const { child: p, done } = spawnNode(
      // Give cases a wall clock to bound hung fixtures; noTimeout opts out to measure the default.
      [DRIVER, ...(c.seat ? seatArgs : c.noCwd ? [] : ["--level", "read", "--cwd", shimDir]),
       ...(c.noTimeout ? [] : ["--timeout", "20"]),
       ...(c.noPrompt ? [] : ["--prompt", "irrelevant, the server is scripted"]), ...(c.args ?? [])],
      // Use private state so fixture config, locks and answer logs cannot affect real delegations.
      { env: { PATH: `${shimDir}:${process.env.PATH}`, FAKE_SCENARIO: c.scenario,
               CODEX_DELEGATE_STATE_DIR: stateRoot,
               ...(c.env ? Object.fromEntries(Object.entries(c.env).map(([k, v]) => [k, v ?? shimDir])) : {}) },
        unsetEnv: c.unsetEnv ?? [], killAfterMs: 30000 });
    // A consumer that stops reading, one that merely pauses, and one that pauses and never comes back:
    // the three shapes the report's pipe handling has to tell apart.
    if (c.closeStdout) { try { p.stdout.destroy(); } catch {} }
    if (c.pauseStdout) { p.stdout.pause(); setTimeout(() => p.stdout.resume(), c.pauseStdout); }
    if (c.stallStdout) p.stdout.pause();
    done.then((r) => resolve({ ...r, stateRoot }));
  });
}

// One run of the driver per row, its exit code against `expect` and its assertion against the report:
// a FAIL line has to say which of the two was wrong, or a red row reads as a mystery.
export async function runTable(cases) {
  let failed = 0;
  for (const c of cases) {
    const label = `${c.scenario}${c.args?.length ? ` ${c.args.join(" ")}` : ""}`;
    const { code, out, err, ms, stateRoot } = await run(c);
    let report = null;
    try { report = JSON.parse(out); } catch {}
    // Check report contents as well as exit codes so opposite verifier results cannot look identical.
    // An assertion returns true or a reason; a thrown assertion fails its case without aborting the suite.
    let assertion;
    try {
      assertion = c.assertStderr ? c.assertStderr(err, ms)
        : c.assertText ? c.assertText(out)
          // ms as well as the report: a rung whose whole content is WHEN it fires (or does not) cannot be
          // told from one that never armed by reading the report alone.
          : c.assert ? (report ? c.assert(report, ms, stateRoot) : "expected a JSON report, but stdout was not JSON") : true;
    } catch (e) { assertion = `assert threw: ${e.message}`; }
    const ok = code === c.expect && assertion === true;
    if (!ok) {
      failed++;
      let detail = "";
      if (report) {
        detail = ` [turn=${report.turnStatus} cmds=${report.commandsSucceeded} match=${report.commandsMatchingExpectation} esc=${report.escalations?.length} int=${report.interactions?.length} answer=${JSON.stringify(String(report.answer).slice(0, 40))}]`;
      } else { detail = ` [no JSON report: ${out.slice(0, 80)}; stderr: ${err.slice(0, 160)}]`; }
      const wrong = code !== c.expect ? `expected ${c.expect}, got ${code}` : `exit ${code} correct, but the report is wrong: ${assertion}`;
      console.log(`FAIL  ${label}: ${wrong}${detail}\n      ${c.why}`);
    } else {
      console.log(`ok    ${label} -> ${code}`);
    }
  }
  return failed;
}

let flowSeq = 0;
const flowState = () => {
  const d = path.join(shimDir, `flow-state-${flowSeq++}`);
  fs.mkdirSync(d, { recursive: true });
  return d;
};
const recordOf = (state, id = "thr_root") => readJson(path.join(state, "jobs", `${id}.json`));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// Poll until the predicate holds, so a flow never sleeps for a fixed guess.
async function until(fn, ms = 15000) {
  for (const end = Date.now() + ms; Date.now() < end; ) {
    const v = fn();
    if (v) return v;
    await wait(25);
  }
  return null;
}

// What the two suites read off this module: the shim directory they resolve <CWD> against, the files
// a case points the driver at, the runner and the flow helpers.
export {
  shimDir as SHIM, REVIEW_SCHEMA, survivorPidName, schemaFile, explicitTmp, notExec, laxSchemaFile,
  oneOfSchemaFile, looseSchemaFile, looseNestedSchemaFile, optionalSchemaFile, protoSchemaFile,
  sessionsDir, rolloutDay, rolloutLine, protectedState, protectedTmp, spacedDir, attachFile,
  attachFile2, mismatchSessions, mismatchDay, interruptLog, modelListLog, unknownModelLog,
  rateLimitLog, run, flowState, recordOf, wait, until,
};
