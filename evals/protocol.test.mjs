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

import { spawn, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SCENARIOS } from "./fake-app-server.mjs";
// renderEnvelope and its marker regex come from the driver through the harness, never restated here:
// the envelope is a published format and a suite holding its own copy of it can agree with nothing.
import { DRIVER, ENVELOPE_ANSWER_RE, EXIT, FAKE, ROOT, SCRIPTS, codexShim, registry, renderEnvelope, runCases,
         spawnNode, summarize, tempDir } from "./lib/harness.mjs";

const STOP_GATE = path.join(SCRIPTS, "stop-gate.mjs");
const REVIEW_SCHEMA = path.join(ROOT, "skills", "codex-delegate", "schemas", "review-output.schema.json");

const shimDir = tempDir("codex-delegate-test-");
// Unique per run: a fixed name in the shared $TMPDIR is the cross-run collision the relay eval fixed
// elsewhere with a random suffix.
const survivorPidName = `verify-survivor-${crypto.randomBytes(4).toString("hex")}.pid`;
codexShim(shimDir);

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

// A state directory used by exactly one case, so "what did the config probe inherit" has a deterministic
// answer: with the shared state-root a previous case's healthy probe leaves a last-known-good config
// behind, and the failure case would then report that instead of "nothing".
const emptyState = path.join(shimDir, "state-empty");

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
// One log per case that counts steers: the fixture APPENDS, so a shared file would let one case read
// another's sends and a "sent exactly once" assertion would depend on the order the suite runs in.
const reviewSteerLog = path.join(shimDir, "rpc-review-steer.log");
const modelListLog = path.join(shimDir, "rpc-model-list.log");
const unknownModelLog = path.join(shimDir, "rpc-unknown-model.log");
const rateLimitLog = path.join(shimDir, "rpc-rate-limit.log");
const compactLog = path.join(shimDir, "rpc-compact.log");
const mcpConfigLog = path.join(shimDir, "mcp-config.toml");
const steersIn = (file) => {
  let log = "";
  try { log = fs.readFileSync(file, "utf8"); } catch {}
  return log.split("\n").filter((l) => l.startsWith("turn/steer"));
};

const CASES = [
  { scenario: "happy",            expect: EXIT.OK,                  why: "a real command succeeded and a final answer arrived" },
  { scenario: "fork",             expect: EXIT.OK,
    args: ["--fork", "thr_parent", "--fork-through", "turn_parent"],
    why: "thread/fork branches through the requested turn with the same rights-bearing parameters as thread/start, and its response establishes the new root thread",
    assert: (r) => {
      let sent = null;
      try { sent = JSON.parse(r.answer); } catch { return `the fixture did not echo fork params: ${String(r.answer).slice(0, 100)}`; }
      return (r.threadId === "thr_root" && r.forkedFrom === "thr_parent" && r.forkedThrough === "turn_parent"
          && sent.threadId === "thr_parent" && sent.lastTurnId === "turn_parent"
          && fs.realpathSync(sent.cwd) === fs.realpathSync(shimDir)
          && sent.approvalPolicy === "on-request" && sent.approvalsReviewer === "user"
          && typeof sent.developerInstructions === "string" && sent.ephemeral === false)
        || `fork request/report wrong: ${JSON.stringify({ thread: r.threadId, from: r.forkedFrom, through: r.forkedThrough, sent })}`;
    } },
  { scenario: "happy",            expect: EXIT.USAGE,
    args: ["--fork", "thr_parent", "--resume", "thr_root"],
    why: "forking and resuming select different thread identities and are refused together",
    assertStderr: (e) => /--fork and --resume are contradictory/.test(e) || `the contradiction was not named: ${e.slice(0, 180)}` },
  { scenario: "happy",            expect: EXIT.USAGE, seat: "SEAT: worktree /tmp\n",
    args: ["--fork", "thr_parent"],
    why: "a fork keeps the caller-declared cwd and cannot simultaneously create a new detached worktree",
    assertStderr: (e) => /--fork and --worktree are contradictory/.test(e) || `the contradiction was not named: ${e.slice(0, 180)}` },
  { scenario: "model-unknown",    expect: EXIT.USAGE, args: ["--effort", "minimal"],
    env: { FAKE_RPC_LOG: modelListLog },
    why: "model/list rejects an effort the catalogue does not advertise before thread/start pays the normal provider floor",
    assertStderr: (e, ms) => {
      const log = fs.existsSync(modelListLog) ? fs.readFileSync(modelListLog, "utf8") : "";
      return (/model\/list/.test(log) && !/thread\/start/.test(log) && /not advertised/.test(e) && ms < 7000)
        || `catalogue refusal was late or missing: ${JSON.stringify({ ms, log, err: e.slice(0, 180) })}`;
    } },
  { scenario: "happy",            expect: EXIT.USAGE, args: ["--model", "missing-model"],
    env: { FAKE_RPC_LOG: unknownModelLog },
    why: "model/list rejects a model name absent from the server catalogue before thread/start",
    assertStderr: (e, ms) => {
      const log = fs.existsSync(unknownModelLog) ? fs.readFileSync(unknownModelLog, "utf8") : "";
      return (/model\/list/.test(log) && !/thread\/start/.test(log) && /not in model\/list/.test(e) && ms < 7000)
        || `unknown-model refusal was late or missing: ${JSON.stringify({ ms, log, err: e.slice(0, 180) })}`;
    } },
  { scenario: "rate-limited",     expect: EXIT.USAGE, env: { FAKE_RPC_LOG: rateLimitLog },
    why: "an account whose primary window is exhausted is refused during setup, before a thread is started",
    assertStderr: (e, ms) => {
      const log = fs.existsSync(rateLimitLog) ? fs.readFileSync(rateLimitLog, "utf8") : "";
      return (/account\/rateLimits\/read/.test(log) && !/thread\/start/.test(log) && /primary.*100%/.test(e) && ms < 7000)
        || `rate-limit refusal was late or missing: ${JSON.stringify({ ms, log, err: e.slice(0, 180) })}`;
    } },
  { scenario: "happy",            expect: EXIT.OK,
    why: "the setup rate-limit snapshot reaches every completed report, so fan-outs can see approaching exhaustion",
    assert: (r) => r.rateLimits?.primary?.usedPercent === 25
      || `rateLimits missing from the report: ${JSON.stringify(r.rateLimits)}` },
  { scenario: "happy",            expect: EXIT.OK, env: { FAKE_RATELIMITS_ERROR: "1" },
    why: "a server that REJECTS account/rateLimits/read — an older build, a managed device — costs the report its snapshot and nothing else; the unguarded await aborted the whole run at exit 4 with no report at all",
    assert: (r) => r.rateLimits === null
      || `a rejected snapshot did not leave rateLimits null: ${JSON.stringify(r.rateLimits)}` },
  { scenario: "compact",          expect: EXIT.OK, args: ["--resume", "thr_root", "--compact"],
    env: { FAKE_RPC_LOG: compactLog },
    why: "--compact on a resumed thread finishes thread/compact/start before the next turn starts",
    assert: () => {
      const log = fs.existsSync(compactLog) ? fs.readFileSync(compactLog, "utf8") : "";
      return log.indexOf("thread/resume") >= 0 && log.indexOf("thread/compact/start") > log.indexOf("thread/resume")
          && log.indexOf("turn/start") > log.indexOf("thread/compact/start")
        || `compact request order wrong: ${JSON.stringify(log)}`;
    } },
  { scenario: "happy",            expect: EXIT.USAGE, args: ["--compact"],
    why: "compaction is meaningful only for a resumed thread and must not silently alter a fresh one",
    assertStderr: (e) => /--compact requires --resume/.test(e) || `the missing resume was not named: ${e.slice(0, 160)}` },
  { scenario: "turn-diff",        expect: EXIT.OK,
    why: "the last turn/diff/updated payload is persisted under the answer log and named in the report",
    assert: (r) => (typeof r.turnDiffPath === "string" && fs.readFileSync(r.turnDiffPath, "utf8") === "last diff\n")
      || `the last diff was not persisted: ${JSON.stringify(r.turnDiffPath)}` },
  { scenario: "reasoning-summary", expect: EXIT.OK, args: ["--reasoning-summary", "detailed"],
    why: "--reasoning-summary forwards the selected density as turn/start.summary",
    assert: (r) => {
      let sent = null; try { sent = JSON.parse(r.answer); } catch {}
      return sent?.summary === "detailed" || `turn/start summary was ${JSON.stringify(sent)}`;
    } },
  { scenario: "happy",            expect: EXIT.OK,
    args: ["--mcp", "--mcp-server", "docs"],
    env: { FAKE_MCP: "1", FAKE_MCP_CONFIG_LOG: mcpConfigLog },
    why: "a --mcp-server allowlist copies only the named server into the private run home: the fixture also configures `search`, which is perfectly carriable and must still be left behind",
    assert: () => {
      const cfg = fs.existsSync(mcpConfigLog) ? fs.readFileSync(mcpConfigLog, "utf8") : "";
      return (cfg.includes("[mcp_servers.docs]") && !cfg.includes("[mcp_servers.search]"))
        || `MCP allowlist produced: ${JSON.stringify(cfg)}`;
    } },
  { scenario: "happy",            expect: EXIT.USAGE, args: ["--mcp", "--mcp-server", "missing"],
    env: { FAKE_MCP: "1" },
    why: "an unknown MCP server name is a usage error rather than a seat silently missing its requested tool",
    assertStderr: (e) => /unknown server "missing"/.test(e) || `the unknown name was not reported: ${e.slice(0, 180)}` },
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
  { scenario: "review-inline",    expect: EXIT.OK, args: ["--review", "uncommitted"], noPrompt: true,
    why: "--review runs the server's native reviewer: the exitedReviewMode payload is the answer, and a turn with no commands is its ordinary success",
    assert: (r) => (/off-by-one in clamp/.test(String(r.answer)) && r.commandsSucceeded === 0 && r.otherItemCounts?.exitedReviewMode === 1)
      || `the review did not become the answer: ${JSON.stringify({ a: String(r.answer).slice(0, 60), c: r.commandsSucceeded })}` },
  { scenario: "review-inline",    expect: EXIT.OK, args: ["--review", "uncommitted"], noPrompt: true,
    why: "ExitedReviewModeThreadItem.review is a STRING in the pinned schema and in every live review; the fixture's invented object kept a dead stringify branch in the driver alive, and the answer a caller reads must be the review, not a JSON dump of one",
    assert: (r) => {
      if (/^[[{]/.test(String(r.answer).trim())) return `the review came back as a JSON blob: ${String(r.answer).slice(0, 80)}`;
      if (r.otherItemCounts?.enteredReviewMode !== 1) return `the review was not preceded by enteredReviewMode: ${JSON.stringify(r.otherItemCounts)}`;
      // The reviewer's own failing probe and its one non-probe failure are its working method: the
      // waiver is keyed on a review having ARRIVED, and both must be visible in the report.
      return (r.commandsFailed === 1 && r.commandsProbeNegative === 1)
        || `the reviewer's own commands were misclassified: ${JSON.stringify({ f: r.commandsFailed, p: r.commandsProbeNegative })}`;
    } },
  { scenario: "happy",            expect: EXIT.OK,
    why: "the caller's own prompt comes back as a userMessage item at the top of every live turn; counted as activity it made every report claim work the seat never did, and as observable work it would have disarmed the transient-retry guard",
    assert: (r) => (r.otherItemCounts === null || r.otherItemCounts.userMessage === undefined)
      || `the caller's own prompt was reported as activity: ${JSON.stringify(r.otherItemCounts)}` },
  { scenario: "happy",            expect: EXIT.USAGE, args: ["--review", "uncommitted", "--worktree", "/tmp"], noPrompt: true,
    why: "a --worktree is created detached at HEAD and therefore holds no uncommitted changes: measured, the pair exited 0 answering 'no staged, unstaged, or untracked changes to review' — a review that examined nothing, reported as a clean bill of health",
    assertStderr: (e) => /--review uncommitted and --worktree are contradictory/.test(e)
      || `the empty-tree review was not refused: ${e.slice(0, 200)}` },
  { scenario: "happy",            expect: EXIT.USAGE, args: ["--review", "uncommitted"],
    why: "--review builds its own prompt; a --prompt beside it (the harness always passes one here) is a contradiction, not an extra",
    assertStderr: (e) => /--review builds its own prompt/.test(e) || `the contradiction was not named: ${e.slice(0, 140)}` },
  { scenario: "review-broken",    expect: EXIT.COMMAND_FAILED, args: ["--review", "branch:nonexistent"], noPrompt: true,
    why: "the review waiver is keyed on a review having ARRIVED, not on the flag: a review whose git commands failed and which produced no payload must not exit 0 just because --review was passed",
    assert: (r) => r.commandsFailed === 1 || `the failed review command was not counted: ${JSON.stringify(r.commandsFailed)}` },
  { scenario: "happy",            expect: EXIT.USAGE, seat: "SEAT: read <CWD>\nATTACH: /etc/hosts\n",
    why: "ATTACH is not a seat-file field: a newline in any relayed value could inject one, and the injected line would upload a file the coordinator never named to the model provider",
    assertStderr: (e) => /unknown seat field ATTACH at line 2 of/.test(e) || `an injected ATTACH was accepted: ${e.slice(0, 160)}` },
  { scenario: "happy",            expect: EXIT.USAGE, seat: "SEAT: read <CWD>\nSTEER_FILE: <CWD>/precious.txt\n",
    why: "the driver TRUNCATES the steer file while the turn runs, so an injected STEER_FILE line is a write primitive aimed at any file the caller can write",
    assertStderr: (e) => /unknown seat field STEER_FILE at line 2 of/.test(e) || `an injected STEER_FILE was accepted: ${e.slice(0, 160)}` },
  { scenario: "happy",            expect: EXIT.USAGE, seat: "SEAT: read <CWD>\nMCP: yes\n",
    why: "--mcp grants tool servers that run with the caller's rights outside the seat's sandbox; a relayed value must not be able to grant them",
    assertStderr: (e) => /unknown seat field MCP at line 2 of/.test(e) || `an injected MCP grant was accepted: ${e.slice(0, 160)}` },
  { scenario: "happy",            expect: EXIT.USAGE, seat: "SEAT: read <CWD>\nEXPECT: echo\nPROGRESS: yes\n",
    why: "--progress instruments the CALLER's stderr, which a relay never shows, so it is a flag and a header naming it is a caller who believes something untrue about what he will see",
    assertStderr: (e) => /PROGRESS is command-line-only; pass --progress/.test(e)
      || `PROGRESS was still accepted as a seat field: ${e.slice(0, 200)}` },
  { scenario: "rich-items",       expect: EXIT.OK,
    why: "reasoning summaries, tool/search items and subagent threads used to be dropped on the floor — a turn that mostly searched or delegated looked idle; they are now VISIBLE in the report while the child's command still counts for nothing",
    assert: (r) => (/Weighed A/.test(r.reasoningSummary ?? "") && r.otherItemCounts?.webSearch === 1
        && r.otherItems?.some((x) => x.type === "webSearch" && x.detail === "node atomics")
        && r.subagentThreads?.length === 1 && r.subagentThreads[0].threadId === "thr_child"
        && r.subagentThreads[0].commands === 1 && r.commandsSucceeded === 1)
      || `visibility fields wrong: ${JSON.stringify({ reasoning: r.reasoningSummary, other: r.otherItemCounts, items: r.otherItems, sub: r.subagentThreads, cmds: r.commandsSucceeded })}` },
  { scenario: "progress",         expect: EXIT.OK, args: ["--progress"],
    why: "--progress announces each item start on stderr, so a long seat is watchable live — a native subagent's progress visibility, without the delta firehose",
    assertStderr: (e) => /> run: .*echo hi/.test(e) || `no progress line: ${e.slice(0, 160)}` },
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
    why: "a no-match grep or a false test is a probe answering 'no', not a failed command — routine research seats exited 11 for finding nothing. The commands arrive WRAPPED (`/bin/zsh -c '...'`), which is the whole reason the exemption used to be dead: the pattern was anchored on the wrapper",
    assert: (r) => {
      if (!(r.commands ?? []).every((c) => /^\/bin\/zsh -c /.test(c.command)))
        return `the fixture stopped emitting the live wrapper, so this case no longer tests anything: ${JSON.stringify((r.commands ?? []).map((c) => c.command))}`;
      return (r.commandsFailed === 0 && r.commandsProbeNegative === 2)
        || `probe verdicts miscounted: failed=${r.commandsFailed} probes=${r.commandsProbeNegative}`;
    } },
  { scenario: "probe-quoted",     expect: EXIT.OK,
    why: "the server wraps a script carrying a double quote in double quotes and escapes the inner ones — measured live — so the bare command survives only in commandActions; unwrapping the text by hand cannot recover it, and the probe exemption dies again for exactly the seats that use quoted patterns",
    assert: (r) => (r.commandsFailed === 0 && r.commandsProbeNegative === 1)
      || `a quoted probe was not recovered from the server's own parse: failed=${r.commandsFailed} probes=${r.commandsProbeNegative}` },
  { scenario: "probe-piped",      expect: EXIT.COMMAND_FAILED,
    why: "a probe piped into another command exits with the LAST command's status, and the server parses it into two actions — classifying on the first one would launder `grep x | tail` exiting 1 into 'the probe answered no'",
    assert: (r) => (r.commandsFailed === 1 && r.commandsProbeNegative === 0)
      || `a pipeline was laundered into a probe: failed=${r.commandsFailed} probes=${r.commandsProbeNegative}` },
  { scenario: "escalated",        expect: EXIT.ESCALATED,
    why: "a refused approval completes its item as DECLINED with no exit code: that is a failure whatever the code says, never an unresolved command, and never a probe answering 'no' however grep-shaped its text",
    assert: (r) => (r.commandsFailed === 2 && r.commandsBlocked === 0 && r.commandsProbeNegative === 0)
      || `a declined command was misclassified: ${JSON.stringify({ f: r.commandsFailed, b: r.commandsBlocked, p: r.commandsProbeNegative })}` },
  { scenario: "blocked-command",  expect: EXIT.COMMAND_FAILED,
    why: "a command item with no numeric exit code that is neither failed nor declined has no verdict at all; the footer printed it as NEVER RAN while the ladder ignored it, so one success beside one unresolved command reported ok: true under an answer claiming the suite passed",
    assert: (r) => (r.commandsBlocked === 1 && r.commandsFailed === 0 && r.commandsSucceeded === 1)
      || `the unresolved command was not counted: ${JSON.stringify({ b: r.commandsBlocked, f: r.commandsFailed, s: r.commandsSucceeded })}` },
  { scenario: "blocked-command",  expect: EXIT.OK, args: ["--verify", "true"],
    why: "an unresolved command lands on the same rung as a failed one, and takes the same waiver: the caller's own check measured the end state, which outranks a missing verdict",
    assert: (r) => (r.verify?.ok === true && r.commandsBlocked === 1)
      || `the waiver did not apply: ${JSON.stringify({ v: r.verify, b: r.commandsBlocked })}` },
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
  { scenario: "hidden-failure",  expect: EXIT.OK,                 args: ["--allow-failed-commands"],
    why: "a read-only analysis seat whose environment probe is expected to fail (no repository, no toolchain, a deliberately broken build) had no way to say so: every such seat exited 11 with a perfectly good answer, and the only waiver was a --verify the seat did not need",
    assert: (r) => (r.commandsFailed === 1 && r.ok === true)
      || `the waived failure left the report: ${JSON.stringify({ failed: r.commandsFailed, ok: r.ok })}` },
  { scenario: "hidden-failure",  expect: EXIT.NO_COMMANDS,
    args: ["--allow-failed-commands", "--expect-command", "zzz_never"],
    why: "the waiver is for the failed-command rung and nothing else; asking for proof and then accepting its absence is the failure --expect-command exists to prevent",
    assert: (r) => r.commandsMatchingExpectation === 0
      || `the expectation was not measured: ${JSON.stringify(r.commandsMatchingExpectation)}` },
  { scenario: "hidden-failure",  expect: EXIT.VERIFY_FAILED,
    args: ["--allow-failed-commands", "--verify", "false"],
    why: "the same: a check the caller ran and that said no outranks every waiver, because it measured the end state instead of inferring it",
    assert: (r) => r.verify?.ok === false || `the failed check was not reported: ${JSON.stringify(r.verify)}` },
  { scenario: "hidden-failure",  expect: EXIT.OK,
    seat: "SEAT: read <CWD>\nALLOW_FAILED_COMMANDS: yes\n",
    why: "the relay writes fields, never a command line, so a flag it cannot express is a flag the plugin ships and cannot use",
    assert: (r) => ((r.seatFileFields ?? []).includes("ALLOW_FAILED_COMMANDS") && r.commandsFailed === 1)
      || `the seat file's waiver did not reach the run: ${JSON.stringify({ fields: r.seatFileFields, failed: r.commandsFailed })}` },
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
  { scenario: "happy",            expect: EXIT.OK, args: ["--verify", "yes abcdefghij | head -c 100000000; exit 0"],
    why: "a verifier that prints 100 MB and exits 0 has PASSED: under spawnSync it overran maxBuffer and came back status null, so a run whose end state was proven good reported exit 12. Streaming the output with a bounded tail keeps the exit status, which is the only thing the verdict may rest on",
    assert: (r) => (r.verify?.ok === true && r.verify?.measured === true
      && String(r.verify?.stdout ?? "").length <= 2000)
      || `a passing loud verifier was not measured: ${JSON.stringify({ ...r.verify, stdout: String(r.verify?.stdout ?? "").length })}` },
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
  { scenario: "happy",            expect: EXIT.OK, args: ["--resume", "thr_root"],
    why: "which thread a turn continued was announced on stderr only — which a relay shows on failure — so a resumed run's report was indistinguishable from a fresh one, and `--resume last` is exactly where the wrong thread gets picked silently",
    assert: (r) => r.resumedFrom === "thr_root" || `the report did not name the thread it continued: ${JSON.stringify(r.resumedFrom)}` },
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
  { scenario: "schema-never",     expect: EXIT.SCHEMA, args: ["--output-schema", REVIEW_SCHEMA],
    why: "the shipped adversarial-review schema passes strict-schema admission and reaches the turn; the scripted invalid answer then fails at output validation, not setup",
    assert: (r) => (r.outputAttempts === 2 && r.outputSchemaOk === false && Array.isArray(r.schemaErrors))
      || `the shipped schema did not reach output validation: ${JSON.stringify({ a: r.outputAttempts, ok: r.outputSchemaOk, e: r.schemaErrors })}` },
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
    assertStderr: (t) => /unknown seat field BOGUS at line 2 of/.test(t) || `stderr did not name the field: ${t.slice(0, 120)}` },
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
  { scenario: "happy", seat: "# a header that declares nothing\n\n", expect: EXIT.USAGE,
    why: "a seat file with no SEAT at all declares no rights, and defaulting them is exactly what a rights declaration exists to prevent. Comments and blank lines are the only way past the first-field check, so this is the case that reaches the final one",
    assertStderr: (e) => /no SEAT field/.test(e) || `a seat file with no SEAT was accepted: ${e.slice(0, 160)}` },
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
      || `a protected $TMPDIR was granted at read level: ${e.slice(0, 200)}` },
  { scenario: "happy",            expect: EXIT.OK, unsetEnv: ["TMPDIR"],
    why: "TMPDIR unset is the default in a stock Linux shell, and refusing it made every such seat a usage error over an environment variable the caller never thought about. A private 0700 directory of the run's own is the narrower grant — the seat can start a test runner, and what it gets is one run's scratch space rather than all of /tmp. It lives under the driver's state, where the run-directory pruner reaches it",
    assert: (r) => {
      const roots = r.sandbox?.writableRoots ?? [];
      if (roots.length !== 1) return `the private temp grant is not exactly one root: ${JSON.stringify(roots)}`;
      if (roots[0] === os.tmpdir() || roots[0] === "/tmp") return `the grant is the whole system temp dir: ${JSON.stringify(roots[0])}`;
      if (r.tmpDir === null) return "the run made a private temp directory and the report does not name it";
      const base = path.join(shimDir, "state-root", "tmp");
      if (path.dirname(r.tmpDir) !== base) return `the private temp directory is not under <state>/tmp: ${JSON.stringify(r.tmpDir)}`;
      if (fs.realpathSync(r.tmpDir) !== roots[0]) return `the grant is not the reported directory: ${JSON.stringify({ tmpDir: r.tmpDir, root: roots[0] })}`;
      if ((fs.statSync(r.tmpDir).mode & 0o777) !== 0o700) return `the private temp directory is not 0700: ${(fs.statSync(r.tmpDir).mode & 0o777).toString(8)}`;
      return fs.existsSync(r.tmpDir) || `the run's private temp directory was removed at exit: ${r.tmpDir}`;
    } },
  { scenario: "tmp-write",        expect: EXIT.OK, unsetEnv: ["TMPDIR"],
    why: "the private directory is the read seat's ONLY writable root, and --brief tells the seat to leave long output in a file there and give its absolute path. Removing it at exit took that file with it, so the one path the answer named resolved to nothing — measured against the same teardown that removes the per-run home",
    assert: (r) => {
      const named = /full notes at (\S+)/.exec(String(r.answer))?.[1];
      if (!named) return `the seat did not name the file it wrote: ${String(r.answer).slice(0, 160)}`;
      if (!fs.existsSync(named)) return `the path the answer names was removed with the run: ${named}`;
      if (r.tmpDir === null) return "a kept private temp directory was not named in the report";
      if (path.dirname(named) !== r.tmpDir) return `the report's tmpDir is not the directory the file is in: ${JSON.stringify({ tmpDir: r.tmpDir, named })}`;
      return true;
    } },
  { scenario: "happy",            expect: EXIT.OK, env: { TMPDIR: explicitTmp },
    why: "an explicit TMPDIR is honoured unchanged — the private directory is a fallback for an unset variable, never a substitution for the caller's own choice",
    assert: (r) => {
      const roots = r.sandbox?.writableRoots ?? [];
      if (r.tmpDir !== null) return `a caller's own TMPDIR was reported as this run's to remove: ${JSON.stringify(r.tmpDir)}`;
      return (roots.length === 1 && roots[0] === fs.realpathSync(explicitTmp))
        || `an explicit TMPDIR did not survive as the grant: ${JSON.stringify(roots)}`;
    } },

  // --- a server that dies mid-turn still has to hand back what the turn did ---
  { scenario: "server-crash",     expect: EXIT.TRANSPORT,
    why: "the child's exit routed straight to abort(), which prints NO report: an OOM-killed app-server discarded the threadId, the commands and a partial answer — the loss the signal and timeout paths exist to prevent",
    assert: (r) => (r.commandsSucceeded === 1 && r.threadId === "thr_root"
      && /crashed/.test(JSON.stringify(r.turnError ?? {})) && /partial answer/.test(String(r.answer)))
      || `the crash discarded the turn's evidence: ${JSON.stringify({ cmds: r.commandsSucceeded, thread: r.threadId, err: r.turnError, answer: String(r.answer).slice(0, 60) })}` },

  // --- the main transport's two unbounded buffers ---
  { scenario: "early-flood",      expect: EXIT.TRANSPORT,
    why: "turn-scoped notifications arriving before the turn/start response are HELD, and were held without any bound: a broken server can exhaust the driver's memory with them while the report it is buffering for never arrives",
    assertStderr: (e) => /before answering turn\/start/.test(e)
      || `the early buffer was not bounded: ${e.slice(0, 200)}` },
  { scenario: "unterminated-line", expect: EXIT.TRANSPORT,
    why: "readline buffers an unterminated line without limit; the setup probe has had a 256 KB cap since one took driver RSS from 52 to 387 MB, and the main stream had none",
    assertStderr: (e) => /with no newline/.test(e)
      || `an unterminated line was buffered without a bound: ${e.slice(0, 200)}` },

  { scenario: "no-trailing-newline", expect: EXIT.OK,
    why: "EOF terminates a line as surely as a newline does, and readline flushed one: with hand-rolled framing and no end handler, a final turn/completed whose newline was lost is dropped and the run reports nothing it saw",
    assert: (r) => (r.turnStatus === "completed" && r.commandsSucceeded === 1 && /the answer/.test(String(r.answer)))
      || `a final line without its newline was dropped: ${JSON.stringify({ turn: r.turnStatus, cmds: r.commandsSucceeded, answer: String(r.answer).slice(0, 40) })}` },

  // --- the report has to reach stdout, and a paused reader is not a broken one ---
  { scenario: "long-answer",      expect: EXIT.TRANSPORT, closeStdout: true,
    why: "a consumer that stops reading (`| head -c 1`) makes the report write fail EPIPE; with no 'error' listener Node made that an uncaught exception — exit 1 and a stack trace on a driver whose contract says a report that cannot reach stdout is exit 4",
    assertStderr: (e) => /EPIPE|did not reach the caller/.test(e)
      || `a closed stdout was not reported as a transport failure: ${e.slice(0, 200)}` },
  { scenario: "long-answer",      expect: EXIT.OK, pauseStdout: 8000, args: ["--timeout", "40"],
    why: "the drain wait was a flat 5 s, so a consumer that paused for eight seconds got 65536 bytes and exit 4 for a report it would have drained. The bound is what is LEFT of --timeout, with a 5 s floor",
    assert: (r) => (typeof r.answer === "string" && r.answer.length > 60000)
      || `the report was truncated for a consumer that paused: ${String(r.answer ?? "").length} bytes of answer` },

  // --- what the report says about the run's own footing ---
  { scenario: "happy",            expect: EXIT.OK,
    why: "the initialize response carries the server's version in userAgent, and the driver dropped it — version drift was named only after a method came back -32601",
    assert: (r) => (r.codexVersion === "0.150.1" && r.codexVersionPinned === "0.150.1")
      || `codexVersion was not read out of the userAgent: ${JSON.stringify({ v: r.codexVersion, pinned: r.codexVersionPinned })}` },
  { scenario: "happy",            expect: EXIT.OK, env: { FAKE_CODEX_VERSION: "9.9.9" },
    why: "a codex that is not the one the protocol facts were measured against is the first thing to know when behaviour contradicts the docs; it must be said on stderr and in the report, not inferred from a later failure",
    assert: (r) => r.codexVersion === "9.9.9" || `drift was not reported: ${JSON.stringify(r.codexVersion)}` },
  { scenario: "happy",            expect: EXIT.OK,
    why: "a run on account defaults and a healthy run were indistinguishable through the relay: nothing said whether model and effort came from a fresh probe of the caller's config, a stale last-known-good, or nothing at all",
    assert: (r) => (r.configInherited?.source === "probe" && r.configInherited.keys.includes("model"))
      || `a healthy probe was not reported as one: ${JSON.stringify(r.configInherited)}` },
  { scenario: "happy",            expect: EXIT.OK,
    env: { FAKE_CONFIG_FAIL: "1", CODEX_DELEGATE_STATE_DIR: emptyState },
    why: "the same field must distinguish the unhealthy case: a probe that failed with no last-known-good to keep means the turn ran on the account defaults",
    assert: (r) => (r.configInherited?.source === "none" && r.configInherited.keys.length === 0)
      || `a failed probe was reported as inheritance: ${JSON.stringify(r.configInherited)}` },
  { scenario: "probe-piped",      expect: EXIT.COMMAND_FAILED,
    why: "SKILL.md publishes `| tail` as a trap — the seat sees a slice of its own evidence and concludes from it — and no report field named it",
    assert: (r) => (r.commandsPipedToPager === 1 && /head\/tail\/less/.test(String(r.pipedToPagerHint ?? "")))
      || `a command ending in a pager was not counted: ${JSON.stringify({ n: r.commandsPipedToPager, hint: r.pipedToPagerHint })}` },

  // --- the server's parse is evidence, not authority ---
  { scenario: "probe-laundered",  expect: EXIT.COMMAND_FAILED,
    why: "the probe exemption trusts commandActions absolutely: one tidy action extracted from a MULTI-LINE script let `grep -q needle` stand for `grep -q needle\\npnpm test`, laundering a failed suite into 'the probe answered no' and exiting 0 under an answer claiming the tests pass",
    assert: (r) => (r.commandsProbeNegative === 0 && r.commandsFailed === 1)
      || `a multi-line script was read as a probe: ${JSON.stringify({ probe: r.commandsProbeNegative, failed: r.commandsFailed })}` },

  // --- --expect-command is matched against the command, not the shell that ran it ---
  { scenario: "happy",            expect: EXIT.OK, args: ["--expect-command", "^echo"],
    why: "the live server reports the WRAPPER (`/bin/zsh -lc '...'`), so an anchored pattern — the natural way to write one — could never match a live command; it must be matched against the command the server parsed as well",
    assert: (r) => (r.expectationOk === true && r.commandsMatchingExpectation === 1)
      || `an anchored pattern did not match the parsed command: ${JSON.stringify({ ok: r.expectationOk, n: r.commandsMatchingExpectation })}` },

  // --- the standing rules the driver puts on the thread ---
  { scenario: "echo-instructions", expect: EXIT.OK, args: ["--brief"],
    why: "--brief's second sentence is what keeps a capped answer from losing its detail; it must still be sent when it is not contradicted",
    assert: (r) => /Put anything longer/.test(String(r.answer))
      || `--brief lost its forwarding instruction: ${String(r.answer).slice(0, 200)}` },
  { scenario: "echo-instructions", expect: EXIT.OK, args: ["--brief", "--answer-json"],
    why: "under --answer-json the seat has just been told to answer with ONE JSON object and nothing else; telling it in the same breath to put the rest in a file is a contradiction the seat has to resolve on its own",
    assert: (r) => (!/Put anything longer/.test(String(r.answer)) && /ONE JSON object/.test(String(r.answer)))
      || `the contradictory pair was still sent: ${String(r.answer).slice(0, 300)}` },

  // --- the seat file is written by a relay, so it must take the shapes a relay writes ---
  { scenario: "happy", seat: "SEAT: read <CWD>\nEXPECT: echo\nNETWORK: no\nCOMMIT: false\nBRIEF: 0\n", expect: EXIT.OK,
    why: "NETWORK/COMMIT/BRIEF accepted only yes|true|1, so a relay copying `NETWORK: no` out of its own header template failed the whole seat with exit 2 before any work — and at read level the flag it was refusing for is itself a usage error",
    assert: (r) => (r.network === false && r.seatFileFields?.join(",") === "SEAT,EXPECT,NETWORK,COMMIT,BRIEF")
      || `a negated boolean did not read as omission: ${JSON.stringify({ net: r.network, fields: r.seatFileFields })}` },

  // --- --verify: the budget that killed it, and the sandbox that is opt-in ---
  { scenario: "happy",            expect: EXIT.VERIFY_UNMEASURABLE, args: ["--timeout", "3", "--verify", "sleep 20"],
    why: "a verifier killed at min(300s, what is left of --timeout) reported `exitCode: null, signal: SIGKILL, error: ETIMEDOUT` without saying that the caller's own clock had killed it",
    assert: (r) => (r.verify?.timedOut === true && r.verify?.budgetMs > 0 && r.verify?.measured === false)
      || `the budget that ended the verifier was not reported: ${JSON.stringify(r.verify)}` },
  { scenario: "happy",            expect: EXIT.USAGE, args: ["--verify-sandboxed"],
    why: "--verify-sandboxed sandboxes a verifier; without --verify there is nothing to sandbox, and silently doing nothing is how a caller believes a check ran",
    assertStderr: (e) => /--verify, which was not given/.test(e) || `the empty flag was accepted: ${e.slice(0, 160)}` },
  { scenario: "happy",            expect: EXIT.USAGE, args: ["--verify", "true", "--verify-sandboxed"],
    why: "where `codex sandbox` does not exist the sandbox cannot be applied, and falling back to running the verifier with the caller's own rights is the one thing the flag exists to prevent",
    assertStderr: (e) => /--verify-sandboxed needs/.test(e)
      || `an unavailable sandbox did not stop the run: ${e.slice(0, 200)}` },
  { scenario: "happy",            expect: EXIT.VERIFY_FAILED, env: { FAKE_SANDBOX: "1" },
    args: ["--verify", "exit 3", "--verify-sandboxed"],
    why: "`codex sandbox` passes the command's exit code through — measured live, exit 7 came back as 7 — so a sandboxed verifier's verdict is the verifier's, not the sandbox's",
    assert: (r) => (r.verify?.exitCode === 3 && r.verify?.sandboxed === true && r.verify?.measured === true)
      || `the sandboxed verifier's exit code was not passed through: ${JSON.stringify(r.verify)}` },

  // --- the wall clock as three rungs: warn, cut, report ---
  { scenario: "wrap-up",          expect: EXIT.OK, args: ["--timeout", "65"],
    why: "the only recovery that works. E1 measured that turn/interrupt DISCARDS the in-flight answer, so nothing at the deadline can produce one: the run has to ask for the final answer while the model can still write it, a quarter of the budget out and never less than a minute",
    assert: (r) => {
      const a = String(r.answer);
      const n = Number(/About (\d+) seconds of wall clock remain/.exec(a)?.[1]);
      if (!Number.isFinite(n)) return `no wrap-up steer reached the turn: ${a.slice(0, 160)}`;
      if (!(n > 50 && n <= 61)) return `the wrap-up steer named ${n}s left of a 65 s budget with a 60 s reserve`;
      return /Stop investigating now; write your final answer/.test(a)
        || `the steer did not ask for the final answer: ${a.slice(0, 200)}`;
    } },
  { scenario: "happy",            expect: EXIT.OK,
    why: "and it must not fire where the reserve does not fit: on a 20 s seat a wrap-up steer would land in the first tick, which is an interruption rather than a warning — the rung is armed only when it leaves the model real time to write",
    assertStderr: (e) => !/wrap-up:/.test(e) || `a short seat was steered anyway: ${e.slice(0, 200)}` },
  { scenario: "cut-flush",        expect: EXIT.TIMEOUT, args: ["--timeout", "1"],
    why: "a cut is not a kill: the server is asked to end the turn and given a grace to do it, and an answer that lands inside that grace is the answer the caller gets. Before this the deadline reported and tore the group down in the same tick, so a completion already on the wire was thrown away",
    assert: (r) => {
      if (r.cut?.kind !== "wall") return `the report did not name the budget that cut it: ${JSON.stringify(r.cut)}`;
      if (r.cut.completedInGrace !== true) return `the turn closed inside the grace and the report says otherwise: ${JSON.stringify(r.cut)}`;
      if (!/flushed at the interrupt/.test(String(r.answer))) return `the flushed answer was discarded: ${JSON.stringify(String(r.answer).slice(0, 80))}`;
      return (r.turnStatus === "timedOut" && r.cut.limit === 1) || `a cut turn must still report the budget it was cut on: ${JSON.stringify({ t: r.turnStatus, cut: r.cut })}`;
    } },
  { scenario: "cut-partial",      expect: EXIT.TIMEOUT, args: ["--timeout", "1"],
    why: "the MEASURED server (E1): the interrupt flushes nothing and the in-flight message is discarded, so the accumulated deltas are the only copy of what the model had written. It is never the answer — unfinished text the model did not deliver, in its own field — and the messages of a turn that answered nothing get a path of their own",
    assert: (r) => {
      if (r.cut?.completedInGrace !== false) return `nothing closed the turn, so completedInGrace must be false: ${JSON.stringify(r.cut)}`;
      if (String(r.answer) !== "") return `an unfinished partial was promoted to the answer: ${JSON.stringify(String(r.answer).slice(0, 80))}`;
      if (r.answerPartial !== "The answer so far, and this much more")
        return `the partial was not reassembled from the deltas: ${JSON.stringify(r.answerPartial)}`;
      // The commentary message was STREAMED and then completed: its deltas must not survive as a partial.
      if (/looking into it/.test(String(r.answerPartial))) return "a message the server completed came back as a partial";
      if (!r.answerPartialPath || !fs.existsSync(r.answerPartialPath)) return `the partial was not written: ${r.answerPartialPath}`;
      if (!r.commentaryPath || !fs.existsSync(r.commentaryPath)) return `a turn with only commentary wrote no commentaryPath: ${r.commentaryPath}`;
      if (!/looking into it/.test(fs.readFileSync(r.commentaryPath, "utf8"))) return "commentaryPath does not hold the turn's messages";
      return r.commentaryOnly === true || `commentaryOnly was ${JSON.stringify(r.commentaryOnly)}`;
    } },
  { scenario: "cut-partial",      expect: EXIT.TIMEOUT, args: ["--timeout", "1"],
    why: "exit 3 is a budget the CALLER set, so the report has to say what the caller can do about it; the thread is still there and resuming it is the recovery, with the caveat that a turn still closing refuses with exit 10",
    assert: (r) => (/--resume thr_root/.test(String(r.hint)) && /RESUME: thr_root/.test(String(r.hint))
        && /exit 10/.test(String(r.hint)) && /--effort/.test(String(r.hint)) && /split/.test(String(r.hint)))
      || `the exit-3 hint does not name the way out: ${JSON.stringify(r.hint)}` },
  { scenario: "no-thread",        expect: EXIT.TIMEOUT, args: ["--timeout", "0.5"],
    why: "the pre-thread rung is unchanged by the cut: with no thread there is nothing to interrupt and nothing to report, so it aborts with the code and prints no report — the same contract --help publishes",
    assertStderr: (e) => /timed out after 0.5s/.test(e) || `the pre-thread timeout did not announce itself: ${e.slice(0, 200)}` },
  { scenario: "happy",            expect: EXIT.OK,
    why: "the schema has carried durationMs on every commandExecution item all along and the driver dropped it, so nothing could say whether a slow seat was slow because of the model or because of the work it ordered",
    assert: (r) => {
      const t = r.timing;
      if (!t || typeof t.wallMs !== "number" || typeof t.setupMs !== "number") return `no timing in the report: ${JSON.stringify(t)}`;
      if (!(t.wallMs > 0 && t.setupMs >= 0 && t.setupMs <= t.wallMs)) return `timing is not internally consistent: ${JSON.stringify(t)}`;
      if (t.commandMs !== 1) return `commandMs did not come from the item's own durationMs: ${JSON.stringify(t)}`;
      return t.modelMs === t.wallMs - t.setupMs - t.commandMs || `modelMs is not the remainder: ${JSON.stringify(t)}`;
    } },
  { scenario: "echo-instructions", expect: EXIT.OK,
    why: "the model has no clock unless it runs `date`, so a wall-clock budget it is never told about is one it cannot plan against — the sentence is the whole of P1 and it costs nothing",
    assert: (r) => {
      const n = Number(/You have about (\d+) seconds of wall clock/.exec(String(r.answer))?.[1]);
      if (!Number.isFinite(n)) return `the budget never reached the seat: ${String(r.answer).slice(0, 200)}`;
      return (n > 0 && n <= 20) || `the seat was told ${n}s of a 20 s budget`;
    } },
  { scenario: "echo-instructions", expect: EXIT.OK, args: ["--resume", "thr_root"],
    why: "developerInstructions are per-request, not per-thread: a resumed turn that did not carry the budget sentence would be the only turn running blind, and --resume is exactly where a long seat continues",
    assert: (r) => (/You have about \d+ seconds of wall clock/.test(String(r.answer)) && r.resumedFrom === "thr_root")
      || `a resumed turn lost the budget sentence: ${JSON.stringify({ a: String(r.answer).slice(0, 160), from: r.resumedFrom })}` },
  { scenario: "happy",            expect: EXIT.OK, args: ["--effort", "high"],
    why: "the measured failure shape: a high-effort turn spends minutes thinking before it writes anything, and under a short clock the cut lands before an answer exists. The warning is on stderr at the threadId announcement, while the caller can still stop the run",
    assertStderr: (e) => /effort high with --timeout 20s is the measured failure shape/.test(e)
      || `no warning for high effort under a short clock: ${e.slice(0, 300)}` },
  { scenario: "happy",            expect: EXIT.OK, args: ["--effort", "low"],
    why: "and it must stay quiet otherwise: a warning printed on every run is a warning nobody reads",
    assertStderr: (e) => !/measured failure shape/.test(e) || `the effort warning fired for low effort: ${e.slice(0, 200)}` },

  // --- the token accounting the SERVER does, which is not a bound the driver enforces ---
  { scenario: "review-instructions", expect: EXIT.OK, noPrompt: true, args: ["--review", "uncommitted"],
    why: "under --review the server builds the reviewer's whole prompt, so the wall-clock sentence names a bound the reviewer cannot act on in a turn whose shape is fixed; the standing rules still ride",
    assert: (r) => {
      if (!/unattended/.test(String(r.answer))) return `the review turn carried no developerInstructions at all: ${String(r.answer).slice(0, 160)}`;
      return !/seconds of wall clock/.test(String(r.answer))
        || `a review turn was given a wall-clock sentence: ${String(r.answer).slice(0, 240)}`;
    } },
  { scenario: "review-inline",    expect: EXIT.OK, noPrompt: true,
    args: ["--review", "uncommitted"], env: { FAKE_RPC_LOG: reviewSteerLog },
    why: "the steer the DRIVER invents is refused under --review — the reviewer answers its own prompt in a fixed shape and 'write your final answer now' names nothing it can act on — while the server's own accounting still reaches the report",
    assert: (r) => {
      const steers = steersIn(reviewSteerLog);
      if (steers.length) return `the server's own reviewer was steered: ${JSON.stringify(steers)}`;
      return r.tokenUsage?.total?.totalTokens === 900
        || `the review's token usage did not reach the report: ${JSON.stringify(r.tokenUsage?.total)}`;
    } },
  { scenario: "happy",            expect: EXIT.USAGE, seat: "SEAT: read <CWD>\nBUDGET_TOKENS: 100000\n",
    why: "the token budget is gone entirely — a rudimentary bound nobody could size honestly — so the field it rode is not a knob to re-spell but an unknown one, and a header carrying it must fail loudly rather than run unbounded",
    assertStderr: (e) => /unknown seat field BUDGET_TOKENS at line 2 of/.test(e)
      || `BUDGET_TOKENS was still understood: ${e.slice(0, 200)}` },

  // --- the bounds and the transport are flags: a seat file naming one is exit 2 ---
  { scenario: "happy",            expect: EXIT.USAGE, seat: "SEAT: read <CWD>\nTIMEOUT: 30\n",
    why: "the wall clock is the configuration the default exists to remove: a relay that copies a TIMEOUT out of a header reintroduces exactly the bound every seat would otherwise have to size, so the field is refused and the flag stays for the caller who really wants one",
    assertStderr: (e) => /TIMEOUT is command-line-only; pass --timeout/.test(e)
      || `a seat file still set the wall clock: ${e.slice(0, 200)}` },
  { scenario: "happy",            expect: EXIT.USAGE, seat: "SEAT: read <CWD>\nIDLE_TIMEOUT: 300\n",
    why: "same for the two always-armed bounds: 900 s of silence and 1000 commands are native-like defaults, and a header able to widen or disable them is a hang guard a relayed value can switch off",
    assertStderr: (e) => /IDLE_TIMEOUT is command-line-only; pass --idle-timeout/.test(e)
      || `a seat file still set the silence guard: ${e.slice(0, 200)}` },
  { scenario: "happy",            expect: EXIT.USAGE, seat: "SEAT: read <CWD>\nMAX_COMMANDS: 2\n",
    assertStderr: (e) => /MAX_COMMANDS is command-line-only; pass --max-commands/.test(e)
      || `a seat file still set the command cap: ${e.slice(0, 200)}`,
    why: "the volume cap is the maxTurns a native subagent has; the driver owns it" },
  { scenario: "happy",            expect: EXIT.USAGE, seat: "SEAT: read <CWD>\nDETACH: yes\n",
    why: "the transport is the driver's, not the header's: DETACH, WAIT_TIMEOUT and COLLECT describe how a run is carried rather than what it may do, and a relay that writes them is choosing a transport its coordinator never asked about",
    assertStderr: (e) => /DETACH is command-line-only; pass --detach/.test(e)
      || `a seat file still chose the transport: ${e.slice(0, 200)}` },
  { scenario: "happy",            expect: EXIT.USAGE, seat: "SEAT: read <CWD>\nWAIT_TIMEOUT: 560\n",
    assertStderr: (e) => /WAIT_TIMEOUT is command-line-only; pass --wait-timeout/.test(e)
      || `a seat file still sized a wait: ${e.slice(0, 200)}`,
    why: "one wait's own budget is the collector's business, and the collector is a flag" },
  { scenario: "happy",            expect: EXIT.USAGE, seat: "SEAT: read <CWD>\nCOLLECT: thr_root\n",
    assertStderr: (e) => /COLLECT is command-line-only; pass --wait/.test(e)
      || `a seat file still collected a run: ${e.slice(0, 200)}`,
    why: "collecting a detached run is a whole mode of its own, reached with --wait" },
  { scenario: "happy",            expect: EXIT.USAGE, seat: "SEAT: read <CWD>\nTIMEOUT: 30\n", args: ["--timeout", "5"],
    why: "and the refusal is not waived by passing the flag too: a seat file that names a bound is a caller who believes the file decides it, and running the flag's value silently would leave that belief in place",
    assertStderr: (e) => /TIMEOUT is command-line-only/.test(e)
      || `an explicit --timeout beside the field made the field acceptable: ${e.slice(0, 200)}` },

  // --- the idle guard: the bound that tells a working turn from a hung one ---
  { scenario: "idle-silence",     expect: EXIT.TIMEOUT, args: ["--idle-timeout", "1", "--timeout", "8"],
    why: "a turn that says NOTHING is the hang the wall clock cannot name: --timeout is a budget a healthy turn may spend in full, so only silence distinguishes them, and every root event rearms it",
    assert: (r) => (r.cut?.kind === "idle" && r.cut.limit === 1 && r.cut.observed >= 1 && r.turnStatus === "timedOut")
      || `the silent turn was not cut on the idle budget: ${JSON.stringify({ cut: r.cut, t: r.turnStatus })}` },
  { scenario: "idle-subagent",    expect: EXIT.OK, args: ["--idle-timeout", "1", "--timeout", "20"],
    why: "Codex runs its own threads under ours, and their notifications are the turn working: judging liveness on the root thread alone cut a seat whose subagent had been busy for seconds. Liveness is inclusive; evidence of SUCCESS stays root-only, so the child's command still satisfies no gate",
    assert: (r) => {
      if (r.cut !== null) return `a turn whose subagent was working throughout was cut: ${JSON.stringify(r.cut)}`;
      if (r.subagentThreads?.[0]?.threadId !== "thr_child") return `the subagent thread was not registered: ${JSON.stringify(r.subagentThreads)}`;
      // The root ran exactly one command; the child's is counted for the child and for nothing else.
      return (r.commandsSucceeded === 1 && r.tokenUsage?.total?.totalTokens === 100)
        || `a child thread's work leaked into the root's evidence: ${JSON.stringify({ cmds: r.commandsSucceeded, usage: r.tokenUsage?.total })}`;
    } },
  { scenario: "idle-silence",     expect: EXIT.TIMEOUT, args: ["--idle-timeout", "0", "--timeout", "2"],
    why: "0 disables it, and a disabled guard must be OFF rather than instant: the same silent turn then runs to the wall clock and is cut with cut.kind wall",
    assert: (r) => r.cut?.kind === "wall"
      || `--idle-timeout 0 did not disable the idle guard: ${JSON.stringify(r.cut)}` },
  { scenario: "no-thread",        expect: EXIT.TIMEOUT, args: ["--timeout", "2"],
    why: "the pre-thread rung fires at T, not a grace early: with no thread there is nothing to interrupt, so the grace buys nothing and spending it would shorten the caller's own budget",
    assertStderr: (e, ms) => {
      if (!/timed out after 2s/.test(e)) return `the pre-thread timeout did not announce itself: ${e.slice(0, 200)}`;
      return ms >= 1800 || `the pre-thread abort fired after ${ms}ms of a 2000ms budget — a grace early`;
    } }
,

  // --- the default: no wall clock at all, the way a native subagent runs ---
  { scenario: "slow-turn",        expect: EXIT.OK, noTimeout: true,
    why: "the default arms NO wall-clock rung: a turn that takes its time finishes and reports cut: null, where the old 900 s default made every seat a budget the coordinator had to size",
    assert: (r, ms) => (r.cut === null && r.turnStatus === "completed" && ms > 1200)
      || `the default run was bounded by something: ${JSON.stringify({ cut: r.cut, turnStatus: r.turnStatus, ms })}` },
  { scenario: "echo-instructions", expect: EXIT.OK, noTimeout: true,
    why: "the model has no clock, so what it is TOLD is the whole of what it can plan against: told 'about N seconds' when nothing is counting, it rushes work it had time for",
    assert: (r) => {
      const a = String(r.answer);
      if (/seconds of wall clock/.test(a)) return `the default run still promised the seat a wall clock: ${a.slice(0, 160)}`;
      return /There is no wall-clock limit on this turn; it is cut only after 900 seconds of silence or by the coordinator\./.test(a)
        || `the no-wall-clock sentence is not the one the seat was given: ${a.slice(0, 200)}`;
    } },
  { scenario: "idle-silence",     expect: EXIT.TIMEOUT, noTimeout: true, args: ["--idle-timeout", "1"],
    why: "with no wall clock the silence guard is what ends a hung seat, and it must end it on its own budget rather than waiting for a clock that was never set",
    assert: (r, ms) => (r.cut?.kind === "idle" && r.cut.limit === 1 && ms < 20000)
      || `the silent turn was not cut on the idle budget alone: ${JSON.stringify({ cut: r.cut, ms })}` },
  { scenario: "happy",            expect: EXIT.OK, noTimeout: true, args: ["--effort", "high"],
    why: "the 'high effort with a short clock' warning is about a clock that was SET; on the default it would fire on every run and warn about a budget nobody declared",
    assertStderr: (e) => !/measured failure shape/.test(e)
      || `the effort warning fired with no wall clock: ${e.slice(0, 200)}` },
  { scenario: "stalled-turn",     expect: EXIT.TIMEOUT, noTimeout: true, args: ["--timeout", "1"],
    why: "opting IN still buys the three rungs: an explicit budget cuts the turn at its own deadline and names itself in cut.kind",
    assert: (r) => (r.cut?.kind === "wall" && r.cut.limit === 1 && r.turnStatus === "timedOut")
      || `an explicit --timeout stopped cutting: ${JSON.stringify({ cut: r.cut, t: r.turnStatus })}` },

  // --- the volume cap: the bound neither silence nor tokens can express ---
  { scenario: "many-commands",    expect: EXIT.TIMEOUT, noTimeout: true, args: ["--max-commands", "2"],
    why: "a turn that loops is neither silent nor expensive — each iteration rearms the idle guard and costs one call — so with no wall clock only a count ends it. This is the maxTurns a native subagent has",
    assert: (r) => {
      if (r.cut?.kind !== "commands") return `the loop was not cut on the command budget: ${JSON.stringify(r.cut)}`;
      if (r.cut.limit !== 2 || r.cut.observed !== 2) return `the commands cut misreported its own budget: ${JSON.stringify(r.cut)}`;
      if (r.turnStatus !== "maxCommands") return `the cut turn's status was ${JSON.stringify(r.turnStatus)}`;
      // The third command never ran: the cut goes out as the second completes.
      if (r.commandsSucceeded !== 2) return `the cap let ${r.commandsSucceeded} commands through, not 2`;
      return /split the task or raise --max-commands/.test(String(r.hint))
        || `exit 3 on a command cut did not name the budget that ran out: ${JSON.stringify(r.hint)}`;
    } },
  { scenario: "many-commands",    expect: EXIT.OK, noTimeout: true, args: ["--max-commands", "0"],
    why: "0 disables it, like --idle-timeout's 0: the same six-command turn then runs to its own end",
    assert: (r) => (r.cut === null && r.commandsSucceeded === 6)
      || `--max-commands 0 did not disable the cap: ${JSON.stringify({ cut: r.cut, cmds: r.commandsSucceeded })}` },
  { scenario: "many-commands",    expect: EXIT.OK, noTimeout: true,
    why: "the 1000 default is a safety net, not a bound a six-command seat can feel",
    assert: (r) => (r.cut === null && r.commandsSucceeded === 6)
      || `the default command cap bit an ordinary turn: ${JSON.stringify({ cut: r.cut, cmds: r.commandsSucceeded })}` },
  { scenario: "many-commands",    expect: EXIT.TIMEOUT, noTimeout: true,
    seat: "SEAT: read <CWD>\n", args: ["--max-commands", "2"],
    why: "the cap still reaches a SEAT-FILE run — the flag is appended after the file's own argv, which is the route a coordinator bounding a seat it did not author has to take",
    assert: (r) => ((r.seatFileFields ?? []).join(",") === "SEAT" && r.cut?.kind === "commands" && r.cut.limit === 2)
      || `the flag did not bound a seat-file run: ${JSON.stringify({ fields: r.seatFileFields, cut: r.cut })}` },

  // --- the read level's cwd: a grant only where it grants something ---
  { scenario: "happy",            expect: EXIT.OK, seat: "SEAT: read\nEXPECT: echo\n",
    why: "`SEAT: read` with no directory is the header a coordinator writes when the task is about the tree it is already standing in; refusing it made the ONE line a relay always has to fill in the one it could not omit",
    assert: (r) => (r.cwd === (fs.realpathSync(process.cwd())) && (r.seatFileFields ?? []).join(",") === "SEAT,EXPECT")
      || `a bare SEAT: read did not default to the current directory: ${JSON.stringify({ cwd: r.cwd, fields: r.seatFileFields })}` },
  { scenario: "happy",            expect: EXIT.USAGE, seat: "SEAT: write\n",
    why: "and NOT at write level: there the cwd is the writable root itself, and a defaulted grant is one nobody made — the driver would hand the turn whatever directory the relay happened to be standing in",
    assertStderr: (e) => /SEAT write needs a directory/.test(e)
      || `a bare SEAT: write defaulted its writable root: ${e.slice(0, 200)}` },
  { scenario: "happy",            expect: EXIT.USAGE, noCwd: true, args: ["--level", "write"],
    why: "the same rule on the command line, where --cwd used to be required at both levels",
    assertStderr: (e) => /--cwd is required at --level write/.test(e)
      || `--level write ran without a writable root: ${e.slice(0, 200)}` },

  // --- one file, both halves: the header is the leading FIELD: lines and the rest is the prompt ---
  { scenario: "echo-input", expect: EXIT.OK, noPrompt: true,
    seat: "SEAT: read <CWD>\nEXPECT: echo\nTASK: count the files\nand say how many\n",
    why: "the relay writes ONE file and never decides where the prompt begins: everything from the first line that is not a header field is the body, verbatim and label included, which is what a sonnet relay got wrong in both WP8-D live runs when it had to split the two itself",
    assert: (r) => {
      const answer = String(r.answer);
      if (!/TASK: count the files\\nand say how many/.test(answer)) return `the body did not reach the turn verbatim: ${answer.slice(0, 200)}`;
      return (r.seatFileFields ?? []).join(",") === "SEAT,EXPECT"
        || `a body line was read as a header field: ${JSON.stringify(r.seatFileFields)}` } },
  { scenario: "echo-input", expect: EXIT.OK, noPrompt: true,
    seat: "SEAT: read <CWD>\nEXPECT: echo\nTASK: do it\nNETWORK: yes\nMODEL: gpt-5\n",
    why: "below the body's first line nothing is a header however field-like it looks — otherwise a task that quotes a header, or a relayed value carrying a newline, silently re-declares the seat's rights",
    assert: (r) => (r.network === false && r.model !== "gpt-5" && (r.seatFileFields ?? []).join(",") === "SEAT,EXPECT")
      || `a line below TASK: was read as a field: ${JSON.stringify({ net: r.network, model: r.model, fields: r.seatFileFields })}` },
  { scenario: "happy", expect: EXIT.USAGE, noPrompt: true,
    seat: "SEAT: read <CWD>\nEXPECT: echo\nNOTE: not a field\nTASK: do it\n",
    why: "variant 2 of the owner's decision: an ALL-CAPS name that is not a field and not a body label, above the body, is a typo or a flag — and running the seat with that line silently swallowed into the prompt is the failure this refusal replaces",
    assertStderr: (e) => (/unknown seat field NOTE at line 3 of/.test(e) && /the body starts at the first TASK: line/.test(e))
      || `the unknown field did not name its line and the way out: ${e.slice(0, 240)}` },
  { scenario: "resume-active", expect: EXIT.BUSY, relay: true, json: "omit", noPrompt: true,
    seat: "SEAT: read <CWD>\nRESUME: thr_root\nTASK: continue the thread\n",
    why: "exit 10 arrives BOTH ways: as the running handle, which carries a collect: line, and as a refusal with no thread at all — a resumed thread whose turn is still open, or a held write lock. A relay whose loop is keyed on the code alone would poll a final answer forever, so the two must be distinguishable by the envelope itself",
    assertText: (out) => {
      if (out.split("\n", 1)[0] !== "exitCode: 10") return `the refusal did not open at exit 10: ${JSON.stringify(out.slice(0, 120))}`;
      if (/^collect: /m.test(out)) return "a refusal with no thread offered a collect: command to repeat";
      if (!/^--- stderr \(last 20 lines\) ---$/m.test(out)) return `no stderr block: ${JSON.stringify(out.slice(0, 200))}`;
      if (!/still has a turn running/.test(out)) return `the stderr block does not carry the refusal: ${JSON.stringify(out.slice(0, 200))}`;
      return /--- answer \(0 bytes\) ---\n?$/.test(out) || `the envelope does not end at a 0-byte answer: ${JSON.stringify(out.slice(-80))}`;
    } },
  { scenario: "happy", expect: EXIT.USAGE,
    seat: "SEAT: read <CWD>\nEXPECT: echo\nTASK: the file's own body\n",
    why: "the file's body and --prompt are two prompts, and no rule says which one ran; the harness passes --prompt to every case that does not opt out, so this is also what proves the body route is the one being measured above",
    assertStderr: (e) => /carries a body below its header and --prompt was given too/.test(e)
      || `two prompts were accepted: ${e.slice(0, 200)}` }
];

// Read out of the fixture's own inventory rather than trusted: a scenario name this suite misspells
// would reach the fixture's default branch, and a case that measures nothing looks exactly like a case
// that passes.
{
  const unknown = [...new Set(CASES.map((c) => c.scenario))].filter((s) => !Object.hasOwn(SCENARIOS, s));
  if (unknown.length) {
    console.log(`FAIL  scenario(s) not in the fixture's inventory: ${unknown.join(", ")}`);
    process.exit(1);
  }
}

let seatSeq = 0;
function run(c) {
  return new Promise((resolve) => {
    // A seat-file case writes its declaration to disk and passes only --seat-file, exactly as the
    // codex-seat relay does — the point being that no value ever passes through a shell. `relay: true`
    // is the same file through --relay, which is the whole of the relay's command line.
    let seatArgs = [];
    if (c.seat) {
      const f = path.join(shimDir, `seat-${seatSeq++}.txt`);
      fs.writeFileSync(f, c.seat.replaceAll("<CWD>", shimDir).replaceAll("<CWDSP>", spacedDir));
      seatArgs = [c.relay ? "--relay" : "--seat-file", f];
    }
    const { child: p, done } = spawnNode(
      // Every case gets a wall clock so a hung fixture cannot stall the suite; `noTimeout` opts out, and
      // that is the only way to measure the DEFAULT — which is now no wall clock at all.
      [DRIVER, ...(c.seat ? seatArgs : c.noCwd ? [] : ["--level", "read", "--cwd", shimDir]),
       ...(c.noTimeout ? [] : ["--timeout", "20"]),
       ...(c.json === false ? ["--footer"] : c.json === "omit" ? [] : ["--json"]),
       ...(c.noPrompt ? [] : ["--prompt", "irrelevant, the server is scripted"]), ...(c.args ?? [])],
      // A state directory of this suite's own: every case used to write locks, an isolated Codex home and
      // the answer log into the caller's real ~/.codex-delegate, so a suite run concurrent with a real
      // delegation overwrote that delegation's inherited config with this fixture's values.
      { env: { PATH: `${shimDir}:${process.env.PATH}`, FAKE_SCENARIO: c.scenario,
               CODEX_DELEGATE_STATE_DIR: path.join(shimDir, "state-root"),
               ...(c.env ? Object.fromEntries(Object.entries(c.env).map(([k, v]) => [k, v ?? shimDir])) : {}) },
        unsetEnv: c.unsetEnv ?? [], killAfterMs: 30000 });
    // A consumer that stops reading, and one that merely pauses: the report write is the only place the
    // driver touches a pipe it does not own, and both shapes used to end the run wrongly.
    if (c.closeStdout) { try { p.stdout.destroy(); } catch {} }
    if (c.pauseStdout) { p.stdout.pause(); setTimeout(() => p.stdout.resume(), c.pauseStdout); }
    done.then(resolve);
  });
}

// --- detached seats: a handshake, a wait and a collection, each step's state the next step's input ---
//
// One run of the driver cannot express any of this, so these are procedural rather than table cases.
// Each gets a state directory of its own: every fixture run reports the SAME thread id, so a shared
// registry would let one flow read another's record.
const { cases: FLOWS, test: flow } = registry();
let flowSeq = 0;
const flowState = () => {
  const d = path.join(shimDir, `flow-state-${flowSeq++}`);
  fs.mkdirSync(d, { recursive: true });
  return d;
};
const readJson = (p) => { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } };
const recordOf = (state, id = "thr_root") => readJson(path.join(state, "jobs", `${id}.json`));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// A pid that is certainly gone: a process this suite started and reaped.
const deadPid = () => {
  const r = spawnSync(process.execPath, ["-e", ""]);
  return r.pid ?? 999999;
};

// A repository of this suite's OWN making. The dirty leg used to run on the checkout the suite lives in,
// so it measured the developer's working tree rather than the gate: on a clean checkout the gate skipped,
// no review was printed, and the case passed only while someone happened to have uncommitted work.
const gitRepo = (name, dirty) => {
  const dir = path.join(shimDir, name);
  fs.mkdirSync(dir, { recursive: true });
  const git = (...args) => spawnSync("git", ["-c", "init.defaultBranch=main", "-c", "user.name=codex-delegate tests",
    "-c", "user.email=tests@example.invalid", "-c", "commit.gpgsign=false", "-c", "core.hooksPath=/dev/null",
    "-C", dir, ...args], { encoding: "utf8" });
  const init = spawnSync("git", ["-c", "init.defaultBranch=main", "init", "-q", dir], { encoding: "utf8" });
  if (init.status !== 0) return { dir, error: `could not create ${name}: ${init.stderr}` };
  fs.writeFileSync(path.join(dir, "tracked.txt"), "one\n");
  const added = git("add", "tracked.txt");
  const committed = git("commit", "-q", "--no-verify", "-m", "one");
  if (added.status !== 0 || committed.status !== 0)
    return { dir, error: `could not commit in ${name}: ${added.stderr}${committed.stderr}` };
  if (dirty) fs.writeFileSync(path.join(dir, "untracked.txt"), "two\n");
  return { dir, error: null };
};

flow("the opt-in stop gate reviews a dirty tree and skips a clean tree",
  "the shipped hook helper must remain inert by default, print the native review verdict when enabled, and avoid launching a seat for a clean repository",
  async () => {
    const repo = gitRepo("dirty-stop-gate", true);
    if (repo.error) return repo.error;
    const cwd = repo.dir;
    const inert = spawnSync(process.execPath, [STOP_GATE], {
      input: JSON.stringify({ cwd }), encoding: "utf8",
      env: { ...process.env, CODEX_DELEGATE_STOP_GATE: "0" }
    });
    if (inert.status !== 0 || inert.stdout !== "")
      return `disabled gate was not inert: status=${inert.status} stdout=${JSON.stringify(inert.stdout)} stderr=${JSON.stringify(inert.stderr)}`;

    const reviewed = spawnSync(process.execPath, [STOP_GATE], {
      input: JSON.stringify({ cwd }), encoding: "utf8", timeout: 20000,
      env: { ...process.env, PATH: `${shimDir}:${process.env.PATH}`,
        CODEX_DELEGATE_STOP_GATE: "1", CODEX_DELEGATE_STATE_DIR: flowState(),
        FAKE_SCENARIO: "review-inline" }
    });
    if (reviewed.status !== 0 || !reviewed.stdout.includes("off-by-one"))
      return `enabled gate did not print the review: status=${reviewed.status} stdout=${JSON.stringify(reviewed.stdout)} stderr=${JSON.stringify(reviewed.stderr)}`;

    const clean = gitRepo("clean-stop-gate", false);
    if (clean.error) return clean.error;
    const skipped = spawnSync(process.execPath, [STOP_GATE], {
      input: JSON.stringify({ cwd: clean.dir }), encoding: "utf8",
      env: { ...process.env, PATH: `${shimDir}:${process.env.PATH}`,
        CODEX_DELEGATE_STOP_GATE: "1", CODEX_DELEGATE_STATE_DIR: flowState(),
        FAKE_SCENARIO: "schema-never" }
    });
    return skipped.status === 0 && skipped.stdout === ""
      ? true
      : `clean gate did not skip: status=${skipped.status} stdout=${JSON.stringify(skipped.stdout)} stderr=${JSON.stringify(skipped.stderr)}`;
  });

flow("the stop gate prints the review a non-zero driver exit still carries",
  "a post-turn exit code — a failed command, a missed expectation, a cut turn — arrives WITH the answer beside it; printing only stderr there discarded the very review the hook exists to show",
  async () => {
    const repo = gitRepo("failing-stop-gate", true);
    if (repo.error) return repo.error;
    const run = spawnSync(process.execPath, [STOP_GATE], {
      input: JSON.stringify({ cwd: repo.dir }), encoding: "utf8", timeout: 20000,
      env: { ...process.env, PATH: `${shimDir}:${process.env.PATH}`,
        CODEX_DELEGATE_STOP_GATE: "1", CODEX_DELEGATE_STATE_DIR: flowState(),
        FAKE_SCENARIO: "review-broken" }
    });
    return (run.status === 1 && run.stdout.includes("I could not inspect that ref.")
        && /review exit 11/.test(run.stderr))
      ? true
      : `the answer behind a non-zero exit was lost: status=${run.status} stdout=${JSON.stringify(run.stdout)} stderr=${JSON.stringify(run.stderr.slice(-300))}`;
  });

// Poll until the predicate holds, so a flow never sleeps for a fixed guess.
async function until(fn, ms = 15000) {
  for (const end = Date.now() + ms; Date.now() < end; ) {
    const v = fn();
    if (v) return v;
    await wait(25);
  }
  return null;
}

flow("--detach hands back a handle while the run is still going, and the run outlives the front",
  "the whole point of the transport: the front returns exit 10 with an address, and the seat it started keeps working in a process the front does not own",
  async () => {
    const state = flowState();
    const { code, out, err } = await run({ scenario: "slow-turn", args: ["--detach", "--timeout", "30"],
      env: { CODEX_DELEGATE_STATE_DIR: state } });
    if (code !== EXIT.BUSY) return `expected exit 10, got ${code}: ${err.slice(0, 200)}`;
    const h = (() => { try { return JSON.parse(out); } catch { return null; } })();
    if (!h) return `the handle is not JSON: ${out.slice(0, 160)}`;
    if (h.detached !== true || h.exitCode !== EXIT.BUSY || h.turnStatus !== "running" || h.threadId !== "thr_root")
      return `the handle is not the running shape: ${JSON.stringify(h)}`;
    for (const k of ["pid", "runId", "jobPath", "reportPath", "stderrPath", "startedAt"])
      if (h[k] === null || h[k] === undefined) return `the handle has no ${k}: ${JSON.stringify(h)}`;
    // The handshake file the front waited on, and the run's own process — neither is the front's.
    const launch = readJson(path.join(h.runDir, "launch.json"));
    if (launch?.threadId !== "thr_root" || launch.pid !== h.pid)
      return `launch.json does not name the run: ${JSON.stringify(launch)}`;
    // The front is gone (run() resolved on its close) and the seat is not.
    let alive = false;
    try { process.kill(h.pid, 0); alive = true; } catch {}
    const rec = recordOf(state);
    if (!alive && !rec?.endedAt) return "the detached run is neither alive nor finished";
    if (!await until(() => recordOf(state)?.endedAt)) return "the detached run never finished";
    return true;
  });

flow("--wait delivers the detached run's report byte for byte, under the code the run itself decided",
  "a collector that reformatted or re-derived anything would be a second report format to keep in sync; the coordinator must get exactly what the blocking driver would have printed",
  async () => {
    const state = flowState();
    const first = await run({ scenario: "happy", args: ["--detach", "--timeout", "30"],
      env: { CODEX_DELEGATE_STATE_DIR: state } });
    if (first.code !== EXIT.BUSY) return `the detach exited ${first.code}: ${first.err.slice(0, 200)}`;
    const h = JSON.parse(first.out);
    if (!await until(() => recordOf(state)?.endedAt)) return "the detached run never finished";
    const onDisk = fs.readFileSync(h.reportPath, "utf8");
    const collected = await run({ scenario: "happy", args: ["--wait", "thr_root", "--wait-timeout", "20"],
      env: { CODEX_DELEGATE_STATE_DIR: state } });
    if (collected.out !== onDisk)
      return `--wait did not deliver the report verbatim (${collected.out.length} bytes vs ${onDisk.length})`;
    const rec = recordOf(state);
    if (collected.code !== rec.exitCode)
      return `--wait exited ${collected.code}, the run decided ${rec.exitCode}`;
    if (JSON.parse(onDisk).exitCode !== rec.exitCode)
      return `the record and the report disagree: ${rec.exitCode} vs ${JSON.parse(onDisk).exitCode}`;
    return true;
  });

flow("--wait that runs out of budget hands back the handle, not a verdict",
  "a collector that timed out into an exit code would turn 'I stopped waiting' into 'the seat failed', which is the confusion the whole running shape exists to prevent",
  async () => {
    const state = flowState();
    const first = await run({ scenario: "stalled-turn", args: ["--detach", "--timeout", "30"],
      env: { CODEX_DELEGATE_STATE_DIR: state } });
    if (first.code !== EXIT.BUSY) return `the detach exited ${first.code}: ${first.err.slice(0, 200)}`;
    const h = JSON.parse(first.out);
    const collected = await run({ scenario: "stalled-turn", args: ["--wait", "thr_root", "--wait-timeout", "1"],
      env: { CODEX_DELEGATE_STATE_DIR: state } });
    try { process.kill(h.pid, "SIGKILL"); } catch {}
    if (collected.code !== EXIT.BUSY) return `expected exit 10 at the budget, got ${collected.code}`;
    const back = (() => { try { return JSON.parse(collected.out); } catch { return null; } })();
    if (back?.turnStatus !== "running" || back.threadId !== "thr_root")
      return `the budget did not return the running shape: ${collected.out.slice(0, 160)}`;
    return true;
  });

flow("a run that died without writing a report is exit 4, not a wait that never ends",
  "no endedAt and no process is the one state a poller cannot resolve on its own: saying 'still running' about a SIGKILLed seat wedges the coordinator for the fourteen days the record is kept",
  async () => {
    const state = flowState();
    const jobs = path.join(state, "jobs");
    fs.mkdirSync(jobs, { recursive: true });
    fs.writeFileSync(path.join(jobs, "thr_dead.json"), JSON.stringify({
      threadId: "thr_dead", pid: deadPid(), cwd: shimDir, level: "read",
      started: new Date().toISOString(), timeout: 900 }));
    const { code, err } = await run({ scenario: "happy", args: ["--wait", "thr_dead", "--wait-timeout", "5"],
      env: { CODEX_DELEGATE_STATE_DIR: state } });
    if (code !== EXIT.TRANSPORT) return `expected exit 4, got ${code}: ${err.slice(0, 200)}`;
    return /died without a report \(pid \d+ gone\)/.test(err) || `the refusal did not say why: ${err.slice(0, 200)}`;
  });

flow("--jobs derives running, crashed and ended from pid liveness, and spawns nothing",
  "a stored status is a lie the moment the process holding it is killed; and a listing that started a codex to answer 'what is running' would cost a delegation per poll",
  async () => {
    const state = flowState();
    const jobs = path.join(state, "jobs");
    fs.mkdirSync(jobs, { recursive: true });
    const base = { cwd: shimDir, level: "read", started: new Date().toISOString(), timeout: 900 };
    fs.writeFileSync(path.join(jobs, "thr_run.json"), JSON.stringify({ ...base, pid: process.pid, runId: "r1",
      // The mid-flight snapshot a live run keeps rewriting: --jobs is what a coordinator polls when it
      // did not keep the handle, and "running" alone does not say whether the seat is working.
      lastEventAt: new Date().toISOString(), tokensSpent: 4200, commandsSeen: 7, phase: "commandExecution" }));
    fs.writeFileSync(path.join(jobs, "thr_dead.json"), JSON.stringify({ ...base, pid: deadPid() }));
    fs.writeFileSync(path.join(jobs, "thr_done.json"), JSON.stringify({ ...base, pid: deadPid(),
      endedAt: new Date().toISOString(), exitCode: 0, answerPath: "/tmp/a.md" }));
    // A record belonging to another directory, to prove --cwd narrows rather than decorates.
    fs.writeFileSync(path.join(jobs, "thr_other.json"), JSON.stringify({ ...base, cwd: os.tmpdir(), pid: process.pid }));
    // A codex on PATH that would leave a trace if it were ever started.
    const marker = path.join(state, "codex-ran");
    const probeShim = path.join(state, "shim");
    fs.mkdirSync(probeShim, { recursive: true });
    fs.writeFileSync(path.join(probeShim, "codex"), `#!/bin/sh\necho ran >> "${marker}"\nexec "${process.execPath}" "${FAKE}" "$@"\n`, { mode: 0o755 });
    const { code, out } = await run({ scenario: "happy", args: ["--jobs", "--cwd", shimDir],
      env: { CODEX_DELEGATE_STATE_DIR: state, PATH: `${probeShim}:${process.env.PATH}` } });
    if (code !== EXIT.OK) return `--jobs exited ${code}`;
    if (fs.existsSync(marker)) return "--jobs spawned a codex";
    const rows = (() => { try { return JSON.parse(out); } catch { return null; } })();
    if (!Array.isArray(rows)) return `--jobs did not print an array: ${out.slice(0, 160)}`;
    const by = Object.fromEntries(rows.map((r) => [r.threadId, r]));
    if (rows.length !== 3) return `--cwd did not narrow the listing: ${JSON.stringify(rows.map((r) => r.threadId))}`;
    if (by.thr_run?.status !== "running" || by.thr_dead?.status !== "crashed" || by.thr_done?.status !== "ended")
      return `derived statuses wrong: ${JSON.stringify(rows.map((r) => [r.threadId, r.status]))}`;
    for (const k of ["threadId", "cwd", "repo", "level", "pid", "status", "exitCode", "startedAt", "endedAt",
                     "answerPath", "reportPath", "runId", "lastEventAt", "tokensSpent", "commandsSeen", "phase"])
      if (!(k in by.thr_done)) return `--jobs dropped the ${k} field: ${JSON.stringify(by.thr_done)}`;
    // Carried through, not merely present: a listing that nulled them would answer every poll with
    // "a process exists", which is what the record already said.
    if (by.thr_run.tokensSpent !== 4200 || by.thr_run.commandsSeen !== 7 || by.thr_run.phase !== "commandExecution"
        || !Number.isFinite(Date.parse(by.thr_run.lastEventAt)))
      return `--jobs did not carry the mid-flight fields: ${JSON.stringify(by.thr_run)}`;
    return true;
  });

flow("with no wall clock, a prompt that never arrives on stdin is ended by the silence budget",
  "the wall clock used to be the only thing that could unblock the stdin read; with no clock, a pipe left open by a caller that has since died would hold the driver open forever, with no thread, no report and nobody to reclaim it",
  async () => {
    const state = flowState();
    const p = spawn(process.execPath, [DRIVER, "--level", "read", "--cwd", shimDir, "--json", "--idle-timeout", "2"],
      { env: { ...process.env, PATH: `${shimDir}:${process.env.PATH}`, FAKE_SCENARIO: "happy",
               CODEX_DELEGATE_STATE_DIR: state },
        // A pipe nobody ever writes to and nobody closes: the shape of a dead caller.
        stdio: ["pipe", "pipe", "pipe"] });
    let err = "";
    p.stderr.on("data", (d) => { err += d; });
    p.stdout.resume();
    const startedAt = Date.now();
    const code = await new Promise((r) => { p.on("close", r); setTimeout(() => { try { p.kill("SIGKILL"); } catch {} }, 20000); });
    const ms = Date.now() - startedAt;
    if (code !== EXIT.TIMEOUT) return `expected exit 3, got ${code} after ${ms}ms: ${err.slice(0, 200)}`;
    if (!/no prompt arrived on stdin within the 2s silence budget/.test(err))
      return `the abort did not name the budget that ended it: ${err.slice(0, 200)}`;
    return ms < 15000 || `the silence budget took ${ms}ms to fire`;
  });

flow("a detached run with no --timeout records no wall clock, and still ends on its own",
  "the detached route used to default to 7200 s because nobody was waiting on it; with no wall clock anywhere, one default covers every route and a coordinator has nothing to size",
  async () => {
    const state = flowState();
    const { code, out, err } = await run({ scenario: "slow-turn", args: ["--detach"], noTimeout: true,
      env: { CODEX_DELEGATE_STATE_DIR: state } });
    if (code !== EXIT.BUSY) return `expected exit 10, got ${code}: ${err.slice(0, 200)}`;
    const h = (() => { try { return JSON.parse(out); } catch { return null; } })();
    if (h?.turnStatus !== "running") return `the handle is not the running shape: ${out.slice(0, 160)}`;
    const rec = await until(() => { const r = recordOf(state); return r?.endedAt ? r : null; });
    if (!rec) return "the detached run never finished";
    if (rec.timeout !== 0) return `the detached run recorded a wall clock of ${rec.timeout}`;
    if (rec.exitCode !== EXIT.OK) return `the unbounded detached run exited ${rec.exitCode}`;
    return true;
  });

flow("--cancel still stops a seat with no wall clock, hours after it started",
  "the age guard used to fall back to 7200 s for a run that declared no budget, so a default seat became uncancellable after 2 h 01 — while the relay's own wait loop runs for ~4 h. The pid-recycling guard is the recorded identity, which holderAlive already checks; an invented cap only made 'stopped by you' false where it mattered",
  async () => {
    const state = flowState();
    const jobs = path.join(state, "jobs");
    fs.mkdirSync(jobs, { recursive: true });
    // A real process to signal, and the identity the driver would have recorded for it: a pid alone
    // could be a stranger, and this is the check that says it is not.
    const sleeper = spawn("/bin/sh", ["-c", "sleep 30"], { stdio: "ignore" });
    const identity = (() => {
      try {
        const stat = fs.readFileSync(`/proc/${sleeper.pid}/stat`, "utf8");
        const after = stat.slice(stat.lastIndexOf(")") + 2).split(" ");
        if (after[19]) return `starttime:${after[19]}`;
      } catch {}
      const r = spawnSync("ps", ["-o", "lstart=", "-p", String(sleeper.pid)],
        { encoding: "utf8", env: { ...process.env, LC_ALL: "C", TZ: "UTC" } });
      const t = r.status === 0 ? String(r.stdout ?? "").trim() : "";
      return t ? `lstart:${t}` : null;
    })();
    fs.writeFileSync(path.join(jobs, "thr_old.json"), JSON.stringify({
      cwd: shimDir, level: "read", pid: sleeper.pid, identity, timeout: 0,
      started: new Date(Date.now() - 3 * 3600 * 1000).toISOString() }));
    const { code, err } = await run({ scenario: "happy", args: ["--cancel", "thr_old"],
      env: { CODEX_DELEGATE_STATE_DIR: state } });
    const gone = await until(() => { try { process.kill(sleeper.pid, 0); return null; } catch { return true; } });
    try { sleeper.kill("SIGKILL"); } catch {}
    if (code !== EXIT.OK) return `--cancel refused a three-hour-old seat with no wall clock: exit ${code} (${err.slice(0, 200)})`;
    if (!gone) return "the signal never reached the recorded pid";
    // And a run that DID declare a budget still gets the age guard: the pid it names is the one the
    // record can no longer vouch for.
    fs.writeFileSync(path.join(jobs, "thr_bounded.json"), JSON.stringify({
      cwd: shimDir, level: "read", pid: process.pid, timeout: 60,
      started: new Date(Date.now() - 3 * 3600 * 1000).toISOString() }));
    const bounded = await run({ scenario: "happy", args: ["--cancel", "thr_bounded"],
      env: { CODEX_DELEGATE_STATE_DIR: state } });
    return (bounded.code === EXIT.USAGE && /longer ago than its own budget/.test(bounded.err))
      || `a declared budget lost its age guard: exit ${bounded.code} (${bounded.err.slice(0, 200)})`;
  });

flow("--cancel signals the run, and the interrupted report lands at the run's own report path",
  "cancelling is only useful if the work so far survives it: the seat's own signal handler writes the full report, so the coordinator gets evidence rather than an empty file",
  async () => {
    const state = flowState();
    const first = await run({ scenario: "stalled-turn", args: ["--detach", "--timeout", "60"],
      env: { CODEX_DELEGATE_STATE_DIR: state } });
    if (first.code !== EXIT.BUSY) return `the detach exited ${first.code}: ${first.err.slice(0, 200)}`;
    const h = JSON.parse(first.out);
    const cancelled = await run({ scenario: "stalled-turn", args: ["--cancel", "thr_root"],
      env: { CODEX_DELEGATE_STATE_DIR: state } });
    if (cancelled.code !== EXIT.OK) return `--cancel exited ${cancelled.code}: ${cancelled.err.slice(0, 200)}`;
    if (!await until(() => recordOf(state)?.endedAt)) return "the cancelled run never wrote its record";
    const report = readJson(h.reportPath);
    if (report?.turnStatus !== "interrupted")
      return `the cancelled run did not write an interrupted report: ${JSON.stringify(report?.turnStatus)}`;
    if (report.exitCode !== EXIT.TURN_NOT_COMPLETED)
      return `the interrupted report exited ${report.exitCode}, expected 1`;
    // And a second --cancel is a refusal with a reason, not a signal into the void.
    const again = await run({ scenario: "stalled-turn", args: ["--cancel", "thr_root"],
      env: { CODEX_DELEGATE_STATE_DIR: state } });
    if (again.code !== EXIT.USAGE || !/already ended/.test(again.err))
      return `cancelling a finished run was not refused: exit ${again.code} ${again.err.slice(0, 160)}`;
    return true;
  });

flow("resuming a thread whose own driver is still alive is exit 10, decided locally",
  "the server would refuse it too, but only after a worktree was cut, a lock taken and a session started — and 'still running' is knowable from the registry before any of that",
  async () => {
    const state = flowState();
    const jobs = path.join(state, "jobs");
    fs.mkdirSync(jobs, { recursive: true });
    fs.writeFileSync(path.join(jobs, "thr_root.json"), JSON.stringify({
      threadId: "thr_root", pid: process.pid, cwd: shimDir, level: "read",
      started: new Date().toISOString(), timeout: 900, detached: true, runId: "r9" }));
    const marker = path.join(state, "codex-ran");
    const probeShim = path.join(state, "shim");
    fs.mkdirSync(probeShim, { recursive: true });
    fs.writeFileSync(path.join(probeShim, "codex"), `#!/bin/sh\necho ran >> "${marker}"\nexec "${process.execPath}" "${FAKE}" "$@"\n`, { mode: 0o755 });
    for (const args of [["--resume", "thr_root"], ["--resume", "last"]]) {
      const { code, err } = await run({ scenario: "happy", args,
        env: { CODEX_DELEGATE_STATE_DIR: state, PATH: `${probeShim}:${process.env.PATH}` } });
      if (code !== EXIT.BUSY) return `${args.join(" ")} exited ${code}, expected 10: ${err.slice(0, 200)}`;
      if (!/is still running \(pid \d+\)/.test(err)) return `the refusal did not name the live run: ${err.slice(0, 200)}`;
      if (fs.existsSync(marker)) return `${args.join(" ")} spawned a codex before refusing`;
    }
    return true;
  });

flow("the job record carries the mid-flight fields a poller reads",
  "a detached seat cannot push progress anywhere (a subagent has no channel to its coordinator), so the record IS the progress: without lastEventAt, tokensSpent, commandsSeen and phase, --jobs can only say 'a process exists'",
  async () => {
    const state = flowState();
    const { code } = await run({ scenario: "happy", args: ["--detach", "--timeout", "30"],
      env: { CODEX_DELEGATE_STATE_DIR: state } });
    if (code !== EXIT.BUSY) return `the detach exited ${code}`;
    const rec = await until(() => { const r = recordOf(state); return r?.endedAt ? r : null; });
    if (!rec) return "the detached run never finished";
    for (const k of ["lastEventAt", "commandsSeen", "phase", "runId", "runDir", "reportPath", "stderrPath", "promptPath", "detached", "identity", "timeout"])
      if (rec[k] === undefined) return `the record has no ${k}: ${JSON.stringify(Object.keys(rec))}`;
    if (!Number.isFinite(Date.parse(rec.lastEventAt))) return `lastEventAt is not a timestamp: ${rec.lastEventAt}`;
    if (rec.commandsSeen !== 1 || rec.phase !== "agentMessage")
      return `the mid-flight snapshot did not follow the turn: ${JSON.stringify({ c: rec.commandsSeen, p: rec.phase })}`;
    return true;
  });

flow("endedAt is written only once the report has actually landed",
  "endedAt is the flag every collector reads to decide the report is there: written before the bytes, a --wait racing a large report delivers a truncated one, and a report that never reached its caller is recorded as the success it was not",
  async () => {
    const state = flowState();
    // stdout is closed before the report is written, so the write FAILS: the record must carry the
    // transport failure, which is only possible if it is written after the write rather than before.
    const { code } = await run({ scenario: "long-answer", closeStdout: true,
      env: { CODEX_DELEGATE_STATE_DIR: state } });
    if (code !== EXIT.TRANSPORT) return `a report that could not be written exited ${code}, expected 4`;
    const rec = await until(() => { const r = recordOf(state); return r?.endedAt ? r : null; });
    if (!rec) return "no record was closed at all";
    if (rec.exitCode !== EXIT.TRANSPORT)
      return `the record says exit ${rec.exitCode} for a report that never reached its caller`;
    return true;
  });

flow("run directories are pruned on both bounds, and a run still writing into one is never pruned",
  "the run directory holds a whole report and a whole stderr per detached seat, so unbounded it is the answer log's growth problem with bigger files — but it is also the LIVE transport of a run in progress: removing it leaves the seat writing into an unlinked inode and the collector reading 'the run ended but left no report'",
  async () => {
    const state = flowState();
    const runs = path.join(state, "runs");
    fs.mkdirSync(runs, { recursive: true });
    const at = (p, secondsAgo) => { const t = (Date.now() - secondsAgo * 1000) / 1000; fs.utimesSync(p, t, t); };
    // Four hundred directories with staggered times, so the count bound has an unambiguous oldest.
    const bulk = [];
    for (let i = 0; i < 400; i++) {
      const d = path.join(runs, `bulk-${String(i).padStart(3, "0")}`);
      fs.mkdirSync(d);
      fs.writeFileSync(path.join(d, "report.json"), "{}");
      at(d, i + 1);
      bulk.push(d);
    }
    // Older than both bounds and owned by nobody: the age bound must take it.
    const old = path.join(runs, "aaaaaaaa-old");
    fs.mkdirSync(old);
    fs.writeFileSync(path.join(old, "report.json"), "{}");
    at(old, 20 * 86400);
    // Older still, and its launch.json names a process that is alive — this suite's own.
    const live = path.join(runs, "aaaaaaaa-live");
    fs.mkdirSync(live);
    fs.writeFileSync(path.join(live, "launch.json"), JSON.stringify({ threadId: "thr_live", pid: process.pid }));
    at(live, 21 * 86400);
    const { code } = await run({ scenario: "happy", args: ["--detach", "--timeout", "30"],
      env: { CODEX_DELEGATE_STATE_DIR: state } });
    if (code !== EXIT.BUSY) return `the detach exited ${code}`;
    if (!fs.existsSync(live)) return "the prune deleted a run directory whose launch.json names a live process";
    if (fs.existsSync(old)) return "a twenty-day-old run directory survived the age bound";
    if (fs.existsSync(bulk[399])) return "the four-hundredth-oldest run directory survived the count bound";
    if (!fs.existsSync(bulk[0])) return "the prune reached past its own bounds";
    const left = fs.readdirSync(runs);
    if (left.length !== 401) return `expected the fresh run, 399 of the bulk and the live one to remain, found ${left.length}`;
    return true;
  });

flow("a detached run's own child does not detach again",
  "the child re-parses the front's command line, so the front has to strip --detach AND --run-dir has to win: without that precedence every seat forks driver after driver. DETACH is command-line-only now, so the seat file cannot reintroduce it either",
  async () => {
    const state = flowState();
    const { code, out, err } = await run({ scenario: "happy",
      seat: "SEAT: read <CWD>\n", args: ["--detach", "--timeout", "30", "--wait-timeout", "0"],
      env: { CODEX_DELEGATE_STATE_DIR: state } });
    if (code !== EXIT.BUSY) return `the detach exited ${code}: ${err.slice(0, 200)}`;
    const h = (() => { try { return JSON.parse(out); } catch { return null; } })();
    if (h?.threadId !== "thr_root") return `no handle came back: ${out.slice(0, 160)}`;
    if (!await until(() => recordOf(state)?.endedAt)) return "the detached run never finished";
    const runs = fs.readdirSync(path.join(state, "runs"));
    if (runs.length !== 1) return `one seat forked ${runs.length} runs: ${JSON.stringify(runs)}`;
    return true;
  });

flow("the detach contradictions are refused, and a run directory that cannot be made is exit 2",
  "one flag starts a run and the other two collect or discard it, so a driver that silently picked would run something the caller did not ask for; and the run directory IS the transport, so a state directory nobody can write has nowhere to put the report",
  async () => {
    const both = await run({ scenario: "happy", args: ["--detach", "--wait", "thr_root"] });
    if (both.code !== EXIT.USAGE || !/contradictory/.test(both.err))
      return `--detach with --wait was not refused: exit ${both.code} ${both.err.slice(0, 160)}`;
    // An ephemeral run writes no job record, so the handle would name a jobPath that never appears and
    // --wait, --jobs and --cancel would all have nothing to act on.
    const eph = await run({ scenario: "happy", args: ["--detach", "--ephemeral"] });
    if (eph.code !== EXIT.USAGE || !/--detach and --ephemeral are contradictory/.test(eph.err))
      return `--detach with --ephemeral was not refused: exit ${eph.code} ${eph.err.slice(0, 160)}`;
    const state = path.join(shimDir, `flow-ro-${flowSeq++}`);
    fs.mkdirSync(state, { recursive: true });
    fs.mkdirSync(path.join(state, "runs"));
    fs.chmodSync(path.join(state, "runs"), 0o500);
    try {
      const { code, err } = await run({ scenario: "happy", args: ["--detach"],
        env: { CODEX_DELEGATE_STATE_DIR: state } });
      if (code !== EXIT.USAGE || !/cannot create its run directory/.test(err))
        return `an unwritable state directory was not refused: exit ${code} ${err.slice(0, 200)}`;
    } finally { fs.chmodSync(path.join(state, "runs"), 0o700); }
    return true;
  });

// --- the relay: one command in, one envelope out, and no decision left to the agent that ran it ---
//
// Everything below used to be prose in agents/codex-seat.md — which wait to run, when to repeat it, which
// keys to copy, how to render a failure. A weaker model followed some of it. These are the cases that
// replace it, so a rule that regresses fails here rather than in a live seat.

// The shape a coordinator parses: fields above the first `--- answer (N bytes) ---`, answer below it,
// and nothing else anywhere.
function parseEnvelope(out) {
  const m = /^--- answer \((\d+) bytes\) ---\n?/m.exec(out);
  if (!m) return { error: `no \`--- answer (N bytes) ---\` marker in ${JSON.stringify(out.slice(0, 200))}` };
  const head = out.slice(0, m.index);
  const answer = out.slice(m.index + m[0].length);
  return { head, answer, bytes: Number(m[1]), first: out.split("\n", 1)[0],
           fields: Object.fromEntries([...head.matchAll(/^([A-Za-z]+): (.*)$/gm)].map((x) => [x[1], x[2]])) };
}

flow("--relay prints the envelope and exits with the code the run itself decided",
  "the relay's whole job becomes `run this, copy stdout, return the exit code`. Three codes because these are the three shapes it must never conflate: a success, a gate that said no with an answer beside it, and a sandbox that was too small",
  async () => {
    for (const [scenario, expect, seat] of [
      ["happy", EXIT.OK, "SEAT: read <CWD>\nEXPECT: echo\nTASK: do the work\n"],
      ["wrong-command", EXIT.NO_COMMANDS, "SEAT: read <CWD>\nEXPECT: vitest\nTASK: run the tests\n"],
      ["escalated", EXIT.ESCALATED, "SEAT: read <CWD>\nTASK: do the work\n"]]) {
      const { code, out, err } = await run({ scenario, seat, relay: true, json: "omit", noPrompt: true,
        env: { CODEX_DELEGATE_STATE_DIR: flowState() } });
      if (code !== expect) return `--relay on ${scenario} exited ${code}, the run decides ${expect}: ${err.trim().slice(-200)}`;
      const e = parseEnvelope(out);
      if (e.error) return `${scenario}: ${e.error}`;
      if (e.first !== `exitCode: ${expect}`) return `${scenario}: the first line is ${JSON.stringify(e.first)}, not \`exitCode: ${expect}\``;
      if (e.fields.threadId !== "thr_root") return `${scenario}: the envelope names no thread: ${JSON.stringify(e.fields)}`;
      if (e.fields.turnStatus !== "completed") return `${scenario}: turnStatus is ${JSON.stringify(e.fields.turnStatus)}`;
      if (Buffer.byteLength(e.answer) !== e.bytes) return `${scenario}: the marker says ${e.bytes} bytes and ${Buffer.byteLength(e.answer)} follow it`;
      // The JSON report is not thrown away: the envelope names where it is, and it parses.
      if (!readJson(e.fields.reportPath)) return `${scenario}: reportPath does not name a readable report: ${e.fields.reportPath}`;
    }
    return true;
  });

flow("a seat that outlives the relay's wait comes back as exit 10 with a LITERAL collect command",
  "the relay repeats one command it was handed; a command needing substitution is a decision, and the wait loop is exactly where a weaker model improvised (measured: a hand-built --wait with the wrong id). So the envelope carries the absolute driver, the thread and the cwd, already quoted",
  async () => {
    const state = flowState();
    const started = await run({ scenario: "stalled-turn", relay: true, json: "omit", noPrompt: true,
      noTimeout: true, seat: "SEAT: read <CWD>\nTASK: stall for a while\n", args: ["--timeout", "6"],
      env: { CODEX_DELEGATE_STATE_DIR: state, CODEX_DELEGATE_RELAY_WAIT_S: "1" } });
    if (started.code !== EXIT.BUSY) return `the relay did not hand back a running envelope: exit ${started.code} ${started.err.trim().slice(-200)}`;
    const e = parseEnvelope(started.out);
    if (e.error) return e.error;
    if (e.first !== "exitCode: 10") return `the first line is ${JSON.stringify(e.first)}`;
    if (e.fields.turnStatus !== "running") return `the running envelope says turnStatus ${JSON.stringify(e.fields.turnStatus)}`;
    if (e.bytes !== 0 || e.answer !== "") return `the running envelope carried an answer: ${JSON.stringify(e.answer.slice(0, 80))}`;
    const collect = /^collect: (.+)$/m.exec(started.out)?.[1];
    if (!collect) return "the running envelope carries no collect: line";
    if (!collect.includes(`"${DRIVER}"`)) return `the collect command does not name this driver absolutely and quoted: ${collect}`;
    if (!collect.includes("--relay-collect thr_root")) return `the collect command does not name the thread: ${collect}`;
    // Run it VERBATIM, the way the relay does: it must need no substitution of any kind.
    const collected = spawnSync("sh", ["-c", collect], { encoding: "utf8", timeout: 60000,
      env: { ...process.env, PATH: `${shimDir}:${process.env.PATH}`, FAKE_SCENARIO: "stalled-turn",
             CODEX_DELEGATE_STATE_DIR: state, CODEX_DELEGATE_RELAY_WAIT_S: "30" } });
    if (collected.status !== EXIT.TIMEOUT)
      return `the collect command exited ${collected.status}, the cut run decided ${EXIT.TIMEOUT}: ${String(collected.stderr).trim().slice(-200)}`;
    const f = parseEnvelope(String(collected.stdout));
    if (f.error) return `the collected output is not an envelope: ${f.error}`;
    if (f.first !== `exitCode: ${EXIT.TIMEOUT}`) return `the collected envelope opens ${JSON.stringify(f.first)}`;
    if (f.fields.turnStatus !== "timedOut") return `the collected envelope says turnStatus ${JSON.stringify(f.fields.turnStatus)}`;
    return /^cut: kind=wall limit=6 observed=\d+$/m.test(f.head)
      || `the collected envelope does not name the budget that ended the turn: ${f.head}`;
  });

flow("a relayed seat that never got a thread is an envelope too, with the stderr tail in its own block",
  "the relay has no rule for an empty stdout: every exit the driver can take in this mode starts with `exitCode:`, and the failure evidence goes in a `--- stderr` block ABOVE the answer marker — measured, a relay that put a stderr quote below it had the coordinator read it as Codex's answer",
  async () => {
    const { code, out } = await run({ scenario: "happy", relay: true, json: "omit", noPrompt: true,
      seat: "SEAT: read /nonexistent/relay/dir\nTASK: do it\n",
      env: { CODEX_DELEGATE_STATE_DIR: flowState() } });
    if (code !== EXIT.USAGE) return `a seat that could not start exited ${code}`;
    const e = parseEnvelope(out);
    if (e.error) return e.error;
    if (e.first !== "exitCode: 2") return `the first line is ${JSON.stringify(e.first)}`;
    if (!/^--- stderr \(last 20 lines\) ---$/m.test(e.head)) return `no stderr block: ${JSON.stringify(e.head)}`;
    if (!/--cwd does not exist/.test(e.head)) return `the stderr block does not carry the refusal: ${JSON.stringify(e.head)}`;
    if (e.bytes !== 0 || e.answer !== "") return `a seat that never ran returned an answer: ${JSON.stringify(e.answer)}`;
    return fs.existsSync("/nonexistent/relay/dir") ? "the relayed seat created the directory it was refused" : true;
  });

flow("the envelope carries the FULL answer where --brief clipped the report's",
  "--brief caps what the REPORT holds inline and writes the whole text to answerPath; an envelope that relayed the capped field would hand the coordinator a clip marker instead of the answer, and the file it forwards to is the seat's own",
  async () => {
    const { code, out } = await run({ scenario: "long-answer", relay: true, json: "omit", noPrompt: true,
      seat: "SEAT: read <CWD>\nBRIEF: yes\nTASK: write at length\n",
      env: { CODEX_DELEGATE_STATE_DIR: flowState() } });
    if (code !== EXIT.OK) return `the brief relay exited ${code}`;
    const e = parseEnvelope(out);
    if (e.error) return e.error;
    if (/\[clipped:/.test(e.answer)) return "the envelope relayed the clipped answer, not the full one";
    if (e.bytes <= 4000) return `the relayed answer is ${e.bytes} bytes, within --brief's own cap — the clip was not undone`;
    if (Buffer.byteLength(e.answer) !== e.bytes) return `the marker says ${e.bytes} bytes and ${Buffer.byteLength(e.answer)} follow it`;
    const onDisk = fs.readFileSync(e.fields.answerPath, "utf8");
    return e.answer === onDisk || `the relayed answer is not the file the envelope names (${e.answer.length} vs ${onDisk.length})`;
  });

flow("--relay supplies the rights line a coordinator's prompt does not have, and --seat-file still refuses to",
  "every edit the relay was allowed became an edit it made — it added a SEAT line with a directory, then a gate waiver, then rewrote a header that was already there. So the relay adds nothing and the DEFAULT is here: read level in the current directory, which widens nothing, on the --relay route only. The JSON route keeps `rights must be declared, not defaulted`, and the case for it below stays green",
  async () => {
    const here = fs.realpathSync(process.cwd());
    // A prompt exactly as a coordinator wrote it: no header at all.
    const bare = await run({ scenario: "happy", relay: true, json: "omit", noPrompt: true,
      seat: "Count the exit codes in the driver and say how many.\n",
      env: { CODEX_DELEGATE_STATE_DIR: flowState() } });
    if (bare.code !== EXIT.OK) return `a header-less relayed prompt exited ${bare.code}: ${bare.err.trim().slice(-200)}`;
    const e = parseEnvelope(bare.out);
    if (e.error) return e.error;
    const r1 = readJson(e.fields.reportPath);
    if (!r1) return `the envelope names no readable report: ${e.fields.reportPath}`;
    if (r1.level !== "read" || r1.cwd !== here)
      return `the default is not read level in the current directory: ${JSON.stringify({ level: r1.level, cwd: r1.cwd })}`;
    if ((r1.seatFileFields ?? []).includes("SEAT"))
      return `a SEAT the file never carried was reported as declared: ${JSON.stringify(r1.seatFileFields)}`;
    // A header that declares something else and still no rights: the fields apply, the default stands.
    const noSeat = await run({ scenario: "happy", relay: true, json: "omit", noPrompt: true,
      seat: "EFFORT: high\n\nDo the work and report.\n", env: { CODEX_DELEGATE_STATE_DIR: flowState() } });
    if (noSeat.code !== EXIT.OK) return `a SEAT-less header exited ${noSeat.code}: ${noSeat.err.trim().slice(-200)}`;
    const r2 = readJson(parseEnvelope(noSeat.out).fields.reportPath);
    if (!r2) return "the second relayed run left no readable report";
    if (r2.level !== "read" || r2.cwd !== here)
      return `a SEAT-less header did not default to read in the current directory: ${JSON.stringify({ level: r2.level, cwd: r2.cwd })}`;
    if (r2.effort !== "high" || (r2.seatFileFields ?? []).join(",") !== "EFFORT")
      return `the fields beside the missing SEAT were dropped: ${JSON.stringify({ effort: r2.effort, fields: r2.seatFileFields })}`;
    // The same two files through --seat-file, which declares rights or runs nothing.
    for (const seat of ["Count the exit codes in the driver and say how many.\n", "EFFORT: high\n\nDo the work and report.\n"]) {
      const refused = await run({ scenario: "happy", seat, noPrompt: true, json: "omit",
        env: { CODEX_DELEGATE_STATE_DIR: flowState() } });
      if (refused.code !== EXIT.USAGE || !/no SEAT field/.test(refused.err))
        return `--seat-file accepted a file with no rights line: exit ${refused.code} ${refused.err.trim().slice(0, 160)}`;
    }
    // And a SEAT that IS there but not first is still the injection refusal, on both routes.
    const late = await run({ scenario: "happy", relay: true, json: "omit", noPrompt: true,
      seat: "EFFORT: high\nSEAT: read <CWD>\nTASK: do it\n", env: { CODEX_DELEGATE_STATE_DIR: flowState() } });
    return (late.code === EXIT.USAGE && /first field must be SEAT, not EFFORT/.test(late.err))
      || `a SEAT below another field was accepted: exit ${late.code} ${late.err.trim().slice(0, 200)}`;
  });

flow("--relay and --relay-collect refuse the flags that would change what they print or how they carry the run",
  "the mode IS the transport and the format: a --json beside it asks for two stdouts, a --detach for two transports, and each would leave the relay copying something its coordinator cannot parse",
  async () => {
    for (const args of [["--json"], ["--footer"], ["--detach"], ["--wait", "thr_root"], ["--wait-timeout", "5"]]) {
      const { code, err } = await run({ scenario: "happy", relay: true, json: "omit", noPrompt: true,
        seat: "SEAT: read <CWD>\nTASK: do it\n", args, env: { CODEX_DELEGATE_STATE_DIR: flowState() } });
      if (code !== EXIT.USAGE || !/cannot be combined with --relay/.test(err))
        return `${args[0]} beside --relay was not refused: exit ${code} ${err.trim().slice(0, 200)}`;
    }
    const collect = await run({ scenario: "happy", json: "omit", noPrompt: true,
      args: ["--relay-collect", "thr_root", "--footer"], env: { CODEX_DELEGATE_STATE_DIR: flowState() } });
    if (collect.code !== EXIT.USAGE || !/cannot be combined with --relay-collect/.test(collect.err))
      return `--footer beside --relay-collect was not refused: exit ${collect.code} ${collect.err.trim().slice(0, 200)}`;
    const both = await run({ scenario: "happy", relay: true, json: "omit", noPrompt: true,
      seat: "SEAT: read <CWD>\nTASK: do it\n", args: ["--relay-collect", "thr_root"],
      env: { CODEX_DELEGATE_STATE_DIR: flowState() } });
    return (both.code === EXIT.USAGE && /--relay and --relay-collect are contradictory/.test(both.err))
      || `--relay with --relay-collect was not refused: exit ${both.code} ${both.err.trim().slice(0, 200)}`;
  });

flow("the job record's tokensSpent is what a real run measured, on the root thread",
  "every other case here writes the record by hand, so nothing pinned the value a run computes — and it is what --jobs and the running handle report, the one number a coordinator sizes a fan-out with. The fixture emits a subagent thread's 9900 after the root's 135, so a dropped thread filter reads 9900 here",
  async () => {
    const state = flowState();
    const { code, err } = await run({ scenario: "happy", env: { CODEX_DELEGATE_STATE_DIR: state } });
    if (code !== EXIT.OK) return `the run exited ${code}: ${err.trim().slice(-200)}`;
    const rec = recordOf(state);
    if (!rec) return "the run wrote no job record";
    return rec.tokensSpent === 135
      || `tokensSpent is ${JSON.stringify(rec.tokensSpent)}; the fixture's root-thread total is 135`;
  });

flow("a private $TMPDIR outlives its run and is reaped on the run-directory bounds",
  "two measured failures in one rule: removing it at exit took with it the file --brief had told the seat to write, and leaving it in the system temp dir left a directory per SIGKILLed run forever. Under <state>/tmp/<runId> it survives the run and the next run that needs one prunes it — never one whose own run is still alive",
  async () => {
    const state = flowState();
    const first = await run({ scenario: "tmp-write", unsetEnv: ["TMPDIR"], env: { CODEX_DELEGATE_STATE_DIR: state } });
    if (first.code !== EXIT.OK) return `the first run exited ${first.code}: ${first.err.trim().slice(-200)}`;
    const dir = JSON.parse(first.out).tmpDir;
    if (!dir || path.dirname(dir) !== path.join(state, "tmp")) return `the private $TMPDIR is not under <state>/tmp: ${JSON.stringify(dir)}`;
    if (!fs.existsSync(dir)) return `the private $TMPDIR was removed at exit: ${dir}`;
    // A SIGKILLed run's leavings: a directory with no owner record, older than the age bound.
    const leak = path.join(state, "tmp", "leaked-by-a-sigkill");
    fs.mkdirSync(leak, { recursive: true });
    fs.writeFileSync(path.join(leak, "junk.txt"), "x");
    // And a live one, whose owner record names a process that certainly exists: this one.
    const live = path.join(state, "tmp", "a-live-seat");
    fs.mkdirSync(live, { recursive: true });
    fs.writeFileSync(path.join(live, "owner.json"), JSON.stringify({ pid: process.pid, identity: null }));
    const old = (Date.now() - 15 * 86400000) / 1000;
    for (const d of [leak, live]) fs.utimesSync(d, old, old);
    const second = await run({ scenario: "happy", unsetEnv: ["TMPDIR"], env: { CODEX_DELEGATE_STATE_DIR: state } });
    if (second.code !== EXIT.OK) return `the second run exited ${second.code}: ${second.err.trim().slice(-200)}`;
    if (fs.existsSync(leak)) return `the directory a SIGKILLed run left behind was not reaped: ${leak}`;
    if (!fs.existsSync(live)) return `a live seat's scratch directory was reaped under it: ${live}`;
    return fs.existsSync(dir) || `an earlier run's kept $TMPDIR was reaped inside the bounds: ${dir}`;
  });

let failed = 0;
// Every report the table cases produce, rendered through the ONE envelope function — see the flow at the
// end of the file. Filled by the loop below, which runs before the flows do.
const rendered = [];
for (const c of CASES) {
  const label = `${c.scenario}${c.args?.length ? ` ${c.args.join(" ")}` : ""}`;
  const { code, out, err, ms } = await run(c);
  let report = null;
  try { report = JSON.parse(out); } catch {}
  if (report) rendered.push({ label, report });
  // An exit code alone cannot catch a report that destroys information — two runs with opposite verify
  // results once printed byte-identically at the same code. `assert` returns true, or a reason string.
  // A THROWING assert is a failed case, not a dead suite: unlike lock.test.mjs this loop had no
  // per-case guard, so one bad property access aborted every case after it and skipped cleanup.
  let assertion;
  try {
    assertion = c.assertStderr ? c.assertStderr(err, ms)
      : c.assertText ? c.assertText(out)
        // ms as well as the report: a rung whose whole content is WHEN it fires (or does not) cannot be
        // told from one that never armed by reading the report alone.
        : c.assert ? (report ? c.assert(report, ms) : "expected a JSON report, but stdout was not JSON") : true;
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

flow("--ephemeral leaves no thread behind: no job record, no continue-with line, nothing for `--resume last`",
  "the coverage ledger listed --ephemeral as untouched and the only cases it had were argument errors, so nothing measured what the flag DOES — writeJob() and the footer's continue-with line are where a leak would show, and `--resume last` is what a coordinator would pick up afterwards",
  async () => {
    const state = flowState();
    const eph = await run({ scenario: "happy", args: ["--ephemeral"], json: false,
      env: { CODEX_DELEGATE_STATE_DIR: state } });
    if (eph.code !== EXIT.OK) return `the ephemeral run exited ${eph.code}: ${eph.err.trim().slice(0, 160)}`;
    if (recordOf(state)) return "an ephemeral run wrote a job record, so --jobs, --wait and `--resume last` can still reach the thread";
    if (/--resume/.test(eph.out)) return `the footer offered to continue an ephemeral thread: ${eph.out.trim().slice(-160)}`;
    // A control in a state directory of its own: without it "no record" is equally consistent with a
    // registry that stopped being written at all, and the case would pass on a broken driver.
    const control = flowState();
    const keep = await run({ scenario: "happy", json: false, env: { CODEX_DELEGATE_STATE_DIR: control } });
    if (keep.code !== EXIT.OK) return `the control run exited ${keep.code}: ${keep.err.trim().slice(0, 160)}`;
    if (!recordOf(control)) return "the control run wrote no job record either, so this case cannot tell the flag from a dead registry";
    if (!/continue with --resume thr_root/.test(keep.out)) return `the control footer did not offer --resume: ${keep.out.trim().slice(-160)}`;
    const last = await run({ scenario: "happy", args: ["--resume", "last"],
      env: { CODEX_DELEGATE_STATE_DIR: state } });
    if (last.code !== EXIT.USAGE || !/no previous run/.test(last.err))
      return `\`--resume last\` after an ephemeral run exited ${last.code}, expected the usage refusal: ${last.err.trim().slice(0, 160)}`;
    return true;
  });

flow("every report this suite produced renders as an envelope a coordinator can parse",
  "the envelope is ONE function over the report object, so the whole matrix of reports above — cut, escalated, schema, worktree, review, brief — is its input set. The two rules a coordinator is given have to hold for every one of them: the first line is the exit code, and everything after the single answer marker is the answer, exactly as many bytes as the marker states",
  () => {
    if (rendered.length < 100) return `only ${rendered.length} reports were collected, so this proves little`;
    const problems = [];
    for (const { label, report } of rendered) {
      const text = renderEnvelope(report, { reportPath: "/dev/null" });
      const first = text.split("\n", 1)[0];
      if (!/^exitCode: (-?\d+|null)$/.test(first)) { problems.push(`${label}: first line ${JSON.stringify(first)}`); continue; }
      const markers = [...text.matchAll(new RegExp(ENVELOPE_ANSWER_RE.source, "gm"))];
      if (markers.length !== 1) { problems.push(`${label}: ${markers.length} answer markers`); continue; }
      const m = markers[0];
      const answer = text.slice(m.index + m[0].length + 1);
      if (Buffer.byteLength(answer) !== Number(m[1]))
        problems.push(`${label}: the marker says ${m[1]} bytes and ${Buffer.byteLength(answer)} follow it`);
      if (first !== `exitCode: ${report.exitCode}`) problems.push(`${label}: the envelope's code is not the report's`);
    }
    return problems.length === 0 || problems.slice(0, 5).join("; ");
  });

failed += await runCases(FLOWS);

fs.rmSync(shimDir, { recursive: true, force: true });
process.exit(summarize(failed, CASES.length + FLOWS.length));
