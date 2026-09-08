#!/usr/bin/env node
// Does skills/orchestrate/SKILL.md still say what the mode was agreed to say?
//
//   node evals/orchestrate.test.mjs
//
// The orchestrate mode is prompt only, so these cases pin its decisions as sentences, rows and template
// lines. Prose is whitespace-collapsed to allow rewrapping; rows and templates are anchored to preserve
// the layout a seat copies.
//
// The page is the approved text. A pin that disagrees with it is a wrong pin.

import fs from "node:fs";
import path from "node:path";
import { ROOT, registry, runCases, summarize } from "./lib/harness.mjs";

const { cases: CASES, test } = registry();
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

const PAGE = "skills/orchestrate/SKILL.md";
const text = read(PAGE);
const lines = text.replace(/\n+$/, "").split("\n");
const front = text.split("---")[1] ?? "";
// Prose wraps at whatever column the sentence lands on, so every prose pin reads this and never the raw
// text: a paragraph re-flowed by one word is not a lost decision.
const flat = text.replace(/\s+/g, " ");

const says = (...phrases) => {
  const missing = phrases.filter((p) => !flat.includes(p));
  return missing.length === 0 || `the page no longer says: ${missing.map((p) => JSON.stringify(p)).join(" | ")}`;
};
const shows = (...res) => {
  const missing = res.filter((r) => !r.test(text));
  return missing.length === 0 || `no line matches: ${missing.map(String).join(" | ")}`;
};

test("the page was read (every case below is sound)",
  "every case here searches one string; if the read had returned an empty page they would report a hundred separate failures instead of one cause, or worse, pass vacuously once a pin is inverted",
  () => lines.length > 100 || `read ${lines.length} lines out of ${PAGE}`);

// ------------------------------------------------------------------ frontmatter and shape

test("the frontmatter names the mode, forbids model invocation, and states the release's version",
  "a mode the model may invoke on its own is not a mode the user opted into, and a version that drifts from plugin.json makes a saved plan name a release that never shipped",
  () => {
    const problems = [];
    for (const re of [/^name: orchestrate$/m, /^disable-model-invocation: true$/m, /^license: MIT$/m])
      if (!re.test(front)) problems.push(`frontmatter has no line matching ${re}`);
    // The Agent Skills spec puts version under `metadata`; the same reader package.test.mjs uses.
    const version = /^metadata:\s*$[\s\S]*?^\s+version:\s*"?([^"\s]+)"?\s*$/m.exec(front)?.[1] ?? null;
    const plugin = JSON.parse(read(".claude-plugin/plugin.json")).version;
    if (version !== plugin) problems.push(`metadata.version is ${JSON.stringify(version)}, plugin.json says ${JSON.stringify(plugin)}`);
    return problems.length === 0 || problems.join("; ");
  });

test("the page stays inside its budget: 150 lines, one heading level, no fence",
  "the mode is loaded into a context it exists to keep small, and it ships no code: a third heading level, a fence or a page that doubled in length are each the mode spending the budget it is selling",
  () => {
    const problems = [];
    if (lines.length > 150) problems.push(`${lines.length} lines`);
    const headings = lines.filter((l) => /^#+ /.test(l));
    const wrongLevel = headings.filter((l) => !l.startsWith("## "));
    if (!headings.length) problems.push("the page has no headings at all");
    if (wrongLevel.length) problems.push(`not a "## " heading: ${wrongLevel.join(" | ")}`);
    if (text.includes("```")) problems.push("a fenced block is in the page, which ships no code");
    return problems.length === 0 || problems.join("; ");
  });

// ------------------------------------------------------------------ the tier table

test("the tier table pairs all eight model names, one tier per row",
  "the pairing IS the table: a coordinator reads across a row to turn its own tier into a Codex `MODEL:` line, and a half-updated rename leaves it sending a name the driver rejects",
  () => shows(
    /^\| top \| Fable \| `gpt-6-astra` \| design, mentoring, final review and verdict, decomposition you cannot do, a case stuck after two failed attempts\. Never implementation \|$/m,
    /^\| strong \| Opus \| `gpt-5\.6-sol` \| write seats, non-trivial analysis \|$/m,
    /^\| cheap \| Sonnet \| `gpt-5\.6-terra` \| mechanical, hard-to-get-wrong work \|$/m,
    /^\| unused \| Haiku \| `gpt-5\.6-luna` \| not used \|$/m,
  ));

// ------------------------------------------------------------------ A: what the mode is

test("A1 the mode is prompt only",
  "the mode adds no mechanism to maintain; asking for a new header field or driver flag would change its scope",
  () => says("The mode is prompt only: no driver change, no new header field or flag, the seat's own prompt file and the driver's state directory unchanged."));

test("A3 the sibling is loaded first and this page re-cuts only what the mode changes",
  "rights, header fields, the worktree lifecycle and the exit ladder have exactly one home; a copy here is a second copy to drift, so the page has to send the reader there and say what it does not restate",
  () => {
    const problems = [];
    const raw = shows(/\[codex-delegate\]\(\.\.\/codex-delegate\/SKILL\.md\)/);
    if (raw !== true) problems.push(raw);
    const prose = says(
      "(Skill tool, `codex-delegate:codex-delegate`; bare `codex-delegate` on a clone-and-symlink install)",
      "this page re-cuts only what the mode changes",
      "1. Load the sibling skill with the Skill tool if it is not loaded yet, scout, then decide the composition and the seats.",
    );
    if (prose !== true) problems.push(prose);
    return problems.length === 0 || problems.join("; ");
  });

// ------------------------------------------------------------------ B: the orchestrator's own hands

test("B1 scouting is the only exploration the orchestrator does",
  "the mode's one economy is that the big reads happen in a seat's context; an orchestrator that keeps exploring after the scout has spent the context the fan-out was meant to save",
  () => says(
    "scout the work-list with cheap commands (`ls`, `git status`, targeted `grep`) before any fan-out",
    "Scouting is the only exploration you do",
  ));

test("B2 the verbose work is a seat's",
  "this list is the operational content of the mode: without it \"push the verbose step onto a seat\" is a slogan and every coordinator draws the line somewhere else",
  () => says("test output, greps over the tree, reading source files, diffs, logs"));

test("B3 a quick targeted edit stays in the orchestrator's hands",
  "the counterweight to B1: without it the mode fans out a one-line fix and pays a seat's latency for something already known",
  () => says("a quick targeted edit that needs no exploration"));

test("B4 a check run inline is redirected and read back as a 5-line tail",
  "the escape hatch that keeps B1 affordable: a suite run inline pastes thousands of lines into the context the mode exists to protect",
  () => says("read back only a 5-line tail with the counts"));

test("B5 the orchestrator never grades its own work",
  "self-review is the failure the whole composition is built against, and the orchestrator is the one seat with no one above it",
  () => says("verify: you never grade your own work, a fresh seat does"));

test("B6 a failed seat is reported, never backfilled, and every finding keeps its author",
  "a silently reissued seat turns a measured composition into a claim, and an unattributed finding cannot be weighed against the seat that made it",
  () => says(
    "report a failed seat and never backfill it",
    "attributing every finding to the seat that produced it",
  ));

// ------------------------------------------------------------------ C: the plan and the worktree

test("C1 one plan, or all of them",
  "picking silently between viable approaches is the choice the user came to make; the plan step is where that choice is offered or lost",
  () => says("One plan when there is one; when several approaches are viable, show them all with a recommendation and let the user pick"));

test("C2 the plan is shown and the run stops, with every right a seat needs",
  "rights declared per call are the sibling's guarantee, and they are worth nothing if the user first sees them in the transcript of a seat that already wrote",
  () => says(
    "Show the plan and stop",
    "`SEAT: write`, `SEAT: worktree`, `NETWORK:` and `WRITABLE:` a seat needs",
  ));

test("C3 \"go\" covers the plan and nothing else, and never a live-tree commit",
  "one word of approval is the mode's only gate: if it silently widened to work the plan never listed, the plan stopped being the thing being approved",
  () => says(
    "The user's \"go\" covers only what the plan listed",
    "no commit to the live tree without a separate word from the user",
  ));

test("C4 a worktree is cut at HEAD and never used to test uncommitted live edits",
  "this is the trap that passes: the seat runs the suite against untouched code, reports green, and the coordinator reads it as evidence about edits the worktree never saw",
  () => says(
    "A worktree is cut at `HEAD`",
    "Never use one to test uncommitted live edits",
    "dependencies installable inside it under the planned rights (the live checkout's are absent), no daemon or socket",
    "A Codex worktree seat cannot commit under the rights a `SEAT:` line makes: its sandbox ends at the tree, so its work comes back as a diff",
  ));

test("C5 the harvest is landed by proposal, naming the three envelope handles",
  "the seat's work reaches the live tree through fields the envelope already carries; without their names the coordinator invents a merge and lands something nobody looked at",
  () => says(
    "Land the harvest by proposal: apply `worktreeDiffPath` and restore `worktreeUntrackedPath`, or merge or cherry-pick `worktreeCommitsRef` when the seat committed; show it, then wait, unless the plan said \"land the winner\"",
  ));

test("C6 the plan states the pool and the user overrides it in words",
  "the caps are settings the user owns: a plan that launched under the page's defaults without showing them gave the user nothing to overrule, and \"two Fable\" or \"only codex\" said after the first seat is a word too late",
  () => says(
    "Announce the composition here, and the pool beside it: your own model and the default caps below, one Fable, one `gpt-6-astra`, six alive.",
    "A cap the user overrides in words (\"two Fable\") replaces the default for this run; composition words (\"only codex\", \"no codex\") follow the sibling's table.",
  ));

test("C7 every seat's return is retold to the user in one short paragraph, the same shape for both sides",
  "the five fields are the orchestrator's input, not the user's: pasted whole they read in the transcript as the coordinator's own words (observed on 0.10.0), and a Codex seat, whose only visible row is a Bash call and an exit code, otherwise reaches the user having said nothing at all",
  () => says("After any seat returns, Claude or Codex, tell the user in one short paragraph what that seat found, naming the seat and its model, in the same shape for both sides; never paste a five-field block into user-facing text."));

test("C8 browser and end-to-end runs go to a Claude seat or a write seat with the browser grants",
  "Chromium needs rights a read seat does not have, so a browser task sent to one buys a refused approval and exit 6 (measured 2026-09-08) instead of a result; the grants that do work are one section of parity.md and not something to rediscover per run",
  () => {
    const prose = says(
      "Browser and end-to-end runs go to a Claude seat, or to a write seat with `NETWORK:` and the grants parity.md's",
      "section names; a Codex read seat asked to launch a browser is refused and exits 6 (measured 2026-09-08).",
    );
    const link = shows(/\[Browser-mode sandbox\]\(\.\.\/codex-delegate\/references\/parity\.md#browser-mode-sandbox\)/);
    return prose === true && link === true || [prose, link].filter((r) => r !== true).join("; ");
  });

// ------------------------------------------------------------------ D: models, tags and effort

test("D2 the orchestrator's own model is read out of the system prompt",
  "the plan states it beside the pool and an untagged subagent inherits it, and nothing else in the session says which it is: a coordinator that guesses announces the wrong model and cannot tell an inherited tier from a chosen one",
  () => says("Your own model is in your system prompt (\"You are powered by the model named ...\"); nothing else carries it."));

test("D3 every Claude Agent call is tagged, fable only for the one Fable seat, and a Codex seat's model is its own header line",
  "an untagged subagent silently inherits the session model, so a fan-out meant to be cheap runs at the top tier; and a Codex seat is a Bash task, so a model or effort written as a tool option is spent on nothing while the seat runs on the config default",
  () => says(
    "Tag every Claude Agent call with an explicit `model`: `opus` or `sonnet`, and `fable` only for the one Fable seat",
    "every Codex seat carries one with a slug from the table, never the config default",
    "a Codex seat is a Bash task, so no tool-side `model` or `effort` option reaches it",
  ));

test("D4 one Fable seat and one gpt-6-astra seat alive at a time",
  "the top tier is the expensive one and it is the one a fan-out multiplies fastest; the cap is the only thing between a five-seat batch and five top-tier seats",
  () => says("at most one Fable seat and one `gpt-6-astra` seat alive at a time"));

test("D5 the pool does not depend on the orchestrator's model, and the top pair takes its roles in turn",
  "the pool is the user's, not the session's: an Opus orchestrator that designed for itself and reviewed with a fresh Opus spent the strong tier on the top tier's work while a Fable seat sat unused; one Fable seat, one role at a time, is available to every orchestrator",
  () => {
    const prose = says(
      "You are outside the pool, and the pool is the same whatever you are",
      "each taking the top-row roles in turn, architect for one task and judge for the next",
    );
    const row = shows(/^\| plan \| design: the Fable seat, whatever your own model \|$/m);
    return prose === true && row === true || [prose, row].filter((r) => r !== true).join("; ");
  });

test("D7 a Fable seat never spawns Fable, and only the orchestrator launches the pool's Fable seat",
  "a top seat that may spawn its own top seat makes the cap of one unenforceable one level down, where nothing is counting; stated without \"seat\" the rule also read as forbidding a Fable orchestrator the one Fable seat the pool promises it",
  () => says("a Fable seat never spawns Fable", "only you launch the pool's Fable seat"));

test("D8 no EFFORT line, and low effort only for mechanical Sonnet stages",
  "the user's configured effort is the default every seat inherits; measured on codex-cli 0.153.4, gpt-6-astra delegates to its own subagent threads at xhigh as readily as at ultra when invited, so no effort line buys the evidence guarantee an exception once claimed",
  () => {
    const prose = says(
      "Send no `EFFORT:` line",
      "In a Workflow, `effort: 'low'` is for mechanical Claude Sonnet stages only.",
    );
    // The negative half: an exception that names an effort value for some seat is exactly what a later
    // edit would add back, and every positive pin would still pass beside it.
    const exception = /EFFORT:\s*(none|minimal|low|medium|high|xhigh|max|ultra)\b/.exec(text);
    if (exception) return `the page names an effort value again: ${JSON.stringify(exception[0])}`;
    return prose;
  });

// ------------------------------------------------------------------ E: composition and bounds

test("E1 the mode replaces the sibling's \"nothing\" row: half beyond the implementers, rounded up, and implementers are not duplicated",
  "this is the one composition rule the mode changes, and it changes exactly one row; stated loosely it either duplicates every implementer or quietly drops the Codex side entirely",
  () => says(
    "This mode replaces one row of the sibling's",
    "the \"nothing\" row: when the user states no allocation, half the seats beyond the implementers, rounded up, are Codex",
    "Implementers are not duplicated: one per task",
  ));

test("E2 cross-review runs both directions, and each seat is a prompt seat with the schema",
  "one-directional cross-review checks only one side's bias, and a reviewer given no schema answers in prose, which is not the five fields the synthesis reads",
  () => says(
    "a Claude implementer's diff to a Codex seat and a Codex seat's diff to a Claude seat",
    "a cross-review seat is a prompt seat with the diff's path in `TASK:` and the template below in `OUTPUT_SCHEMA:`",
  ));

test("E3 the composition table is linked at its anchor",
  "everything the mode does not replace lives in that section; a link to the page without the anchor sends the reader to the top of a manual and the rules that still hold go unread",
  () => shows(/\[composition table\]\(\.\.\/codex-delegate\/SKILL\.md#composition\)/));

test("E4 the three bound rows: alive at once, the top pair, the Codex write seat per directory",
  "these are the numbers that decide whether a fan-out runs or deadlocks: a second Codex write seat on one directory exits 10 before its turn ever runs",
  () => shows(
    /^\| alive at once \| 6, Claude and Codex together, the top pair counted in \|$/m,
    /^\| Fable seats, `gpt-6-astra` seats \| 1 each, alive at a time \|$/m,
    /^\| Codex write seats per directory \| 1: a second on the same directory exits 10 at once, before its turn runs \|$/m,
  ));

test("E5 the three scaling rows: simple, comparison, complex",
  "the seat count is the decision a coordinator makes first and reasons about least; without the bands a simple task gets a panel and a complex one gets a single seat",
  () => shows(
    /^\| simple task \| 1 seat \|$/m,
    /^\| comparison or design \| 2 to 4 seats \|$/m,
    /^\| complex \| 5 seats or more, launched in batches inside the alive cap \|$/m,
  ));

test("E6 the writer may run the suite, but the deciding evidence comes from elsewhere",
  "a writer iterating against its own suite is how a green run gets produced by the same context that produced the bug; the rule keeps the iteration and moves only the verdict",
  () => says(
    "several writers only on disjoint files that cannot interfere, and then as Claude seats or in separate worktrees, never two Codex write seats on one directory",
    "A writer may run the suite while it iterates, but the evidence that decides comes from a seat that did not write the code, or from you under the redirect rule.",
  ));

// ------------------------------------------------------------------ F: mechanism and verification

test("F1 a Codex seat is a background Bash task and no agentType, and the Workflow signature names what a script may still do",
  "Workflow is for the chain a script must decide; a batch of independent Claude seats runs as Agent calls so each seat's end reaches the orchestrator (measured 2026-09-08: a Workflow hid a seat's exit for nine minutes); and with the relay agent gone, a page that still offered a Codex agentType would send every Codex seat to a subagent type that does not exist",
  () => {
    const prose = says(
      "authorises Workflow",
      "A Codex seat is one background Bash task, the sibling's `One call` verbatim, with `run_in_background` true",
      "with `<DIR>` = `<run>/<seat>/` under the run directory above in place of the sibling's `mktemp`, so prompt, `report.json`, `out.json` and `err.txt` all land there",
      "the task's exit notification is when you read that report",
      "It is not an `agentType` and there is no other route to it",
      "Launch independent Claude seats as background Agent calls, one notification each",
      "Load the `workflow-authoring` skill before writing the script when the session lists it.",
      "`agent(prompt, {label, phase, schema, model, effort, agentType, isolation})`",
      "`pipeline(items, ...stages)` runs items through stages with no barrier, `parallel(thunks)` is a barrier",
      "A subagent's final text is its return value, not a message to a human",
    );
    // The negative half: the agent this release deleted, offered again by name, is a seat that never runs.
    if (/codex-seat/.test(text)) return "the page names the codex-seat agent again";
    return prose;
  });

test("F2 the six verification bullets, one line each",
  "the list is read while composing a fan-out, so each bullet has to be one glance; a bullet that grew into a paragraph is a bullet that stops being read",
  () => shows(
    /^- Scout inline first: the work-list is yours, before any fan-out\.$/m,
    /^- Adversarial verify: a refuter defaults to `refuted` when it is uncertain\.$/m,
    /^- Perspective-diverse verify: vary the angle across verifiers instead of N identical refuters\.$/m,
    /^- Judge panel for a design task\.$/m,
    /^- Completeness critic at the end: what is missing, unverified, unread\.$/m,
    /^- No silent caps: name every seat, check or item you dropped\.$/m,
  ));

test("F3 two rounds of fix and cross-review, then escalate",
  "without a bound the fix loop is where a run spends its budget; the escalation names where the round after the second one goes, the top pair first and the user last",
  () => says("Fix, then cross-review, at most two rounds; then escalate to the Fable seat or the `gpt-6-astra` seat, and to the user only when that round fails too."));

test("F4 every row of the Result table",
  "this table is read at the one moment judgement is worst, when a seat has just failed; a missing row is a relaunch that duplicates a live run, or a gate verdict retried until it costs real money",
  () => shows(
    /^\| no report file at all \| the seat may still be running, whatever its task says: `kill -0 <pid>` with the pid on the first line of its stderr file; relaunch once, same rights, only when none is live \|$/m,
    /^\| a stderr file naming no driver \| report it; no relaunch fixes an install \|$/m,
    /^\| `exitCode: 3`, a cut \| read the partial; if the work is unfinished, continue that thread once with `RESUME:` \|$/m,
    /^\| `exitCode: 10` \| a held lock or a busy thread: read `error` and the stderr file, wait for the holder, then run again; not a retry \|$/m,
    /^\| `ok: false` with `turnStatus: null`, exit 2 or 4 \| no turn ran, or it was aborted: read `error` and the stderr file \|$/m,
    /^\| exit 4 with a `turnStatus` \| the server died mid-turn or the report was not delivered: the report is complete, read it as a gate verdict \|$/m,
    /^\| any other non-zero `exitCode` with an answer \| a gate verdict: do not retry, read the answer \|$/m,
    /^\| a Claude seat that returns `blocked` \| do not retry, report it \|$/m,
  ));

test("F5 the Bash call's description names the seat and its model",
  "a Codex seat surfaces as a Bash row, so without a description the user reads a command line of flags where a Claude seat shows an agent and its text; the two sides stop looking like one run, which is the whole point of naming the seat there",
  () => says("The Bash call carries a `description` of the form \"Codex seat <id>, <model>: <task in a few words>\", so the row the user sees names the seat, not the command line."));

// ------------------------------------------------------------------ G: the seat's return, the run directory

test("G1 the five template lines, their indentation, the inline schema, and no BRIEF: line",
  "the template is pasted into a brief, so its indentation is the thing that survives or does not; `BRIEF:` on top of it clips the answer at 20 lines, which is the template's own bound overruled",
  () => {
    const problems = [];
    const raw = shows(
      /^ {4}status: {4}done \| partial \| blocked$/m,
      /^ {4}result: {4}at most 30 lines$/m,
      /^ {4}evidence: {2}what ran, with counts; a test without its count is not evidence$/m,
      /^ {4}artifacts: paths$/m,
      /^ {4}open: {6}questions and risks$/m,
      /^ {4}\{"type":"object","additionalProperties":false,"required":\["status","result","evidence","artifacts","open"\],"properties":\{"status":\{"type":"string","enum":\["done","partial","blocked"\]\},"result":\{"type":"string"\},"evidence":\{"type":"array","items":\{"type":"string"\}\},"artifacts":\{"type":"array","items":\{"type":"string"\}\},"open":\{"type":"array","items":\{"type":"string"\}\}\}\}$/m,
    );
    if (raw !== true) problems.push(raw);
    const prose = says("and send no `BRIEF:` line");
    if (prose !== true) problems.push(prose);
    return problems.length === 0 || problems.join("; ");
  });

test("G3 the run directory: its path, why it needs no .gitignore, kept after the task, and what a Codex seat's artifacts are",
  "one directory per run is what keeps a seat's artifacts findable and out of the tree the run works in; the plugin's data directory is outside every repository, so nothing has to be ignored and nothing lands in a payload, and `.claude/` is the one path whose writes prompt however the permissions are set",
  () => says(
    "create `${CLAUDE_PLUGIN_DATA}/orchestrate/<project-slug>/<run>/`",
    "the working directory's absolute path with every character that is not a letter or a digit replaced by `-`",
    "It is outside every repository, so no `.gitignore`",
    "not the repository root, not the project's `.claude/`, whose writes prompt whatever the allow rules say",
    "it is kept after the task and the user deletes it",
    "Codex artifacts are the paths the seat's own report names",
  ));

test("G4 the first line of `result` is one human sentence: the seat, its model, its status, what it did",
  "both the synthesis and the paragraph the user reads are built out of returns; a `result` that opens mid-analysis has to be read whole before it can be retold, and the five-field shape alone is not something a human reads",
  () => says(
    "The first line of `result` is one sentence a human can read on its own: the seat's id and model, its status and what it did",
    "(\"Seat W5, Sonnet: done, four flaky width checks replaced by threshold checks\")",
    "the rest of the fields follow unchanged",
  ));

test("G5 a read seat is never asked to write: its artifact is its report",
  "a read seat handed a brief that demands a file spends its whole turn asking for an approval the driver refuses, and the run ends at exit 6 with nothing written and nothing answered (measured 2026-09-08)",
  () => says(
    "A read seat is never asked to write, not under the repository and not in the run directory: its artifact is its report",
    "costs a refused write and exit 6 (measured 2026-09-08)",
  ));

// ------------------------------------------------------------------ the schema, and the links

test("the inline schema parses and is strict all the way down",
  "a seat is told to copy this line into an `OUTPUT_SCHEMA:` file, so a typo in it is a seat that fails validation, and a missing `additionalProperties: false` is the loose schema the sentence beside it forbids",
  () => {
    const src = /^ {4}(\{"type":"object".*)$/m.exec(text)?.[1];
    if (!src) return "no 4-space-indented line starting {\"type\":\"object\" is in the page";
    let schema;
    try { schema = JSON.parse(src); } catch (e) { return `the schema line is not JSON: ${e.message}`; }
    const problems = [];
    const walk = (node, at) => {
      if (!node || typeof node !== "object") return;
      if (node.type === "object") {
        if (node.additionalProperties !== false) problems.push(`${at}: additionalProperties is ${JSON.stringify(node.additionalProperties)}, not false`);
        const props = Object.keys(node.properties ?? {});
        const required = node.required ?? [];
        const optional = props.filter((p) => !required.includes(p));
        const phantom = required.filter((p) => !props.includes(p));
        if (optional.length) problems.push(`${at}: not in required: ${optional.join(", ")}`);
        if (phantom.length) problems.push(`${at}: required but not a property: ${phantom.join(", ")}`);
      }
      for (const [k, v] of Object.entries(node.properties ?? {})) walk(v, `${at}.${k}`);
      if (node.items) walk(node.items, `${at}[]`);
    };
    walk(schema, "schema");
    // The five fields the whole page is built around, checked by name rather than by count.
    const missing = ["status", "result", "evidence", "artifacts", "open"].filter((f) => !(f in (schema.properties ?? {})));
    if (missing.length) problems.push(`the schema is missing: ${missing.join(", ")}`);
    return problems.length === 0 || problems.join("; ");
  });

test("every relative link resolves, inside this repository, to a file and to a heading that exists",
  "the page delegates its whole mechanism to the sibling by link: a moved file or a renamed section turns the authoritative half of the mode into a 404 that only a reader notices",
  () => {
    const dir = path.dirname(path.join(ROOT, PAGE));
    const problems = [];
    // GitHub's slug for a heading: lower-cased, punctuation dropped, spaces to hyphens.
    const slug = (h) => h.toLowerCase().replace(/[^a-z0-9 -]/g, "").trim().replace(/ +/g, "-");
    for (const [, target] of text.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
      if (/^[a-z]+:/.test(target)) continue;                                    // an external URL is not this suite's to resolve
      const [rel, anchor] = target.split("#");
      const abs = path.resolve(dir, rel);
      if (!abs.startsWith(ROOT + path.sep)) { problems.push(`${target} leaves the repository`); continue; }
      if (!fs.existsSync(abs)) { problems.push(`${target} resolves to nothing: ${abs}`); continue; }
      if (!anchor) continue;
      const headings = [...fs.readFileSync(abs, "utf8").matchAll(/^## (.+)$/gm)].map((m) => slug(m[1].trim()));
      if (!headings.includes(anchor)) problems.push(`${target}: no "## " heading slugs to #${anchor} (has ${headings.join(", ")})`);
    }
    return problems.length === 0 || problems.join("; ");
  });

process.exit(summarize(await runCases(CASES), CASES.length));
