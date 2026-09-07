#!/usr/bin/env node
// Does a real session DO what skills/orchestrate/SKILL.md says, or only carry the page?
//
//   CODEX_DELEGATE_LIVE_ORCHESTRATE=1 node evals/orchestrate-live.test.mjs
//   CODEX_DELEGATE_LIVE_ORCHESTRATE=1 node evals/orchestrate-live.test.mjs --only 1,3
//
// orchestrate.test.mjs pins the page's TEXT: every decision the user agreed to is a string in a file, and
// a rewrite that drops one turns a case red. It cannot tell whether a coordinator that READS the page does
// any of it, and every claim the mode makes is behavioural: it stops at a plan, it names a Codex seat from
// the tier table, it tags every Claude seat, it touches nothing before "go", it writes one run directory.
// Those are the release gate here, and nothing short of a live session measures them.
//
// It spends real model calls, so it is gated exactly like the fidelity suite's live turn: without
// CODEX_DELEGATE_LIVE_ORCHESTRATE=1 it says so in one line and exits 0.
//
// Every case runs in a scratch clone under the artifact directory, never in the checkout, which is only
// ever the --plugin-dir. Nothing here writes into this repository.
//
// The flag set below was PROBED before the cases were written, with --model sonnet and the prompt "Reply
// with the single word ok", against Claude Code 2.1.170, and probed again after the first full run came
// back with every write and every non-trivial Bash denied. What the probes measured, and what the cases
// below now rely on:
//   - the init line is {type:"system", subtype:"init"} and its `model` is the CONCRETE id, not the alias
//     ("sonnet" arrived as "claude-sonnet-4-6"), so an alias is matched as a substring;
//   - the init line's tool list names the subagent tool `Task` while the tool_use blocks in the same
//     build's stream carry `Agent`, so both spellings count and neither alone is safe;
//   - the last line is {type:"result"} and its `result` is the final text;
//   - --plugin-dir loaded codex-delegate:codex-delegate, codex-delegate:orchestrate and both spellings of
//     the codex-seat agent;
//   - this machine's managed settings set disableBypassPermissionsMode: "disable", so
//     --dangerously-skip-permissions is accepted and then ignored, and in -p mode there is no prompt to
//     answer: every write and every non-trivial Bash is auto-denied. --permission-mode acceptEdits with an
//     explicit --allowedTools list is the replacement that was measured working, a headless sonnet session
//     writing lib/x.mjs and creating .orchestrate/probe/.gitignore under a scratch root;
//   - --allowedTools is variadic and swallows a trailing prompt argument as one more rule, so the prompt
//     goes in on stdin (runProc's `input`) rather than on the command line;
//   - a write anywhere under .claude/ is refused as "a sensitive file" even with Write(./.claude/**)
//     allowed, which is why the page's run directory is .orchestrate/<run>/ at the repository root.
//
// Two things outlive a run on purpose. Case 5's session file stays under ~/.claude/projects: --resume
// reads it, and the CLI has no delete for it. And a FAILING case keeps its scratch tree, which its
// failure message names; a passing case removes it, so the artifact directory holds the plan, the session
// output, the reports and the stderr rather than a clone of this repository per case.
//
// Case 4 measures the seat, not the effort. Measured on codex-cli 0.153.4: invited to delegate,
// gpt-6-astra opened its own subagent threads at xhigh exactly as at ultra (otherItemCounts
// {subAgentActivity: 6, collabAgentToolCall: 2}, no command on the root thread, exit 5 with the right
// answer), so delegation is the model's choice and no effort buys the guarantee an EFFORT line once
// claimed. The case asks for the work on this thread and checks that it arrived there; the inviting
// prompt survives as an informational probe behind CODEX_DELEGATE_LIVE_ORCHESTRATE_DELEGATE=1. Nothing
// here asserts on the report's subagentThreads: on 0.153.4 those child threads never arrive as a
// thread/started carrying parentThreadId, so the field stays [] while the counters show the delegation.
// That gap is the driver's, and a follow-up; protocol.test.mjs is what pins the field itself.

import { spawn, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { DRIVER, ROOT, registry, runCases, summarize } from "./lib/harness.mjs";

const { cases: CASES, test } = registry();

// Kept, never swept: RELEASING files these with the release notes, so they must outlive the process. That
// is also why harness.tempDir is not used here, which removes its directories on exit.
// Colons are legal in a path on both supported platforms and awkward in every shell that will open these,
// so the ISO stamp keeps its order and loses its punctuation.
const ART = path.join(os.tmpdir(), `orchestrate-live-${new Date().toISOString().replace(/[:.]/g, "-")}`);
const caseDir = (n, slug) => {
  const d = path.join(ART, `${n}-${slug}`);
  fs.mkdirSync(d, { recursive: true });
  return d;
};
const save = (dir, name, text) => {
  const p = path.join(dir, name);
  fs.writeFileSync(p, text ?? "");
  return p;
};

const DELEGATE_PROBE = process.env.CODEX_DELEGATE_LIVE_ORCHESTRATE_DELEGATE === "1";
const skipped = [];
// Measured beside a case, never a verdict: printed where the case that produced it is, in runCases' own
// indent, so a reader keeps the pairing.
const note = (line) => console.log(`      ${line}`);

// --------------------------------------------------------------- the vocabulary the page owns

const CODEX_MODELS = ["gpt-6-astra", "gpt-5.6-sol", "gpt-5.6-terra"];
const CODEX_SEATS = ["codex-delegate:codex-seat", "codex-seat"];
const SIBLING_SKILLS = ["codex-delegate:codex-delegate", "codex-delegate"];
// Both, because one build answers with both: `Task` in the init line's tool list, `Agent` in the tool_use
// blocks. A rename must not silently empty the checks that count subagent calls.
const AGENT_TOOLS = new Set(["Task", "Agent"]);

// --------------------------------------------------------------- processes

function runProc(cmd, args, { cwd, timeoutMs, env, input } = {}) {
  return new Promise((resolve) => {
    // detached puts the child in a process group of its own so the bell can kill the GROUP: a session
    // spawns seats, and a seat is a `node driver.mjs` that outlives a SIGKILL aimed at its parent alone.
    const stdin = input === undefined ? "ignore" : "pipe";
    const child = spawn(cmd, args, { cwd, env: env ?? process.env, stdio: [stdin, "pipe", "pipe"], detached: true });
    // A prompt on stdin, because --allowedTools is variadic and eats a trailing positional as a rule. The
    // error handler is not optional: a child killed at the bell closes its stdin, and an unhandled EPIPE
    // on the write would take the suite down with it.
    if (input !== undefined) {
      child.stdin.on("error", () => {});
      child.stdin.write(input);
      child.stdin.end();
    }
    let out = "", err = "", killed = false;
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (d) => { out += d; });
    child.stderr.on("data", (d) => { err += d; });
    const bell = setTimeout(() => {
      killed = true;
      try { process.kill(-child.pid, "SIGKILL"); } catch { try { child.kill("SIGKILL"); } catch {} }
    }, timeoutMs);
    const end = (code, extra) => {
      clearTimeout(bell);
      resolve({ code, out, err: extra ? `${err}\n${extra}` : err, killed });
    };
    child.on("error", (e) => end(null, `spawn failed: ${e.message}`));
    child.on("close", (code) => end(code));
  });
}

const git = (cwd, ...args) => (spawnSync("git", args, { cwd, encoding: "utf8" }).stdout ?? "");

const wcL = (file) => {
  const r = spawnSync("wc", ["-l", file], { encoding: "utf8" });
  return Number.parseInt((r.stdout ?? "").trim(), 10);
};

function scratchClone(dir) {
  const s = path.join(dir, "scratch");
  const r = spawnSync("git", ["clone", "--local", "--quiet", ROOT, s], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`git clone --local failed: ${(r.stderr ?? "").trim().slice(0, 240)}`);
  // Without this the "untouched" assertions below prove nothing: a clone that starts dirty makes an
  // empty porcelain impossible and a non-empty one meaningless.
  const dirty = git(s, "status", "--porcelain").trim();
  if (dirty) throw new Error(`a fresh clone is already dirty: ${dirty.slice(0, 240)}`);
  return s;
}

// --------------------------------------------------------------- the session and its stream

// Not --dangerously-skip-permissions: managed settings disable that mode on this machine, and a -p
// session that inherits the denial writes nothing and runs no command. The rules are the tools the page's
// coordinator uses, both spellings of the subagent tool among them; acceptEdits is what lets a seat write
// without a prompt no headless run could answer.
const CLAUDE_FLAGS = ["--plugin-dir", ROOT, "--output-format", "stream-json", "--verbose",
                      "--permission-mode", "acceptEdits",
                      "--allowedTools", "Bash,Write,Edit,Read,Glob,Grep,Skill,Agent,Task,Workflow"];

// --no-session-persistence is the default here and is DROPPED for case 5: a session it disables is not
// saved to disk and cannot be resumed, and case 5's whole shape is one plan turn and one "go" turn on the
// same session id. The prompt is NOT in here; it goes to the child on stdin.
function claudeArgs({ model, maxTurns, sessionId, resume, resumable = false }) {
  const a = ["-p", "--model", model, ...CLAUDE_FLAGS, "--max-turns", String(maxTurns)];
  if (!resumable) a.push("--no-session-persistence");
  if (sessionId) a.push("--session-id", sessionId);
  if (resume) a.push("--resume", resume);
  return a;
}

const session = (opts, { cwd, timeoutMs }) =>
  runProc("claude", claudeArgs(opts), { cwd, timeoutMs, input: opts.prompt });

function parseStream(text) {
  const msgs = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    // A killed run ends mid-line; a half-written object is not a parse failure worth aborting a case for.
    try { msgs.push(JSON.parse(line)); } catch {}
  }
  const init = msgs.find((m) => m.type === "system" && m.subtype === "init") ?? null;
  const result = [...msgs].reverse().find((m) => m.type === "result") ?? null;
  const toolUses = [];
  const texts = [];
  for (const m of msgs) {
    if (m.type !== "assistant") continue;
    // The plan is what the coordinator SAID, across its root-level messages, not the result line alone:
    // measured, one run put the plan in one message and a closing paragraph in the next, and
    // result.result held only the closer. A subagent's text is its own return value and stays out.
    const root = (m.parent_tool_use_id ?? null) === null;
    for (const b of m.message?.content ?? []) {
      if (b?.type === "tool_use") toolUses.push({ name: b.name, input: b.input ?? {}, parent: m.parent_tool_use_id ?? null });
      else if (root && b?.type === "text" && typeof b.text === "string") texts.push(b.text);
    }
  }
  return {
    msgs, init, result, toolUses,
    resultText: typeof result?.result === "string" ? result.result : "",
    planText: texts.join("\n\n"),
  };
}

// The alias asked for against the concrete id the session reports. This is also what proves --model beats
// a settings pin: .claude/settings.local.json in this checkout pins one, and a session started with the
// flag must not inherit it. (The scratch clones carry no settings of their own: `.claude/` is gitignored
// here, so it never reaches a clone.)
const modelMismatch = (init, alias) =>
  typeof init?.model === "string" && init.model.toLowerCase().includes(alias)
    ? null : `--model ${alias} was asked for, the session reports ${JSON.stringify(init?.model ?? null)}`;

const agentCalls = (toolUses) => toolUses.filter((u) => AGENT_TOOLS.has(u.name));
const workflowCalls = (toolUses) => toolUses.filter((u) => u.name === "Workflow");
const skillCalls = (toolUses) => toolUses.filter((u) => u.name === "Skill")
  .map((u) => String(u.input.skill ?? u.input.name ?? JSON.stringify(u.input)));
// A Workflow's script is one field of its input, but which one is the tool's business, not this suite's:
// the whole input is the text the fable check reads, which cannot miss a fable hiding in a sibling field.
const scriptText = (u) => JSON.stringify(u.input);
// The agent() scan wants the script itself, because it reads syntax; the fallback keeps it alive if the
// field is ever renamed, since JSON.stringify leaves `agent(` and a model key matchable.
const scriptSource = (u) => (typeof u.input.script === "string" ? u.input.script : JSON.stringify(u.input));

// Source text, not a parse tree, and the whole call span is what it judges: from `agent(` to the next
// `agent(` or the end. Measured, brace-matching from the first comma read "{ slug }" as the options of a
// correctly tagged call, because the first brace sat inside the prompt string. Judging the span costs one
// direction (a prompt that quotes 'opus' reads as tagged) and keeps every other error on the strict side:
// an options object held in a variable, or a call assembled at runtime, still reads as untagged.
function untaggedAgentCalls(text) {
  const starts = [...text.matchAll(/\bagent\s*\(/g)].map((m) => m.index);
  const found = [];
  for (let i = 0; i < starts.length; i++) {
    const call = text.slice(starts[i], starts[i + 1] ?? text.length).replace(/\s+/g, " ");
    const comma = call.indexOf(",");
    if (comma < 0 || call.indexOf("{", comma) < 0) { found.push(`${call.slice(0, 60)}: no options`); continue; }
    // The script arrives as source when the field is named and as JSON when it is not, so the escaped
    // quotes of the fallback are undone before the two patterns read it.
    const flat = call.replace(/\\(["'])/g, "$1");
    // Tagged means one of the two things the page allows and nothing else: a Codex seat by agentType, or
    // a Claude seat whose model is literally opus or sonnet. `model: undefined`, a third tier and a
    // non-Codex agentType all read as untagged.
    const codex = /["']?agentType["']?\s*:\s*["'][^"']*codex-seat["']/.test(flat);
    const claude = /["']?model["']?\s*:\s*["'](opus|sonnet)["']/.test(flat);
    if (!codex && !claude) found.push(call.slice(0, 100));
  }
  return found;
}

const runDirs = (scratch) => {
  const d = path.join(scratch, ".orchestrate");
  try { return fs.readdirSync(d).map((n) => path.join(d, n)); } catch { return []; }
};

// A relay launches its seat detached, in a process group of its own, so the bell's SIGKILL on the
// session's group never reaches it: after a kill, every run the registry still shows running for the
// scratch is cancelled by threadId, and the ids are saved beside the case.
async function cancelSeats(scratch, dir, env) {
  const jobs = await runProc(process.execPath, [DRIVER, "--jobs", "--cwd", scratch], { timeoutMs: 60_000, env });
  let records = [];
  try { records = JSON.parse(jobs.out); } catch {}
  const running = (Array.isArray(records) ? records : []).filter((r) => r.status === "running" && r.threadId);
  for (const r of running) await runProc(process.execPath, [DRIVER, "--cancel", r.threadId], { timeoutMs: 60_000, env });
  save(dir, "cancelled.txt", running.map((r) => r.threadId).join("\n"));
  return running.length;
}

// --------------------------------------------------------------- the plan assertions

// Case 1 and case 5's first turn ask the same thing of the same prompt, so the four mechanical checks live
// once: nothing was delegated, nothing was written, no run directory exists yet.
function stoppedAtPlan(toolUses, scratch, head0) {
  const problems = [];
  const fanned = [...agentCalls(toolUses), ...workflowCalls(toolUses)];
  if (fanned.length) problems.push(`the plan did not stop: ${fanned.map((u) => u.name).join(", ")} ran before "go"`);
  const dirty = git(scratch, "status", "--porcelain").trim();
  if (dirty) problems.push(`the scratch was written to: ${dirty.split("\n").slice(0, 5).join(" | ")}`);
  // A clean tree is also what a commit leaves behind, so HEAD is compared as well as the porcelain.
  const head1 = git(scratch, "rev-parse", "HEAD").trim();
  if (head0 && head1 !== head0) problems.push(`HEAD moved from ${head0.slice(0, 12)} to ${head1.slice(0, 12) || "nothing"} before "go"`);
  const made = runDirs(scratch);
  if (made.length) problems.push(`.orchestrate exists before "go": ${made.map((p) => path.basename(p)).join(", ")}`);
  return problems;
}

const quote = (line) => JSON.stringify(line.trim().slice(0, 140));
const lines = (text) => text.split("\n").filter((l) => l.trim());

// `fable`: "none" for a session that is not Fable, where the tag must not appear at all; "cap" for the
// Fable session, where at most one seat carries it. The page states a cap, not a duty: measured, a Fable
// coordinator planned a four-seat comparison on strong-tier seats and reserved the top pair for a tie-break,
// which the page allows. That single option is the whole difference between case 1's assertions and case 2's.
//
// Everything below the tool checks is a heuristic over free text, and reads as one: a plan can satisfy
// every line here and still be a bad plan. The artifact plan.txt is what the release reader judges; these
// catch the plan that never names a tier at all, and each failure quotes the line it judged.
function planProblems({ text, toolUses, scratch, fable, head0 }) {
  const problems = stoppedAtPlan(toolUses, scratch, head0);
  const skills = skillCalls(toolUses);
  if (!skills.some((s) => SIBLING_SKILLS.includes(s)))
    problems.push(`the sibling skill was never loaded; Skill calls: ${skills.join(", ") || "none"}`);
  if (!text.includes(".orchestrate/"))
    problems.push("the plan names no `.orchestrate/` run directory");
  if (!CODEX_MODELS.some((m) => text.includes(m)))
    problems.push(`no seat carries a Codex slug from the tier table (${CODEX_MODELS.join(", ")})`);
  // Where the plan has a seat table, the rows ARE the seats and everything else is commentary about them:
  // measured, a plan that listed one Fable seat in a row and then wrote "one Fable seat, one gpt-6-astra
  // seat, caps respected" in a bullet counted its own summary as a second seat. A plan with no table is
  // judged on every line, as before.
  const rows = lines(text).filter((l) => l.trim().startsWith("|"));
  const seatLines = rows.length ? rows : lines(text);
  // No Claude-seat requirement: the page lets the coordinator take a quick targeted edit itself, and
  // measured, an Opus plan for the slug task did exactly that with one Codex verifier beside it. Whether
  // every Claude Agent call that does run carries a tag is judged after "go", on the calls themselves.
  if (!/\bCodex\b/.test(text)
      || !/\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|\d+)\b/i.test(text))
    problems.push("the plan announces no composition: the word Codex and a count or \"zero\"");
  // The same exclusion under the fable cap, and for both settings: a Fable session describing itself is
  // not a seat tagged fable, and counting those sentences made the cap unmeetable in case 2 and
  // unmissable in case 1.
  // The cap is on seats ALIVE at once. Measured three plans in a row honour it three different ways: two
  // rows with "runs after P1" beside the second; a "Wave" column with one Fable and one astra seat per
  // wave; a single top seat. So the count is taken per wave when the table has a wave/stage/phase/step
  // column, else per plan, and a stated sequencing exempts a plan-level count. A self-description is not a
  // seat: "you are Fable" and "under Fable" are excluded before counting.
  const isSeat = (l) => !/under fable|fable session|orchestrator|coordinator|powered by|you are/i.test(l);
  const header = rows[0] ? rows[0].split("|").map((c) => c.trim().toLowerCase()) : [];
  const waveCol = header.findIndex((c) => /^(wave|stage|phase|step|order|round|batch|when)$/.test(c));
  const groupOf = (l) => (waveCol >= 0 ? (l.split("|")[waveCol] ?? "").trim() : "");
  const capMax = (re) => {
    const per = new Map();
    for (const l of seatLines.filter(isSeat)) {
      const n = [...l.matchAll(re)].length;
      if (n) per.set(groupOf(l), (per.get(groupOf(l)) ?? 0) + n);
    }
    return Math.max(0, ...per.values());
  };
  const tagged = seatLines.filter((l) => /\bfable\b/i.test(l) && isSeat(l));
  const count = tagged.reduce((n, l) => n + [...l.matchAll(/\bfable\b/gi)].length, 0);
  if (fable === "none" && count)
    problems.push(`a fable tag is in the plan of a session that is not Fable: ${tagged.slice(0, 3).map(quote).join(" ")}`);
  if (fable === "cap") {
    const sequenced = /alive at a time|one at a time|one after the other|sequential|runs after|then the (second|other)/i.test(text);
    for (const [name, re] of [["fable", /\bfable\b/gi], ["gpt-6-astra", /gpt-6-astra/g]]) {
      const max = capMax(re);
      if (max > 1 && !sequenced)
        problems.push(`${max} ${name} seats in one wave with no sequencing stated, and the cap is one alive at a time: ${seatLines.filter((l) => re.test(l) && isSeat(l)).slice(0, 3).map(quote).join(" ")}`);
      else note(`${name} seats in the plan: ${count && name === "fable" ? count : capMax(re)}${waveCol >= 0 ? `, at most ${max} per ${header[waveCol]}` : sequenced && max > 1 ? ", sequenced by the plan's own words" : ""}`);
    }
  }
  return problems;
}

// A failing case is diagnosed out of its scratch afterwards, so the tree stays and the message says
// where; a passing one has nothing left to read, and a clone of this repository per case would bury the
// plans and reports the artifact directory exists for.
const kept = (dir, why) => `${why}; the scratch is kept for diagnosis: ${path.join(dir, "scratch")}`;
const settle = (dir, problems) => {
  if (problems.length) return kept(dir, problems.join("; "));
  fs.rmSync(path.join(dir, "scratch"), { recursive: true, force: true });
  return true;
};

// --------------------------------------------------------------- the prompts

const SLUG_TASK =
  "/codex-delegate:orchestrate TASK: add a slug(title) helper to lib/slug.mjs that lowercases, trims and "
  + "joins words with hyphens, with a test in test/slug.test.mjs. CHECK: node --test passes. RETURN: the "
  + "files and the test count.";

const DESIGN_TASK =
  "/codex-delegate:orchestrate TASK: compare two ways to give this repository's driver a --dry-run flag "
  + "(parse only versus a fake server turn) and recommend one; do not implement. CHECK: each way is judged "
  + "by a seat that did not propose it. RETURN: the recommendation and the seats' verdicts.";

const TAG_TASK =
  "Use the Agent tool twice, in parallel: one call with model sonnet, one with model opus; each subagent "
  + "must answer with the exact model name its system prompt gives after 'You are powered by the model "
  + "named' and nothing else. Then reply with exactly one JSON object {\"sonnet\": <first answer>, "
  + "\"opus\": <second answer>} and nothing else.";

const COUNT_TASK =
  "Run wc -l on README.md, CHANGELOG.md and RELEASING.md in the current directory yourself, on this thread, "
  + "one command each or one command for all three, and RETURN three lines file: count copied from its "
  + "output.";

// The prompt case 4 used to carry, kept for the probe: it is the invitation, and the invitation is what
// the delegation depends on.
const DELEGATE_TASK =
  "Three independent counts: the number of lines in README.md, CHANGELOG.md and RELEASING.md in the current "
  + "directory. If you can delegate to subagents, run each count in its own subagent. RETURN: three lines, "
  + "file: count.";

const PLAN_TIMEOUT = 10 * 60_000;
const FULL_TIMEOUT = 25 * 60_000;
const DRIVER_TIMEOUT = 15 * 60_000;

// --------------------------------------------------------------- 1

test("plan only under Opus: the first attempt stops at a plan",
  "the mode's one gate is that \"go\" comes before any seat and any write; a coordinator that scouts and then implements has spent the user's approval before offering it, and nothing in the transcript would say so afterwards",
  async () => {
    const dir = caseDir(1, "plan-opus");
    const scratch = scratchClone(dir);
    const head0 = git(scratch, "rev-parse", "HEAD").trim();
    const r = await session({ model: "opus", maxTurns: 60, prompt: SLUG_TASK }, { cwd: scratch, timeoutMs: PLAN_TIMEOUT });
    if (r.killed) await cancelSeats(scratch, dir);
    save(dir, "session.jsonl", r.out);
    save(dir, "stderr.txt", r.err);
    const s = parseStream(r.out);
    save(dir, "plan.txt", s.planText);
    if (!s.init) return kept(dir, `no session started (exit ${r.code}${r.killed ? ", killed at the timeout" : ""}): ${r.err.trim().slice(-400)}`);
    const problems = [];
    const wrong = modelMismatch(s.init, "opus");
    if (wrong) problems.push(wrong);
    if (r.killed) problems.push("the session was killed at the timeout");
    if (!s.planText) problems.push(`the session produced no text (result subtype ${JSON.stringify(s.result?.subtype ?? null)})`);
    problems.push(...planProblems({ text: s.planText, toolUses: s.toolUses, scratch, fable: "none", head0 }));
    return settle(dir, problems);
  });

// --------------------------------------------------------------- 2

test("plan only under Fable: the top pair is capped",
  "under Fable the page's top row holds as written, and its caps are the only thing between a design fan-out and a batch of top-tier seats: at most one Fable seat and one gpt-6-astra seat alive at a time, and the astra seat named at all only proves the session read its own tier",
  async () => {
    const dir = caseDir(2, "plan-fable");
    const scratch = scratchClone(dir);
    const head0 = git(scratch, "rev-parse", "HEAD").trim();
    const r = await session({ model: "fable", maxTurns: 60, prompt: DESIGN_TASK }, { cwd: scratch, timeoutMs: PLAN_TIMEOUT });
    if (r.killed) await cancelSeats(scratch, dir);
    save(dir, "session.jsonl", r.out);
    save(dir, "stderr.txt", r.err);
    const s = parseStream(r.out);
    save(dir, "plan.txt", s.planText);
    // A model this account cannot reach headless is not a defect in the mode, and the CLI rejects it
    // before a session exists. But a missing init line is also what a crash, a bad flag and a killed run
    // look like, so the skip needs the stderr to name THIS model as unavailable; "unknown option" and
    // every other refusal is a failure with its exit code, its killed flag and its stderr attached.
    if (!s.init) {
      const tail = r.err.trim().slice(-300) || "no stderr";
      const unavailable = /fable/i.test(r.err)
        && /not (available|found|supported|allowed)|unavailable|does not exist|invalid model|unknown model/i.test(r.err);
      if (!unavailable)
        return kept(dir, `no session started (exit ${r.code}${r.killed ? ", killed at the timeout" : ""}): ${tail}`);
      skipped.push("2 plan only under Fable: model fable unavailable in headless mode");
      console.log(`SKIP  skipped: model fable unavailable in headless mode (exit ${r.code}): ${tail}`);
      return settle(dir, []);
    }
    const problems = [];
    const wrong = modelMismatch(s.init, "fable");
    if (wrong) problems.push(wrong);
    if (r.killed) problems.push("the session was killed at the timeout");
    if (!s.planText) problems.push(`the session produced no text (result subtype ${JSON.stringify(s.result?.subtype ?? null)})`);
    problems.push(...planProblems({ text: s.planText, toolUses: s.toolUses, scratch, fable: "cap", head0 }));
    // The top Codex seat by name, not by tier table membership: planProblems accepts any of the three
    // slugs, and under Fable the top row is the whole claim.
    if (!lines(s.planText).some((l) => l.includes("gpt-6-astra")))
      problems.push("the plan names no gpt-6-astra seat");
    return settle(dir, problems);
  });

// --------------------------------------------------------------- 3

test("the model tag under Opus reaches the subagent",
  "the page tells the coordinator to tag every Claude Agent call, and the whole tier discipline rests on that tag being obeyed rather than merely accepted: an ignored `model` makes a fan-out planned as cheap run at the session's own tier, and nothing but the subagent's own system prompt can say which it got",
  async () => {
    const dir = caseDir(3, "model-tag");
    const scratch = scratchClone(dir);
    const r = await session({ model: "opus", maxTurns: 10, prompt: TAG_TASK }, { cwd: scratch, timeoutMs: PLAN_TIMEOUT });
    save(dir, "session.jsonl", r.out);
    save(dir, "stderr.txt", r.err);
    const s = parseStream(r.out);
    save(dir, "answer.txt", s.resultText);
    if (!s.init) return kept(dir, `no session started (exit ${r.code}${r.killed ? ", killed at the timeout" : ""}): ${r.err.trim().slice(-400)}`);
    const problems = [];
    const wrong = modelMismatch(s.init, "opus");
    if (wrong) problems.push(wrong);
    const tagged = agentCalls(s.toolUses).map((u) => String(u.input.model ?? "untagged"));
    for (const want of ["sonnet", "opus"])
      if (!tagged.includes(want)) problems.push(`no Agent call carries model ${want}; the calls were tagged: ${tagged.join(", ") || "none"}`);
    const answer = jsonObject(s.resultText);
    if (!answer) problems.push(`the session returned no JSON object: ${JSON.stringify(s.resultText.slice(0, 200))}`);
    // Case-insensitively, because a subagent's own system prompt does not settle on one spelling: measured
    // in one run, the sonnet seat answered "claude-sonnet-4-6" and the opus seat "Opus 4.8". Which tier
    // answered is the question, and both spellings answer it.
    else for (const tag of ["sonnet", "opus"])
      if (!String(answer[tag] ?? "").toLowerCase().includes(tag))
        problems.push(`the ${tag} subagent reports ${JSON.stringify(answer[tag] ?? null)}, which does not name ${tag}`);
    return settle(dir, problems);
  });

function jsonObject(text) {
  const a = text.indexOf("{"), b = text.lastIndexOf("}");
  if (a < 0 || b < a) return null;
  try { return JSON.parse(text.slice(a, b + 1)); } catch { return null; }
}

// --------------------------------------------------------------- 4

test("gpt-6-astra answers on its own thread when not invited to delegate",
  "a Codex seat's evidence is the commands its report lists, and the report describes the thread the driver started: invited to delegate, the top model ran nothing on that thread and answered out of children the report cannot show, so what the page rests on is that a seat asked to do the work itself does it here",
  async () => {
    const dir = caseDir(4, "astra-own-thread");
    const scratch = scratchClone(dir);
    const files = ["README.md", "CHANGELOG.md", "RELEASING.md"];
    const expected = Object.fromEntries(files.map((f) => [f, wcL(path.join(scratch, f))]));
    // No --effort: the page sends no EFFORT: line, so the seat inherits the configured effort and this is
    // the seat the page describes. What the server selected is noted beside the case, never asserted.
    const base = ["--level", "read", "--cwd", scratch, "--model", "gpt-6-astra"];
    // A release gate leaves no job record on the machine it runs on: --help-all documents
    // CODEX_DELEGATE_STATE_DIR as where everything the driver owns lives, and it must be absolute.
    const env = { ...process.env, CODEX_DELEGATE_STATE_DIR: path.join(dir, "state") };

    const r = await runProc(process.execPath, [DRIVER, ...base, "--prompt", COUNT_TASK], { timeoutMs: DRIVER_TIMEOUT, env });
    if (r.killed) await cancelSeats(scratch, dir, env);
    save(dir, "report.json", r.out);
    save(dir, "stderr.txt", r.err);
    let report = null;
    try { report = JSON.parse(r.out); } catch {}
    if (!report) return kept(dir, `the driver printed no JSON report (exit ${r.code}${r.killed ? ", killed at the timeout" : ""}): ${r.err.trim().slice(-400)}`);
    const problems = [];
    // Exit 0 is the driver's own verdict that the turn completed and passed its gates. Exit 5, "no command
    // ran", is what the delegating turn came back with, answer and all, and it is this case's failure.
    if (r.code !== 0) problems.push(`the driver exited ${r.code} (turnStatus ${JSON.stringify(report.turnStatus ?? null)}): ${r.err.trim().slice(-200)}`);
    // Which seat answered, before anything is concluded about it: a run that fell back to the config
    // default would answer this prompt just as well, at another model.
    if (report.model !== "gpt-6-astra") problems.push(`the report's model is ${JSON.stringify(report.model)}, not gpt-6-astra`);
    const commands = Array.isArray(report.commands) ? report.commands : [];
    if (!commands.length) problems.push("the report lists no command, so nothing ran on the thread that answered");
    // The counters, not subagentThreads: on 0.153.4 a Codex child thread never registers as one, and
    // these are what the delegating run showed instead ({subAgentActivity: 6, collabAgentToolCall: 2}).
    const others = report.otherItemCounts ?? {};
    for (const k of ["subAgentActivity", "collabAgentToolCall"])
      if (others[k]) problems.push(`the seat delegated: otherItemCounts.${k} is ${JSON.stringify(others[k])}`);
    // The prompt asks for "file: count", so each count is checked against the line that names its file:
    // three bare numbers somewhere in the answer would also match three wrong attributions.
    const answer = String(report.answer ?? "");
    for (const f of files) {
      const line = answer.split("\n").find((l) => l.includes(f));
      if (!line) problems.push(`the answer never names ${f}`);
      else if (!new RegExp(`\\b${expected[f]}\\b`).test(line))
        problems.push(`${f}: wc -l says ${expected[f]}, the answer says ${JSON.stringify(line.trim().slice(0, 80))}`);
    }
    if (!problems.length)
      note(`${commands.length} command(s) on the root thread, reasoningEffort ${JSON.stringify(report.reasoningEffort ?? null)}, exit ${r.code}`);

    // Informational, and a second Codex turn: the inviting prompt is how the delegation was measured, and
    // this probe is what re-measures it after a codex upgrade. Whether the model delegates is the model's
    // business and no verdict of this suite, so the only assertion is that a report came back to read.
    if (!DELEGATE_PROBE) note("delegation probe: NOT RUN");
    else {
      const p = await runProc(process.execPath, [DRIVER, ...base, "--prompt", DELEGATE_TASK], { timeoutMs: DRIVER_TIMEOUT, env });
      if (p.killed) await cancelSeats(scratch, dir, env);
      save(dir, "delegate.report.json", p.out);
      save(dir, "delegate.stderr.txt", p.err);
      let pr = null;
      try { pr = JSON.parse(p.out); } catch {}
      if (!pr) problems.push(`the delegation probe printed no JSON report (exit ${p.code}): ${p.err.trim().slice(-300)}`);
      else note(`delegation probe: exit ${p.code}, ${(pr.commands ?? []).length} command(s), otherItemCounts `
        + `${JSON.stringify(pr.otherItemCounts ?? null)}, subagentThreads ${JSON.stringify(pr.subagentThreads ?? null)}`);
    }
    return settle(dir, problems);
  });

// --------------------------------------------------------------- 5

function tinyProject(dir) {
  const s = path.join(dir, "scratch");
  fs.mkdirSync(path.join(s, "lib"), { recursive: true });
  fs.mkdirSync(path.join(s, "test"), { recursive: true });
  fs.writeFileSync(path.join(s, "package.json"),
    `${JSON.stringify({ name: "scratch", type: "module", private: true, scripts: { test: "node --test" } }, null, 2)}\n`);
  fs.writeFileSync(path.join(s, "lib", "greet.mjs"), "export const greet = (name) => `hello, ${name}`;\n");
  fs.writeFileSync(path.join(s, "test", "greet.test.mjs"),
    "import assert from \"node:assert/strict\";\nimport test from \"node:test\";\nimport { greet } from \"../lib/greet.mjs\";\n\n"
    + "test(\"greet names its argument\", () => {\n  assert.equal(greet(\"world\"), \"hello, world\");\n});\n");
  // An identity on the command line, not from the caller's config: a machine without user.email would
  // otherwise fail the commit and report as a mode defect.
  const id = ["-c", "user.name=orchestrate-live", "-c", "user.email=orchestrate-live@example.invalid"];
  for (const args of [["-c", "init.defaultBranch=main", "init", "-q"], ["add", "-A"], [...id, "commit", "-q", "-m", "initial"]]) {
    const r = spawnSync("git", args, { cwd: s, encoding: "utf8" });
    if (r.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${(r.stderr ?? "").trim().slice(0, 240)}`);
  }
  return s;
}

test("the full run under Opus: plan, go, run",
  "everything above stops before the seats, and the promises that cost money are all on the other side of \"go\": the run directory that ignores itself, a Codex seat that actually ran, every Claude seat tagged, and a live tree that gains files but not a commit",
  async () => {
    const dir = caseDir(5, "full-run");
    const scratch = tinyProject(dir);
    // The commit the scratch starts on, read before the plan turn: the count alone is also satisfied by a
    // run that committed and then reset to one commit of its own.
    const head0 = git(scratch, "rev-parse", "HEAD").trim();
    const sessionId = crypto.randomUUID();

    // The two turns are one session, so --no-session-persistence is dropped for both: it is the flag that
    // makes a session unresumable, and --resume is the whole point of turn 2.
    const t1 = await session({ model: "opus", maxTurns: 60, prompt: SLUG_TASK, sessionId, resumable: true },
      { cwd: scratch, timeoutMs: PLAN_TIMEOUT });
    if (t1.killed) await cancelSeats(scratch, dir);
    save(dir, "turn1.jsonl", t1.out);
    save(dir, "turn1.stderr.txt", t1.err);
    const s1 = parseStream(t1.out);
    save(dir, "plan.txt", s1.planText);
    if (!s1.init) return kept(dir, `turn 1 started no session (exit ${t1.code}${t1.killed ? ", killed at the timeout" : ""}): ${t1.err.trim().slice(-400)}`);
    const problems = [];
    const wrong = modelMismatch(s1.init, "opus");
    if (wrong) problems.push(wrong);
    if (t1.killed) problems.push("turn 1 was killed at the timeout");
    // The whole plan, not only the stop: this is the turn whose plan the run then executes, and a plan
    // that named no seat would make everything measured after "go" a measurement of something else.
    problems.push(...planProblems({ text: s1.planText, toolUses: s1.toolUses, scratch, fable: "none", head0 })
      .map((p) => `turn 1: ${p}`));
    if (problems.length) return settle(dir, problems);

    const t2 = await session({ model: "opus", maxTurns: 400, prompt: "go", resume: sessionId, resumable: true },
      { cwd: scratch, timeoutMs: FULL_TIMEOUT });
    if (t2.killed) { await cancelSeats(scratch, dir); problems.push("turn 2 was killed at the timeout"); }
    save(dir, "turn2.jsonl", t2.out);
    save(dir, "turn2.stderr.txt", t2.err);
    const s2 = parseStream(t2.out);
    save(dir, "report.txt", s2.planText);
    if (!s2.msgs.length) return kept(dir, `turn 2 produced no stream (exit ${t2.code}${t2.killed ? ", killed at the timeout" : ""}): ${t2.err.trim().slice(-400)}`);

    const dirs = runDirs(scratch);
    if (!dirs.length) problems.push("no `.orchestrate/<run>/` was created");
    for (const d of dirs) {
      const p = path.join(d, ".gitignore");
      if (!fs.existsSync(p)) { problems.push(`${path.basename(d)} has no .gitignore`); continue; }
      const body = fs.readFileSync(p, "utf8");
      // "*" and nothing else: an ignore file that does not ignore itself leaves the run's artifacts, and
      // itself, in the `git status` of the tree the run was made in.
      if (body !== "*" && body !== "*\n") problems.push(`${path.basename(d)}/.gitignore is ${JSON.stringify(body)}, not "*"`);
    }

    const commits = git(scratch, "log", "--format=%H").trim().split("\n").filter(Boolean);
    if (commits.length !== 1) problems.push(`${commits.length} commits in the scratch, not the one it started with`);
    const head1 = git(scratch, "rev-parse", "HEAD").trim();
    if (head1 !== head0)
      problems.push(`HEAD moved from ${head0.slice(0, 12)} to ${head1.slice(0, 12) || "nothing"}, so the run committed`);
    if (!git(scratch, "status", "--porcelain").trim()) problems.push("the live tree is unchanged, so nothing was implemented");
    for (const f of ["lib/slug.mjs", "test/slug.test.mjs"])
      if (!fs.existsSync(path.join(scratch, f))) problems.push(`${f} was never written`);

    // Two files existing is not the CHECK line the prompt carried. The count separates a suite that grew
    // a case from one whose new file was never picked up, and the import answers for the one behaviour
    // the prompt named, against a test the seat did not write.
    // The tap reporter by name, not by default: measured on Node 24.11, a piped `node --test` still gets
    // the spec reporter, whose summary reads `pass 2` behind a glyph. `# pass N` is the line parsed here.
    const nodeTest = await runProc(process.execPath, ["--test", "--test-reporter=tap"], { cwd: scratch, timeoutMs: 2 * 60_000 });
    save(dir, "node-test.txt", `${nodeTest.out}\n${nodeTest.err}`);
    const passed = nodeTest.out.match(/^# pass (\d+)/m);
    if (nodeTest.code !== 0)
      problems.push(`node --test in the scratch exited ${nodeTest.code}${nodeTest.killed ? ", killed at the timeout" : ""}: ${(nodeTest.err.trim() || nodeTest.out.trim()).slice(-300)}`);
    else if (!passed) problems.push(`node --test printed no "# pass" line: ${nodeTest.out.trim().slice(-200)}`);
    else if (Number(passed[1]) < 2) problems.push(`node --test passes ${passed[1]} case(s), and greet plus slug is two`);
    try {
      const mod = await import(pathToFileURL(path.join(scratch, "lib", "slug.mjs")).href);
      const slug = mod.slug ?? mod.default;
      if (typeof slug !== "function") problems.push(`lib/slug.mjs exports no slug function: ${JSON.stringify(Object.keys(mod))}`);
      else if (slug("  Hello World ") !== "hello-world")
        problems.push(`slug("  Hello World ") returned ${JSON.stringify(slug("  Hello World "))}, not "hello-world"`);
    } catch (e) { problems.push(`lib/slug.mjs does not import: ${e.message}`); }

    const untagged = agentCalls(s2.toolUses)
      .filter((u) => !CODEX_SEATS.includes(String(u.input.subagent_type ?? "")))
      .filter((u) => !["opus", "sonnet"].includes(String(u.input.model ?? "")));
    if (untagged.length)
      problems.push(`${untagged.length} Claude Agent call(s) carry no opus/sonnet tag: ${untagged.map((u) => `${u.input.subagent_type ?? "?"}=${JSON.stringify(u.input.model ?? null)}`).join(", ")}`);

    // A Workflow spawns its seats from inside its script, and those calls are never re-emitted as Agent
    // blocks: the check above sees a run whose whole fan-out is one Workflow as fully tagged.
    const inScript = workflowCalls(s2.toolUses).flatMap((u) => untaggedAgentCalls(scriptSource(u)));
    if (inScript.length)
      problems.push(`${inScript.length} agent() call(s) in a Workflow script carry neither agentType nor a model: ${inScript.join(" | ")}`);

    const fabled = workflowCalls(s2.toolUses).filter((u) => /fable/i.test(scriptText(u)));
    if (fabled.length) problems.push(`${fabled.length} Workflow script(s) name fable`);

    const seatByAgent = agentCalls(s2.toolUses).filter((u) => CODEX_SEATS.includes(String(u.input.subagent_type ?? "")));
    const seatByScript = workflowCalls(s2.toolUses).filter((u) => {
      const t = scriptText(u);
      return t.includes("agentType") && /codex-seat/.test(t);
    });
    if (!seatByAgent.length && !seatByScript.length)
      problems.push(`no Codex seat ran: ${agentCalls(s2.toolUses).length} Agent call(s), ${workflowCalls(s2.toolUses).length} Workflow call(s)`);

    const jobs = await runProc(process.execPath, [DRIVER, "--jobs", "--cwd", scratch], { timeoutMs: 60_000 });
    save(dir, "jobs.json", jobs.out);
    let records = null;
    try { records = JSON.parse(jobs.out); } catch {}
    if (!Array.isArray(records)) problems.push(`--jobs printed no array (exit ${jobs.code}): ${jobs.err.trim().slice(-200)}`);
    else {
      // A seat that RAN: a tier model and a completed turn. The exit code may be a gate verdict (a
      // reviewer whose grep found nothing exits 11 with its answer), so it is recorded, not required.
      const seen = [], ran = [];
      for (const rec of records) {
        if (!rec.reportPath) continue;
        try {
          const rep = JSON.parse(fs.readFileSync(rec.reportPath, "utf8"));
          seen.push(`${rep.model ?? null}:${rep.turnStatus ?? null}:${rep.exitCode ?? null}`);
          if (CODEX_MODELS.includes(rep.model) && rep.turnStatus === "completed") ran.push(rep.model);
        } catch { seen.push("unreadable"); }
      }
      save(dir, "job-models.txt", `${seen.join("\n")}\n`);
      if (!ran.length)
        problems.push(`${records.length} run(s) in the registry for this directory, none a completed turn on a tier model (model:turnStatus:exitCode): ${JSON.stringify(seen)}`);
    }

    if (!/\bCodex\b/.test(s2.planText)) problems.push("the final report never names the composition that ran");
    return settle(dir, problems);
  });

// --------------------------------------------------------------- the gate

function selected() {
  const i = process.argv.indexOf("--only");
  if (i < 0) return CASES;
  const want = new Set((process.argv[i + 1] ?? "").split(",").map((n) => Number.parseInt(n.trim(), 10)));
  const picked = CASES.filter((_, n) => want.has(n + 1));
  if (!picked.length) {
    console.log(`--only ${process.argv[i + 1]} selected no case; they are numbered 1 to ${CASES.length}`);
    process.exit(2);
  }
  return picked;
}

if (process.env.CODEX_DELEGATE_LIVE_ORCHESTRATE !== "1") {
  console.log("live orchestrate gate: NOT RUN — set CODEX_DELEGATE_LIVE_ORCHESTRATE=1 to spend real sessions on the orchestrate mode");
  process.exit(0);
}

const cases = selected();
fs.mkdirSync(ART, { recursive: true });
const failed = await runCases(cases);
// A skipped case is not a pass: it leaves the denominator, it is named, and the exit is non-zero,
// because the hypothesis it carries went unmeasured and RELEASING treats that as a blocker.
const code = summarize(failed, cases.length - skipped.length);
if (skipped.length) console.log(`${skipped.length} skipped, not passed: ${skipped.join("; ")}`);
console.log(`artifacts: ${ART}`);
process.exit(code || (skipped.length ? 1 : 0));
