#!/usr/bin/env node
// Lock regression tests for scripts/driver.mjs.
//
// The protocol suite cannot reach any of this: it runs every case at --level read, and read level never
// locks. Each case here is a state a real directory has actually been found in, or one the acquire path
// demonstrably mishandled before — a directory or a FIFO sitting where the lock file should be, a lock
// naming a pid that belongs to someone else, a lock released by a peer in the microsecond between our
// failed create and our read.
//
//   node evals/lock.test.mjs
//
// Exit 0 if every case matches. Uses the same scripted server as protocol.test.mjs, so no model is called.

import { spawn, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DRIVER = path.join(HERE, "..", "scripts", "driver.mjs");
const FAKE = path.join(HERE, "fake-app-server.mjs");
const EXIT = { OK: 0, USAGE: 2, TRANSPORT: 4, VERIFY_FAILED: 9, BUSY: 10 };

const LOCK_DIR = path.join(os.homedir(), ".codex-delegate", "locks");
// Must mirror acquireLock exactly: the key is the directory's IDENTITY (dev:ino), not its spelling, so
// that a case-variant or renamed path cannot produce a second lock for one directory.
const lockFor = (dir) => {
  const st = fs.statSync(dir);
  return path.join(LOCK_DIR, `${crypto.createHash("sha256").update(`${st.dev}:${st.ino}`).digest("hex")}.lock`);
};

const shimDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-lock-shim-"));
fs.writeFileSync(path.join(shimDir, "codex"),
  `#!/bin/sh\nexec "${process.execPath}" "${FAKE}" "$@"\n`, { mode: 0o755 });

const workDirs = [];
function freshDir(name) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), `codex-lock-${name}-`));
  workDirs.push(d);
  return d;
}

// --level write, so acquireLock actually runs. A slow scenario is used where a case needs the lock held
// while a second run tries for it.
function run(dir, { scenario = "happy", timeout = 30, args = [], env = {} } = {}) {
  return new Promise((resolve) => {
    const p = spawn(process.execPath,
      [DRIVER, "--level", "write", "--cwd", dir, "--timeout", String(timeout), "--json",
       "--allow-no-commands", ...args, "--prompt", "irrelevant, the server is scripted"],
      { env: (() => {
          const e = { ...process.env, PATH: `${shimDir}:${process.env.PATH}`, FAKE_SCENARIO: scenario, ...env };
          // `undefined` in a spawn env is stringified, so an unset variable has to be deleted outright.
          for (const [k, v] of Object.entries(env)) if (v === undefined) delete e[k];
          return e;
        })(),
        stdio: ["ignore", "pipe", "pipe"] });
    let out = "", err = "";
    p.stdout.on("data", (d) => { out += d; });
    p.stderr.on("data", (d) => { err += d; });
    p.on("close", (code) => resolve({ code, out, err }));
  });
}

const CASES = [];
const test = (name, why, fn) => CASES.push({ name, why, fn });

test("lock is not written into the protected directory, at any moment during the run",
  "at --level write with --commit a turn's `git add -A` stages and commits the driver's own lock file — so it is the presence DURING the turn that matters, not what survives it",
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
  "readFileSync threw EISDIR out of acquireLock and landed in the catch-all as exit 4 — claiming codex crashed before codex was spawned",
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
    if (mk.status !== 0) return true;   // no mkfifo on this platform; nothing to assert
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
  "the reclaim path is where mutual exclusion broke: a peer that judged the STALE lock dead arrives late and deletes the FRESH lock that replaced it. With the old unconditional unlink this reached three simultaneous holders",
  async () => {
    // Counting how many runs exit 0 does NOT measure this: runs that acquire in sequence all legitimately
    // succeed, which is exactly what a lock is for. So the critical section is probed directly instead.
    // --verify executes in the locked cwd while the lock is still held, and `mkdir` is atomic — a second
    // holder's mkdir therefore fails, turning any overlap into a VERIFY_FAILED that cannot be missed.
    // Repeated because the race is probabilistic; the old code violated in roughly a quarter of rounds.
    const CRIT = "mkdir .crit 2>/dev/null || exit 9; sleep 0.35; rmdir .crit";
    // Rounds and width are tuned to the observed violation rate, not picked for looking thorough: the
    // subtler failure (reclaiming without serialising) showed up in roughly 1 acquisition in 14, so a
    // handful of narrow rounds would pass by luck. This costs ~30s and is the only test of the guarantee
    // the whole lock exists for.
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
  "fixing the COMPARISON to use dev:ino left the ANCHOR on process.env.HOME, which is the same bug one level up: with HOME unset or pointed at a decoy, --cwd $HOME at write level exited 0 and the turn got the whole home directory",
  async () => {
    const real = os.userInfo().homedir;
    const decoy = freshDir("decoy-home");
    for (const [label, env] of [["unset", { HOME: undefined }], ["decoy", { HOME: decoy }]]) {
      const { code } = await run(real, { env });
      if (code !== EXIT.USAGE) return `HOME ${label}: --cwd ${real} returned ${code}, expected 2`;
    }
    return true;
  });

test("two runs on one cwd take one lock however $HOME moves",
  "the lock key was rooted at os.homedir(), which PREFERS $HOME — so two runs under different HOME values took two different locks in two different homes and both proceeded",
  async () => {
    const d = freshDir("home-split");
    const decoy = freshDir("decoy-home2");
    fs.mkdirSync(LOCK_DIR, { recursive: true, mode: 0o700 });
    fs.writeFileSync(lockFor(d), JSON.stringify({ pid: process.pid, cwd: fs.realpathSync(d), started: "now" }));
    const { code } = await run(d, { env: { HOME: decoy } });
    fs.rmSync(lockFor(d), { force: true });
    if (fs.existsSync(path.join(decoy, ".codex-delegate")))
      return "the run created a second lock home under the decoy HOME";
    return code === EXIT.BUSY ? true : `a run under a decoy HOME walked past a held lock, got ${code}`;
  });

test("the write sandbox is exactly what the flags asked for, echoed back",
  "the whole write-level sandbox configuration was pinned by nothing: deleting it from the driver left every case green, because the fixture hardcoded an empty root list instead of echoing what it was sent",
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
  "the server subtracts the workspace root from writableRoots, so a driver that sends it compared [cwd] against [] and refused a legitimate invocation with exit 4 — and SKILL.md invited exactly that redundancy",
  async () => {
    const d = freshDir("wr-self");
    const { code, err } = await run(d, { args: ["--writable", d] });
    return code === EXIT.OK ? true : `--cwd X --writable X exited ${code}: ${err.trim().slice(0, 130)}`;
  });

test("a writable root named twice is not a failure",
  "the server dedupes the roots it is given, so a driver that sends /x twice compared two entries against the server's one and reported exit 4 — a permanent flag redundancy dressed up as `codex crashed`",
  async () => {
    const d = freshDir("wr-dupe");
    const extra = freshDir("wr-dupe-root");
    const { code, err } = await run(d, { args: ["--writable", extra, "--writable", `${extra}/`] });
    return code === EXIT.OK ? true : `a duplicated --writable exited ${code}: ${err.trim().slice(0, 130)}`;
  });

test("a hermetic HOME under the workspace does not make the workspace unusable",
  "walking the ancestors of $HOME refused a standard hermetic-build layout outright: with HOME=$W/.home the workspace $W itself could not be written, with no override and a message that named the home rather than the anchor",
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
  "read level was guarded and write was not — an asymmetry, not a decision. Write is the level that can damage a repository, and it accepted whatever network setting the server chose to report",
  async () => {
    const d = freshDir("write-widened");
    const { code, err } = await run(d, { scenario: "write-networked" });
    if (code !== EXIT.TRANSPORT) return `expected 4 for a sandbox granting unrequested egress, got ${code}`;
    if (!/networkAccess/.test(err)) return `the refusal must name what differed; got: ${err.trim().slice(0, 140)}`;
    return true;
  });

test("the home directory is refused under every spelling of it",
  "checkRoot string-compared against $HOME, and macOS realpath does not normalise letter case — so `--cwd /users/ruliny` sailed past the guard and started a write-level turn with access to the whole home directory, while `/Users/ruliny` was correctly refused",
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
  "realpath normalises symlinks but not letter case, so on a case-insensitive volume one directory had two lock names and the second run walked in",
  async () => {
    const parent = freshDir("case");
    const upper = path.join(parent, "Worktree");
    const lower = path.join(parent, "worktree");
    fs.mkdirSync(upper);
    let sameDir = false;
    try { sameDir = fs.statSync(upper).ino === fs.statSync(lower).ino; } catch {}
    if (!sameDir) return true;   // case-sensitive filesystem: the aliasing does not exist here
    fs.mkdirSync(LOCK_DIR, { recursive: true, mode: 0o700 });
    fs.writeFileSync(lockFor(upper), JSON.stringify({ pid: process.pid, cwd: upper, started: "now" }));
    const { code } = await run(lower);
    fs.rmSync(lockFor(upper), { force: true });
    return code === EXIT.BUSY ? true : `expected 10 via the case-variant spelling, got ${code}`;
  });

let failed = 0;
for (const c of CASES) {
  let verdict;
  try { verdict = await c.fn(); }
  catch (e) { verdict = `threw: ${e.message}`; }
  if (verdict === true) console.log(`ok    ${c.name}`);
  else { failed++; console.log(`FAIL  ${c.name}: ${verdict}\n      ${c.why}`); }
}

// Several cases plant locks under $HOME on purpose. Compute their paths while the directories still
// exist, or the residue outlives the suite and accumulates in the user's home for every run.
for (const d of workDirs) {
  try { for (const suffix of ["", ".reclaim"]) fs.rmSync(`${lockFor(d)}${suffix}`, { recursive: true, force: true }); } catch {}
  fs.rmSync(d, { recursive: true, force: true });
}
fs.rmSync(shimDir, { recursive: true, force: true });
console.log(failed ? `\n${failed}/${CASES.length} failed` : `\nall ${CASES.length} passed`);
process.exit(failed ? 1 : 0);
