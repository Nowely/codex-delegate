#!/usr/bin/env node
// A scripted stand-in for `codex app-server`, used by the suites under evals/.
//
// It speaks just enough of the protocol to drive scripts/driver.mjs through the paths that a live server
// makes hard to reach on demand: events attributed to the wrong turn, a completion that overtakes the
// response it depends on, a command that ran and failed, a server request nobody can answer.
//
// The scenario name arrives in FAKE_SCENARIO. Each scenario is a function of the request it is replying
// to, returning the raw lines to emit — deliberately as ONE write where the point is that the client
// cannot rely on chunk boundaries.

import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import { isDeepStrictEqual } from "node:util";
const canon = (p) => { try { return fs.realpathSync(p); } catch { return p ?? ""; } };
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const CODEX_VERSION = process.env.FAKE_CODEX_VERSION ?? "0.153.4";
const SCENARIO = process.env.FAKE_SCENARIO ?? "happy";

// Every scenario this fixture implements, and how the driver has to be invoked to reach it. Many of
// them are dispatched before the turn/start switch; both dispatch paths require a name in this inventory.
export const SCENARIOS = {
  happy: {}, "stale-turn": {}, "early-completion": {}, "foreign-thread": {}, "command-failed": {},
  "needs-user": {}, elicitation: {}, escalated: {}, "escalated-file-change": {},
  "escalated-apply-patch": {}, "escalated-exec-command": {}, "escalated-permissions": {},
  "escalated-subagent": {}, "turn-failed": {}, "transient-then-ok": {}, "transient-after-tool": {},
  "transient-always": {}, "wrong-command": {}, "no-answer": {}, "late-item": {},
  "double-completion": {}, "completion-foreign-thread": {}, "turn-start-error": {},
  "unknown-response-id": {}, "early-request": {}, "mcp-null-turn": {}, "no-ids-request": {},
  "blank-answer": {}, "failed-null-exit": {}, "blocked-command": {}, "file-changes": {},
  "probe-negative": {}, "probe-error": {}, "probe-compound": {}, "probe-multiline": {},
  "probe-piped": {}, "probe-quoted": {}, "hidden-failure": {}, "slow-turn": {}, "spawn-survivor": {}, "long-answer": {},
  "rich-items": {}, progress: {}, "echo-input": {}, "null-phase": {},
  // A seat that leaves work in $TMPDIR and names the path in its answer — the shape --brief asks for.
  "tmp-write": {},
  // The app-server process DIES mid-turn, after the thread and one command exist.
  "server-crash": {},
  // Two unbounded growth paths in the main transport: notifications with no turn/start response to
  // attribute them to, and a line that never ends.
  "early-flood": {}, "unterminated-line": {},
  // A single-action parse over a MULTI-LINE script: the server's own parse, taken at face value, would
  // read "probe, then the real work" as a probe answering no.
  "probe-laundered": {},
  // The thread's developerInstructions, handed back as the answer: the only way a case can read what
  // the driver told the seat to do.
  "echo-instructions": {},
  // The last message arrives WITHOUT its trailing newline and the stream then ends.
  "no-trailing-newline": {},
  "write-root-widened": {}, "write-full-access": {},
  // Decided at thread/start, so the turn/start switch never sees them.
  "profile-missing": {}, "profile-wrong": {}, "profile-effect-dropped": {}, "profile-widened": {},
  "profile-networked": {}, "write-networked": {}, "workspace-elsewhere": {}, "policy-clamped": {},
  "reviewer-auto": {},
  // Each needs a flag before its interesting messages are emitted at all.
  // The three rungs of the wall clock, each needing a budget the fixture cannot guess from the scenario
  // name alone — so the inventory carries it, as it already does for the stalled cases.
  //   wrap-up      the steer at T-reserve is the ONLY recovery (E1), so the reserve must fit: 65 s puts
  //                it 5 s in, which is the shortest budget the 60 s reserve floor allows.
  //   cut-flush    a server that DOES flush the in-flight answer when the turn is interrupted.
  //   cut-partial  the measured server, which does not: the deltas are the only copy.
  "wrap-up": { timeout: 65 }, "cut-flush": { timeout: 1 }, "cut-partial": { timeout: 1 },
  // The answer arrives and the turn never ends: the window a SIGKILL empties.
  "answer-then-stall": { timeout: 1 },
  // One command, then silence: only the idle guard tells this from a turn that is working.
  "idle-silence": { timeout: 1 },
  // The work is all on a SUBAGENT thread the server started under ours: the root says nothing for
  // seconds while the turn is plainly alive. Cut here on --idle-timeout 1 and the guard is a bug.
  "idle-subagent": { timeout: 1 },
  // The same two facts in the shape 0.153.4 actually emits, where a child announces itself through the
  // ROOT and never sends a thread/started of its own: a delegating turn, and a delegating turn whose
  // child works past the idle budget.
  delegation: {}, "idle-delegation": { timeout: 1 },
  // thread/start is never answered, so the deadline fires with no thread to report.
  "no-thread": { timeout: 0.5 },
  "resume-active": { resume: "thr_root" },
  "review-inline": { review: "uncommitted" },
  "review-broken": { review: "branch:nonexistent" },
  // The developerInstructions of a REVIEW turn, handed back as the review payload: the only way a case
  // can read what the driver told a reviewer it never writes the prompt for.
  "review-instructions": { review: "uncommitted" },
  "schema-good": { outputSchema: true }, "schema-retry": { outputSchema: true },
  "schema-never": { outputSchema: true }, "schema-retry-refused": { outputSchema: true },
  fork: { fork: "thr_parent", forkThrough: "turn_parent" },
  "model-unknown": { effort: "minimal" }, "rate-limited": {},
  compact: { resume: "thr_root", compact: true }, "turn-diff": {},
  "reasoning-summary": { reasoningSummary: "detailed" },
  "late-completion": { outputSchema: true, timeout: 0.4 },
  "stalled-turn": { timeout: 0.5 },
  // Six commands 150 ms apart, then an answer: the shape --max-commands bounds. It ends on its own when
  // nothing caps it, so the conformance suite drives it to completion like any other scenario.
  "many-commands": {},
  // 0.153.0: a question for a human arrives as a MESSAGE carrying `questions`, phased final_answer, then
  // the turn's real answer. Measured live on 0.153.4 with gpt-6-astra.
  "async-question": {},
};
if (!Object.hasOwn(SCENARIOS, SCENARIO)) {
  process.stderr.write(`fake-app-server: ${JSON.stringify(SCENARIO)} is not in SCENARIOS; an uninventoried name would answer as the default scenario and measure nothing\n`);
  process.exit(2);
}

// Importable as well as runnable: the suites read SCENARIOS and sampleItems() out of this module, and
// an import must not attach a reader to the importer's stdin.
const isMain = canon(process.argv[1] ?? "") === canon(fileURLToPath(import.meta.url));

// `codex sandbox` is a different entry point of the same binary, and --verify-sandboxed shells out to
// it. Without FAKE_SANDBOX the stand-in refuses it exactly as an installation that does not carry the
// subcommand does, which is the case the driver turns into a usage error. With it, the command after
// `--` is executed and its exit code passed through — measured live, that is what the real one does —
// so the argv the driver builds and the passthrough are both observable.
if (isMain && process.argv[2] === "sandbox") {
  if (!process.env.FAKE_SANDBOX) {
    process.stderr.write("error: unrecognized subcommand 'sandbox'\n");
    process.exit(2);
  }
  if (process.argv.includes("--help")) process.exit(0);
  const at = process.argv.indexOf("--");
  if (process.env.FAKE_RPC_LOG) {
    try { fs.appendFileSync(process.env.FAKE_RPC_LOG, `sandbox:${process.argv.slice(3, at).join(" ")}\n`); } catch {}
  }
  const argv = process.argv.slice(at + 1);
  const r = spawnSync(argv[0], argv.slice(1), { stdio: "inherit" });
  process.exit(r.status ?? 1);
}

// The -c config this server was spawned with, one `cfg:<key>` line each — the only way a suite can see
// a per-run grant that rides the spawn args (--mcp) rather than any file.
if (isMain && process.env.FAKE_RPC_LOG) {
  try {
    fs.appendFileSync(process.env.FAKE_RPC_LOG,
      process.argv.slice(2)
        .filter((a, i, all) => all[i - 1] === "-c" && a.includes("="))
        .map((a) => `cfg:${a.slice(0, a.indexOf("="))}\n`).join(""));
  } catch {}
}
// The driver passes its config as `-c key=value` spawn args, so the fixture can report back what it was
// actually told — which is the only way to test that a flag the driver DID NOT send stayed unsent.
const CFG = Object.fromEntries(process.argv.slice(2)
  .filter((a, i, all) => all[i - 1] === "-c" && a.includes("="))
  .map((a) => [a.slice(0, a.indexOf("=")), a.slice(a.indexOf("=") + 1)]));
if (isMain && process.env.FAKE_MCP_CONFIG_LOG && process.env.CODEX_HOME) {
  try {
    const body = fs.readFileSync(`${process.env.CODEX_HOME}/config.toml`, "utf8");
    if (body.includes("[mcp_servers.")) fs.writeFileSync(process.env.FAKE_MCP_CONFIG_LOG, body);
  } catch {}
}
const THREAD = "thr_root";
const TURN = "turn_root";
const OTHER_TURN = "turn_stale";
const OTHER_THREAD = "thr_sub";

// Every emitted line is logged for the conformance suite, which checks it against the pinned schemas
// so invented fields cannot silently pass.
const EMIT_LOG = process.env.FAKE_EMIT_LOG;
// The method being answered, so the log can say which response schema a `result` should be checked
// against. It rides in the LOG only — the stream the driver reads is untouched.
let answering = null;
// A few scenarios emit something the real server never would — that IS the scenario (a response to an
// id nobody sent). They carry __deliberatelyMalformed, which rides in the log and is stripped from the
// stream, so the conformance suite can exclude them BY NAME instead of a blanket allowance.
const w = (...objs) => {
  const line = objs.map(({ __deliberatelyMalformed, ...rest }) => JSON.stringify(rest)).join("\n") + "\n";
  if (EMIT_LOG) {
    try {
      fs.appendFileSync(EMIT_LOG, objs.map((o) =>
        JSON.stringify(o?.result !== undefined && o?.id !== undefined ? { ...o, __method: answering } : o)
      ).join("\n") + "\n");
    } catch {}
  }
  process.stdout.write(line);
};
// The same message written WITHOUT its trailing newline, followed by EOF: what a server that dies mid
// flush leaves behind, and a line a client must still frame. Logged like any other emission so the
// conformance suite validates it too.
const wEndMidLine = (obj) => {
  if (EMIT_LOG) { try { fs.appendFileSync(EMIT_LOG, `${JSON.stringify(obj)}\n`); } catch {} }
  process.stdout.write(JSON.stringify(obj));
  process.stdout.end();
};
const reply = (id, result) => ({ jsonrpc: "2.0", id, result });
const note = (method, params) => ({ jsonrpc: "2.0", method, params });

// Every message below carries the fields the pinned schema marks required; missing or invented fields
// can make the suite pass while production fails.
let seq = 0;
const now = () => 1780000000000 + (seq += 1);
const thread = (id) => ({
  id, sessionId: id, cliVersion: CODEX_VERSION, createdAt: 1780000000, updatedAt: 1780000000,
  cwd: "/tmp", ephemeral: false, modelProvider: "openai", preview: "", projectId: null,
  // ActiveThreadStatus REQUIRES activeFlags; only IdleThreadStatus is the bare {type}.
  source: "vscode", turns: [],
  status: SCENARIO === "resume-active" ? { type: "active", activeFlags: [] } : { type: "idle" }
});

// The server reports the WRAPPER it ran and carries the model's text in commandActions. Measured on
// codex 0.150.1: `/bin/zsh -c true`, `/bin/zsh -c 'grep -q zzz /dev/null'`, and
// `/bin/zsh -lc "git status --short && ..."`: bare words are unquoted, scripts carrying double quotes
// use escaped double quotes under -lc, and other scripts use single quotes.
const wrap = (command) =>
  /^[\w./=-]+$/.test(command) ? `/bin/zsh -c ${command}`
  : command.includes('"') ? `/bin/zsh -lc "${command.replaceAll('"', '\\"')}"`
  : `/bin/zsh -c '${command}'`;
// The server's best-effort parse. Only the PIPE split is modelled, because that is the one the schema
// itself names ("a single shell command may be composed of many commands piped together") — measured,
// a `&&` compound comes back as ONE action carrying the whole line. A grep is reported as a `search`
// action, everything else as `unknown`; the query and path VALUES are shape, not fidelity.
const actionsFor = (command) => command.split("|").map((s) => s.trim()).map((part) => {
  if (!/^(?:grep|rg|egrep|fgrep)\b/.test(part)) return { type: "unknown", command: part };
  const args = part.split(/\s+/).slice(1).filter((a) => !a.startsWith("-"));
  return { type: "search", command: part, query: args[0] ?? null, path: args[1] ?? null };
});
// `actions` is derived from the command like everything else here, and overridable for the one case that
// needs the server's parse to DISAGREE with the script it parsed — a server whose parse is optimistic is
// the threat the driver's single-action exemption has to survive.
const cmd = (turnId, threadId, { exitCode = 0, status = "completed", command = "echo hi",
                                 actions = actionsFor(command) } = {}) =>
  note("item/completed", {
    threadId, turnId, completedAtMs: now(),
    item: { id: `item_${seq}`, type: "commandExecution", command: wrap(command), exitCode, status,
            cwd: "/tmp", commandActions: actions, aggregatedOutput: null,
            processId: String(50000 + seq), durationMs: 1,
            source: "unifiedExecStartup", pluginId: null, scriptPath: null }
  });

// `id` is given only where a scenario streams the message first: a delta names the item it belongs to,
// so the completion that supersedes those deltas has to carry the same id.
const msg = (turnId, threadId, text, phase = "final_answer", id = null) =>
  note("item/completed", { threadId, turnId, completedAtMs: now(),
    item: { id: id ?? `item_${seq}`, type: "agentMessage", text, phase, delivery: null, memoryCitation: null } });

// One chunk of an answer as it is generated. AgentMessageDeltaNotification carries no phase — an
// in-flight message is unphased until its item/completed says otherwise — and that is the whole
// difficulty the driver's partial-answer capture has to live with.
const agentDelta = (turnId, threadId, itemId, delta) =>
  note("item/agentMessage/delta", { threadId, turnId, itemId, delta });

// The caller's own prompt, echoed back as an item at the top of every turn — a review turn included,
// where the server echoes the prompt IT built.
const userMsg = (turnId, threadId, text) =>
  note("item/completed", { threadId, turnId, completedAtMs: now(),
    item: { id: `item_${seq}`, type: "userMessage", clientId: null,
            content: [{ type: "text", text, text_elements: [] }] } });

// Both review items carry a STRING: enteredReviewMode the target ("current changes"), exitedReviewMode
// the review itself, as measured live and specified by the pinned schema.
const reviewItem = (turnId, threadId, type, review) =>
  note("item/completed", { threadId, turnId, completedAtMs: now(),
    item: { id: `item_${seq}`, type, review } });

const fileChangeItem = (turnId, threadId, { status = "completed", changes = [] } = {}) =>
  note("item/completed", { threadId, turnId, completedAtMs: now(),
    item: { id: `item_${seq}`, type: "fileChange", status, changes } });

// One thread/tokenUsage/updated — the server's own accounting, which reaches the report as tokenUsage.
// Measured (E2): one per API call, so one per command plus one for the final message, with `last` the
// call just made and `total` cumulative for the THREAD, earlier invocations included. The in/out split
// is shape; totalTokens is the number a coordinator reads.
const usage = (turnId, threadId, total, last) =>
  note("thread/tokenUsage/updated", { threadId, turnId, tokenUsage: {
    last: { inputTokens: last, cachedInputTokens: 0, outputTokens: 0, reasoningOutputTokens: 0, totalTokens: last },
    total: { inputTokens: total, cachedInputTokens: 0, outputTokens: 0, reasoningOutputTokens: 0, totalTokens: total },
    modelContextWindow: 272000 } });

const reasoningItem = (turnId, threadId, summary) =>
  note("item/completed", { threadId, turnId, completedAtMs: now(),
    item: { id: `item_${seq}`, type: "reasoning", summary, content: [] } });

// The ROOT's announcement of a child thread, as item/started and item/completed of ONE item. Measured on
// 0.153.4 this is the only place the client ever learns a child exists: the child itself sends no
// thread/started, and everything it does afterwards arrives under its own threadId.
const subAgentItem = (turnId, threadId, id, kind, agentThreadId, agentPath) =>
  ["item/started", "item/completed"].map((method) => note(method, {
    threadId, turnId, ...(method === "item/started" ? { startedAtMs: now() } : { completedAtMs: now() }),
    item: { id, type: "subAgentActivity", kind, agentThreadId, agentPath } }));

// One command in flight and then complete, under one item id: what a child emits, and the half of it a
// driver counting only completions would miss while the command is still running.
const cmdPair = (turnId, threadId, opts = {}) => {
  const startedAtMs = now();   // before the completion's clock, or the pair runs backwards
  const end = cmd(turnId, threadId, opts);
  return [note("item/started", { threadId, turnId, startedAtMs,
      item: { ...end.params.item, status: "inProgress", exitCode: null, aggregatedOutput: null, durationMs: null } }),
    end];
};

// A child thread waking up: the status change and the turn it opens, both under its own id.
const childTurnStart = (turnId, threadId) => [
  note("thread/status/changed", { threadId, status: { type: "active", activeFlags: [] } }),
  note("turn/started", { threadId, turn: { id: turnId, items: [], itemsView: "notLoaded",
    status: "inProgress", error: null, startedAt: 1780000000, completedAt: null, durationMs: null } }),
];

// One item of every type this fixture builds, from the same helpers the scenarios use, so a live
// differential can diff KEY SETS against the real server without driving a scenario per type.
export const sampleItems = () => [
  cmd(TURN, THREAD),
  msg(TURN, THREAD, "sample"),
  userMsg(TURN, THREAD, "sample"),
  reasoningItem(TURN, THREAD, ["sample"]),
  fileChangeItem(TURN, THREAD, { changes: [{ path: "/tmp/sample", kind: { type: "add" }, diff: "+x" }] }),
  reviewItem(TURN, THREAD, "enteredReviewMode", "current changes"),
  reviewItem(TURN, THREAD, "exitedReviewMode", "the review"),
].map((n) => n.params.item);

// Matches TurnCompletedNotification exactly: threadId and turn, and NO top-level turnId. A fixture that
// invents a field the server does not send makes the driver pass here and fail in production.
const done = (turnId, threadId, status = "completed", error = null) =>
  note("turn/completed", { threadId, turn: { id: turnId, status, error, items: [] } });

let requestedThread = null;
let pendingApproval = null;
let turnStarts = 0;
// Set by turn/interrupt: a scenario emitting on a timer must stop when the turn is cut, or it keeps
// writing items into a turn the client has already ended.
let interrupted = false;
const TURN2 = "turn_root_retry";

function onLine(line) {
  let m;
  try { m = JSON.parse(line); } catch { return; }
  // Every request method, appended as it arrives: the only way a suite can assert that the driver SENT
  // something whose effect is otherwise invisible (turn/interrupt on a run being torn down).
  if (process.env.FAKE_RPC_LOG && m.method) {
    // The steer TEXT rides along: for a channel whose failure mode is losing one correction, which ones
    // arrived and in what order is the whole question.
    const detail = m.method === "turn/steer"
      ? `:${String(m.params?.input?.[0]?.text ?? "").replace(/\s+/g, " ").slice(0, 200)}` : "";
    try { fs.appendFileSync(process.env.FAKE_RPC_LOG, `${m.method}${detail}\n`); } catch {}
  }
  if (m.method) answering = m.method;
  if (!m.method) {
    if (!pendingApproval || m.id !== pendingApproval.id) return;
    const p = pendingApproval;
    pendingApproval = null;
    const refusedAsSpecified = isDeepStrictEqual(m.result, p.expected);
    // A recognised approval with the wrong response shape still records an escalation in the driver.
    // Emit a command only for the schema-valid refusal so the protocol case pins the response as well as
    // the method classification, without making a malformed response wait for the suite's outer timeout.
    w(...(refusedAsSpecified ? [cmd(p.turnId, p.threadId, { command: `echo ${p.method}` })] : []),
      msg(p.turnId, p.threadId, `${p.method} ${refusedAsSpecified ? "refused" : "answered incorrectly"}`),
      done(p.turnId, p.threadId));
    return;
  }

  // The shape measured live, derived from the clientInfo the driver sent:
  // `Claude Code/0.150.1 (Mac OS 26.6.2; arm64) unknown (codex-delegate; 2.0)`. The server version is the
  // token after the first slash; FAKE_CODEX_VERSION drives the drift warning.
  if (m.method === "initialize") {
    const ci = m.params?.clientInfo ?? {};
    w(reply(m.id, {
      userAgent: `${ci.name ?? "unknown"}/${CODEX_VERSION} (Mac OS 26.6.2; arm64) unknown (${ci.title ?? "unknown"}; ${ci.version ?? "0"})`,
      codexHome: "/tmp", platformFamily: "unix", platformOs: "macos" }));
    return;
  }
  if (m.method === "initialized") return;
  if (m.method === "turn/interrupt") {
    interrupted = true;
    w(reply(m.id, {}));
    // A server that DOES flush the in-flight message when the turn is interrupted, and closes the turn
    // inside the driver's grace. Measured on 0.150.1 the live server does NOT (E1) — cut-partial is that
    // shape — but the driver has to be right for both, and only the flush produces completedInGrace.
    if (SCENARIO === "cut-flush")
      w(msg(TURN, THREAD, "flushed at the interrupt"), done(TURN, THREAD, "interrupted"));
    // A turn that CLOSES on the interrupt without flushing anything: the cut is recorded and the report
    // lands inside the grace. cut-partial deliberately does neither, so the grace expires there.
    if (SCENARIO === "idle-silence" || SCENARIO === "idle-subagent" || SCENARIO === "idle-delegation"
        || SCENARIO === "many-commands")
      w(done(TURN, THREAD, "interrupted"));
    return;
  }
  if (m.method === "turn/steer") {
    // The reply can be slow; corrections appended while a steer awaits acceptance must survive.
    const delay = Number(process.env.FAKE_STEER_DELAY_MS ?? 0);
    const answer = () => {
      // TurnSteerResponse REQUIRES turnId — a bare {} is a reply the driver cannot rely on, and only a
      // scenario that steers puts this response in front of the conformance suite at all.
      w(reply(m.id, { turnId: m.params?.expectedTurnId ?? TURN }));
      // The wrap-up rung: the steer TEXT is the only thing under test, so it comes straight back as the
      // answer — and answering ends the turn, which is what the rung is asking the model to do.
      if (SCENARIO === "wrap-up")
        w(cmd(TURN, THREAD), msg(TURN, THREAD, String(m.params?.input?.[0]?.text ?? "")), done(TURN, THREAD));
    };
    if (delay > 0) setTimeout(answer, delay);
    else answer();
    return;
  }

  // The config probe sends no -c values, so these replies use fixture fallbacks rather than CFG.
  // They model the caller's resolved config, which the driver asks the real server to read.
  if (m.method === "config/read") {
    // A probe whose ASKING fails, as opposed to a config with nothing in it — the driver must warn and
    // must not truncate a previously inherited config.
    if (process.env.FAKE_CONFIG_FAIL) {
      w({ jsonrpc: "2.0", id: m.id, error: { code: -32603, message: "config store unavailable" } });
      return;
    }
    // A probe that never answers: cancellation must preserve the shared home's last-known-good config.
    if (process.env.FAKE_CONFIG_HANG) return;
    const unquote = (v) => (v ?? "").replace(/^"|"$/g, "");
    w(reply(m.id, { config: {
      model: unquote(CFG["model"]) || "fake-model",
      model_reasoning_effort: unquote(CFG["model_reasoning_effort"]) || "medium",
      personality: unquote(CFG["personality"]) || "pragmatic",
      service_tier: unquote(CFG["service_tier"]) || "auto",
      // What --mcp asks the probe to carry across; one carriable server, one that is not.
      ...(process.env.FAKE_MCP ? { mcp_servers: {
        docs: { command: "docs-server", args: ["--port", "0"], env: { TOKEN: "t" } },
        search: { command: "search-server", args: ["--stdio"] },
        exotic: { command: "x", nested: { deep: true } },
        // Package-style name, legal since codex 0.152.0; it requires a quoted TOML key.
        "@acme/docs.v2": { command: "acme-docs", args: ["--stdio"] },
      } } : {}),
    }, origins: {} }));
    return;
  }

  if (m.method === "account/rateLimits/read") {
    // An older server, or a managed device: the method is REJECTED rather than answered. A run whose
    // thread has not started must survive that without a snapshot instead of aborting.
    if (process.env.FAKE_RATELIMITS_ERROR) {
      w({ jsonrpc: "2.0", id: m.id, error: { code: -32601, message: "Method not found" } });
      return;
    }
    w(reply(m.id, { rateLimits: {
      primary: { usedPercent: SCENARIO === "rate-limited" ? 100 : 25,
                 windowDurationMins: 300, resetsAt: 1780003600 }
    }, rateLimitsByLimitId: null, rateLimitResetCredits: null }));
    return;
  }

  if (m.method === "model/list") {
    const efforts = ["none", "low", "medium", "high", "xhigh", "max", "ultra"];
    w(reply(m.id, { data: [{
      id: "fake-model", model: "fake-model", displayName: "Fake Model",
      description: "Fixture model", hidden: false, isDefault: true,
      defaultReasoningEffort: "medium",
      supportedReasoningEfforts: efforts.map((reasoningEffort) => ({ reasoningEffort, description: reasoningEffort }))
    }], nextCursor: null }));
    return;
  }

  if (m.method === "thread/start" || m.method === "thread/resume" || m.method === "thread/fork") {
    // Never answered: the deadline then fires with a child but no thread, the one rung of the wall clock
    // that has nothing to report and must abort instead.
    if (SCENARIO === "no-thread") return;
    requestedThread = m.params;
    // Derive fields from the driver's -c config and thread/start params so omitted grants and approval
    // settings remain observable; scenarios override derived values explicitly.
    const writeLevel = m.params?.sandbox !== undefined;
    const tmp = process.env.TMPDIR ?? os.tmpdir();

    // The profile applies only if the driver asked for one AND defined it. Sending `sandbox` suppresses
    // it, exactly as the live server does.
    const wantId = (CFG["default_permissions"] ?? "").replace(/^"|"$/g, "");
    const defined = wantId && CFG[`permissions.${wantId}.extends`] !== undefined;
    let profile = (writeLevel || !defined) ? null
      : { id: wantId, extends: (CFG[`permissions.${wantId}.extends`] ?? "").replace(/^"|"$/g, "") };
    if (SCENARIO === "profile-missing") profile = null;
    if (SCENARIO === "profile-wrong") profile = { id: ":workspace", extends: null };

    // The $TMPDIR grant exists only because the profile's filesystem entry asked for it — misspell that
    // field and the live server silently drops the grant while keeping the profile id.
    const granted = defined && CFG[`permissions.${wantId}.filesystem`] !== undefined;
    // Measured live: read-level :tmpdir roots are canonicalised before comparison with cwd as given,
    // while write-level roots are echoed verbatim and compared as strings. A matching cwd is omitted from
    // writableRoots and reported under runtimeWorkspaceRoots; canonicalising both sides would hide the
    // difference between /var/... and /private/var/... spellings.
    const readRoots = (!granted || canon(tmp) === m.params?.cwd) ? [] : [canon(tmp)];
    const writeRoots = [...new Set(JSON.parse(CFG["sandbox_workspace_write.writable_roots"] ?? "[]"))]
      .filter((r) => r !== m.params?.cwd);

    let sb = writeLevel
      ? { type: "workspaceWrite", writableRoots: writeRoots,
          networkAccess: CFG["sandbox_workspace_write.network_access"] === "true",
          excludeTmpdirEnvVar: false, excludeSlashTmp: false }
      : granted
        ? { type: "workspaceWrite", writableRoots: readRoots,
            networkAccess: false, excludeTmpdirEnvVar: false, excludeSlashTmp: true }
        // No filesystem grant means a plain read-only sandbox with no roots at all.
        : { type: "readOnly", networkAccess: false };
    // Deliberate server misbehaviours, each overriding the derived value so the override is obvious.
    if (SCENARIO === "profile-effect-dropped") sb = { type: "readOnly", networkAccess: false };
    if (SCENARIO === "profile-widened") sb = { ...sb, writableRoots: [...(sb.writableRoots ?? []), process.cwd()] };
    if (SCENARIO === "profile-networked" || SCENARIO === "write-networked") sb = { ...sb, networkAccess: true };
    // The widened root is derived from the requested cwd, rather than a fixture-only literal that could
    // accidentally agree with a driver bug. Its parent exists and is strictly broader than the cwd.
    if (SCENARIO === "write-root-widened")
      sb = { ...sb, writableRoots: [...(sb.writableRoots ?? []), canon(`${m.params.cwd}/..`)] };
    if (SCENARIO === "write-full-access") sb = { type: "dangerFullAccess" };
    // A workspace missing cwd is a sandbox mismatch; measured live, workspace roots are cwd AS GIVEN
    // plus every extra writable root, so the fixture must echo those extra roots too.
    const workspace = SCENARIO === "workspace-elsewhere"
      ? ["/tmp/somewhere-else"]
      // The cwd as given, then the extra roots as given, deduped by exact string — the server does no
      // canonicalisation here either.
      : [...new Set([m.params?.cwd ?? "/tmp", ...(writeLevel ? writeRoots : [])])];

    w(reply(m.id, {
      thread: thread(THREAD),
      // Use a plausible model name for live fidelity comparisons. FAKE_MODEL_ECHO instead reports the
      // request so an omitted model and a hardcoded one remain distinguishable.
      model: process.env.FAKE_MODEL_ECHO
        ? (m.params?.model == null ? "inherited" : `explicit:${m.params.model}`)
        : (m.params?.model ?? (CFG["model"] ?? "fake-model").replace(/^"|"$/g, "")),
      modelProvider: "openai", cwd: m.params?.cwd ?? "/tmp",
      // null when the driver sent no -c override, exactly as the live server reports an inherited value.
      reasoningEffort: CFG["model_reasoning_effort"] ?? null,
      runtimeWorkspaceRoots: workspace,
      // Echo the approval policy so the on-request contract remains observable.
      // Clamping is what an MDM profile actually does to a policy it does not permit — the failure this
      // whole driver exists to route around, and it is invisible in every other field.
      approvalPolicy: SCENARIO === "policy-clamped" ? "untrusted" : (m.params?.approvalPolicy ?? "never"),
      // Who may approve is separate from what the sandbox permits: auto_review bypasses this driver
      // without changing the sandbox object. Echo the requested value, using null for an absent field so
      // an omitted pin cannot look like a successful one; the real server's default is not measured.
      approvalsReviewer: SCENARIO === "reviewer-auto" ? "auto_review" : (m.params?.approvalsReviewer ?? null),
      activePermissionProfile: profile,
      sandbox: sb
    }));
    return;
  }

  if (m.method === "thread/compact/start") {
    w(reply(m.id, {}));
    return;
  }

  // A review whose own git commands fail and which produces NO review payload: the flag alone must
  // not waive a genuine failure.
  if (m.method === "review/start" && SCENARIO === "review-broken") {
    const R = reply(m.id, { reviewThreadId: m.params?.threadId ?? THREAD,
      turn: { id: TURN, status: "inProgress", items: [], error: null } });
    w(R, cmd(TURN, THREAD, { command: "git diff nonexistent-ref", exitCode: 128, status: "failed" }),
      msg(TURN, THREAD, "I could not inspect that ref."), done(TURN, THREAD));
    return;
  }

  // What the THREAD was told, returned as the review itself. A review turn's prompt is the server's,
  // so the developerInstructions are the only text the driver contributes to it.
  if (m.method === "review/start" && SCENARIO === "review-instructions") {
    const R = reply(m.id, { reviewThreadId: m.params?.threadId ?? THREAD,
      turn: { id: TURN, status: "inProgress", items: [], error: null } });
    w(R, reviewItem(TURN, THREAD, "exitedReviewMode", String(requestedThread?.developerInstructions ?? "")),
      done(TURN, THREAD));
    return;
  }

  if (m.method === "review/start") {
    // Inline review: the turn runs on the caller's thread; the review payload arrives as the
    // exitedReviewMode item and the turn completes with no commands at all.
    const R = reply(m.id, { reviewThreadId: m.params?.threadId ?? THREAD,
      turn: { id: TURN, status: "inProgress", items: [], error: null } });
    w(R,
      // The order a live review arrives in: the mode is entered, the reviewer works, the review comes
      // back as the exit payload. The echoed userMessage is the prompt the SERVER built, not ours.
      reviewItem(TURN, THREAD, "enteredReviewMode", "current changes"),
      userMsg(TURN, THREAD, "Review the current code changes (staged, unstaged, and untracked files) and provide prioritized findings."),
      // A failing probe of the reviewer's own, and a failure that is NOT a probe — measured live, real
      // reviews run both as their working method, and neither may turn the run into exit 11 once a
      // review has actually arrived.
      cmd(TURN, THREAD, { command: "grep -n clamp src/util.mjs", exitCode: 1, status: "failed" }),
      cmd(TURN, THREAD, { command: "cat src/util.mjs.orig", exitCode: 1, status: "failed" }),
      // A review costs tokens like any other turn, and the server reports them the same way.
      usage(TURN, THREAD, 900, 900),
      reviewItem(TURN, THREAD, "exitedReviewMode",
        "Needs work: off-by-one in clamp — the loop stops early."),
      done(TURN, THREAD));
    return;
  }

  if (m.method === "turn/start") {
    turnStarts++;
    // The corrective turn under --output-schema is a SECOND turn/start on the same thread; it must get
    // its own turn id, or the driver's replay-and-attribute logic is never exercised across turns.
    const thisTurn = turnStarts === 1 ? TURN : TURN2;
    const R = reply(m.id, { turn: { id: thisTurn, status: "inProgress", items: [], error: null } });
    const prompt = m.params?.input?.[0]?.text ?? "";
    // A schema scenario must receive outputSchema on turn/start, including the corrective turn.
    // Without it, return prose that cannot match the schema so local validation alone cannot pass the case.
    const schemaSent = m.params?.outputSchema !== undefined && m.params?.outputSchema !== null;
    const schemaAnswer = (json) => schemaSent ? json : "the server was sent no outputSchema";
    const askApproval = (method, params, expected) => {
      const id = 9300 + Number(m.id);
      pendingApproval = { id, method, expected, threadId: m.params.threadId, turnId: TURN };
      w(R, { jsonrpc: "2.0", id, method, params });
    };
    // The live server opens every turn by echoing the input back as a userMessage item — AFTER the
    // turn/start response, never before it. Emitted after the switch for that reason. Skipped only where
    // the turn/start itself is refused below: there would be no turn for the item to belong to.
    // no-trailing-newline ends the stream inside its own case, so it emits the echo there instead.
    const echoesInput = !(SCENARIO === "turn-start-error" || SCENARIO === "no-trailing-newline"
      || (SCENARIO === "schema-retry-refused" && turnStarts === 2));
    switch (SCENARIO) {
      // Everything the driver should accept — including the token-usage notification a live server
      // streams, so the report's accounting is pinned by the ordinary case.
      case "happy":
        w(R, cmd(TURN, THREAD),
          note("thread/tokenUsage/updated", { threadId: THREAD, turnId: TURN, tokenUsage: {
            last: { inputTokens: 100, cachedInputTokens: 20, outputTokens: 30, reasoningOutputTokens: 5, totalTokens: 135 },
            total: { inputTokens: 100, cachedInputTokens: 20, outputTokens: 30, reasoningOutputTokens: 5, totalTokens: 135 },
            modelContextWindow: 272000 } }),
          // A SUBAGENT thread's usage, arriving after the root's and carrying a different total. Codex
          // spawns its own threads and this notification is per-thread; without a competing event the
          // root-thread filter could be deleted and the assertion below still read 135.
          note("thread/tokenUsage/updated", { threadId: "thr_child", turnId: TURN, tokenUsage: {
            last: { inputTokens: 9000, cachedInputTokens: 0, outputTokens: 900, reasoningOutputTokens: 0, totalTokens: 9900 },
            total: { inputTokens: 9000, cachedInputTokens: 0, outputTokens: 900, reasoningOutputTokens: 0, totalTokens: 9900 },
            modelContextWindow: 272000 } }),
          msg(TURN, THREAD, "the answer"), done(TURN, THREAD));
        break;

      case "fork":
        w(R, cmd(TURN, THREAD), msg(TURN, THREAD, JSON.stringify(requestedThread)), done(TURN, THREAD));
        break;

      // request_user_input_async: the question is an agentMessage with `questions` and delivery "async",
      // phased final_answer — the shape 0.153.4 emits — followed by the turn's real, unphased answer.
      case "async-question":
        w(R, cmd(TURN, THREAD),
          note("item/completed", { threadId: THREAD, turnId: TURN, completedAtMs: now(),
            item: { id: `item_${seq}`, type: "agentMessage", text: "Which database should I use?\n- postgres\n- sqlite",
                    phase: "final_answer", delivery: "async", memoryCitation: null,
                    questions: [{ title: "Which database should I use?", options: ["postgres", "sqlite"] }] } }),
          msg(TURN, THREAD, "DONE-ANSWER", null), done(TURN, THREAD));
        break;

      case "compact":
        w(R, cmd(TURN, THREAD), msg(TURN, THREAD, "compacted, then answered"), done(TURN, THREAD));
        break;

      case "turn-diff":
        w(R, cmd(TURN, THREAD),
          note("turn/diff/updated", { threadId: THREAD, turnId: TURN, diff: "first diff\n" }),
          note("turn/diff/updated", { threadId: THREAD, turnId: TURN, diff: "last diff\n" }),
          msg(TURN, THREAD, "diff saved"), done(TURN, THREAD));
        break;

      case "reasoning-summary":
        w(R, cmd(TURN, THREAD), msg(TURN, THREAD, JSON.stringify({ summary: m.params?.summary ?? null })),
          done(TURN, THREAD));
        break;

      // --output-schema: a valid object on the first try.
      case "schema-good":
        w(R, cmd(TURN, THREAD), msg(TURN, THREAD, schemaAnswer('{"verdict":"ok","count":3}')), done(TURN, THREAD));
        break;

      // --output-schema: PHASED prose first, an UNPHASED valid object on the corrective turn.
      // The retry's answer must supersede the first turn's answer regardless of phase.
      case "schema-retry":
        w(R, cmd(thisTurn, THREAD),
          turnStarts === 1
            ? msg(thisTurn, THREAD, "I think the verdict is ok.")
            : msg(thisTurn, THREAD, schemaAnswer('{"verdict":"ok","count":3}'), null),
          done(thisTurn, THREAD));
        break;

      // --output-schema: the corrective turn/start itself is refused by the server.
      case "schema-retry-refused":
        if (turnStarts === 1)
          w(R, cmd(TURN, THREAD), msg(TURN, THREAD, "not json at all"), done(TURN, THREAD));
        else
          w({ jsonrpc: "2.0", id: m.id, error: { code: -32603, message: "no capacity for a second turn" } });
        break;

      // The turn completes AFTER the driver's deadline already fired and reported. Nothing here may
      // start new work: the settled guard is the only thing between this and a corrective turn on a
      // run that declared itself timed out.
      case "late-completion":
        w(R);
        // 450ms: after the driver's 400ms deadline has reported, before its teardown finishes — the
        // only window in which an unguarded completion could start new work.
        setTimeout(() => w(cmd(TURN, THREAD), msg(TURN, THREAD, "too late"), done(TURN, THREAD)), 450);
        break;

      // --output-schema: wrong shape on both attempts (valid JSON, missing the required key).
      case "schema-never":
        w(R, cmd(thisTurn, THREAD), msg(thisTurn, THREAD, '{"something":"else"}'), done(thisTurn, THREAD));
        break;

      // Write-level sandbox guards must stop the turn before any of this otherwise-valid work runs.
      case "write-root-widened":
      case "write-full-access":
        w(R, cmd(TURN, m.params.threadId), msg(TURN, m.params.threadId, "the answer"), done(TURN, m.params.threadId));
        break;

      // The turn/start response is enough to establish the turn, but no terminal notification follows.
      case "stalled-turn":
      // The turn stalls until the driver cuts it; the interrupt handler above decides what the cut finds.
      case "cut-flush":
      // Nothing until the wrap-up steer arrives; the steer handler above answers it.
      case "wrap-up":
        w(R);
        break;

      // The E1 shape: the answer is STREAMING when the cut lands and the server discards it, so the
      // deltas are the only copy. The commentary message is streamed too and then COMPLETED, so a
      // partial can never be text the server already delivered.
      case "cut-partial":
        w(R,
          agentDelta(TURN, THREAD, "item_c1", "looking "),
          agentDelta(TURN, THREAD, "item_c1", "into it"),
          msg(TURN, THREAD, "looking into it", "commentary", "item_c1"),
          agentDelta(TURN, THREAD, "item_a1", "The answer so far"),
          agentDelta(TURN, THREAD, "item_a1", ", and this much more"));
        break;

      // The seat writes into $TMPDIR and names the file in its answer, which is what --brief tells it to
      // do with anything long. No command really runs here, so the fixture performs the write the seat's
      // command would: what is under test is whether the driver's teardown takes that file with it.
      case "tmp-write": {
        const f = path.join(process.env.TMPDIR ?? os.tmpdir(), "seat-note.txt");
        try { fs.writeFileSync(f, "the seat's long output\n"); } catch {}
        w(R, cmd(TURN, THREAD), msg(TURN, THREAD, `full notes at ${f}`), done(TURN, THREAD));
        break;
      }

      // One command, then nothing at all: the shape --timeout cannot tell from a turn that is working.
      case "idle-silence":
        w(R, cmd(TURN, THREAD));
        break;

      // The same silence on the ROOT thread, while a subagent thread the server started under ours
      // works steadily: twelve reasoning items 300 ms apart, well past a 1 s idle budget. The child's
      // own command and usage ride along, so a fix that let a child satisfy the evidence gates instead
      // of merely proving liveness is visible as a wrong exit code rather than a passing case.
      case "idle-subagent": {
        w(R, note("thread/started", { thread: { ...thread("thr_child"), id: "thr_child", parentThreadId: THREAD } }),
          cmd(TURN, THREAD), usage(TURN, THREAD, 100, 100), usage(TURN, "thr_child", 5000, 5000));
        let n = 0;
        const iv = setInterval(() => {
          w(reasoningItem("turn_child", "thr_child", [`child thinking ${n}`]));
          if (++n >= 12) { clearInterval(iv); w(msg(TURN, THREAD, "root answered after the subagent"), done(TURN, THREAD)); }
        }, 300);
        break;
      }

      // The delegating turn as 0.153.4 emits it: the root announces the child, the child does all the
      // work under its own threadId, the root announces the child's completion and answers out of what
      // the child found. No thread/started for the child anywhere, and no command on the root: exactly
      // the run that used to report subagentThreads [] and read as a dead turn.
      case "delegation": {
        const [annStart, annStartEnd] = subAgentItem(TURN, THREAD, "call_sub", "started", "thr_child", "/root/count_readme");
        const [annDone, annDoneEnd] = subAgentItem(TURN, THREAD, "subagent-completed-1", "completed", "thr_child", "/root/count_readme");
        w(R,
          // The child's first sign of life precedes its announcement (capture line 34): an idle status
          // under an id nobody has registered yet, which has to be harmless.
          note("thread/status/changed", { threadId: "thr_child", status: { type: "idle" } }),
          annStart, annStartEnd,
          ...childTurnStart("turn_child", "thr_child"),
          ...cmdPair("turn_child", "thr_child", { command: "wc -l README.md" }),
          usage("turn_child", "thr_child", 15428, 15428),
          msg("turn_child", "thr_child", "README.md: 248"),
          note("thread/status/changed", { threadId: "thr_child", status: { type: "idle" } }),
          // The completion announcement opens before the child's turn/completed and closes after it
          // (capture lines 66 to 68).
          annDone, done("turn_child", "thr_child"), annDoneEnd,
          // The root's own accounting, arriving after the child's and smaller than it: the report's
          // tokenUsage is the ROOT's, and a delegating turn is where that filter earns its keep.
          usage(TURN, THREAD, 87832, 14871),
          msg(TURN, THREAD, "README.md: 248"), done(TURN, THREAD));
        break;
      }

      // The same announcement, and then the root goes quiet for well past a 1 s idle budget while the
      // announced child works: twelve commands 300 ms apart. Nothing on the root rearms the guard, so a
      // driver that treats only root events as liveness cuts a turn that is plainly alive.
      case "idle-delegation": {
        w(R, cmd(TURN, THREAD), usage(TURN, THREAD, 100, 100),
          ...subAgentItem(TURN, THREAD, "call_sub", "started", "thr_child", "/root/counter"),
          ...childTurnStart("turn_child", "thr_child"));
        let n = 0;
        const iv = setInterval(() => {
          if (interrupted) { clearInterval(iv); return; }
          w(...cmdPair("turn_child", "thr_child", { command: `wc -l file${n}.md` }));
          if (++n >= 12) {
            clearInterval(iv);
            w(done("turn_child", "thr_child"),
              ...subAgentItem(TURN, THREAD, "subagent-completed-1", "completed", "thr_child", "/root/counter"),
              msg(TURN, THREAD, "the root answered after its child"), done(TURN, THREAD));
          }
        }, 300);
        break;
      }

      // Six commands, one every 150 ms, then an answer. Nothing here is silent and nothing is expensive,
      // so only a count bounds it: this is the loop --max-commands exists for.
      case "many-commands": {
        w(R);
        let n = 0;
        const iv = setInterval(() => {
          if (interrupted) { clearInterval(iv); return; }
          w(cmd(TURN, THREAD, { command: `echo step ${n}` }));
          if (++n >= 6) { clearInterval(iv); w(msg(TURN, THREAD, "six commands later"), done(TURN, THREAD)); }
        }, 150);
        break;
      }

      // The answer arrives and the turn then never ends: the window in which a SIGKILL takes the answer
      // with it unless it was written down before the report was built.
      case "answer-then-stall":
        w(R, cmd(TURN, THREAD), msg(TURN, THREAD, "the answer, persisted before the kill"));
        break;

      // A command from an EARLIER turn on our own thread, plus that turn's answer. Nothing belonging to
      // the current turn ever runs. Thread-only filtering accepts this and reports success.
      case "stale-turn":
        w(R, cmd(OTHER_TURN, THREAD), msg(OTHER_TURN, THREAD, "answer from an old turn"), done(TURN, THREAD));
        break;

      // The completion overtakes the response that establishes the turn id — same write, so the client
      // sees them in one synchronous burst.
      case "early-completion":
        w(done(TURN, THREAD), cmd(TURN, THREAD), msg(TURN, THREAD, "raced answer"), R);
        break;

      // A subagent on another thread does the work and finishes.
      case "foreign-thread":
        w(R, cmd(TURN, OTHER_THREAD), msg(TURN, OTHER_THREAD, "subagent answer"), done(TURN, THREAD));
        break;

      // The only command ran and failed. `false` exits 1.
      case "command-failed":
        w(R, cmd(TURN, THREAD, { exitCode: 1, status: "failed", command: "false" }),
          msg(TURN, THREAD, "claiming success anyway"), done(TURN, THREAD));
        break;

      // A request no unattended client can satisfy.
      case "needs-user":
        w(R, { jsonrpc: "2.0", id: 9003, method: "item/tool/requestUserInput", params: { threadId: THREAD, turnId: TURN, itemId: "item_q", isBlocking: true, questions: [{ id: "q1", header: "choice", question: "which?", options: null }] } });
        setTimeout(() => w(cmd(TURN, THREAD), msg(TURN, THREAD, "carried on regardless"), done(TURN, THREAD)), 30);
        break;

      // An MCP form. Declining is right; calling it a sandbox problem is not.
      case "elicitation":
        w(R, { jsonrpc: "2.0", id: 9001, method: "mcpServer/elicitation/request", params: { threadId: THREAD, turnId: TURN, serverName: "fake", mode: "form", message: "fill this in", requestedSchema: { type: "object", properties: {} } } });
        setTimeout(() => w(cmd(TURN, THREAD), msg(TURN, THREAD, "carried on"), done(TURN, THREAD)), 30);
        break;

      // An approval refused, and consequently nothing ran.
      case "escalated":
        w(R, { jsonrpc: "2.0", id: 9002, method: "item/commandExecution/requestApproval",
               params: { threadId: THREAD, turnId: TURN, itemId: "item_a", startedAtMs: now(), command: "rm -rf /" } });
        // What a refusal leaves behind, measured live: the item completes DECLINED with no exit code.
        // The second is probe-shaped: a declined command is never a probe answering "no".
        setTimeout(() => w(cmd(TURN, THREAD, { command: "rm -rf /", exitCode: null, status: "declined" }),
          cmd(TURN, THREAD, { command: "grep -q root /etc/master.passwd", exitCode: 1, status: "declined" }),
          msg(TURN, THREAD, "could not proceed"), done(TURN, THREAD)), 30);
        break;

      // Each approval method has its own response schema. These requests derive their ids, cwd, command
      // and proposed changes from the turn/thread requests; only the protocol discriminants are literals.
      case "escalated-file-change":
        askApproval("item/fileChange/requestApproval", {
          threadId: m.params.threadId, turnId: TURN, itemId: `item_${m.id}`,
          startedAtMs: now(), reason: prompt
        }, { decision: "decline" });
        break;

      case "escalated-apply-patch":
        askApproval("applyPatchApproval", {
          conversationId: m.params.threadId, callId: `call_${m.id}`,
          fileChanges: { [`${requestedThread.cwd}/approval-${m.id}.txt`]: { type: "add", content: prompt } }
        }, { decision: "abort" });
        break;

      case "escalated-exec-command":
        askApproval("execCommandApproval", {
          conversationId: m.params.threadId, callId: `call_${m.id}`, command: [prompt],
          cwd: requestedThread.cwd, parsedCmd: [{ type: "unknown", cmd: prompt }]
        }, { decision: "abort" });
        break;

      case "escalated-permissions":
        askApproval("item/permissions/requestApproval", {
          threadId: m.params.threadId, turnId: TURN, itemId: `item_${m.id}`,
          cwd: requestedThread.cwd, startedAtMs: now(),
          permissions: { fileSystem: { write: [requestedThread.cwd] }, network: null }, reason: prompt
        }, { permissions: { fileSystem: null, network: null } });
        break;

      case "turn-failed":
        w(R, cmd(TURN, THREAD), done(TURN, THREAD, "failed", { codexErrorInfo: "serverOverloaded", message: "busy" }));
        break;

      // A transient stream failure before ANY observable work, then a clean second turn: the one shape
      // the driver retries. The first turn emits nothing but its failure.
      case "transient-then-ok":
        if (turnStarts === 1)
          w(R, done(TURN, THREAD, "failed", { codexErrorInfo: { responseStreamDisconnected: { httpStatusCode: null } }, message: "stream lost" }));
        else
          w(R, cmd(thisTurn, THREAD), msg(thisTurn, THREAD, "recovered answer"), done(thisTurn, THREAD));
        break;

      // A transient failure AFTER an MCP tool call that had a side effect, and nothing else. The
      // retry guard must count that item: replaying the prompt would file the ticket twice.
      case "transient-after-tool":
        w(R, note("item/completed", { threadId: THREAD, turnId: TURN, completedAtMs: now(),
            item: { id: "item_m1", type: "mcpToolCall", server: "tracker", tool: "create_ticket",
                    arguments: "{}", status: "completed", result: null, error: null, durationMs: 5 } }),
          done(TURN, THREAD, "failed", { codexErrorInfo: { responseStreamDisconnected: { httpStatusCode: null } }, message: "stream lost" }));
        break;

      // The same transient cause on BOTH turns: one retry is the whole budget.
      case "transient-always":
        w(R, done(thisTurn, THREAD, "failed", { codexErrorInfo: { responseStreamDisconnected: { httpStatusCode: null } }, message: "stream lost" }));
        break;

      // A successful command that is not the one the caller demanded.
      case "wrong-command":
        w(R, cmd(TURN, THREAD, { command: "sed -n 1,10p ~/.codex/skills/x/SKILL.md" }),
          msg(TURN, THREAD, "read my own docs"), done(TURN, THREAD));
        break;

      // Commentary only: no final answer at all.
      case "no-answer":
        w(R, cmd(TURN, THREAD), msg(TURN, THREAD, "thinking out loud", "commentary"), done(TURN, THREAD));
        break;

      // An item that arrives AFTER the turn has completed. finish() has already settled, so it must not
      // be able to retroactively supply the evidence the turn lacked.
      case "late-item":
        w(R, done(TURN, THREAD));
        setTimeout(() => w(cmd(TURN, THREAD), msg(TURN, THREAD, "arrived too late")), 40);
        break;

      // Two completions for the same turn. The second must not re-open or re-report anything.
      case "double-completion":
        w(R, cmd(TURN, THREAD), msg(TURN, THREAD, "the answer"), done(TURN, THREAD), done(TURN, THREAD, "failed"));
        break;

      // A completion for OUR turn id but delivered on a foreign thread.
      case "completion-foreign-thread":
        w(R, done(TURN, OTHER_THREAD));
        setTimeout(() => w(cmd(TURN, THREAD), msg(TURN, THREAD, "real work"), done(TURN, THREAD)), 40);
        break;

      // turn/start fails outright. There is no turn, so there can be no success.
      case "turn-start-error":
        w({ jsonrpc: "2.0", id: m.id, error: { code: -32603, message: "no capacity" } });
        break;

      // A response carrying an id nobody sent, then the real one.
      case "unknown-response-id":
        w({ jsonrpc: "2.0", id: 4242, result: { thread: { id: "bogus" }, turn: { id: "bogus" } },
            __deliberatelyMalformed: "a response to an id nobody sent; a well-formed one would not test that it is discarded" },
          R, cmd(TURN, THREAD), msg(TURN, THREAD, "fine"), done(TURN, THREAD));
        break;

      // A blocking request that arrives BEFORE the turn/start response, so no root turn id exists yet.
      case "early-request":
        w({ jsonrpc: "2.0", id: 9101, method: "item/tool/requestUserInput",
            params: { threadId: THREAD, turnId: TURN, itemId: "item_q", isBlocking: true, questions: [] } },
          R, cmd(TURN, THREAD), msg(TURN, THREAD, "carried on"), done(TURN, THREAD));
        break;

      // MCP elicitation with a null turnId, which the schema allows.
      case "mcp-null-turn":
        w(R, { jsonrpc: "2.0", id: 9102, method: "mcpServer/elicitation/request",
               params: { threadId: THREAD, turnId: null, serverName: "fake", mode: "form", message: "?", requestedSchema: { type: "object", properties: {} } } });
        setTimeout(() => w(cmd(TURN, THREAD), msg(TURN, THREAD, "carried on"), done(TURN, THREAD)), 30);
        break;

      // A request carrying no thread or turn at all.
      case "no-ids-request":
        w(R, { jsonrpc: "2.0", id: 9103, method: "attestation/generate", params: {} });
        setTimeout(() => w(cmd(TURN, THREAD), msg(TURN, THREAD, "carried on"), done(TURN, THREAD)), 30);
        break;

      // A final answer made only of whitespace.
      case "blank-answer":
        w(R, cmd(TURN, THREAD), msg(TURN, THREAD, "   \n  "), done(TURN, THREAD));
        break;

      // The schema allows a FAILED command with exitCode null; absence of a numeric code must not
      // hide the failure or report the command as one that never ran.
      case "failed-null-exit":
        w(R, cmd(TURN, THREAD, { command: "cat README.md" }),
          cmd(TURN, THREAD, { command: "pnpm -w exec vitest run", exitCode: null, status: "failed" }),
          msg(TURN, THREAD, "All tests pass."), done(TURN, THREAD));
        break;

      // An approval refused on a SUBAGENT's thread still blocks that subagent and must be recorded.
      case "escalated-subagent":
        w(R, { jsonrpc: "2.0", id: 9201, method: "item/commandExecution/requestApproval",
               params: { threadId: OTHER_THREAD, turnId: TURN, itemId: "item_s", startedAtMs: now(), command: "rm -rf /" } });
        // The declined item completes on the SUBAGENT's thread, where the command was going to run;
        // it must not count as root evidence.
        setTimeout(() => w(cmd(TURN, THREAD),
          cmd(TURN, OTHER_THREAD, { command: "rm -rf /", exitCode: null, status: "declined" }),
          msg(TURN, THREAD, "done"), done(TURN, THREAD)), 30);
        break;

      // A turn that WROTE files: one applied, one that failed to apply. Both must reach the report,
      // and the failed patch must reach the exit ladder.
      case "file-changes":
        w(R, cmd(TURN, THREAD),
          fileChangeItem(TURN, THREAD, { changes: [{ path: "/tmp/wrote.txt", kind: { type: "add" }, diff: "+hello" }] }),
          fileChangeItem(TURN, THREAD, { status: "failed",
            changes: [{ path: "/tmp/nope.txt", kind: { type: "update", move_path: null }, diff: "+x" }] }),
          fileChangeItem(TURN, THREAD, {
            changes: [{ path: "/tmp/old.txt", kind: { type: "update", move_path: "/tmp/new.txt" }, diff: "rename" }] }),
          msg(TURN, THREAD, "Wrote both files."), done(TURN, THREAD));
        break;

      // A command with NO verdict: no exit code, and neither failed nor declined, as with an interrupted
      // command. A success beside it must not hide the unresolved command.
      case "blocked-command":
        w(R, cmd(TURN, THREAD, { command: "sed -n 1,40p README.md" }),
          cmd(TURN, THREAD, { command: "pnpm -w exec vitest run", exitCode: null, status: "inProgress" }),
          msg(TURN, THREAD, "All tests pass."), done(TURN, THREAD));
        break;

      // A research turn: one real success plus probes that answered "no" — a no-match grep and a false
      // test. Exit 1 from a plain probe is a verdict, not a failure.
      case "probe-negative":
        w(R, cmd(TURN, THREAD, { command: "sed -n 1,40p README.md" }),
          cmd(TURN, THREAD, { command: "grep -n missing_symbol src/main.mjs", exitCode: 1, status: "failed" }),
          cmd(TURN, THREAD, { command: "rg TODO src", exitCode: 1, status: "failed" }),
          msg(TURN, THREAD, "no such symbol anywhere"), done(TURN, THREAD));
        break;

      // grep exit 2 is real trouble (bad pattern, unreadable file), never a "no".
      case "probe-error":
        w(R, cmd(TURN, THREAD, { command: "sed -n 1,40p README.md" }),
          cmd(TURN, THREAD, { command: "grep -n [ src/main.mjs", exitCode: 2, status: "failed" }),
          msg(TURN, THREAD, "the answer"), done(TURN, THREAD));
        break;

      // A compound starting with a probe: its exit 1 may be the other command's, so it keeps
      // failure semantics.
      case "probe-compound":
        w(R, cmd(TURN, THREAD, { command: "sed -n 1,40p README.md" }),
          cmd(TURN, THREAD, { command: "grep -q x file && ./run-tests.sh", exitCode: 1, status: "failed" }),
          msg(TURN, THREAD, "the answer"), done(TURN, THREAD));
        break;

      // A probe whose own argument is quoted. The server wraps it in double quotes and escapes the
      // inner ones, so the bare command is recoverable ONLY from commandActions — measured live:
      // `/bin/zsh -lc "... rg -n \"clamp\\(\" ..."`.
      case "probe-quoted":
        w(R, cmd(TURN, THREAD, { command: "sed -n 1,40p README.md" }),
          cmd(TURN, THREAD, { command: 'grep -q "missing symbol" src/main.mjs', exitCode: 1, status: "failed" }),
          msg(TURN, THREAD, "no such symbol anywhere"), done(TURN, THREAD));
        break;

      // A probe piped into another command: the server parses it into TWO actions, and the exit 1 the
      // client sees is the LAST command's, not the probe's.
      case "probe-piped":
        w(R, cmd(TURN, THREAD, { command: "sed -n 1,40p README.md" }),
          cmd(TURN, THREAD, { command: "grep -n TODO src/main.mjs | tail -n 3", exitCode: 1, status: "failed" }),
          msg(TURN, THREAD, "the answer"), done(TURN, THREAD));
        break;

      // A MULTI-LINE bash script whose first line is a probe and whose second is the real work.
      // The second line's failure must not be classified as a probe answering "no".
      case "probe-multiline":
        w(R, cmd(TURN, THREAD, { command: "sed -n 1,40p README.md" }),
          cmd(TURN, THREAD, { command: "grep -q needle src/main.mjs\npnpm test", exitCode: 1, status: "failed" }),
          msg(TURN, THREAD, "all tests pass"), done(TURN, THREAD));
        break;

      // A skill-file read succeeds, the real command fails, and the answer claims it passed.
      // The report must show the failure.
      case "hidden-failure":
        w(R, cmd(TURN, THREAD, { command: "sed -n 1,10p SKILL.md" }),
          cmd(TURN, THREAD, { command: "pnpm -w exec vitest run", exitCode: 1, status: "failed" }),
          msg(TURN, THREAD, "I ran the suite and everything passes."), done(TURN, THREAD));
        break;

      // A turn slow enough that holding the lock dominates the process's lifetime. The lock suite needs
      // this: with a fast turn, several runs acquire and release in SEQUENCE and all exit 0, which is
      // correct behaviour and indistinguishable — by exit code alone — from the concurrency bug.
      case "slow-turn":
        setTimeout(() => w(cmd(TURN, THREAD), msg(TURN, THREAD, "slow but fine"), done(TURN, THREAD)), 1200);
        w(R);
        break;

      // A descendant that ignores SIGTERM — the shape of a test server or watcher a turn leaves running.
      // It inherits this process's group, so the driver's group teardown is the only thing that can end
      // it; its pid goes back in the answer so the suite can check the body.
      case "spawn-survivor": {
        const s = spawn("/bin/sh", ["-c", 'trap "" TERM; sleep 30'], { stdio: "ignore" });
        // Give the shell time to install its trap before the turn ends: the group SIGTERM can win that
        // race, and a survivor that dies of the race makes the case pass against a driver that never
        // escalates to SIGKILL at all.
        w(R);
        setTimeout(() => w(cmd(TURN, THREAD), msg(TURN, THREAD, `survivor ${s.pid}`), done(TURN, THREAD)), 200);
        break;
      }

      // A long answer for the --brief clip: the lines are long enough for the byte cap to bind before
      // the line cap, so a marker appended outside the byte cap is observable.
      case "long-answer":
        w(R, cmd(TURN, THREAD),
          msg(TURN, THREAD, Array.from({ length: 200 }, (_, i) => `line ${i} ${"x".repeat(400)}`).join("\n")),
          done(TURN, THREAD));
        break;

      // The activity the evidence gates ignore: a reasoning summary, a web search, and a subagent
      // thread doing work of its own. All must reach the report as VISIBILITY; none may become
      // evidence (the child's command must not count).
      case "rich-items":
        w(R,
          note("thread/started", { thread: { ...thread("thr_child"), id: "thr_child", parentThreadId: THREAD } }),
          cmd(TURN, THREAD),
          reasoningItem(TURN, THREAD, ["Weighed A against B", "chose A"]),
          note("item/completed", { threadId: THREAD, turnId: TURN, completedAtMs: now(),
            item: { id: "item_w1", type: "webSearch", query: "node atomics", results: [] } }),
          cmd("turn_child", "thr_child", { command: "grep x src/main.mjs" }),
          msg(TURN, THREAD, "the answer"), done(TURN, THREAD));
        break;

      // item/started before the completion pair: what --progress announces.
      case "progress":
        w(R,
          note("item/started", { threadId: THREAD, turnId: TURN, startedAtMs: now(),
            item: { id: "item_p1", type: "commandExecution", command: wrap("echo hi"), status: "inProgress",
                    cwd: "/tmp", commandActions: actionsFor("echo hi"), aggregatedOutput: null,
                    exitCode: null, processId: "50999", durationMs: 0,
                    source: "unifiedExecStartup", pluginId: null, scriptPath: null } }),
          cmd(TURN, THREAD), msg(TURN, THREAD, "the answer"), done(TURN, THREAD));
        break;

      // The turn input, echoed back as the answer: the only way a case can see what the driver SENT
      // as input items (--attach mapping, text ordering).
      case "echo-input":
        w(R, cmd(TURN, THREAD), msg(TURN, THREAD, JSON.stringify(m.params?.input ?? [])), done(TURN, THREAD));
        break;

      // The server DIES mid-turn, after the thread, a command and an answer exist. Everything collected
      // so far is exactly what a crash must not throw away.
      case "server-crash":
        w(R, cmd(TURN, THREAD), msg(TURN, THREAD, "partial answer before the crash"));
        setTimeout(() => process.kill(process.pid, "SIGKILL"), 40);
        break;

      // Turn-scoped notifications with no turn/start response to attribute them to: the driver must
      // bound the events it holds.
      case "early-flood": {
        const flood = [];
        for (let i = 0; i < 1200; i++) flood.push(cmd(TURN, THREAD, { command: `echo flood ${i}` }));
        w(...flood);
        w(R, msg(TURN, THREAD, "never reached"), done(TURN, THREAD));
        break;
      }

      // A line that never ends. readline buffers it whole; the bound is what keeps one broken write from
      // costing the driver its memory.
      case "unterminated-line":
        w(R);
        for (let i = 0; i < 34; i++) process.stdout.write("x".repeat(1024 * 1024));
        break;

      // The server parses a MULTI-LINE script into exactly one tidy action. Taking that at face value
      // reads the failed suite on line two as the probe on line one answering "no".
      case "probe-laundered":
        w(R, cmd(TURN, THREAD, { command: "sed -n 1,40p README.md" }),
          cmd(TURN, THREAD, { command: "grep -q needle src/main.mjs\npnpm test", exitCode: 1, status: "failed",
                              actions: [{ type: "search", command: "grep -q needle src/main.mjs",
                                          query: "needle", path: "src/main.mjs" }] }),
          msg(TURN, THREAD, "all tests pass"), done(TURN, THREAD));
        break;

      // The standing rules the driver put on the thread, handed back as the answer.
      case "echo-instructions":
        w(R, cmd(TURN, THREAD),
          msg(TURN, THREAD, String(requestedThread?.developerInstructions ?? "no developerInstructions")),
          done(TURN, THREAD));
        break;

      // The turn's completion loses its trailing newline and the stream ends there; framing must
      // flush the last line or the turn never completes.
      case "no-trailing-newline":
        w(R, userMsg(thisTurn, m.params?.threadId ?? THREAD, prompt), cmd(TURN, THREAD),
          msg(TURN, THREAD, "the answer"));
        wEndMidLine(done(TURN, THREAD));
        break;

      // An answer with no phase at all, which the schema permits.
      case "null-phase":
        w(R, cmd(TURN, THREAD), msg(TURN, THREAD, "unphased but real", null), done(TURN, THREAD));
        break;

      default:
        w(R, done(TURN, THREAD));
    }
    if (echoesInput) w(userMsg(thisTurn, m.params?.threadId ?? THREAD, prompt));
    return;
  }
}

// Runnable and importable: only a direct run attaches a reader to stdin.
if (isMain) readline.createInterface({ input: process.stdin }).on("line", onLine);
