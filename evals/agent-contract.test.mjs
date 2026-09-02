#!/usr/bin/env node
// Does the shipped relay agent still describe the driver it drives?
//
//   node evals/agent-contract.test.mjs
//
// agents/codex-seat.md is the artefact every default plugin install uses, and its whole contract — the
// seat-file vocabulary, the fields that are refused, the report keys it promises to relay, the exit-90
// sentinel — lived in prose that nothing checked. It had already drifted twice: a TIMEOUT constant with
// no derivation, and three driver flags (--review, --resume, --progress) the header could not express.
// This reads the document and the driver and compares them.

import fs from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");
const AGENT = path.join(ROOT, "agents", "codex-seat.md");
const DRIVER = path.join(ROOT, "skills", "codex-delegate", "scripts", "driver.mjs");

const agent = fs.readFileSync(AGENT, "utf8");
const driver = fs.readFileSync(DRIVER, "utf8");

const CASES = [];
const test = (name, why, fn) => CASES.push({ name, why, fn });

// The driver's own vocabulary, read out of the source rather than restated here — a copy in this file
// would be a third place to drift.
const seatFields = (() => {
  const m = driver.match(/const SEAT_FIELDS = new Set\(\[([\s\S]*?)\]\)/);
  return m ? [...m[1].matchAll(/"([A-Z_]+)"/g)].map((x) => x[1]) : [];
})();
// What the agent's header block documents: the FIELD: lines of its own field list.
const documented = [...agent.matchAll(/^ {4}([A-Z_]+):/gm)].map((m) => m[1]);

test("the driver's seat-file vocabulary is not empty (the reader below is sound)",
  "every case here compares against SEAT_FIELDS; if the regex stopped matching, the whole suite would pass vacuously",
  () => seatFields.length >= 10 || `read ${seatFields.length} fields out of the driver: ${JSON.stringify(seatFields)}`);

test("every field the driver accepts is documented by the agent",
  "a flag the relay cannot express is a capability the plugin ships and cannot use — exactly how --review, --resume and --progress went missing",
  () => {
    // VERIFY is the one field the driver parses but this relay must never write: it needs
    // --allow-seat-verify on the command line, which the agent never passes. It therefore belongs in
    // the refusal table (asserted below), not in the header list.
    const missing = seatFields.filter((f) => f !== "VERIFY" && !documented.includes(f));
    return missing.length === 0 || `undocumented in codex-seat.md: ${missing.join(", ")}`;
  });

test("every field the agent documents is accepted by the driver",
  "the opposite drift: a header the relay writes and the driver rejects fails the seat with exit 2 before any work",
  () => {
    const bogus = documented.filter((f) => !seatFields.includes(f));
    return bogus.length === 0 || `documented but rejected by the driver: ${bogus.join(", ")}`;
  });

test("the four command-line-only flags are refused as fields, and the agent says so",
  "a newline in a relayed value opens a new field, so anything accepted here can be injected: VERIFY runs a shell, ATTACH uploads a file, STEER_FILE truncates one, MCP grants tool servers",
  () => {
    const problems = [];
    // VERIFY is special: it IS a driver field, but reachable only with --allow-seat-verify on the
    // command line, which this relay never passes — so the agent must name it as refused.
    if (!/allow-seat-verify/.test(agent)) problems.push("the agent does not mention --allow-seat-verify");
    if (!/--allow-seat-verify/.test(driver)) problems.push("the driver lost --allow-seat-verify");
    if (!/`VERIFY`/.test(agent)) problems.push("VERIFY is not named in the agent's refusal table");
    for (const f of ["ATTACH", "STEER_FILE", "MCP"]) {
      if (seatFields.includes(f)) problems.push(`${f} is a seat field again`);
      if (!new RegExp(`\`?${f}\`?`).test(agent)) problems.push(`${f} is not named in the agent's refusal table`);
    }
    return problems.length === 0 || problems.join("; ");
  });

test("SEAT is first and required, in both the document and the driver",
  "a seat file whose rights line is not first can have one supplied by an injected later line",
  () => {
    const problems = [];
    if (!/first field must be SEAT/.test(driver)) problems.push("the driver no longer enforces SEAT-first");
    if (!/`SEAT:` goes first|SEAT.*first/i.test(agent)) problems.push("the agent no longer states the SEAT-first rule");
    if (seatFields[0] !== "SEAT") problems.push(`SEAT is not the first entry of SEAT_FIELDS: ${seatFields[0]}`);
    return problems.length === 0 || problems.join("; ");
  });

test("the report keys the agent promises to relay exist in the driver's report",
  "the envelope is the coordinator's only view of a wrapped seat; a key that stopped being emitted turns into a silent null in every panel",
  () => {
    const promised = ["exitCode", "threadId", "receiptOk", "commandsSucceeded", "receiptPath", "answerPath",
                      "answerTruncated", "worktreePreserved", "worktreeRemoveCommand"];
    const missing = promised.filter((k) => !new RegExp(`\\b${k}\\b`).test(driver) || !new RegExp(`\\b${k}\\b`).test(agent));
    return missing.length === 0 || `promised by the agent but absent from the driver's report (or vice versa): ${missing.join(", ")}`;
  });

test("the exit-90 sentinel is distinct from every code the driver can return",
  "node's own exit 1 for a missing module is indistinguishable from the driver's documented 'the turn did not complete', which is why DRIVER_NOT_FOUND has a code of its own",
  () => {
    if (!/DRIVER_NOT_FOUND/.test(agent) || !/exit 90/.test(agent)) return "the agent lost the DRIVER_NOT_FOUND sentinel";
    const codes = [...driver.matchAll(/const EXIT = \{([^}]*)\}/g)].flatMap((m) => [...m[1].matchAll(/: (\d+)/g)].map((x) => Number(x[1])));
    return !codes.includes(90) || "the driver now uses exit 90 too, so the sentinel is ambiguous";
  });

// The shell the agent tells the relay to run, and the prose read with its line breaks flattened.
const shellBlocks = [...agent.matchAll(/```sh\n([\s\S]*?)```/g)].map((m) => m[1]);
const inlineShell = [...agent.matchAll(/`(mktemp -d [^`]*)`/g)].map((m) => m[1]);
const flat = agent.replace(/\s+/g, " ");

test("the driver probe starts at the exact ${CLAUDE_PLUGIN_ROOT} placeholder and ends at the plugin cache",
  "Claude Code substitutes that exact form inline in an agent body and exports nothing to the Bash tool, so a ${VAR:-default} is never substituted, expands to the default, and makes every plugin-installed seat exit 90",
  () => {
    const REL = "skills/codex-delegate/scripts/driver.mjs";
    if (path.relative(ROOT, DRIVER).split(path.sep).join("/") !== REL) return `the shipped layout moved: ${path.relative(ROOT, DRIVER)}`;
    if (/CLAUDE_PLUGIN_ROOT\s*:-/.test(agent))
      return "the probe uses ${CLAUDE_PLUGIN_ROOT:-...}, which Claude Code does not substitute — the seat would probe the default, not the plugin";
    const probed = [...agent.matchAll(/"([^"]*driver\.mjs)"/g)].map((m) => m[1]);
    const problems = [];
    if (probed[0] !== `\${CLAUDE_PLUGIN_ROOT}/${REL}`) problems.push(`first probe is ${JSON.stringify(probed[0] ?? null)}, not \${CLAUDE_PLUGIN_ROOT}/${REL}`);
    if (!probed.includes(`$HOME/.claude/${REL}`)) problems.push(`the $HOME/.claude route is not probed: ${JSON.stringify(probed)}`);
    if (!/plugins\/cache\/codex-delegate\/codex-delegate\/\*\/skills\/codex-delegate\/scripts\/driver\.mjs/.test(agent))
      problems.push("the plugins/cache route an isolated plugin install actually uses is not probed");
    if (!/DRIVER=/.test(agent)) problems.push("the chosen driver is not echoed, so a wrong route is invisible in the transcript");
    return problems.length === 0 || problems.join("; ");
  });

test("every shell the agent hands the relay parses",
  "the one-liner is copied verbatim into a Bash call; a stray quote or an unbalanced brace is a seat that never runs, and nothing else reads this text before a live run does",
  () => {
    const scripts = [...shellBlocks, ...inlineShell];
    if (scripts.length < 2) return `expected the mktemp pre-step and the driver call, found ${scripts.length} shell snippets`;
    const problems = [];
    for (const src of scripts) {
      const r = spawnSync("bash", ["-n"], { input: src, encoding: "utf8" });
      if (r.status !== 0) problems.push(`bash -n rejected ${JSON.stringify(src.slice(0, 60))}: ${String(r.stderr).trim()}`);
    }
    return problems.length === 0 || problems.join("; ");
  });

test("the scratch directory comes from one mktemp call, not from an unexpandable $TMPDIR path",
  "Write and Read take literal absolute paths and expand nothing, so a relay told to write $TMPDIR/seat-<n>.txt improvises — measured 4/4 runs into world-readable /tmp with colliding names",
  () => {
    const problems = [];
    if (!/mktemp -d "\$\{TMPDIR:-\/tmp\}\/codex-seat\.XXXXXXXX"/.test(agent)) problems.push("the mktemp -d pre-step is gone or reworded");
    if (!/TWO Bash calls/.test(agent)) problems.push("the agent no longer states the Bash-call budget (mktemp, then the driver)");
    if (/\$TMPDIR\/(seat|task|report|stderr)-/.test(agent)) problems.push("a scratch path is still written as $TMPDIR/..., which the Write and Read tools cannot expand");
    return problems.length === 0 || problems.join("; ");
  });

test("the driver call echoes an absolute report path for the Read tool",
  "the report lives in a directory only the mktemp call knows; without REPORT=<abs path> in the Bash result the relay has to reconstruct it",
  () => {
    const block = shellBlocks.find((b) => /--seat-file/.test(b));
    if (!block) return "no shell block runs the driver with --seat-file";
    const problems = [];
    if (!/echo "EXIT=\$\? [^"]*REPORT=[^"]*report-/.test(block)) problems.push("the driver call does not echo EXIT= together with an absolute REPORT= path");
    if (!/2> ?"?\$D\/stderr-/.test(block)) problems.push("stderr is not captured beside the report");
    if (!/REPORT=/.test(agent.slice(agent.indexOf("```sh") + shellBlocks.join("").length))) problems.push("the read step does not point at the echoed REPORT= path");
    return problems.length === 0 || problems.join("; ");
  });

test("the agent's default TIMEOUT states why it is not the driver's",
  "560 against the driver's 900 is exactly the kind of unexplained constant that becomes folklore; it exists because the Bash tool caps a call at 600 s",
  () => {
    if (!/TIMEOUT: <seconds> \[560/.test(agent)) return "the 560 s default is gone or reworded beyond recognition";
    if (!/600/.test(agent)) return "the derivation (the 600 s Bash cap) is not stated beside it";
    return /--timeout <sec>\s*\(default 900|default 900/.test(driver) || "the driver's own default is no longer 900, so the agent's note is stale";
  });

// The envelope block: the relay's whole return above the answer, sliced out so a key can be asserted
// where it has to appear rather than anywhere in the file.
const envelope = (() => {
  const i = agent.indexOf("    exitCode: <n>");
  if (i < 0) return null;
  const j = agent.indexOf("--- answer", i);
  return j < 0 ? null : agent.slice(i, j);
})();

test("the success envelope names every coordinator-critical report key",
  "the envelope is the coordinator's only view of a wrapped seat: without the harvest keys it gets a path to a tree the driver already removed, and without turnStatus/verify/schemaErrors it cannot tell which gate said no",
  () => {
    if (!envelope) return "no envelope block starting at `exitCode: <n>` and ending at `--- answer`";
    const critical = ["exitCode", "turnStatus", "turnError", "threadId", "receiptOk", "receiptPath",
                      "commandsSucceeded", "filesTouched", "verify", "answerPath", "answerTruncated",
                      "outputSchemaOk", "schemaErrors", "schemaKeywordsUnchecked",
                      "worktreePath", "worktreeDiffPath", "worktreeUntrackedPath", "worktreeCommitsRef",
                      "worktreeIgnoredDropped", "worktreeFleet", "worktreePreserved", "worktreeRemoveCommand"];
    const problems = [];
    const absent = critical.filter((k) => !new RegExp(`\\b${k}\\b`).test(envelope));
    if (absent.length) problems.push(`missing from the envelope: ${absent.join(", ")}`);
    const notEmitted = critical.filter((k) => !new RegExp(`\\b${k}\\b`).test(driver));
    if (notEmitted.length) problems.push(`promised by the envelope but not emitted by the driver: ${notEmitted.join(", ")}`);
    return problems.length === 0 || problems.join("; ");
  });

test("a TIMEOUT the Bash tool cannot honour is a bad header, not a value to pass through",
  "measured: TIMEOUT 700 was written verbatim, the Bash tool backgrounded the driver at its 600 s cap instead of killing it, and the relay improvised a failure envelope while the seat was still running",
  () => {
    const problems = [];
    if (!/[Aa]bove 560 is a BAD\s*HEADER/.test(flat)) problems.push("the agent does not call a TIMEOUT above 560 a bad header");
    if (!/no EXIT= line/.test(flat)) problems.push("the agent does not say the backgrounded call returns no EXIT= line");
    if (!/No `EXIT=` line/.test(agent)) problems.push("a Bash result without EXIT= is not listed as a run-ending failure");
    if (!/`exitCode` wins over the `EXIT=` line/.test(flat)) problems.push("the agent does not say the parsed report's exitCode wins over the EXIT= line");
    return problems.length === 0 || problems.join("; ");
  });

test("BRIEF is decided by the header, not forced by the relay",
  "a forced --brief tells the model to answer in 20 lines, so the detail is never generated and answerPath cannot recover it; it also contradicts OUTPUT_SCHEMA, which needs one whole JSON object",
  () => {
    if (/forced on for a read seat|always `?BRIEF: yes`?/.test(agent)) return "the relay still forces BRIEF on";
    if (!/BRIEF: yes\s+\[omit; the header decides/.test(agent)) return "BRIEF is no longer documented as header-decided";
    return /--brief/.test(driver) || "the driver no longer has --brief";
  });

test("the two failure shapes are distinct, and neither puts the relay's own text where the answer goes",
  "measured: 'the seat failed' for an exit-11 merge trap that had a real answer and receipt, and a stderr quote placed under `--- answer` where the parse rule reads it as Codex's answer",
  () => {
    const problems = [];
    if (!/GATE VERDICT/.test(agent)) problems.push("a non-zero exit with a parsed report is not named a gate verdict");
    if (!/never "the seat failed"/.test(agent)) problems.push("the agent no longer forbids calling a gate verdict a seat failure");
    const i = agent.indexOf("seat did not run:");
    if (i < 0) return [...problems, "no 'seat did not run' envelope"].join("; ");
    const stderrAt = agent.indexOf("--- stderr", i), zeroAt = agent.indexOf("--- answer (0 bytes)", i);
    if (stderrAt < 0 || zeroAt < 0) problems.push("the failure envelope has no `--- stderr` block above a 0-byte answer");
    else if (stderrAt > zeroAt) problems.push("the stderr tail is placed below `--- answer`, where the coordinator reads it as Codex's answer");
    if (!/nothing of yours goes below that line and nothing above `exitCode:`/.test(flat))
      problems.push("the agent does not forbid text above `exitCode:` and below the answer marker");
    return problems.length === 0 || problems.join("; ");
  });

test("SEAT read documents its optional directory",
  "the driver maps `read <dir>` to --cwd <dir>; undocumented, a multi-repo coordinator has no way to point a read seat anywhere but the relay's own cwd",
  () => {
    if (!/SEAT: read \[<dir>\]/.test(agent)) return "the header table does not show `read [<dir>]`";
    if (!/kind === "read".*--cwd/s.test(driver.slice(driver.indexOf('if (kind === "read")'), driver.indexOf('if (kind === "read")') + 200)))
      return "the driver no longer maps SEAT read <dir> to --cwd";
    return /When `read` names no\s*directory, add the current one/.test(flat) || "step 1 no longer says to fill in the current directory";
  });

test("the description keeps model, effort and schema out of the Agent tool's options",
  "those options act on the relay — a schema reshapes the relay's return and a model downgrade replaces the sonnet the relay eval pinned — while the seat runs on whatever the header said",
  () => {
    const desc = agent.slice(agent.indexOf("description:"), agent.indexOf("\nmodel:"));
    const problems = [];
    if (!/never in the Agent tool's own options/.test(desc)) problems.push("the description does not forbid passing model/effort/schema as Agent-tool options");
    for (const f of ["MODEL", "EFFORT", "OUTPUT_SCHEMA"]) if (!desc.includes(f)) problems.push(`${f} is not named as the header route in the description`);
    if (!/attach-pasted\.mjs|--attach/.test(desc)) problems.push("the description does not say an image or audio seat has to leave the native route");
    return problems.length === 0 || problems.join("; ");
  });

let failed = 0;
for (const c of CASES) {
  let verdict;
  try { verdict = c.fn(); } catch (e) { verdict = `threw: ${e.message}`; }
  if (verdict === true) console.log(`ok    ${c.name}`);
  else { failed++; console.log(`FAIL  ${c.name}: ${verdict}\n      ${c.why}`); }
}
console.log(failed ? `\n${failed}/${CASES.length} failed` : `\nall ${CASES.length} passed`);
process.exit(failed ? 1 : 0);
