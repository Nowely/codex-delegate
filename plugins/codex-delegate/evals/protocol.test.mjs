#!/usr/bin/env node
// Protocol regression tests for scripts/driver.mjs: what the driver does with the SERVER's events.
//
// Every row here drives evals/fake-app-server.mjs through a scenario a live server will not produce on
// demand — a completion overtaking its response, an event from an ended turn, a request nobody can
// answer, a stream that never ends — plus the job record those runs leave behind and the exit ladder
// their verdicts are read off. The rows that ask what the driver does with its own ARGUMENTS are in
// cli.test.mjs, and both suites share evals/lib/scenarios.mjs.
//
//   node evals/protocol.test.mjs
//
// Exit 0 if every case matches its expected exit code.

import fs from "node:fs";
import path from "node:path";
import { EXIT, FAKE, LADDER, registry, runCases, summarize } from "./lib/harness.mjs";
import { SHIM, REVIEW_SCHEMA, assertKnownScenarios, attachFile, attachFile2, flowState, interruptLog,
         modelListLog, oneOfSchemaFile, protoSchemaFile, rateLimitLog, recordOf, run, runTable,
         schemaFile, until } from "./lib/scenarios.mjs";

const shimDir = SHIM;

// The prompt the stalled-reader row echoes back, sized past what a paused pipe holds: measured at 128 KB
// on this platform — 64 KB in the pipe itself and 64 KB in the reader's own buffer — under which a report
// reaches even a consumer that never reads, and the drain watchdog is never armed at all.
const STALLED_READER_BODY = "y".repeat(200000);
const CASES = [
  { scenario: "model-unknown",    expect: EXIT.USAGE, args: ["--effort", "minimal"],
    env: { FAKE_RPC_LOG: modelListLog },
    why: "model/list rejects an effort the catalogue does not advertise before thread/start pays the normal provider floor",
    assertStderr: (e, ms) => {
      const log = fs.existsSync(modelListLog) ? fs.readFileSync(modelListLog, "utf8") : "";
      return (/model\/list/.test(log) && !/thread\/start/.test(log) && /not advertised/.test(e) && ms < 7000)
        || `catalogue refusal was late or missing: ${JSON.stringify({ ms, log, err: e.slice(0, 180) })}`;
    } },
  { scenario: "rate-limited",     expect: EXIT.USAGE, env: { FAKE_RPC_LOG: rateLimitLog },
    why: "an account whose primary window is exhausted is refused during setup, before a thread is started",
    assertStderr: (e, ms) => {
      const log = fs.existsSync(rateLimitLog) ? fs.readFileSync(rateLimitLog, "utf8") : "";
      return (/account\/rateLimits\/read/.test(log) && !/thread\/start/.test(log) && /primary.*100%/.test(e) && ms < 7000)
        || `rate-limit refusal was late or missing: ${JSON.stringify({ ms, log, err: e.slice(0, 180) })}`;
    } },
  { scenario: "turn-diff",        expect: EXIT.OK,
    why: "the last turn/diff/updated payload is persisted under the answer log and named in the report",
    assert: (r) => (typeof r.turnDiffPath === "string" && fs.readFileSync(r.turnDiffPath, "utf8") === "last diff\n")
      || `the last diff was not persisted: ${JSON.stringify(r.turnDiffPath)}` },
  { scenario: "async-question",   expect: EXIT.INTERACTION,
    why: "since 0.153.0 a human question can arrive as an agentMessage with questions, phased final_answer; it is an interaction, and the turn's real answer must remain the answer",
    assert: (r) => (Array.isArray(r.interactions) && r.interactions.some((i) => /^item\/agentMessage\/questions: Which database/.test(i)) && r.answer === "DONE-ANSWER")
      || `async question mishandled: ${JSON.stringify({ i: r.interactions, a: r.answer })}` },
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
    why: "one bounded backoff absorbs an enumerated transient failure only when the turn produced no observable work",
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
  { scenario: "rich-items",       expect: EXIT.OK,
    why: "reasoning summaries, tool/search items and subagent threads must be visible in the report while the child's command counts for no root evidence",
    assert: (r) => (/Weighed A/.test(r.reasoningSummary ?? "") && r.otherItemCounts?.webSearch === 1
        && r.otherItems?.some((x) => x.type === "webSearch" && x.detail === "node atomics")
        && r.subagentThreads?.length === 1 && r.subagentThreads[0].threadId === "thr_child"
        && r.subagentThreads[0].commands === 1 && r.commandsSucceeded === 1
        // A thread/started with a parentThreadId carries neither of the two fields the root's own
        // announcement does, and null is the honest answer for both rather than a guess.
        && r.subagentThreads[0].agentPath === null && r.subagentThreads[0].status === null)
      || `visibility fields wrong: ${JSON.stringify({ reasoning: r.reasoningSummary, other: r.otherItemCounts, items: r.otherItems, sub: r.subagentThreads, cmds: r.commandsSucceeded })}` },
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
  { scenario: "stalled-turn",     expect: EXIT.TIMEOUT, args: ["--timeout", "0.5"], env: { FAKE_RPC_LOG: interruptLog },
    why: "a timed-out turn is asked to END, not just killed: turn/interrupt marks the turn in the rollout and leaves the thread idle, so --resume on a cancelled seat is not a gamble",
    assert: () => {
      let log = "";
      try { log = fs.readFileSync(interruptLog, "utf8"); } catch {}
      return /turn\/interrupt/.test(log) || `the driver never sent turn/interrupt: ${JSON.stringify(log)}`;
    } },
  { scenario: "probe-negative",   expect: EXIT.OK,
    why: "a no-match grep or false test is a probe answering no; the server reports wrapped commands, so classification must use the parsed command rather than match the wrapper",
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
  { scenario: "probe-piped",      expect: EXIT.OK,
    why: "a probe piped into another command exits with the LAST command's status, and the server parses it into two actions — classifying on the first one would launder `grep x | tail` exiting 1 into 'the probe answered no'",
    assert: (r) => (r.commandsFailed === 1 && r.commandsProbeNegative === 0)
      || `a pipeline was laundered into a probe: failed=${r.commandsFailed} probes=${r.commandsProbeNegative}` },
  { scenario: "escalated",        expect: EXIT.ESCALATED,
    why: "a refused approval completes its item as DECLINED with no exit code: that is a failure whatever the code says, never an unresolved command, and never a probe answering 'no' however grep-shaped its text",
    assert: (r) => (r.commandsFailed === 2 && r.commandsBlocked === 0 && r.commandsProbeNegative === 0)
      || `a declined command was misclassified: ${JSON.stringify({ f: r.commandsFailed, b: r.commandsBlocked, p: r.commandsProbeNegative })}` },
  { scenario: "blocked-command",  expect: EXIT.OK,
    why: "a command with no numeric exit code that is neither failed nor declined has no verdict; that is a report field and no exit code, so a caller reads commandsBlocked instead of being told the run failed",
    assert: (r) => (r.commandsBlocked === 1 && r.commandsFailed === 0 && r.commandsSucceeded === 1)
      || `the unresolved command was not counted: ${JSON.stringify({ b: r.commandsBlocked, f: r.commandsFailed, s: r.commandsSucceeded })}` },
  { scenario: "probe-multiline",  expect: EXIT.OK,
    why: "codex sends multi-line bash scripts; a newline is a command separator too, so 'grep -q x file\\npnpm test' exiting 1 is a failed suite, not a probe answering no",
    assert: (r) => (r.commandsFailed === 1 && r.commandsProbeNegative === 0)
      || `a multi-line script was laundered into a probe: failed=${r.commandsFailed} probes=${r.commandsProbeNegative}` },
  { scenario: "probe-error",      expect: EXIT.OK,
    why: "probes reserve exit 2 for real trouble — a bad pattern is a failure, not a 'no'",
    assert: (r) => (r.commandsFailed === 1 && r.commandsProbeNegative === 0)
      || `a probe error was read as a 'no': failed=${r.commandsFailed} probes=${r.commandsProbeNegative}` },
  { scenario: "probe-compound",   expect: EXIT.OK,
    why: "a compound command starting with a probe keeps failure semantics: its exit 1 may belong to the other command",
    assert: (r) => (r.commandsFailed === 1 && r.commandsProbeNegative === 0)
      || `a compound command was laundered into a probe: failed=${r.commandsFailed} probes=${r.commandsProbeNegative}` },
  { scenario: "hidden-failure",  expect: EXIT.OK,
    why: "a completed turn that answered exits 0 whatever its commands did: both records of the old rung were harm, and the failure stays counted for the caller to read",
    assert: (r) => (r.commandsFailed === 1 && r.ok === true)
      || `the failure left the report, or the run was still failed: ${JSON.stringify({ failed: r.commandsFailed, ok: r.ok })}` },
  { scenario: "hidden-failure",  expect: EXIT.NO_COMMANDS,
    args: ["--expect-command", "zzz_never"],
    why: "the demoted rung takes nothing with it: asking for proof and then accepting its absence is the failure --expect-command exists to prevent",
    assert: (r) => r.commandsMatchingExpectation === 0
      || `the expectation was not measured: ${JSON.stringify(r.commandsMatchingExpectation)}` },
  { scenario: "hidden-failure",  expect: EXIT.VERIFY_FAILED,
    args: ["--verify", "false"],
    why: "a check the caller ran and that said no is still exit 9, because it measured the end state instead of inferring it from the command list",
    assert: (r) => r.verify?.ok === false || `the failed check was not reported: ${JSON.stringify(r.verify)}` },
  { scenario: "hidden-failure",  expect: EXIT.OK,                 args: ["--verify", "true"],
    why: "a passing check beside a failed command is exit 0, and both reach the report" },
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
  { scenario: "failed-null-exit", expect: EXIT.OK,
    why: "the schema permits a FAILED command with exitCode null; failure classification must not depend on a numeric exit code",
    assert: (r) => r.commandsFailed === 1 || `the failed command was not counted: failed=${r.commandsFailed} blocked=${r.commandsBlocked}` },
  { scenario: "escalated-subagent", expect: EXIT.ESCALATED,
    why: "the refusal is sent whoever asked, so a subagent really was blocked — evidence of FAILURE must be inclusive even though evidence of SUCCESS is root-only",
    assert: (r) => r.escalations?.length === 1 || `a refused subagent escalation went unrecorded: ${JSON.stringify(r.escalations)}` },
  { scenario: "file-changes",     expect: EXIT.OK,
    why: "a failed patch must reach the report; PatchChangeKind is an object whose type and move_path must be rendered as meaningful fields",
    assert: (r) => (r.fileChangesFailed?.length === 1 && r.fileChangesFailed[0].kind === "update"
        && JSON.stringify(r.filesTouched) === JSON.stringify(["/tmp/wrote.txt", "/tmp/new.txt"])
        // fileChanges keeps what filesTouched folds away: the kind, and the path a rename STARTED at.
        && JSON.stringify(r.fileChanges) === JSON.stringify([
             { path: "/tmp/wrote.txt", kind: "add", move: null },
             { path: "/tmp/old.txt", kind: "update", move: "/tmp/new.txt" }]))
      // The rename must be reported by its DESTINATION: /tmp/old.txt no longer exists after it.
      || `write results wrong: touched=${JSON.stringify(r.filesTouched)} changes=${JSON.stringify(r.fileChanges)} failed=${JSON.stringify(r.fileChangesFailed)}` },
  { scenario: "resume-active",    expect: EXIT.BUSY, args: ["--resume", "thr_root"],
    why: "shutdown signals must not overwrite the exit code of a deliberate refusal after spawn" },
  // A probe that never replies, under the shortest budget the clamp allows: --timeout 1 is the seam, and
  // no thread is ever started, so the run ends on the wall clock rather than racing the fixture's answer.
  { scenario: "no-thread",        expect: EXIT.TIMEOUT, args: ["--timeout", "1"],
    env: { FAKE_CONFIG_HANG: "1" },
    why: "the probe carries a bell of its own, clamped between CONFIG_PROBE_MIN_MS and CONFIG_PROBE_MAX_MS: without it a config request that never answers holds the run open before the turn, and no other case drives that bound at all",
    assertStderr: (e) => /could not read the caller's Codex config \(no reply in 1000ms\)/.test(e)
      || `the probe's own budget did not end it: ${e.slice(0, 200)}` },
  { scenario: "policy-clamped",   expect: EXIT.TRANSPORT,
    why: "an MDM profile clamps a policy it does not permit, after which every command is denied while the run still looks healthy — the exact failure this driver exists to route around, and invisible in every other field" },
  { scenario: "workspace-elsewhere", expect: EXIT.TRANSPORT,
    why: "a workspace that does not contain the cwd means everything the turn writes lands somewhere the caller did not choose, and nothing in the sandbox object reveals it" },
  { scenario: "reviewer-auto",    expect: EXIT.TRANSPORT,
    why: "approvals routed to the server's own reviewer never reach this driver, so the refusal policy is disarmed while the sandbox object stays byte-identical — nothing else in the response can catch it" },

  // --- the caller's own check must not be cancelled by the model-authored one ---
  { scenario: "wrong-command",    expect: EXIT.VERIFY_FAILED, args: ["--expect-command", "vitest", "--verify", "false"],
    why: "a failing --verify outranks a missed expectation: the end state was measured broken, which is stronger than 'the command list looks wrong'",
    assert: (r) => r.verify?.ok === false || `verify did not run: ${JSON.stringify(r.verify)}` },
  { scenario: "wrong-command",    expect: EXIT.NO_COMMANDS, args: ["--expect-command", "vitest", "--verify", "true"],
    why: "a passing --verify does NOT waive a declared expectation — a stale artefact satisfies the end state while the work never ran — but it must still be REPORTED",
    assert: (r) => r.verify?.ok === true || `verify was suppressed by the expectation miss: ${JSON.stringify(r.verify)}` },
  { scenario: "hidden-failure",   expect: EXIT.NO_COMMANDS, args: ["--expect-command", "zzz_never", "--verify", "true"],
    why: "a missed expectation is exit 5 whatever the verifier said, and the verifier must still have run and been reported",
    assert: (r) => r.verify?.ok === true || `the verifier was suppressed by the expectation miss: ${JSON.stringify(r.verify)}` },
  { scenario: "turn-failed",      expect: EXIT.TURN_NOT_COMPLETED, args: ["--verify", "true"],
    why: "a passing verify cannot rescue a turn that never completed, and on a non-completed turn the end state is recorded as unmeasured rather than guessed",
    assert: (r) => r.verify === null && typeof r.verifySkipped === "string"
      || `expected verify skipped with a reason, got verify=${JSON.stringify(r.verify)} skipped=${JSON.stringify(r.verifySkipped)}` },

  // --- teardown: nothing this driver started may outlive it ---
  { scenario: "spawn-survivor",   expect: EXIT.OK,
    why: "group teardown must wait out TERM-ignoring descendants so test servers and watchers cannot outlive normal completion",
    assert: (r) => {
      const pid = Number((String(r.answer).match(/survivor (\d+)/) ?? [])[1]);
      if (!pid) return `the fixture did not report its survivor pid: ${JSON.stringify(r.answer)}`;
      try { process.kill(pid, 0); return `survivor ${pid} is still alive after the driver exited`; }
      catch { return true; }
    } },
  { scenario: "stale-turn",       expect: EXIT.NO_COMMANDS,
    why: "exit 5 with no declared expectation names the flag that waives it, so a recall-only caller has a self-serve path",
    assert: (r) => /allow-no-commands/.test(r.hint ?? "") || `exit 5 carried no hint: ${JSON.stringify(r.hint)}` },
  { scenario: "wrong-command",    expect: EXIT.NO_COMMANDS, args: ["--expect-command", "vitest"],
    why: "with a declared expectation the hint would be a lie — --allow-no-commands never waives an expectation",
    assert: (r) => r.hint === undefined || `a hint appeared beside a declared expectation: ${JSON.stringify(r.hint)}` },

  // --- --output-schema: the server constrains, the driver checks, one corrective turn is spent ---
  { scenario: "schema-good",      expect: EXIT.OK, args: ["--output-schema", schemaFile],
    why: "a first-try match spends no corrective turn, reports the parsed object, and SAYS it matched — an outputSchemaOk read off the absence of errors cannot tell a schema that passed from one never checked",
    assert: (r) => (r.outputAttempts === 1 && r.outputSchemaOk === true && r.schemaErrors === null && r.answerJson?.verdict === "ok")
      || `schema-good report wrong: ${JSON.stringify({ a: r.outputAttempts, ok: r.outputSchemaOk, errs: r.schemaErrors, j: r.answerJson })}` },
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
  { scenario: "schema-good",      expect: EXIT.OK, args: ["--output-schema", oneOfSchemaFile],
    why: "keywords the shallow validator ignores must be NAMED in the report, so outputSchemaOk can never silently mean 'nothing was checked'",
    assert: (r) => (r.outputSchemaOk === true && Array.isArray(r.schemaKeywordsUnchecked) && r.schemaKeywordsUnchecked.includes("oneOf"))
      || `unchecked keywords not reported: ${JSON.stringify(r.schemaKeywordsUnchecked)}` },
  { scenario: "schema-retry-refused", expect: EXIT.SCHEMA, args: ["--output-schema", schemaFile],
    why: "a refused corrective turn must preserve the completed first turn's evidence and report the schema failure",
    assert: (r) => (r.outputSchemaOk === false && r.outputAttempts === 2 && String(r.answer).length > 0 && r.commandsSucceeded === 1)
      || `the first turn's report was lost: ${JSON.stringify({ ok: r.outputSchemaOk, a: r.outputAttempts, ans: String(r.answer).slice(0, 40) })}` },

  { scenario: "late-completion",  expect: EXIT.TIMEOUT, args: ["--timeout", "0.4", "--output-schema", schemaFile],
    why: "a completion arriving after the deadline reported must not start a corrective turn on a run that declared itself timed out",
    assertStderr: (t) => !/spending the corrective turn/.test(t) || "a settled run announced new work after its own report" },
  { scenario: "schema-good",      expect: EXIT.SCHEMA, args: ["--output-schema", protoSchemaFile],
    why: "a required key named after an Object.prototype member is missing; inherited properties must not add invented validation errors to the corrective prompt",
    assert: (r) => {
      const errs = (r.schemaErrors ?? []).join(" | ");
      if (/got function/.test(errs)) return `the prototype was validated instead of the absent key: ${errs}`;
      return /toString: required and missing/.test(errs) || `the missing key was not reported plainly: ${errs}`;
    } },

  // --- caps and bounds published by the driver ---
  { scenario: "long-answer",      expect: EXIT.OK, args: ["--brief"],
    why: "the --brief cap includes the clipped marker; appending the marker after clipping would exceed the bound",
    assert: (r) => {
      const bytes = Buffer.byteLength(String(r.answer), "utf8");
      if (bytes > 4000) return `--brief returned ${bytes} bytes, past its own 4000-byte cap`;
      if (r.answerTruncated !== true) return "a 200-line answer was not marked truncated";
      return /full answer at/.test(String(r.answer)) || "the clip marker lost its forwarding address";
    } },
  { scenario: "tmp-write",        expect: EXIT.OK, unsetEnv: ["TMPDIR"],
    why: "the private directory is the read seat's only writable root and may hold files named by --brief; it must outlive the run so those answer paths remain usable",
    assert: (r) => {
      const named = /full notes at (\S+)/.exec(String(r.answer))?.[1];
      if (!named) return `the seat did not name the file it wrote: ${String(r.answer).slice(0, 160)}`;
      if (!fs.existsSync(named)) return `the path the answer names was removed with the run: ${named}`;
      if (r.tmpDir === null) return "a kept private temp directory was not named in the report";
      if (path.dirname(named) !== r.tmpDir) return `the report's tmpDir is not the directory the file is in: ${JSON.stringify({ tmpDir: r.tmpDir, named })}`;
      return true;
    } },
  { scenario: "env-tmpprefix",    expect: EXIT.OK, unsetEnv: ["TMPDIR", "TMPPREFIX"],
    why: "zsh keeps every here-document in a file under TMPPREFIX, default /tmp/zsh, which no grant covers: the seat's shell must see it under the run's TMPDIR or every <<EOF fails (measured, 15 rollouts)",
    assert: (r) => {
      const got = /TMPPREFIX=(\S+)/.exec(String(r.answer))?.[1];
      if (!got) return `the fixture did not report TMPPREFIX: ${String(r.answer).slice(0, 160)}`;
      if (r.tmpDir === null) return "a private temp directory was not named in the report";
      return got === path.join(r.tmpDir, "zsh") || `TMPPREFIX is not under the run's TMPDIR: ${JSON.stringify({ got, tmpDir: r.tmpDir })}`;
    } },

  // --- a server that dies mid-turn still has to hand back what the turn did ---
  { scenario: "server-crash",     expect: EXIT.TRANSPORT,
    why: "an app-server that dies mid-turn must not discard the threadId, commands and partial answer already collected",
    assert: (r) => (r.commandsSucceeded === 1 && r.threadId === "thr_root"
      && /crashed/.test(JSON.stringify(r.turnError ?? {})) && /partial answer/.test(String(r.answer)))
      || `the crash discarded the turn's evidence: ${JSON.stringify({ cmds: r.commandsSucceeded, thread: r.threadId, err: r.turnError, answer: String(r.answer).slice(0, 60) })}` },

  // --- the main transport's two unbounded buffers ---
  { scenario: "early-flood",      expect: EXIT.TRANSPORT,
    why: "turn-scoped notifications held before turn/start responds need a bound so a broken server cannot exhaust memory while the response never arrives",
    assertStderr: (e) => /before answering turn\/start/.test(e)
      || `the early buffer was not bounded: ${e.slice(0, 200)}` },
  { scenario: "unterminated-line", expect: EXIT.TRANSPORT,
    why: "the main transport must bound unterminated lines so one broken server write cannot exhaust memory",
    assertStderr: (e) => /with no newline/.test(e)
      || `an unterminated line was buffered without a bound: ${e.slice(0, 200)}` },

  { scenario: "no-trailing-newline", expect: EXIT.OK,
    why: "EOF terminates a line as surely as a newline; the final turn/completed must still be processed when its trailing newline is missing",
    assert: (r) => (r.turnStatus === "completed" && r.commandsSucceeded === 1 && /the answer/.test(String(r.answer)))
      || `a final line without its newline was dropped: ${JSON.stringify({ turn: r.turnStatus, cmds: r.commandsSucceeded, answer: String(r.answer).slice(0, 40) })}` },

  // --- the report has to reach stdout, and a paused reader is not a broken one ---
  { scenario: "long-answer",      expect: EXIT.TRANSPORT, closeStdout: true,
    why: "a consumer that stops reading makes the report write fail EPIPE; this must be the documented transport failure, not an uncaught exception",
    assertStderr: (e) => /EPIPE|did not reach the caller/.test(e)
      || `a closed stdout was not reported as a transport failure: ${e.slice(0, 200)}` },
  { scenario: "long-answer",      expect: EXIT.OK, pauseStdout: 8000, args: ["--timeout", "40"],
    why: "a paused reader must have the remaining report-drain budget to resume; a short fixed wait can truncate a report the reader would have drained",
    assert: (r) => (typeof r.answer === "string" && r.answer.length > 60000)
      || `the report was truncated for a consumer that paused: ${String(r.answer ?? "").length} bytes of answer` },
  { scenario: "echo-input",       expect: EXIT.TRANSPORT, stallStdout: true, args: ["--timeout", "3"],
    noPrompt: true, seat: `SEAT: read <CWD>\n${STALLED_READER_BODY}\n`,
    why: "a reader that pauses and never resumes is the only thing the drain watchdog answers for, and nothing had ever fired it: every path that writes stdout now leaves through the one funnel, so the bound that funnel carries is the bound of them all",
    assertStderr: (e) => /stdout did not drain within \d+ms/.test(e)
      || `a reader that never resumed was not bounded by the drain watchdog: ${e.slice(0, 200)}` },
  { scenario: "probe-piped",      expect: EXIT.OK,
    why: "the report must name commands piped to a pager because a seat can mistake a slice of its evidence for the whole result",
    assert: (r) => (r.commandsPipedToPager === 1 && /head\/tail\/less/.test(String(r.pipedToPagerHint ?? "")))
      || `a command ending in a pager was not counted: ${JSON.stringify({ n: r.commandsPipedToPager, hint: r.pipedToPagerHint })}` },

  // --- the server's parse is evidence, not authority ---
  { scenario: "probe-laundered",  expect: EXIT.OK,
    why: "one tidy commandAction for a multi-line script must not hide a failed command on a later line behind a probe exemption",
    assert: (r) => (r.commandsProbeNegative === 0 && r.commandsFailed === 1)
      || `a multi-line script was read as a probe: ${JSON.stringify({ probe: r.commandsProbeNegative, failed: r.commandsFailed })}` },

  // --- the standing rules the driver puts on the thread ---
  { scenario: "echo-instructions", expect: EXIT.OK, args: ["--brief"],
    why: "--brief's second sentence is what keeps a capped answer from losing its detail; it must still be sent when it is not contradicted",
    assert: (r) => /Put anything longer/.test(String(r.answer))
      || `--brief lost its forwarding instruction: ${String(r.answer).slice(0, 200)}` },
  { scenario: "echo-instructions", expect: EXIT.OK, args: ["--brief", "--answer-json"],
    why: "under --answer-json the seat has just been told to answer with ONE JSON object and nothing else; telling it in the same breath to put the rest in a file is a contradiction the seat has to resolve on its own",
    assert: (r) => (!/Put anything longer/.test(String(r.answer)) && /ONE JSON object/.test(String(r.answer)))
      || `the contradictory pair was still sent: ${String(r.answer).slice(0, 300)}` },

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
  { scenario: "cut-flush",        expect: EXIT.TIMEOUT, args: ["--timeout", "1"],
    why: "a cut asks the server to end the turn and grants time to do so; an answer delivered inside that grace must reach the caller",
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

  // --- the idle guard: the bound that tells a working turn from a hung one ---
  { scenario: "idle-silence",     expect: EXIT.TIMEOUT, args: ["--idle-timeout", "1", "--timeout", "8"],
    why: "a turn that says NOTHING is the hang the wall clock cannot name: --timeout is a budget a healthy turn may spend in full, so only silence distinguishes them, and every root event rearms it",
    assert: (r) => (r.cut?.kind === "idle" && r.cut.limit === 1 && r.cut.observed >= 1 && r.turnStatus === "timedOut")
      || `the silent turn was not cut on the idle budget: ${JSON.stringify({ cut: r.cut, t: r.turnStatus })}` },
  { scenario: "idle-subagent",    expect: EXIT.OK, args: ["--idle-timeout", "1", "--timeout", "20"],
    why: "subagent notifications prove liveness even while the root is silent; success evidence stays root-only so the child's command satisfies no gate",
    assert: (r) => {
      if (r.cut !== null) return `a turn whose subagent was working throughout was cut: ${JSON.stringify(r.cut)}`;
      if (r.subagentThreads?.[0]?.threadId !== "thr_child") return `the subagent thread was not registered: ${JSON.stringify(r.subagentThreads)}`;
      // The root ran exactly one command; the child's is counted for the child and for nothing else.
      return (r.commandsSucceeded === 1 && r.tokenUsage?.total?.totalTokens === 100)
        || `a child thread's work leaked into the root's evidence: ${JSON.stringify({ cmds: r.commandsSucceeded, usage: r.tokenUsage?.total })}`;
    } },
  { scenario: "idle-delegation",  expect: EXIT.OK, args: ["--idle-timeout", "1", "--timeout", "20"],
    why: "the liveness rule has to hold for the shape 0.153.4 emits: the child is known only from the root's announcement, and every event it then sends under its own threadId (turn/started, its status changes, its usage, its items) rearms the guard",
    assert: (r) => {
      if (r.cut !== null) return `a turn whose announced child was working throughout was cut: ${JSON.stringify(r.cut)}`;
      const t = (r.subagentThreads ?? [])[0];
      if (t?.threadId !== "thr_child" || t.agentPath !== "/root/counter")
        return `the announced child was not registered: ${JSON.stringify(r.subagentThreads)}`;
      // The child ran twelve; the root ran one, and that one is the whole of this run's evidence.
      return (t.commands === 12 && r.commandsSucceeded === 1)
        || `the child's work and the root's were confused: ${JSON.stringify({ child: t, root: r.commandsSucceeded })}`;
    } },
  { scenario: "delegation",       expect: EXIT.NO_COMMANDS,
    why: "on 0.153.4 a child thread never sends thread/started, so the root's subAgentActivity item is the registration: it names the child, its agentPath and, on the second announcement, that it completed; and the item arrives twice without registering the child twice",
    assert: (r) => {
      const s = r.subagentThreads ?? [];
      if (s.length !== 1) return `the announced child was not registered exactly once: ${JSON.stringify(s)}`;
      const t = s[0];
      return (t.threadId === "thr_child" && t.agentPath === "/root/count_readme" && t.status === "completed"
          && t.items === 2 && t.commands === 1 && r.commandsSucceeded === 0)
        || `the child's registration is wrong: ${JSON.stringify({ child: t, root: r.commandsSucceeded })}`;
    } },
  { scenario: "delegation",       expect: EXIT.NO_COMMANDS,
    why: "the evidence rule is unchanged by a child's work: the root ran nothing, so this is exit 5. But the cause has to say the children ran, or 'no command ran' reads as a dead turn beside an answer that is plainly the product of work",
    assert: (r) => {
      const h = String(r.hint ?? "");
      return (/^no command ran on the root thread; 1 subagent thread\(s\) ran /.test(h)
          && h.includes("/root/count_readme") && /1 commands/.test(h) && h.endsWith("liveness, not evidence"))
        || `the exit-5 cause does not name the children: ${JSON.stringify(r.hint)}`;
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
    } },

  // --- the default: no wall clock at all, the way a native subagent runs ---
  { scenario: "slow-turn",        expect: EXIT.OK, noTimeout: true,
    why: "the default arms no wall-clock rung: a turn that takes its time finishes and reports cut: null",
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
    why: "the default command cap is a safety net that this short command sequence must not reach",
    assert: (r) => (r.cut === null && r.commandsSucceeded === 6)
      || `the default command cap bit an ordinary turn: ${JSON.stringify({ cut: r.cut, cmds: r.commandsSucceeded })}` },
  { scenario: "many-commands",    expect: EXIT.TIMEOUT, noTimeout: true,
    seat: "SEAT: read <CWD>\n", args: ["--max-commands", "2"],
    why: "the cap still reaches a SEAT-FILE run — the flag is appended after the file's own argv, which is the route a coordinator bounding a seat it did not author has to take",
    assert: (r) => ((r.seatFileFields ?? []).join(",") === "SEAT" && r.cut?.kind === "commands" && r.cut.limit === 2)
      || `the flag did not bound a seat-file run: ${JSON.stringify({ fields: r.seatFileFields, cut: r.cut })}` },

  // --- one file, both halves: the header is the leading FIELD: lines and the rest is the prompt ---
  { scenario: "echo-input", expect: EXIT.OK, noPrompt: true,
    seat: "SEAT: read <CWD>\nEXPECT: echo\nTASK: count the files\nand say how many\n",
    why: "the caller writes one file; the driver preserves everything from the first non-header line as the body, including its label",
    assert: (r) => {
      const answer = String(r.answer);
      if (!/TASK: count the files\\nand say how many/.test(answer)) return `the body did not reach the turn verbatim: ${answer.slice(0, 200)}`;
      return (r.seatFileFields ?? []).join(",") === "SEAT,EXPECT"
        || `a body line was read as a header field: ${JSON.stringify(r.seatFileFields)}` } },
  { scenario: "echo-input", expect: EXIT.OK, noPrompt: true,
    seat: "SEAT: read <CWD>\nEXPECT: echo\nTASK: do it\nNETWORK: yes\nMODEL: gpt-5\n",
    why: "below the body's first line nothing is a header however field-like it looks — otherwise a task that quotes a header, or a copied value carrying a newline, silently re-declares the seat's rights",
    assert: (r) => (r.network === false && r.model !== "gpt-5" && (r.seatFileFields ?? []).join(",") === "SEAT,EXPECT")
      || `a line below TASK: was read as a field: ${JSON.stringify({ net: r.network, model: r.model, fields: r.seatFileFields })}` },
  { scenario: "resume-active", expect: EXIT.BUSY, noPrompt: true,
    seat: "SEAT: read <CWD>\nRESUME: thr_root\nTASK: continue the thread\n",
    why: "a resumed thread whose turn is still open is exit 10 with no report at all, like a held write lock: the caller reads the reason on stderr, and a coordinator that treated 10 as 'still starting' would wait on a run that already refused",
    assertStderr: (e) => /still has a turn running/.test(e)
      || `the refusal does not say the thread is busy: ${e.slice(0, 200)}`,
    assertText: (out) => out.trim() === "" || `a pre-turn refusal printed ${out.length} bytes on stdout` },
];

assertKnownScenarios(CASES);

// --- flows: what one run of the driver cannot express ---
//
// A record written by one run and read by the next, a report delivered to a file, a signal mid-turn:
// each step's state is the next step's input, so these are procedural rather than table cases.
// Each gets a state directory of its own: every fixture run reports the SAME thread id, so a shared
// registry would let one flow read another's record.
const { cases: FLOWS, test: flow } = registry();

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

flow("the job record is private resume metadata, and a record from an older release loses the rest of it",
  "the record is not a second report: with a run's gates, progress and transport in it, whoever found the record first read a second, staler answer about the same seat — and a record written by a release that kept them has to lose them rather than outlive the interfaces that filled it",
  async () => {
    const state = flowState();
    const jobs = path.join(state, "jobs");
    fs.mkdirSync(jobs, { recursive: true });
    // A record in the shape an earlier release wrote, for a thread this run is about to continue.
    fs.writeFileSync(path.join(jobs, "thr_root.json"), JSON.stringify({
      threadId: "thr_root", cwd: shimDir, level: "read", pid: 2147483646, timeout: 900,
      started: new Date(Date.now() - 60000).toISOString(), endedAt: new Date(Date.now() - 30000).toISOString(),
      exitCode: 0, detached: true, runId: "r9", runDir: "/tmp/gone", reportPath: "/tmp/gone/report.json",
      stderrPath: "/tmp/gone/stderr.txt", promptPath: "/tmp/gone/prompt.txt", worktreeName: "wt-1",
      lastEventAt: "2026-01-01T00:00:00.000Z", tokensSpent: 1, commandsSeen: 1, phase: "agentMessage",
      receiptOk: true, commandsSucceeded: 1, commandsFailed: 0, verify: null, verifySkipped: null, cut: null }));
    // A slow scenario, so the record can be read WHILE the resumed turn runs: every closing field in it
    // belongs to the run that ended, and `endedAt` left in place says this thread is finished while its
    // new turn is going — which is exactly what the resume guard returns on.
    const pending = run({ scenario: "slow-turn", args: ["--resume", "last", "--timeout", "30"],
      env: { CODEX_DELEGATE_STATE_DIR: state } });
    const live = await until(() => {
      const r = recordOf(state);
      return r && r.pid !== 2147483646 && !r.endedAt ? r : null;
    });
    const { code, out, err } = await pending;
    if (code !== EXIT.OK) return `the resumed run exited ${code}: ${err.trim().slice(-200)}`;
    if (!live) return "the resumed run kept the earlier run's endedAt while its own turn was going";
    if (live.turnStatus !== undefined || live.exitCode !== undefined)
      return `the resumed run kept the earlier run's verdict while its own turn was going: ${JSON.stringify({ t: live.turnStatus, e: live.exitCode })}`;
    const rec = await until(() => { const r = recordOf(state); return r?.endedAt ? r : null; });
    if (!rec) return "the run wrote no job record";
    const allowed = ["threadId", "pid", "identity", "cwd", "started", "repo", "baseSha",
                     "endedAt", "exitCode", "turnStatus", "answerPath",
                     "worktreeDiffPath", "worktreeUntrackedPath", "worktreeCommitsRef"];
    const extra = Object.keys(rec).filter((k) => !allowed.includes(k));
    if (extra.length) return `the record carries what only the report should: ${extra.join(", ")}`;
    for (const k of ["threadId", "pid", "identity", "cwd", "started", "endedAt", "exitCode", "turnStatus", "answerPath"])
      if (rec[k] === undefined) return `the record has no ${k}: ${JSON.stringify(Object.keys(rec))}`;
    if (rec.exitCode !== EXIT.OK || rec.turnStatus !== "completed")
      return `the record does not close on the run's own verdict: ${JSON.stringify({ e: rec.exitCode, t: rec.turnStatus })}`;
    // And the run it closed on is the one that just ran, not the record it inherited.
    return JSON.parse(out).threadId === rec.threadId
      || `the record closed on another run: ${JSON.stringify({ record: rec.threadId })}`;
  });

flow("the report's tokenUsage is the root thread's total, and no record carries a second copy of it",
  "the run must compute the root token total the report states; a later subagent usage event exposes a missing thread filter, and the number belongs to the report the caller reads rather than to a record that would then have to be kept in step with it",
  async () => {
    const state = flowState();
    const { code, out, err } = await run({ scenario: "happy", env: { CODEX_DELEGATE_STATE_DIR: state } });
    if (code !== EXIT.OK) return `the run exited ${code}: ${err.trim().slice(-200)}`;
    const report = JSON.parse(out);
    if (report.tokenUsage?.total?.totalTokens !== 135)
      return `the report's root-thread total is ${JSON.stringify(report.tokenUsage?.total?.totalTokens)}; the fixture's is 135`;
    const rec = await until(() => { const r = recordOf(state); return r?.endedAt ? r : null; });
    if (!rec) return "the run wrote no job record";
    return rec.tokensSpent === undefined || `the record carries tokensSpent ${JSON.stringify(rec.tokensSpent)} beside the report's own`;
  });

let failed = await runTable(CASES);

// --- the exit ladder, one rung at a time ---
//
// Possible at all only because every `when` is a function of the context decideExitCode hands it: most
// of them used to read module state that a whole turn had to produce first, so the ladder could be
// exercised end to end and no other way. LADDER comes from the driver through the harness, so the rungs
// here ARE the driver's rungs and a rung added there without a case here shows up as a count.
const LADDER_OPTS = { expectRe: null, allowNoCommands: true, outputSchema: null };
// A completed turn that ran a command, answered, and tripped nothing.
const LADDER_BASE = { turnStatus: "completed", turnError: null, interactions: [], escalations: [],
  verifyResult: null, verifySkipped: null, verifyFailed: false,
  expected: [{}], answer: "an answer", schemaErrs: [], failedCmds: [], failedPatches: [], blocked: [] };
const ladderCtx = ({ opts = {}, ...over } = {}) =>
  ({ ...LADDER_BASE, ...over, opts: { ...LADDER_OPTS, ...opts } });
// First match wins: the ladder's own rule, and the whole of the driver's walk over it.
const rungHit = (ctx) => LADDER.findIndex((r) => r.when(ctx));

const RUNGS = [
  { at: 0, code: EXIT.TIMEOUT, ctx: { turnStatus: "timedOut" },
    what: "a turn cut on a declared budget",
    why: "a budget the caller set is the caller's to raise; folded into any rung below it, the report would blame the seat for work that did not fit" },
  { at: 1, code: EXIT.USAGE, ctx: { turnStatus: "failed", turnError: { codexErrorInfo: "badRequest" } },
    what: "a request the server refused",
    why: "the set of efforts and models is per-model and knowable only at runtime; reported as a transport failure the caller retries it forever instead of fixing the parameter" },
  { at: 2, code: EXIT.TURN_NOT_COMPLETED, ctx: { turnStatus: "failed" },
    what: "a turn that did not complete",
    why: "an incomplete turn's answer is whatever arrived before it stopped; exit 0 on it claims a finished piece of work" },
  { at: 3, code: EXIT.INTERACTION, ctx: { interactions: [{ q: "which branch?" }] },
    what: "a turn that asked for input",
    why: "no sandbox change answers a question that needed a human, so this must outrank the escalation rung below it" },
  { at: 4, code: EXIT.ESCALATED, ctx: { escalations: [{ cmd: "rm" }] },
    what: "a refused approval",
    why: "a refused escalation explains the missing command; below NO_COMMANDS it would be reported as 'nothing ran', which hides why" },
  { at: 5, code: EXIT.VERIFY_UNMEASURABLE, ctx: { verifySkipped: "budget-exhausted" },
    what: "a --verify the budget left no room for",
    why: "a declared check that never ran leaves verifyResult null, which every gate below reads as 'nothing to complain about' — the run would reach 0 with its verifier unrun" },
  { at: 5, code: EXIT.VERIFY_UNMEASURABLE, ctx: { verifyResult: { ok: false, measured: false }, verifyFailed: true },
    what: "a --verify that ran and measured nothing",
    why: "'the check could not be measured' and 'the check said no' are different findings, and the unmeasurable one must not be reported as a failure the seat caused" },
  { at: 6, code: EXIT.VERIFY_FAILED, ctx: { verifyResult: { ok: false, measured: true }, verifyFailed: true },
    what: "a --verify that ran and failed",
    why: "the verifier is the gate this repository prefers over every command-shaped proxy below it; a failing one reaching exit 0 makes --verify decorative" },
  { at: 7, code: EXIT.NO_COMMANDS, ctx: { expected: [], opts: { allowNoCommands: false } },
    what: "a turn that ran nothing",
    why: "an answer with no command behind it is recall, not evidence; the floor is what separates the two" },
  { at: 8, code: EXIT.NO_ANSWER, ctx: { answer: "" },
    what: "a turn that produced no answer",
    why: "a run with no answer has nothing for its caller to read, and every gate below it grades the answer's content" },
  { at: 9, code: EXIT.SCHEMA, ctx: { opts: { outputSchema: {} }, schemaErrs: ["/: missing 'verdict'"] },
    what: "an answer that failed --output-schema",
    why: "an unusable answer is what a caller parsing it fails on, and it is the LAST rung: a failed command is a report field and no exit at all" },
];

flow("the ladder's contexts and its rungs are the same ten",
  "a rung added to the driver without a case here is a rung nothing measures, and the ladder is the whole of what an exit code means",
  async () => {
    // Counted by POSITION, not by case: two contexts reach the one VERIFY_UNMEASURABLE rung, and each
    // still has to be shown reaching it rather than something above it.
    const named = new Set(RUNGS.map((r) => r.at)).size;
    return LADDER.length === named || `the driver has ${LADDER.length} rungs and this suite names ${named}`;
  });

flow("a completed turn that tripped no rung exits 0",
  "the ladder decides every exit this driver takes; a base context that matched something would make every case below it agree for the wrong reason",
  async () => {
    const i = rungHit(ladderCtx());
    return i < 0 || `a clean completed turn matched rung ${i} (exit ${LADDER[i].code})`;
  });

for (const r of RUNGS)
  flow(`exit ${r.code}: ${r.what} matches rung ${r.at} and nothing above it`,
    r.why,
    async () => {
      const i = rungHit(ladderCtx(r.ctx));
      if (i !== r.at) return i < 0
        ? `nothing matched: the rung reads state its context does not carry`
        : `rung ${i} (exit ${LADDER[i].code}) matched first`;
      return LADDER[i].code === r.code || `rung ${r.at} is exit ${LADDER[i].code}, not ${r.code}`;
    });


failed += await runCases(FLOWS);

fs.rmSync(shimDir, { recursive: true, force: true });
process.exit(summarize(failed, CASES.length + FLOWS.length));
