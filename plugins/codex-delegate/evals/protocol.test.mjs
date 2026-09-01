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
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DRIVER = path.join(HERE, "..", "skills", "codex-delegate", "scripts", "driver.mjs");
const FAKE = path.join(HERE, "fake-app-server.mjs");

// The driver spawns `codex` from PATH, so the shim has to be called exactly that.
const shimDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-delegate-test-"));
// Removed on EXIT, not only at the happy end of the file: a crashed run used to leave the whole shim
// tree behind (14 had accumulated before anyone counted).
process.on("exit", () => { try { fs.rmSync(shimDir, { recursive: true, force: true }); } catch {} });
// Unique per run: a fixed name in the shared $TMPDIR is the cross-run collision the relay eval fixed
// elsewhere with a random suffix.
const survivorPidName = `verify-survivor-${crypto.randomBytes(4).toString("hex")}.pid`;
fs.writeFileSync(path.join(shimDir, "codex"),
  `#!/bin/sh\nexec "${process.execPath}" "${FAKE}" "$@"\n`, { mode: 0o755 });

const EXIT = { OK: 0, TURN_NOT_COMPLETED: 1, USAGE: 2, TIMEOUT: 3, TRANSPORT: 4, NO_COMMANDS: 5, ESCALATED: 6, INTERACTION: 7, NO_ANSWER: 8, VERIFY_FAILED: 9, BUSY: 10, COMMAND_FAILED: 11, VERIFY_UNMEASURABLE: 12, SCHEMA: 13 };

// A schema file for the --output-schema cases, and a non-executable file for the verify-126 branch.
// STRICT, because that is the only kind the provider accepts and the fixture must not be laxer than the
// thing it stands in for: measured against the live server, an ordinary schema comes back
// 400 invalid_json_schema — "'additionalProperties' is required to be supplied and to be false" — and
// "'required' ... an array including every key in properties". These files used to be ordinary, so every
// schema case exercised a shape a real run cannot use.
const schemaFile = path.join(shimDir, "verdict.schema.json");
fs.writeFileSync(schemaFile, JSON.stringify({
  type: "object", additionalProperties: false, required: ["verdict", "count"],
  properties: { verdict: { type: "string", enum: ["ok", "bad"] }, count: { type: "integer" } }
}));
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
// The three shapes the provider rejects, each of which used to cost a whole delegation to discover.
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
// A strict schema whose required key is named after a member of Object.prototype. `k in value` reaches
// the prototype, so the absent key used to be validated against the inherited FUNCTION and produced a
// second, invented error beside the true one.
const protoSchemaFile = path.join(shimDir, "proto.schema.json");
fs.writeFileSync(protoSchemaFile, JSON.stringify({
  type: "object", additionalProperties: false, required: ["verdict", "count", "toString"],
  properties: { verdict: { type: "string" }, count: { type: "integer" }, toString: { type: "string" } }
}));

// A rollout that looks like a real one, so the receipt locator has a POSITIVE case. Without it the whole
// of findRollout could be replaced by `return null` and the suite stayed green.
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
             cli_version: "0.150.1", source: "vscode", model_provider: "openai" }
});
fs.writeFileSync(path.join(rolloutDay, "rollout-2026-01-01T00-00-00-thr_root.jsonl"), `${rolloutLine("thr_root")}\n`);
// Same filename convention, a session_meta naming a DIFFERENT thread: the file exists, the receipt is
// not this run's, and receiptOk must say so rather than trusting the name.
// A state directory that already exists when the run starts, and a $TMPDIR inside it. The read level's
// only writable root is $TMPDIR, so pointing it at the driver's own protected state is the shape that
// used to hand a read seat write access to the receipts.
const protectedState = path.join(shimDir, "state");
const protectedTmp = path.join(protectedState, "tmp");
fs.mkdirSync(protectedTmp, { recursive: true });

// A directory whose name holds TWO consecutive spaces, for the seat-file literalness case: the SEAT
// value used to be split on whitespace and rejoined with single spaces, silently rewriting the path.
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

const CASES = [
  { scenario: "happy",            expect: EXIT.OK,                  why: "a real command succeeded and a final answer arrived" },
  { scenario: "stale-turn",       expect: EXIT.NO_COMMANDS,         why: "the command and answer belong to an earlier turn on the same thread" },
  { scenario: "early-completion", expect: EXIT.OK,                  why: "events that overtake the turn/start response are held and replayed, not lost" },
  { scenario: "foreign-thread",   expect: EXIT.NO_COMMANDS,         why: "a subagent's work on another thread is not ours" },
  { scenario: "command-failed",   expect: EXIT.NO_COMMANDS,         why: "`false` exits 1; a numeric exit code is not evidence of success" },
  { scenario: "needs-user",       expect: EXIT.INTERACTION,         why: "a request no unattended client can answer is never a success" },
  { scenario: "elicitation",      expect: EXIT.INTERACTION,         why: "an MCP form needs a human, not a wider sandbox" },
  { scenario: "escalated",        expect: EXIT.ESCALATED,           why: "a refused approval outranks 'nothing ran' — it explains why" },
  { scenario: "escalated-file-change", expect: EXIT.ESCALATED,
    why: "file-change approvals use decline, not the legacy abort shape, and must remain sandbox escalations",
    assert: (r) => r.commandsSucceeded === 1 && r.escalations?.[0]?.method === "item/fileChange/requestApproval"
      || `file-change refusal was not accepted by the fixture: ${JSON.stringify({ commands: r.commandsSucceeded, escalations: r.escalations })}` },
  { scenario: "escalated-apply-patch", expect: EXIT.ESCALATED,
    why: "the legacy apply-patch approval uses abort and must not fall through as an interaction",
    assert: (r) => r.commandsSucceeded === 1 && r.escalations?.[0]?.method === "applyPatchApproval"
      || `apply-patch refusal was not accepted by the fixture: ${JSON.stringify({ commands: r.commandsSucceeded, escalations: r.escalations })}` },
  { scenario: "escalated-exec-command", expect: EXIT.ESCALATED,
    why: "the legacy exec-command approval uses abort and must not fall through as an interaction",
    assert: (r) => r.commandsSucceeded === 1 && r.escalations?.[0]?.method === "execCommandApproval"
      || `exec-command refusal was not accepted by the fixture: ${JSON.stringify({ commands: r.commandsSucceeded, escalations: r.escalations })}` },
  { scenario: "escalated-permissions", expect: EXIT.ESCALATED,
    why: "a permissions request is refused with an empty granted profile and must remain a sandbox escalation",
    assert: (r) => r.commandsSucceeded === 1 && r.escalations?.[0]?.method === "item/permissions/requestApproval"
      || `permissions refusal was not accepted by the fixture: ${JSON.stringify({ commands: r.commandsSucceeded, escalations: r.escalations })}` },
  { scenario: "turn-failed",      expect: EXIT.TURN_NOT_COMPLETED,  why: "arrival of turn/completed is not success; the status is — and a failure AFTER observable work is never retried",
    assert: (r) => (r.transientRetries?.length === 0) || `a turn with visible work was retried: ${JSON.stringify(r.transientRetries)}` },
  { scenario: "transient-then-ok", expect: EXIT.OK,
    why: "the enumerated transient causes were documented as retryable and never retried — a provider blip failed the whole delegation; one bounded backoff absorbs it when the turn produced nothing observable",
    assert: (r) => (r.transientRetries?.length === 1 && r.transientRetries[0].cause === "responseStreamDisconnected" && r.commandsSucceeded === 1)
      || `the retry did not happen or was miscounted: ${JSON.stringify({ retries: r.transientRetries, cmds: r.commandsSucceeded })}` },
  { scenario: "transient-after-tool", expect: EXIT.TURN_NOT_COMPLETED,
    why: "an MCP tool call is observable work with side effects the replay would duplicate — the no-work guard must count the items the evidence gates ignore, not only commands, files and messages",
    assert: (r) => (r.transientRetries?.length === 0 && r.otherItemCounts?.mcpToolCall === 1)
      || `a turn that had already called a tool was retried: ${JSON.stringify({ retries: r.transientRetries, other: r.otherItemCounts })}` },
  { scenario: "transient-always", expect: EXIT.TURN_NOT_COMPLETED,
    why: "one retry is the whole budget: a cause that persists reports the failure instead of looping",
    assert: (r) => (r.transientRetries?.length === 1 && r.turnStatus === "failed")
      || `the retry budget was not one: ${JSON.stringify({ retries: r.transientRetries, status: r.turnStatus })}` },
  { scenario: "stalled-turn",     expect: EXIT.TIMEOUT, args: ["--timeout", "0.25", "--verify", "true"],
    why: "an expired turn budget is exit 3 and cannot verify a tree the model may still be writing",
    assert: (r) => r.ok === false && r.exitCode === EXIT.TIMEOUT && r.turnStatus === "timedOut"
        && r.verify === null && r.verifySkipped === "turn-timed-out"
      || `timeout report lost its verdict or verify skip: ${JSON.stringify({ ok: r.ok, exitCode: r.exitCode, turnStatus: r.turnStatus, verify: r.verify, verifySkipped: r.verifySkipped })}` },
  { scenario: "no-answer",        expect: EXIT.NO_ANSWER,           why: "commentary is not a final answer" },
  { scenario: "happy",            expect: EXIT.OK, args: ["--review", "uncommitted"], noPrompt: true,
    why: "--review runs the server's native reviewer: the exitedReviewMode payload is the answer, and a turn with no commands is its ordinary success",
    assert: (r) => (/off-by-one in clamp/.test(String(r.answer)) && r.commandsSucceeded === 0 && r.otherItemCounts?.exitedReviewMode === 1)
      || `the review did not become the answer: ${JSON.stringify({ a: String(r.answer).slice(0, 60), c: r.commandsSucceeded })}` },
  { scenario: "happy",            expect: EXIT.USAGE, args: ["--review", "uncommitted"],
    why: "--review builds its own prompt; a --prompt beside it (the harness always passes one here) is a contradiction, not an extra",
    assertStderr: (e) => /--review builds its own prompt/.test(e) || `the contradiction was not named: ${e.slice(0, 140)}` },
  { scenario: "review-broken",    expect: EXIT.COMMAND_FAILED, args: ["--review", "branch:nonexistent"], noPrompt: true,
    why: "the review waiver is keyed on a review having ARRIVED, not on the flag: a review whose git commands failed and which produced no payload must not exit 0 just because --review was passed",
    assert: (r) => r.commandsFailed === 1 || `the failed review command was not counted: ${JSON.stringify(r.commandsFailed)}` },
  { scenario: "happy",            expect: EXIT.USAGE, seat: "SEAT: read <CWD>\nATTACH: /etc/hosts\n",
    why: "ATTACH is not a seat-file field: a newline in any relayed value could inject one, and the injected line would upload a file the coordinator never named to the model provider",
    assertStderr: (e) => /unknown field "ATTACH"/.test(e) || `an injected ATTACH was accepted: ${e.slice(0, 160)}` },
  { scenario: "happy",            expect: EXIT.USAGE, seat: "SEAT: read <CWD>\nSTEER_FILE: <CWD>/precious.txt\n",
    why: "the driver TRUNCATES the steer file while the turn runs, so an injected STEER_FILE line is a write primitive aimed at any file the caller can write",
    assertStderr: (e) => /unknown field "STEER_FILE"/.test(e) || `an injected STEER_FILE was accepted: ${e.slice(0, 160)}` },
  { scenario: "happy",            expect: EXIT.USAGE, seat: "SEAT: read <CWD>\nMCP: yes\n",
    why: "--mcp grants tool servers that run with the caller's rights outside the seat's sandbox; a relayed value must not be able to grant them",
    assertStderr: (e) => /unknown field "MCP"/.test(e) || `an injected MCP grant was accepted: ${e.slice(0, 160)}` },
  { scenario: "progress",         expect: EXIT.OK, seat: "SEAT: read <CWD>\nEXPECT: echo\nPROGRESS: yes\n",
    why: "the relay's header must keep up with the driver: PROGRESS/REVIEW/RESUME were added to the driver and the wrapper could not express them, the same drift class the audit found elsewhere",
    assert: (r) => (r.seatFileFields ?? []).includes("PROGRESS") || `the seat file did not carry PROGRESS: ${JSON.stringify(r.seatFileFields)}` },
  { scenario: "rich-items",       expect: EXIT.OK,
    why: "reasoning summaries, tool/search items and subagent threads used to be dropped on the floor — a turn that mostly searched or delegated looked idle; they are now VISIBLE in the report while the child's command still counts for nothing",
    assert: (r) => (/Weighed A/.test(r.reasoningSummary ?? "") && r.otherItemCounts?.webSearch === 1
        && r.otherItems?.some((x) => x.type === "webSearch" && x.detail === "node atomics")
        && r.subagentThreads?.length === 1 && r.subagentThreads[0].threadId === "thr_child"
        && r.subagentThreads[0].commands === 1 && r.commandsSucceeded === 1)
      || `visibility fields wrong: ${JSON.stringify({ reasoning: r.reasoningSummary, other: r.otherItemCounts, items: r.otherItems, sub: r.subagentThreads, cmds: r.commandsSucceeded })}` },
  { scenario: "progress",         expect: EXIT.OK, args: ["--progress"],
    why: "--progress announces each item start on stderr, so a long seat is watchable live — a native subagent's progress visibility, without the delta firehose",
    assertStderr: (e) => /> run: echo hi/.test(e) || `no progress line: ${e.slice(0, 160)}` },
  { scenario: "progress",         expect: EXIT.OK,
    why: "without --progress the same events stay silent: the default report contract does not grow noise",
    assertStderr: (e) => !/> run:/.test(e) || "progress lines appeared without --progress" },
  { scenario: "echo-input",       expect: EXIT.OK, args: ["--attach", attachFile, "--attach", attachFile2],
    why: "--attach maps local images into the turn input as localImage items, IMAGES FIRST and in the order given — the layout every one of the 29 image-carrying user turns on this machine has, so a seat asked about 'the first screenshot' sees what its coordinator saw",
    assert: (r) => {
      let inp = null;
      try { inp = JSON.parse(r.answer); } catch { return `the fixture did not echo the input: ${String(r.answer).slice(0, 80)}`; }
      return (inp.length === 3
          && inp[0].type === "localImage" && String(inp[0].path).endsWith("shot.png")
          && inp[1].type === "localImage" && String(inp[1].path).endsWith("shot2.png")
          && inp[2].type === "text")
        || `input items wrong (expected image, image, text): ${JSON.stringify(inp.map((x) => x.type))}`;
    } },
  { scenario: "happy",            expect: EXIT.USAGE, args: ["--review", "uncommitted", "--attach", attachFile], noPrompt: true,
    why: "review/start carries no input items and the review branch returns before turn/start, so an attachment on a review run was decoded, written, and never sent — with nothing said",
    assertStderr: (e) => /would be dropped silently/.test(e) || `the silent drop was not refused: ${e.slice(0, 160)}` },
  { scenario: "happy",            expect: EXIT.USAGE, args: ["--attach", "/nonexistent/shot.png"],
    why: "a missing attachment is the caller's error, raised before anything runs — the server would otherwise refuse it mid-turn, after the delegation was paid for",
    assertStderr: (e) => /--attach.*does not exist/.test(e) || `the missing file was not named: ${e.slice(0, 140)}` },
  { scenario: "stalled-turn",     expect: EXIT.TIMEOUT, args: ["--timeout", "0.5"], env: { FAKE_RPC_LOG: interruptLog },
    why: "a timed-out turn is asked to END, not just killed: turn/interrupt marks the turn in the rollout and leaves the thread idle, so --resume on a cancelled seat is not a gamble",
    assert: () => {
      let log = "";
      try { log = fs.readFileSync(interruptLog, "utf8"); } catch {}
      return /turn\/interrupt/.test(log) || `the driver never sent turn/interrupt: ${JSON.stringify(log)}`;
    } },
  { scenario: "probe-negative",   expect: EXIT.OK,
    why: "a no-match grep or a false test is a probe answering 'no', not a failed command — routine research seats exited 11 for finding nothing",
    assert: (r) => (r.commandsFailed === 0 && r.commandsProbeNegative === 2)
      || `probe verdicts miscounted: failed=${r.commandsFailed} probes=${r.commandsProbeNegative}` },
  { scenario: "probe-multiline",  expect: EXIT.COMMAND_FAILED,
    why: "codex sends multi-line bash scripts; a newline is a command separator too, so 'grep -q x file\\npnpm test' exiting 1 is a failed suite, not a probe answering no",
    assert: (r) => (r.commandsFailed === 1 && r.commandsProbeNegative === 0)
      || `a multi-line script was laundered into a probe: failed=${r.commandsFailed} probes=${r.commandsProbeNegative}` },
  { scenario: "schema-good",      expect: EXIT.OK, json: false, args: ["--output-schema", schemaFile],
    why: "--footer with --output-schema threw a ReferenceError inside an already-settled finish(), where abort() is a no-op: the run hung past its own --timeout and printed nothing. No case combined the two",
    assertText: (t) => /output-schema: matched/.test(t) || `the footer lost its schema verdict: ${t.slice(-200)}` },
  { scenario: "probe-error",      expect: EXIT.COMMAND_FAILED,
    why: "probes reserve exit 2 for real trouble — a bad pattern is a failure, not a 'no'" },
  { scenario: "probe-compound",   expect: EXIT.COMMAND_FAILED,
    why: "a compound command starting with a probe keeps failure semantics: its exit 1 may belong to the other command" },
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
  { scenario: "write-root-widened", expect: EXIT.TRANSPORT, args: ["--level", "write"],
    why: "write level must reject a writable root the driver never sent, even when every other sandbox field matches",
    assertStderr: (t) => /writable roots/.test(t) || `stderr did not name the writable roots: ${JSON.stringify(t)}` },
  { scenario: "write-full-access", expect: EXIT.TRANSPORT, args: ["--level", "write"],
    why: "write level must reject dangerFullAccess before an otherwise healthy turn can run",
    assertStderr: (t) => /sandbox type/.test(t) || `stderr did not name the sandbox type: ${JSON.stringify(t)}` },
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
  { scenario: "happy",            expect: EXIT.OK, env: { FAKE_MODEL_ECHO: "1" },
    why: "the model must be inherited, never hardcoded: with no --model the driver sends null and the server chooses. Under FAKE_MODEL_ECHO the fixture reports the REQUEST ('inherited' vs 'explicit:x') instead of a plausible name — it used to fall back to the same literal a hardcoding driver would send, so this case could not tell them apart. The echo is opt-in because fidelity.test.mjs diffs this field against the live server",
    assert: (r) => r.model === "inherited" || `a model was imposed rather than inherited: ${JSON.stringify(r.model)}` },
  { scenario: "happy",            expect: EXIT.OK,
    env: { PATH: "/usr/bin:/bin", CODEX_DELEGATE_CODEX: path.join(shimDir, "codex") },
    why: "with codex absent from PATH the driver honours CODEX_DELEGATE_CODEX — a non-login shell must not need a PATH export ritual" },
  { scenario: "happy",            expect: EXIT.USAGE,
    env: { CODEX_DELEGATE_CODEX: "codex" },
    why: "a relative CODEX_DELEGATE_CODEX would resolve against the invocation cwd; only an absolute executable is accepted",
    assertStderr: (e) => /CODEX_DELEGATE_CODEX must be an absolute path/.test(e) || `the override was not validated: ${e.slice(0, 140)}` },
  { scenario: "happy",            expect: EXIT.OK, env: { FAKE_CONFIG_FAIL: "1" },
    why: "a failed config probe must say so out loud — the silent path changed which model answers and made identical runs nondeterministic",
    assertStderr: (e) => /could not read the caller's Codex config/.test(e)
      || `the downgrade was silent: ${e.slice(0, 160)}` },
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
    assert: (r) => r.expectationOk === true && r.verify?.ok === true || `report lost a verdict: ${JSON.stringify({ e: r.expectationOk, v: r.verify })}` },

  // --- teardown: nothing this driver started may outlive it ---
  { scenario: "spawn-survivor",   expect: EXIT.OK,
    why: "a TERM-ignoring descendant — a test server, a watcher — used to survive every normal completion, because process.exit() discarded the SIGKILL escalation timer; the group teardown must wait it out",
    assert: (r) => {
      const pid = Number((String(r.answer).match(/survivor (\d+)/) ?? [])[1]);
      if (!pid) return `the fixture did not report its survivor pid: ${JSON.stringify(r.answer)}`;
      try { process.kill(pid, 0); return `survivor ${pid} is still alive after the driver exited`; }
      catch { return true; }
    } },
  // The background child's stdio is DETACHED (`>/dev/null 2>&1 </dev/null`), and that is what makes this
  // case deterministic. Holding the verifier's stdout kept spawnSync draining the pipe for the whole
  // remaining budget — ~19 s of the case's 30 s bell — so under any load the harness killed the driver
  // first and the survivor was reported as having outlived a run that never got to sweep it. Measured at
  // roughly one red in three while other work was on the machine. Detached, spawnSync returns at once and
  // the group sweep is the only thing that can end the child, which is the property under test.
  { scenario: "happy",            expect: EXIT.OK, args: ["--verify", `sh -c 'trap "" TERM; echo $$ > "$TMPDIR/${survivorPidName}"; exec sleep 30' >/dev/null 2>&1 </dev/null & sleep 0.3; exit 0`],
    why: "the verifier runs in its own process group and the group is swept afterwards — anything it backgrounded used to outlive the run",
    assert: (r) => {
      if (r.verify?.ok !== true) return `the verifier itself did not pass: ${JSON.stringify(r.verify)}`;
      let pid = 0;
      try { pid = Number(fs.readFileSync(path.join(process.env.TMPDIR ?? os.tmpdir(), survivorPidName), "utf8").trim()); } catch {}
      if (!pid) return "the verifier's background child never wrote its pid";
      try { process.kill(pid, 0); return `the verifier's background child ${pid} outlived the run`; }
      catch { return true; }
    } },

  // --- report shape: defaults, receipt, exit-5 hint ---
  { scenario: "happy",            expect: EXIT.OK, json: "omit",
    why: "JSON is the default report — the only real caller is an agent, and every recipe hand-passed --json",
    assert: (r) => r.ok === true || `expected a JSON report by default, got ${JSON.stringify(r).slice(0, 60)}` },
  { scenario: "happy",            expect: EXIT.OK,
    why: "the report locates the rollout receipt itself; a scripted thread id matches nothing real, so the honest answer is receiptOk false with a null path",
    assert: (r) => (r.receiptOk === false && r.receiptPath === null)
      || `receipt fields wrong for a fixture run: ${JSON.stringify({ ok: r.receiptOk, path: r.receiptPath })}` },
  { scenario: "stale-turn",       expect: EXIT.NO_COMMANDS,
    why: "exit 5 with no declared expectation names the flag that waives it, so a recall-only caller has a self-serve path",
    assert: (r) => /allow-no-commands/.test(r.hint ?? "") || `exit 5 carried no hint: ${JSON.stringify(r.hint)}` },
  { scenario: "wrong-command",    expect: EXIT.NO_COMMANDS, args: ["--expect-command", "vitest"],
    why: "with a declared expectation the hint would be a lie — --allow-no-commands never waives an expectation",
    assert: (r) => r.hint === undefined || `a hint appeared beside a declared expectation: ${JSON.stringify(r.hint)}` },

  // --- --output-schema: the server constrains, the driver checks, one corrective turn is spent ---
  { scenario: "schema-good",      expect: EXIT.OK, args: ["--output-schema", schemaFile],
    why: "a first-try match spends no corrective turn and reports the parsed object",
    assert: (r) => (r.outputAttempts === 1 && r.outputSchemaOk === true && r.answerJson?.verdict === "ok")
      || `schema-good report wrong: ${JSON.stringify({ a: r.outputAttempts, ok: r.outputSchemaOk, j: r.answerJson })}` },
  { scenario: "schema-retry",     expect: EXIT.OK, args: ["--output-schema", schemaFile],
    why: "prose on the first attempt gets ONE corrective turn carrying the validation errors, mirroring a Claude subagent's tool-layer retry",
    assert: (r) => (r.outputAttempts === 2 && r.outputSchemaOk === true && r.answerJson?.verdict === "ok" && r.commandsSucceeded === 2)
      || `schema-retry report wrong: ${JSON.stringify({ a: r.outputAttempts, ok: r.outputSchemaOk, j: r.answerJson, c: r.commandsSucceeded })}` },
  { scenario: "schema-never",     expect: EXIT.SCHEMA, args: ["--output-schema", schemaFile],
    why: "a shape that never arrives is exit 13, not an exit 0 whose caller must remember to read answerJsonError",
    assert: (r) => (r.outputAttempts === 2 && r.outputSchemaOk === false && Array.isArray(r.schemaErrors) && r.schemaErrors.length > 0)
      || `schema-never report wrong: ${JSON.stringify({ a: r.outputAttempts, ok: r.outputSchemaOk, e: r.schemaErrors })}` },
  { scenario: "happy",            expect: EXIT.USAGE, args: ["--output-schema", "/nonexistent/schema.json"],
    why: "an unreadable schema is the caller's error, raised before anything runs",
    assertStderr: (t) => /--output-schema cannot read/.test(t) || `stderr did not name the schema file: ${t.slice(0, 120)}` },
  { scenario: "happy",            expect: EXIT.USAGE, args: ["--output-schema", laxSchemaFile],
    why: "a schema without type:\"object\" ({} or oneOf-only) certified ANY value — a bare string included — as a match; admission now demands the object contract be stated",
    assertStderr: (t) => /must declare "type": "object"/.test(t) || `admission let a type-less schema through: ${t.slice(0, 140)}` },
  { scenario: "schema-good",      expect: EXIT.OK, args: ["--output-schema", oneOfSchemaFile],
    why: "keywords the shallow validator ignores must be NAMED in the report, so outputSchemaOk can never silently mean 'nothing was checked'",
    assert: (r) => (r.outputSchemaOk === true && Array.isArray(r.schemaKeywordsUnchecked) && r.schemaKeywordsUnchecked.includes("oneOf"))
      || `unchecked keywords not reported: ${JSON.stringify(r.schemaKeywordsUnchecked)}` },
  { scenario: "schema-retry-refused", expect: EXIT.SCHEMA, args: ["--output-schema", schemaFile],
    why: "a refused corrective turn/start used to abort with exit 4 and NO report, discarding the completed first turn's evidence; it now finishes with the first attempt's report and exit 13",
    assert: (r) => (r.outputSchemaOk === false && r.outputAttempts === 2 && String(r.answer).length > 0 && r.commandsSucceeded === 1)
      || `the first turn's report was lost: ${JSON.stringify({ ok: r.outputSchemaOk, a: r.outputAttempts, ans: String(r.answer).slice(0, 40) })}` },
  // --- --seat-file: a wrapper writes values, it does not build a command line out of them ---
  { scenario: "happy",            expect: EXIT.OK, seat: "SEAT: read <CWD>\nEXPECT: echo\nBRIEF: yes\n",
    why: "the ordinary seat file maps to the same flags the CLI takes, so a relay never has to quote anything",
    assert: (r) => (r.level === "read" && r.expectationOk === true && r.answerTruncated === false)
      || `seat file did not map cleanly: ${JSON.stringify({ l: r.level, e: r.expectationOk })}` },
  { scenario: "happy",            expect: EXIT.NO_COMMANDS,
    seat: "SEAT: read <CWD>\nEXPECT: x' --level write --cwd / --commit --network '\n",
    why: "THE reason this flag exists: a hostile header value must stay one value. Interpolated into a shell command line the same characters would have granted write level, the filesystem root, the git dir and egress",
    assert: (r) => (r.level === "read" && r.network === false && r.sandbox?.type === "workspaceWrite"
        && (r.sandbox?.writableRoots ?? []).length <= 1 && String(r.expectCommand).includes("--commit"))
      || `a seat-file value escaped into flags: ${JSON.stringify({ l: r.level, n: r.network, roots: r.sandbox?.writableRoots })}` },
  { scenario: "happy",            expect: EXIT.OK, seat: "SEAT: read <CWDSP>\nEXPECT: echo\n",
    why: "the SEAT value is literal to end of line: a path holding consecutive spaces was split on whitespace and rejoined with single spaces, silently rewriting where the rights land",
    assert: (r) => String(r.cwd).endsWith("two  spaces") || `the spaced path was rewritten: ${JSON.stringify(r.cwd)}` },
  { scenario: "happy",            expect: EXIT.USAGE, seat: "SEAT: read <CWD>\nBOGUS: x\n",
    why: "an unknown field is a malformed seat, not a field to ignore — a typo must never silently become a different seat",
    assertStderr: (t) => /unknown field "BOGUS"/.test(t) || `stderr did not name the field: ${t.slice(0, 120)}` },
  { scenario: "happy",            expect: EXIT.USAGE, seat: "SEAT: read <CWD>\nSEAT: write /tmp\n",
    why: "a repeated SEAT is a contradiction about rights; last-wins would let an appended line quietly upgrade the seat",
    assertStderr: (t) => /SEAT appears more than once/.test(t) || `stderr did not reject the duplicate: ${t.slice(0, 120)}` },
  { scenario: "happy",            expect: EXIT.USAGE, seat: "SEAT: read <CWD>\nNETWORK: yes\n",
    why: "the file goes through the same flag guards as the CLI, so a read seat asking for egress fails exactly as --level read --network does",
    assertStderr: (t) => /--network and --writable belong to --level write/.test(t) || `the level guard did not fire: ${t.slice(0, 120)}` },

  { scenario: "late-completion",  expect: EXIT.TIMEOUT, args: ["--timeout", "0.4", "--output-schema", schemaFile],
    why: "a completion arriving after the deadline reported must not start a corrective turn on a run that declared itself timed out",
    assertStderr: (t) => !/spending the corrective turn/.test(t) || "a settled run announced new work after its own report" },

  // --- accounting and the remaining untested branches ---
  { scenario: "happy",            expect: EXIT.OK,
    why: "the server's own token accounting reaches the report, so a coordinator can budget a fan-out — and it is the ROOT thread's. The fixture now also emits a subagent thread's usage, after the root's and with a bigger total, so deleting the thread filter reports 9900",
    assert: (r) => r.tokenUsage?.total?.totalTokens === 135
      || `tokenUsage missing, wrong, or taken from another thread: ${JSON.stringify(r.tokenUsage)}` },
  { scenario: "happy",            expect: EXIT.VERIFY_UNMEASURABLE, args: ["--verify", notExec],
    why: "exit 126 — found but not executable — is 'fix the verifier', not 'the work is not there'; this branch had no test and could be deleted green",
    assert: (r) => (r.verify?.measured === false && r.verify?.exitCode === 126)
      || `a non-executable verifier was not classified as unmeasurable: ${JSON.stringify(r.verify)}` },

  // --- the receipt, which had no positive case at all ---
  { scenario: "happy",            expect: EXIT.OK, env: { CODEX_DELEGATE_SESSIONS_DIR: sessionsDir },
    why: "the receipt is LOCATED and READ: a rollout whose session_meta names this thread makes receiptOk true and surfaces the originator and provider. Without this case findRollout could be replaced by `return null` with every suite green",
    assert: (r) => (r.receiptOk === true && typeof r.receiptPath === "string"
      && r.receiptOriginator === "Claude Code" && r.receiptModelProvider === "openai")
      || `a genuine rollout was not recognised: ${JSON.stringify({ ok: r.receiptOk, path: r.receiptPath, o: r.receiptOriginator, p: r.receiptModelProvider })}` },
  { scenario: "happy",            expect: EXIT.OK, env: { CODEX_DELEGATE_SESSIONS_DIR: mismatchSessions },
    why: "a filename match is not a receipt: a rollout named for this thread whose session_meta names another one is found but NOT verified, because matching a name is as strong as `touch rollout-<id>.jsonl`",
    assert: (r) => (r.receiptOk === false && typeof r.receiptPath === "string" && /session id/.test(r.receiptWhy ?? ""))
      || `a mismatched rollout was accepted or misreported: ${JSON.stringify({ ok: r.receiptOk, path: r.receiptPath, why: r.receiptWhy })}` },

  // --- --output-schema: the provider takes a STRICT schema only, and said so only after the turn ---
  { scenario: "happy",            expect: EXIT.USAGE, args: ["--output-schema", looseSchemaFile],
    why: "an ordinary JSON Schema is rejected by the server with 400 invalid_json_schema AFTER the turn has started, costing the whole delegation; the admission check must catch it first",
    assertStderr: (e) => /additionalProperties/.test(e) || `a non-strict schema was admitted: ${e.slice(0, 160)}` },
  { scenario: "happy",            expect: EXIT.USAGE, args: ["--output-schema", looseNestedSchemaFile],
    why: "the strict rule applies at EVERY level — measured, the server names the context ('properties','meta') — so a top-level-only check still spends a turn to find out",
    assertStderr: (e) => /properties\.meta/.test(e) || `a non-strict nested object was admitted: ${e.slice(0, 200)}` },
  { scenario: "happy",            expect: EXIT.USAGE, args: ["--output-schema", optionalSchemaFile],
    why: "a strict schema permits no optional property: `required` must list every key in `properties`, or the server refuses the request",
    assertStderr: (e) => /required.*every key|Missing|"note"/.test(e) || `an optional property was admitted: ${e.slice(0, 200)}` },
  { scenario: "schema-good",      expect: EXIT.SCHEMA, args: ["--output-schema", protoSchemaFile],
    why: "a required key named after a member of Object.prototype is MISSING, not a function: `k in value` reached the prototype and invented a second error beside the true one, which then went into the corrective turn's prompt",
    assert: (r) => {
      const errs = (r.schemaErrors ?? []).join(" | ");
      if (/got function/.test(errs)) return `the prototype was validated instead of the absent key: ${errs}`;
      return /toString: required and missing/.test(errs) || `the missing key was not reported plainly: ${errs}`;
    } },

  // --- the seat file: what a wrapper hands over must not be able to become rights ---
  { scenario: "happy", seat: "EXPECT: foo\nSEAT: read <CWD>\n", expect: EXIT.USAGE,
    why: "SEAT must come FIRST. A relay that wrote any other field first left the rights slot open, and an injected `SEAT: write ...` line then defined them",
    assertStderr: (e) => /first field must be SEAT/.test(e) || `a seat file without a leading SEAT was accepted: ${e.slice(0, 160)}` },
  { scenario: "happy", seat: "TIMEOUT: 20\nEXPECT: foo\n", expect: EXIT.USAGE,
    why: "a seat file with no SEAT at all declares no rights, and defaulting them is exactly what a rights declaration exists to prevent",
    assertStderr: (e) => /first field must be SEAT|no SEAT field/.test(e) || `a seat file with no SEAT was accepted: ${e.slice(0, 160)}` },
  { scenario: "happy", seat: "SEAT: read <CWD>\nVERIFY: touch <CWD>/seat-verify-must-not-run\n", expect: EXIT.USAGE,
    why: "VERIFY runs an unsandboxed /bin/sh with the caller's own rights. A newline inside any caller-supplied value creates a new field, so a relay copying values verbatim could introduce one — measured, it ran. From a seat file it now needs --allow-seat-verify, which only the command line can carry",
    assertStderr: (e) => /allow-seat-verify/.test(e) || `a seat file supplied a verifier unasked: ${e.slice(0, 200)}` },
  { scenario: "happy", seat: "SEAT: read <CWD>\nEXPECT: echo\nVERIFY: true\n", expect: EXIT.OK, args: ["--allow-seat-verify"],
    why: "the escape hatch works and is explicit: with --allow-seat-verify on the command line the same file runs its verifier",
    assert: (r) => (r.verify?.ok === true && r.seatFileFields?.includes("VERIFY"))
      || `the permitted seat verifier did not run: ${JSON.stringify({ v: r.verify, f: r.seatFileFields })}` },
  { scenario: "happy", seat: "SEAT: read <CWD>\nEXPECT: echo\n", expect: EXIT.OK,
    why: "the report names what the FILE declared, so a wrapped seat is not indistinguishable from a hand-typed one",
    assert: (r) => (Array.isArray(r.seatFileFields) && r.seatFileFields.join(",") === "SEAT,EXPECT")
      || `seatFileFields wrong: ${JSON.stringify(r.seatFileFields)}` },

  // --- caps and bounds the docs publish as numbers ---
  { scenario: "long-answer",      expect: EXIT.OK, args: ["--brief"],
    why: "--brief publishes 20 lines / 4000 bytes as a bound; the 'clipped' marker used to be appended AFTER the cap, so the field whose whole job is to be a bound always exceeded it",
    assert: (r) => {
      const bytes = Buffer.byteLength(String(r.answer), "utf8");
      if (bytes > 4000) return `--brief returned ${bytes} bytes, past its own 4000-byte cap`;
      if (r.answerTruncated !== true) return "a 200-line answer was not marked truncated";
      return /full answer at/.test(String(r.answer)) || "the clip marker lost its forwarding address";
    } },

  { scenario: "happy",            expect: EXIT.VERIFY_UNMEASURABLE, args: ["--verify", "true"],
    env: { CODEX_DELEGATE_VERIFY_FLOOR_MS: "600000" },
    why: "a declared verifier the wall clock left no room for was NOT run and NOT reported as a failure: verifyResult stayed null, both verify rungs test for it, and the ladder fell through to the weaker gates — a run with an unrun check reaching exit 0 is the one shape --verify exists to prevent",
    assert: (r) => (r.verifySkipped === "budget-exhausted" && r.verify === null)
      || `the skipped verifier was not reported as such: ${JSON.stringify({ s: r.verifySkipped, v: r.verify })}` },

  // --- the read level's writable root is $TMPDIR, so $TMPDIR needs the guard every root gets ---
  { scenario: "happy",            expect: EXIT.USAGE,
    env: { CODEX_DELEGATE_STATE_DIR: protectedState, TMPDIR: protectedTmp },
    why: "$TMPDIR IS the read level's grant, and it reached the sandbox unexamined: measured, `TMPDIR=~/.codex/x --level read` exited 0 with the server reporting write access inside the directory that holds the receipts",
    assertStderr: (e) => /refusing to grant write access/.test(e)
      || `a protected $TMPDIR was granted at read level: ${e.slice(0, 200)}` }
];

let seatSeq = 0;
function run(c) {
  return new Promise((resolve) => {
    // A seat-file case writes its declaration to disk and passes only --seat-file, exactly as the
    // codex-seat relay does — the point being that no value ever passes through a shell.
    let seatArgs = [];
    if (c.seat) {
      const f = path.join(shimDir, `seat-${seatSeq++}.txt`);
      fs.writeFileSync(f, c.seat.replaceAll("<CWD>", shimDir).replaceAll("<CWDSP>", spacedDir));
      seatArgs = ["--seat-file", f];
    }
    const p = spawn(process.execPath,
      [DRIVER, ...(c.seat ? seatArgs : ["--level", "read", "--cwd", shimDir]), "--timeout", "20",
       ...(c.json === false ? ["--footer"] : c.json === "omit" ? [] : ["--json"]),
       ...(c.noPrompt ? [] : ["--prompt", "irrelevant, the server is scripted"]), ...(c.args ?? [])],
      // A state directory of this suite's own: every case used to write locks, an isolated Codex home and
      // the answer log into the caller's real ~/.codex-delegate, so a suite run concurrent with a real
      // delegation overwrote that delegation's inherited config with this fixture's values.
      { env: { ...process.env, PATH: `${shimDir}:${process.env.PATH}`, FAKE_SCENARIO: c.scenario,
               CODEX_DELEGATE_STATE_DIR: path.join(shimDir, "state-root"),
               ...(c.env ? Object.fromEntries(Object.entries(c.env).map(([k, v]) => [k, v ?? shimDir])) : {}) },
        stdio: ["ignore", "pipe", "pipe"] });
    let out = "", err = "";
    p.stdout.on("data", (d) => { out += d; });
    p.stderr.on("data", (d) => { err += d; });
    // A bounded case, because a HANG is worse than a failure: an undeclared variable in the driver once
    // threw inside an event handler and the suite stalled forever instead of reporting anything. The
    // scripted server answers in milliseconds, so anything near this bound is a defect, not slowness.
    const bell = setTimeout(() => { try { p.kill("SIGKILL"); } catch {} }, 30000);
    p.on("close", (code) => { clearTimeout(bell); resolve({ code, out, err }); });
  });
}

let failed = 0;
for (const c of CASES) {
  const label = `${c.scenario}${c.args?.length ? ` ${c.args.join(" ")}` : ""}`;
  const { code, out, err } = await run(c);
  let report = null;
  try { report = JSON.parse(out); } catch {}
  // An exit code alone cannot catch a report that destroys information — two runs with opposite verify
  // results once printed byte-identically at the same code. `assert` returns true, or a reason string.
  // A THROWING assert is a failed case, not a dead suite: unlike lock.test.mjs this loop had no
  // per-case guard, so one bad property access aborted every case after it and skipped cleanup.
  let assertion;
  try {
    assertion = c.assertStderr ? c.assertStderr(err)
      : c.assertText ? c.assertText(out)
        : c.assert ? (report ? c.assert(report) : "expected a JSON report, but stdout was not JSON") : true;
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

fs.rmSync(shimDir, { recursive: true, force: true });
console.log(failed ? `\n${failed}/${CASES.length} failed` : `\nall ${CASES.length} passed`);
process.exit(failed ? 1 : 0);
