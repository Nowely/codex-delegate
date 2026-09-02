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
    if (!/ONE Bash call for the `mktemp` of step 0, ONE for the driver of step 4/.test(agent))
      problems.push("the agent no longer states the Bash-call budget (mktemp, the driver, then only waits)");
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
    if (!/Read the path printed after `REPORT=`/.test(agent)) problems.push("the read step does not point at the echoed REPORT= path");
    return problems.length === 0 || problems.join("; ");
  });

test("TIMEOUT is the SEAT's clock, WAIT_TIMEOUT is one wait's, and neither is written by default",
  "560 used to be a cap on the seat itself, because the Bash tool ended the call and the seat with it. The seat is detached now, and the driver has no wall clock unless one is asked for: a relay that writes a TIMEOUT nobody declared reintroduces exactly the bound the default exists to remove",
  () => {
    const problems = [];
    if (!/TIMEOUT: <seconds> \[omit -> no wall clock/.test(agent)) problems.push("the header table no longer says an omitted TIMEOUT means no wall clock");
    if (/[Aa]bove 560 is a BAD\s*HEADER/.test(flat)) problems.push("the removed 'a TIMEOUT above 560 is a bad header' rule is back");
    if (/backgrounds the driver/.test(flat)) problems.push("the agent still says the Bash tool BACKGROUNDS the driver at its cap; measured, an explicit timeout KILLS it");
    if (!/WAIT_TIMEOUT: <secs>\s+\[the relay writes 560/.test(agent)) problems.push("WAIT_TIMEOUT is not documented as one wait's own budget");
    // The relay writes TIMEOUT only when the header carried it, and no sentence tells a coordinator to
    // pick a number for it: sizing a wall clock is the configuration this default removes.
    if (!/Write every other field ONLY if the header carried it, `TIMEOUT:` included/.test(flat))
      problems.push("step 1 no longer says TIMEOUT is written only when the header carried it");
    if (/(size|choose|pick|set) (a |an |the )?(longer |larger )?TIMEOUT/i.test(flat))
      problems.push("a sentence still tells the coordinator to size TIMEOUT");
    // And the driver's own default is the same fact: no wall clock on any route.
    if (!/o = \{ level: "read", timeout: 0,/.test(driver)) problems.push("the driver's --timeout no longer defaults to 0");
    if (/o\.timeout = 7200/.test(driver)) problems.push("a route still defaults --timeout to 7200");
    return problems.length === 0 || problems.join("; ");
  });

test("the relay waits in a loop rather than handing back a handle at the first timeout",
  "one Agent call that returns the answer whenever the work is done is what a native subagent does; a relay that gives up after one 560 s wait turns every long seat into a handle the coordinator has to collect by hand",
  () => {
    const problems = [];
    const loop = shellBlocks.find((b) => /--wait /.test(b));
    if (!loop) return "no shell block runs the driver's --wait collector";
    if (!/--wait <threadId> --wait-timeout 560/.test(loop)) problems.push(`the wait call is not \`--wait <threadId> --wait-timeout 560\`: ${loop.trim().slice(0, 80)}`);
    if (!/at most 24 repeats/.test(flat)) problems.push("the repeat cap (24, about four hours) is missing");
    // The one interpolated value in the loop, and the one check that makes interpolating it safe.
    if (!/\^\[0-9a-f\]\{8\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{12\}\$/.test(agent))
      problems.push("the threadId UUID check the loop interpolates against is missing");
    if (!/no\s+value out of the prompt ever reaches this line/.test(agent))
      problems.push("the loop does not say that nothing from the prompt reaches its command line");
    if (!/only the `--wait` repeats of step 5/.test(agent)) problems.push("the Bash-call budget does not name the wait repeats");
    if (!/--wait ID/.test(driver)) problems.push("the driver's usage no longer documents --wait");
    return problems.length === 0 || problems.join("; ");
  });

test("the relay body stays a page of rules",
  "the body is read in full on every seat launch, and prose that is not a rule is what drifts first: 160 lines is the measured ceiling at which the relay still followed every step",
  () => {
    const body = agent.split(/^---$/m)[2] ?? "";
    const n = body.replace(/^\n+|\n+$/g, "").split("\n").length;
    return n <= 160 || `the relay body is ${n} lines, over the 160-line ceiling`;
  });

test("the relay always writes DETACH: yes and WAIT_TIMEOUT: 560, verbatim",
  "a seat that is not detached dies with the Bash call that started it — measured: the tool SIGTERMs the process group at an explicit timeout — so the two lines are the whole of the transport, and a relay that writes them only sometimes loses exactly the long seats they exist for",
  () => {
    const problems = [];
    if (!/^ +DETACH: yes$/m.test(agent)) problems.push("the literal `DETACH: yes` line the relay always writes is gone");
    if (!/^ +WAIT_TIMEOUT: 560$/m.test(agent)) problems.push("the literal `WAIT_TIMEOUT: 560` line is gone");
    if (!/ALWAYS add/.test(agent)) problems.push("step 1 no longer says the two lines are added unconditionally");
    for (const f of ["DETACH", "WAIT_TIMEOUT"])
      if (!seatFields.includes(f)) problems.push(`${f} is not a seat-file field the driver accepts`);
    if (!/590000 ms, whatever TIMEOUT says/.test(agent)) problems.push("step 3 no longer pins the Bash timeout independently of the seat's own clock");
    return problems.length === 0 || problems.join("; ");
  });

test("COLLECT is the way back to a seat that came back still running",
  "the running shape names a threadId and nothing else can act on it: without COLLECT the coordinator holds an address it cannot use, and the seat's answer is written to a file nobody reads",
  () => {
    const problems = [];
    if (!seatFields.includes("COLLECT")) problems.push("COLLECT is not a seat-file field the driver accepts");
    if (!/COLLECT: <threadId>/.test(agent)) problems.push("COLLECT is not documented in the header table");
    // The driver's own mapping, read out of the source: COLLECT must reach --wait or the collection
    // never happens.
    if (!/COLLECT: "--wait"/.test(driver)) problems.push("the driver no longer maps COLLECT to --wait");
    if (!/--wait ID/.test(driver)) problems.push("the driver's usage no longer documents --wait");
    if (!/body must be EMPTY/.test(agent)) problems.push("the agent does not require an empty body beside COLLECT");
    return problems.length === 0 || problems.join("; ");
  });

test("a seat that outlived the wait comes back as the running shape, not as a failure",
  "the coordinator has to be able to tell 'still working, here is its address' from 'ran and produced nothing'; conflated, a detached panel reads as five dead seats",
  () => {
    const i = agent.indexOf("    exitCode: 10  turnStatus: running");
    if (i < 0) return "no running-shape envelope starting `exitCode: 10  turnStatus: running`";
    const block = agent.slice(i, agent.indexOf("--- answer", i) + 30);
    const problems = [];
    for (const k of ["threadId", "pid", "jobPath", "reportPath"])
      if (!new RegExp(`\\b${k}\\b`).test(block)) problems.push(`the running shape does not name ${k}`);
    if (!/seat still running: collect with COLLECT: <threadId>/.test(block))
      problems.push("the running shape does not tell the coordinator how to collect it");
    if (!/--- answer \(0 bytes\) ---/.test(block)) problems.push("the running shape has no 0-byte answer marker");
    if (!/three shapes/.test(agent)) problems.push("the agent still promises only two return shapes");
    // And the driver must actually emit it.
    if (!/turnStatus: "running"/.test(driver)) problems.push("the driver no longer emits a running handle");
    return problems.length === 0 || problems.join("; ");
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
                      // Everything a cut seat hands back instead of an answer, and what the budget cost:
                      // without these, exit 3 through this relay is indistinguishable from silence.
                      "cut", "timing", "budget", "commentaryPath", "answerPartialPath", "resumedFrom",
                      "worktreePath", "worktreeRepo", "worktreeBase", "worktreeRestored",
                      "worktreeDiffPath", "worktreeUntrackedPath", "worktreeCommitsRef",
                      "worktreeIgnoredDropped", "worktreeFleet", "worktreePreserved", "worktreeRemoveCommand"];
    const problems = [];
    const absent = critical.filter((k) => !new RegExp(`\\b${k}\\b`).test(envelope));
    if (absent.length) problems.push(`missing from the envelope: ${absent.join(", ")}`);
    const notEmitted = critical.filter((k) => !new RegExp(`\\b${k}\\b`).test(driver));
    if (notEmitted.length) problems.push(`promised by the envelope but not emitted by the driver: ${notEmitted.join(", ")}`);
    return problems.length === 0 || problems.join("; ");
  });

test("a killed call is not a killed seat: the missing EXIT= line has a recovery, in order",
  "measured (E4): with an explicit timeout the Bash tool SIGTERMs the process group and returns `Command timed out` with no EXIT= line. The seat is detached and untouched — the old rule, which said the tool backgrounds the driver and told the relay to give up, threw away a live run",
  () => {
    const problems = [];
    if (!/Command timed out` and no `EXIT=` line/.test(agent)) problems.push("the timed-out-call case is not listed as a run-ending Bash result");
    if (!/SIGTERM/.test(flat)) problems.push("the agent does not say the tool KILLS the call at its cap");
    if (!/handle recovered from the report/.test(agent)) problems.push("the first recovery (Read the REPORT path, relay the running shape) is missing");
    if (!/handle recovered from stderr/.test(agent)) problems.push("the second recovery (the driver's threadId=/pid=/jobPath= line on stderr) is missing");
    if (!/--jobs --cwd/.test(agent)) problems.push("the last resort (hand the coordinator --jobs --cwd) is missing");
    // The stderr line the recovery reads has to be one the driver actually writes.
    // Two lines carry it: the FRONT writes one into the stderr file this relay names, and the detached
    // run writes one into its own. The relay reads the first; both must exist or one recovery is blind.
    if (!/detached: threadId=\$\{handle\.threadId\} pid=\$\{handle\.pid\} jobPath=/.test(driver))
      problems.push("the detached front does not print a threadId=/pid=/jobPath= line to its own stderr");
    if (!/detached run: threadId=\$\{rootThreadId\} pid=\$\{process\.pid\} jobPath=/.test(driver))
      problems.push("the detached run does not print a threadId=/pid=/jobPath= line to its own stderr");
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

test("SEAT read documents its optional directory, and a prompt with no header at all is one",
  "the driver maps `read <dir>` to --cwd <dir>; undocumented, a multi-repo coordinator has no way to point a read seat anywhere but the relay's own cwd — and a header-less prompt has no SEAT line to fill in, which is the case the default is FOR",
  () => {
    if (!/SEAT: read \[<dir>\]/.test(agent)) return "the header table does not show `read [<dir>]`";
    if (!/kind === "read".*--cwd/s.test(driver.slice(driver.indexOf('if (kind === "read")'), driver.indexOf('if (kind === "read")') + 200)))
      return "the driver no longer maps SEAT read <dir> to --cwd";
    return /No `SEAT:` line at all, or `read` with no directory, is `SEAT: read \/abs\/path` with the current one\./.test(flat)
      || "step 1 no longer says a missing SEAT line and a bare `read` are both the current directory";
  });

test("the body the relay writes starts at the TASK: line and keeps the label",
  "measured in both WP8-D live runs: a sonnet relay read TASK: as the header's end marker and copied only what followed it",
  () => /starts at the `TASK:` line and includes that line, label and all/.test(flat)
    || "step 2 no longer says the body starts at, and includes, the TASK: line");

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
