#!/usr/bin/env node
// Lock, signal and teardown regression tests for scripts/driver.mjs.
//
// The protocol suite does not exercise the lock path. These cases cover directory and FIFO obstacles,
// locks naming other processes, peers releasing or replacing locks during acquisition, and what a
// signal leaves behind. The --worktree lifecycle is in worktree.test.mjs.
//
//   node evals/lock.test.mjs
//
// Exit 0 if every case matches. Uses the same scripted server as protocol.test.mjs, so no model is called.

import { spawn, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DRIVER, EXIT, FAKE, codexShim, lockKey, registry, runCases, skip, spawnNode, summarize,
         tempDir } from "./lib/harness.mjs";

// Use a private state directory so planted locks, inherited config and pruning cannot affect real
// delegations. The moving-HOME case still detects a driver that ignores this override.
const STATE_DIR = tempDir("codex-lock-state-");
const LOCK_DIR = path.join(STATE_DIR, "locks");
// Use acquireLock's own key function: a second implementation could drift while agreeing with itself.
const lockFor = (dir) => path.join(LOCK_DIR, lockKey(fs.statSync(dir)));

const shimDir = tempDir("codex-lock-shim-");
codexShim(shimDir);

const workDirs = [];
function freshDir(name) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), `codex-lock-${name}-`));
  workDirs.push(d);
  return d;
}

// --level write, so acquireLock actually runs. A slow scenario is used where a case needs the lock held
// while a second run tries for it.
function run(dir, { scenario = "happy", timeout = 30, args = [], env = {} } = {}) {
  return spawnNode(
    [DRIVER, "--level", "write", ...(dir === null ? [] : ["--cwd", dir]),
     "--timeout", String(timeout), "--allow-no-commands", ...args, "--prompt", "irrelevant, the server is scripted"],
    { env: { PATH: `${shimDir}:${process.env.PATH}`, FAKE_SCENARIO: scenario,
             CODEX_DELEGATE_STATE_DIR: STATE_DIR, ...env } }).done;
}

const { cases: CASES, test } = registry();

test("parseArgs rejects the listed invalid arguments before the turn starts",
  "each usage guard is part of the CLI contract; letting any one through either starts a turn with unintended rights or fails later for a misleading reason",
  async () => {
    const d = freshDir("invalid-args");
    const init = spawnSync("git", ["init", "-q", d], { encoding: "utf8" });
    if (init.status !== 0) return "git init failed: " + String(init.stderr).trim();
    const invalid = [
      { label: "missing --cwd", dir: null, args: [], flags: ["--cwd"], message: "--cwd is required" },
      { label: "unknown --level", dir: d, args: ["--level", "execute"], flags: ["--level"], message: "--level must be one of" },
      { label: "non-numeric --timeout", dir: d, args: ["--timeout", "soon"], flags: ["--timeout"], message: "--timeout must be a number of seconds" },
      // 0 is the default — no wall clock — so the guard must reject negative values, not zero.
      { label: "negative --timeout", dir: d, args: ["--timeout", "-1"], flags: ["--timeout"], message: "--timeout must be a number of seconds" },
      { label: "over-limit --timeout", dir: d, args: ["--timeout", "7201"], flags: ["--timeout"], message: "--timeout must be a number of seconds" },
      { label: "non-integer --max-commands", dir: d, args: ["--max-commands", "2.5"], flags: ["--max-commands"], message: "--max-commands must be a whole number" },
      { label: "negative --max-commands", dir: d, args: ["--max-commands", "-1"], flags: ["--max-commands"], message: "--max-commands must be a whole number" },
      { label: "unknown --effort", dir: d, args: ["--effort", "heroic"], flags: ["--effort"], message: "--effort must be one of" },
      { label: "invalid --expect-command regexp", dir: d, args: ["--expect-command", "["], flags: ["--expect-command"], message: "--expect-command is not a valid regular expression" },
      { label: "unknown --web-search", dir: d, args: ["--web-search", "fresh"], flags: ["--web-search"], message: "--web-search must be one of" },
      { label: "empty flag value", dir: d, args: ["--model", ""], flags: ["--model"], message: "--model requires a non-empty value" },
      { label: "flag-like value", dir: d, args: ["--model", "--brief"], flags: ["--model"], message: "--model requires a non-empty value" },
    ];
    const misses = [];
    for (const spec of invalid) {
      const { code, err } = await run(spec.dir, { args: spec.args });
      const message = err.trim().replace(/\s+/g, " ");
      if (code !== EXIT.USAGE || !spec.flags.every((flag) => message.includes(flag)) || !message.includes(spec.message))
        misses.push(spec.label + ": expected exit 2 and " + JSON.stringify(spec.message) +
          ", got " + code + " (" + message.slice(0, 180) + ")");
    }
    return misses.length ? misses.join("; ") : true;
  });

test("lock is not written into the protected directory, at any moment during the run",
  "at --level write a turn's `git add -A` stages the driver's own lock file — so it is the presence DURING the turn that matters, not what survives it",
  async () => {
    const d = freshDir("clean");
    // `late-item` keeps the turn open past its first events, so there is a live window to observe.
    const pending = run(d, { scenario: "late-item" });
    const seen = new Set();
    let polling = true;
    const poll = (async () => {
      while (polling) {
        for (const f of fs.readdirSync(d)) seen.add(f);
        await new Promise((r) => setTimeout(r, 5));
      }
    })();
    await pending;
    polling = false;
    await poll;
    for (const f of fs.readdirSync(d)) seen.add(f);
    if (seen.size) return `driver put files in the protected dir while the turn was live: ${JSON.stringify([...seen])}`;
    return true;
  });

test("lock is released when the run ends",
  "a lock that outlives its run wedges the directory for every later invocation",
  async () => {
    const d = freshDir("release");
    await run(d);
    if (fs.existsSync(lockFor(d))) return `lock ${lockFor(d)} still present after the run`;
    return true;
  });

test("a run releases only the lock it owns",
  "a peer can replace the lock after this run loses ownership; unconditional cleanup then deletes the peer's live lock and admits a second writer",
  async () => {
    const d = freshDir("release-owner");
    const p = lockFor(d);
    const pending = run(d, { scenario: "slow-turn" });
    const deadline = Date.now() + 5000;
    while (!fs.existsSync(p) && Date.now() < deadline)
      await new Promise((resolve) => setTimeout(resolve, 5));
    if (!fs.existsSync(p)) {
      const { code, err } = await pending;
      return "the run never acquired " + p + " (exit " + code + ": " + err.trim().slice(0, 120) + ")";
    }
    // Replace, rather than overwrite, the driver's lock: the pathname now belongs to a peer.
    fs.rmSync(p);
    const peer = JSON.stringify({ pid: process.pid, cwd: fs.realpathSync(d), started: "peer" });
    fs.writeFileSync(p, peer);
    const { code, err } = await pending;
    let after = null;
    try { after = fs.readFileSync(p, "utf8"); } catch {}
    fs.rmSync(p, { force: true });
    if (code !== EXIT.OK) return "the original run exited " + code + ": " + err.trim().slice(0, 120);
    return after === peer ? true : "releaseLock removed or changed the peer's replacement lock";
  });

test("a second run in the same directory is refused",
  "two runs in one directory edit, test and clean up over each other",
  async () => {
    const d = freshDir("busy");
    fs.mkdirSync(LOCK_DIR, { recursive: true, mode: 0o700 });
    // A live holder: our own pid is by definition alive.
    fs.writeFileSync(lockFor(d), JSON.stringify({ pid: process.pid, cwd: fs.realpathSync(d), started: "now" }));
    const { code, err } = await run(d);
    fs.rmSync(lockFor(d), { force: true });
    if (code !== EXIT.BUSY) return `expected 10, got ${code} (${err.trim().slice(0, 120)})`;
    if (!err.includes(lockFor(d))) return `the BUSY message must name the lock file to delete; got: ${err.trim()}`;
    return true;
  });

test("two names for one directory take one lock",
  "a symlinked path must not let a second run in behind the first",
  async () => {
    const d = freshDir("symlink");
    const link = path.join(freshDir("symlink-parent"), "alias");
    fs.symlinkSync(d, link);
    fs.mkdirSync(LOCK_DIR, { recursive: true, mode: 0o700 });
    fs.writeFileSync(lockFor(d), JSON.stringify({ pid: process.pid, cwd: fs.realpathSync(d), started: "now" }));
    const { code } = await run(link);
    fs.rmSync(lockFor(d), { force: true });
    return code === EXIT.BUSY ? true : `expected 10 via the symlink, got ${code}`;
  });

test("a stale lock is reclaimed",
  "a crashed run must not wedge its directory forever",
  async () => {
    const d = freshDir("stale");
    fs.mkdirSync(LOCK_DIR, { recursive: true, mode: 0o700 });
    // A pid above the system maximum, so it cannot be running and cannot be recycled into existence
    // either — a reaped real pid would be more lifelike and less reliable.
    fs.writeFileSync(lockFor(d), JSON.stringify({ pid: 2147483646, cwd: fs.realpathSync(d), started: "old" }));
    const { code } = await run(d);
    return code === EXIT.OK ? true : `expected the stale lock to be reclaimed (0), got ${code}`;
  });

test("an unparsable lock is reclaimed",
  "a writer killed between create and write leaves a lock naming no live pid; reading it as held wedges the directory",
  async () => {
    const d = freshDir("garbage");
    fs.mkdirSync(LOCK_DIR, { recursive: true, mode: 0o700 });
    fs.writeFileSync(lockFor(d), "");
    const { code } = await run(d);
    return code === EXIT.OK ? true : `expected an empty lock to be reclaimed (0), got ${code}`;
  });

test("a lock held by another user's live process is not stolen",
  "process.kill(pid,0) throws EPERM for a live process owned by someone else; treating that as death steals the lock",
  async () => {
    const d = freshDir("eperm");
    fs.mkdirSync(LOCK_DIR, { recursive: true, mode: 0o700 });
    // pid 1 is launchd: alive, root-owned, so kill(1,0) raises EPERM rather than succeeding.
    fs.writeFileSync(lockFor(d), JSON.stringify({ pid: 1, cwd: fs.realpathSync(d), started: "boot" }));
    const { code } = await run(d);
    fs.rmSync(lockFor(d), { force: true });
    return code === EXIT.BUSY ? true : `expected 10 (held by a live foreign process), got ${code}`;
  });

test("a directory at the lock path is a usage error, not a transport failure",
  "a directory at the lock path is a lock error, not a codex crash; EISDIR must not escape into the transport-error handler",
  async () => {
    const d = freshDir("eisdir");
    fs.mkdirSync(LOCK_DIR, { recursive: true, mode: 0o700 });
    fs.rmSync(lockFor(d), { force: true, recursive: true });
    fs.mkdirSync(lockFor(d));
    const { code, err } = await run(d);
    fs.rmSync(lockFor(d), { force: true, recursive: true });
    if (code === EXIT.TRANSPORT) return `exit 4 blames codex for a directory the caller created`;
    return code === EXIT.USAGE ? true : `expected 2, got ${code} (${err.trim().slice(0, 120)})`;
  });

test("a FIFO at the lock path does not hang the run",
  "open(2) on a fifo blocks forever without O_NONBLOCK, and --timeout cannot save it: acquireLock runs before the deadline is armed",
  async () => {
    const d = freshDir("fifo");
    fs.mkdirSync(LOCK_DIR, { recursive: true, mode: 0o700 });
    fs.rmSync(lockFor(d), { force: true });
    const mk = spawnSync("mkfifo", [lockFor(d)]);
    if (mk.status !== 0) return skip("no mkfifo on this platform, so no fifo to plant at the lock path");
    const started = process.hrtime.bigint();
    const { code } = await run(d, { timeout: 5 });
    const secs = Number(process.hrtime.bigint() - started) / 1e9;
    fs.rmSync(lockFor(d), { force: true });
    if (secs > 15) return `hung for ${secs.toFixed(1)}s — the open blocked`;
    return code === EXIT.USAGE ? true : `expected 2, got ${code} after ${secs.toFixed(1)}s`;
  });

test("a symlink at the lock path is refused rather than followed",
  "following it would let the lock redirect writes to a file of someone else's choosing",
  async () => {
    const d = freshDir("locklink");
    const target = path.join(freshDir("locklink-target"), "victim");
    fs.writeFileSync(target, "precious");
    fs.mkdirSync(LOCK_DIR, { recursive: true, mode: 0o700 });
    fs.rmSync(lockFor(d), { force: true });
    fs.symlinkSync(target, lockFor(d));
    const { code } = await run(d);
    const survived = fs.existsSync(target) && fs.readFileSync(target, "utf8") === "precious";
    fs.rmSync(lockFor(d), { force: true });
    if (!survived) return "the symlink target was clobbered";
    return code === EXIT.USAGE ? true : `expected 2, got ${code}`;
  });

test("two concurrent runs: exactly one wins",
  "the natural race is the one that actually happens in a fan-out, and it must not regress",
  async () => {
    const d = freshDir("race");
    const [a, b] = await Promise.all([run(d), run(d)]);
    const codes = [a.code, b.code].sort((x, y) => x - y);
    if (codes[0] !== EXIT.OK || codes[1] !== EXIT.BUSY) return `expected one 0 and one 10, got ${JSON.stringify(codes)}`;
    if (fs.existsSync(lockFor(d))) return "a lock was left behind after both runs finished";
    return true;
  });

test("eight concurrent runs against a STALE lock hold it one at a time",
  "a late peer reclaiming a stale lock must not delete the fresh lock that replaced it; the critical section must admit only one holder",
  async () => {
    // Probe mutual exclusion with atomic mkdir in --verify while the lock is held: sequential successes
    // are legitimate, but overlapping holders produce a VERIFY_FAILED.
    const CRIT = "mkdir .crit 2>/dev/null || exit 9; sleep 0.35; rmdir .crit";
    // Repeat a broad fan-out because reclaim races are probabilistic and narrow rounds can miss them.
    for (let round = 0; round < 10; round++) {
      const d = freshDir(`stampede-${round}`);
      fs.mkdirSync(LOCK_DIR, { recursive: true, mode: 0o700 });
      // Exactly what a hard-killed prior run leaves behind, and what makes a reused worktree name start
      // every later run on the reclaim path.
      fs.writeFileSync(lockFor(d), JSON.stringify({ pid: 2147483646, cwd: fs.realpathSync(d), started: "old" }));
      const codes = (await Promise.all(Array.from({ length: 12 }, () =>
        run(d, { scenario: "slow-turn", timeout: 60, args: ["--verify", CRIT] })))).map((r) => r.code);
      fs.rmSync(lockFor(d), { force: true });
      fs.rmSync(path.join(d, ".crit"), { recursive: true, force: true });
      // 0 = held it alone; 10 = correctly refused. 9 means a second run was inside the critical section.
      const overlapped = codes.filter((c) => c === EXIT.VERIFY_FAILED).length;
      if (overlapped) return `round ${round}: ${overlapped} run(s) entered the critical section while it was occupied, codes=${JSON.stringify(codes)}`;
      const odd = codes.filter((c) => c !== EXIT.OK && c !== EXIT.BUSY);
      if (odd.length) return `round ${round}: unexpected exit codes ${JSON.stringify(codes)}`;
      if (!codes.includes(EXIT.OK)) return `round ${round}: nobody acquired the stale directory, codes=${JSON.stringify(codes)}`;
    }
    return true;
  });

test("a reclaim marker whose owner is dead does not wedge a free directory",
  "a run killed mid-reclaim leaves a marker behind; if abandonment is judged on a clock rather than on the owner, every run against a provably FREE directory fails BUSY until the deadline expires",
  async () => {
    const d = freshDir("reclaim-abandoned");
    const p = lockFor(d);
    fs.mkdirSync(LOCK_DIR, { recursive: true, mode: 0o700 });
    // Both the lock and the marker name pids that cannot be running: the directory is genuinely free.
    fs.writeFileSync(p, JSON.stringify({ pid: 2147483646, cwd: fs.realpathSync(d), started: "old" }));
    fs.writeFileSync(`${p}.reclaim`, "2147483645");
    // Deliberately FRESH: a clock-based rule would refuse here, which is the bug.
    const { code } = await run(d);
    fs.rmSync(`${p}.reclaim`, { force: true });
    return code === EXIT.OK ? true : `a free directory was refused because of a dead owner's marker, got ${code}`;
  });

test("while a LIVE process holds the reclaim marker, nothing is touched — however old the marker looks",
  "serialising the reclaim is what stops a late peer from deleting the FRESH lock that replaced the stale one. Expiring the marker on a CLOCK breaks that: it steals the marker from an owner merely stalled past the deadline — a laptop sleep, a SIGSTOP, a wall-clock step — and reopens the multi-holder window",
  async () => {
    const d = freshDir("reclaim-live-owner");
    const p = lockFor(d);
    fs.mkdirSync(LOCK_DIR, { recursive: true, mode: 0o700 });
    const stale = JSON.stringify({ pid: 2147483646, cwd: fs.realpathSync(d), started: "old" });
    fs.writeFileSync(p, stale);
    // Owned by this very process, so provably alive — and backdated far past any plausible deadline.
    fs.writeFileSync(`${p}.reclaim`, String(process.pid));
    const old = Date.now() - 600000;
    fs.utimesSync(`${p}.reclaim`, old / 1000, old / 1000);
    const { code } = await run(d);
    const markerSurvived = fs.existsSync(`${p}.reclaim`);
    const lockUntouched = fs.existsSync(p) && fs.readFileSync(p, "utf8") === stale;
    fs.rmSync(`${p}.reclaim`, { force: true });
    fs.rmSync(p, { force: true });
    if (!markerSurvived) return "the marker was stolen from a live owner because it looked old";
    if (!lockUntouched) return "the stale lock was reclaimed while another process held the marker";
    return code === EXIT.BUSY ? true : `expected an honest 10 while a live owner holds the marker, got ${code}`;
  });

test("the home refusal survives a hostile or absent $HOME",
  "the protected-home anchor must come from account identity, not HOME; an unset or decoy HOME must not grant write access to the real home",
  async () => {
    const real = os.userInfo().homedir;
    const decoy = freshDir("decoy-home");
    for (const [label, env] of [["unset", { HOME: undefined }], ["decoy", { HOME: decoy }]]) {
      const { code } = await run(real, { env });
      if (code !== EXIT.USAGE) return `HOME ${label}: --cwd ${real} returned ${code}, expected 2`;
    }
    return true;
  });

test("--writable refuses the passwd home directory and names it",
  "the extra-root entry point must pass through the same protected-root guard as --cwd",
  async () => {
    const root = fs.realpathSync(os.userInfo().homedir);
    const { code, err } = await run(freshDir("writable-home"), { args: ["--writable", root] });
    if (code !== EXIT.USAGE) return "--writable " + root + " returned " + code + ", expected 2";
    return err.includes("refusing to grant write access to " + root + ":") ? true : "the refusal did not name " + root + ": " + err.trim().slice(0, 160);
  });

test("--writable refuses the filesystem root and names it",
  "granting / through an extra root is the same unrestricted write grant as using it for --cwd",
  async () => {
    const root = fs.realpathSync("/");
    const { code, err } = await run(freshDir("writable-root"), { args: ["--writable", root] });
    if (code !== EXIT.USAGE) return "--writable " + root + " returned " + code + ", expected 2";
    return err.includes("refusing to grant write access to " + root + ":") ? true : "the refusal did not name " + root + ": " + err.trim().slice(0, 160);
  });

test("--writable refuses the parent of the passwd home and names it",
  "an ancestor grant contains the whole home even though the requested path is not the home itself",
  async () => {
    const root = fs.realpathSync(path.dirname(os.userInfo().homedir));
    const { code, err } = await run(freshDir("writable-home-parent"), { args: ["--writable", root] });
    if (code !== EXIT.USAGE) return "--writable " + root + " returned " + code + ", expected 2";
    return err.includes("refusing to grant write access to " + root + ":") ? true : "the refusal did not name " + root + ": " + err.trim().slice(0, 160);
  });

test("two runs on one cwd take one lock however $HOME moves",
  "the lock directory must not depend on HOME, or runs with different HOME values can take separate locks for the same directory",
  async () => {
    const d = freshDir("home-split");
    const decoy = freshDir("decoy-home2");
    fs.mkdirSync(LOCK_DIR, { recursive: true, mode: 0o700 });
    fs.writeFileSync(lockFor(d), JSON.stringify({ pid: process.pid, cwd: fs.realpathSync(d), started: "now" }));
    const { code } = await run(d, { env: { HOME: decoy } });
    fs.rmSync(lockFor(d), { force: true });
    // The state directory is named by the environment and never derived from a home, so a decoy HOME must
    // leave NOTHING behind: not a second lock directory, not a stray dot-directory of any name.
    const left = fs.readdirSync(decoy);
    if (left.length) return `the run wrote under the decoy HOME: ${left.join(", ")}`;
    return code === EXIT.BUSY ? true : `a run under a decoy HOME walked past a held lock, got ${code}`;
  });

test("the write sandbox is exactly what the flags asked for, echoed back",
  "the fixture must echo the write-level sandbox configuration so omitted grants are observable rather than supplied by fixture defaults",
  async () => {
    const d = freshDir("wr-echo");
    const extra = freshDir("wr-extra");
    const { code, out } = await run(d, { args: ["--writable", extra, "--network"] });
    if (code !== EXIT.OK) return `a legitimate --writable/--network run was refused: ${code}`;
    let r = null; try { r = JSON.parse(out); } catch {}
    if (!r) return "no JSON report";
    if (r.sandbox?.networkAccess !== true) return `--network did not reach the sandbox: ${JSON.stringify(r.sandbox)}`;
    if (JSON.stringify(r.sandbox?.writableRoots) !== JSON.stringify([fs.realpathSync(extra)]))
      return `writable roots wrong: ${JSON.stringify(r.sandbox?.writableRoots)}`;
    return true;
  });

test("a write run whose workspace is not the cwd is refused",
  "the workspace root decides where everything the turn writes actually lands, and nothing in the sandbox object reveals that the server put us elsewhere",
  async () => {
    const d = freshDir("ws-elsewhere");
    const { code, err } = await run(d, { scenario: "workspace-elsewhere" });
    if (code !== EXIT.TRANSPORT) return `expected 4, got ${code}`;
    if (!/workspace roots/.test(err)) return `the refusal must name what differed; got: ${err.trim().slice(0, 120)}`;
    return true;
  });

test("--writable naming the cwd itself is not a failure",
  "the server subtracts the workspace root from writableRoots; an explicitly repeated cwd must still match the effective sandbox",
  async () => {
    const d = freshDir("wr-self");
    const { code, err } = await run(d, { args: ["--writable", d] });
    return code === EXIT.OK ? true : `--cwd X --writable X exited ${code}: ${err.trim().slice(0, 130)}`;
  });

test("a writable root named twice is not a failure",
  "the server deduplicates writableRoots, so duplicate extra-root flags must not cause a transport refusal",
  async () => {
    const d = freshDir("wr-dupe");
    const extra = freshDir("wr-dupe-root");
    const { code, err } = await run(d, { args: ["--writable", extra, "--writable", `${extra}/`] });
    return code === EXIT.OK ? true : `a duplicated --writable exited ${code}: ${err.trim().slice(0, 130)}`;
  });

test("a hermetic HOME under the workspace does not make the workspace unusable",
  "a build workspace may contain a decoy HOME; the protected-home guard must use the real account anchor rather than reject that workspace",
  async () => {
    const w = freshDir("hermetic");
    const home = path.join(w, ".home");
    fs.mkdirSync(home);
    const { code, err } = await run(w, { env: { HOME: home } });
    if (code === EXIT.USAGE) return `a workspace containing a hermetic HOME was refused: ${err.trim().slice(0, 130)}`;
    return code === EXIT.OK ? true : `expected 0, got ${code}`;
  });

test("a relative $HOME cannot promote an arbitrary directory to a home anchor",
  "a non-absolute HOME is resolved against the DRIVER's cwd, so `HOME=repo` invoked from the parent would refuse --cwd .../repo for no defensible reason",
  async () => {
    const w = freshDir("relhome");
    const { code } = await run(w, { env: { HOME: path.basename(w) } });
    return code === EXIT.OK ? true : `a relative HOME refused a legitimate cwd: ${code}`;
  });

test("a write sandbox that grants more than was asked for is refused",
  "write level must check the reported network setting as read level does; accepting an unexpected setting changes the granted rights",
  async () => {
    const d = freshDir("write-widened");
    // The denial is what the widening is measured against: egress is granted unless the caller refuses
    // it, so a fixture that hands back networkAccess:true to a seat that asked for it is agreement.
    const { code, err } = await run(d, { scenario: "write-networked", args: ["--no-network"] });
    if (code !== EXIT.TRANSPORT) return `expected 4 for a sandbox granting refused egress, got ${code}`;
    if (!/networkAccess/.test(err)) return `the refusal must name what differed; got: ${err.trim().slice(0, 140)}`;
    return true;
  });

test("the home directory is refused under every spelling of it",
  "realpath does not normalize letter case on macOS; the protected-home guard must compare directory identity so a case variant cannot grant the whole home",
  async () => {
    const home = fs.realpathSync(os.homedir());
    // Case variants of the same real directory, plus its ancestors and the filesystem root. On a
    // case-sensitive volume the variants simply do not exist, and resolveDir refuses them first.
    const spellings = [home, home.toLowerCase(), home.toUpperCase(), path.dirname(home), "/"];
    for (const s of spellings) {
      let exists = true;
      try { fs.statSync(s); } catch { exists = false; }
      if (!exists) continue;
      const { code } = await run(s);
      if (code === EXIT.OK) return `--cwd ${s} was granted write access; it is the home directory or an ancestor of it`;
      if (code !== EXIT.USAGE) return `--cwd ${s} expected 2, got ${code}`;
    }
    return true;
  });

test("a case-variant --cwd is the same directory",
  "realpath normalizes symlinks but not letter case; case variants of one directory must share a lock on a case-insensitive volume",
  async () => {
    const parent = freshDir("case");
    const upper = path.join(parent, "Worktree");
    const lower = path.join(parent, "worktree");
    fs.mkdirSync(upper);
    let sameDir = false;
    try { sameDir = fs.statSync(upper).ino === fs.statSync(lower).ino; } catch {}
    if (!sameDir) return skip("a case-sensitive filesystem: the two spellings are different directories here");
    fs.mkdirSync(LOCK_DIR, { recursive: true, mode: 0o700 });
    fs.writeFileSync(lockFor(upper), JSON.stringify({ pid: process.pid, cwd: upper, started: "now" }));
    const { code } = await run(lower);
    fs.rmSync(lockFor(upper), { force: true });
    return code === EXIT.BUSY ? true : `expected 10 via the case-variant spelling, got ${code}`;
  });

test("--writable refuses ~/.codex and the state directory in use, which hold the receipts and the driver's own state",
  "a writable ~/.codex/sessions makes receipts forgeable, and a writable state directory exposes locks and the answer log; the state root is protected by its RESOLVED path, so the guard follows wherever the caller pointed it rather than a name",
  async () => {
    const home = fs.realpathSync(os.userInfo().homedir);
    const targets = [path.join(home, ".codex"), path.join(home, ".codex", "sessions"), STATE_DIR];
    for (const t of targets) {
      let exists = true;
      try { fs.statSync(t); } catch { exists = false; }
      if (!exists) continue;   // a machine without codex state has nothing to protect here
      const { code, err } = await run(freshDir("writable-protected"), { args: ["--writable", t] });
      if (code !== EXIT.USAGE) return `--writable ${t} returned ${code}, expected 2`;
      if (!/receipts|state/.test(err)) return `the refusal did not say why: ${err.trim().slice(0, 160)}`;
    }
    // The guard uses directory identity, so case-variant spellings on a case-insensitive volume must
    // be refused too — measured against the state directory this harness actually uses.
    const upper = path.join(path.dirname(STATE_DIR), path.basename(STATE_DIR).toUpperCase());
    let aliased = false;
    try { aliased = fs.statSync(upper).ino === fs.statSync(STATE_DIR).ino; } catch {}
    if (aliased) {
      const { code } = await run(freshDir("writable-protected-case"), { args: ["--writable", upper] });
      if (code !== EXIT.USAGE) return `case-variant --writable ${upper} returned ${code}, expected 2 — the identity guard is not holding`;
    }
    return true;
  });

test("a failed config probe keeps the last known good inherited config",
  "a failed probe must preserve the shared isolated config so a transient failure cannot move concurrent seats onto account defaults",
  async () => {
    const cfg = path.join(STATE_DIR, "home", "config.toml");
    const healthy = await run(freshDir("lkg-healthy"), {});
    if (healthy.code !== EXIT.OK) return `the healthy run exited ${healthy.code}`;
    let before = "";
    try { before = fs.readFileSync(cfg, "utf8"); } catch { return `no inherited config was written at ${cfg}`; }
    if (!/model/.test(before)) return `the healthy config carries no model: ${JSON.stringify(before)}`;
    const failing = await run(freshDir("lkg-failing"), { env: { FAKE_CONFIG_FAIL: "1" } });
    if (failing.code !== EXIT.OK) return `the probe-failing run exited ${failing.code}`;
    if (!/keeping the previously inherited config/.test(failing.err))
      return `the LKG path did not announce itself: ${failing.err.trim().slice(0, 200)}`;
    let after = "";
    try { after = fs.readFileSync(cfg, "utf8"); } catch { return "the config vanished"; }
    return after === before || "a failed probe rewrote the last known good config";
  });

test("every run is recorded in the job registry, and --resume last finds the newest",
  "the registry records each run and --resume last resolves the newest record, allowing a coordinator to recover a lost threadId",
  async () => {
    const first = await run(freshDir("jobs-first"), {});
    if (first.code !== EXIT.OK) return `the first run exited ${first.code}`;
    const jobs = path.join(STATE_DIR, "jobs");
    let names = [];
    try { names = fs.readdirSync(jobs).filter((n) => n.endsWith(".json")); } catch { return "no jobs directory was created"; }
    if (!names.length) return "no job record was written";
    let rec = null;
    try { rec = JSON.parse(fs.readFileSync(path.join(jobs, names[0]), "utf8")); } catch { return "the job record is not JSON"; }
    if (rec.exitCode !== 0 || rec.turnStatus !== "completed" || !rec.started || !rec.endedAt)
      return `the job record is incomplete: ${JSON.stringify(rec)}`;
    // Scoped to the cwd: the registry is machine-wide, and in a fan-out the newest record is routinely
    // another repository's seat. Resuming that one would answer a follow-up about this directory from
    // a conversation about a different one, and no sandbox assert can catch it — the resumed thread is
    // simply handed the cwd it was asked for.
    // (Every fixture run reports the same thread id, so the registry holds ONE record whose cwd is the
    // latest run's. That is enough: resuming from that directory must work, and from any other must
    // refuse rather than reach across.)
    const owner = freshDir("jobs-owner");
    const ownerRun = await run(owner, {});
    if (ownerRun.code !== EXIT.OK) return `the owning run exited ${ownerRun.code}`;
    const second = await run(owner, { args: ["--resume", "last"] });
    if (second.code !== EXIT.OK) return `--resume last exited ${second.code}: ${second.err.trim().slice(0, 160)}`;
    if (!/--resume last -> thr_root/.test(second.err))
      return `the resolution was not announced: ${second.err.trim().slice(0, 200)}`;
    let r = null; try { r = JSON.parse(second.out); } catch { return "no JSON report from the resumed run"; }
    if (r.threadId !== "thr_root") return `the wrong thread was resumed: ${JSON.stringify(r.threadId)}`;
    const elsewhere = await run(freshDir("jobs-elsewhere"), { args: ["--resume", "last"] });
    if (elsewhere.code !== EXIT.USAGE)
      return `--resume last reached across directories: expected exit 2 in a directory with no record, got ${elsewhere.code}`;
    return /no previous run in/.test(elsewhere.err) || `the refusal did not say why: ${elsewhere.err.trim().slice(0, 160)}`;
  });

test("`--resume last` names the run started most recently, not the one most recently written to",
  "a long seat rewrites its own record on every mid-flight heartbeat, so ordering the registry by mtime made a run started hours ago outrank a shorter one begun after it and already finished: `--resume last` then continued the WRONG conversation, and nothing in the report said so",
  async () => {
    const dir = freshDir("resume-order");
    const jobs = path.join(STATE_DIR, "jobs");
    fs.mkdirSync(jobs, { recursive: true, mode: 0o700 });
    const at = (ms) => new Date(Date.now() - ms).toISOString();
    const plant = (id, rec) => {
      const p = path.join(jobs, `${id}.json`);
      fs.writeFileSync(p, JSON.stringify({ threadId: id, cwd: dir, level: "write", ...rec }), { mode: 0o600 });
      return p;
    };
    // B is written FIRST and A second, so A is the mtime-newest record while B is the newest by start:
    // exactly the shape a running seat's heartbeat produces.
    const bPath = plant("thr_b_finished", { started: at(60000), endedAt: at(30000), exitCode: 0, pid: 2147483646 });
    // A is older, still open, and its pid is this suite's own process, which is certainly alive.
    const aPath = plant("thr_a_running", { started: at(600000), pid: process.pid });
    if (!(fs.statSync(aPath).mtimeMs >= fs.statSync(bPath).mtimeMs))
      return "the planted records do not have the mtime order this case is about, so it would prove nothing";
    const { code, err } = await run(dir, { args: ["--resume", "last"] });
    if (!/--resume last -> thr_b_finished/.test(err))
      return `\`last\` did not name the most recently STARTED run: ${err.trim().slice(0, 240)}`;
    if (code !== EXIT.OK) return `resuming the newest finished run exited ${code}: ${err.trim().slice(0, 200)}`;
    // And the newest by start being the one still running is still exit 10, not a silent fall back to
    // an older thread: a caller asking for "last" here must be told to wait for it, never handed another
    // conversation. In a directory of its own, because the resumed run above recorded itself in this one.
    const live2 = freshDir("resume-order-live");
    fs.writeFileSync(path.join(jobs, "thr_c_running.json"),
      JSON.stringify({ threadId: "thr_c_running", cwd: live2, level: "write", started: at(1000), pid: process.pid }),
      { mode: 0o600 });
    const live = await run(live2, { args: ["--resume", "last"] });
    if (live.code !== EXIT.BUSY)
      return `a still-running newest run exited ${live.code}, expected ${EXIT.BUSY}: ${live.err.trim().slice(0, 200)}`;
    return /thr_c_running is still running/.test(live.err)
      || `the refusal did not name the live thread: ${live.err.trim().slice(0, 200)}`;
  });

test("the answer log is pruned by age",
  "the answer log must prune old entries so delegation output cannot grow without bound",
  async () => {
    const answers = path.join(STATE_DIR, "answers");
    fs.mkdirSync(answers, { recursive: true, mode: 0o700 });
    const planted = path.join(answers, `zzz-prune-eval-${crypto.randomBytes(4).toString("hex")}.md`);
    fs.writeFileSync(planted, "stale");
    const old = (Date.now() - 30 * 86400000) / 1000;
    fs.utimesSync(planted, old, old);
    const { code } = await run(freshDir("prune"), {});
    if (code !== EXIT.OK) { fs.rmSync(planted, { force: true }); return `the run exited ${code}`; }
    const survived = fs.existsSync(planted);
    fs.rmSync(planted, { force: true });
    return survived ? "a 30-day-old answer survived the prune" : true;
  });

// ---------------------------------------------------------------- signals and teardown
//

// A shim leaves a TERM-ignoring descendant in the codex process group and records its pid in a filename.
// It execs sleep to preserve that pid and ignored TERM disposition; the filename avoids partial writes
// and process-table searches.
const survivorShim = tempDir("codex-lock-surv-");
const survivorPids = tempDir("codex-lock-surv-pids-");
fs.writeFileSync(path.join(survivorShim, "codex"),
  `#!/bin/sh\nsh -c 'trap "" TERM; : > "${survivorPids}/$$"; exec sleep 300' &\nexec "${process.execPath}" "${FAKE}" "$@"\n`,
  { mode: 0o755 });
const survivorPidFiles = () => { try { return fs.readdirSync(survivorPids); } catch { return []; } };
const survivorsAlive = () => {
  const alive = [];
  for (const name of survivorPidFiles()) {
    const pid = Number(name);
    if (!Number.isInteger(pid) || pid <= 0) continue;
    // EPERM is a live process this suite may not signal, which is still a survivor; anything else means
    // the pid is gone, and its file goes with it so a reused pid cannot be read as a second survivor.
    try { process.kill(pid, 0); alive.push(name); }
    catch (e) { if (e?.code === "EPERM") alive.push(name); else fs.rmSync(path.join(survivorPids, name), { force: true }); }
  }
  return alive;
};
const reapSurvivors = () => {
  for (const name of survivorPidFiles()) {
    const pid = Number(name);
    if (Number.isInteger(pid) && pid > 0) { try { process.kill(pid, "SIGKILL"); } catch {} }
    fs.rmSync(path.join(survivorPids, name), { force: true });
  }
};

// Spawns a write-level run and hands back the child, so a case can signal it mid-turn.
function spawnRun(dir, { scenario = "stalled-turn", args = [], shim = survivorShim, env = {} } = {}) {
  const { child: p, done, stderrSoFar } = spawnNode(
    [DRIVER, "--level", "write", "--cwd", dir, "--timeout", "60", "--allow-no-commands", ...args,
     "--prompt", "irrelevant, the server is scripted"],
    { env: { PATH: `${shim}:${process.env.PATH}`, FAKE_SCENARIO: scenario,
             CODEX_DELEGATE_STATE_DIR: STATE_DIR, ...env } });
  // Wait for the thread announcement on stderr: the lock is taken before codex starts, so its existence
  // alone does not establish a thread to report.
  return { p, done, stderrSoFar };
}
const waitFor = async (fn, ms = 15000) => {
  for (const end = Date.now() + ms; Date.now() < end; ) { if (fn()) return true; await new Promise((r) => setTimeout(r, 25)); }
  return false;
};

// The preconditions every signal case needs before it can signal anything: a survivor in the group, the
// lock taken, the thread announced and the turn started. Returns null when they all arrived, or the
// reason they did not — and kills the run either way, so a failure leaves nothing behind.
async function readyToSignal(p, stderrSoFar, rpcLog) {
  const fail = (why) => { p.kill("SIGKILL"); reapSurvivors(); return why; };
  if (!await waitFor(() => survivorsAlive().length > 0)) return fail("the shim never produced a survivor");
  if (!await waitFor(() => fs.existsSync(rpcLog) && /thread\/start/.test(fs.readFileSync(rpcLog, "utf8"))))
    return fail("the run never started a thread");
  // Signalling on the lock alone is a race the driver wins correctly — no thread means nothing to report,
  // which is exit 4 — but it is not what these cases are about.
  if (!await waitFor(() => /threadId=/.test(stderrSoFar()))) return fail("the run never announced a thread");
  // And for the TURN: the interrupt needs a turn id, and threadId= is announced before the turn/start
  // response arrives. The rpc log records the request reaching the fixture; a short settle lets the
  // driver consume the response that carries the id.
  if (!await waitFor(() => { try { return /turn\/start/.test(fs.readFileSync(rpcLog, "utf8")); } catch { return false; } }))
    return fail("the turn never started");
  await new Promise((r) => setTimeout(r, 150));
  return null;
}

test("--host-home sweeps the group and releases the lock exactly as an isolated run does",
  "It is the one path that sets no CODEX_HOME and links nothing into place, so every teardown guarantee is reached through different setup code there — and a TERM-ignoring descendant is the shape that separates a group waited out from one merely signalled",
  async () => {
    reapSurvivors();
    const d = freshDir("host-home");
    // A home of this suite's own. --host-home hands the child the driver's own environment untouched, so
    // this is what keeps the case off the caller's real ~/.codex; the fixture opens neither.
    const home = tempDir("codex-lock-host-home-");
    const rpcLog = path.join(d, "rpc-host-home.log");
    const { p, done, stderrSoFar } = spawnRun(d, { args: ["--host-home"],
      env: { FAKE_RPC_LOG: rpcLog, HOME: home, CODEX_HOME: path.join(home, ".codex") } });
    const notReady = await readyToSignal(p, stderrSoFar, rpcLog);
    if (notReady) return notReady;
    p.kill("SIGTERM");
    const { code, out } = await done;
    const orphans = survivorsAlive();
    const lockLeft = fs.existsSync(lockFor(d));
    reapSurvivors();
    if (orphans.length) return `--host-home left ${orphans.length} descendant(s) behind: ${orphans.join(",")}`;
    if (lockLeft) return `--host-home left the cwd lock at ${lockFor(d)}`;
    if (code !== 1) return `--host-home exited ${code}, expected 1 (the turn did not complete)`;
    let r = null;
    try { r = JSON.parse(out); } catch { return `--host-home produced no JSON report (${out.length} bytes of stdout)`; }
    // The flag's own effect, so the case cannot pass on a run that quietly used the isolated home after all.
    if (r.codexHome !== null) return `--host-home ran against ${JSON.stringify(r.codexHome)}, not the caller's own home`;
    if (r.turnStatus !== "interrupted") return `the report did not say the turn was interrupted: ${JSON.stringify(r.turnStatus)}`;
    return true;
  });

for (const sig of ["SIGTERM", "SIGINT", "SIGHUP"]) {
  test(`${sig} reports the turn to its --report-file, sweeps the group and releases the lock`,
    sig === "SIGHUP"
      ? "SIGHUP is the signal from a closing terminal; it must preserve the report, reap descendants and release the lock like other cancellation signals"
      : "cancellation must return the incomplete-turn verdict and preserve the commands, files and answer already collected — and stopping a seat IS signalling it, so the report has to reach the file the caller was told to read rather than a pipe nobody held",
    async () => {
      reapSurvivors();
      const d = freshDir(`sig-${sig}`);
      const rpcLog = path.join(d, `rpc-${sig}.log`);
      // The path a caller signalling this run would read afterwards: written by the signal handler's own
      // report, or a stopped seat leaves nothing behind but its stderr.
      const reportFile = path.join(tempDir(`codex-lock-report-${sig}-`), "report.json");
      const { p, done, stderrSoFar } = spawnRun(d, { args: ["--report-file", reportFile], env: { FAKE_RPC_LOG: rpcLog } });
      if (!await waitFor(() => fs.existsSync(lockFor(d)))) { p.kill("SIGKILL"); reapSurvivors(); return "the run never took its lock"; }
      const notReady = await readyToSignal(p, stderrSoFar, rpcLog);
      if (notReady) return notReady;
      p.kill(sig);
      const { code, out } = await done;
      const orphans = survivorsAlive();
      const lockLeft = fs.existsSync(lockFor(d));
      reapSurvivors();
      if (orphans.length) return `${sig} left ${orphans.length} descendant(s) behind: ${orphans.join(",")}`;
      if (lockLeft) return `${sig} left the cwd lock at ${lockFor(d)}`;
      if (code !== 1) return `${sig} exited ${code}, expected 1 (the turn did not complete)`;
      let r = null;
      try { r = JSON.parse(out); } catch { return `${sig} produced no JSON report (${out.length} bytes of stdout)`; }
      if (r.turnStatus !== "interrupted") return `the report did not say the turn was interrupted: ${JSON.stringify(r.turnStatus)}`;
      if (!fs.existsSync(reportFile)) return `${sig} left no report at ${reportFile}`;
      if ((fs.statSync(reportFile).mode & 0o777) !== 0o600) return `the signalled run's report is not 0600`;
      if (fs.readFileSync(reportFile, "utf8") !== out)
        return `the signalled run's file and stdout differ (${fs.statSync(reportFile).size} vs ${out.length} bytes)`;
      // The server must be ASKED to end the turn, not merely killed: that is what leaves the thread
      // cleanly resumable after a cancellation.
      let rpc = "";
      try { rpc = fs.readFileSync(rpcLog, "utf8"); } catch {}
      return /turn\/interrupt/.test(rpc) || `the driver never sent turn/interrupt on ${sig}`;
    });
}

test("a run signalled before its thread exists writes the pre-turn report to its file",
  "a seat stopped during setup is the case a caller cannot tell from a seat still starting: the notification fires either way, so the same file has to carry the refusal — with no turn status and no answer invented for a turn that never ran",
  async () => {
    const d = freshDir("sig-pre-thread");
    const reportFile = path.join(tempDir("codex-lock-report-pre-"), "report.json");
    // A codex that never answers `initialize`, so the run is still in setup when the signal arrives.
    const stuck = tempDir("codex-lock-stuck-shim-");
    fs.writeFileSync(path.join(stuck, "codex"), "#!/bin/sh\nexec cat > /dev/null\n", { mode: 0o755 });
    const { p, done, stderrSoFar } = spawnRun(d, { shim: stuck, args: ["--report-file", reportFile] });
    if (!await waitFor(() => /pid=\d+/.test(stderrSoFar()))) { p.kill("SIGKILL"); return "the run never announced its pid"; }
    if (await waitFor(() => /threadId=/.test(stderrSoFar()), 1000)) { p.kill("SIGKILL"); return "the stuck shim started a thread after all"; }
    p.kill("SIGTERM");
    const { code, out } = await done;
    if (fs.existsSync(lockFor(d))) { fs.rmSync(lockFor(d), { force: true }); return "the signalled run left its lock behind"; }
    if (code !== EXIT.TRANSPORT) return `a signal before the thread exited ${code}, expected 4`;
    if (out.trim()) return `a run with no report printed ${out.length} bytes on stdout`;
    let r = null;
    try { r = JSON.parse(fs.readFileSync(reportFile, "utf8")); } catch (e) { return `no parseable report at ${reportFile}: ${e.message}`; }
    if (r.ok !== false || r.exitCode !== EXIT.TRANSPORT) return `the pre-turn report does not carry its verdict: ${JSON.stringify(r)}`;
    if (r.turnStatus !== null || r.answer !== "" || r.threadId !== null)
      return `a turn that never ran was reported as one that did: ${JSON.stringify(r)}`;
    return /interrupted by SIGTERM/.test(String(r.error)) || `the report does not say what ended it: ${JSON.stringify(r.error)}`;
  });

test("the lock is released only after the process group is dead",
  "the next writer must not enter while the previous run's descendants are still dying; waiting for group teardown must precede lock release",
  async () => {
    reapSurvivors();
    // Measured as a DIFFERENCE against a control, not as an absolute: the lock is released microseconds
    // before the process exits either way, so comparing the two events cannot separate a driver that
    // waited from one that did not. What separates them is how long the run takes when the group holds a
    // TERM-ignoring member — the full SIGTERM wait before the SIGKILL escalation, or nothing at all.
    const timeRun = async (shim, label) => {
      const d = freshDir(`group-wait-${label}`);
      const t0 = Date.now();
      const { p, done } = spawnRun(d, { scenario: "happy", shim });
      const { code } = await done;
      return { ms: Date.now() - t0, code, lockLeft: fs.existsSync(lockFor(d)), p };
    };
    const control = await timeRun(shimDir, "control");
    if (control.code !== EXIT.OK) return `the control run exited ${control.code}`;
    const withSurvivor = await timeRun(survivorShim, "survivor");
    const orphans = survivorsAlive();
    reapSurvivors();
    if (withSurvivor.code !== EXIT.OK) return `the survivor run exited ${withSurvivor.code}`;
    if (orphans.length) return `the run left ${orphans.length} descendant(s) behind`;
    if (withSurvivor.lockLeft || control.lockLeft) return "a completed run left its lock behind";
    // The wait is 2 s. 1 s is far above scheduling noise and far below the real bound.
    const extra = withSurvivor.ms - control.ms;
    return extra >= 1000
      ? true
      : `a TERM-ignoring descendant cost the run only ${extra}ms over the control (${control.ms}ms -> ${withSurvivor.ms}ms) — the group was not waited out before the lock was released`;
  });

test("a second --seat-file is a usage error, not a silently ignored one",
  "a second --seat-file is a contradictory declaration and must be refused rather than silently ignored",
  async () => {
    const a = path.join(shimDir, "dup-a.txt"), b = path.join(shimDir, "dup-b.txt");
    fs.writeFileSync(a, `SEAT: read ${shimDir}\n`);
    fs.writeFileSync(b, `SEAT: write ${shimDir}\n`);
    const p = spawn(process.execPath, [DRIVER, "--seat-file", a, "--seat-file", b, "--prompt", "x"],
      { env: { ...process.env, PATH: `${shimDir}:${process.env.PATH}`, CODEX_DELEGATE_STATE_DIR: STATE_DIR },
        stdio: ["ignore", "pipe", "pipe"] });
    let err = "";
    p.stderr.on("data", (d) => { err += d; });
    const code = await new Promise((res) => p.on("close", res));
    if (code !== EXIT.USAGE) return `expected exit 2, got ${code}`;
    return /more than once/.test(err) || `stderr did not name the duplicate: ${err.trim().slice(0, 140)}`;
  });

// Mirrors processIdentity() in the driver, the way lockFor mirrors its hash: the second factor a lock
// records is the holder's process start time, and a test that computed it differently would pass by
// agreeing with itself.
const selfIdentity = () => {
  try {
    const stat = fs.readFileSync(`/proc/${process.pid}/stat`, "utf8");
    const after = stat.slice(stat.lastIndexOf(")") + 2).split(" ");
    if (after[19]) return `starttime:${after[19]}`;
  } catch { /* not Linux */ }
  // Same pinning as the driver: `ps` renders lstart through strftime, so an unpinned TZ or locale makes
  // one process yield different identities in different shells.
  const r = spawnSync("ps", ["-o", "lstart=", "-p", String(process.pid)],
    { encoding: "utf8", env: { ...process.env, LC_ALL: "C", TZ: "UTC" } });
  const t = r.status === 0 ? String(r.stdout ?? "").trim() : "";
  return t ? `lstart:${t}` : null;
};

test("a lock whose pid was recycled by an unrelated live process is not honoured",
  "kill(pid,0) cannot tell the holder from whoever later inherited its number, and lock files outlive reboots and SIGKILLs — so once the pid is reused every write seat on that cwd exits 10 until a human deletes the file",
  async () => {
    const d = freshDir("recycled-pid");
    fs.mkdirSync(LOCK_DIR, { recursive: true, mode: 0o700 });
    // pid 1 is alive and root-owned, so kill(1,0) raises EPERM and counts as alive; the identity beside
    // it is one launchd cannot have.
    fs.writeFileSync(lockFor(d), JSON.stringify({ pid: 1, identity: "lstart:Thu Jan  1 00:00:00 1970",
                                                 cwd: fs.realpathSync(d), started: "old" }));
    const { code, err } = await run(d);
    fs.rmSync(lockFor(d), { force: true });
    return code === EXIT.OK
      ? true
      : `a recycled pid still wedged the directory: exit ${code} (${err.trim().split("\n").pop()?.slice(0, 120)})`;
  });

test("a live holder whose recorded identity still matches is honoured",
  "the second factor must not become a licence to steal every lock: a genuine holder's start time matches, and the directory really is in use",
  async () => {
    const d = freshDir("identity-match");
    fs.mkdirSync(LOCK_DIR, { recursive: true, mode: 0o700 });
    fs.writeFileSync(lockFor(d), JSON.stringify({ pid: process.pid, identity: selfIdentity(),
                                                  cwd: fs.realpathSync(d), started: "now" }));
    const { code } = await run(d);
    fs.rmSync(lockFor(d), { force: true });
    return code === EXIT.BUSY ? true : `a live holder with a matching identity was not honoured: got ${code}`;
  });

test("a lock recorded under one timezone is still held when read under another",
  "ps renders lstart in the caller's timezone and locale; process identity must be pinned so different environments cannot make a live lock appear stale",
  async () => {
    const d = freshDir("identity-tz");
    // A real holder, so the identity in the lock is the DRIVER's own rendering, not one this suite wrote.
    const holder = spawnRun(d, { scenario: "stalled-turn", shim: shimDir, env: { TZ: "Asia/Tokyo" } });
    if (!await waitFor(() => fs.existsSync(lockFor(d)))) { holder.p.kill("SIGKILL"); return "the holder never took the lock"; }
    const { code, err } = await run(d, { env: { TZ: "UTC" } });
    holder.p.kill("SIGKILL");
    await holder.done;
    fs.rmSync(lockFor(d), { force: true });
    return code === EXIT.BUSY
      ? true
      : `a live holder was declared stale across timezones: exit ${code} (${err.trim().split("\n").pop()?.slice(0, 120)})`;
  });

test("a reclaimed stale lock leaves no marker or temp file behind",
  "the marker and the two temp files are this driver's scratch in a SHARED directory: a marker left behind reads to the next run as a peer mid-reclaim, and the reclaim is then skipped on a directory nobody holds",
  async () => {
    const d = freshDir("reclaim-residue");
    fs.mkdirSync(LOCK_DIR, { recursive: true, mode: 0o700 });
    const p = lockFor(d);
    fs.writeFileSync(p, JSON.stringify({ pid: 2147483646, cwd: fs.realpathSync(d), started: "old" }));
    const { code } = await run(d);
    const base = path.basename(p);
    const residue = fs.readdirSync(LOCK_DIR).filter((f) => f.startsWith(base) && f !== base);
    if (residue.length) return `the reclaim left ${residue.join(", ")} behind`;
    return code === EXIT.OK ? true : `expected the stale lock to be reclaimed, got ${code}`;
  });

test("concurrent first runs against a fresh state directory do not race on the shared home's links",
  "concurrent first-runs can both observe a missing home link; the loser of link creation must accept the correctly created peer link",
  async () => {
    const d = freshDir("home-race");
    // Fan out repeated first-runs to expose the small window for concurrent link creation.
    const rounds = 4, width = 16, bad = [];
    for (let r = 0; r < rounds; r++) {
      // Fresh every round: the race exists only on the FIRST run against a state directory.
      const state = path.join(STATE_DIR, `home-race-${r}`);
      const seats = Array.from({ length: width }, () => new Promise((res) => {
        const p = spawn(process.execPath,
          [DRIVER, "--level", "read", "--cwd", d, "--timeout", "30",
           "--prompt", "irrelevant, the server is scripted"],
          { env: { ...process.env, PATH: `${shimDir}:${process.env.PATH}`, FAKE_SCENARIO: "happy",
                   CODEX_DELEGATE_STATE_DIR: state },
            stdio: ["ignore", "ignore", "pipe"] });
        let err = "";
        p.stderr.on("data", (x) => { err += x; });
        p.on("close", (code) => res({ code, err }));
      }));
      // The WHOLE last line: a 110-character slice of these refusals stops inside the path, so a failure
      // here could not say which of the two link refusals fired, and the finding could not be chased.
      for (const { code, err } of await Promise.all(seats))
        if (code !== EXIT.OK) bad.push(`exit ${code}: ${err.trim().split("\n").pop()}`);
    }
    return bad.length
      ? `${bad.length} of ${rounds * width} concurrent first runs failed — ${[...new Set(bad)].slice(0, 3).join(" | ")}`
      : true;
  });

test("a cancelled config probe does not empty the shared home's config",
  "cancelling a probe must not count as a successful empty config read and replace the shared last-known-good config with account defaults",
  async () => {
    const d = freshDir("probe-cancel");
    const state = path.join(STATE_DIR, "probe-cancel-state");
    const cfg = path.join(state, "home", "config.toml");
    fs.mkdirSync(path.dirname(cfg), { recursive: true, mode: 0o700 });
    const seeded = 'model = "seeded-model"\nmodel_reasoning_effort = "high"\n';
    fs.writeFileSync(cfg, seeded);
    const p = spawn(process.execPath,
      [DRIVER, "--level", "read", "--cwd", d, "--timeout", "30", "--prompt", "scripted"],
      { env: { ...process.env, PATH: `${shimDir}:${process.env.PATH}`, FAKE_SCENARIO: "happy",
               FAKE_CONFIG_HANG: "1", CODEX_DELEGATE_STATE_DIR: state },
        stdio: ["ignore", "ignore", "pipe"] });
    // Inside the probe's own 5 s bell, and long enough after the spawn that the probe has started.
    await new Promise((r) => setTimeout(r, 700));
    p.kill("SIGINT");
    await new Promise((res) => p.on("close", res));
    const after = fs.existsSync(cfg) ? fs.readFileSync(cfg, "utf8") : "(removed)";
    return after === seeded ? true : `the cancelled probe rewrote the shared config: ${JSON.stringify(after.slice(0, 90))}`;
  });

test("a signal during --verify kills the verifier's process group and still reports",
  "signals must interrupt an active verifier and terminate its process group rather than wait for the verifier's full budget",
  async () => {
    const d = freshDir("verify-signal");
    const pidFile = path.join(d, "verify.pid");
    const t0 = Date.now();
    const { p, done } = spawnRun(d, { scenario: "happy", shim: shimDir,
      // The backgrounded sleep is the point: killing only the verifier's shell leaves it behind, and
      // only a GROUP kill reaches it.
      args: ["--verify", `sleep 30 & echo $! > ${pidFile}; wait`] });
    if (!await waitFor(() => { try { return fs.readFileSync(pidFile, "utf8").trim().length > 0; } catch { return false; } }, 20000))
      { p.kill("SIGKILL"); return "the verifier never started"; }
    p.kill("SIGINT");
    const { code, out } = await done;
    const ms = Date.now() - t0;
    const vpid = Number(fs.readFileSync(pidFile, "utf8").trim());
    let alive = true;
    try { process.kill(vpid, 0); } catch { alive = false; }
    if (alive) { try { process.kill(vpid, "SIGKILL"); } catch {} return "the verifier's backgrounded child outlived the run"; }
    if (ms > 20000) return `the signal was deferred for ${ms}ms — the verifier ran to completion`;
    let report = null;
    try { report = JSON.parse(out); } catch {}
    if (!report) return `the interrupted verifier left no report at all (exit ${code})`;
    return report.verify?.measured === false
      ? true
      : `a killed verifier was reported as measured: ${JSON.stringify(report.verify)}`;
  });

test("--verify-sandboxed runs the verifier through `codex sandbox` under the read profile",
  "an opt-in sandbox that silently ran the verifier with the caller's own rights would be worse than none: the invocation has to carry the profile, every one of its -c definitions and the cwd, and hand the verifier's own exit code back. Which SETTING the egress definition carries is measured in cli.test.mjs, at both of them; what is checked here is that none of the three is missing",
  async () => {
    const d = freshDir("verify-sandbox");
    const rpcLog = path.join(d, "sandbox.log");
    const { code, out } = await run(d, { args: ["--verify", "exit 5", "--verify-sandboxed"],
      env: { FAKE_SANDBOX: "1", FAKE_RPC_LOG: rpcLog } });
    const log = fs.existsSync(rpcLog) ? fs.readFileSync(rpcLog, "utf8") : "";
    const line = log.split("\n").find((l) => l.startsWith("sandbox:")) ?? "";
    if (!line) return "the verifier did not go through `codex sandbox`";
    for (const needle of ["-P codex_delegate_read", `-C ${fs.realpathSync(d)}`,
                          'permissions.codex_delegate_read.extends=":read-only"',
                          'permissions.codex_delegate_read.filesystem={":tmpdir"="write"}',
                          "permissions.codex_delegate_read.network={enabled=true}"])
      if (!line.includes(needle)) return `the sandbox invocation lacks ${needle}: ${line}`;
    let report = null;
    try { report = JSON.parse(out); } catch {}
    if (report?.verify?.exitCode !== 5 || report?.verify?.sandboxed !== true)
      return `the sandboxed verifier's exit code was not passed through: ${JSON.stringify(report?.verify)}`;
    return code === EXIT.VERIFY_FAILED ? true : `expected exit 9 for a failing verifier, got ${code}`;
  });

test("the answer reaches the answer log before the turn ends, so a SIGKILL cannot take it with it",
  "a delivered answer must be persisted before turn completion so it survives a SIGKILL that leaves no report",
  async () => {
    const d = freshDir("eager-answer");
    const answerFile = path.join(STATE_DIR, "answers", "thr_root.md");
    // Every happy case in this suite writes the same path (one fixture thread id), so the file must be
    // gone before the run or its mere existence proves nothing.
    fs.rmSync(answerFile, { force: true });
    // The turn stalls with the answer already delivered; --timeout 60 keeps the deadline far away, so
    // the only thing that can have written the file is the item's own arrival.
    const { p, done } = spawnRun(d, { scenario: "answer-then-stall", shim: shimDir, args: ["--timeout", "60"] });
    const landed = await waitFor(() => fs.existsSync(answerFile), 15000);
    p.kill("SIGKILL");
    const { code } = await done;
    if (!landed) return "the answer never reached the answer log while the run was still alive";
    let text = "";
    try { text = fs.readFileSync(answerFile, "utf8"); } catch (e) { return `the answer log is unreadable after the kill: ${e.message}`; }
    if (!text.includes("persisted before the kill")) return `the answer log does not hold the answer: ${JSON.stringify(text.slice(0, 80))}`;
    // A SIGKILL leaves no report by construction; the point is that the answer outlived the process.
    return code === 0 ? "the run exited cleanly, so the kill never happened" : true;
  });

test("a lock is reclaimed only when the driver AND its app-server group are both gone",
  "a SIGKILLed driver leaves codex still writing the tree: reclaiming on the driver's pid alone lets a second run in beside it, and two seats editing one checkout is the failure the lock exists for",
  async () => {
    const d = freshDir("pgid-reclaim");
    fs.mkdirSync(LOCK_DIR, { recursive: true, mode: 0o700 });
    // Its own group leader, so the negative pid names exactly it.
    const group = spawn(process.execPath, ["-e", "setTimeout(() => {}, 20000)"],
      { detached: true, stdio: "ignore" });
    group.unref();
    const plant = () => fs.writeFileSync(lockFor(d), JSON.stringify({
      // Above the system maximum: dead, and not recyclable into existence either.
      pid: 2147483646, cwd: fs.realpathSync(d), started: "old", appServerPgid: group.pid }));
    try {
      plant();
      const busy = await run(d);
      if (busy.code !== EXIT.BUSY)
        return `a lock whose codex group is still alive was reclaimed anyway (exit ${busy.code})`;
      if (!new RegExp(`codex process group ${group.pid}`).test(busy.err))
        return `the refusal did not name the orphaned group: ${busy.err.trim().slice(0, 200)}`;
      // The group dies; the same lock is now abandoned by both halves of the rule.
      try { process.kill(-group.pid, "SIGKILL"); } catch {}
      for (const end = Date.now() + 5000; Date.now() < end; ) {
        try { process.kill(-group.pid, 0); } catch { break; }
        await new Promise((r) => setTimeout(r, 25));
      }
      plant();
      const free = await run(d);
      if (free.code !== EXIT.OK)
        return `a lock whose driver and group are both gone was not reclaimed (exit ${free.code}): ${free.err.trim().slice(0, 200)}`;
    } finally {
      try { process.kill(-group.pid, "SIGKILL"); } catch {}
      fs.rmSync(lockFor(d), { force: true });
    }
    return true;
  });

test("a lock whose app-server group was recycled by an unrelated process refuses the run",
  "the pgid half of the reclaim rule cannot tell a live codex group from a stranger the OS handed the same number, and the safe answer to that ambiguity is BUSY: guessing the other way admits a second writer into a directory a live seat may be editing",
  async () => {
    const d = freshDir("pgid-recycled");
    fs.mkdirSync(LOCK_DIR, { recursive: true, mode: 0o700 });
    // Its own group leader, and nothing to do with codex — which is exactly what a recycled pgid names.
    const stranger = spawn(process.execPath, ["-e", "setTimeout(() => {}, 20000)"],
      { detached: true, stdio: "ignore" });
    stranger.unref();
    const body = JSON.stringify({
      // Above the system maximum: the driver that took this lock is gone and cannot come back.
      pid: 2147483646, cwd: fs.realpathSync(d), started: "old", appServerPgid: stranger.pid });
    fs.writeFileSync(lockFor(d), body);
    try {
      const { code, err } = await run(d);
      if (code !== EXIT.BUSY)
        return `a recycled group number was resolved by taking the lock: exit ${code} (${err.trim().slice(0, 200)})`;
      if (fs.readFileSync(lockFor(d), "utf8") !== body)
        return "the refused run rewrote the lock it did not take, so the next run reads it as its own";
      const wrote = fs.readdirSync(d);
      if (wrote.length) return `the refused run wrote into the protected directory: ${JSON.stringify(wrote)}`;
    } finally {
      try { process.kill(-stranger.pid, "SIGKILL"); } catch {}
      fs.rmSync(lockFor(d), { force: true });
    }
    return true;
  });

const failed = await runCases(CASES);

// Several cases plant locks in the suite's own state directory on purpose. Compute their paths while
// the work directories still exist, or the residue outlives the suite.
for (const d of workDirs) {
  try { for (const suffix of ["", ".reclaim"]) fs.rmSync(`${lockFor(d)}${suffix}`, { recursive: true, force: true }); } catch {}
  fs.rmSync(d, { recursive: true, force: true });
}
// Remove every tempdir this suite made, including STATE_DIR and the survivor shim.
for (const d of [shimDir, STATE_DIR, survivorShim, survivorPids]) fs.rmSync(d, { recursive: true, force: true });
process.exit(summarize(failed, CASES.length));
