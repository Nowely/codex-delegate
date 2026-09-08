#!/usr/bin/env node
// Does the page a coordinator launches a seat from still describe the driver it launches?
//
//   node evals/agent-contract.test.mjs
//
// There is no relay agent any more: the coordinator writes the prompt and runs the driver itself, in a
// background Bash task, so the ONE call and the field table are both SKILL.md's. This suite compares
// that page, and the orchestrate page that re-cuts it, with the driver they describe.

import fs from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { DRIVER, ROOT, SEAT_FIELDS, registry, runCases, summarize } from "./lib/harness.mjs";

const SKILL = path.join(ROOT, "skills", "codex-delegate", "SKILL.md");
const ORCHESTRATE = path.join(ROOT, "skills", "orchestrate", "SKILL.md");

const skill = fs.readFileSync(SKILL, "utf8");
const orchestrate = fs.readFileSync(ORCHESTRATE, "utf8");
const driver = fs.readFileSync(DRIVER, "utf8");

// The page in the pieces the cases read: the whole text collapsed for prose pins, the field table, and
// the indented command lines a coordinator copies into a Bash call.
const table = skill.split(/^## /m).find((s) => s.startsWith("Header fields")) ?? "";
const flat = skill.replace(/\s+/g, " ");
const commands = [...skill.matchAll(/^ {4}(node "[^\n]+)$/gm)].map((m) => m[1]);
const inlineShell = [...skill.matchAll(/`(mktemp -d [^`]*)`/g)].map((m) => m[1]);

const { cases: CASES, test } = registry();

// Import the driver's vocabulary so source reformatting cannot silently empty the cases' input.
const seatFields = [...SEAT_FIELDS];
// What the table documents: the first cell of every row, which is the one place a coordinator reads a
// field name. A refused name is written `LIKE_THIS`, with no colon and never in that cell.
const documented = [...new Set([...table.matchAll(/^\| `([A-Z][A-Z_]+):` \|/gm)].map((m) => m[1]))];
// The knobs the driver parses only from the command line, read out of its own map.
const cliOnly = [...driver.matchAll(/const CLI_ONLY_FIELDS = \{([\s\S]*?)\};/g)]
  .flatMap((m) => [...m[1].matchAll(/([A-Z_]+): "(--[a-z-]+)"/g)].map((x) => [x[1], x[2]]));

test("the driver's seat-file vocabulary is not empty (the reader below is sound)",
  "every case here compares against SEAT_FIELDS; if the import stopped resolving, the whole suite would pass vacuously",
  () => seatFields.length >= 10 || `read ${seatFields.length} fields out of the driver: ${JSON.stringify(seatFields)}`);

test("SKILL.md's table names every field the driver accepts, and the driver accepts every field it names",
  "a field absent from the coordinator's table is a capability it cannot use; a field the driver rejects fails the seat before any work",
  () => {
    const problems = [];
    if (!table) return "SKILL.md has no `## Header fields` section: the coordinator has no field vocabulary at all";
    if (!/the body starts at `TASK:`/.test(table)) problems.push("the section no longer says where the header ends and the body starts");
    // VERIFY is the one field the driver parses that no header may carry: it needs --allow-seat-verify
    // on the command line, which this relay never passes. It belongs in the refusal sentence below.
    const missing = seatFields.filter((f) => f !== "VERIFY" && !documented.includes(f));
    if (missing.length) problems.push(`accepted by the driver, absent from the table: ${missing.join(", ")}`);
    const bogus = documented.filter((f) => !seatFields.includes(f));
    if (bogus.length) problems.push(`in the table, rejected by the driver: ${bogus.join(", ")}`);
    if (documented.includes("VERIFY")) problems.push("VERIFY is written as a usable header field");
    if (!/`VERIFY` is refused in a seat file without `--allow-seat-verify`/.test(table))
      problems.push("the section does not name VERIFY as refused");
    return problems.length === 0 || problems.join("; ");
  });

test("the ONE call is --seat-file with --report-file, in a background task, and every shell the page hands over parses",
  "this line is copied verbatim into a Bash call: a stray quote is a seat that never runs, a missing --report-file is a seat whose report nobody can read after the notification, and an `&` of its own detaches the run from the task that is supposed to own it",
  () => {
    const scripts = [...commands, ...inlineShell];
    if (scripts.length < 2) return `expected the mktemp pre-step and the driver call, found ${scripts.length} shell snippets`;
    const problems = [];
    for (const src of scripts) {
      const r = spawnSync("bash", ["-n"], { input: src, encoding: "utf8" });
      if (r.status !== 0) problems.push(`bash -n rejected ${JSON.stringify(src.slice(0, 60))}: ${String(r.stderr).trim()}`);
    }
    const call = commands.find((c) => c.includes("driver.mjs")) ?? "";
    if (!call) problems.push("no indented `node \"...driver.mjs\"` line is on the page at all");
    for (const part of ['--seat-file "<DIR>/prompt.txt"', '--report-file "<DIR>/report.json"',
                        '> "<DIR>/out.json"', '2> "<DIR>/err.txt"'])
      if (!call.includes(part)) problems.push(`the call does not carry ${part}: ${JSON.stringify(call)}`);
    if (/(^|[^&])&\s*$/.test(call)) problems.push("the call ends in an `&` of its own, which hides the run from the task");
    if (!/`run_in_background: true` and no `&` of your own/.test(flat))
      problems.push("the page does not say the call is a background task with no `&` of its own");
    // And the driver has to take exactly those two flags.
    for (const flag of ["--seat-file", "--report-file"])
      if (!driver.includes(`case "${flag}":`)) problems.push(`the driver has no ${flag}`);
    return problems.length === 0 || problems.join("; ");
  });

test("the scratch directory comes from one mktemp call, not from an unexpandable $TMPDIR path",
  "Write and Read take literal absolute paths and expand nothing, so a coordinator needs a resolved private directory to avoid colliding or world-readable files — and --report-file refuses a relative path outright",
  () => {
    const problems = [];
    if (!/mktemp -d "\$\{TMPDIR:-\/tmp\}\/codex-seat\.XXXXXXXX"/.test(skill)) problems.push("the mktemp -d pre-step is gone or reworded");
    if (/\$TMPDIR\/(prompt|seat|task|report|stderr)/.test(skill)) problems.push("a scratch path is written as $TMPDIR/..., which the Write and Read tools cannot expand");
    if (!/--report-file must be an absolute path/.test(driver)) problems.push("the driver no longer refuses a relative --report-file");
    return problems.length === 0 || problems.join("; ");
  });

test("every driver path on both pages is the exact ${CLAUDE_SKILL_DIR} placeholder",
  "Claude Code substitutes that exact form inline in a skill body and exports nothing to the Bash tool, so a ${VAR:-default} is never substituted, expands to the default, and makes every plugin-installed seat fail to find the driver at all",
  () => {
    const REL = "skills/codex-delegate/scripts/driver.mjs";
    if (path.relative(ROOT, DRIVER).split(path.sep).join("/") !== REL) return `the shipped layout moved: ${path.relative(ROOT, DRIVER)}`;
    const problems = [];
    for (const [label, text] of [["SKILL.md", skill], ["orchestrate/SKILL.md", orchestrate]]) {
      if (/CLAUDE_SKILL_DIR\s*:-/.test(text))
        problems.push(`${label} writes \${CLAUDE_SKILL_DIR:-...}, which Claude Code does not substitute: the seat would run the default, not the installed driver`);
      for (const p of [...text.matchAll(/"([^"\n]*driver\.mjs)"/g)].map((m) => m[1]))
        if (p !== `\${CLAUDE_SKILL_DIR}/scripts/driver.mjs`)
          problems.push(`${label} names the driver as ${JSON.stringify(p)}, not "\${CLAUDE_SKILL_DIR}/scripts/driver.mjs"`);
    }
    // The placeholder resolves to the skill directory, so the path below it is the shipped layout's.
    if (!fs.existsSync(path.join(ROOT, "skills", "codex-delegate", "scripts", "driver.mjs")))
      problems.push("scripts/driver.mjs is not where ${CLAUDE_SKILL_DIR} would resolve it");
    return problems.length === 0 || problems.join("; ");
  });

test("a failing seat declaration is reported, never repaired",
  "creating a missing directory can turn a refusal into a seat with unintended rights; path validation belongs to the driver, and its exit 2 is the answer",
  () => /Never create a directory, change a level or re-run with different flags to make a refused seat succeed/.test(flat)
    || "the no-repair rule is gone from the page");

test("the bounds, the transport and the injection fields are refused, and no table offers them",
  "a newline in a copied value can inject a field: VERIFY runs a shell, ATTACH uploads a file and REPORT_FILE redirects the run's whole evidence. Bounds and delivery belong to the CLI; SKILL.md must not offer refused fields as usable headers",
  () => {
    const problems = [];
    // Named by the driver's own map, so a knob quietly promoted back to a field fails here rather than in
    // a live seat: the message the refusal prints is what tells a caller to use the flag instead.
    if (cliOnly.length !== 4) problems.push(`read ${cliOnly.length} command-line-only fields out of the driver, expected 4`);
    for (const [f, flag] of cliOnly) {
      if (seatFields.includes(f)) problems.push(`${f} is a seat field again`);
      if (documented.includes(f)) problems.push(`${f} is back in the coordinator's field table as usable`);
      if (!driver.includes(`"${flag}"`)) problems.push(`${f} was removed as a field and ${flag} went with it`);
    }
    if (!/--allow-seat-verify/.test(driver)) problems.push("the driver lost --allow-seat-verify");
    if (!/`VERIFY` is refused in a seat file without `--allow-seat-verify`/.test(table))
      problems.push("VERIFY is not named as refused in SKILL.md");
    for (const [f, flag] of [["ATTACH", "--attach"]]) {
      if (seatFields.includes(f)) problems.push(`${f} is a seat field again`);
      if (documented.includes(f)) problems.push(`${f} is in the coordinator's field table as usable`);
      if (!driver.includes(`"${flag}"`)) problems.push(`${flag}, the command-line route ${f} is refused in favour of, is gone from the driver`);
    }
    return problems.length === 0 || problems.join("; ");
  });

test("the report file is what the coordinator reads, and a missing one is unknown rather than success",
  "the pipe is not held while a background task runs, so the file IS the delivery: a page that told the coordinator to read the task's output would lose a report whose stdout broke, and one that read a missing file as 'nothing went wrong' would report a seat killed mid-turn as a clean run",
  () => {
    const problems = [];
    for (const phrase of [
      "The task's exit notification is the seat's completion",
      "`<DIR>/report.json` is the report, the same JSON the run also wrote to `<DIR>/out.json`",
      "it is written whole or not at all, and a missing one means unknown, never success",
      "with an `OUTPUT_SCHEMA:` line, `answerJson` is that answer already parsed",
      "To stop a seat, stop its Bash task, or send `SIGTERM` to the pid on the first line of `<DIR>/err.txt`",
    ]) if (!flat.includes(phrase)) problems.push(`the page no longer says: ${JSON.stringify(phrase)}`);
    // Each of those is a promise the driver has to keep.
    if (!/publishReport/.test(driver)) problems.push("the driver no longer publishes the report to a file");
    if (!/mode: 0o600, flag: "wx"/.test(driver)) problems.push("the report file is no longer written 0600, or no longer refuses an existing name");
    if (!/function preTurnReport/.test(driver)) problems.push("a refusal before the turn no longer reaches the report file");
    if (!/pid=\$\{process\.pid\}/.test(driver)) problems.push("the driver no longer announces the pid the page tells the coordinator to signal");
    if (!/for \(const sig of \["SIGINT", "SIGTERM", "SIGHUP"\]\)/.test(driver))
      problems.push("the driver no longer handles the signal the page says stops a seat");
    return problems.length === 0 || problems.join("; ");
  });

test("SEAT is first and required, and `read` with no directory is the current one",
  "a seat file whose rights line is not first can have one supplied by an injected later line; and a header-less prompt has no SEAT line at all, which is the case the default is FOR",
  () => {
    const problems = [];
    if (!/first field must be SEAT/.test(driver)) problems.push("the driver no longer enforces SEAT-first");
    if (seatFields[0] !== "SEAT") problems.push(`SEAT is not the first entry of SEAT_FIELDS: ${seatFields[0]}`);
    if (!/`SEAT:` \| `read \[<dir>\]`/.test(table)) problems.push("the table's first row is not SEAT with `read [<dir>]`");
    if (!/no header is a read seat in the current directory/.test(table))
      problems.push("the table does not say a header-less prompt is a read seat in the current directory");
    return problems.length === 0 || problems.join("; ");
  });

test("BRIEF is decided by the header, not forced by the caller",
  "a forced --brief caps the detail the model generates and contradicts OUTPUT_SCHEMA, which needs one whole JSON object; the header must decide BRIEF",
  () => {
    if (/always `?BRIEF: yes`?|forced on/.test(skill)) return "the page still forces BRIEF on";
    if (!documented.includes("BRIEF")) return "BRIEF is not in the coordinator's table";
    return /--brief/.test(driver) || "the driver no longer has --brief";
  });

process.exit(summarize(await runCases(CASES), CASES.length));
