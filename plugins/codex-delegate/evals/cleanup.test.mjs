#!/usr/bin/env node
// The suite for scripts/cleanup.mjs — the script behind /codex-delegate:cleanup.
//
// The script inventories what this plugin leaves behind, says which of it can go, and removes only the
// rows the user picks BY NUMBER against the snapshot `--list --json` wrote. Four kinds can be removed —
// an orchestrate run, a seat's scratch, the eval suites' scratch, a saved test conversation — and four
// are reported and never removed: a managed worktree, a lock, the shared Codex home, another data
// directory of this plugin. A row is `removable` or `kept`, and there is no third value. These cases pin
// that contract, one case per rule a wrong implementation could break.
//
//   node evals/cleanup.test.mjs
//
// Nothing here can reach the caller's own data. Every invocation points HOME, CLAUDE_CONFIG_DIR, TMPDIR
// and CODEX_DELEGATE_STATE_DIR into a scratch world under one harness temp directory, unsets
// CLAUDE_PLUGIN_DATA so no fallback can reach ~/.claude/plugins/data, and takes its process listing from
// the CODEX_DELEGATE_CLEANUP_PS seam rather than the machine's process table. need() then asserts, on EVERY
// listing, that each root the script resolved and each path it printed lies inside that world — so a
// script that reached the real ~/.claude/projects, $TMPDIR/codex-seat.* or ~/.codex fails the case that
// saw it rather than quietly deleting the owner's work.
//
// A case that needs a DEAD process kills its child and awaits the child's `exit` event: between kill(2)
// and the parent's reap the pid is a zombie, and kill(pid, 0) still succeeds for it — a case that only
// called kill() would assert "gone" against a pid the script correctly reads as alive.

import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { EXIT, PINNED_CODEX, SCRIPTS, registry, runCases, skip, spawnNode, summarize,
         tempDir } from "./lib/harness.mjs";
// A NAMESPACE import, not named bindings: the liveness helpers are the driver's, and a named import of
// one it stops exporting would fail at load and report nothing at all rather than failing case by case.
import * as driver from "../skills/seat/scripts/driver.mjs";

const CLEANUP = path.join(SCRIPTS, "cleanup.mjs");
// The ladder the contract names: 0 everything went, 10 something was refused and untouched, 1 a removal
// was attempted and failed, 2 bad arguments or no state directory.
const REFUSED = EXIT.BUSY, FAILED = EXIT.TURN_NOT_COMPLETED, USAGE = EXIT.USAGE;
// A pid that is legal, in range, and not in use. The lock suite uses the same one.
const DEAD_PID = 2147483646;
const DEAD_IDENTITY = "lstart:Thu Jan  1 00:00:00 1970";
const processIdentity = typeof driver.processIdentity === "function" ? driver.processIdentity : () => null;

// One tree for every world. Canonicalised once, so a fixture path and the path the script prints are
// the same string on a machine where /var is a link to /private/var.
const BASE = fs.realpathSync(tempDir("codex-cleanup-"));
const inside = (p) => typeof p === "string" && (p === BASE || p.startsWith(BASE + path.sep));
let worldSeq = 0;

const slugOf = (dir) => dir.replace(/[^A-Za-z0-9]/g, "-");

// A world is one scratch <state>, <tmp>, <config> (hence <data> and <projects>), one HOME, one project
// directory and one "outside" directory standing for everything the cleanup must never reach.
function makeWorld(name) {
  const root = path.join(BASE, `${String(++worldSeq).padStart(2, "0")}-${name}`);
  const w = { root, state: path.join(root, "state"), tmp: path.join(root, "tmp"),
              config: path.join(root, "config"), home: path.join(root, "home"),
              project: path.join(root, "cleanupproj"), outside: path.join(root, "outside"),
              ps: path.join(root, "ps.txt") };
  w.data = path.join(w.config, "plugins", "data");
  w.projects = path.join(w.config, "projects");
  for (const d of [w.state, w.tmp, w.data, w.projects, w.home, w.project, w.outside])
    fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(w.ps, "");
  w.slug = slugOf(w.project);
  return w;
}

// Children whose liveness a case asserts on. Killed at the end of the suite as well as by their own
// case, so a case that fails early cannot leave one running.
const kids = [];
function liveChild() {
  const c = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { stdio: "ignore" });
  kids.push(c);
  return c;
}
async function stopChild(c) {
  if (c.exitCode !== null || c.signalCode !== null) return;
  const ended = new Promise((resolve) => c.once("exit", resolve));
  try { c.kill("SIGKILL"); } catch { /* already gone */ }
  await ended;
}

// Every run of the script. A missing cleanup.mjs THROWS rather than skipping: runCases turns a throw into
// a failed case with its message, so an unwritten script reads as a wall of failures naming the file,
// which is what it is — never as a green suite that measured nothing.
function runCleanup(w, args, { cwd, env = {}, unsetEnv = [], killAfterMs = 120_000 } = {}) {
  if (!fs.existsSync(CLEANUP)) throw new Error(`${CLEANUP} does not exist yet`);
  const base = { HOME: w.home, CLAUDE_CONFIG_DIR: w.config, TMPDIR: w.tmp,
                 CODEX_DELEGATE_STATE_DIR: w.state, CODEX_DELEGATE_CLEANUP_PS: w.ps };
  // A variable the case names itself is the case's to set or to unset; the rest are pointed at the world.
  const unset = ["CLAUDE_PLUGIN_DATA", ...unsetEnv].filter((k) => !(k in env));
  return spawnNode([CLEANUP, ...args], { cwd: cwd ?? w.project, env: { ...base, ...env },
                                       unsetEnv: unset, killAfterMs }).done;
}
const mkfifo = (p) => spawnSync("mkfifo", [p]).status === 0;
const parse = (text) => { try { return JSON.parse(text); } catch { return null; } };
async function list(w, opts) {
  const r = await runCleanup(w, ["--list", "--json"], opts);
  return { ...r, j: parse(r.out) };
}
let snapSeq = 0;
// The snapshot the user consented on, written exactly as --list --json printed it, because that file IS
// the protocol: --delete takes the numbers and this file and nothing else.
async function snapshot(w, opts) {
  const r = await list(w, opts);
  const file = path.join(w.root, `listing-${++snapSeq}.json`);
  fs.writeFileSync(file, r.out ?? "");
  return { ...r, file };
}
const pick = (w, file, numbers, opts) =>
  runCleanup(w, ["--delete", "--from", file, ...numbers.map(String)], opts);

// What every listing must be true of, asserted on every listing every case takes: the world it stayed
// inside, the two statuses, the numbering, and the two sets agreeing with the rows' own flags.
function need(w, r) {
  if (r.code !== 0) return `--list --json exited ${r.code}: ${(r.err || r.out).trim().slice(0, 300)}`;
  if (!r.j || !Array.isArray(r.j.rows)) return `--list --json printed no rows array: ${(r.out || r.err).trim().slice(0, 300)}`;
  const bad = [];
  for (const [name, v] of Object.entries(r.j.roots ?? {}))
    if (typeof v === "string" && v.startsWith("/") && !inside(v))
      bad.push(`the root ${name} is outside this case's world: ${v}`);
  for (const row of r.j.rows) {
    if (row.status !== "removable" && row.status !== "kept")
      bad.push(`row ${row.n} has a third status: ${JSON.stringify(row.status)}`);
    if (!Array.isArray(row.paths) || row.paths.length === 0)
      bad.push(`row ${row.n} carries no paths: ${JSON.stringify(row.paths)}`);
    for (const p of row.paths ?? []) if (!inside(p)) bad.push(`row ${row.n} names ${p}, outside this case's world`);
    if (row.proposed && !row.selectable) bad.push(`row ${row.n} is proposed and not selectable`);
    if ((row.proposed || row.selectable) && row.status !== "removable")
      bad.push(`row ${row.n} is offered while ${JSON.stringify(row.status)}`);
  }
  const ns = r.j.rows.map((row) => row.n);
  if (JSON.stringify(ns) !== JSON.stringify(ns.map((_, i) => i + 1)))
    bad.push(`the rows are not numbered 1..n: ${JSON.stringify(ns)}`);
  for (const key of ["proposed", "selectable"]) {
    const flagged = r.j.rows.filter((row) => row[key]).map((row) => row.n);
    if (JSON.stringify([...(r.j[key] ?? [])].sort((a, b) => a - b)) !== JSON.stringify(flagged))
      bad.push(`${key} ${JSON.stringify(r.j[key])} disagrees with the rows' own flags ${JSON.stringify(flagged)}`);
  }
  for (const e of r.j.manual ?? [])
    for (const token of String(e.command ?? "").match(/\/[^\s'"]+/g) ?? [])
      if (!inside(token) && !/^\/(bin|sbin|usr)\//.test(token))
        bad.push(`a manual command names ${token}, outside this case's world`);
  return bad.length ? bad.join("; ") : null;
}

const rowAt = (j, p) => (j.rows ?? []).find((row) => (row.paths ?? []).includes(p)) ?? null;
// A line a case prints beside its verdict: what the platform did, where the platform is the thing
// under measurement and a pass alone would not say which way it went.
const note = (line) => console.log(`      ${line}`);
// For the four kinds that are only ever reported, whose row may reasonably name the record, the
// directory holding it or the tree it describes: any of the three answers the question this suite asks
// of them, which is that they are shown and never offered.
const rowNear = (j, p) => (j.rows ?? []).find((row) => (row.paths ?? []).some(
  (q) => q === p || p.startsWith(q + path.sep) || q.startsWith(p + path.sep))) ?? null;
const kindRows = (j, kind) => (j.rows ?? []).filter((row) => row.kind === kind);
// Everything a number consents to, and which of it moved between the listing and the yes. Every field
// the row carries is compared, not a list this suite keeps: a field the listing grows later is one more
// thing the user was shown, and a case that changes one field asserts this list is exactly that field —
// otherwise it measures several rules at once and an implementation that checks any one of them passes.
// `n` is the row's place in a listing that may have renumbered, and `reason` is prose about the others.
const NOT_CONSENT = new Set(["n", "reason"]);
function differing(before, now) {
  if (!now) return ["the row itself"];
  const keys = [...new Set([...Object.keys(before), ...Object.keys(now)])].filter((k) => !NOT_CONSENT.has(k));
  const same = (a, b) => JSON.stringify(Array.isArray(a) ? [...a].sort() : a)
                      === JSON.stringify(Array.isArray(b) ? [...b].sort() : b);
  return keys.filter((k) => !same(before[k], now[k])).sort();
}
// What a failure message prints instead of the whole object: enough to see which row went wrong.
const shown = (j) => (j?.rows ?? []).map((row) =>
  `${row.n} ${row.kind} ${row.status}${row.proposed ? " proposed" : row.selectable ? " selectable" : ""} ${JSON.stringify(row.name)}`).join(" | ");

// A case reports every miss it found, not just the first: a status that is right and a set that is wrong
// are two different defects, and naming one hides the other.
function misses() {
  const out = [];
  return {
    ok: (cond, msg) => { if (!cond) out.push(msg); },
    eq: (got, want, what) => { if (got !== want) out.push(`${what}: expected ${JSON.stringify(want)}, got ${JSON.stringify(got)}`); },
    has: (text, needle, what) => { if (!String(text ?? "").includes(needle)) out.push(`${what}: ${JSON.stringify(needle)} is not in ${JSON.stringify(String(text ?? "").slice(0, 200))}`); },
    re: (text, rx, what) => { if (!rx.test(String(text ?? ""))) out.push(`${what}: ${rx} does not match ${JSON.stringify(String(text ?? "").slice(0, 200))}`); },
    done: () => (out.length ? out.join("; ") : true),
  };
}

// Fixtures.
const report = (cwd) => ({ ok: true, exitCode: 0, threadId: "th-1", turnStatus: "completed",
                           answer: "done", cwd, driverVersion: "0.11.1", codexVersionPinned: PINNED_CODEX });
function plantRun(w, slug, run, seats) {
  const d = path.join(w.state, "orchestrate", slug, run);
  fs.mkdirSync(d, { recursive: true });
  for (const [seat, body] of Object.entries(seats)) {
    fs.mkdirSync(path.join(d, seat), { recursive: true });
    // A seat directory with no report.json is the driver's admission marker: the run is unfinished.
    if (body) fs.writeFileSync(path.join(d, seat, "report.json"),
      typeof body === "string" ? body : JSON.stringify(body, null, 2) + "\n");
  }
  return d;
}
const reportPathIn = (runDir, seat) => path.join(runDir, seat, "report.json");
function plantSeat(w, dirname, { pid, identity, reportPath, line } = {}) {
  const d = path.join(w.tmp, dirname);
  fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(path.join(d, "prompt.txt"), "prompt\n");
  fs.writeFileSync(path.join(d, "out.json"), "{}\n");
  fs.writeFileSync(path.join(d, "err.txt"), line !== undefined ? line
    : `codex-delegate: pid=${pid} identity=${identity} reportPath=${reportPath}\n`);
  return d;
}
function plantEval(w, dirname, { file = "scratch.txt", body = "left behind\n" } = {}) {
  const d = path.join(w.tmp, dirname);
  fs.mkdirSync(path.join(d, "case-state", "0"), { recursive: true });
  fs.writeFileSync(path.join(d, "case-state", "0", file), body);
  return d;
}
// A saved conversation of the tests: the directory name is the slug of a path under <tmp>, and it says
// which suite it belongs to.
// The conversation a session under `where` left behind. `scratch` also plants the directory the name
// spells: the suites remove theirs when they end, so the usual case is a name whose directory is gone,
// and both must read the same to this tool.
function plantSession(w, where, { scratch = false } = {}) {
  const target = path.join(w.tmp, where);
  if (scratch) fs.mkdirSync(target, { recursive: true });
  const d = path.join(w.projects, slugOf(target));
  fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(path.join(d, "0f0f0f0f-0000-0000-0000-000000000000.jsonl"), "{}\n");
  return d;
}
// What the live suite itself writes, read off evals/orchestrate-live.test.mjs rather than guessed:
// `$TMPDIR/orchestrate-live-<ISO stamp with : and . as ->/<n>-<case>/scratch`.
const liveScratch = (stamp, tail) => path.join(`orchestrate-live-${stamp}`, tail, "scratch");
let jobSeq = 0;
function plantJob(w, record) {
  const d = path.join(w.state, "jobs");
  fs.mkdirSync(d, { recursive: true });
  const p = path.join(d, `th-${++jobSeq}.json`);
  fs.writeFileSync(p, JSON.stringify({ threadId: `th-${jobSeq}`, started: "2026-09-01T00:00:00.000Z", ...record }));
  return p;
}
// The four kinds that are only ever reported, planted together: the row is the whole of what they get.
function plantReported(w, { dataId = "codex-delegate-other" } = {}) {
  const lock = path.join(w.state, "locks", `${"ab".repeat(32)}.lock`);
  fs.mkdirSync(path.dirname(lock), { recursive: true });
  fs.writeFileSync(lock, JSON.stringify({ pid: DEAD_PID, identity: DEAD_IDENTITY, cwd: w.project,
                                          started: "2026-09-01T00:00:00.000Z" }));
  const tree = path.join(w.project, ".claude", "worktrees", "codex-abcabc-12345678");
  fs.mkdirSync(tree, { recursive: true });
  fs.writeFileSync(path.join(tree, "seed"), "seed\n");
  const ledger = path.join(w.state, "worktrees", "codex-abcabc-12345678.json");
  fs.mkdirSync(path.dirname(ledger), { recursive: true });
  fs.writeFileSync(ledger, JSON.stringify({ path: tree, repo: w.project, pid: DEAD_PID,
                                            identity: DEAD_IDENTITY, started: "2026-09-01T00:00:00.000Z" }));
  const home = path.join(w.state, "home");
  fs.mkdirSync(home, { recursive: true });
  fs.writeFileSync(path.join(home, "config.toml"), "# codex\n");
  const datadir = path.join(w.data, dataId);
  fs.mkdirSync(path.join(datadir, "jobs"), { recursive: true });
  fs.writeFileSync(path.join(datadir, "jobs", "th-old.json"),
    JSON.stringify({ threadId: "th-old", pid: DEAD_PID, identity: DEAD_IDENTITY, cwd: "/nowhere",
                     started: "2026-09-01T00:00:00.000Z", endedAt: "2026-09-01T00:01:00.000Z", exitCode: 0 }));
  return { lock, ledger, tree, home, datadir };
}
// The driver's own subdirectories, which are never listed and never removed.
function plantDriverState(w) {
  const made = {};
  for (const name of ["answers", "jobs", "tmp", "pasted"]) {
    const d = path.join(w.state, name);
    fs.mkdirSync(d, { recursive: true });
    const f = path.join(d, "keep.txt");
    fs.writeFileSync(f, "the driver's own\n");
    made[name] = f;
  }
  return made;
}
// The ps seam takes what `ps -axo pid=,command=` prints, padding included.
const psLines = (w, lines) => fs.writeFileSync(w.ps, lines.map((l) => ` ${l}`).join("\n") + (lines.length ? "\n" : ""));
const suiteLine = (pid, name) => `${pid} node /somewhere/evals/${name}`;
// A count in prose may be a digit or the word for it; both say the same number.
const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const saysNumber = (text, n) => new RegExp(`\\b(${n}${WORDS[n] ? `|${WORDS[n]}` : ""})\\b`, "i").test(String(text ?? ""));

// Everything under a directory by relative path, links listed and never followed: what a case compares
// before and after when it has to say that nothing ELSE moved.
function treeOf(root) {
  const out = [];
  const walk = (dir) => {
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = path.join(dir, e.name);
      out.push(path.relative(root, p));
      if (e.isDirectory()) walk(p);
    }
  };
  walk(root);
  return out.sort();
}

// The lines after the last row and its wrapped reason: what the listing says about the whole of it.
function closing(text, rows) {
  const lines = String(text ?? "").split("\n");
  const at = (rows ?? []).map((row) => lines.findIndex((l) => new RegExp(`^\\s*${row.n} {2}\\S`).test(l)))
    .filter((i) => i >= 0);
  const last = at.length ? Math.max(...at) : -1;
  const blank = lines.findIndex((l, i) => i > last + 2 && l.trim() === "");
  return lines.slice(blank < 0 ? last + 3 : blank + 1).join("\n");
}
// A permission denial only means something where it is enforced; under a root uid it is not.
function denied(p) {
  try { fs.chmodSync(p, 0o000); } catch { return false; }
  try {
    if (fs.statSync(p).isDirectory()) fs.readdirSync(p); else fs.readFileSync(p);
    return false;
  } catch { return true; }
}

const { cases: CASES, test } = registry();

test("the script this suite measures exists where the recipe names it",
  "every other case throws on a missing cleanup.mjs, which reads as a wall of failures; this one says the single fact behind them in one line",
  async () => (fs.existsSync(CLEANUP) ? true : `${CLEANUP} does not exist`));

test("1 · a seat's line parses whole: running it is kept, gone it is suggested",
  "the identity holds spaces on macOS and a run name may hold them too; a parser that splits the line on whitespace loses the report path and with it the project, and the scratch of a RUNNING seat then reads as something to suggest",
  async () => {
    const w = makeWorld("live-seat");
    const c = liveChild();
    const identity = processIdentity(c.pid);
    if (identity === null) { await stopChild(c); return skip("this machine does not report a process identity"); }
    if (!/\s/.test(identity)) { await stopChild(c); return skip(`the identity here holds no space: ${identity}`); }
    const run = plantRun(w, w.slug, "a run with spaces", { "u1-astra": report(w.project) });
    const seat = plantSeat(w, "codex-seat.AAAAAAAA",
      { pid: c.pid, identity, reportPath: reportPathIn(run, "u1-astra") });
    const m = misses();
    let r = await list(w);
    let bad = need(w, r); if (bad) { await stopChild(c); return bad; }
    let row = rowAt(r.j, seat);
    m.ok(row, `no row names the seat directory: ${shown(r.j)}`);
    if (row) {
      m.eq(row.kind, "seat", "kind");
      m.eq(row.status, "kept", "the status of a seat whose process is running");
      m.eq(row.proposed, false, "proposed while its process runs");
      m.has(row.name, "u1-astra", "the seat's name, which comes from the report path its line carries");
      m.has(row.name, path.basename(w.project), "the seat's name does not name its project");
    }
    await stopChild(c);
    r = await list(w);
    bad = need(w, r); if (bad) return bad;
    row = rowAt(r.j, seat);
    m.ok(row, `the seat row vanished once its process exited: ${shown(r.j)}`);
    if (row) {
      m.eq(row.status, "removable", "the status of a seat whose process has gone");
      m.eq(row.proposed, true, "a finished seat of this project is suggested");
    }
    return m.done();
  });

test("2 · a recycled pid is not that seat: a live pid whose recorded identity differs is gone",
  "pids are recycled; liveness that asks only kill(pid, 0) keeps a dead seat's scratch for as long as some unrelated process holds the number",
  async () => {
    const w = makeWorld("recycled-pid");
    if (processIdentity(process.pid) === null) return skip("this machine does not report a process identity");
    const run = plantRun(w, w.slug, "run-1", { A: report(w.project) });
    const seat = plantSeat(w, "codex-seat.BBBBBBBB",
      { pid: process.pid, identity: DEAD_IDENTITY, reportPath: reportPathIn(run, "A") });
    const r = await list(w);
    const bad = need(w, r); if (bad) return bad;
    const m = misses();
    const row = rowAt(r.j, seat);
    m.ok(row, `no row names the seat directory: ${shown(r.j)}`);
    if (row) {
      m.eq(row.status, "removable", "the status of a seat whose pid is live but whose identity is another process's");
      m.eq(row.proposed, true, "proposed");
    }
    return m.done();
  });

test("3 · a run with a seat that has not reported is kept; a finished one is offered by number, never suggested",
  "the driver makes a seat's directory at admission, so a seat with no report is one that has not returned yet, and the seats finishing is not the orchestration finishing: a coordinator can resume into the same directory between batches",
  async () => {
    const w = makeWorld("run-lifecycle");
    const run = plantRun(w, w.slug, "review-2026-09-08", { A: null, B: report(w.project) });
    // One more row, so that "the fresh listing minus what went" is a listing with something in it.
    plantEval(w, "codex-lock-STAYS");
    const m = misses();
    let r = await list(w);
    let bad = need(w, r); if (bad) return bad;
    let row = rowAt(r.j, run);
    m.ok(row, `no row names the run: ${shown(r.j)}`);
    if (row) {
      m.eq(row.kind, "run", "kind");
      m.eq(row.status, "kept", "a run one of whose seats has not returned a report");
      m.eq(row.selectable, false, "selectable while a seat has not returned");
    }
    fs.writeFileSync(reportPathIn(run, "A"), JSON.stringify(report(w.project), null, 2) + "\n");
    const s = await snapshot(w);
    bad = need(w, s); if (bad) return bad;
    row = rowAt(s.j, run);
    m.ok(row, `no row names the finished run: ${shown(s.j)}`);
    if (!row) return m.done();
    m.eq(row.status, "removable", "a run whose every seat reported");
    m.eq(row.selectable, true, "a finished run of this project is selectable");
    m.eq(row.proposed, false, "a run must never be suggested: only the user's own number deletes one");
    m.has(row.name, path.basename(w.project), "the run's name does not name its project");
    const d = await pick(w, s.file, [row.n]);
    m.eq(d.code, EXIT.OK, `deleting the run by its number exited ${d.code}: ${(d.err || d.out).trim().slice(0, 240)}`);
    m.ok(!fs.existsSync(run), "the run directory survived its own deletion");
    // The proof is the same shape the user consented on: the fresh listing, without what went. What the
    // script says about the deletion itself may name the run; the listing under it may not.
    const at = d.out.split("\n").findIndex((l) => /^\s*\d+ {2}\S/.test(l));
    m.ok(at >= 0, `the fresh listing printed after a deletion has no numbered rows: ${d.out.slice(0, 240)}`);
    if (at >= 0) m.ok(!d.out.split("\n").slice(at).join("\n").includes(row.name),
      `the fresh listing still lists the deleted run: ${d.out.slice(0, 240)}`);
    return m.done();
  });

test("4 · every seat naming a run is examined: one published report does not hide a live seat writing to the same path",
  "two seat directories can name one report path — the seat that died and the seat that replaced it — so taking the first match makes the run's whole verdict depend on which one readdir returned first",
  async () => {
    const m = misses();
    // Both orders, so the case does not rest on the order the file system happens to return.
    for (const deadFirst of [true, false]) {
      const w = makeWorld(`two-seats-${deadFirst ? "dead-first" : "live-first"}`);
      const c = liveChild();
      const identity = processIdentity(c.pid);
      if (identity === null) { await stopChild(c); return skip("this machine does not report a process identity"); }
      const run = plantRun(w, w.slug, "run-1", { A: report(w.project) });
      const rp = reportPathIn(run, "A");
      plantSeat(w, deadFirst ? "codex-seat.AAAAAAAA" : "codex-seat.BBBBBBBB",
        { pid: DEAD_PID, identity: DEAD_IDENTITY, reportPath: rp });
      plantSeat(w, deadFirst ? "codex-seat.BBBBBBBB" : "codex-seat.AAAAAAAA",
        { pid: c.pid, identity, reportPath: rp });
      const s = await snapshot(w);
      const bad = need(w, s); if (bad) { await stopChild(c); return bad; }
      const where = deadFirst ? "dead first" : "live first";
      const row = rowAt(s.j, run);
      m.ok(row, `${where}: no row names the run: ${shown(s.j)}`);
      if (row) {
        m.eq(row.status, "kept", `${where}: a run a running seat is still writing to`);
        m.eq(row.selectable, false, `${where}: selectable`);
        const d = await pick(w, s.file, [row.n]);
        m.eq(d.code, REFUSED, `${where}: picking the number of a run with a running seat exited ${d.code}`);
        m.ok(fs.existsSync(rp), `${where}: the report a running seat writes to was removed`);
      }
      await stopChild(c);
    }
    return m.done();
  });

test("5 · a slug is not ownership: two projects share one slug, and cleaning one never offers the other's",
  "`a-b` and `a_b` slug to the same string, so a cleanup that reads ownership off the slug offers the neighbouring project's runs by number and calls them this project's; ownership comes from a path a record actually carries",
  async () => {
    const w = makeWorld("shared-slug");
    const dash = path.join(w.root, "a-b"), score = path.join(w.root, "a_b");
    for (const d of [dash, score]) fs.mkdirSync(d, { recursive: true });
    if (slugOf(dash) !== slugOf(score)) return `the fixture is wrong: ${slugOf(dash)} !== ${slugOf(score)}`;
    const slug = slugOf(dash);
    const theirs = plantRun(w, slug, "run-theirs", { A: report(dash) });
    const mine = plantRun(w, slug, "run-mine", { A: report(score) });
    const seat = plantSeat(w, "codex-seat.CCCCCCCC",
      { pid: DEAD_PID, identity: DEAD_IDENTITY, reportPath: reportPathIn(theirs, "A") });
    const r = await list(w, { cwd: score });
    const bad = need(w, r); if (bad) return bad;
    const m = misses();
    const theirRow = rowAt(r.j, theirs), myRow = rowAt(r.j, mine), seatRow = rowAt(r.j, seat);
    m.ok(theirRow, `no row names the neighbouring project's run: ${shown(r.j)}`);
    m.ok(myRow, `no row names this project's run: ${shown(r.j)}`);
    m.ok(seatRow, `no row names the seat of the neighbouring project's run: ${shown(r.j)}`);
    if (theirRow) {
      m.eq(theirRow.selectable, false, "the run of the project whose report says `a-b`, listed from `a_b`");
      m.eq(theirRow.proposed, false, "proposed");
      m.re(theirRow.name, /another project/, "the name of another project's run");
    }
    if (myRow) m.eq(myRow.selectable, true, "this project's own finished run");
    if (seatRow) m.eq(seatRow.proposed, false, "a seat of the neighbouring project's run is suggested here");
    return m.done();
  });

test("6 · what cannot be fully read is kept, and says so",
  "unreadable is not a third status, it is a reason to keep: a malformed record, a record permissions refuse and a walk that could not finish each mean the tool does not know what is under the item, and deleting on that is deleting what it never read",
  async () => {
    const m = misses();
    // One world per shape. A fixture in the same world can be a second, true reason to keep the same
    // item — an unreadable seat keeps every run — and the case would then pass without measuring its own.
    const shapes = [
      { what: "a malformed report",
        plant: (w) => plantRun(w, w.slug, "run-malformed", { A: "{ truncated" }) },
      { what: "a directory the walk could not enter",
        plant: (w) => {
          const run = plantRun(w, w.slug, "run-walled", { A: report(w.project) });
          const deep = path.join(run, "A", "deep");
          fs.mkdirSync(deep, { recursive: true });
          fs.writeFileSync(path.join(deep, "inner.txt"), "inner\n");
          return run;
        },
        wall: (run) => path.join(run, "A", "deep") },
      { what: "a record permissions refuse",
        plant: (w) => plantSeat(w, "codex-seat.DDDDDDDD", { pid: DEAD_PID, identity: DEAD_IDENTITY,
          reportPath: reportPathIn(plantRun(w, w.slug, "run-1", { A: report(w.project) }), "A") }),
        wall: (seat) => path.join(seat, "err.txt") },
    ];
    for (const [i, shape] of shapes.entries()) {
      const w = makeWorld(`unreadable-${i}`);
      const item = shape.plant(w);
      const wall = shape.wall?.(item);
      try {
        if (wall && !denied(wall)) return skip("permissions are not enforced for this user");
        const s = await snapshot(w);
        const bad = need(w, s); if (bad) return `${shape.what}: ${bad}`;
        const row = rowAt(s.j, item);
        m.ok(row, `${shape.what}: no row names it: ${shown(s.j)}`);
        if (!row) continue;
        m.eq(row.status, "kept", `${shape.what}: status`);
        m.eq(row.selectable, false, `${shape.what}: selectable`);
        m.eq(row.proposed, false, `${shape.what}: proposed`);
        m.re(row.reason, /read|understand|permission|malformed|unreadable|could not/i, `${shape.what}: the reason it is kept`);
        const d = await pick(w, s.file, [row.n]);
        m.eq(d.code, REFUSED, `${shape.what}: picking its number exited ${d.code}`);
        m.ok(fs.existsSync(item), `${shape.what}: it was removed anyway`);
      } finally {
        if (wall) { try { fs.chmodSync(wall, fs.statSync(wall).isDirectory() ? 0o700 : 0o600); } catch { /* never opened */ } }
      }
    }
    return m.done();
  });

test("7 · an unreadable finding does not cancel the liveness checks that come after it",
  "the defect is an early return: the first thing that cannot be read ends the item's inspection, so the record naming the running process is never reached and the run it is writing to reads as finished",
  async () => {
    const w = makeWorld("unreadable-then-live");
    const c = liveChild();
    const identity = processIdentity(c.pid);
    if (identity === null) { await stopChild(c); return skip("this machine does not report a process identity"); }
    const busy = plantRun(w, w.slug, "run-busy", { A: report(w.project) });
    // A second run nothing names: it stays removable, so a listing that keeps EVERYTHING because one
    // file could not be read cannot pass this case by accident.
    const quiet = plantRun(w, w.slug, "run-quiet", { A: report(w.project) });
    const seat = plantSeat(w, "codex-seat.EEEEEEEE",
      { pid: c.pid, identity, reportPath: reportPathIn(busy, "A") });
    // Sorts before err.txt, so a walk in name order meets it first.
    const wall = path.join(seat, "attachments");
    fs.mkdirSync(wall, { recursive: true });
    fs.writeFileSync(path.join(wall, "shot.png"), "not really a png");
    const m = misses();
    try {
      if (!denied(wall)) { await stopChild(c); return skip("permissions are not enforced for this user"); }
      const r = await list(w);
      const bad = need(w, r); if (bad) { await stopChild(c); return bad; }
      const busyRow = rowAt(r.j, busy), quietRow = rowAt(r.j, quiet), seatRow = rowAt(r.j, seat);
      m.ok(busyRow, `no row names the run the live seat is writing to: ${shown(r.j)}`);
      m.ok(quietRow, `no row names the untouched run: ${shown(r.j)}`);
      if (busyRow) {
        m.eq(busyRow.status, "kept", "the run named by the running seat whose directory also holds something unreadable");
        m.eq(busyRow.selectable, false, "selectable");
      }
      if (quietRow) m.eq(quietRow.status, "removable",
        "the run nothing names, in a listing where one unreadable directory was met");
      if (seatRow) m.eq(seatRow.status, "kept", "the seat holding the unreadable directory");
    } finally {
      try { fs.chmodSync(wall, 0o700); } catch { /* never opened */ }
      await stopChild(c);
    }
    return m.done();
  });

test("8 · a job record naming an item keeps it, and a record with no identity is alive",
  "a record whose identity could not be read proves nothing about whose pid that is, so it is honoured, not reclaimed; the driver's own holderAlive says so, and a cleanup that reimplements liveness disagrees with it",
  async () => {
    const w = makeWorld("job-record");
    const c = liveChild();
    const dir = plantEval(w, "codex-delegate-test-JJJJ");
    plantJob(w, { pid: c.pid, identity: null, cwd: path.join(dir, "case-state", "0") });
    const m = misses();
    const s = await snapshot(w);
    const bad = need(w, s); if (bad) { await stopChild(c); return bad; }
    const row = rowAt(s.j, dir);
    m.ok(row, `no row names the scratch directory: ${shown(s.j)}`);
    if (row) {
      m.eq(row.status, "kept", "a directory a live job record's cwd is inside, its identity unreadable");
      m.eq(row.proposed, false, "proposed");
      const d = await pick(w, s.file, [row.n]);
      m.eq(d.code, REFUSED, `picking it exited ${d.code}`);
      m.ok(fs.existsSync(dir), "the working directory of a running job was removed");
    }
    await stopChild(c);
    const after = await list(w);
    const bad2 = need(w, after); if (bad2) return bad2;
    const row2 = rowAt(after.j, dir);
    m.ok(row2, `the row vanished once the job's process exited: ${shown(after.j)}`);
    if (row2) {
      m.eq(row2.status, "removable", "the same directory once the job's process has gone");
      m.eq(row2.proposed, true, "the eval scratch is suggested once nothing is running");
    }
    return m.done();
  });

test("9 · the eval scratch: an empty listing is an answer, a running suite is not, and a failed listing keeps every row",
  "the harness removes its own scratch on exit, so a survivor is a run that never reached its cleanup — unless a suite is running right now, and a process listing that could not be taken is not evidence that nothing is",
  async () => {
    const w = makeWorld("eval-scratch");
    const dirs = [plantEval(w, "codex-delegate-test-XXXX"), plantEval(w, "codex-lock-YYYY"),
                  plantEval(w, "codex-worktree-ZZZZ")];
    const m = misses();
    let r = await list(w);
    let bad = need(w, r); if (bad) return bad;
    for (const d of dirs) {
      const row = rowAt(r.j, d);
      m.ok(row, `no row names ${path.basename(d)}: ${shown(r.j)}`);
      if (!row) continue;
      m.eq(row.kind, "eval", `${path.basename(d)} kind`);
      m.eq(row.status, "removable", `${path.basename(d)} with an empty process listing, which is an answer`);
      m.eq(row.proposed, true, `${path.basename(d)} proposed`);
    }
    m.re(kindRows(r.j, "eval").map((row) => row.name).join(" | "), /tests/i,
      "no eval row's name says the tests left it behind");
    psLines(w, [suiteLine(6161, "lock.test.mjs")]);
    r = await list(w);
    bad = need(w, r); if (bad) return bad;
    for (const d of dirs) {
      const row = rowAt(r.j, d);
      m.ok(row && row.status === "kept" && row.proposed === false,
        `${path.basename(d)} while a suite is running: ${JSON.stringify({ status: row?.status, proposed: row?.proposed })}`);
    }
    r = await list(w, { env: { CODEX_DELEGATE_CLEANUP_PS: path.join(w.root, "no-such-listing") } });
    bad = need(w, r); if (bad) return bad;
    for (const d of dirs) {
      const row = rowAt(r.j, d);
      m.ok(row && row.status === "kept",
        `${path.basename(d)} when the process listing could not be taken: ${JSON.stringify({ status: row?.status, reason: row?.reason })}`);
    }
    return m.done();
  });

test("10 · the tests' saved conversations are offered by number and never suggested; a real one is never listed",
  "these directories are conversations, and the only ones this cleanup may name are the ones the suites made under $TMPDIR; a rule that reads the directory name loosely reaches the transcripts of the user's own work, and one that asks whether the scratch is still there hides the only conversations worth removing — the suites delete their scratch when they end",
  async () => {
    const w = makeWorld("sessions");
    // The usual case by far: the suite ended, its scratch went with it, the conversation stayed.
    const gone = plantSession(w, liveScratch("2026-09-09T03-11-33-648Z", "5-full-run"));
    // The same shape while the suite is between cases and its scratch is still on disk.
    const present = plantSession(w, liveScratch("2026-09-09T04-22-05-101Z", "1-slug"), { scratch: true });
    const probe = plantSession(w, "cdx-permprobe-2f9c1a");
    const mine = path.join(w.projects, slugOf(w.project));
    fs.mkdirSync(mine, { recursive: true });
    fs.writeFileSync(path.join(mine, "aaaaaaaa-0000-0000-0000-000000000000.jsonl"), "{}\n");
    const m = misses();
    const s = await snapshot(w);
    const bad = need(w, s); if (bad) return bad;
    m.ok(!rowAt(s.j, mine), `the user's own conversations are listed: ${shown(s.j)}`);
    for (const [what, d] of [["the suite's, its scratch gone", gone], ["the suite's, its scratch still there", present],
                             ["the permission check's", probe]]) {
      const row = rowAt(s.j, d);
      m.ok(row, `${what}: no row names it: ${shown(s.j)}`);
      if (!row) continue;
      m.eq(row.kind, "session", `${what}: kind`);
      m.eq(row.selectable, true, `${what}: selectable`);
      m.eq(row.proposed, false, "a saved conversation must never be suggested");
      m.re(row.name, /conversation/i, `${what}: name`);
    }
    // Whether the scratch is still there changes nothing about the name, so the two read as one row.
    const both = rowAt(s.j, gone);
    if (both) {
      m.ok((both.paths ?? []).includes(present),
        `the conversation whose scratch is gone and the one whose scratch is there are not the same row: ${shown(s.j)}`);
      m.eq(both.count, 2, "the members of the orchestration tests' row");
    }
    // Deleted by number: the permission check's row, which stands for one directory, so what went can
    // only be what was named.
    const row = rowAt(s.j, probe);
    if (row) {
      m.eq(row.count, 1, "the members of the permission check's row");
      const d = await pick(w, s.file, [row.n]);
      m.eq(d.code, EXIT.OK, `deleting a saved conversation by its number exited ${d.code}: ${(d.err || d.out).trim().slice(0, 240)}`);
      m.ok(!fs.existsSync(probe), "the conversation the user asked for by number survived");
      m.ok(fs.existsSync(gone) && fs.existsSync(present) && fs.existsSync(mine),
        "a number took a conversation nobody named with it");
    }
    return m.done();
  });

test("11 · one name, one row: the member that keeps it may be the last or the middle one",
  "identically named items are shown as one row, so one verdict now speaks for several directories; a row whose status comes from its first member deletes the rest on that member's evidence — so the member in use is planted LAST here, and the unreadable one in the MIDDLE of the second row",
  async () => {
    const w = makeWorld("collapsed");
    // Alphabetically last, so a scan that stops at its first answer never reaches it.
    const first = plantEval(w, "codex-lock-aaa"), last = plantEval(w, "codex-lock-zzz");
    const c = liveChild();
    plantJob(w, { pid: c.pid, identity: null, cwd: path.join(last, "case-state", "0") });
    const three = ["codex-worktree-aaa", "codex-worktree-mmm", "codex-worktree-zzz"].map((n) => plantEval(w, n));
    const walled = path.join(three[1], "case-state", "0", "scratch.txt");
    const m = misses();
    try {
      if (!denied(walled)) return skip("permissions are not enforced for this user");
      const s = await snapshot(w);
      const bad = need(w, s); if (bad) return bad;
      const busyRow = rowAt(s.j, first), middleRow = rowAt(s.j, three[0]);
      m.ok(busyRow, `no row names the lock tests' scratch: ${shown(s.j)}`);
      m.ok(middleRow, `no row names the worktree tests' scratch: ${shown(s.j)}`);
      if (busyRow) {
        m.eq(busyRow.count, 2, "the members the row of the lock tests stands for");
        m.ok((busyRow.paths ?? []).includes(last), `the row does not carry the member in use: ${JSON.stringify(busyRow.paths)}`);
        m.eq(busyRow.status, "kept", "a row whose LAST member is in use");
        m.eq(busyRow.proposed, false, "proposed");
        m.eq(kindRows(s.j, "eval").length, 2, "five scratch directories of two names were not shown as two rows");
        const d = await pick(w, s.file, [busyRow.n]);
        m.eq(d.code, REFUSED, `picking a row whose last member is in use exited ${d.code}`);
        m.ok(fs.existsSync(first) && fs.existsSync(last), "a row with a member in use was removed");
      }
      if (middleRow) {
        m.eq(middleRow.count, 3, "the members the row of the worktree tests stands for");
        m.eq(middleRow.status, "kept", "a row whose MIDDLE member holds a file that cannot be read");
        m.eq(middleRow.proposed, false, "proposed");
        const d = await pick(w, s.file, [middleRow.n]);
        m.eq(d.code, REFUSED, `picking a row whose middle member is unreadable exited ${d.code}`);
        for (const dir of three) m.ok(fs.existsSync(dir), `a member of an unreadable row was removed: ${path.basename(dir)}`);
      }
      // Now free both rows and take them in ONE call: a snapshot's numbers are only good against the
      // inventory it was taken from, and removing one row renumbers what is left.
      await stopChild(c);
      fs.chmodSync(walled, 0o600);
      const s2 = await snapshot(w);
      const bad2 = need(w, s2); if (bad2) return bad2;
      const rows = [rowAt(s2.j, first), rowAt(s2.j, three[0])];
      m.ok(rows.every(Boolean), `a row went missing once every member was free: ${shown(s2.j)}`);
      if (rows.every(Boolean)) {
        for (const row of rows) m.eq(row.status, "removable", "the row once every member is free");
        const d = await pick(w, s2.file, rows.map((row) => row.n));
        m.eq(d.code, EXIT.OK, `picking both collapsed rows exited ${d.code}: ${(d.err || d.out).trim().slice(0, 240)}`);
        for (const dir of [first, last, ...three])
          m.ok(!fs.existsSync(dir), `picking the row left ${path.basename(dir)} behind`);
      }
    } finally {
      try { fs.chmodSync(walled, 0o600); } catch { /* already removed */ }
      await stopChild(c);
    }
    return m.done();
  });

test("12 · the snapshot binds every field it carries, one field at a time",
  "a re-verification that compares any ONE of the fields passes a case that changed several of them at once, so each part here changes exactly one thing the user was shown — and asserts, before it picks anything, that nothing else moved with it",
  async () => {
    const m = misses();
    // A member's whole tree at one time, so a row's span has ends a case can move one at a time.
    const timed = (dir, at) => {
      const inner = path.join(dir, "case-state", "0");
      for (const p of [path.join(inner, "scratch.txt"), inner, path.dirname(inner), dir]) fs.utimesSync(p, at, at);
    };
    const day = (ago) => new Date(Date.now() - ago * 86_400_000);
    const twoDated = (w, a, b) => {
      const one = plantEval(w, "codex-lock-one"), two = plantEval(w, "codex-lock-two");
      timed(one, day(a)); timed(two, day(b));
      return [one, two];
    };
    const parts = [
      { what: "its size alone", field: "bytes", prefix: "codex-delegate-test-SIZE",
        mutate: (w, dir) => {
          const f = path.join(dir, "case-state", "0", "scratch.txt"), was = fs.statSync(f);
          fs.appendFileSync(f, "a payload nobody was shown\n");
          fs.utimesSync(f, was.atime, was.mtime);
        } },
      // The two ends of a span, one case each: an implementation that compares only one of them passes
      // the other's case, and the user consented to both.
      { what: "the earliest of its times alone", field: "mtimeMin",
        plant: (w) => twoDated(w, 8, 2), mutate: (w, dirs) => timed(dirs[0], day(5)) },
      { what: "the latest of its times alone", field: "mtimeMs",
        plant: (w) => twoDated(w, 8, 5), mutate: (w, dirs) => timed(dirs[1], day(2)) },
      // A member renamed: same count, same total size, same times, same inodes, a path the user never saw.
      { what: "the set of paths alone", field: "paths",
        plant: (w) => twoDated(w, 4, 4),
        mutate: (w) => fs.renameSync(path.join(w.tmp, "codex-lock-two"), path.join(w.tmp, "codex-lock-three")) },
      // The same name, the same size, the same times: a different directory in the same place.
      { what: "its identity alone: another directory of the same name, size and time", field: "ids",
        prefix: "codex-delegate-test-SWAP",
        // Built beside the original and renamed over it, never removed and rebuilt where it stood.
        // A freed inode is handed straight back to the next create on ext4: measured 2026-09-10, both
        // Linux jobs rebuilt this tree with the SAME dev:ino, `differing` returned [] and the case
        // measured nothing it claimed. Allocating the replacement while the original still holds its
        // inode is what makes the two different on every filesystem; case 35 pins the platform fact
        // this one must not depend on.
        mutate: (w, dir) => {
          const f = path.join(dir, "case-state", "0", "scratch.txt");
          const body = fs.readFileSync(f), fWas = fs.statSync(f), dWas = fs.statSync(dir);
          const spare = path.join(w.root, "swap-spare");
          fs.mkdirSync(path.join(spare, "case-state", "0"), { recursive: true });
          fs.writeFileSync(path.join(spare, "case-state", "0", "scratch.txt"), body);
          fs.rmSync(dir, { recursive: true, force: true });
          fs.renameSync(spare, dir);
          const inner = path.dirname(f);
          fs.utimesSync(f, fWas.atime, fWas.mtime);
          for (const p of [inner, path.dirname(inner), dir]) fs.utimesSync(p, dWas.atime, dWas.mtime);
        } },
    ];
    for (const part of parts) {
      const w = makeWorld(`snapshot-${part.field}`);
      const planted = part.plant ? part.plant(w) : plantEval(w, part.prefix);
      const item = Array.isArray(planted) ? planted[0] : planted;
      const s = await snapshot(w);
      const bad = need(w, s); if (bad) return `${part.what}: ${bad}`;
      const before = rowAt(s.j, item);
      m.ok(before, `${part.what}: no row names the item: ${shown(s.j)}`);
      if (!before) continue;
      part.mutate(w, planted);
      const after = await list(w);
      const bad2 = need(w, after); if (bad2) return `${part.what}: ${bad2}`;
      // The precondition, asserted rather than assumed: this part changed that field and no other.
      const moved = differing(before, rowAt(after.j, item));
      m.eq(JSON.stringify(moved), JSON.stringify([part.field]),
        `${part.what}: the fixture moved ${JSON.stringify(moved)}, so the case measures more than it says`);
      const d = await pick(w, s.file, [before.n]);
      m.eq(d.code, REFUSED, `${part.what}: picking it exited ${d.code}: ${(d.err || d.out).trim().slice(0, 240)}`);
      m.re(`${d.out}${d.err}`, /chang/i, `${part.what}: the refusal does not say it changed since it was listed`);
      // The member renamed in the paths part is expected under its new name; everything else where it was.
      const survivors = part.field === "paths" ? [item, path.join(w.tmp, "codex-lock-three")]
        : Array.isArray(planted) ? planted : [planted];
      for (const p of survivors) m.ok(fs.existsSync(p), `${part.what}: ${path.basename(p)} was removed anyway`);
    }
    return m.done();
  });

test("13 · a number that is not selectable is refused, and a refusal touches nothing",
  "the two sets are the whole of the consent: a number outside them is the coordinator sending something other than what was shown, and the answer is a refusal with nothing removed",
  async () => {
    const w = makeWorld("not-selectable");
    const other = plantRun(w, slugOf(path.join(w.root, "elsewhere")), "run-theirs",
      { A: report(path.join(w.root, "elsewhere")) });
    const reported = plantReported(w);
    const eval1 = plantEval(w, "codex-lock-KEEP");
    const m = misses();
    const s = await snapshot(w);
    const bad = need(w, s); if (bad) return bad;
    const targets = [["another project's run", other], ["a lock", reported.lock], ["the shared home", reported.home],
                     ["another data directory", reported.datadir],
                     ["a managed worktree", reported.tree]];
    for (const [what, p] of targets) {
      const row = rowNear(s.j, p);
      m.ok(row, `${what}: no row names it: ${shown(s.j)}`);
      if (!row) continue;
      m.eq(row.selectable, false, `${what}: selectable`);
      const d = await pick(w, s.file, [row.n]);
      m.eq(d.code, REFUSED, `${what}: picking its number exited ${d.code}: ${(d.err || d.out).trim().slice(0, 200)}`);
      m.ok(fs.existsSync(p), `${what}: it was removed on a number the listing never offered`);
      m.ok(fs.existsSync(eval1), `${what}: a refused selection took the suggested row with it`);
    }
    return m.done();
  });

test("14 · a symlink on the way in keeps the item; one inside a removed item is unlinked, its target untouched",
  "a link on the path from a root down points the removal outside the state directory — the driver's own home links auth.json and sessions back into ~/.codex — while a link INSIDE something being removed must go with it and take nothing else",
  async () => {
    const m = misses();
    // (a) a link where an item is expected.
    {
      const w = makeWorld("symlink-item");
      const target = path.join(w.outside, "dir");
      fs.mkdirSync(target, { recursive: true });
      fs.writeFileSync(path.join(target, "keep"), "kept\n");
      const seat = path.join(w.tmp, "codex-seat.FFFFFFFF");
      fs.symlinkSync(target, seat);
      plantEval(w, "codex-lock-AAAA");
      const s = await snapshot(w);
      const bad = need(w, s); if (bad) return bad;
      const row = rowAt(s.j, seat);
      m.ok(row, `no row names the symlinked seat directory: ${shown(s.j)}`);
      if (row) {
        m.eq(row.status, "kept", "a symbolic link where a seat directory is expected");
        m.eq(row.selectable, false, "selectable");
        const d = await pick(w, s.file, [row.n]);
        m.eq(d.code, REFUSED, `picking it exited ${d.code}`);
      }
      m.ok(fs.existsSync(path.join(target, "keep")), "the link's target was followed and removed");
    }
    // (b) a link at the kind root: the item is inside the state directory by name and outside it in fact.
    {
      const w = makeWorld("symlink-root");
      const elsewhere = path.join(w.outside, "orchestrate");
      const run = path.join(elsewhere, w.slug, "run-1");
      fs.mkdirSync(path.join(run, "A"), { recursive: true });
      fs.writeFileSync(reportPathIn(run, "A"), JSON.stringify(report(w.project), null, 2) + "\n");
      fs.symlinkSync(elsewhere, path.join(w.state, "orchestrate"));
      const s = await snapshot(w);
      const bad = need(w, s); if (bad) return bad;
      const row = rowAt(s.j, path.join(w.state, "orchestrate", w.slug, "run-1")) ?? rowAt(s.j, run);
      m.ok(row, `no row names the run under the symlinked kind root: ${shown(s.j)}`);
      if (row) {
        m.eq(row.status, "kept", "a run reached through a symbolic link at its kind root");
        const d = await pick(w, s.file, [row.n]);
        m.eq(d.code, REFUSED, `picking it exited ${d.code}`);
      }
      m.ok(fs.existsSync(reportPathIn(run, "A")), "a deletion followed the symlinked kind root out of the state directory");
    }
    // (c) links inside a removed item.
    {
      const w = makeWorld("symlink-inside");
      const dir = plantEval(w, "codex-delegate-test-LINKS");
      const keptDir = path.join(w.outside, "sessions"), keptFile = path.join(w.outside, "auth.json");
      fs.mkdirSync(keptDir, { recursive: true });
      fs.writeFileSync(path.join(keptDir, "rollout.jsonl"), "kept\n");
      fs.writeFileSync(keptFile, "{}\n");
      fs.symlinkSync(keptDir, path.join(dir, "sessions"));
      fs.symlinkSync(keptFile, path.join(dir, "auth.json"));
      const s = await snapshot(w);
      const bad = need(w, s); if (bad) return bad;
      const row = rowAt(s.j, dir);
      m.ok(row, `no row names the scratch holding links: ${shown(s.j)}`);
      if (row) {
        const d = await pick(w, s.file, [row.n]);
        m.eq(d.code, EXIT.OK, `removing an item holding links exited ${d.code}: ${(d.err || d.out).trim().slice(0, 240)}`);
        m.ok(!fs.existsSync(dir), "the item survived");
        m.ok(fs.existsSync(path.join(keptDir, "rollout.jsonl")), "a linked directory inside was followed and emptied");
        m.ok(fs.existsSync(keptFile), "a linked file inside was followed and deleted");
      }
    }
    return m.done();
  });

test("15 · what a yes covers, what a number covers, and what neither can reach",
  "the coordinator maps a bare yes onto the suggested numbers, so anything suggested is deleted on a word that never named it: a run, a saved conversation, another project's leftovers and the four reported kinds must be outside that set, and the driver's own directories outside the listing altogether",
  async () => {
    const w = makeWorld("the-two-sets");
    const seat = plantSeat(w, "codex-seat.GGGGGGGG", { pid: DEAD_PID, identity: DEAD_IDENTITY,
      reportPath: reportPathIn(plantRun(w, w.slug, "run-mine", { A: report(w.project) }), "A") });
    const mineRun = path.join(w.state, "orchestrate", w.slug, "run-mine");
    const theirs = plantRun(w, slugOf(path.join(w.root, "elsewhere")), "run-theirs",
      { A: report(path.join(w.root, "elsewhere")) });
    const scratch = plantEval(w, "codex-delegate-test-SETS");
    const session = plantSession(w, "cdx-permprobe-sets");
    const reported = plantReported(w);
    const own = plantDriverState(w);
    const m = misses();
    const r = await list(w);
    const bad = need(w, r); if (bad) return bad;
    const numbers = (ps) => ps.map((p) => rowAt(r.j, p)?.n).filter((n) => n !== undefined);
    const suggested = numbers([seat, scratch]);
    m.eq(suggested.length, 2, `the seat and the scratch are not both listed: ${shown(r.j)}`);
    m.eq(JSON.stringify([...(r.j.proposed ?? [])].sort((a, b) => a - b)), JSON.stringify(suggested.sort((a, b) => a - b)),
      `a yes covers something other than this project's finished seat and the eval scratch: ${shown(r.j)}`);
    const selectable = [...suggested, ...numbers([mineRun, session])].sort((a, b) => a - b);
    m.eq(JSON.stringify([...(r.j.selectable ?? [])].sort((a, b) => a - b)), JSON.stringify(selectable),
      `the numbers a user may say are not the suggested rows plus this project's run and the saved conversation: ${shown(r.j)}`);
    for (const [what, p] of [["another project's run", theirs], ["a lock", reported.lock],
                             ["the shared home", reported.home], ["another data directory", reported.datadir],
                             ["a managed worktree", reported.tree]]) {
      const row = rowNear(r.j, p);
      m.ok(row, `${what} is not listed at all: ${shown(r.j)}`);
      // Not their status, which asks only whether they are in use and readable, but the two sets: these
      // are the rows no number of the user's and no yes of the user's may reach.
      if (row) { m.eq(row.selectable, false, `${what} selectable`); m.eq(row.proposed, false, `${what} proposed`); }
    }
    for (const kind of ["lock", "home", "datadir"])
      m.eq(kindRows(r.j, kind).length, 1, `the rows of kind ${kind}`);
    m.ok(kindRows(r.j, "worktree").length >= 1, "the managed worktree and its ledger entry have no row");
    const dd = rowNear(r.j, reported.datadir);
    const entry = (r.j.manual ?? []).find((e) => String(e.command ?? "").includes(reported.datadir));
    m.ok(entry, `no manual command names the other data directory: ${JSON.stringify(r.j.manual)}`);
    if (entry) {
      m.re(entry.command, /rm -rf/, "the manual command");
      m.ok(typeof entry.bytes === "number" && typeof entry.name === "string",
        `the manual entry is not a name and a size: ${JSON.stringify(entry)}`);
    }
    m.ok(dd, "the other data directory has no row of its own beside its manual command");
    for (const [name, f] of Object.entries(own)) {
      m.ok(!r.j.rows.some((row) => (row.paths ?? []).some((p) => p === path.dirname(f) || f.startsWith(p + path.sep))),
        `the driver's own <state>/${name} is in the listing: ${shown(r.j)}`);
    }
    m.ok(typeof r.j.notCovered?.count === "number", `notCovered has no count: ${JSON.stringify(r.j.notCovered)}`);
    m.ok(typeof r.j.notCovered?.listCommand === "string" && typeof r.j.notCovered?.removeCommand === "string",
      `notCovered carries no commands: ${JSON.stringify(r.j.notCovered)}`);
    return m.done();
  });

test("16 · the listing is three lines a person reads, and --json carries the same bytes",
  "the coordinator shows this block unchanged and maps the user's words onto its numbers, so a listing rendered from one inventory and numbers taken from another are two snapshots nobody reconciled — and an identifier in the prose is a path or a pid the user was never meant to have to read",
  async () => {
    const w = makeWorld("the-listing");
    plantSeat(w, "codex-seat.HHHHHHHH", { pid: DEAD_PID, identity: DEAD_IDENTITY,
      reportPath: reportPathIn(plantRun(w, w.slug, "review-2026-09-08", { A: report(w.project), B: report(w.project) }), "A") });
    // Two of one family, so the listing has a row that stands for more than one directory and has to
    // say how many.
    plantEval(w, "codex-lock-PROSE");
    plantEval(w, "codex-lock-PROSE-TOO");
    plantSession(w, "cdx-permprobe-prose");
    plantReported(w);
    const m = misses();
    const j = await list(w);
    const bad = need(w, j); if (bad) return bad;
    const human = await runCleanup(w, ["--list"]);
    m.eq(human.code, EXIT.OK, `--list exited ${human.code}: ${human.err.trim().slice(0, 200)}`);
    m.eq(human.out, j.j.text, "the human listing and the text field of --list --json are not the same bytes");
    const lines = String(j.j.text ?? "").split("\n");
    // Every row is three lines: its number and name, then its size and what may be done with it, then
    // one sentence of reason.
    const blocks = new Map();
    for (const row of j.j.rows) {
      const at = lines.findIndex((l) => new RegExp(`^\\s*${row.n} {2}\\S`).test(l));
      m.ok(at >= 0, `row ${row.n} has no numbered line: ${JSON.stringify(lines.slice(0, 6))}`);
      if (at < 0) continue;
      blocks.set(row.n, at);
      m.has(lines[at], row.name, `the numbered line of row ${row.n}`);
      // A row standing for several directories says how many, and says the same number it carries.
      if (row.count > 1) m.ok(lines[at].includes(String(row.count)) || lines[at].toLowerCase().includes(WORDS[row.count]),
        `row ${row.n} stands for ${row.count} directories and its sentence does not say so: ${JSON.stringify(lines[at])}`);
      m.ok(lines[at + 1]?.trim() && lines[at + 2]?.trim(), `row ${row.n} is not three lines: ${JSON.stringify(lines.slice(at, at + 3))}`);
      const block = lines.slice(at, at + 3);
      const want = row.proposed ? "suggested for deletion"
        : row.selectable ? "say its number to delete it" : "kept";
      m.has(block.join("\n"), want, `row ${row.n} (${row.kind}, ${row.status}) does not say what may be done with it`);
      for (const l of block) {
        if (l.includes("/")) m.ok(false, `row ${row.n} carries a path: ${JSON.stringify(l)}`);
        if (/\bpid\b|\bremovable\b|\bselectable\b|\bproposed\b/.test(l))
          m.ok(false, `row ${row.n} carries a machine word: ${JSON.stringify(l)}`);
      }
    }
    for (const l of lines) {
      if (l.length > 76) m.ok(false, `a line is ${l.length} columns: ${JSON.stringify(l)}`);
      if (l.includes(BASE) || l.includes(w.slug) || /codex-seat\.|\.json\b/.test(l))
        m.ok(false, `a line carries an identifier: ${JSON.stringify(l)}`);
    }
    // Everything after the last row, its reason's wrapped continuation included: the closing lines.
    const tail = closing(j.j.text, j.j.rows);
    m.re(tail, /suggest/i, "the closing lines do not say what is suggested");
    m.re(tail, /number/i, "the closing lines do not say what may be had by its number");
    if (Number(j.j.notCovered?.count) > 0)
      m.has(tail, String(j.j.notCovered.count), "the closing lines do not carry the count of what is not covered");
    m.ok(!/rm -rf/.test(String(j.j.text)), "the manual commands are in the listing without the user asking for them");
    // The same listing at a narrower terminal.
    const narrow = await list(w, { env: { CODEX_DELEGATE_CLEANUP_COLUMNS: "60" } });
    const badNarrow = need(w, narrow); if (badNarrow) return badNarrow;
    for (const l of String(narrow.j.text ?? "").split("\n"))
      if (l.length > 60) m.ok(false, `at 60 columns a line is ${l.length} columns: ${JSON.stringify(l)}`);
    return m.done();
  });

test("17 · the roots it must have, and the arguments it refuses",
  "a root that can still be refused after the work is done is a root that should have refused at the start; and every argument the page never sends is one the script must not guess at",
  async () => {
    const w = makeWorld("roots-and-args");
    const m = misses();
    const noState = await runCleanup(w, ["--list"], { env: { CODEX_DELEGATE_STATE_DIR: undefined } });
    m.eq(noState.code, USAGE, `--list with no state directory exited ${noState.code}`);
    m.eq(noState.out, "", "stdout was not empty");
    m.has(noState.err, "CODEX_DELEGATE_STATE_DIR", "the refusal names the variable it looked at first");
    m.has(noState.err, "CLAUDE_PLUGIN_DATA", "the refusal names the variable it falls back to");
    // The fallback: with only CLAUDE_PLUGIN_DATA set, that directory IS the state directory.
    const alt = path.join(w.root, "plugin-data");
    fs.mkdirSync(path.join(alt, "orchestrate", w.slug, "run-1", "A"), { recursive: true });
    fs.writeFileSync(path.join(alt, "orchestrate", w.slug, "run-1", "A", "report.json"),
      JSON.stringify(report(w.project), null, 2) + "\n");
    const viaPluginData = await list(w, { env: { CODEX_DELEGATE_STATE_DIR: undefined, CLAUDE_PLUGIN_DATA: alt } });
    const bad = need(w, viaPluginData);
    if (bad) m.ok(false, `with only CLAUDE_PLUGIN_DATA set: ${bad}`);
    else m.ok(rowAt(viaPluginData.j, path.join(alt, "orchestrate", w.slug, "run-1")),
      `the run under CLAUDE_PLUGIN_DATA is not listed: ${shown(viaPluginData.j)}`);
    const noTmp = await runCleanup(w, ["--list"], { unsetEnv: ["TMPDIR"] });
    m.eq(noTmp.code, USAGE, `--list with TMPDIR unset exited ${noTmp.code}`);
    const s = await snapshot(w);
    for (const [what, args] of [
      ["an unknown flag", ["--list", "--wat"]],
      ["both commands at once", ["--list", "--delete"]],
      ["--delete with no snapshot", ["--delete", "1"]],
      ["--delete with no numbers", ["--delete", "--from", s.file]],
      ["a snapshot file that is not there", ["--delete", "--from", path.join(w.root, "gone.json"), "1"]],
      ["a snapshot file that is not JSON", ["--delete", "--from", w.ps, "1"]],
      ["a number that is not one", ["--delete", "--from", s.file, "seven"]],
    ]) {
      const r = await runCleanup(w, args);
      m.eq(r.code, USAGE, `${what} exited ${r.code}: ${(r.err || r.out).trim().slice(0, 160)}`);
    }
    const help = await runCleanup(w, ["--help"]);
    m.eq(help.code, EXIT.OK, `--help exited ${help.code}`);
    for (const flag of ["--list", "--delete", "--from", "--json"]) m.has(help.out, flag, "--help");
    return m.done();
  });

test("18 · the ladder: a refusal outranks a failed removal, which outranks success",
  "the page reads the code to decide what to tell the user, so a run that refused one number and removed another must not report the removal; and a removal that could not finish must not report that it did",
  async () => {
    const w = makeWorld("the-ladder");
    // Two items, because the first attempt changes the one it could not remove: the combined selection
    // would then be refused for having changed, and the case would pass without a failed removal in it.
    const alone = plantEval(w, "codex-lock-DOOMED");
    const beside = plantEval(w, "codex-worktree-DOOMED");
    const kept = plantRun(w, w.slug, "run-kept", { A: null });
    const m = misses();
    const s = await snapshot(w);
    const bad = need(w, s); if (bad) return bad;
    const aloneRow = rowAt(s.j, alone), besideRow = rowAt(s.j, beside), keptRow = rowAt(s.j, kept);
    m.ok(aloneRow && besideRow && keptRow, `the fixture is not three rows: ${shown(s.j)}`);
    if (!aloneRow || !besideRow || !keptRow) return m.done();
    m.eq(keptRow.selectable, false, "the run with a seat that has not reported");
    try {
      // A parent directory that refuses the unlink: the removal is attempted and cannot finish.
      fs.chmodSync(w.tmp, 0o500);
      let enforced = false;
      try { fs.writeFileSync(path.join(w.tmp, "probe"), ""); } catch { enforced = true; }
      if (!enforced) return skip("permissions are not enforced for this user");
      const failed = await pick(w, s.file, [aloneRow.n]);
      m.eq(failed.code, FAILED, `a removal that could not finish exited ${failed.code}: ${(failed.err || failed.out).trim().slice(0, 240)}`);
      m.ok(fs.existsSync(alone), "the item went after all, so the case measured nothing");
      const both = await pick(w, s.file, [besideRow.n, keptRow.n]);
      m.eq(both.code, REFUSED, `a refusal beside a failed removal exited ${both.code}: ${(both.err || both.out).trim().slice(0, 240)}`);
      m.ok(fs.existsSync(kept), "the row that was refused was removed anyway");
    } finally {
      try { fs.chmodSync(w.tmp, 0o700); } catch { /* never changed */ }
    }
    return m.done();
  });

test("19 · it never runs git, never removes a root, and never touches the driver's own directories",
  "`git status` rewrites the index even when its output is empty, so a listing that runs git is not the dry run the page promises; and a removal that walks up out of its item takes the state directory the driver is using right now",
  async () => {
    const w = makeWorld("no-git");
    const shim = path.join(w.root, "bin");
    fs.mkdirSync(shim, { recursive: true });
    const marker = path.join(w.root, "git-was-run.txt");
    fs.writeFileSync(path.join(shim, "git"), `#!/bin/sh\necho "$@" >> ${JSON.stringify(marker)}\nexit 1\n`, { mode: 0o755 });
    const own = plantDriverState(w);
    const reported = plantReported(w);
    plantSeat(w, "codex-seat.IIIIIIII", { pid: DEAD_PID, identity: DEAD_IDENTITY,
      reportPath: reportPathIn(plantRun(w, w.slug, "run-1", { A: report(w.project) }), "A") });
    plantEval(w, "codex-delegate-test-GIT");
    // Two traps: a name this cleanup owns, in a place it may remove from, pointing at a directory it
    // must never remove. A removal without a root guard follows the name and takes the driver's own.
    fs.symlinkSync(path.join(w.state, "locks"), path.join(w.tmp, "codex-lock-TRAP"));
    fs.symlinkSync(path.join(w.state, "home"), path.join(w.state, "orchestrate", w.slug, "run-trap"));
    const env = { PATH: `${shim}:${process.env.PATH}` };
    const m = misses();
    const s = await snapshot(w, { env });
    const bad = need(w, s); if (bad) return bad;
    const asked = [...new Set([...(s.j.proposed ?? []), ...(s.j.selectable ?? [])])].sort((a, b) => a - b);
    m.ok(asked.length >= 3, `the fixture offers ${asked.length} rows, so the deletion measures little`);
    const d = await pick(w, s.file, asked, { env });
    m.ok(d.code === EXIT.OK || d.code === REFUSED,
      `taking everything offered exited ${d.code}: ${(d.err || d.out).trim().slice(0, 240)}`);
    m.ok(!fs.existsSync(marker), `git was run: ${fs.existsSync(marker) ? fs.readFileSync(marker, "utf8").trim() : ""}`);
    for (const root of [w.state, w.tmp, w.config, w.projects, w.data, w.project])
      m.ok(fs.existsSync(root), `a root was removed: ${root}`);
    for (const [name, f] of Object.entries(own)) m.ok(fs.existsSync(f), `the driver's own <state>/${name} was removed`);
    for (const name of ["locks", "worktrees", "home"])
      m.ok(fs.existsSync(path.join(w.state, name)), `<state>/${name} was removed`);
    m.ok(fs.existsSync(reported.lock), "a lock was removed through a name in the temporary directory");
    m.ok(fs.existsSync(path.join(reported.home, "config.toml")), "the shared home was emptied through a name under a run's slug");
    return m.done();
  });

test("20 · the snapshot's paths are compared, and a forged one never reaches a root",
  "the snapshot is a file the coordinator hands back, so it is untrusted input: an implementation that removes the paths the FILE names, rather than the paths the fresh inventory names for that number, removes whatever the file says — and what it says here is the state directory",
  async () => {
    const w = makeWorld("forged-snapshot");
    const dir = plantEval(w, "codex-delegate-test-FORGE");
    plantDriverState(w);
    plantReported(w);
    const m = misses();
    const s = await snapshot(w);
    const bad = need(w, s); if (bad) return bad;
    const row = rowAt(s.j, dir);
    m.ok(row, `no row names the scratch: ${shown(s.j)}`);
    if (!row) return m.done();
    for (const target of [w.state, w.tmp, w.projects, path.join(w.state, "locks"),
                          path.join(w.state, "jobs"), path.join(w.state, "home")]) {
      const st = fs.statSync(target);
      const forged = JSON.parse(JSON.stringify(s.j));
      const f = forged.rows.find((r) => r.n === row.n);
      f.paths = [target];
      f.bytes = st.size;
      f.mtimeMs = st.mtimeMs;
      const file = path.join(w.root, `forged-${path.basename(target)}.json`);
      fs.writeFileSync(file, JSON.stringify(forged));
      const d = await pick(w, file, [row.n]);
      const what = path.relative(w.root, target);
      m.ok(d.code !== EXIT.OK, `a snapshot naming ${what} in place of the row's own paths exited 0`);
      m.ok(fs.existsSync(target), `a forged snapshot removed ${what}`);
      m.ok(fs.existsSync(dir), `a forged snapshot naming ${what} removed the row's real item`);
    }
    return m.done();
  });

test("21 · a symlink that appears after the listing refuses the removal, wherever on the path it is",
  "the listing's own symlink check cannot save a path that becomes a link AFTER the user was shown it; the walk from the canonical root down, one lstat per component, is the only thing between a yes and a directory that has been moved out of the state directory since",
  async () => {
    const m = misses();
    // (a) one component above the item: the same run, the same bytes, the same time — reached through
    // a link that was not there when it was listed.
    {
      const w = makeWorld("swap-above");
      const run = plantRun(w, w.slug, "run-1", { A: report(w.project) });
      const s = await snapshot(w);
      const bad = need(w, s); if (bad) return bad;
      const row = rowAt(s.j, run);
      m.ok(row, `no row names the run: ${shown(s.j)}`);
      if (row) {
        const slugDir = path.join(w.state, "orchestrate", w.slug), moved = path.join(w.outside, "slugdir");
        fs.renameSync(slugDir, moved);
        fs.symlinkSync(moved, slugDir);
        const d = await pick(w, s.file, [row.n]);
        m.ok(d.code !== EXIT.OK, "a run reached through a link one component above it was removed (exit 0)");
        m.ok(fs.existsSync(path.join(moved, "run-1", "A", "report.json")),
          "the removal followed a link one component above the item and deleted outside the state directory");
      }
    }
    // (b) the kind root of the saved conversations.
    {
      const w = makeWorld("swap-root");
      const session = plantSession(w, "cdx-permprobe-swap");
      const s = await snapshot(w);
      const bad = need(w, s); if (bad) return bad;
      const row = rowAt(s.j, session);
      m.ok(row, `no row names the conversation: ${shown(s.j)}`);
      if (row) {
        const moved = path.join(w.outside, "projects");
        fs.renameSync(w.projects, moved);
        fs.symlinkSync(moved, w.projects);
        const d = await pick(w, s.file, [row.n]);
        m.ok(d.code !== EXIT.OK, "a conversation reached through a linked kind root was removed (exit 0)");
        m.ok(fs.existsSync(path.join(moved, path.basename(session))),
          "the removal followed a linked <config>/projects out of the configuration directory");
      }
    }
    // (c) the item itself, swapped for a link between the listing and the yes.
    {
      const w = makeWorld("swap-item");
      const dir = plantEval(w, "codex-lock-SWAP");
      const payload = path.join(w.outside, "payload");
      fs.mkdirSync(payload, { recursive: true });
      fs.writeFileSync(path.join(payload, "keep"), "kept\n");
      const s = await snapshot(w);
      const bad = need(w, s); if (bad) return bad;
      const row = rowAt(s.j, dir);
      m.ok(row, `no row names the scratch: ${shown(s.j)}`);
      if (row) {
        fs.rmSync(dir, { recursive: true, force: true });
        fs.symlinkSync(payload, dir);
        const d = await pick(w, s.file, [row.n]);
        m.ok(d.code !== EXIT.OK, "an item swapped for a link was removed through it (exit 0)");
        m.ok(fs.existsSync(path.join(payload, "keep")), "the removal followed the link the item had become");
      }
    }
    return m.done();
  });

test("22 · a file a read refuses and a pipe where a file belongs keep the item, and neither is ever deleted",
  "these are the two shapes of `I could not read this`, and both must survive the word yes: an item whose contents the tool never saw is an item it cannot say is finished with",
  async () => {
    const w = makeWorld("unreadable-in-suggested");
    const walledDir = plantEval(w, "codex-delegate-test-WALL");
    const walled = path.join(walledDir, "case-state", "0", "scratch.txt");
    const fifoDir = plantEval(w, "codex-lock-FIFO");
    const fifo = path.join(fifoDir, "case-state", "0", "out.json");
    const madeFifo = spawnSync("mkfifo", [fifo]).status === 0;
    const clean = plantEval(w, "codex-worktree-CLEAN");
    const m = misses();
    try {
      if (!denied(walled)) return skip("permissions are not enforced for this user");
      const s = await snapshot(w);
      const bad = need(w, s); if (bad) return bad;
      const items = [["a file a read refuses", walledDir], ...(madeFifo ? [["a pipe where a file belongs", fifoDir]] : [])];
      for (const [what, dir] of items) {
        const row = rowAt(s.j, dir);
        m.ok(row, `${what}: no row names it: ${shown(s.j)}`);
        if (!row) continue;
        m.eq(row.status, "kept", `${what}: status`);
        m.eq(row.proposed, false, `${what}: suggested, so a bare yes would carry it away`);
        const d = await pick(w, s.file, [row.n]);
        m.eq(d.code, REFUSED, `${what}: picking its number exited ${d.code}`);
        m.ok(fs.existsSync(dir), `${what}: the item was removed`);
      }
      m.ok(fs.existsSync(walled), "the file nobody could read was deleted");
      if (madeFifo) m.ok(fs.existsSync(fifo), "the pipe was deleted");
      // And the word yes itself: every suggested number at once must still leave both of them.
      m.ok((s.j.proposed ?? []).includes(rowAt(s.j, clean)?.n), `the clean scratch is not suggested: ${shown(s.j)}`);
      const yes = await pick(w, s.file, s.j.proposed ?? []);
      m.ok(!fs.existsSync(clean), `a yes did not remove the one item that could be read (exit ${yes.code})`);
      m.ok(fs.existsSync(walledDir) && (!madeFifo || fs.existsSync(fifoDir)),
        `a yes carried away an item that could not be read (exit ${yes.code})`);
      m.ok(fs.existsSync(walled), "a yes deleted the file nobody could read");
    } finally { try { fs.chmodSync(walled, 0o600); } catch { /* already removed */ } }
    return m.done();
  });

test("23 · a seat a live job record protects keeps the run it is writing to",
  "a seat's own line names the pid of a process that may already be gone while the job record names the live one; a run whose liveness reads only the seat's line deletes the directory that seat is still writing into",
  async () => {
    const w = makeWorld("job-protected-seat");
    const c = liveChild();
    const run = plantRun(w, w.slug, "run-1", { A: report(w.project) });
    const seat = plantSeat(w, "codex-seat.JJJJJJJJ",
      { pid: DEAD_PID, identity: DEAD_IDENTITY, reportPath: reportPathIn(run, "A") });
    plantJob(w, { pid: c.pid, identity: null, cwd: seat });
    const m = misses();
    const s = await snapshot(w);
    const bad = need(w, s); if (bad) { await stopChild(c); return bad; }
    const seatRow = rowAt(s.j, seat), runRow = rowAt(s.j, run);
    m.ok(seatRow, `no row names the seat: ${shown(s.j)}`);
    m.ok(runRow, `no row names the run: ${shown(s.j)}`);
    if (seatRow) {
      m.eq(seatRow.status, "kept", "a seat a live job record's cwd is inside");
      m.eq(seatRow.proposed, false, "proposed");
    }
    if (runRow) {
      m.eq(runRow.status, "kept", "the run that protected seat is writing to");
      m.eq(runRow.selectable, false, "selectable");
      const d = await pick(w, s.file, [runRow.n]);
      m.eq(d.code, REFUSED, `picking it exited ${d.code}`);
      m.ok(fs.existsSync(run), "the run a protected seat is writing to was removed");
    }
    await stopChild(c);
    return m.done();
  });

test("24 · a name that only looks like a suite's is not a suite's",
  "the conversations this cleanup may name are the ones a suite itself writes, recognised by the SHAPE of the name under the temp root; a rule that matches on a word reaches a directory the user named for their own reasons, and a rule with no boundary reaches one that is not under the temp root at all — both are somebody's transcripts",
  async () => {
    const w = makeWorld("name-shape");
    // The real thing, so the case cannot pass by listing nothing at all.
    const real = plantSession(w, "cdx-permprobe-6b1d0e");
    // A directory of the user's own, under the temp root, named after what they were working on.
    const personal = plantSession(w, "my-orchestrate-live-notes", { scratch: true });
    // A name of the right shape whose path is NOT under the temp root: the slug of the temp root with no
    // separator after it, and the slug of a directory somewhere else entirely.
    const noBoundary = path.join(w.projects, `${slugOf(w.tmp)}evil-cdx-permprobe-abc`);
    const elsewhere = path.join(w.projects, slugOf(path.join(w.root, "elsewhere", "cdx-permprobe-abc")));
    for (const d of [noBoundary, elsewhere]) {
      fs.mkdirSync(d, { recursive: true });
      fs.writeFileSync(path.join(d, "conversation.jsonl"), "{}\n");
    }
    const m = misses();
    const s = await snapshot(w);
    const bad = need(w, s); if (bad) return bad;
    const realRow = rowAt(s.j, real);
    m.ok(realRow, `the suite's own conversation is not listed: ${shown(s.j)}`);
    if (realRow) m.eq(realRow.selectable, true, "the suite's own conversation");
    for (const [what, d] of [["a directory of the user's own that reads testish", personal],
                             ["a name that only begins like the temp root", noBoundary],
                             ["a name of the right shape outside the temp root", elsewhere]]) {
      const row = rowAt(s.j, d);
      m.ok(!row, `${what} is listed: ${JSON.stringify(row?.name)}`);
      if (row) m.eq(row.selectable, false, `${what} selectable`);
    }
    const offered = [...new Set([...(s.j.proposed ?? []), ...(s.j.selectable ?? [])])].sort((a, b) => a - b);
    if (offered.length) {
      const d = await pick(w, s.file, offered);
      for (const [what, p] of [["the user's own", personal], ["the one only beginning like the temp root", noBoundary],
                               ["the one outside the temp root", elsewhere]])
        m.ok(fs.existsSync(p), `every offered number took ${what} with it (exit ${d.code})`);
    }
    return m.done();
  });

test("25 · a member admitted after the listing is never carried off by the old number",
  "a row's number is consent for the members the user was shown; an implementation that removes whatever the fresh inventory collects under that name now deletes the scratch of a seat admitted a second later, which is a delegation that has just started",
  async () => {
    const w = makeWorld("late-member");
    const one = plantEval(w, "codex-lock-one"), two = plantEval(w, "codex-lock-two");
    const m = misses();
    const s = await snapshot(w);
    const bad = need(w, s); if (bad) return bad;
    const row = rowAt(s.j, one);
    m.ok(row, `no row names the scratch: ${shown(s.j)}`);
    if (row) {
      m.eq(row.count, 2, "the members the user was shown");
      const c = liveChild();
      const late = plantEval(w, "codex-lock-three");
      plantJob(w, { pid: c.pid, identity: null, cwd: path.join(late, "case-state", "0") });
      const d = await pick(w, s.file, [row.n]);
      m.eq(d.code, REFUSED, `picking a row that gained a member exited ${d.code}: ${(d.err || d.out).trim().slice(0, 240)}`);
      for (const dir of [one, two, late])
        m.ok(fs.existsSync(dir), `the number of a row shown with two members removed ${path.basename(dir)}`);
      await stopChild(c);
    }
    return m.done();
  });

test("26 · the command the user is handed is safe to paste",
  "a reported data directory carries a ready `rm -rf` for the user to run themselves, and its name is not the plugin's to choose: one name holding a substitution, a backquote, a space, both quotes and a semicolon must reach the shell as a single word, or the listing is an injection into the user's own terminal",
  async () => {
    const w = makeWorld("manual-command");
    // Every awkward character in ONE basename, and no slash in it: a marker path with a separator would
    // split into directories and the name actually tested would be the harmless first component.
    const id = `codex-delegate-a b'c"d;e$(touch pwned-sub)f\`touch pwned-tick\`g`;
    const dir = path.join(w.data, id);
    fs.mkdirSync(path.join(dir, "jobs"), { recursive: true });
    fs.writeFileSync(path.join(dir, "jobs", "th-old.json"),
      JSON.stringify({ threadId: "th-old", pid: DEAD_PID, identity: DEAD_IDENTITY, cwd: "/nowhere",
                       started: "2026-09-01T00:00:00.000Z", endedAt: "2026-09-01T00:01:00.000Z", exitCode: 0 }));
    const m = misses();
    m.ok(fs.existsSync(dir) && fs.readdirSync(w.data).includes(id),
      `the fixture is not one directory: ${JSON.stringify(fs.readdirSync(w.data))}`);
    const r = await list(w);
    const bad = need(w, r); if (bad) return bad;
    const entry = (r.j.manual ?? []).find((e) => String(e.command ?? "").includes("codex-delegate-a b"));
    m.ok(entry, `no manual command names the data directory: ${JSON.stringify(r.j.manual)}`);
    if (entry) {
      // What the world holds before the paste, so the case can say the line did nothing else.
      const before = treeOf(w.root).filter((p) => !p.startsWith(path.relative(w.root, dir)));
      const ran = spawnSync("sh", ["-c", entry.command], { cwd: w.root, encoding: "utf8" });
      for (const marker of ["pwned-sub", "pwned-tick"])
        m.ok(!fs.existsSync(path.join(w.root, marker)),
          `the pasted line ran what the directory's name told it to (${marker}): ${entry.command}`);
      m.ok(!fs.existsSync(dir),
        `the line did not remove the directory it names (exit ${ran.status}, ${String(ran.stderr).trim().slice(0, 160)}): ${entry.command}`);
      const after = treeOf(w.root);
      const gone = before.filter((p) => !after.includes(p)), grew = after.filter((p) => !before.includes(p));
      m.eq(JSON.stringify(gone), "[]", `the pasted line removed more than the directory it names: ${JSON.stringify(gone)}`);
      m.eq(JSON.stringify(grew), "[]", `the pasted line left something behind: ${JSON.stringify(grew)}`);
    }
    return m.done();
  });

test("27 · a member that becomes busy between the listing and the yes keeps the whole row",
  "the members of a collapsed row are removed one after another, and the world does not hold still while they are: a check made once, before the first of them goes, consents to a directory that a suite or a job took up in the meantime",
  async () => {
    const m = misses();
    // A suite starts, and it is the LAST member that the row's own scan would reach last.
    {
      const w = makeWorld("late-busy-suite");
      const first = plantEval(w, "codex-lock-aaa"), last = plantEval(w, "codex-lock-zzz");
      const s = await snapshot(w);
      const bad = need(w, s); if (bad) return bad;
      const row = rowAt(s.j, first);
      m.ok(row, `a suite starting late: no row names the scratch: ${shown(s.j)}`);
      if (row) {
        psLines(w, [suiteLine(7171, "lock.test.mjs")]);
        const d = await pick(w, s.file, [row.n]);
        m.eq(d.code, REFUSED, `a suite starting late: picking the row exited ${d.code}: ${(d.err || d.out).trim().slice(0, 200)}`);
        for (const dir of [first, last]) m.ok(fs.existsSync(dir), `a suite starting late: ${path.basename(dir)} was removed`);
      }
    }
    // A job record appears naming the last member.
    {
      const w = makeWorld("late-busy-job");
      const first = plantEval(w, "codex-lock-aaa"), last = plantEval(w, "codex-lock-zzz");
      const s = await snapshot(w);
      const bad = need(w, s); if (bad) return bad;
      const row = rowAt(s.j, first);
      m.ok(row, `a job arriving late: no row names the scratch: ${shown(s.j)}`);
      if (row) {
        const c = liveChild();
        plantJob(w, { pid: c.pid, identity: null, cwd: path.join(last, "case-state", "0") });
        const d = await pick(w, s.file, [row.n]);
        m.eq(d.code, REFUSED, `a job arriving late: picking the row exited ${d.code}: ${(d.err || d.out).trim().slice(0, 200)}`);
        for (const dir of [first, last]) m.ok(fs.existsSync(dir), `a job arriving late: ${path.basename(dir)} was removed`);
        await stopChild(c);
      }
    }
    return m.done();
  });

test("28 · the parent that was checked is renamed and another takes its place",
  "the walk down from the root and the removal are two moments, and between them a component can be swapped for another of the same name; what the walk pinned is what may go, and when it is no longer there the call says so rather than removing what is",
  async () => {
    const w = makeWorld("parent-swapped");
    const run = plantRun(w, w.slug, "run-1", { A: report(w.project) });
    const m = misses();
    const s = await snapshot(w);
    const bad = need(w, s); if (bad) return bad;
    const row = rowAt(s.j, run);
    m.ok(row, `no row names the run: ${shown(s.j)}`);
    if (!row) return m.done();
    const slugDir = path.join(w.state, "orchestrate", w.slug), moved = path.join(w.outside, "moved-aside");
    fs.renameSync(slugDir, moved);
    // A directory of the same name in the same place, holding a run of the same name: only its identity
    // tells the two apart.
    const decoy = plantRun(w, w.slug, "run-1", { A: report(w.project) });
    const decoyIno = fs.statSync(decoy).ino;
    const d = await pick(w, s.file, [row.n]);
    m.ok(d.code !== EXIT.OK, `the call reported success after the pinned parent was swapped: exit ${d.code}`);
    m.ok(fs.existsSync(decoy) && fs.statSync(decoy).ino === decoyIno,
      "the run that took the pinned parent's place was removed in its stead");
    m.ok(fs.existsSync(path.join(moved, "run-1", "A", "report.json")),
      "the run the user was shown was removed from the place it had been moved to");
    return m.done();
  });

test("29 · two numbers in one call come out the same in either order",
  "a run and the seat that wrote into it are one thing to the user and two rows to the tool; if the order the numbers arrive in changes what survives, the same yes means two different things",
  async () => {
    const m = misses();
    const outcomes = [];
    for (const order of ["the run first", "the seat first"]) {
      const w = makeWorld(`order-${order.includes("run") ? "run" : "seat"}`);
      const run = plantRun(w, w.slug, "run-1", { A: report(w.project) });
      const seat = plantSeat(w, "codex-seat.OOOOOOOO",
        { pid: DEAD_PID, identity: DEAD_IDENTITY, reportPath: reportPathIn(run, "A") });
      const s = await snapshot(w);
      const bad = need(w, s); if (bad) return `${order}: ${bad}`;
      const runRow = rowAt(s.j, run), seatRow = rowAt(s.j, seat);
      m.ok(runRow && seatRow, `${order}: the fixture is not two rows: ${shown(s.j)}`);
      if (!runRow || !seatRow) return m.done();
      const numbers = order === "the run first" ? [runRow.n, seatRow.n] : [seatRow.n, runRow.n];
      const d = await pick(w, s.file, numbers);
      outcomes.push({ code: d.code, run: fs.existsSync(run), seat: fs.existsSync(seat) });
    }
    m.eq(JSON.stringify(outcomes[0]), JSON.stringify(outcomes[1]),
      `the same two numbers in the other order gave ${JSON.stringify(outcomes[1])} instead of ${JSON.stringify(outcomes[0])}`);
    return m.done();
  });

test("30 · a pipe where a seat's startup line belongs does not stop the listing",
  "reading a named pipe with no writer blocks for as long as the machine is up; a listing that opens what it finds, rather than checking what it is first, never returns and the page never gets its block",
  async () => {
    const w = makeWorld("pipe-seat");
    const seat = path.join(w.tmp, "codex-seat.PIPEPIPE");
    fs.mkdirSync(seat, { recursive: true });
    fs.writeFileSync(path.join(seat, "prompt.txt"), "prompt\n");
    if (!mkfifo(path.join(seat, "err.txt"))) return skip("mkfifo is not available here");
    const m = misses();
    const r = await list(w, { killAfterMs: 25_000 });
    m.ok(r.signal !== "SIGKILL", `the listing hung on the pipe and had to be killed after ${r.ms} ms`);
    if (r.signal === "SIGKILL") return m.done();
    m.ok(r.ms < 20_000, `the listing took ${r.ms} ms`);
    const bad = need(w, r); if (bad) return bad;
    const row = rowAt(r.j, seat);
    m.ok(row, `no row names the seat holding a pipe: ${shown(r.j)}`);
    if (row) {
      m.eq(row.status, "kept", "a seat whose startup line is a pipe");
      m.eq(row.proposed, false, "proposed");
    }
    m.ok(fs.existsSync(path.join(seat, "err.txt")), "the pipe was removed");
    return m.done();
  });

test("31 · a job record whose read is refused keeps everything it could have protected",
  "the record that says which directories are in use is the one thing that cannot be skipped: a permission error there is not an empty list of jobs, it is no answer at all, and every item that record might have named stays",
  async () => {
    const w = makeWorld("job-unreadable");
    const run = plantRun(w, w.slug, "run-1", { A: report(w.project) });
    const seat = plantSeat(w, "codex-seat.KKKKKKKK",
      { pid: DEAD_PID, identity: DEAD_IDENTITY, reportPath: reportPathIn(run, "A") });
    const scratch = plantEval(w, "codex-lock-JOBS");
    const job = plantJob(w, { pid: DEAD_PID, identity: DEAD_IDENTITY, cwd: w.project });
    const m = misses();
    try {
      if (!denied(job)) return skip("permissions are not enforced for this user");
      const s = await snapshot(w);
      const bad = need(w, s); if (bad) return bad;
      m.eq(JSON.stringify(s.j.proposed), "[]", `something is suggested while a job record cannot be read: ${shown(s.j)}`);
      for (const [what, item] of [["the run", run], ["the seat", seat], ["the eval scratch", scratch]]) {
        const row = rowAt(s.j, item);
        m.ok(row, `${what}: no row names it: ${shown(s.j)}`);
        if (!row) continue;
        m.eq(row.status, "kept", `${what}: status while a job record cannot be read`);
        m.eq(row.selectable, false, `${what}: selectable`);
        const d = await pick(w, s.file, [row.n]);
        m.eq(d.code, REFUSED, `${what}: picking its number exited ${d.code}`);
        m.ok(fs.existsSync(item), `${what}: it was removed`);
      }
    } finally { try { fs.chmodSync(job, 0o600); } catch { /* never opened */ } }
    return m.done();
  });

test("32 · a conversation whose name resolves to nothing is not listed and never offered",
  "the name of a conversation directory is a path with its separators replaced; one that decodes to no path at all names no project, and a rule that answers `not a real project, therefore a test's` deletes somebody's transcripts",
  async () => {
    const w = makeWorld("nameless-conversation");
    const real = plantSession(w, "cdx-permprobe-abc");
    const nothing = path.join(w.projects, "----------");
    fs.mkdirSync(nothing, { recursive: true });
    fs.writeFileSync(path.join(nothing, "0f0f0f0f-0000-0000-0000-000000000000.jsonl"), "{}\n");
    const m = misses();
    const s = await snapshot(w);
    const bad = need(w, s); if (bad) return bad;
    m.ok(rowAt(s.j, real), `the suites' own conversation is not listed: ${shown(s.j)}`);
    const row = rowAt(s.j, nothing);
    m.ok(!row, `a conversation whose name resolves to nothing is listed: ${JSON.stringify(row?.name)}`);
    const offered = [...new Set([...(s.j.proposed ?? []), ...(s.j.selectable ?? [])])].sort((a, b) => a - b);
    if (offered.length) {
      const d = await pick(w, s.file, offered);
      m.ok(fs.existsSync(path.join(nothing, "0f0f0f0f-0000-0000-0000-000000000000.jsonl")),
        `a number took the conversation whose name resolves to nothing (exit ${d.code})`);
    }
    return m.done();
  });

test("33 · a file where a conversation directory would be leaves the real ones listed and the count true",
  "the conversations are directories, and something that is not one is not a conversation; a scan that stats what it finds and gives up, or counts it anyway, either loses the real ones or tells the user a number that is not so",
  async () => {
    const w = makeWorld("file-among-conversations");
    const one = plantSession(w, "cdx-permprobe-one"), two = plantSession(w, "cdx-permprobe-two");
    fs.writeFileSync(path.join(w.projects, `${slugOf(path.join(w.tmp, "cdx-permprobe-file"))}`), "not a directory\n");
    // Two suggested rows standing for three directories, so the closing sentence's two numbers differ.
    plantEval(w, "codex-lock-aaa");
    plantEval(w, "codex-lock-zzz");
    plantSeat(w, "codex-seat.MMMMMMMM", { pid: DEAD_PID, identity: DEAD_IDENTITY,
      reportPath: reportPathIn(plantRun(w, w.slug, "run-1", { A: report(w.project) }), "A") });
    const m = misses();
    const r = await list(w);
    const bad = need(w, r); if (bad) return bad;
    for (const d of [one, two]) m.ok(rowAt(r.j, d), `${path.basename(d)} is not listed: ${shown(r.j)}`);
    const rows = (r.j.proposed ?? []).map((n) => r.j.rows.find((row) => row.n === n));
    m.eq(rows.length, 2, `the fixture does not suggest two rows: ${shown(r.j)}`);
    const members = rows.reduce((a, row) => a + (row?.count ?? 1), 0);
    m.eq(members, 3, `the suggested rows do not stand for three directories: ${JSON.stringify(rows.map((row) => row?.count))}`);
    const tail = closing(r.j.text, r.j.rows);
    const sentence = tail.split(/(?<=\.)\s/).find((sn) => /suggest/i.test(sn)) ?? tail;
    m.ok(saysNumber(sentence, rows.length), `the closing sentence does not say how many rows are suggested (${rows.length}): ${JSON.stringify(sentence)}`);
    m.ok(saysNumber(sentence, members), `the closing sentence does not say how many directories that is (${members}): ${JSON.stringify(sentence)}`);
    return m.done();
  });

test("34 · a run's sentence names the project it found, and invents none",
  "the name a row carries is the user's whole basis for saying its number; a run whose records name no directory belongs to nobody the tool can see, and a sentence that fills that in with the project the user happens to be standing in invites a yes for somebody else's work",
  async () => {
    const w = makeWorld("unnamed-project");
    const mine = plantRun(w, w.slug, "run-mine", { A: report(w.project) });
    // A run under a slug of a directory that does not exist, whose only report names no directory either.
    const orphanSlug = slugOf(path.join(w.root, "nowhere-at-all"));
    const orphan = plantRun(w, orphanSlug, "run-orphan",
      { A: { ok: true, exitCode: 0, threadId: "th-1", turnStatus: "completed", answer: "done" } });
    const m = misses();
    const r = await list(w);
    const bad = need(w, r); if (bad) return bad;
    const mineRow = rowAt(r.j, mine), orphanRow = rowAt(r.j, orphan);
    m.ok(mineRow, `no row names this project's run: ${shown(r.j)}`);
    m.ok(orphanRow, `no row names the run nothing identifies: ${shown(r.j)}`);
    if (mineRow) m.has(mineRow.name, path.basename(w.project), "the run whose report names this project");
    if (orphanRow) {
      m.ok(!String(orphanRow.name).includes(path.basename(w.project)),
        `a run whose records name no directory is shown as this project's: ${JSON.stringify(orphanRow.name)}`);
      m.eq(orphanRow.selectable, false, "a run this project cannot claim");
      m.re(`${orphanRow.name} ${orphanRow.reason}`, /another project|could not|cannot|unknown|not identif|no .*project/i,
        "the row does not say that its project is not known");
    }
    return m.done();
  });

test("35 · identity is `dev:ino`, and a filesystem that recycles one is the whole of its limit",
  "the snapshot's last discriminator is the identity, and the code beside it asserted that a replacement of the same size at the same second is a different inode. On ext4 it is not: measured 2026-09-10, both Linux jobs handed the freed inode straight back, while macOS gave a new one. The rule the tool states is the same on both — a number consents to the identity the listing measured — so the case asserts THAT against whichever identity the platform hands back, and prints which way it went. It also prints what the creation time did, which is the evidence for deciding later whether the identity should carry more than `dev:ino`",
  async () => {
    const w = makeWorld("inode-recycled");
    const dir = plantEval(w, "codex-delegate-test-REUSE");
    const m = misses();
    const s = await snapshot(w);
    const bad = need(w, s); if (bad) return bad;
    const row = rowAt(s.j, dir);
    m.ok(row, `no row names the item: ${shown(s.j)}`);
    if (!row) return m.done();
    // Removed and rebuilt exactly where it stood, every displayed field restored: the shape whose
    // identity the platform, not this suite, decides.
    const f = path.join(dir, "case-state", "0", "scratch.txt");
    const dWas = fs.statSync(dir), fWas = fs.statSync(f), body = fs.readFileSync(f);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, body);
    fs.utimesSync(f, fWas.atime, fWas.mtime);
    for (const p of [path.dirname(f), path.dirname(path.dirname(f)), dir]) fs.utimesSync(p, dWas.atime, dWas.mtime);
    const dNow = fs.statSync(dir);
    const ident = (st) => `${st.dev}:${st.ino}`;
    const recycled = ident(dWas) === ident(dNow);
    note(`${recycled ? "the inode was RECYCLED" : "a new inode"}: ${ident(dWas)} -> ${ident(dNow)}`);
    note(`creation time ${dWas.birthtimeMs === dNow.birthtimeMs ? "unchanged" : "changed"}: `
       + `${dWas.birthtimeMs} -> ${dNow.birthtimeMs}`);
    const d = await pick(w, s.file, [row.n]);
    if (recycled) {
      // The documented limit, asserted rather than left to be inferred from a red job: every field the
      // snapshot binds still matches, the identity included, so the number still consents and the
      // directory goes. What makes this improbable outside a test is the times, which nothing but a
      // test puts back.
      m.eq(d.code, 0, `an identity equal to the one the listing measured is a consented removal: ${(d.err || d.out).trim().slice(0, 200)}`);
      m.ok(!fs.existsSync(dir), "it survived although every field the snapshot binds still matched");
    } else {
      m.eq(d.code, REFUSED, `a different identity is a different item: ${(d.err || d.out).trim().slice(0, 200)}`);
      m.ok(fs.existsSync(dir), "it was removed although the identity the listing measured is gone");
    }
    return m.done();
  });

const failed = await runCases(CASES);
for (const c of kids) { try { c.kill("SIGKILL"); } catch { /* already gone */ } }
process.exit(summarize(failed, CASES.length));
