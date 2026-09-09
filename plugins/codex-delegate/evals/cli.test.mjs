#!/usr/bin/env node
// Command-line regression tests for scripts/driver.mjs: what the driver does with its own ARGUMENTS.
//
// Every row here runs the fixture's `happy` scenario, so the server is never the variable: what is
// measured is parsing, seat files, schema admission, the environment guards, the shape of the report
// and the help. The rows that drive the server through orderings it would not produce on demand are in
// protocol.test.mjs, and both suites share evals/lib/scenarios.mjs.
//
//   node evals/cli.test.mjs
//
// Exit 0 if every case matches its expected exit code.

import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DRIVER, EXIT, FAKE, readJson, registry, runCases, summarize } from "./lib/harness.mjs";
import { SHIM, assertKnownScenarios, explicitTmp, flowState, laxSchemaFile, looseNestedSchemaFile,
         looseSchemaFile, mismatchSessions, notExec, oneOfSchemaFile, optionalSchemaFile, protectedState, protectedTmp,
         run, runTable, sessionsDir, survivorPidName, unknownModelLog, until } from "./lib/scenarios.mjs";

const shimDir = SHIM;

// The two roots the state-directory cases below measure: one stands in for the plugin's own data
// directory, the other for a home the run must leave untouched. Both live under the shim so the suite's
// own cleanup reaches them.
const pluginData = path.join(shimDir, "plugin-data");
const decoyHome = path.join(shimDir, "decoy-home");
fs.mkdirSync(decoyHome, { recursive: true });

const CASES = [
  { scenario: "happy",            expect: EXIT.OK,                  why: "a real command succeeded and a final answer arrived" },
  { scenario: "happy",            expect: EXIT.USAGE, args: ["--model", "missing-model"],
    env: { FAKE_RPC_LOG: unknownModelLog },
    why: "model/list rejects a model name absent from the server catalogue before thread/start",
    assertStderr: (e, ms) => {
      const log = fs.existsSync(unknownModelLog) ? fs.readFileSync(unknownModelLog, "utf8") : "";
      return (/model\/list/.test(log) && !/thread\/start/.test(log) && /not in model\/list/.test(e) && ms < 7000)
        || `unknown-model refusal was late or missing: ${JSON.stringify({ ms, log, err: e.slice(0, 180) })}`;
    } },
  { scenario: "happy",            expect: EXIT.OK,
    why: "the setup rate-limit snapshot reaches every completed report, so fan-outs can see approaching exhaustion",
    assert: (r) => r.rateLimits?.primary?.usedPercent === 25
      || `rateLimits missing from the report: ${JSON.stringify(r.rateLimits)}` },
  { scenario: "happy",            expect: EXIT.OK, env: { FAKE_RATELIMITS_ERROR: "1" },
    why: "a server that rejects account/rateLimits/read costs the report its snapshot, not the whole run",
    assert: (r) => r.rateLimits === null
      || `a rejected snapshot did not leave rateLimits null: ${JSON.stringify(r.rateLimits)}` },
  { scenario: "happy",            expect: EXIT.OK,
    why: "the server echoes the caller's prompt as a userMessage at the start of a turn; that echo must not count as activity or disarm the no-work retry guard",
    assert: (r) => (r.otherItemCounts === null || r.otherItemCounts.userMessage === undefined)
      || `the caller's own prompt was reported as activity: ${JSON.stringify(r.otherItemCounts)}` },
  { scenario: "happy",            expect: EXIT.USAGE, seat: "SEAT: read <CWD>\nATTACH: /etc/hosts\n",
    why: "ATTACH is not a seat-file field: a newline in any copied value could inject one, and the injected line would upload a file the coordinator never named to the model provider",
    assertStderr: (e) => /unknown seat field ATTACH at line 2 of/.test(e) || `an injected ATTACH was accepted: ${e.slice(0, 160)}` },
  { scenario: "happy",            expect: EXIT.USAGE, args: ["--attach", "/nonexistent/shot.png"],
    why: "a missing attachment is the caller's error, raised before anything runs — the server would otherwise refuse it mid-turn, after the delegation was paid for",
    assertStderr: (e) => /--attach.*does not exist/.test(e) || `the missing file was not named: ${e.slice(0, 140)}` },
  { scenario: "happy",           expect: EXIT.VERIFY_FAILED,      args: ["--verify", "false"],
    why: "the caller's own check decides: a clean turn still fails when the work is not there" },
  { scenario: "happy",            expect: EXIT.OK, args: ["--verify", "yes abcdefghij | head -c 100000000; exit 0"],
    why: "a verifier that exits 0 has passed even when its output exceeds the verifier tail cap; streaming a bounded tail must preserve its exit status",
    assert: (r) => (r.verify?.ok === true && r.verify?.measured === true
      && String(r.verify?.stdout ?? "").length <= 2000)
      || `a passing loud verifier was not measured: ${JSON.stringify({ ...r.verify, stdout: String(r.verify?.stdout ?? "").length })}` },
  { scenario: "happy",            expect: EXIT.OK,
    why: "with no --effort the driver must send no override so the caller's config decides; a forced default can silently downgrade the requested effort",
    assert: (r) => r.effort === null && r.reasoningEffort === null
      || `an effort was imposed: requested=${JSON.stringify(r.effort)} selected=${JSON.stringify(r.reasoningEffort)}` },
  { scenario: "happy",            expect: EXIT.OK, args: ["--effort", "max"],
    why: "max is on the model's advertised ladder and must not be rejected by a stale hardcoded list",
    assert: (r) => r.reasoningEffort === "max" || `--effort max did not reach the server: ${JSON.stringify(r.reasoningEffort)}` },
  { scenario: "happy",            expect: EXIT.OK, args: ["--resume", "thr_root"],
    why: "a resumed report must name the continued thread so the coordinator can distinguish it from a fresh run and detect a wrong resume target",
    assert: (r) => r.resumedFrom === "thr_root" || `the report did not name the thread it continued: ${JSON.stringify(r.resumedFrom)}` },
  { scenario: "happy",            expect: EXIT.OK, env: { TMPDIR: null },
    why: "when cwd is the tmpdir, the server reports it under runtimeWorkspaceRoots rather than writableRoots; the sandbox check must accept that effective grant",
    assert: (r) => JSON.stringify(r.sandbox?.writableRoots) === "[]"
      || `expected the tmpdir root to be subtracted, got ${JSON.stringify(r.sandbox?.writableRoots)}` },
  { scenario: "happy",            expect: EXIT.OK, env: { FAKE_MODEL_ECHO: "1" },
    why: "with no --model the driver sends null and the server chooses; FAKE_MODEL_ECHO reports the request so a hardcoded model cannot look inherited. The echo is opt-in because fidelity.test.mjs compares this field with the live server",
    assert: (r) => r.model === "inherited" || `a model was imposed rather than inherited: ${JSON.stringify(r.model)}` },
  { scenario: "happy",            expect: EXIT.OK,
    env: { PATH: "/usr/bin:/bin", CODEX_DELEGATE_CODEX: path.join(shimDir, "codex") },
    why: "with codex absent from PATH the driver honours CODEX_DELEGATE_CODEX — a non-login shell must not need a PATH export ritual" },
  { scenario: "happy",            expect: EXIT.USAGE,
    env: { CODEX_DELEGATE_CODEX: "codex" },
    why: "a relative CODEX_DELEGATE_CODEX would resolve against the invocation cwd; only an absolute executable is accepted",
    assertStderr: (e) => /CODEX_DELEGATE_CODEX must be an absolute path/.test(e) || `the override was not validated: ${e.slice(0, 140)}` },
  // --- the state directory: named by the environment, and by nothing else ---
  { scenario: "happy",            expect: EXIT.USAGE, unsetEnv: ["CODEX_DELEGATE_STATE_DIR", "CLAUDE_PLUGIN_DATA"],
    why: "there is no built-in state directory: a default under the home directory would hold answers, an isolated home and a worktree ledger that no plugin uninstall reaches and that nobody named, so a run with neither variable set is refused before the turn and told which two to set",
    assertStderr: (e) => (/CODEX_DELEGATE_STATE_DIR/.test(e) && /CLAUDE_PLUGIN_DATA/.test(e))
      || `the refusal named neither variable or only one: ${e.slice(0, 200)}` },
  { scenario: "happy",            expect: EXIT.OK, unsetEnv: ["CODEX_DELEGATE_STATE_DIR"],
    env: { CLAUDE_PLUGIN_DATA: pluginData, HOME: decoyHome },
    why: "CLAUDE_PLUGIN_DATA is what the skill recipes pass, so a run carrying only it puts the whole of its state there and nothing under a home directory — the property the removed default used to break",
    assert: () => {
      const made = fs.existsSync(pluginData) ? fs.readdirSync(pluginData) : [];
      if (!made.some((n) => ["locks", "answers", "home", "jobs", "tmp"].includes(n)))
        return `the run left no state under CLAUDE_PLUGIN_DATA: ${JSON.stringify(made)}`;
      const under = fs.readdirSync(decoyHome);
      return under.length === 0 || `the run wrote under $HOME: ${under.join(", ")}`;
    } },
  { scenario: "happy",            expect: EXIT.USAGE, unsetEnv: ["CODEX_DELEGATE_STATE_DIR"],
    env: { CLAUDE_PLUGIN_DATA: "plugin-data" },
    why: "a relative state directory resolves against whatever cwd the caller happened to have; both variables take the same absolute-only rule, and the refusal names the one that supplied the value",
    assertStderr: (e) => /CLAUDE_PLUGIN_DATA must be an absolute path/.test(e)
      || `the relative value was not refused by name: ${e.slice(0, 160)}` },
  { scenario: "happy",            expect: EXIT.USAGE, env: { CODEX_DELEGATE_STATE_DIR: "state" },
    why: "the same rule for the variable a harness sets, which is read first: a relative one used to be accepted, and the answer log and the turn diff then dropped their artefact in silence",
    assertStderr: (e) => /CODEX_DELEGATE_STATE_DIR must be an absolute path/.test(e)
      || `the relative value was not refused by name: ${e.slice(0, 160)}` },
  { scenario: "happy",            expect: EXIT.OK, env: { CLAUDE_PLUGIN_DATA: "" },
    why: "the recipe forwards CLAUDE_PLUGIN_DATA under its own name, and on a clone-and-symlink install nothing substitutes the placeholder, so the shell hands the driver an empty value beside the CODEX_DELEGATE_STATE_DIR the user exported; empty reads as unset, never as a path",
    assert: (r, ms, stateRoot) => fs.existsSync(path.join(stateRoot, "answers"))
      || "the run left no answers/ under CODEX_DELEGATE_STATE_DIR beside an empty CLAUDE_PLUGIN_DATA" },
  { scenario: "happy",            expect: EXIT.USAGE, unsetEnv: ["CODEX_DELEGATE_STATE_DIR"], env: { CLAUDE_PLUGIN_DATA: "" },
    why: "the same empty value with nothing exported is the clone route before the user set anything: the refusal names both variables instead of taking \"\" for a directory",
    assertStderr: (e) => (/CODEX_DELEGATE_STATE_DIR/.test(e) && /CLAUDE_PLUGIN_DATA/.test(e))
      || `the refusal named neither variable or only one: ${e.slice(0, 200)}` },
  { scenario: "happy",            expect: EXIT.OK, env: { FAKE_CONFIG_FAIL: "1" },
    why: "a failed config probe must say so out loud — the silent path changed which model answers and made identical runs nondeterministic",
    assertStderr: (e) => /could not read the caller's Codex config/.test(e)
      || `the downgrade was silent: ${e.slice(0, 160)}` },
  { scenario: "happy",            expect: EXIT.VERIFY_UNMEASURABLE, args: ["--verify", "definitely_not_a_command_xyz"],
    why: "127 means the shell never ran the command — a typo or a tool missing from the DRIVER's PATH — which says nothing about the work and must not read as 'the work is not there'",
    assert: (r) => r.verify?.measured === false
      || `a broken verifier was reported as a measured failure: ${JSON.stringify(r.verify)}` },
  { scenario: "happy",            expect: EXIT.OK, args: ["--verify", "sleep 0.2 & exit 0"],
    why: "the command exited 0 while a background process still held the pipe; the observed exit status is proof of a pass and must not be thrown away as unmeasurable",
    assert: (r) => r.verify?.ok === true && r.verify?.measured === true
      || `a passing exit status was discarded: ${JSON.stringify(r.verify)}` },
  { scenario: "happy",            expect: EXIT.VERIFY_UNMEASURABLE, args: ["--verify", "kill -TERM $$"],
    why: "a verifier killed by a signal reports exitCode null — that is 'could not run', which must fail closed rather than read as success",
    assert: (r) => r.verify?.ok === false && r.verify?.signal === "SIGTERM"
      || `expected a recorded signal, got ${JSON.stringify(r.verify)}` },
  { scenario: "happy",            expect: EXIT.OK, args: ["--expect-command", "echo", "--verify", "true"],
    why: "both checks agreeing is the ordinary success, and both verdicts appear in the report",
    assert: (r) => r.expectationOk === true && r.verify?.ok === true || `report lost a verdict: ${JSON.stringify({ e: r.expectationOk, v: r.verify })}` },
  // Detach the background child's stdio so it cannot hold the verifier's pipe open. The group sweep must
  // be the mechanism that ends the child.
  { scenario: "happy",            expect: EXIT.OK, args: ["--verify", `sh -c 'trap "" TERM; echo $$ > "$TMPDIR/${survivorPidName}"; exec sleep 30' >/dev/null 2>&1 </dev/null & sleep 0.3; exit 0`],
    why: "the verifier runs in its own process group, which must be swept afterwards so background descendants cannot outlive the run",
    assert: (r) => {
      if (r.verify?.ok !== true) return `the verifier itself did not pass: ${JSON.stringify(r.verify)}`;
      let pid = 0;
      try { pid = Number(fs.readFileSync(path.join(process.env.TMPDIR ?? os.tmpdir(), survivorPidName), "utf8").trim()); } catch {}
      if (!pid) return "the verifier's background child never wrote its pid";
      try { process.kill(pid, 0); return `the verifier's background child ${pid} outlived the run`; }
      catch { return true; }
    } },

  // --- report shape: defaults, receipt, exit-5 hint ---
  { scenario: "happy",            expect: EXIT.OK,
    why: "the JSON report is the ONLY report: no flag selects it, and none selects anything else",
    assert: (r) => r.ok === true || `expected a JSON report, got ${JSON.stringify(r).slice(0, 60)}` },
  { scenario: "happy",            expect: EXIT.OK,
    why: "the report locates the rollout receipt itself; a scripted thread id matches nothing real, so the honest answer is receiptOk false with a null path",
    assert: (r) => (r.receiptOk === false && r.receiptPath === null)
      || `receipt fields wrong for a fixture run: ${JSON.stringify({ ok: r.receiptOk, path: r.receiptPath })}` },
  { scenario: "happy",            expect: EXIT.USAGE, args: ["--output-schema", "/nonexistent/schema.json"],
    why: "an unreadable schema is the caller's error, raised before anything runs",
    assertStderr: (t) => /--output-schema cannot read/.test(t) || `stderr did not name the schema file: ${t.slice(0, 120)}` },
  { scenario: "happy",            expect: EXIT.USAGE, args: ["--output-schema", laxSchemaFile],
    why: "schema admission requires an explicit object contract; an empty or oneOf-only schema must not certify arbitrary values as valid output",
    assertStderr: (t) => /must declare "type": "object"/.test(t) || `admission let a type-less schema through: ${t.slice(0, 140)}` },
  // --- --seat-file: a wrapper writes values, it does not build a command line out of them ---
  { scenario: "happy",            expect: EXIT.OK, seat: "SEAT: read <CWD>\nEXPECT: echo\nBRIEF: yes\n",
    why: "the ordinary seat file maps to the same flags the CLI takes, so a caller never has to quote anything",
    assert: (r) => (r.level === "read" && r.expectationOk === true && r.answerTruncated === false)
      || `seat file did not map cleanly: ${JSON.stringify({ l: r.level, e: r.expectationOk })}` },
  { scenario: "happy",            expect: EXIT.NO_COMMANDS,
    seat: "SEAT: read <CWD>\nEXPECT: x' --level write --cwd / --writable / --network '\n",
    why: "THE reason this flag exists: a hostile header value must stay one value. Interpolated into a shell command line the same characters would have granted write level, the filesystem root and egress",
    assert: (r) => (r.level === "read" && r.network === false && r.sandbox?.type === "workspaceWrite"
        && (r.sandbox?.writableRoots ?? []).length <= 1 && String(r.expectCommand).includes("--writable"))
      || `a seat-file value escaped into flags: ${JSON.stringify({ l: r.level, n: r.network, roots: r.sandbox?.writableRoots })}` },
  { scenario: "happy",            expect: EXIT.OK, seat: "SEAT: read <CWDSP>\nEXPECT: echo\n",
    why: "the SEAT value is literal to end of line; collapsing consecutive spaces would silently change where rights are granted",
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

  // --- token accounting and verifier execution errors ---
  { scenario: "happy",            expect: EXIT.OK,
    why: "the report must carry the ROOT thread's token accounting; a later subagent usage event with a larger total exposes a missing thread filter",
    assert: (r) => r.tokenUsage?.total?.totalTokens === 135
      || `tokenUsage missing, wrong, or taken from another thread: ${JSON.stringify(r.tokenUsage)}` },
  { scenario: "happy",            expect: EXIT.VERIFY_UNMEASURABLE, args: ["--verify", notExec],
    why: "exit 126 means the verifier was found but is not executable: fix the verifier, not the work",
    assert: (r) => (r.verify?.measured === false && r.verify?.exitCode === 126)
      || `a non-executable verifier was not classified as unmeasurable: ${JSON.stringify(r.verify)}` },

  // --- receipt location and identity ---
  { scenario: "happy",            expect: EXIT.OK, env: { CODEX_DELEGATE_SESSIONS_DIR: sessionsDir },
    why: "the receipt must be located and read: matching session_meta makes receiptOk true and surfaces originator and provider",
    assert: (r) => (r.receiptOk === true && typeof r.receiptPath === "string"
      && r.receiptOriginator === "Claude Code" && r.receiptModelProvider === "openai")
      || `a genuine rollout was not recognised: ${JSON.stringify({ ok: r.receiptOk, path: r.receiptPath, o: r.receiptOriginator, p: r.receiptModelProvider })}` },
  { scenario: "happy",            expect: EXIT.OK, env: { CODEX_DELEGATE_SESSIONS_DIR: mismatchSessions },
    why: "a filename match is not a receipt: a rollout named for this thread whose session_meta names another one is found but NOT verified, because matching a name is as strong as `touch rollout-<id>.jsonl`",
    assert: (r) => (r.receiptOk === false && typeof r.receiptPath === "string" && /session id/.test(r.receiptWhy ?? ""))
      || `a mismatched rollout was accepted or misreported: ${JSON.stringify({ ok: r.receiptOk, path: r.receiptPath, why: r.receiptWhy })}` },

  // --- --output-schema: reject non-strict schemas before the turn ---
  { scenario: "happy",            expect: EXIT.USAGE, args: ["--output-schema", looseSchemaFile],
    why: "an ordinary JSON Schema is rejected by the server with 400 invalid_json_schema AFTER the turn has started, costing the whole delegation; the admission check must catch it first",
    assertStderr: (e) => /additionalProperties/.test(e) || `a non-strict schema was admitted: ${e.slice(0, 160)}` },
  { scenario: "happy",            expect: EXIT.USAGE, args: ["--output-schema", looseNestedSchemaFile],
    why: "the strict rule applies at EVERY level — measured, the server names the context ('properties','meta') — so a top-level-only check still spends a turn to find out",
    assertStderr: (e) => /properties\.meta/.test(e) || `a non-strict nested object was admitted: ${e.slice(0, 200)}` },
  { scenario: "happy",            expect: EXIT.USAGE, args: ["--output-schema", optionalSchemaFile],
    why: "a strict schema permits no optional property: `required` must list every key in `properties`, or the server refuses the request",
    assertStderr: (e) => /required.*every key|Missing|"note"/.test(e) || `an optional property was admitted: ${e.slice(0, 200)}` },

  // --- the seat file: what a wrapper hands over must not be able to become rights ---
  { scenario: "happy", seat: "EXPECT: foo\nSEAT: read <CWD>\n", expect: EXIT.USAGE,
    why: "SEAT must come FIRST. A file whose first field is anything else left the rights slot open, and an injected `SEAT: write ...` line then defined them",
    assertStderr: (e) => /first field must be SEAT/.test(e) || `a seat file without a leading SEAT was accepted: ${e.slice(0, 160)}` },
  { scenario: "happy", noPrompt: true, seat: "# a header that declares nothing\n\nTASK: do it\n", expect: EXIT.OK,
    why: "a seat file with no SEAT at all is a coordinator's prompt copied verbatim, which is what the direct route hands over; the default it falls back to is the narrowest seat there is, and it is REPORTED as undeclared so nobody reads it as a grant somebody made",
    assert: (r) => (r.level === "read" && !(r.seatFileFields ?? []).includes("SEAT"))
      || `a header-less file did not default to a read seat: ${JSON.stringify({ level: r.level, fields: r.seatFileFields })}` },
  { scenario: "happy", seat: "SEAT: read <CWD>\nVERIFY: touch <CWD>/seat-verify-must-not-run\n", expect: EXIT.USAGE,
    why: "VERIFY runs an unsandboxed shell with the caller's rights, so a newline-injected header must not enable it; seat-file use requires --allow-seat-verify on the command line",
    assertStderr: (e) => /allow-seat-verify/.test(e) || `a seat file supplied a verifier unasked: ${e.slice(0, 200)}` },
  { scenario: "happy", seat: "SEAT: read <CWD>\nEXPECT: echo\nVERIFY: true\n", expect: EXIT.OK, args: ["--allow-seat-verify"],
    why: "the escape hatch works and is explicit: with --allow-seat-verify on the command line the same file runs its verifier",
    assert: (r) => (r.verify?.ok === true && r.seatFileFields?.includes("VERIFY"))
      || `the permitted seat verifier did not run: ${JSON.stringify({ v: r.verify, f: r.seatFileFields })}` },
  { scenario: "happy", seat: "SEAT: read <CWD>\nEXPECT: echo\n", expect: EXIT.OK,
    why: "the report names what the FILE declared, so a wrapped seat is not indistinguishable from a hand-typed one",
    assert: (r) => (Array.isArray(r.seatFileFields) && r.seatFileFields.join(",") === "SEAT,EXPECT")
      || `seatFileFields wrong: ${JSON.stringify(r.seatFileFields)}` },

  { scenario: "happy",            expect: EXIT.VERIFY_UNMEASURABLE, args: ["--verify", "true"],
    env: { CODEX_DELEGATE_VERIFY_FLOOR_MS: "600000" },
    why: "a declared verifier with no remaining budget is unrun and must fail closed rather than fall through to weaker gates",
    assert: (r) => (r.verifySkipped === "budget-exhausted" && r.verify === null)
      || `the skipped verifier was not reported as such: ${JSON.stringify({ s: r.verifySkipped, v: r.verify })}` },

  // --- the read level's writable root is $TMPDIR, so $TMPDIR needs the guard every root gets ---
  { scenario: "happy",            expect: EXIT.USAGE,
    env: { CODEX_DELEGATE_STATE_DIR: protectedState, TMPDIR: protectedTmp },
    why: "$TMPDIR is the read-level write grant and must pass the protected-root guard so it cannot expose the receipt store",
    assertStderr: (e) => /refusing to grant write access/.test(e)
      || `a protected $TMPDIR was granted at read level: ${e.slice(0, 200)}` },
  { scenario: "happy",            expect: EXIT.OK, unsetEnv: ["TMPDIR"],
    why: "when TMPDIR is unset, a private directory permits scratch writes without granting all of /tmp; it lives under driver state so retention pruning reaches it",
    assert: (r, _ms, stateRoot) => {
      const roots = r.sandbox?.writableRoots ?? [];
      if (roots.length !== 1) return `the private temp grant is not exactly one root: ${JSON.stringify(roots)}`;
      if (roots[0] === os.tmpdir() || roots[0] === "/tmp") return `the grant is the whole system temp dir: ${JSON.stringify(roots[0])}`;
      if (r.tmpDir === null) return "the run made a private temp directory and the report does not name it";
      const base = path.join(stateRoot, "tmp");
      if (path.dirname(r.tmpDir) !== base) return `the private temp directory is not under <state>/tmp: ${JSON.stringify(r.tmpDir)}`;
      if (fs.realpathSync(r.tmpDir) !== roots[0]) return `the grant is not the reported directory: ${JSON.stringify({ tmpDir: r.tmpDir, root: roots[0] })}`;
      if ((fs.statSync(r.tmpDir).mode & 0o777) !== 0o700) return `the private temp directory is not 0700: ${(fs.statSync(r.tmpDir).mode & 0o777).toString(8)}`;
      return fs.existsSync(r.tmpDir) || `the run's private temp directory was removed at exit: ${r.tmpDir}`;
    } },
  { scenario: "happy",            expect: EXIT.OK, env: { TMPDIR: explicitTmp },
    why: "an explicit TMPDIR is honoured unchanged — the private directory is a fallback for an unset variable, never a substitution for the caller's own choice",
    assert: (r) => {
      const roots = r.sandbox?.writableRoots ?? [];
      if (r.tmpDir !== null) return `a caller's own TMPDIR was reported as this run's to remove: ${JSON.stringify(r.tmpDir)}`;
      return (roots.length === 1 && roots[0] === fs.realpathSync(explicitTmp))
        || `an explicit TMPDIR did not survive as the grant: ${JSON.stringify(roots)}`;
    } },

  // --- what the report says about the run's own footing ---
  { scenario: "happy",            expect: EXIT.OK,
    why: "the initialize response carries the server version in userAgent; the report must preserve it so protocol drift is diagnosable",
    assert: (r) => (r.codexVersion === "0.153.4" && r.codexVersionPinned === "0.153.4")
      || `codexVersion was not read out of the userAgent: ${JSON.stringify({ v: r.codexVersion, pinned: r.codexVersionPinned })}` },
  { scenario: "happy",            expect: EXIT.OK, env: { FAKE_CODEX_VERSION: "9.9.9" },
    why: "a codex that is not the one the protocol facts were measured against is the first thing to know when behaviour contradicts the docs; it must be said on stderr and in the report, not inferred from a later failure",
    assert: (r) => r.codexVersion === "9.9.9" || `drift was not reported: ${JSON.stringify(r.codexVersion)}` },
  { scenario: "happy",            expect: EXIT.OK,
    why: "the report must distinguish config inherited from a fresh probe, a last-known-good snapshot and account defaults",
    assert: (r) => (r.configInherited?.source === "probe" && r.configInherited.keys.includes("model"))
      || `a healthy probe was not reported as one: ${JSON.stringify(r.configInherited)}` },
  { scenario: "happy",            expect: EXIT.OK,
    env: { FAKE_CONFIG_FAIL: "1" },
    why: "the same field must distinguish the unhealthy case: a probe that failed with no last-known-good to keep means the turn ran on the account defaults",
    assert: (r) => (r.configInherited?.source === "none" && r.configInherited.keys.length === 0)
      || `a failed probe was reported as inheritance: ${JSON.stringify(r.configInherited)}` },
  { scenario: "happy",            expect: EXIT.USAGE,
    args: ["--output-schema", oneOfSchemaFile, "--cwd", "/nonexistent/pid-line-first"],
    why: "the pid on the FIRST stderr line is what every page tells a coordinator to signal and what the live gate reads; a schema warning written from inside the argument parser put a line in front of it that a reader taking the first line would signal nothing at all",
    assertStderr: (e) => (/^codex-delegate: pid=\d+ identity=/.test(e.split("\n")[0] ?? "") && /does not check \(oneOf\)/.test(e))
      || `the pid line is not first, or the warning was lost: ${JSON.stringify(e.split("\n").slice(0, 3))}` },
  { scenario: "happy",            expect: EXIT.OK,
    env: { FAKE_CONFIG_NULL: "1" },
    why: "the probe channel has no message handler, so a bare `null` line reached the response resolver and threw there — an uncaught TypeError with no report at all, before the turn had started",
    assert: (r) => (r.configInherited?.source === "probe" && r.configInherited.keys.includes("model"))
      || `a non-object frame cost the probe its answer: ${JSON.stringify(r.configInherited)}` },

  // --- --expect-command is matched against the command, not the shell that ran it ---
  { scenario: "happy",            expect: EXIT.OK, args: ["--expect-command", "^echo"],
    why: "the live server reports a shell wrapper, so --expect-command must also match the parsed command for anchored patterns to work",
    assert: (r) => (r.expectationOk === true && r.commandsMatchingExpectation === 1)
      || `an anchored pattern did not match the parsed command: ${JSON.stringify({ ok: r.expectationOk, n: r.commandsMatchingExpectation })}` },

  // --- the seat file is written by a program, so it must take the shapes a program writes ---
  { scenario: "happy", seat: "SEAT: read <CWD>\nEXPECT: echo\nNETWORK: no\nALLOW_NO_COMMANDS: false\nBRIEF: 0\n", expect: EXIT.OK,
    why: "NETWORK/ALLOW_NO_COMMANDS/BRIEF must accept explicit false values in a header template without enabling the flag or rejecting the seat",
    assert: (r) => (r.network === false && r.seatFileFields?.join(",") === "SEAT,EXPECT,NETWORK,ALLOW_NO_COMMANDS,BRIEF")
      || `a negated boolean did not read as omission: ${JSON.stringify({ net: r.network, fields: r.seatFileFields })}` },

  // --- --verify: the budget that killed it, and the sandbox that is opt-in ---
  { scenario: "happy",            expect: EXIT.VERIFY_UNMEASURABLE, args: ["--timeout", "3", "--verify", "sleep 20"],
    why: "a verifier killed at its budget must report that the clock caused the cut, rather than leave a null exit code and signal unexplained",
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
  { scenario: "happy",            expect: EXIT.OK,
    why: "and it must not fire where the reserve does not fit: on a 20 s seat a wrap-up steer would land in the first tick, which is an interruption rather than a warning — the rung is armed only when it leaves the model real time to write",
    assertStderr: (e) => !/wrap-up:/.test(e) || `a short seat was steered anyway: ${e.slice(0, 200)}` },
  { scenario: "happy",            expect: EXIT.OK,
    why: "durationMs on commandExecution items distinguishes time spent running commands from time spent in the model",
    assert: (r) => {
      const t = r.timing;
      if (!t || typeof t.wallMs !== "number" || typeof t.setupMs !== "number") return `no timing in the report: ${JSON.stringify(t)}`;
      if (!(t.wallMs > 0 && t.setupMs >= 0 && t.setupMs <= t.wallMs)) return `timing is not internally consistent: ${JSON.stringify(t)}`;
      if (t.commandMs !== 1) return `commandMs did not come from the item's own durationMs: ${JSON.stringify(t)}`;
      return t.modelMs === t.wallMs - t.setupMs - t.commandMs || `modelMs is not the remainder: ${JSON.stringify(t)}`;
    } },
  { scenario: "happy",            expect: EXIT.OK, args: ["--effort", "high"],
    why: "the measured failure shape: a high-effort turn spends minutes thinking before it writes anything, and under a short clock the cut lands before an answer exists. The warning is on stderr at the threadId announcement, while the caller can still stop the run",
    assertStderr: (e) => /effort high with --timeout 20s is the measured failure shape/.test(e)
      || `no warning for high effort under a short clock: ${e.slice(0, 300)}` },
  { scenario: "happy",            expect: EXIT.OK, args: ["--effort", "low"],
    why: "and it must stay quiet otherwise: a warning printed on every run is a warning nobody reads",
    assertStderr: (e) => !/measured failure shape/.test(e) || `the effort warning fired for low effort: ${e.slice(0, 200)}` },

  // --- the token accounting the SERVER does, which is not a bound the driver enforces ---
  { scenario: "happy",            expect: EXIT.USAGE, seat: "SEAT: read <CWD>\nBUDGET_TOKENS: 100000\n",
    why: "the driver has no token-budget knob; a header naming one must fail loudly rather than imply an unenforced bound",
    assertStderr: (e) => /unknown seat field BUDGET_TOKENS at line 2 of/.test(e)
      || `BUDGET_TOKENS was still understood: ${e.slice(0, 200)}` },

  // --- the bounds and the transport are flags: a seat file naming one is exit 2 ---
  { scenario: "happy",            expect: EXIT.USAGE, seat: "SEAT: read <CWD>\nTIMEOUT: 30\n",
    why: "the wall clock is the configuration the default exists to remove: a header that carries a TIMEOUT reintroduces exactly the bound every seat would otherwise have to size, so the field is refused and the flag stays for the caller who really wants one",
    assertStderr: (e) => /TIMEOUT is command-line-only; pass --timeout/.test(e)
      || `a seat file still set the wall clock: ${e.slice(0, 200)}` },
  { scenario: "happy",            expect: EXIT.USAGE, seat: "SEAT: read <CWD>\nIDLE_TIMEOUT: 300\n",
    why: "the default idle guard and command cap belong to the driver; a copied header must not widen or disable these hang guards",
    assertStderr: (e) => /IDLE_TIMEOUT is command-line-only; pass --idle-timeout/.test(e)
      || `a seat file still set the silence guard: ${e.slice(0, 200)}` },
  { scenario: "happy",            expect: EXIT.USAGE, seat: "SEAT: read <CWD>\nMAX_COMMANDS: 2\n",
    assertStderr: (e) => /MAX_COMMANDS is command-line-only; pass --max-commands/.test(e)
      || `a seat file still set the command cap: ${e.slice(0, 200)}`,
    why: "the volume cap is the maxTurns a native subagent has; the driver owns it" },
  { scenario: "happy",            expect: EXIT.USAGE, seat: "SEAT: read <CWD>\nREPORT_FILE: /tmp/elsewhere.json\n",
    why: "the delivery is the caller's, not the header's: the report file is where the run's whole evidence lands, so a line inside the prompt that redirects it is a seat writing its own answer somewhere its coordinator never looks",
    assertStderr: (e) => /REPORT_FILE is command-line-only; pass --report-file/.test(e)
      || `a seat file still chose where the report lands: ${e.slice(0, 200)}` },
  { scenario: "happy",            expect: EXIT.USAGE, seat: "SEAT: read <CWD>\nTIMEOUT: 30\n", args: ["--timeout", "5"],
    why: "and the refusal is not waived by passing the flag too: a seat file that names a bound is a caller who believes the file decides it, and running the flag's value silently would leave that belief in place",
    assertStderr: (e) => /TIMEOUT is command-line-only/.test(e)
      || `an explicit --timeout beside the field made the field acceptable: ${e.slice(0, 200)}` },
  { scenario: "happy",            expect: EXIT.OK, noTimeout: true, args: ["--effort", "high"],
    why: "the 'high effort with a short clock' warning is about a clock that was SET; on the default it would fire on every run and warn about a budget nobody declared",
    assertStderr: (e) => !/measured failure shape/.test(e)
      || `the effort warning fired with no wall clock: ${e.slice(0, 200)}` },

  // --- the read level's cwd: a grant only where it grants something ---
  { scenario: "happy",            expect: EXIT.OK, seat: "SEAT: read\nEXPECT: echo\n",
    why: "SEAT: read without a directory means the current tree and grants no additional write rights",
    assert: (r) => (r.cwd === (fs.realpathSync(process.cwd())) && (r.seatFileFields ?? []).join(",") === "SEAT,EXPECT")
      || `a bare SEAT: read did not default to the current directory: ${JSON.stringify({ cwd: r.cwd, fields: r.seatFileFields })}` },
  { scenario: "happy",            expect: EXIT.USAGE, seat: "SEAT: write\n",
    why: "and NOT at write level: there the cwd is the writable root itself, and a defaulted grant is one nobody made — the driver would hand the turn whatever directory the caller happened to be standing in",
    assertStderr: (e) => /SEAT write needs a directory/.test(e)
      || `a bare SEAT: write defaulted its writable root: ${e.slice(0, 200)}` },
  { scenario: "happy",            expect: EXIT.USAGE, noCwd: true, args: ["--level", "write"],
    why: "the command line applies the same cwd rule: read can use the current directory, while write requires an explicit grant",
    assertStderr: (e) => /--cwd is required at --level write/.test(e)
      || `--level write ran without a writable root: ${e.slice(0, 200)}` },
  { scenario: "happy", expect: EXIT.USAGE, noPrompt: true,
    seat: "SEAT: read <CWD>\nEXPECT: echo\nNOTE: not a field\nTASK: do it\n",
    why: "an unknown ALL-CAPS name above the body is a typo or flag; silently treating it as prompt text would leave a believed setting unapplied",
    assertStderr: (e) => (/unknown seat field NOTE at line 3 of/.test(e) && /the body starts at the first TASK: line/.test(e))
      || `the unknown field did not name its line and the way out: ${e.slice(0, 240)}` },
  { scenario: "happy", expect: EXIT.USAGE,
    seat: "SEAT: read <CWD>\nEXPECT: echo\nTASK: the file's own body\n",
    why: "the file's body and --prompt are two prompts, and no rule says which one ran; the harness passes --prompt to every case that does not opt out, so this is also what proves the body route is the one being measured above",
    assertStderr: (e) => /carries a body below its header and --prompt was given too/.test(e)
      || `two prompts were accepted: ${e.slice(0, 200)}` },
];

assertKnownScenarios(CASES);

// --- flows: what one run of the driver cannot express ---
//
// A record written by one run and read by the next, a report delivered to a file, a signal mid-turn:
// each step's state is the next step's input, so these are procedural rather than table cases.
// Each gets a state directory of its own: every fixture run reports the SAME thread id, so a shared
// registry would let one flow read another's record.
const { cases: FLOWS, test: flow } = registry();

flow("with no wall clock, a prompt that never arrives on stdin is ended by the silence budget",
  "with no wall clock, an open stdin pipe from a dead caller can hold the driver forever before any thread exists; the stdin read needs its own bound",
  async () => {
    const state = flowState();
    const p = spawn(process.execPath, [DRIVER, "--level", "read", "--cwd", shimDir, "--idle-timeout", "2"],
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

// --- the report file: the delivery a caller holding no pipe collects the run from ---

const reportPath = (state, name = "report.json") => path.join(state, name);

flow("--report-file publishes the whole report at 0600, byte for byte what stdout carried",
  "the caller reads the file after the task's exit notification, not the pipe: a file that differs from stdout by one escape, or that a second seat can read, is a second report format and a leak of the seat's answer",
  async () => {
    const problems = [];
    // A long report and one carrying non-ASCII and escapes: the file is the same bytes either way, or
    // an answer that survived the pipe is not the one on disk.
    for (const [scenario, args, prompt] of [
      ["long-answer", [], undefined],
      ["echo-input", [], "кавычки \"x\" \\ ⧉  and a newline\nbelow"]]) {
      const state = flowState();
      const p = reportPath(state);
      const { code, out, err } = await run({ scenario, args: [...args, "--report-file", p],
        ...(prompt === undefined ? {} : { noPrompt: true }),
        env: { CODEX_DELEGATE_STATE_DIR: state },
        ...(prompt === undefined ? {} : { seat: `SEAT: read <CWD>\n${prompt}\n` }) });
      if (code !== EXIT.OK) { problems.push(`${scenario} exited ${code}: ${err.trim().slice(-160)}`); continue; }
      if (!fs.existsSync(p)) { problems.push(`${scenario}: no report at ${p}`); continue; }
      const mode = fs.statSync(p).mode & 0o777;
      if (mode !== 0o600) problems.push(`${scenario}: the report is mode ${mode.toString(8)}, not 600`);
      const onDisk = fs.readFileSync(p, "utf8");
      if (onDisk !== out) problems.push(`${scenario}: the file is ${onDisk.length} bytes and stdout ${out.length}`);
      if (!readJson(p)) problems.push(`${scenario}: the published report does not parse`);
      // Nothing is left beside it: the temp name the rename published from is gone.
      const left = fs.readdirSync(state).filter((n) => n.startsWith("report.json."));
      if (left.length) problems.push(`${scenario}: the publication left ${left.join(", ")}`);
    }
    return problems.length === 0 || problems.join("; ");
  });

flow("--report-file makes the directories its path needs, at 0700, however many levels are missing",
  "the coordinator that names the path cannot make it: in a headless session a Write or a mkdir under the plugin's data directory is denied as a sensitive path with no prompt anyone can answer, while this process handed the same path as an argument is not — so a run directory only the driver ever creates is what the orchestrate page can promise",
  async () => {
    const problems = [];
    for (const [label, ...parts] of [["one level", "run", "seat", "report.json"],
                                     ["two levels", "orchestrate", "slug", "run", "seat", "report.json"]]) {
      const state = flowState();
      const p = path.join(state, ...parts);
      const { code, out, err } = await run({ scenario: "happy", args: ["--report-file", p],
        env: { CODEX_DELEGATE_STATE_DIR: state } });
      if (code !== EXIT.OK) { problems.push(`${label}: exit ${code}: ${err.trim().slice(-160)}`); continue; }
      if (!fs.existsSync(p)) { problems.push(`${label}: no report at ${p}`); continue; }
      if (fs.readFileSync(p, "utf8") !== out) problems.push(`${label}: the file is not the bytes stdout carried`);
      // Every directory the run made, not the last one alone: an intermediate left at 0755 is a run
      // directory any other account on the machine can list.
      for (let d = path.dirname(p); d !== state; d = path.dirname(d)) {
        const mode = fs.statSync(d).mode & 0o777;
        if (mode !== 0o700) problems.push(`${label}: ${path.basename(d)} is mode ${mode.toString(8)}, not 700`);
      }
    }
    return problems.length === 0 || problems.join("; ");
  });

flow("--report-file refuses a path it would overwrite, a symbolic link, a relative one and a directory it cannot write, before anything is spawned",
  "the report file is the run's whole delivery: a path already holding one is two seats' evidence in one file, a link is a path whose destination someone else chooses, and every one of these is knowable before a token is spent — refused after the turn it would cost the delegation",
  async () => {
    const state = flowState();
    const marker = path.join(state, "codex-ran");
    const probeShim = path.join(state, "shim");
    fs.mkdirSync(probeShim, { recursive: true });
    fs.writeFileSync(path.join(probeShim, "codex"), `#!/bin/sh\necho ran >> "${marker}"\nexec "${process.execPath}" "${FAKE}" "$@"\n`, { mode: 0o755 });
    const taken = reportPath(state, "taken.json");
    fs.writeFileSync(taken, "{}\n");
    // A DANGLING link: existsSync follows it and reads "absent", so only an lstat sees the entry.
    const linkTarget = reportPath(state, "link-target.json");
    const dangling = reportPath(state, "dangling.json");
    fs.symlinkSync(linkTarget, dangling);
    const ro = path.join(state, "read-only");
    fs.mkdirSync(ro, { mode: 0o500 });
    const problems = [];
    try {
      for (const [p, why] of [[taken, "already exists"], [dangling, "already exists"],
                              ["report.json", "must be an absolute path"],
                              [path.join(ro, "r.json"), "cannot write into"]]) {
        const { code, out, err } = await run({ scenario: "happy", args: ["--report-file", p],
          env: { CODEX_DELEGATE_STATE_DIR: state, PATH: `${probeShim}:${process.env.PATH}` } });
        if (code !== EXIT.USAGE) problems.push(`${why}: exit ${code}, expected 2 (${err.trim().slice(0, 120)})`);
        else if (!err.includes(why)) problems.push(`${why}: the refusal does not say so: ${err.trim().slice(0, 160)}`);
        if (out.trim()) problems.push(`${why}: a usage error printed ${out.length} bytes of report`);
      }
    } finally { fs.chmodSync(ro, 0o700); }
    if (fs.readFileSync(taken, "utf8") !== "{}\n") problems.push("the refused run overwrote the file it was refused");
    if (!fs.lstatSync(dangling).isSymbolicLink()) problems.push("the refused run replaced the link with a file of its own");
    if (fs.existsSync(linkTarget)) problems.push("the refused run wrote through the link, creating its target");
    if (fs.existsSync(marker)) problems.push("a refused --report-file still spawned a codex");
    return problems.length === 0 || problems.join("; ");
  });

flow("a report that could not reach stdout is complete in --report-file, under the verdict the turn earned",
  "the whole point of the file is that the pipe stops mattering: a caller that closed stdout, or a task whose output was truncated, must not turn a finished turn into a transport failure or lose the answer it already paid for",
  async () => {
    const state = flowState();
    const p = reportPath(state);
    const { code } = await run({ scenario: "long-answer", closeStdout: true,
      args: ["--report-file", p], env: { CODEX_DELEGATE_STATE_DIR: state } });
    if (!fs.existsSync(p)) return "a closed stdout took the report file with it";
    const r = readJson(p);
    if (!r) return "the published report does not parse";
    if (r.exitCode !== EXIT.OK || r.turnStatus !== "completed")
      return `the report's own verdict changed with the pipe: ${JSON.stringify({ exitCode: r.exitCode, turnStatus: r.turnStatus })}`;
    if (code !== EXIT.OK) return `the run exited ${code}; a delivered report keeps the turn's own code, not the pipe's 4`;
    if (!String(r.answer).length) return "the report reached the file without the answer";
    return true;
  });

flow("two seats naming one --report-file: the first to publish keeps the file, the second exits 4 and says so",
  "the pre-spawn check cannot see a run that starts after it, so the publication itself has to hold the no-clobber rule: a report written over a delivered one is two seats' evidence in one file with nothing saying whose, and the loser's own verdict must still reach it on stdout",
  async () => {
    const slowState = flowState(), fastState = flowState();
    const p = reportPath(slowState);
    // The slow seat opens the path first and publishes last, so its refusal is the race and not the
    // pre-spawn check — which the two exit codes tell apart, 4 against 2.
    const slow = run({ scenario: "slow-turn", args: ["--report-file", p],
      env: { CODEX_DELEGATE_STATE_DIR: slowState } });
    // Its state directory stays empty until readOpts returns, and openReportFile runs inside readOpts.
    if (!await until(() => fs.readdirSync(slowState).some((n) => n !== "report.json")))
      return "the slow seat never reached its state directory";
    const fast = await run({ scenario: "happy", args: ["--report-file", p],
      env: { CODEX_DELEGATE_STATE_DIR: fastState } });
    const late = await slow;
    const problems = [];
    if (fast.code !== EXIT.OK) problems.push(`the first publisher exited ${fast.code}: ${fast.err.trim().slice(-160)}`);
    if (late.code !== EXIT.TRANSPORT) problems.push(`the second publisher exited ${late.code}, not 4: ${late.err.trim().slice(-160)}`);
    if (!late.err.includes(`the report could not be published at ${p}`))
      problems.push(`the loser does not name the path it lost: ${late.err.trim().slice(-200)}`);
    const onDisk = readJson(p);
    if (!onDisk) problems.push(`no parseable report at ${p}`);
    else if (onDisk.answer !== "the answer") problems.push(`the file holds the loser's report: ${JSON.stringify(String(onDisk.answer).slice(0, 60))}`);
    let mine = null;
    try { mine = JSON.parse(late.out); } catch {}
    if (!mine) problems.push(`the loser's own report did not reach its stdout: ${late.out.slice(0, 120)}`);
    else if (mine.answer !== "slow but fine") problems.push(`the loser's stdout report is not its own turn: ${JSON.stringify(String(mine.answer).slice(0, 60))}`);
    if (fs.readdirSync(slowState).some((n) => n.startsWith("report.json.")))
      problems.push("the failed publication left its temp file behind");
    return problems.length === 0 || problems.join("; ");
  });

flow("a server that dies mid-turn publishes the collected report, not a pre-turn refusal",
  "exit 4 is not 'no turn ran': the thread, the command and the partial answer are what the run already paid for, and a report that replaced them with an `error` key would send a coordinator to relaunch work that had happened",
  async () => {
    const state = flowState();
    const p = reportPath(state);
    const { code } = await run({ scenario: "server-crash", args: ["--report-file", p],
      env: { CODEX_DELEGATE_STATE_DIR: state } });
    if (code !== EXIT.TRANSPORT) return `a mid-turn crash exited ${code}, not 4`;
    const r = readJson(p);
    if (!r) return `no parseable report at ${p}`;
    if ("error" in r) return `the collected report was replaced by a pre-turn refusal: ${JSON.stringify(r.error)}`;
    if (r.turnStatus !== "failed") return `turnStatus is ${JSON.stringify(r.turnStatus)}, not "failed"`;
    if (r.commandsSucceeded !== 1) return `the command the turn ran is gone: commandsSucceeded ${JSON.stringify(r.commandsSucceeded)}`;
    return String(r.answer).includes("partial answer before the crash")
      || `the answer the turn had already streamed was dropped: ${JSON.stringify(r.answer)}`;
  });

flow("a refusal reached before the thread is written to --report-file, as a report saying so",
  "the caller is woken by the task's exit and reads one path: a refusal that left the file empty is indistinguishable from a seat that is still starting, and inventing a receipt or a turn status for it would be worse",
  async () => {
    const state = flowState();
    const p = reportPath(state);
    const { code, out } = await run({ scenario: "happy", noPrompt: true,
      seat: "SEAT: read /nonexistent/report/dir\nTASK: do it\n",
      args: ["--report-file", p], env: { CODEX_DELEGATE_STATE_DIR: state } });
    if (code !== EXIT.USAGE) return `a seat that could not start exited ${code}`;
    if (out.trim()) return `a usage error printed ${out.length} bytes on stdout`;
    const r = readJson(p);
    if (!r) return `no parseable report at ${p}`;
    if (r.ok !== false || r.exitCode !== EXIT.USAGE) return `the refusal does not carry its own verdict: ${JSON.stringify(r)}`;
    if (r.turnStatus !== null || r.answer !== "") return `a turn status or an answer was invented: ${JSON.stringify(r)}`;
    if (r.threadId !== null) return `a thread that never existed was named: ${JSON.stringify(r.threadId)}`;
    if (!/--cwd does not exist/.test(String(r.error))) return `the refusal does not carry the reason: ${JSON.stringify(r.error)}`;
    if (r.reportPath !== p) return `the report does not name itself: ${JSON.stringify(r.reportPath)}`;
    // The two refusals the argument scan raises before it has a seat file at all: they used to be
    // decided above the line that opens the report, so the caller was woken by a path that was empty.
    const problems = [];
    const seatFile = path.join(state, "seat.txt");
    fs.writeFileSync(seatFile, `SEAT: read ${shimDir}\nTASK: do it\n`);
    for (const [name, file, extra] of [
      ["a valueless --seat-file", "valueless.json", ["--seat-file"]],
      ["--seat-file twice", "twice.json", ["--seat-file", seatFile, "--seat-file", seatFile]]]) {
      const q = reportPath(state, file);
      const res = await run({ scenario: "happy", noPrompt: true,
        args: ["--report-file", q, ...extra], env: { CODEX_DELEGATE_STATE_DIR: state } });
      if (res.code !== EXIT.USAGE) { problems.push(`${name}: exit ${res.code}, expected 2`); continue; }
      const rq = readJson(q);
      if (!rq) { problems.push(`${name}: no parseable report at ${q}`); continue; }
      if (rq.ok !== false || rq.exitCode !== EXIT.USAGE) problems.push(`${name}: the refusal does not carry its own verdict: ${JSON.stringify(rq)}`);
      if (!/--seat-file/.test(String(rq.error))) problems.push(`${name}: the refusal does not name the flag: ${JSON.stringify(rq.error)}`);
    }
    return problems.length === 0 || problems.join("; ");
  });

flow("a resumed seat writes a report file of its own",
  "a follow-up turn is a second delivery, not an amendment: written over the first it would leave the thread's earlier evidence unreadable, and the no-clobber rule is what makes the caller name a new path",
  async () => {
    const state = flowState();
    const first = reportPath(state, "first.json"), second = reportPath(state, "second.json");
    const a = await run({ scenario: "happy", args: ["--report-file", first], env: { CODEX_DELEGATE_STATE_DIR: state } });
    if (a.code !== EXIT.OK) return `the first turn exited ${a.code}: ${a.err.trim().slice(-160)}`;
    const b = await run({ scenario: "happy", args: ["--resume", "thr_root", "--report-file", second],
      env: { CODEX_DELEGATE_STATE_DIR: state } });
    if (b.code !== EXIT.OK) return `the resumed turn exited ${b.code}: ${b.err.trim().slice(-160)}`;
    const r1 = readJson(first), r2 = readJson(second);
    if (!r1 || !r2) return "one of the two turns published nothing";
    if (r1.resumedFrom !== null) return `the first turn reported a resume: ${JSON.stringify(r1.resumedFrom)}`;
    if (r2.resumedFrom !== "thr_root") return `the second turn does not name the thread it continued: ${JSON.stringify(r2.resumedFrom)}`;
    // And the second run refuses to publish over the first: the paths are the caller's to keep apart.
    const again = await run({ scenario: "happy", args: ["--resume", "thr_root", "--report-file", first],
      env: { CODEX_DELEGATE_STATE_DIR: state } });
    if (again.code !== EXIT.USAGE || !/already exists/.test(again.err))
      return `a resumed seat overwrote the earlier report: exit ${again.code} ${again.err.trim().slice(0, 160)}`;
    return readJson(first)?.resumedFrom === null || "the refused resume rewrote the first report anyway";
  });

// --- the seat file, which is the whole of what a caller hands the driver ---

flow("a seat file supplies the rights line a coordinator's prompt does not have, and a SEAT below another field is still refused",
  "the caller writes the prompt it was given, unchanged, and a prompt is not obliged to open with a header at all: the default it falls back to widens nothing (read level, this directory), while a SEAT anywhere but first is the injection that would",
  async () => {
    const here = fs.realpathSync(process.cwd());
    const parse = (o) => { try { return JSON.parse(o); } catch { return null; } };
    // A prompt exactly as a coordinator wrote it: no header at all.
    const bare = await run({ scenario: "happy", noPrompt: true,
      seat: "Count the exit codes in the driver and say how many.\n",
      env: { CODEX_DELEGATE_STATE_DIR: flowState() } });
    if (bare.code !== EXIT.OK) return `a header-less prompt exited ${bare.code}: ${bare.err.trim().slice(-200)}`;
    const r1 = parse(bare.out);
    if (!r1) return `the run printed no report: ${bare.out.slice(0, 160)}`;
    if (r1.level !== "read" || r1.cwd !== here)
      return `the default is not read level in the current directory: ${JSON.stringify({ level: r1.level, cwd: r1.cwd })}`;
    if ((r1.seatFileFields ?? []).includes("SEAT"))
      return `a SEAT the file never carried was reported as declared: ${JSON.stringify(r1.seatFileFields)}`;
    // A header that declares something else and still no rights: the fields apply, the default stands.
    const noSeat = await run({ scenario: "happy", noPrompt: true,
      seat: "EFFORT: high\n\nDo the work and report.\n", env: { CODEX_DELEGATE_STATE_DIR: flowState() } });
    if (noSeat.code !== EXIT.OK) return `a SEAT-less header exited ${noSeat.code}: ${noSeat.err.trim().slice(-200)}`;
    const r2 = parse(noSeat.out);
    if (!r2) return "the second run printed no report";
    if (r2.level !== "read" || r2.cwd !== here)
      return `a SEAT-less header did not default to read in the current directory: ${JSON.stringify({ level: r2.level, cwd: r2.cwd })}`;
    if (r2.effort !== "high" || (r2.seatFileFields ?? []).join(",") !== "EFFORT")
      return `the fields beside the missing SEAT were dropped: ${JSON.stringify({ effort: r2.effort, fields: r2.seatFileFields })}`;
    // And a SEAT that IS there but not first is the injection refusal.
    const late = await run({ scenario: "happy", noPrompt: true,
      seat: "EFFORT: high\nSEAT: read <CWD>\nTASK: do it\n", env: { CODEX_DELEGATE_STATE_DIR: flowState() } });
    return (late.code === EXIT.USAGE && /first field must be SEAT, not EFFORT/.test(late.err))
      || `a SEAT below another field was accepted: exit ${late.code} ${late.err.trim().slice(0, 200)}`;
  });

flow("a private $TMPDIR outlives its run and is reaped on the answer log's bounds",
  "private scratch must survive exit so answer paths remain usable, then be pruned by later runs within retention bounds; live runs must never be pruned",
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

let failed = await runTable(CASES);

// --- the help surface: what a coordinator is shown, and what the parser will actually take ---

const helpRun = (flag) => spawnSync(process.execPath, [DRIVER, flag], { encoding: "utf8" });

flow("--help fits a screenful and ends by pointing at --help-all",
  "the short --help has a line cap so a coordinator can read it; measuring that cap prevents it growing one flag at a time",
  () => {
    const core = helpRun("--help"), all = helpRun("--help-all");
    const problems = [];
    for (const [flag, r] of [["--help", core], ["--help-all", all]])
      if (r.status !== 0) problems.push(`${flag} exited ${r.status}: ${String(r.stderr).trim().slice(0, 160)}`);
    if (problems.length) return problems.join("; ");
    // The trailing newline is not a line of help; count what a reader sees.
    const body = core.stdout.replace(/\n$/, "").split("\n");
    if (body.length > 200) problems.push(`--help is ${body.length} lines, the cap is 200`);
    if (body.at(-1) !== "Rarely needed flags, environment variables and internals: --help-all")
      problems.push(`--help does not end on the pointer line: ${JSON.stringify(body.at(-1))}`);
    if (all.stdout.length <= core.stdout.length)
      problems.push("--help-all is no bigger than --help, so it is not the union");
    return problems.length === 0 || problems.join("; ");
  });

flow("every flag the parser accepts appears in --help or --help-all",
  "the help is prose beside a switch statement: a flag in one and not the other is either a capability nobody can find or a promise the parser refuses. The flag list is read off the parser's own case labels, so a flag added without a help entry fails here rather than being remembered",
  () => {
    const parsed = [...new Set([...fs.readFileSync(DRIVER, "utf8").matchAll(/case "(-{1,2}[a-z-]+)":/g)].map((m) => m[1]))];
    // A pattern that stopped matching would pass this case with nothing to check.
    if (parsed.length < 25) return `only ${parsed.length} case labels matched in the parser; the pattern has drifted`;
    const core = helpRun("--help").stdout, all = helpRun("--help-all").stdout;
    // Word-boundary on the right, or --wait would be "documented" by --wait-timeout.
    const names = (text, f) => new RegExp(`(?<![a-z-])${f}(?![a-z-])`).test(text);
    const undocumented = parsed.filter((f) => !names(core, f) && !names(all, f));
    const dropped = parsed.filter((f) => names(core, f) && !names(all, f));
    const problems = [];
    if (undocumented.length) problems.push(`in the parser, in neither tier: ${undocumented.join(", ")}`);
    if (dropped.length) problems.push(`in --help but not in --help-all, which is meant to be the union: ${dropped.join(", ")}`);
    return problems.length === 0 || problems.join("; ");
  });

flow("--json and --footer are refused like any other unknown flag",
  "both are gone — the JSON report is the only report — and a driver that quietly ACCEPTED either would let a stale recipe keep running while asking for something the driver no longer has",
  async () => {
    const problems = [];
    for (const flag of ["--json", "--footer"]) {
      const { code, out, err } = await run({ scenario: "happy", args: [flag] });
      if (code !== EXIT.USAGE) problems.push(`${flag} exited ${code}, expected ${EXIT.USAGE}`);
      if (!new RegExp(`unknown argument: ${flag}`).test(err)) problems.push(`${flag}: ${err.trim().slice(0, 120)}`);
      if (out.trim()) problems.push(`${flag} printed ${out.length} bytes on stdout; an argument error prints no report`);
    }
    return problems.length === 0 || problems.join("; ");
  });

failed += await runCases(FLOWS);

fs.rmSync(shimDir, { recursive: true, force: true });
process.exit(summarize(failed, CASES.length + FLOWS.length));
