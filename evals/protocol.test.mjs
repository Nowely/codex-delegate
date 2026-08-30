#!/usr/bin/env node
// Protocol regression tests for scripts/driver.mjs.
//
// Every case here is a path that once produced a false success, or that a review demonstrated could.
// They run against evals/fake-app-server.mjs rather than the real Codex: the point is to reach orderings
// a live server will not produce on demand — a completion that overtakes its own response, an event
// belonging to a turn that already ended, a server request nobody can answer.
//
//   node evals/protocol.test.mjs
//
// Exit 0 if every case matches its expected exit code.

import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DRIVER = path.join(HERE, "..", "scripts", "driver.mjs");
const FAKE = path.join(HERE, "fake-app-server.mjs");

// The driver spawns `codex` from PATH, so the shim has to be called exactly that.
const shimDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-delegate-test-"));
fs.writeFileSync(path.join(shimDir, "codex"),
  `#!/bin/sh\nexec "${process.execPath}" "${FAKE}" "$@"\n`, { mode: 0o755 });

const EXIT = { OK: 0, TURN_NOT_COMPLETED: 1, USAGE: 2, TIMEOUT: 3, TRANSPORT: 4, NO_COMMANDS: 5, ESCALATED: 6, INTERACTION: 7, NO_ANSWER: 8, VERIFY_FAILED: 9, BUSY: 10, COMMAND_FAILED: 11, VERIFY_UNMEASURABLE: 12 };

const CASES = [
  { scenario: "happy",            expect: EXIT.OK,                  why: "a real command succeeded and a final answer arrived" },
  { scenario: "stale-turn",       expect: EXIT.NO_COMMANDS,         why: "the command and answer belong to an earlier turn on the same thread" },
  { scenario: "early-completion", expect: EXIT.OK,                  why: "events that overtake the turn/start response are held and replayed, not lost" },
  { scenario: "foreign-thread",   expect: EXIT.NO_COMMANDS,         why: "a subagent's work on another thread is not ours" },
  { scenario: "command-failed",   expect: EXIT.NO_COMMANDS,         why: "`false` exits 1; a numeric exit code is not evidence of success" },
  { scenario: "needs-user",       expect: EXIT.INTERACTION,         why: "a request no unattended client can answer is never a success" },
  { scenario: "elicitation",      expect: EXIT.INTERACTION,         why: "an MCP form needs a human, not a wider sandbox" },
  { scenario: "escalated",        expect: EXIT.ESCALATED,           why: "a refused approval outranks 'nothing ran' — it explains why" },
  { scenario: "turn-failed",      expect: EXIT.TURN_NOT_COMPLETED,  why: "arrival of turn/completed is not success; the status is" },
  { scenario: "no-answer",        expect: EXIT.NO_ANSWER,           why: "commentary is not a final answer" },
  { scenario: "hidden-failure",  expect: EXIT.COMMAND_FAILED,     why: "a failed command is a failed run, whatever the answer claims; one incidental success must not mask it" },
  { scenario: "hidden-failure",  expect: EXIT.OK,                 args: ["--verify", "true"],
    why: "only the caller's own check can overrule a failed command" },
  { scenario: "happy",           expect: EXIT.VERIFY_FAILED,      args: ["--verify", "false"],
    why: "the caller's own check decides: a clean turn still fails when the work is not there" },
  { scenario: "null-phase",      expect: EXIT.OK,                 why: "the schema permits phase: null; an unphased answer is still an answer" },
  { scenario: "early-request",   expect: EXIT.INTERACTION,        why: "a blocking request before the turn id exists still belongs to us" },
  { scenario: "mcp-null-turn",   expect: EXIT.INTERACTION,        why: "MCP turnId is nullable; a null one must not read as someone else's" },
  { scenario: "no-ids-request",  expect: EXIT.INTERACTION,        why: "attestation carries no ids at all and must fail closed" },
  { scenario: "blank-answer",    expect: EXIT.NO_ANSWER,          why: "whitespace is not a final answer" },
  { scenario: "late-item",       expect: EXIT.NO_COMMANDS,        why: "an item arriving after the turn ended cannot supply the evidence the turn lacked" },
  { scenario: "double-completion", expect: EXIT.OK,               why: "a second completion for the same turn must not overwrite the first verdict" },
  { scenario: "completion-foreign-thread", expect: EXIT.OK,       why: "a completion carrying our turn id on another thread is not ours" },
  { scenario: "turn-start-error", expect: EXIT.TRANSPORT,         why: "turn/start failed, so there is no turn and no possible success" },
  { scenario: "unknown-response-id", expect: EXIT.OK,             why: "a response with an id nobody sent is discarded, not matched to a pending request" },
  { scenario: "wrong-command",   expect: EXIT.NO_COMMANDS,        args: ["--expect-command", "vitest", "--allow-no-commands"],
    why: "--allow-no-commands waives the command floor, never an expectation the caller declared" },
  { scenario: "wrong-command",    expect: EXIT.NO_COMMANDS,         args: ["--expect-command", "vitest"],
    why: "a successful command that is not the demanded one must not satisfy the gate" },
  { scenario: "wrong-command",    expect: EXIT.OK,                  args: [],
    why: "without --expect-command the same run passes: the gate is only as strong as the caller's claim" },
  { scenario: "profile-missing",  expect: EXIT.TRANSPORT,
    why: "read level asks for its permission profile via -c; if the server did not apply it, the run is under an unknown sandbox and must stop" },
  { scenario: "profile-wrong",    expect: EXIT.TRANSPORT,
    why: "some other profile is not the one whose limits the caller reasoned about, however plausible its name" },
  { scenario: "profile-effect-dropped", expect: EXIT.TRANSPORT,
    why: "the id reads back correctly while the $TMPDIR grant is gone — a name-only check passes here, which is why the check is on the effect" },
  { scenario: "profile-widened",  expect: EXIT.TRANSPORT,
    why: "more writable roots than asked for is also a sandbox nobody reasoned about; widening must fail as loudly as narrowing" },
  { scenario: "profile-networked", expect: EXIT.TRANSPORT,
    why: "`--level read --network` is a usage error because read never grants egress; a profile that grants it anyway must not slip past the guard holding that very field" },
  { scenario: "happy",            expect: EXIT.VERIFY_UNMEASURABLE, args: ["--verify", "yes abcdefghij | head -c 100000000; exit 0"],
    why: "a verifier that exits 0 but overruns maxBuffer measured nothing — it must not be reported as 'the work is not there'",
    assert: (r) => r.verify?.measured === false && r.verify?.ok === false
      || `expected measured:false, got ${JSON.stringify(r.verify)}` },
  { scenario: "failed-null-exit", expect: EXIT.COMMAND_FAILED,
    why: "the schema allows a FAILED command with exitCode null; keying the failure set on the code alone let it exit 0 while the footer printed NEVER RAN",
    assert: (r) => r.commandsFailed === 1 || `the failed command was not counted: failed=${r.commandsFailed} blocked=${r.commandsBlocked}` },
  { scenario: "escalated-subagent", expect: EXIT.ESCALATED,
    why: "the refusal is sent whoever asked, so a subagent really was blocked — evidence of FAILURE must be inclusive even though evidence of SUCCESS is root-only",
    assert: (r) => r.escalations?.length === 1 || `a refused subagent escalation went unrecorded: ${JSON.stringify(r.escalations)}` },
  { scenario: "happy",            expect: EXIT.OK,
    why: "with no --effort the driver must send no override at all, so ~/.codex/config.toml decides; forcing a default silently downgraded a user who had asked for max",
    assert: (r) => r.effort === null && r.reasoningEffort === null
      || `an effort was imposed: requested=${JSON.stringify(r.effort)} selected=${JSON.stringify(r.reasoningEffort)}` },
  { scenario: "happy",            expect: EXIT.OK, args: ["--effort", "max"],
    why: "`max` is on the model's advertised ladder and was rejected as a usage error by a stale hardcoded list",
    assert: (r) => r.reasoningEffort === "max" || `--effort max did not reach the server: ${JSON.stringify(r.reasoningEffort)}` },
  { scenario: "file-changes",     expect: EXIT.COMMAND_FAILED, json: false,
    why: "the blast-radius line is what a coordinator reads in the default format, and PatchChangeKind is an OBJECT on the wire — storing it raw rendered every write run as `[object Object] /path`",
    assertText: (t) => (/\badd\s+\/tmp\/wrote\.txt/.test(t) && !/\[object Object\]/.test(t)
        && /rename \/tmp\/old\.txt -> \/tmp\/new\.txt/.test(t))
      || `footer does not name the change kind: ${(t.match(/^ *(add|update|delete|\[object.*)\s+\/tmp\/wrote.*/m) || ["<no files line>"])[0]}` },
  { scenario: "file-changes",     expect: EXIT.COMMAND_FAILED,
    why: "a patch that failed to apply is the same class of fact as a failed command, and reached neither the report nor the ladder",
    assert: (r) => (r.fileChangesFailed?.length === 1
        && JSON.stringify(r.filesTouched) === JSON.stringify(["/tmp/wrote.txt", "/tmp/new.txt"]))
      // The rename must be reported by its DESTINATION: /tmp/old.txt no longer exists after it.
      || `write results wrong: touched=${JSON.stringify(r.filesTouched)} failed=${JSON.stringify(r.fileChangesFailed)}` },
  { scenario: "resume-active",    expect: EXIT.BUSY, args: ["--resume", "thr_root"],
    why: "a deliberate refusal after the child is spawned kept its exit code only by accident: shutdown SIGTERMs the child and the exit handler rewrote every one of them to 4, making the documented exit 10 unreachable" },
  { scenario: "happy",            expect: EXIT.OK, env: { TMPDIR: null },
    why: "when --cwd IS the tmpdir the server subtracts it from writableRoots and reports it under runtimeWorkspaceRoots; demanding it in both places refused a legitimate scratch-directory run",
    assert: (r) => JSON.stringify(r.sandbox?.writableRoots) === "[]"
      || `expected the tmpdir root to be subtracted, got ${JSON.stringify(r.sandbox?.writableRoots)}` },
  { scenario: "happy",            expect: EXIT.OK,
    why: "the model must be inherited, never hardcoded: with no --model the driver sends null and the server chooses",
    assert: (r) => r.model === "fake-model" || `a model was imposed: ${JSON.stringify(r.model)}` },
  { scenario: "policy-clamped",   expect: EXIT.TRANSPORT,
    why: "an MDM profile clamps a policy it does not permit, after which every command is denied while the run still looks healthy — the exact failure this driver exists to route around, and invisible in every other field" },
  { scenario: "workspace-elsewhere", expect: EXIT.TRANSPORT,
    why: "a workspace that does not contain the cwd means everything the turn writes lands somewhere the caller did not choose, and nothing in the sandbox object reveals it" },
  { scenario: "reviewer-auto",    expect: EXIT.TRANSPORT,
    why: "approvals routed to the server's own reviewer never reach this driver, so the refusal policy is disarmed while the sandbox object stays byte-identical — nothing else in the response can catch it" },
  { scenario: "happy",            expect: EXIT.VERIFY_UNMEASURABLE, args: ["--verify", "definitely_not_a_command_xyz"],
    why: "127 means the shell never ran the command — a typo or a tool missing from the DRIVER's PATH — which says nothing about the work and must not read as 'the work is not there'",
    assert: (r) => r.verify?.measured === false
      || `a broken verifier was reported as a measured failure: ${JSON.stringify(r.verify)}` },
  { scenario: "happy",            expect: EXIT.OK, args: ["--verify", "sleep 0.2 & exit 0"],
    why: "the command exited 0 while a background process still held the pipe; the observed exit status is proof of a pass and must not be thrown away as unmeasurable",
    assert: (r) => r.verify?.ok === true && r.verify?.measured === true
      || `a passing exit status was discarded: ${JSON.stringify(r.verify)}` },

  // --- the caller's own check must not be cancelled by the model-authored one ---
  { scenario: "wrong-command",    expect: EXIT.VERIFY_FAILED, args: ["--expect-command", "vitest", "--verify", "false"],
    why: "a failing --verify outranks a missed expectation: the end state was measured broken, which is stronger than 'the command list looks wrong'",
    assert: (r) => r.verify?.ok === false || `verify did not run: ${JSON.stringify(r.verify)}` },
  { scenario: "wrong-command",    expect: EXIT.NO_COMMANDS, args: ["--expect-command", "vitest", "--verify", "true"],
    why: "a passing --verify does NOT waive a declared expectation — a stale artefact satisfies the end state while the work never ran — but it must still be REPORTED",
    assert: (r) => r.verify?.ok === true || `verify was suppressed by the expectation miss: ${JSON.stringify(r.verify)}` },
  { scenario: "hidden-failure",   expect: EXIT.NO_COMMANDS, args: ["--expect-command", "zzz_never", "--verify", "true"],
    why: "the COMMAND_FAILED waiver keys on the check's RESULT, not on the flag being present; here the expectation misses, and verify must still have run",
    assert: (r) => r.verify?.ok === true || `a check that never ran waived a failed command: ${JSON.stringify(r.verify)}` },
  { scenario: "turn-failed",      expect: EXIT.TURN_NOT_COMPLETED, args: ["--verify", "true"],
    why: "a passing verify cannot rescue a turn that never completed, and on a non-completed turn the end state is recorded as unmeasured rather than guessed",
    assert: (r) => r.verify === null && typeof r.verifySkipped === "string"
      || `expected verify skipped with a reason, got verify=${JSON.stringify(r.verify)} skipped=${JSON.stringify(r.verifySkipped)}` },
  { scenario: "happy",            expect: EXIT.VERIFY_UNMEASURABLE, args: ["--verify", "kill -TERM $$"],
    why: "a verifier killed by a signal reports exitCode null — that is 'could not run', which must fail closed rather than read as success",
    assert: (r) => r.verify?.ok === false && r.verify?.signal === "SIGTERM"
      || `expected a recorded signal, got ${JSON.stringify(r.verify)}` },
  { scenario: "happy",            expect: EXIT.OK, args: ["--expect-command", "echo", "--verify", "true"],
    why: "both checks agreeing is the ordinary success, and both verdicts appear in the report",
    assert: (r) => r.expectationOk === true && r.verify?.ok === true || `report lost a verdict: ${JSON.stringify({ e: r.expectationOk, v: r.verify })}` }
];

function run(c) {
  return new Promise((resolve) => {
    const p = spawn(process.execPath,
      [DRIVER, "--level", "read", "--cwd", shimDir, "--timeout", "20",
       ...(c.json === false ? [] : ["--json"]),
       "--prompt", "irrelevant, the server is scripted", ...(c.args ?? [])],
      { env: { ...process.env, PATH: `${shimDir}:${process.env.PATH}`, FAKE_SCENARIO: c.scenario, ...(c.env ? Object.fromEntries(Object.entries(c.env).map(([k, v]) => [k, v ?? shimDir])) : {}) },
        stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    p.stdout.on("data", (d) => { out += d; });
    // A bounded case, because a HANG is worse than a failure: an undeclared variable in the driver once
    // threw inside an event handler and the suite stalled forever instead of reporting anything. The
    // scripted server answers in milliseconds, so anything near this bound is a defect, not slowness.
    const bell = setTimeout(() => { try { p.kill("SIGKILL"); } catch {} }, 30000);
    p.on("close", (code) => { clearTimeout(bell); resolve({ code, out }); });
  });
}

let failed = 0;
for (const c of CASES) {
  const label = `${c.scenario}${c.args?.length ? ` ${c.args.join(" ")}` : ""}`;
  const { code, out } = await run(c);
  let report = null;
  try { report = JSON.parse(out); } catch {}
  // An exit code alone cannot catch a report that destroys information — two runs with opposite verify
  // results once printed byte-identically at the same code. `assert` returns true, or a reason string.
  const assertion = c.assertText ? c.assertText(out) : (c.assert && report ? c.assert(report) : true);
  const ok = code === c.expect && assertion === true;
  if (!ok) {
    failed++;
    let detail = "";
    if (report) {
      detail = ` [turn=${report.turnStatus} cmds=${report.commandsRun} match=${report.commandsMatchingExpectation} esc=${report.escalations?.length} int=${report.interactions?.length} answer=${JSON.stringify(String(report.answer).slice(0, 40))}]`;
    } else { detail = ` [no JSON report: ${out.slice(0, 80)}]`; }
    const wrong = code !== c.expect ? `expected ${c.expect}, got ${code}` : `exit ${code} correct, but the report is wrong: ${assertion}`;
    console.log(`FAIL  ${label}: ${wrong}${detail}\n      ${c.why}`);
  } else {
    console.log(`ok    ${label} -> ${code}`);
  }
}

fs.rmSync(shimDir, { recursive: true, force: true });
console.log(failed ? `\n${failed}/${CASES.length} failed` : `\nall ${CASES.length} passed`);
process.exit(failed ? 1 : 0);
