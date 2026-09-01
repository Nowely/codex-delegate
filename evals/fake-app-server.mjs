#!/usr/bin/env node
// A scripted stand-in for `codex app-server`, used by protocol.test.mjs.
//
// It speaks just enough of the protocol to drive scripts/driver.mjs through the paths that a live server
// makes hard to reach on demand: events attributed to the wrong turn, a completion that overtakes the
// response it depends on, a command that ran and failed, a server request nobody can answer.
//
// The scenario name arrives in FAKE_SCENARIO. Each scenario is a function of the request it is replying
// to, returning the raw lines to emit — deliberately as ONE write where the point is that the client
// cannot rely on chunk boundaries.

import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import { isDeepStrictEqual } from "node:util";
const canon = (p) => { try { return fs.realpathSync(p); } catch { return p ?? ""; } };
import readline from "node:readline";

const SCENARIO = process.env.FAKE_SCENARIO ?? "happy";
// The -c config this server was spawned with, one `cfg:<key>` line each — the only way a suite can see
// a per-run grant that rides the spawn args (--mcp) rather than any file.
if (process.env.FAKE_RPC_LOG) {
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
// Must match READ_PROFILE in scripts/driver.mjs. The driver refuses to run when the server reports any
// other profile, so a fixture that names a different one silently turns every case into a transport error.
const READ_PROFILE = "codex_delegate_read";
const THREAD = "thr_root";
const TURN = "turn_root";
const OTHER_TURN = "turn_stale";
const OTHER_THREAD = "thr_sub";

const w = (...objs) => process.stdout.write(objs.map((o) => JSON.stringify(o)).join("\n") + "\n");
const reply = (id, result) => ({ jsonrpc: "2.0", id, result });
const note = (method, params) => ({ jsonrpc: "2.0", method, params });

// Every message below carries the fields the pinned schema marks required. A fixture that omits them, or
// invents one the server does not send, makes the suite pass while production fails — that has happened
// here once already, with a top-level turnId on TurnCompletedNotification.
let seq = 0;
const now = () => 1780000000000 + (seq += 1);
const thread = (id) => ({
  id, sessionId: id, cliVersion: "0.150.1", createdAt: 1780000000, updatedAt: 1780000000,
  cwd: "/tmp", ephemeral: false, modelProvider: "openai", preview: "", projectId: null,
  source: "vscode", status: { type: SCENARIO === "resume-active" ? "active" : "idle" }, turns: []
});

const cmd = (turnId, threadId, { exitCode = 0, status = "completed", command = "echo hi" } = {}) =>
  note("item/completed", {
    threadId, turnId, completedAtMs: now(),
    item: { id: `item_${seq}`, type: "commandExecution", command, exitCode, status,
            cwd: "/tmp", commandActions: [], aggregatedOutput: "", processId: null, durationMs: 1 }
  });

const msg = (turnId, threadId, text, phase = "final_answer") =>
  note("item/completed", { threadId, turnId, completedAtMs: now(),
    item: { id: `item_${seq}`, type: "agentMessage", text, phase } });

// Matches TurnCompletedNotification exactly: threadId and turn, and NO top-level turnId. A fixture that
// invents a field the server does not send makes the driver pass here and fail in production.
const done = (turnId, threadId, status = "completed", error = null) =>
  note("turn/completed", { threadId, turn: { id: turnId, status, error, items: [] } });

let requestedThread = null;
let pendingApproval = null;
let turnStarts = 0;
const TURN2 = "turn_root_retry";

readline.createInterface({ input: process.stdin }).on("line", (line) => {
  let m;
  try { m = JSON.parse(line); } catch { return; }
  // Every request method, appended as it arrives: the only way a suite can assert that the driver SENT
  // something whose effect is otherwise invisible (turn/interrupt on a run being torn down).
  if (process.env.FAKE_RPC_LOG && m.method) {
    try { fs.appendFileSync(process.env.FAKE_RPC_LOG, `${m.method}\n`); } catch {}
  }
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

  if (m.method === "initialize") { w(reply(m.id, { userAgent: "fake", codexHome: "/tmp", platformFamily: "unix", platformOs: "macos" })); return; }
  if (m.method === "initialized") return;
  if (m.method === "turn/interrupt") { w(reply(m.id, {})); return; }
  if (m.method === "turn/steer") { w(reply(m.id, {})); return; }

  // The driver asks the real server what the caller's config resolves to, instead of parsing their TOML —
  // so the fixture has to answer it too. It did not, and every case then sat out the driver's probe
  // bell: the suite went from 5 seconds to over ten minutes, which is how a missing method announces
  // itself here.
  // Unlike everything else in this file these are NOT really derived from the request: the driver's probe
  // sends no -c at all, so CFG is empty here and the fallbacks always win. Said plainly because the
  // file's own rule is that every field derives from what was sent — this one cannot, and a reader who
  // assumed otherwise would think a driver change to the probe would show up here. It would not.
  if (m.method === "config/read") {
    // A probe whose ASKING fails, as opposed to a config with nothing in it — the driver must warn and
    // must not truncate a previously inherited config.
    if (process.env.FAKE_CONFIG_FAIL) {
      w({ jsonrpc: "2.0", id: m.id, error: { code: -32603, message: "config store unavailable" } });
      return;
    }
    const unquote = (v) => (v ?? "").replace(/^"|"$/g, "");
    w(reply(m.id, { config: {
      model: unquote(CFG["model"]) || "fake-model",
      model_reasoning_effort: unquote(CFG["model_reasoning_effort"]) || "medium",
      personality: unquote(CFG["personality"]) || "pragmatic",
      service_tier: unquote(CFG["service_tier"]) || "auto",
      // What --mcp asks the probe to carry across; one carriable server, one that is not.
      ...(process.env.FAKE_MCP ? { mcp_servers: {
        docs: { command: "docs-server", args: ["--port", "0"], env: { TOKEN: "t" } },
        exotic: { command: "x", nested: { deep: true } },
      } } : {}),
    }, origins: {} }));
    return;
  }

  if (m.method === "thread/start" || m.method === "thread/resume") {
    requestedThread = m.params;
    // EVERY field below is derived from what the driver actually SENT — its -c config (CFG) and its
    // thread/start params — never from a literal. A literal here is a fixture that agrees with itself: it
    // let the driver stop sending the read-level permission config, or stop pinning approvalsReviewer,
    // with every case still green. Where a scenario needs a specific server behaviour it overrides the
    // derived value explicitly, so the override is visible rather than being the default.
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
    // The cwd is subtracted at both levels: workspaceWrite implies it, and it is reported under
    // runtimeWorkspaceRoots instead. Compared canonically, because the driver sends a realpath'd cwd
    // (/private/var/... on macOS) while TMPDIR is usually the raw /var/... form.
    // Measured against the live server, and it is not symmetric: the server CANONICALISES each root but
    // echoes the cwd exactly as it was given, then subtracts by comparing the two. So a cwd sent in raw
    // /var/... form keeps a root that the same directory sent as /private/var/... loses. The driver always
    // sends a realpath'd cwd, so the subtraction is what happens in practice — but a fixture that
    // canonicalises both sides diverges here, and this suite exists to catch exactly that.
    // Two sources, two rules — measured, not assumed, and they are NOT the same:
    //   read  : the `:tmpdir` root is CANONICALISED, then compared against the cwd exactly as given.
    //   write : `writable_roots` are echoed VERBATIM, and subtraction is a plain string comparison of the
    //           root as given against the cwd as given.
    // The driver realpaths everything before sending, so in practice both reduce to "the cwd is dropped".
    // A fixture that canonicalised both sides agreed with the server only by accident.
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
    // A workspace that does not contain the cwd: nothing in the sandbox object reveals this.
    // The workspace roots are the cwd AS GIVEN plus every extra writable root — measured; a fixture that
    // reported the cwd alone hid whether the driver's extra roots reached the server at all.
    const workspace = SCENARIO === "workspace-elsewhere"
      ? ["/tmp/somewhere-else"]
      // The cwd as given, then the extra roots as given, deduped by exact string — the server does no
      // canonicalisation here either.
      : [...new Set([m.params?.cwd ?? "/tmp", ...(writeLevel ? writeRoots : [])])];

    w(reply(m.id, {
      thread: thread(THREAD),
      // Normally a plausible model name, because fidelity.test.mjs diffs this response field against the
      // LIVE server's and a fixture that reports something the server never would is a divergence, not a
      // test. Under FAKE_MODEL_ECHO the field reports the REQUEST instead ("inherited" / "explicit:x"),
      // which is what the "model must be inherited" case needs: the plausible name is the same literal a
      // hardcoding driver would send, so that case could not tell the two apart — measured, replacing
      // `model: opts.model ?? null` with `model: "fake-model"` left all 80 cases green.
      model: process.env.FAKE_MODEL_ECHO
        ? (m.params?.model == null ? "inherited" : `explicit:${m.params.model}`)
        : (m.params?.model ?? (CFG["model"] ?? "fake-model").replace(/^"|"$/g, "")),
      modelProvider: "openai", cwd: m.params?.cwd ?? "/tmp",
      // null when the driver sent no -c override, exactly as the live server reports an inherited value.
      reasoningEffort: CFG["model_reasoning_effort"] ?? null,
      runtimeWorkspaceRoots: workspace,
      // Echoed: SKILL.md publishes on-request as a contract, and nothing was checking it.
      // Clamping is what an MDM profile actually does to a policy it does not permit — the failure this
      // whole driver exists to route around, and it is invisible in every other field.
      approvalPolicy: SCENARIO === "policy-clamped" ? "untrusted" : (m.params?.approvalPolicy ?? "never"),
      // Who may approve is a separate axis from what the sandbox permits: under "auto_review" the server
      // decides approvals itself and this driver never sees an escalation, while the sandbox object stays
      // byte-identical. Echoed, so a driver that stops pinning it is visible.
      // `?? "user"` defeated the sentence above: it is exactly what the driver sends, so a driver that
      // stopped sending the field got it back anyway and the assert passed. Line 164 already avoids this by
      // defaulting to a value the driver never sends; null does the same while claiming nothing about what
      // the real server would choose, which is not measured.
      approvalsReviewer: SCENARIO === "reviewer-auto" ? "auto_review" : (m.params?.approvalsReviewer ?? null),
      activePermissionProfile: profile,
      sandbox: sb
    }));
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

  if (m.method === "review/start") {
    // Inline review: the turn runs on the caller's thread; the review payload arrives as the
    // exitedReviewMode item and the turn completes with no commands at all.
    const R = reply(m.id, { reviewThreadId: m.params?.threadId ?? THREAD,
      turn: { id: TURN, status: "inProgress", items: [], error: null } });
    w(R,
      // A failing probe of the reviewer's own — measured live, real reviews run failing greps as
      // their working method, and that must not turn the run into exit 11.
      cmd(TURN, THREAD, { command: "grep -n clamp src/util.mjs", exitCode: 1, status: "failed" }),
      note("item/completed", { threadId: THREAD, turnId: TURN, completedAtMs: now(),
        item: { id: "item_rv", type: "exitedReviewMode",
                review: { overallCorrectness: "needs-work", findings: [{ title: "off-by-one in clamp", body: "the loop stops early" }] } } }),
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
    // Did the driver actually SEND the schema, or only validate the answer against it afterwards? The
    // parity table claims "the server constrains generation with the schema", and nothing checked it:
    // deleting outputSchema from both turn/start calls left every schema case green, because the fixture
    // branched on the scenario name alone. Now a schema scenario that was not sent one says so, in prose,
    // which no schema can match.
    const schemaSent = m.params?.outputSchema !== undefined && m.params?.outputSchema !== null;
    const schemaAnswer = (json) => schemaSent ? json : "the server was sent no outputSchema";
    const askApproval = (method, params, expected) => {
      const id = 9300 + Number(m.id);
      pendingApproval = { id, method, expected, threadId: m.params.threadId, turnId: TURN };
      w(R, { jsonrpc: "2.0", id, method, params });
    };
    switch (SCENARIO) {
      // Everything the driver should accept — including the token-usage notification a live server
      // streams, so the report's accounting is pinned by the ordinary case.
      case "happy":
        w(R, cmd(TURN, THREAD),
          note("thread/tokenUsage/updated", { threadId: THREAD, tokenUsage: {
            last: { inputTokens: 100, cachedInputTokens: 20, outputTokens: 30, reasoningOutputTokens: 5, totalTokens: 135 },
            total: { inputTokens: 100, cachedInputTokens: 20, outputTokens: 30, reasoningOutputTokens: 5, totalTokens: 135 },
            modelContextWindow: 272000 } }),
          // A SUBAGENT thread's usage, arriving after the root's and carrying a different total. Codex
          // spawns its own threads and this notification is per-thread; without a competing event the
          // root-thread filter could be deleted and the assertion below still read 135.
          note("thread/tokenUsage/updated", { threadId: "thr_child", tokenUsage: {
            last: { inputTokens: 9000, cachedInputTokens: 0, outputTokens: 900, reasoningOutputTokens: 0, totalTokens: 9900 },
            total: { inputTokens: 9000, cachedInputTokens: 0, outputTokens: 900, reasoningOutputTokens: 0, totalTokens: 9900 },
            modelContextWindow: 272000 } }),
          msg(TURN, THREAD, "the answer"), done(TURN, THREAD));
        break;

      // --output-schema: a valid object on the first try.
      case "schema-good":
        w(R, cmd(TURN, THREAD), msg(TURN, THREAD, schemaAnswer('{"verdict":"ok","count":3}')), done(TURN, THREAD));
        break;

      // --output-schema: PHASED prose first, an UNPHASED valid object on the corrective turn — the
      // schema permits phase null, and a cross-turn tie-break once let the first turn's phased prose
      // beat the retry's whole product.
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
        w(R);
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
        w(R, { jsonrpc: "2.0", id: 9003, method: "item/tool/requestUserInput", params: { threadId: THREAD, turnId: TURN, itemId: "item_q", isBlocking: true, questions: [{ id: "q1", prompt: "which?" }] } });
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
        setTimeout(() => w(msg(TURN, THREAD, "could not proceed"), done(TURN, THREAD)), 30);
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
        w(R, cmd(TURN, THREAD), done(TURN, THREAD, "failed", { codexErrorInfo: "usageLimitExceeded", message: "quota" }));
        break;

      // A transient stream failure before ANY observable work, then a clean second turn: the one shape
      // the driver retries. The first turn emits nothing but its failure.
      case "transient-then-ok":
        if (turnStarts === 1)
          w(R, done(TURN, THREAD, "failed", { codexErrorInfo: "responseStreamDisconnected", message: "stream lost" }));
        else
          w(R, cmd(thisTurn, THREAD), msg(thisTurn, THREAD, "recovered answer"), done(thisTurn, THREAD));
        break;

      // A transient failure AFTER an MCP tool call that had a side effect, and nothing else. The
      // retry guard must count that item: replaying the prompt would file the ticket twice.
      case "transient-after-tool":
        w(R, note("item/completed", { threadId: THREAD, turnId: TURN, completedAtMs: now(),
            item: { id: "item_m1", type: "mcpToolCall", server: "tracker", tool: "create_ticket",
                    arguments: "{}", status: "completed", result: null, error: null, durationMs: 5 } }),
          done(TURN, THREAD, "failed", { codexErrorInfo: "responseStreamDisconnected", message: "stream lost" }));
        break;

      // The same transient cause on BOTH turns: one retry is the whole budget.
      case "transient-always":
        w(R, done(thisTurn, THREAD, "failed", { codexErrorInfo: "responseStreamDisconnected", message: "stream lost" }));
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
        w({ jsonrpc: "2.0", id: 4242, result: { thread: { id: "bogus" }, turn: { id: "bogus" } } },
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
               params: { threadId: THREAD, turnId: null, serverName: "fake", mode: "form", message: "?", requestedSchema: { type: "object" } } });
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

      // A command that FAILED while carrying no numeric exit code — the schema allows exitCode null with
      // status "failed", and keying the failure set on the code alone let this exit 0 under an answer
      // claiming the suite passed, while the footer printed "NEVER RAN pnpm test".
      case "failed-null-exit":
        w(R, cmd(TURN, THREAD, { command: "cat README.md" }),
          cmd(TURN, THREAD, { command: "pnpm -w exec vitest run", exitCode: null, status: "failed" }),
          msg(TURN, THREAD, "All tests pass."), done(TURN, THREAD));
        break;

      // An approval refused on a SUBAGENT's thread. The refusal is sent regardless of whose thread asked,
      // so that subagent really was blocked; recording it only for the root thread reported a clean run.
      case "escalated-subagent":
        w(R, { jsonrpc: "2.0", id: 9201, method: "item/commandExecution/requestApproval",
               params: { threadId: OTHER_THREAD, turnId: TURN, itemId: "item_s", startedAtMs: now(), command: "rm -rf /" } });
        setTimeout(() => w(cmd(TURN, THREAD), msg(TURN, THREAD, "done"), done(TURN, THREAD)), 30);
        break;

      // A turn that WROTE files: one applied, one that failed to apply. Neither reached the report or the
      // exit ladder before — a write-level run said nothing about what it had written.
      case "file-changes":
        w(R, cmd(TURN, THREAD),
          note("item/completed", { threadId: THREAD, turnId: TURN, completedAtMs: now(),
            item: { id: "item_f1", type: "fileChange", status: "completed",
                    changes: [{ path: "/tmp/wrote.txt", kind: { type: "add" }, diff: "+hello" }] } }),
          note("item/completed", { threadId: THREAD, turnId: TURN, completedAtMs: now(),
            item: { id: "item_f2", type: "fileChange", status: "failed",
                    changes: [{ path: "/tmp/nope.txt", kind: { type: "update", move_path: null }, diff: "+x" }] } }),
          note("item/completed", { threadId: THREAD, turnId: TURN, completedAtMs: now(),
            item: { id: "item_f3", type: "fileChange", status: "completed",
                    changes: [{ path: "/tmp/old.txt", kind: { type: "update", move_path: "/tmp/new.txt" }, diff: "rename" }] } }),
          msg(TURN, THREAD, "Wrote both files."), done(TURN, THREAD));
        break;

      // A research turn: one real success plus probes that answered "no" — a no-match grep, a false
      // test. Exit 1 from a plain probe is a verdict, not a failure, and used to exit 11.
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

      // A skill-file read succeeds, the real command fails, and the answer claims it passed. The report
      // must show the failure; the old one filtered it out of both lists.
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

      // A long answer, for the --brief clip. The lines are long enough that the FIRST TWENTY already
      // exceed the 4000-byte cap — 20 x ~420 bytes — so the byte path is exercised, not just the line
      // path. With short lines the line cap binds first, the byte cap never engages, and a marker
      // appended outside it goes unnoticed: measured, that fixture left the "marker escapes the cap"
      // mutation green.
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
          note("item/completed", { threadId: THREAD, turnId: TURN, completedAtMs: now(),
            item: { id: "item_r1", type: "reasoning", summary: ["Weighed A against B", "chose A"], content: [] } }),
          note("item/completed", { threadId: THREAD, turnId: TURN, completedAtMs: now(),
            item: { id: "item_w1", type: "webSearch", query: "node atomics", results: [] } }),
          note("item/completed", { threadId: "thr_child", turnId: "turn_child", completedAtMs: now(),
            item: { id: "item_c1", type: "commandExecution", command: "grep x", exitCode: 0, status: "completed",
                    cwd: "/tmp", commandActions: [], aggregatedOutput: "", processId: null, durationMs: 1 } }),
          msg(TURN, THREAD, "the answer"), done(TURN, THREAD));
        break;

      // item/started before the completion pair: what --progress announces.
      case "progress":
        w(R,
          note("item/started", { threadId: THREAD, turnId: TURN, startedAtMs: now(),
            item: { id: "item_p1", type: "commandExecution", command: "echo hi", status: "inProgress",
                    cwd: "/tmp", commandActions: [], aggregatedOutput: "", exitCode: null, processId: null, durationMs: 0 } }),
          cmd(TURN, THREAD), msg(TURN, THREAD, "the answer"), done(TURN, THREAD));
        break;

      // The turn input, echoed back as the answer: the only way a case can see what the driver SENT
      // as input items (--attach mapping, text ordering).
      case "echo-input":
        w(R, cmd(TURN, THREAD), msg(TURN, THREAD, JSON.stringify(m.params?.input ?? [])), done(TURN, THREAD));
        break;

      // An answer with no phase at all, which the schema permits.
      case "null-phase":
        w(R, cmd(TURN, THREAD), msg(TURN, THREAD, "unphased but real", null), done(TURN, THREAD));
        break;

      default:
        w(R, done(TURN, THREAD));
    }
    return;
  }
});
