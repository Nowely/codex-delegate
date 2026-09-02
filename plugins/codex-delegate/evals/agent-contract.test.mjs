#!/usr/bin/env node
// Does the shipped relay agent still describe the driver it drives?
//
//   node evals/agent-contract.test.mjs
//
// agents/codex-seat.md is the artefact every default plugin install uses, and its contract used to be a
// page of prose that nothing checked — which wait to run, when to repeat it, which report keys to copy,
// how to render each failure. It had drifted twice, and a weaker relay model followed only some of it.
// The rules are the driver's now (`--relay`, `--relay-collect`, one envelope function), so what this
// document still owns is small and exact: three mechanical steps, one command, one loop, one failure
// shape, and a field table for the coordinator. This reads the document and the driver and compares.

import fs from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { DRIVER, ROOT, SEAT_FIELDS, registry, runCases, summarize } from "./lib/harness.mjs";

const AGENT = path.join(ROOT, "agents", "codex-seat.md");

const agent = fs.readFileSync(AGENT, "utf8");
const driver = fs.readFileSync(DRIVER, "utf8");

// The document in the three pieces every case reads: the frontmatter, the RULES the relay follows, and
// the field TABLE, which is the coordinator's reference and not a rule the relay executes.
const parts = agent.split(/^---$/m);
const front = parts[1] ?? "";
const body = parts[2] ?? "";
const tableAt = body.indexOf("Header fields");
const rules = tableAt < 0 ? body : body.slice(0, tableAt);
const table = tableAt < 0 ? "" : body.slice(tableAt);
const flat = agent.replace(/\s+/g, " ");
const shellBlocks = [...agent.matchAll(/```sh\n([\s\S]*?)```/g)].map((m) => m[1]);
const inlineShell = [...agent.matchAll(/`(mktemp -d [^`]*)`/g)].map((m) => m[1]);

const { cases: CASES, test } = registry();

// The driver's own vocabulary, imported rather than scraped out of the source: the regex that used to
// read it would have gone quiet on any reformatting and taken every case below with it.
const seatFields = [...SEAT_FIELDS];
// What the table documents. TASK/CHECK/RETURN are the BODY's labels, named there for the coordinator
// and never fields; a refused name is written `LIKE_THIS`, with no colon, so it is not picked up here.
const BODY_LABELS = ["TASK", "CHECK", "RETURN"];
const documented = [...new Set([...table.matchAll(/\b([A-Z][A-Z_]{2,})\b:/g)].map((m) => m[1]))]
  .filter((f) => !BODY_LABELS.includes(f));

test("the driver's seat-file vocabulary is not empty (the reader below is sound)",
  "every case here compares against SEAT_FIELDS; if the import stopped resolving, the whole suite would pass vacuously",
  () => seatFields.length >= 10 || `read ${seatFields.length} fields out of the driver: ${JSON.stringify(seatFields)}`);

test("the table names every field the driver accepts, and the driver accepts every field it names",
  "a field the coordinator cannot express is a capability the plugin ships and cannot use — exactly how --review, --resume and --progress went missing; the opposite drift fails the seat with exit 2 before any work",
  () => {
    const problems = [];
    // VERIFY is the one field the driver parses that no header may carry: it needs --allow-seat-verify
    // on the command line, which this relay never passes. It belongs in the refusal sentence below.
    const missing = seatFields.filter((f) => f !== "VERIFY" && !documented.includes(f));
    if (missing.length) problems.push(`accepted by the driver, absent from the table: ${missing.join(", ")}`);
    const bogus = documented.filter((f) => !seatFields.includes(f));
    if (bogus.length) problems.push(`in the table, rejected by the driver: ${bogus.join(", ")}`);
    if (documented.includes("VERIFY")) problems.push("VERIFY is written as a usable header field");
    return problems.length === 0 || problems.join("; ");
  });

test("the three steps are numbered, in order, and each names the ONE tool call it is",
  "the relay's whole reliability argument is that it decides nothing: a step that does not say how many calls it is, or that can be read out of order, is where a weaker model improvises",
  () => {
    const problems = [];
    let last = -1;
    for (const n of ["0.", "1.", "2.", "3.", "4."]) {
      const at = rules.indexOf(`\n${n} `);
      if (at < 0) { problems.push(`step ${n} is missing`); continue; }
      if (at < last) problems.push(`step ${n} comes before the step above it`);
      last = at;
    }
    if (!/0\. ONE Bash call/.test(rules)) problems.push("step 0 does not say it is ONE Bash call");
    if (!/1\. With the Write tool/.test(rules)) problems.push("step 1 is not the Write");
    if (!/2\. ONE Bash call, tool timeout 590000 ms/.test(rules)) problems.push("step 2 is not ONE Bash call with the 590000 ms tool timeout");
    return problems.length === 0 || problems.join("; ");
  });

test("the prompt is written VERBATIM and step 1 has no exception at all",
  "every edit the relay was allowed became an edit it made. Measured in both WP8-D runs: asked to split a prompt in two, a sonnet relay dropped the TASK: label. Measured in WP9-2: allowed to ADD a missing SEAT line, sonnet and haiku each added `SEAT: read <abs dir>` plus an ALLOW_NO_COMMANDS nobody asked for; told to bound that added line, haiku applied the bound to a header the prompt ALREADY had and rewrote `SEAT: write /nonexistent/dir` to `SEAT: read` — a refusal turned into a live read seat in its own cwd. So the rule is `add nothing`, and the missing-rights default is the driver's",
  () => {
    const problems = [];
    if (!/write the prompt VERBATIM to `<DIR>\/prompt\.txt`/.test(flat))
      problems.push("step 1 no longer says the whole prompt goes VERBATIM into one file");
    if (!/Change nothing in it, ever/.test(flat)) problems.push("nothing forbids every edit");
    if (!/not a header line it has/.test(flat)) problems.push("nothing forbids rewriting a header the prompt carries");
    if (!/and add nothing/.test(flat)) problems.push("step 1 does not forbid ADDING a line");
    if (/exception/i.test(rules)) problems.push("step 1 has an exception again");
    if (/`SEAT: read` above it|put `SEAT: read`/.test(rules)) problems.push("the relay is told to write a SEAT line again");
    // And the driver has to take exactly that file: a header, a body from the first line that is not a
    // field, and no SEAT at all on the --relay route while --seat-file still refuses one.
    if (!/const BODY_LABELS = new Set\(\["TASK", "CHECK", "RETURN"\]\)/.test(driver))
      problems.push("the driver no longer ends the header at a TASK:/CHECK:/RETURN: label");
    if (!/seatFileBody/.test(driver)) problems.push("the driver no longer reads a body out of the seat file");
    if (!/if \(!defaultSeat\) fail\(EXIT\.USAGE, "--seat-file: no SEAT field/.test(driver))
      problems.push("the driver no longer defaults the rights line on --relay, or no longer refuses it on --seat-file");
    return problems.length === 0 || problems.join("; ");
  });

test("there is exactly ONE command, and it is `--relay` on the file just written",
  "the relay must not choose a transport, a format or a budget: --relay is all three, and any second command in this document is a decision the coordinator did not ask for",
  () => {
    const problems = [];
    if (shellBlocks.length !== 1) problems.push(`${shellBlocks.length} shell blocks, expected exactly one`);
    const block = shellBlocks[0] ?? "";
    if (!/\nnode "\$DRIVER" --relay "\$D\/prompt\.txt"\n/.test(block))
      problems.push(`the driver call is not \`node "$DRIVER" --relay "$D/prompt.txt"\`: ${JSON.stringify(block.trim().slice(-80))}`);
    // Every other route the relay used to take is gone from the document, and stays gone.
    for (const flag of ["--seat-file", "--wait", "--detach", "--json", "--wait-timeout", "--timeout"])
      if (block.includes(flag)) problems.push(`the relay's command still carries ${flag}`);
    if (!driver.includes('case "--relay":')) problems.push("the driver has no --relay");
    if (!driver.includes('case "--relay-collect":')) problems.push("the driver has no --relay-collect");
    return problems.length === 0 || problems.join("; ");
  });

test("every shell the agent hands the relay parses",
  "the block is copied verbatim into a Bash call; a stray quote or an unbalanced brace is a seat that never runs, and nothing else reads this text before a live run does",
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
  "Write and Read take literal absolute paths and expand nothing, so a relay told to write $TMPDIR/prompt.txt improvises — measured 4/4 runs into world-readable /tmp with colliding names",
  () => {
    const problems = [];
    if (!/mktemp -d "\$\{TMPDIR:-\/tmp\}\/codex-seat\.XXXXXXXX"/.test(agent)) problems.push("the mktemp -d pre-step is gone or reworded");
    if (/\$TMPDIR\/(prompt|seat|task|report|stderr)/.test(agent)) problems.push("a scratch path is written as $TMPDIR/..., which the Write and Read tools cannot expand");
    return problems.length === 0 || problems.join("; ");
  });

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
    // The doubled segment is the marketplace name and then the plugin name, and it has been read as a
    // typo before: the document says which is which.
    if (!/the marketplace name and the plugin name are both `codex-delegate`/.test(flat))
      problems.push("nothing explains the doubled codex-delegate/codex-delegate path segment");
    return problems.length === 0 || problems.join("; ");
  });

test("the exit-90 sentinel is distinct from every code the driver can return",
  "node's own exit 1 for a missing module is indistinguishable from the driver's documented 'the turn did not complete', which is why DRIVER_NOT_FOUND has a code of its own",
  () => {
    if (!/DRIVER_NOT_FOUND/.test(agent) || !/exit 90/.test(agent)) return "the agent lost the DRIVER_NOT_FOUND sentinel";
    const codes = [...driver.matchAll(/const EXIT = \{([^}]*)\}/g)].flatMap((m) => [...m[1].matchAll(/: (\d+)/g)].map((x) => Number(x[1])));
    return !codes.includes(90) || "the driver now uses exit 90 too, so the sentinel is ambiguous";
  });

test("the collect loop repeats ONE literal command, bounded, on the one condition that means `still running`",
  "one Agent call that returns the answer whenever the work is done is what a native subagent does. The relay used to build the wait command out of a threadId it had parsed; now the envelope hands it a finished command, and the only decision left is whether the first line still says exitCode: 10",
  () => {
    const problems = [];
    if (!/If the output's FIRST line is `exitCode: 10` AND it carries a `collect:` line/.test(flat))
      problems.push("the loop's condition is not `exitCode: 10` AND a collect: line");
    if (!/run that command VERBATIM/.test(flat)) problems.push("the collect command is not run verbatim");
    if (!/it is complete, absolute and quoted/.test(flat)) problems.push("nothing says the collect command needs no substitution");
    if (!/at most 24 times/.test(flat)) problems.push("the repeat cap (24, about four hours) is missing");
    if (!/Repeat while both hold, at most 24 times/.test(flat)) problems.push("the loop does not say when to stop repeating");
    // Measured: a resumed thread whose turn is still open, and a held write lock, both return exit 10
    // with no thread and therefore no collect: line. A rule keyed on the code alone leaves the relay
    // holding a final answer it thinks it must poll.
    if (!/an `exitCode: 10` with no `collect:` line is final — relay it/.test(flat))
      problems.push("an exit 10 with no collect: line has no rule, so the relay would poll a final answer");
    // And the driver must actually emit that line, absolute and quoted, with the thread in it.
    if (!/collect: node \$\{JSON\.stringify\(DRIVER_PATH\)\} --relay-collect \$\{report\.threadId\}/.test(driver))
      problems.push("the driver's envelope no longer renders a literal collect: command");
    if (!/turnStatus: "running"/.test(driver)) problems.push("the driver no longer emits a running handle");
    return problems.length === 0 || problems.join("; ");
  });

test("the relay returns the output verbatim and adds nothing above or below it",
  "measured: 'the seat failed' for an exit-11 merge trap that had a real answer and receipt, and a stderr quote placed under `--- answer` where the coordinator's parse rule reads it as Codex's answer",
  () => {
    const problems = [];
    if (!/Your entire final message is that output, VERBATIM/.test(flat)) problems.push("the final message is not pinned to the command's output");
    if (!/nothing above the `exitCode:` line and nothing below the `--- answer` line/.test(flat))
      problems.push("the agent does not forbid text above `exitCode:` and below the answer marker");
    if (!/GATE's verdict on a turn that RAN/.test(flat)) problems.push("a non-zero exit with an envelope is not named a gate verdict");
    if (!/never call it a seat failure/.test(flat)) problems.push("the agent no longer forbids calling a gate verdict a seat failure");
    if (!/Do not summarise, reorder, re-count the bytes or add a caveat/.test(flat))
      problems.push("the agent no longer forbids summarising, reordering and re-counting");
    return problems.length === 0 || problems.join("; ");
  });

test("the relay carries no field list of its own: the envelope is rendered by the driver",
  "the old body listed thirty report keys and their null rules, and every key the driver added or renamed was a second place to fix. The relay copies bytes it does not parse, so naming a report key here is drift waiting to happen",
  () => {
    const owned = ["receiptPath", "filesTouched", "answerTruncated", "outputSchemaOk", "worktreePath",
                   "worktreeRepo", "worktreeBase", "worktreeRestored", "worktreeDiffPath", "timing",
                   "commentaryPath", "answerPartialPath", "jobPath", "turnError"];
    const named = owned.filter((k) => new RegExp(`\\b${k}\\b`).test(body));
    const problems = [];
    if (named.length) problems.push(`the relay body names report keys it does not parse: ${named.join(", ")}`);
    // They have to be somewhere, and that somewhere is the one rendering function.
    const envelope = /function renderEnvelope\(([\s\S]*?)\n}/.exec(driver)?.[1] ?? "";
    if (!envelope) problems.push("the driver has no renderEnvelope, so nothing renders the envelope at all");
    for (const k of ["answerPath", "answerPartialPath", "commentaryPath", "resumedFrom", "worktreeDiffPath",
                     "worktreeUntrackedPath", "worktreeCommitsRef", "worktreePreserved", "worktreeRemoveCommand",
                     "schemaErrors", "receiptOk", "commandsSucceeded", "turnStatus", "threadId", "reportPath", "hint"])
      if (!new RegExp(`\\b${k}\\b`).test(envelope)) problems.push(`renderEnvelope no longer carries ${k}`);
    return problems.length === 0 || problems.join("; ");
  });

test("the one failure the relay composes itself is the shape a coordinator can still parse",
  "the driver cannot report a driver it could not start, or a Bash call the tool killed: those two are the relay's, and they must render as the same three-part envelope so `fields, then --- answer` holds for every result a coordinator ever sees",
  () => {
    const i = body.indexOf("    exitCode: null");
    if (i < 0) return "no `exitCode: null` failure envelope";
    const block = body.slice(i, body.indexOf("--- answer (0 bytes) ---", i) + 24);
    const problems = [];
    if (!/DRIVER_NOT_FOUND` \/ exit 90, and a Bash result whose first line is not `exitCode:`/.test(flat))
      problems.push("the two cases the relay composes for are not both named");
    if (!/Then, and only then/.test(flat)) problems.push("nothing limits the composed envelope to those two cases");
    const stderrAt = block.indexOf("--- stderr (last 20 lines) ---"), zeroAt = block.indexOf("--- answer (0 bytes)");
    if (stderrAt < 0) problems.push("the failure envelope has no `--- stderr (last 20 lines) ---` block");
    else if (stderrAt > zeroAt) problems.push("the stderr tail is placed below `--- answer`, where the coordinator reads it as Codex's answer");
    // The same shape the driver renders for a pre-thread failure, so the two are one format.
    if (!/L\.push\("--- stderr \(last 20 lines\) ---"\)/.test(driver))
      problems.push("the driver's own no-report envelope no longer uses the `--- stderr (last 20 lines) ---` block");
    return problems.length === 0 || problems.join("; ");
  });

test("a failing seat declaration is relayed, never repaired",
  "measured: a relay that created the missing directory ran Codex with rights nobody granted. Whether a path exists, is a repo or is writable is the driver's verdict, and its exit 2 is the answer",
  () => /Never create a directory, change a level or re-run with different flags to make a refused seat succeed/.test(flat)
    || "the no-repair rule is gone from the relay body");

test("the bounds, the transport and the three injection fields are named as refused",
  "a newline in a relayed value opens a new field, so anything accepted here can be injected: VERIFY runs a shell, ATTACH uploads a file, STEER_FILE truncates one, MCP grants tool servers. The seven bounds and transport knobs beside them are refused for the other reason — each has a default a seat needs no header to size",
  () => {
    const problems = [];
    // Named by the driver's own map, so a knob quietly promoted back to a field fails here rather than in
    // a live seat: the message the refusal prints is what tells a relay to use the flag instead.
    const cliOnly = [...driver.matchAll(/const CLI_ONLY_FIELDS = \{([\s\S]*?)\};/g)]
      .flatMap((m) => [...m[1].matchAll(/([A-Z_]+): "(--[a-z-]+)"/g)].map((x) => [x[1], x[2]]));
    if (cliOnly.length !== 7) problems.push(`read ${cliOnly.length} command-line-only fields out of the driver, expected 7`);
    for (const [f, flag] of cliOnly) {
      if (seatFields.includes(f)) problems.push(`${f} is a seat field again`);
      if (documented.includes(f)) problems.push(`${f} is back in the agent's field table as usable`);
      if (!new RegExp(`\`${f}\``).test(table)) problems.push(`${f} is not named as refused`);
      if (!driver.includes(`"${flag}"`)) problems.push(`${f} was removed as a field and ${flag} went with it`);
    }
    if (!/allow-seat-verify/.test(agent)) problems.push("the agent does not mention --allow-seat-verify");
    if (!/--allow-seat-verify/.test(driver)) problems.push("the driver lost --allow-seat-verify");
    if (!/`VERIFY` is REFUSED in a header/.test(agent)) problems.push("VERIFY is not named as refused");
    for (const f of ["ATTACH", "STEER_FILE", "MCP"]) {
      if (seatFields.includes(f)) problems.push(`${f} is a seat field again`);
      if (!new RegExp(`\`${f}\``).test(table)) problems.push(`${f} is not named as refused`);
    }
    return problems.length === 0 || problems.join("; ");
  });

test("SEAT is first and required, and `read` with no directory is the current one",
  "a seat file whose rights line is not first can have one supplied by an injected later line; and a header-less prompt has no SEAT line at all, which is the case the default is FOR",
  () => {
    const problems = [];
    if (!/first field must be SEAT/.test(driver)) problems.push("the driver no longer enforces SEAT-first");
    if (seatFields[0] !== "SEAT") problems.push(`SEAT is not the first entry of SEAT_FIELDS: ${seatFields[0]}`);
    if (!/SEAT: read \[<dir>\]/.test(table)) problems.push("the table does not show `read [<dir>]`");
    if (!/default: read, current directory/.test(table)) problems.push("the table does not say a bare read seat is the current directory");
    return problems.length === 0 || problems.join("; ");
  });

test("BRIEF is decided by the header, not forced by the relay",
  "a forced --brief tells the model to answer in 20 lines, so the detail is never generated; it also contradicts OUTPUT_SCHEMA, which needs one whole JSON object. The relay adds no flag at all now, which is the same rule stated once",
  () => {
    if (/always `?BRIEF: yes`?|forced on/.test(agent)) return "the relay still forces BRIEF on";
    if (!documented.includes("BRIEF")) return "BRIEF is not in the coordinator's table";
    return /--brief/.test(driver) || "the driver no longer has --brief";
  });

test("the relay body stays three steps and a table",
  "the body is read in full on every seat launch, and prose that is not a rule is what drifts first. Forty lines is the budget the rules get now that the driver enforces the rest; the field table is the coordinator's reference and is counted separately",
  () => {
    if (tableAt < 0) return "no `Header fields` table, so the rules and the reference cannot be told apart";
    const n = rules.replace(/^\n+|\n+$/g, "").split("\n").length;
    const t = table.replace(/^\n+|\n+$/g, "").split("\n").length;
    if (n > 40) return `the relay's rules are ${n} lines, over the 40-line ceiling`;
    return t <= 24 || `the field table is ${t} lines, no longer short`;
  });

test("the description keeps model, effort and schema out of the Agent tool's options",
  "those options act on the relay — a schema reshapes the relay's return and a model downgrade replaces the sonnet the relay eval pinned — while the seat runs on whatever the header said",
  () => {
    const desc = front.slice(front.indexOf("description:"), front.indexOf("\nmodel:"));
    const problems = [];
    if (!/never in the Agent tool's own options/.test(desc)) problems.push("the description does not forbid passing model/effort/schema as Agent-tool options");
    for (const f of ["MODEL", "EFFORT", "OUTPUT_SCHEMA"]) if (!desc.includes(f)) problems.push(`${f} is not named as the header route in the description`);
    if (!/attach-pasted\.mjs|--attach/.test(desc)) problems.push("the description does not say an image or audio seat has to leave the native route");
    if (!/^model: sonnet$/m.test(front)) problems.push("the model pin is no longer sonnet");
    if (!/^tools: Bash, Write, Read$/m.test(front)) problems.push("the tool list is no longer Bash, Write, Read");
    return problems.length === 0 || problems.join("; ");
  });

process.exit(summarize(await runCases(CASES), CASES.length));
