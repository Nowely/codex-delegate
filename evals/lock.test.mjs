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
const DRIVER = path.join(HERE, "..", "skills", "codex-delegate", "scripts", "driver.mjs");
const FAKE = path.join(HERE, "fake-app-server.mjs");
const EXIT = { OK: 0, USAGE: 2, TRANSPORT: 4, VERIFY_FAILED: 9, BUSY: 10 };

// A state directory of this suite's own. Without it every case wrote into the caller's real
// ~/.codex-delegate — the locks it plants, the isolated Codex home it rewrites, the answer log it
// prunes — so running the tests mutated production state, and a suite run concurrent with a real
// delegation replaced that delegation's inherited config with the fixture's `model = "fake-model"`.
// Measured: after a suite run, ~/.codex-delegate/home/config.toml holds exactly that.
//
// It does NOT weaken the case below that pins the lock dir against a moving $HOME: a driver that
// regressed to os.homedir() would ignore this variable and put its lock under the decoy home, which is
// precisely what that case looks for.
const STATE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "codex-lock-state-"));
const LOCK_DIR = path.join(STATE_DIR, "locks");
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
      [DRIVER, "--level", "write", ...(dir === null ? [] : ["--cwd", dir]),
       "--timeout", String(timeout), "--json", "--allow-no-commands", ...args, "--prompt", "irrelevant, the server is scripted"],
      { env: (() => {
          const e = { ...process.env, PATH: `${shimDir}:${process.env.PATH}`, FAKE_SCENARIO: scenario,
                      CODEX_DELEGATE_STATE_DIR: STATE_DIR, ...env };
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

test("parseArgs rejects the listed invalid arguments before the turn starts",
  "each usage guard is part of the CLI contract; letting any one through either starts a turn with unintended rights or fails later for a misleading reason",
  async () => {
    // A real repository makes the --commit/--level check independent of the later
    // "--commit needs a git repository" guard.
    const d = freshDir("invalid-args");
    const init = spawnSync("git", ["init", "-q", d], { encoding: "utf8" });
    if (init.status !== 0) return "git init failed: " + String(init.stderr).trim();
    const invalid = [
      { label: "missing --cwd", dir: null, args: [], flags: ["--cwd"], message: "--cwd is required" },
      { label: "unknown --level", dir: d, args: ["--level", "execute"], flags: ["--level"], message: "--level must be one of" },
      { label: "non-numeric --timeout", dir: d, args: ["--timeout", "soon"], flags: ["--timeout"], message: "--timeout must be a positive number" },
      { label: "zero --timeout", dir: d, args: ["--timeout", "0"], flags: ["--timeout"], message: "--timeout must be a positive number" },
      { label: "over-limit --timeout", dir: d, args: ["--timeout", "7201"], flags: ["--timeout"], message: "--timeout must be a positive number" },
      { label: "unknown --effort", dir: d, args: ["--effort", "heroic"], flags: ["--effort"], message: "--effort must be one of" },
      { label: "--commit at read level", dir: d, args: ["--level", "read", "--commit"], flags: ["--commit", "--level"], message: "--commit requires --level write" },
      { label: "--ephemeral with --resume", dir: d, args: ["--ephemeral", "--resume", "thr_existing"], flags: ["--ephemeral", "--resume"], message: "--ephemeral and --resume are contradictory" },
      { label: "invalid --expect-command regexp", dir: d, args: ["--expect-command", "["], flags: ["--expect-command"], message: "--expect-command is not a valid regular expression" },
      { label: "unknown --web-search", dir: d, args: ["--web-search", "fresh"], flags: ["--web-search"], message: "--web-search must be one of" },
      { label: "empty flag value", dir: d, args: ["--model", ""], flags: ["--model"], message: "--model requires a non-empty value" },
      { label: "flag-like value", dir: d, args: ["--model", "--json"], flags: ["--model"], message: "--model requires a non-empty value" },
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

test("--commit applies the protected-root guard to the resolved git common dir",
  "the common dir becomes an extra writable root, so resolving it must not bypass checkRoot",
  async () => {
    const d = freshDir("commit-guard-cwd");
    const bin = freshDir("commit-guard-bin");
    fs.writeFileSync(path.join(bin, "git"),
      "#!/bin/sh\nprintf '%s\\n' \"$FAKE_GIT_COMMON_DIR\"\n", { mode: 0o755 });
    const root = fs.realpathSync(os.userInfo().homedir);
    const { code, err } = await run(d, {
      args: ["--commit"],
      env: {
        PATH: bin + ":" + shimDir + ":" + process.env.PATH,
        FAKE_GIT_COMMON_DIR: root,
      },
    });
    if (code !== EXIT.USAGE)
      return "--commit with protected common dir " + root + " returned " + code + ", expected 2";
    return err.includes("refusing to grant write access to " + root + ":") ? true : "the refusal did not name " + root + ": " + err.trim().slice(0, 160);
  });

test("--commit sends the main clone's common dir from a linked worktree as writable",
  "using the per-worktree git dir, or resolving the common dir without pushing it into roots, prevents commits from a linked worktree",
  async () => {
    const main = freshDir("commit-main");
    let g = spawnSync("git", ["init", "-q", main], { encoding: "utf8" });
    if (g.status !== 0) return "git init failed: " + String(g.stderr).trim();
    fs.writeFileSync(path.join(main, "seed"), "seed\n");
    g = spawnSync("git", ["-C", main, "add", "seed"], { encoding: "utf8" });
    if (g.status !== 0) return "git add failed: " + String(g.stderr).trim();
    g = spawnSync("git", ["-C", main, "-c", "user.name=Lock Eval", "-c", "user.email=lock@example.invalid",
      "commit", "-qm", "seed"], { encoding: "utf8" });
    if (g.status !== 0) return "git commit failed: " + String(g.stderr).trim();
    const linked = path.join(freshDir("commit-linked-parent"), "worktree");
    g = spawnSync("git", ["-C", main, "worktree", "add", "--detach", linked, "HEAD"], { encoding: "utf8" });
    if (g.status !== 0) return "git worktree add failed: " + String(g.stderr).trim();
    g = spawnSync("git", ["-C", linked, "rev-parse", "--path-format=absolute", "--git-common-dir"],
      { encoding: "utf8" });
    if (g.status !== 0) return "git common-dir query failed: " + String(g.stderr).trim();
    const common = fs.realpathSync(g.stdout.trim());
    const mainGit = fs.realpathSync(path.join(main, ".git"));
    if (common !== mainGit)
      return "test setup expected " + mainGit + " as the linked common dir, got " + common;
    const { code, out, err } = await run(linked, { args: ["--commit"] });
    if (code !== EXIT.OK)
      return "linked-worktree --commit exited " + code + ": " + err.trim().slice(0, 180);
    let report = null;
    try { report = JSON.parse(out); } catch {}
    if (!report) return "linked-worktree --commit produced no JSON report";
    const sent = report.sandbox?.writableRoots;
    if (JSON.stringify(sent) !== JSON.stringify([common]))
      return "writable roots were " + JSON.stringify(sent) + ", expected the main common dir " + common;
    return err.includes(common)
      ? true
      : "the --commit notice did not name " + common + ": " + err.trim().slice(0, 160);
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

// A real repository for the --worktree cases: the driver creates and disposes of the worktree itself,
// so these pin the whole lifecycle — clean removal, dirty preservation, timeout preservation.
function freshRepo(name) {
  const d = freshDir(name);
  let g = spawnSync("git", ["init", "-q", d], { encoding: "utf8" });
  if (g.status !== 0) return null;
  fs.writeFileSync(path.join(d, "seed"), "seed\n");
  g = spawnSync("git", ["-C", d, "add", "seed"], { encoding: "utf8" });
  if (g.status !== 0) return null;
  g = spawnSync("git", ["-C", d, "-c", "user.name=Lock Eval", "-c", "user.email=lock@example.invalid",
    "commit", "-qm", "seed"], { encoding: "utf8" });
  return g.status === 0 ? d : null;
}
const worktreesUnder = (repo) => {
  const dir = path.join(repo, ".claude", "worktrees");
  try { return fs.readdirSync(dir); } catch { return []; }
};

test("--worktree removes a clean tree and reports the disposition",
  "the manual lifecycle was ignored often enough to leave 64 worktrees and 41 GB behind; parity with isolation:\"worktree\" means the driver itself removes what it can prove worthless",
  async () => {
    const repo = freshRepo("wt-clean");
    if (!repo) return "git setup failed";
    const { code, out, err } = await run(null, { args: ["--worktree", repo] });
    if (code !== EXIT.OK) return `a clean --worktree run exited ${code}: ${err.trim().slice(0, 160)}`;
    let r = null; try { r = JSON.parse(out); } catch {}
    if (!r) return "no JSON report";
    if (r.worktreeRemoved !== true) return `a provably clean tree was not removed: ${JSON.stringify({ removed: r.worktreeRemoved, why: r.worktreePreserved })}`;
    const left = worktreesUnder(repo);
    if (left.length) return `worktree directories left behind: ${JSON.stringify(left)}`;
    if (!err.includes("created worktree")) return "stderr never announced the worktree";
    return true;
  });

test("--worktree harvests a completed turn's work and removes the tree",
  "the routine outcome of a write seat — a tree holding the work — used to hand the operator a harvest-then-force-remove chore that no native worktree subagent asks for; the driver now harvests (staged, unstaged AND untracked) and removes",
  async () => {
    const repo = freshRepo("wt-dirty");
    if (!repo) return "git setup failed";
    // The verifier runs inside the worktree after the turn — the cheapest honest way to dirty the tree.
    // Both an untracked file AND a STAGED tracked change: dirtiness is decided by `status --porcelain`,
    // which sees staged work, so the harvest must see it too.
    const { code, out } = await run(null, { args: ["--worktree", repo, "--verify",
      "printf 'untracked-content\\n' > untracked-work.txt && printf 'staged-line\\n' >> seed && git add seed"] });
    if (code !== EXIT.OK) return `the run exited ${code}`;
    let r = null; try { r = JSON.parse(out); } catch {}
    if (!r) return "no JSON report";
    try {
      if (r.worktreeHarvested !== true) return `the work was not harvested: ${JSON.stringify(r.worktreePreserved)}`;
      if (r.worktreeRemoved !== true) return `a harvested tree was not removed: ${JSON.stringify(r.worktreePreserved)}`;
      if (fs.existsSync(r.worktreePath)) return "the tree still exists after removal";
      if (worktreesUnder(repo).length) return `worktree directories left behind: ${JSON.stringify(worktreesUnder(repo))}`;
      if (!r.worktreeDiffStat || !/seed/.test(r.worktreeDiffStat))
        return `the diff stat does not show the staged change: ${JSON.stringify(r.worktreeDiffStat)}`;
      let diff = "";
      try { diff = fs.readFileSync(r.worktreeDiffPath, "utf8"); } catch {}
      if (!/\+staged-line/.test(diff))
        return `the saved diff lost the staged change (worktreeDiffPath=${JSON.stringify(r.worktreeDiffPath)})`;
      if (!r.worktreeUntrackedPath) return "no untracked archive was saved";
      const listing = spawnSync("tar", ["-tzf", r.worktreeUntrackedPath], { encoding: "utf8" });
      if (listing.status !== 0 || !/untracked-work\.txt/.test(listing.stdout))
        return `the untracked archive lost the file: ${String(listing.stdout).trim()}`;
    } finally {
      if (r?.worktreePath && fs.existsSync(r.worktreePath))
        spawnSync("git", ["-C", repo, "worktree", "remove", "--force", r.worktreePath]);
      for (const p of [r?.worktreeDiffPath, r?.worktreeUntrackedPath]) if (p) fs.rmSync(p, { force: true });
    }
    return true;
  });

test("--worktree harvests a seat's COMMITS, not just its diff, before removing the tree",
  "the harvest diffed against HEAD, which by definition excludes what the seat committed — and a detached worktree's removal strands those commits behind no ref. A --worktree --commit seat's whole history was destroyed while the report said the work had been harvested",
  async () => {
    const repo = freshRepo("wt-commits");
    if (!repo) return "git setup failed";
    // The verifier runs in the tree: commit one change, leave another uncommitted, and an untracked file.
    const { code, out } = await run(null, { args: ["--worktree", repo, "--verify",
      "printf 'committed\\n' >> seed && git -c user.email=a@b -c user.name=a commit -qam seat-work"
      + " && printf 'uncommitted\\n' >> seed && printf 'scratch\\n' > scratch.txt"] });
    if (code !== EXIT.OK) return `the run exited ${code}`;
    let r = null; try { r = JSON.parse(out); } catch {}
    if (!r) return "no JSON report";
    try {
      if (r.worktreeRemoved !== true) return `the tree was not removed: ${JSON.stringify(r.worktreePreserved)}`;
      if (!r.worktreeCommitsRef) return "the seat's commits were not preserved under a ref";
      const log = spawnSync("git", ["-C", repo, "log", "--format=%s", r.worktreeCommitsRef], { encoding: "utf8" });
      if (log.status !== 0 || !/seat-work/.test(log.stdout))
        return `the preserved ref does not carry the commit: ${String(log.stdout || log.stderr).trim().slice(0, 160)}`;
      let diff = "";
      try { diff = fs.readFileSync(r.worktreeDiffPath, "utf8"); } catch { return "no diff was saved"; }
      // Diffed against the tree's BASE, so one patch carries the committed and the uncommitted line.
      if (!/\+committed/.test(diff) || !/\+uncommitted/.test(diff))
        return `the diff lost committed or uncommitted work: ${JSON.stringify(diff.slice(0, 200))}`;
    } finally {
      if (r?.worktreePath && fs.existsSync(r.worktreePath))
        spawnSync("git", ["-C", repo, "worktree", "remove", "--force", r.worktreePath]);
      for (const p of [r?.worktreeDiffPath, r?.worktreeUntrackedPath]) if (p) fs.rmSync(p, { force: true });
    }
    return true;
  });

test("--worktree keeps the commits of a seat that left the tree CLEAN",
  "a --commit seat that commits everything leaves `git status --porcelain` empty, so the clean branch removed the tree and stranded those commits behind no ref — the tidier the seat, the worse the loss",
  async () => {
    const repo = freshRepo("wt-clean-commits");
    if (!repo) return "git setup failed";
    // Commits everything and leaves nothing behind: porcelain is empty afterwards.
    const { code, out } = await run(null, { args: ["--worktree", repo, "--verify",
      "printf 'all committed\\n' >> seed && git -c user.email=a@b -c user.name=a commit -qam tidy-seat"] });
    if (code !== EXIT.OK) return `the run exited ${code}`;
    let r = null; try { r = JSON.parse(out); } catch {}
    if (!r) return "no JSON report";
    try {
      if (r.worktreeRemoved !== true) return `the tree was not removed: ${JSON.stringify(r.worktreePreserved)}`;
      if (!r.worktreeCommitsRef) return "a clean tree's commits were stranded: no ref was created";
      const log = spawnSync("git", ["-C", repo, "log", "--format=%s", r.worktreeCommitsRef], { encoding: "utf8" });
      if (log.status !== 0 || !/tidy-seat/.test(log.stdout))
        return `the preserved ref does not carry the commit: ${String(log.stdout || log.stderr).trim().slice(0, 160)}`;
    } finally {
      if (r?.worktreePath && fs.existsSync(r.worktreePath))
        spawnSync("git", ["-C", repo, "worktree", "remove", "--force", r.worktreePath]);
      for (const p of [r?.worktreeDiffPath, r?.worktreeUntrackedPath]) if (p) fs.rmSync(p, { force: true });
    }
    return true;
  });

test("--worktree still preserves the tree when the turn did not complete, even a dirty one",
  "the harvest-and-remove path is for COMPLETED turns only: a failed turn's tree may be mid-write, and removal on anything but a settled state is data loss",
  async () => {
    const repo = freshRepo("wt-failed");
    if (!repo) return "git setup failed";
    const { code, out } = await run(null, { scenario: "turn-failed", args: ["--worktree", repo] });
    if (code !== 1) return `expected exit 1, got ${code}`;
    let r = null; try { r = JSON.parse(out); } catch {}
    try {
      if (!r) return "no JSON report";
      if (r.worktreeRemoved !== false) return "a failed turn's tree was removed";
      if (!fs.existsSync(r.worktreePath)) return "the tree is gone despite worktreeRemoved:false";
    } finally {
      if (r?.worktreePath) spawnSync("git", ["-C", repo, "worktree", "remove", "--force", r.worktreePath]);
    }
    return true;
  });

test("a crashed run's ledger entries are reconciled on the next --worktree invocation",
  "ledger entries had no retention and no reconciler: a killed run's entry (and its clean tree) survived forever, unlike the answer log beside it which is pruned",
  async () => {
    const repo = freshRepo("wt-ledger");
    if (!repo) return "git setup failed";
    const ledgerDir = path.join(STATE_DIR, "worktrees");
    fs.mkdirSync(ledgerDir, { recursive: true, mode: 0o700 });
    // Entry 1: a dead pid naming a tree that no longer exists — the entry must be dropped.
    const gonePath = path.join(repo, ".claude", "worktrees", "codex-gone");
    fs.writeFileSync(path.join(ledgerDir, "codex-gone.json"),
      JSON.stringify({ path: gonePath, repo, pid: 2147483646, started: "old" }));
    // Entry 2: a dead pid naming a real, CLEAN worktree — both must be removed.
    const cleanPath = path.join(repo, ".claude", "worktrees", "codex-stale-clean");
    fs.mkdirSync(path.dirname(cleanPath), { recursive: true });
    const add = spawnSync("git", ["-C", repo, "worktree", "add", "--detach", cleanPath], { encoding: "utf8" });
    if (add.status !== 0) return `worktree add failed: ${String(add.stderr).trim()}`;
    fs.writeFileSync(path.join(ledgerDir, "codex-stale-clean.json"),
      JSON.stringify({ path: cleanPath, repo, pid: 2147483646, started: "old" }));
    const { code, err } = await run(null, { args: ["--worktree", repo] });
    if (code !== EXIT.OK) return `the run exited ${code}: ${err.trim().slice(0, 160)}`;
    if (fs.existsSync(path.join(ledgerDir, "codex-gone.json"))) return "the gone tree's entry survived";
    if (fs.existsSync(path.join(ledgerDir, "codex-stale-clean.json"))) return "the clean tree's entry survived";
    if (fs.existsSync(cleanPath)) return "the crashed run's clean worktree was not removed";
    return true;
  });

test("--worktree preserves the tree on a timeout",
  "a timeout is the case most likely to leave a half-written tree; removal on anything but a settled clean state is data loss",
  async () => {
    const repo = freshRepo("wt-timeout");
    if (!repo) return "git setup failed";
    const { code, out } = await run(null, { scenario: "stalled-turn", timeout: 1, args: ["--worktree", repo] });
    if (code !== 3) return `expected exit 3, got ${code}`;
    let r = null; try { r = JSON.parse(out); } catch {}
    try {
      if (!r) return "no JSON report";
      if (r.worktreeRemoved !== false) return "a timed-out tree was removed";
      if (!fs.existsSync(r.worktreePath)) return "the tree is gone despite worktreeRemoved:false";
    } finally {
      if (r?.worktreePath) spawnSync("git", ["-C", repo, "worktree", "remove", "--force", r.worktreePath]);
    }
    return true;
  });

test("--writable refuses ~/.codex and ~/.codex-delegate, which hold the receipts and the driver's own state",
  "a writable ~/.codex/sessions makes the 'unforgeable' receipt forgeable, and a writable ~/.codex-delegate hands over the locks and the answer log; only ~ itself used to be refused",
  async () => {
    const home = fs.realpathSync(os.userInfo().homedir);
    const targets = [path.join(home, ".codex"), path.join(home, ".codex", "sessions"), path.join(home, ".codex-delegate")];
    for (const t of targets) {
      let exists = true;
      try { fs.statSync(t); } catch { exists = false; }
      if (!exists) continue;   // a machine without codex state has nothing to protect here
      const { code, err } = await run(freshDir("writable-protected"), { args: ["--writable", t] });
      if (code !== EXIT.USAGE) return `--writable ${t} returned ${code}, expected 2`;
      if (!/receipts|state/.test(err)) return `the refusal did not say why: ${err.trim().slice(0, 160)}`;
    }
    // The guard is identity-based, so a case-variant spelling on a case-insensitive volume must be
    // refused too — the first version was a string compare and ~/.CODEX walked straight past it.
    const upper = path.join(home, ".CODEX-DELEGATE");
    let aliased = false;
    try { aliased = fs.statSync(upper).ino === fs.statSync(path.join(home, ".codex-delegate")).ino; } catch {}
    if (aliased) {
      const { code } = await run(freshDir("writable-protected-case"), { args: ["--writable", upper] });
      if (code !== EXIT.USAGE) return `case-variant --writable ${upper} returned ${code}, expected 2 — the identity guard is not holding`;
    }
    return true;
  });

test("a failed config probe keeps the last known good inherited config",
  "rewriting the shared isolated config on a FAILED probe truncated what a healthy run had just written, so a transient hiccup silently moved every concurrent seat onto account defaults",
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
  "a coordinator that lost a threadId had no way back to the thread: the registry under jobs/ records each run (started, ended, exit, answerPath) and --resume last resolves the newest record",
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

test("--mcp uses a private per-run home: not the shared config, and never argv",
  "two homes are wrong for it. The SHARED isolated config leaks the grant into concurrent runs that never asked for it; -c spawn args fix that and put an MCP server's env tokens into a world-readable argv, where a read seat in another repository could `ps` them. A per-run 0600 home is neither, and it must not survive the run",
  async () => {
    const shared = path.join(STATE_DIR, "home", "config.toml");
    const onLog = path.join(freshDir("mcp-log"), "on.log");
    const withMcp = await run(freshDir("mcp-on"), { args: ["--mcp"], env: { FAKE_MCP: "1", FAKE_RPC_LOG: onLog } });
    if (withMcp.code !== EXIT.OK) return `the --mcp run exited ${withMcp.code}: ${withMcp.err.trim().slice(0, 160)}`;
    let r = null; try { r = JSON.parse(withMcp.out); } catch { return "no JSON report"; }
    const home = r.codexHome;
    if (!home || !/\/homes\//.test(home)) return `the run did not use a per-run home: ${JSON.stringify(home)}`;
    if (fs.existsSync(home)) return "the per-run home (which holds the caller's MCP secrets) outlived the run";
    let log = "";
    try { log = fs.readFileSync(onLog, "utf8"); } catch { return "the fixture logged nothing"; }
    if (/cfg:mcp_servers/.test(log)) return "MCP config — including env secrets — reached argv";
    if (!/exotic.*cannot carry/.test(withMcp.err)) return `the uncarriable server's skip was silent: ${withMcp.err.trim().slice(0, 200)}`;
    if (fs.existsSync(shared) && /mcp_servers/.test(fs.readFileSync(shared, "utf8")))
      return "the grant leaked into the SHARED config file";
    const without = await run(freshDir("mcp-off"), { env: { FAKE_MCP: "1" } });
    if (without.code !== EXIT.OK) return `the follow-up run exited ${without.code}`;
    let r2 = null; try { r2 = JSON.parse(without.out); } catch { return "no JSON report from the second run" }
    if (/\/homes\//.test(r2.codexHome ?? "")) return "a run WITHOUT --mcp was given a per-run home";
    return !/mcp_servers/.test(fs.readFileSync(shared, "utf8")) || "a run WITHOUT --mcp received an MCP grant";
  });

test("--mcp refuses to run blind when the config probe never reported the table",
  "a capability asked for and silently not granted is the failure mode this driver refuses everywhere else; the last-known-good path could otherwise hand back a seat with no tools and no warning",
  async () => {
    const { code, err } = await run(freshDir("mcp-blind"), { args: ["--mcp"], env: { FAKE_CONFIG_FAIL: "1" } });
    if (code !== EXIT.TRANSPORT) return `expected exit 4, got ${code}`;
    return /--mcp was asked for but the caller's config could not be read/.test(err)
      || `the refusal did not say why: ${err.trim().slice(0, 200)}`;
  });

test("--steer-file reaches the running turn as turn/steer",
  "a native subagent can be corrected mid-task by just typing; a seat could only be killed. Text appended to the steer file must arrive at the server as a steer on the LIVE turn, and the file must be drained so the same text is not sent twice",
  async () => {
    const d = freshDir("steer");
    const steer = path.join(d, "steer.txt");
    const rpcLog = path.join(d, "rpc.log");
    const { p, done, stderrSoFar } = spawnRun(d, { shim: shimDir, args: ["--steer-file", steer], env: { FAKE_RPC_LOG: rpcLog } });
    if (!await waitFor(() => /threadId=/.test(stderrSoFar()))) { p.kill("SIGKILL"); return "the run never announced a thread"; }
    if (!await waitFor(() => { try { return /turn\/start/.test(fs.readFileSync(rpcLog, "utf8")); } catch { return false; } }))
      { p.kill("SIGKILL"); return "the turn never started"; }
    await new Promise((r) => setTimeout(r, 150));
    fs.writeFileSync(steer, "focus on the lock path only\n");
    const steered = await waitFor(() => { try { return /turn\/steer/.test(fs.readFileSync(rpcLog, "utf8")); } catch { return false; } }, 8000);
    // Claimed, not emptied: the inbox is renamed aside, so "drained" is an absent file or an empty one.
    const drained = await waitFor(() => { try { return !fs.existsSync(steer) || fs.readFileSync(steer, "utf8") === ""; } catch { return false; } }, 3000);
    p.kill("SIGTERM");
    await done;
    if (!steered) return "the steer never reached the server";
    if (!drained) return "the steer file was not drained after sending";
    // The claim is the driver's own scratch file, not something to leave in the caller's directory.
    const leftovers = fs.readdirSync(d).filter((f) => f.startsWith("steer.txt.") && f.endsWith(".claimed"));
    if (leftovers.length) return `the run left claimed steer files behind: ${leftovers.join(", ")}`;
    return true;
  });

test("the answer log is pruned by age",
  "~/.codex-delegate/answers grew without bound — 97 files within two days of use — and nothing mentioned pruning it",
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
// No case anywhere sent the driver a signal. Every guarantee it publishes about teardown — the group is
// waited out, the lock is released only afterwards, a repeat signal escalates — was pinned by exactly one
// case that covers NORMAL COMPLETION, and the two mechanisms that satisfy it are redundant, so removing
// either left the suite green. These cases send the signals.

// A shim that leaves a TERM-ignoring descendant inside the codex process group, the shape of a test
// server or watcher a turn walks away from. The marker makes it findable without guessing.
const survivorMark = `CDSURV${crypto.randomBytes(3).toString("hex")}`;
const survivorShim = fs.mkdtempSync(path.join(os.tmpdir(), "codex-lock-surv-"));
fs.writeFileSync(path.join(survivorShim, "codex"),
  `#!/bin/sh\nsh -c 'trap "" TERM; sleep 300 #${survivorMark}' &\nexec "${process.execPath}" "${FAKE}" "$@"\n`,
  { mode: 0o755 });
const survivorsAlive = () =>
  spawnSync("pgrep", ["-f", survivorMark], { encoding: "utf8" }).stdout.trim().split("\n").filter(Boolean);
const reapSurvivors = () => { try { spawnSync("pkill", ["-9", "-f", survivorMark]); } catch {} };

// Spawns a write-level run and hands back the child, so a case can signal it mid-turn.
function spawnRun(dir, { scenario = "stalled-turn", args = [], shim = survivorShim, env = {} } = {}) {
  const p = spawn(process.execPath,
    [DRIVER, "--level", "write", "--cwd", dir, "--timeout", "60", "--allow-no-commands", ...args,
     "--prompt", "irrelevant, the server is scripted"],
    { env: { ...process.env, PATH: `${shim}:${process.env.PATH}`, FAKE_SCENARIO: scenario,
             CODEX_DELEGATE_STATE_DIR: STATE_DIR, ...env },
      stdio: ["ignore", "pipe", "pipe"] });
  let out = "", err = "";
  p.stdout.on("data", (d) => { out += d; });
  p.stderr.on("data", (d) => { err += d; });
  const done = new Promise((res) => p.on("close", (code) => res({ code, out, err })));
  // The accumulating stderr, so a case can wait for the driver to announce its thread. The lock is taken
  // BEFORE codex is spawned, so "the lock exists" does not mean "there is a turn to report": under load
  // a signal sent on that signal arrived while rootThreadId was still null and got the documented
  // exit 4 for a run with nothing to hand back. Waiting for `threadId=` is waiting for the precondition
  // the case is actually about.
  return { p, done, stderrSoFar: () => err };
}
const waitFor = async (fn, ms = 15000) => {
  for (const end = Date.now() + ms; Date.now() < end; ) { if (fn()) return true; await new Promise((r) => setTimeout(r, 25)); }
  return false;
};

for (const sig of ["SIGTERM", "SIGINT", "SIGHUP"]) {
  test(`${sig} reports the turn, sweeps the group and releases the lock`,
    sig === "SIGHUP"
      ? "SIGHUP had no handler at all, so Node's default terminated the driver outright: measured — exit 129, a TERM-ignoring descendant reparented to pid 1, the cwd lock left behind and a zero-byte report. It is what a closing terminal sends, i.e. the ordinary end of a backgrounded delegation"
      : "a cancelled run used to exit 4 with an EMPTY report, discarding the commands, files and answer already in memory; the turn did not complete, which is exit 1, and the evidence belongs to the caller",
    async () => {
      reapSurvivors();
      const d = freshDir(`sig-${sig}`);
      const rpcLog = path.join(d, `rpc-${sig}.log`);
      const { p, done, stderrSoFar } = spawnRun(d, { env: { FAKE_RPC_LOG: rpcLog } });
      if (!await waitFor(() => survivorsAlive().length > 0)) { p.kill("SIGKILL"); reapSurvivors(); return "the shim never produced a survivor"; }
      if (!await waitFor(() => fs.existsSync(lockFor(d)))) { p.kill("SIGKILL"); reapSurvivors(); return "the run never took its lock"; }
      // And wait for the thread itself. Signalling on the lock alone is a race the driver wins
      // correctly — no thread means nothing to report, which is exit 4 — but it is not this case.
      if (!await waitFor(() => /threadId=/.test(stderrSoFar()))) { p.kill("SIGKILL"); reapSurvivors(); return "the run never announced a thread"; }
      // And for the TURN: the interrupt needs a turn id, and threadId= is announced before the
      // turn/start response arrives. The rpc log records the request reaching the fixture; a short
      // settle lets the driver consume the response that carries the id.
      if (!await waitFor(() => { try { return /turn\/start/.test(fs.readFileSync(rpcLog, "utf8")); } catch { return false; } }))
        { p.kill("SIGKILL"); reapSurvivors(); return "the turn never started"; }
      await new Promise((r) => setTimeout(r, 150));
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
      // The server must be ASKED to end the turn, not merely killed: that is what leaves the thread
      // cleanly resumable after a cancellation.
      let rpc = "";
      try { rpc = fs.readFileSync(rpcLog, "utf8"); } catch {}
      return /turn\/interrupt/.test(rpc) || `the driver never sent turn/interrupt on ${sig}`;
    });
}

test("the lock is released only after the process group is dead",
  "the published guarantee is that a next writer cannot enter a directory where the previous run's descendants are still dying. Both mechanisms that kill the group are redundant for the survivor case, so removing the WAIT left every case green — what the wait actually buys is this ordering, and nothing measured it",
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

test("--worktree refuses a destination that a symlink puts outside the checked repository",
  "checkRoot(repo) guards where the worktree is asked FROM, not where it lands. With <repo>/.claude a symlink, git created directories in the target and would have checked a whole tree out there — running its hooks — before the cwd check refused the run",
  async () => {
    const repo = freshDir("wt-link");
    if (spawnSync("git", ["init", "-q", repo]).status !== 0) return "git init failed";
    spawnSync("git", ["-C", repo, "-c", "user.email=a@b", "-c", "user.name=a", "commit", "-q", "--allow-empty", "-m", "init"]);
    // The protected target: this suite's own state directory, which checkRoot refuses by identity.
    fs.symlinkSync(STATE_DIR, path.join(repo, ".claude"));
    const before = fs.readdirSync(STATE_DIR).sort().join(",");
    const p = spawn(process.execPath,
      [DRIVER, "--worktree", repo, "--timeout", "30", "--allow-no-commands", "--prompt", "scripted"],
      { env: { ...process.env, PATH: `${shimDir}:${process.env.PATH}`, FAKE_SCENARIO: "happy",
               CODEX_DELEGATE_STATE_DIR: STATE_DIR }, stdio: ["ignore", "pipe", "pipe"] });
    let err = "";
    p.stderr.on("data", (d) => { err += d; });
    const code = await new Promise((res) => p.on("close", res));
    if (code !== EXIT.USAGE) return `expected exit 2, got ${code}: ${err.trim().slice(0, 160)}`;
    if (/created worktree/.test(err)) return "the worktree was created before the guard refused it";
    const after = fs.readdirSync(STATE_DIR).sort().join(",");
    return before === after || `the refused run still wrote into the protected directory: ${before} -> ${after}`;
  });

test("a second --seat-file is a usage error, not a silently ignored one",
  "only the first --seat-file pair is expanded and removed; the second survived into parseArgs, set o.seatFile and was never read — a caller believing something untrue about which seat is running",
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
  "`ps -o lstart=` renders the start time through strftime in the CALLER's timezone and locale, so an unpinned identity makes one live process look like two: a lock written by a run under TZ=Asia/Tokyo read as stale under the default TZ, and a second writer walked into a directory already held",
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
  "isolatedHome() read the link and then created it, so two seats starting on an empty state dir both saw ENOENT and the loser exited 2 with EEXIST on a link the winner had just made correctly — measured at 6 of 60 concurrent read seats",
  async () => {
    const d = freshDir("home-race");
    // 64 first-runs, because the window is small: reverting the fix produced 2 failures in 36, so a
    // narrower fan-out could stay green against the very bug this case exists to catch.
    const rounds = 4, width = 16, bad = [];
    for (let r = 0; r < rounds; r++) {
      // Fresh every round: the race exists only on the FIRST run against a state directory.
      const state = path.join(STATE_DIR, `home-race-${r}`);
      const seats = Array.from({ length: width }, () => new Promise((res) => {
        const p = spawn(process.execPath,
          [DRIVER, "--level", "read", "--cwd", d, "--timeout", "30", "--json",
           "--prompt", "irrelevant, the server is scripted"],
          { env: { ...process.env, PATH: `${shimDir}:${process.env.PATH}`, FAKE_SCENARIO: "happy",
                   CODEX_DELEGATE_STATE_DIR: state },
            stdio: ["ignore", "ignore", "pipe"] });
        let err = "";
        p.stderr.on("data", (x) => { err += x; });
        p.on("close", (code) => res({ code, err }));
      }));
      for (const { code, err } of await Promise.all(seats))
        if (code !== EXIT.OK) bad.push(`exit ${code}: ${err.trim().split("\n").pop()?.slice(0, 110)}`);
    }
    return bad.length
      ? `${bad.length} of ${rounds * width} concurrent first runs failed — ${[...new Set(bad)].slice(0, 3).join(" | ")}`
      : true;
  });

test("a cancelled config probe does not empty the shared home's config",
  "probeCancel resolved as a SUCCESSFUL probe with no entries, so a run interrupted while probing atomically replaced the shared config.toml with an empty file — which every later run then kept as its last known good, on the account defaults",
  async () => {
    const d = freshDir("probe-cancel");
    const state = path.join(STATE_DIR, "probe-cancel-state");
    const cfg = path.join(state, "home", "config.toml");
    fs.mkdirSync(path.dirname(cfg), { recursive: true, mode: 0o700 });
    const seeded = 'model = "seeded-model"\nmodel_reasoning_effort = "high"\n';
    fs.writeFileSync(cfg, seeded);
    const p = spawn(process.execPath,
      [DRIVER, "--level", "read", "--cwd", d, "--timeout", "30", "--json", "--prompt", "scripted"],
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
  "as a spawnSync the verifier deferred every signal for up to its whole budget: measured, two SIGINTs were ignored and `--verify 'sleep 20'` ran to completion, exit 0, twenty-one seconds after the first",
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
  "an opt-in sandbox that silently ran the verifier with the caller's own rights would be worse than none: the invocation has to carry the profile, both of its -c definitions and the cwd, and hand the verifier's own exit code back",
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
                          'permissions.codex_delegate_read.filesystem={":tmpdir"="write"}'])
      if (!line.includes(needle)) return `the sandbox invocation lacks ${needle}: ${line}`;
    let report = null;
    try { report = JSON.parse(out); } catch {}
    if (report?.verify?.exitCode !== 5 || report?.verify?.sandboxed !== true)
      return `the sandboxed verifier's exit code was not passed through: ${JSON.stringify(report?.verify)}`;
    return code === EXIT.VERIFY_FAILED ? true : `expected exit 9 for a failing verifier, got ${code}`;
  });

test("the answer reaches the answer log before the turn ends, so a SIGKILL cannot take it with it",
  "persistAnswer ran only inside finish(), so a run killed after the model had already answered handed back nothing at all: the one artefact the coordinator needed sat in the memory of a process that no longer exists. A SIGKILL is the shape a harness, an OOM killer or a laptop lid produces",
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

test("a correction appended while a steer is in flight is not overwritten",
  "the drain was a read-modify-write around a live send: text appended between its read and its write was lost, while the docs promised concurrent appends survive. Claiming the file by rename frees the inbox the moment the text is taken",
  async () => {
    const d = freshDir("steer-window");
    const steer = path.join(d, "steer.txt");
    const rpcLog = path.join(d, "rpc.log");
    const { p, done, stderrSoFar } = spawnRun(d, { shim: shimDir, args: ["--steer-file", steer],
      // A slow acceptance IS the window: without it the send and the drain are indistinguishable.
      env: { FAKE_RPC_LOG: rpcLog, FAKE_STEER_DELAY_MS: "1500" } });
    const logHas = (re) => { try { return re.test(fs.readFileSync(rpcLog, "utf8")); } catch { return false; } };
    if (!await waitFor(() => /threadId=/.test(stderrSoFar()))) { p.kill("SIGKILL"); return "the run never announced a thread"; }
    if (!await waitFor(() => logHas(/turn\/start/))) { p.kill("SIGKILL"); return "the turn never started"; }
    fs.writeFileSync(steer, "first correction\n");
    if (!await waitFor(() => logHas(/turn\/steer:first correction/), 8000)) { p.kill("SIGKILL"); return "the first steer never reached the server"; }
    // The server has not accepted it yet, so this is exactly the window the old drain wrote over.
    const stillInInbox = fs.existsSync(steer) && fs.readFileSync(steer, "utf8").includes("first correction");
    fs.appendFileSync(steer, "second correction\n");
    const second = await waitFor(() => logHas(/turn\/steer:second correction/), 12000);
    p.kill("SIGTERM");
    await done;
    if (stillInInbox) return "the delivered text was still in the inbox while its send was in flight";
    return second ? true : "a correction appended during the send never arrived";
  });


// The git the DRIVER spawns, observed from outside: a shim that logs its own argv and execs the real
// binary. Resolved before the shim exists, or `command -v git` would find the shim.
const REAL_GIT = (() => {
  const r = spawnSync("/usr/bin/env", ["sh", "-c", "command -v git"], { encoding: "utf8" });
  return r.status === 0 && r.stdout.trim() ? r.stdout.trim() : "git";
})();

test("no git the driver spawns runs the repository's hooks, fsmonitor or external diff",
  "--commit hands the seat the git common dir, and the driver's own harvest, its worktree remove and the next run's worktree add then execute what the seat wrote there with the CALLER's rights — code execution before the report is read. Measured before the fix: core.fsmonitor=pwn.sh logged runs under status, diff, ls-files twice, worktree remove and worktree add, at exit 0",
  async () => {
    const repo = freshRepo("wt-hooks");
    if (!repo) return "git setup failed";
    const bin = freshDir("wt-hooks-bin");
    const hookLog = path.join(bin, "hook.log");
    const argvLog = path.join(bin, "argv.log");
    const pwn = path.join(bin, "pwn.sh");
    fs.writeFileSync(pwn, `#!/bin/sh\necho "fsmonitor/diff $*" >> ${hookLog}\nexit 0\n`, { mode: 0o755 });
    fs.mkdirSync(path.join(repo, ".git", "hooks"), { recursive: true });
    for (const h of ["post-checkout", "post-index-change", "reference-transaction", "pre-commit"])
      fs.writeFileSync(path.join(repo, ".git", "hooks", h), `#!/bin/sh\necho "${h}" >> ${hookLog}\nexit 0\n`, { mode: 0o755 });
    for (const [k, v] of [["core.fsmonitor", pwn], ["diff.external", pwn]])
      if (spawnSync("git", ["-C", repo, "config", k, v]).status !== 0) return `git config ${k} failed`;
    fs.writeFileSync(path.join(bin, "git"),
      `#!/bin/sh\nprintf '%s\\n' "$*" >> ${argvLog}\nexec ${REAL_GIT} "$@"\n`, { mode: 0o755 });
    const { code, out, err } = await run(null, {
      args: ["--worktree", repo, "--commit", "--verify", "printf 'seat-work\\n' >> seed"],
      env: { PATH: `${bin}:${shimDir}:${process.env.PATH}` } });
    let r = null; try { r = JSON.parse(out); } catch {}
    try {
      if (code !== EXIT.OK) return `the run exited ${code}: ${err.trim().slice(0, 200)}`;
      if (fs.existsSync(hookLog))
        return `the repository's hooks ran under the driver's own git: ${fs.readFileSync(hookLog, "utf8").trim().slice(0, 300)}`;
      let argv = "";
      try { argv = fs.readFileSync(argvLog, "utf8"); } catch { return "the git shim was never reached, so nothing was measured"; }
      const lines = argv.split("\n").filter(Boolean);
      if (!lines.some((l) => /worktree add/.test(l))) return "the shim never saw `worktree add`";
      if (!lines.some((l) => / diff /.test(l))) return "the shim never saw a diff, so the diff hardening is unmeasured";
      for (const l of lines) {
        for (const flag of ["core.hooksPath=/dev/null", "core.fsmonitor=false", "diff.external="])
          if (!l.includes(flag)) return `a driver git ran without ${flag}: ${l.slice(0, 160)}`;
        if (/ diff /.test(l) && !l.includes("--no-ext-diff")) return `a diff ran without --no-ext-diff: ${l.slice(0, 160)}`;
      }
      // The hardening must not cost the harvest: an external diff driver left in place would have
      // produced an empty patch and this is what says it did not.
      if (!r?.worktreeHarvested || !/seed/.test(r.worktreeDiffStat ?? ""))
        return `the harvest lost the work: ${JSON.stringify({ harvested: r?.worktreeHarvested, stat: r?.worktreeDiffStat })}`;
    } finally {
      if (r?.worktreePath && fs.existsSync(r.worktreePath))
        spawnSync("git", ["-C", repo, "worktree", "remove", "--force", r.worktreePath]);
      for (const p of [r?.worktreeDiffPath, r?.worktreeUntrackedPath]) if (p) fs.rmSync(p, { force: true });
    }
    return true;
  });

// A crashed run's ledger entry, planted by hand: `name` is the entry (and the ref) name, and the tree it
// names is created here and left behind exactly as a SIGKILL would.
function plantCrashedTree(repo, name, { commit = false, baseSha = true } = {}) {
  const dir = path.join(repo, ".claude", "worktrees", name);
  fs.mkdirSync(path.dirname(dir), { recursive: true });
  if (spawnSync("git", ["-C", repo, "worktree", "add", "--detach", dir], { encoding: "utf8" }).status !== 0) return null;
  const head = () => spawnSync("git", ["-C", dir, "rev-parse", "HEAD"], { encoding: "utf8" }).stdout.trim();
  const base = head();
  if (commit) {
    fs.appendFileSync(path.join(dir, "seed"), "crashed seat work\n");
    const c = spawnSync("git", ["-C", dir, "-c", "user.email=a@b", "-c", "user.name=a", "commit", "-qam", `crashed-${name}`],
      { encoding: "utf8" });
    if (c.status !== 0) return null;
  }
  const ledgerDir = path.join(STATE_DIR, "worktrees");
  fs.mkdirSync(ledgerDir, { recursive: true, mode: 0o700 });
  fs.writeFileSync(path.join(ledgerDir, `${name}.json`),
    JSON.stringify({ path: dir, repo, pid: 2147483646, started: "old", ...(baseSha ? { baseSha: base } : {}) }));
  return { dir, base, head: head() };
}

test("the reconciler gives a crashed seat's commits a ref before it removes the tree that held them",
  "reproduced: a crashed --commit seat leaves a SPOTLESS tree whose HEAD is the only thing referencing its commits, and removing it by porcelain alone stranded them — `git fsck` reported the commits dangling and the run announced 'removed a crashed run's clean worktree'",
  async () => {
    const repo = freshRepo("wt-reconcile-commits");
    if (!repo) return "git setup failed";
    // With a base recorded, and — for a ledger written before that field existed — without one, where
    // reachability from any ref is what has to be disproven instead.
    const withBase = plantCrashedTree(repo, "codex-crash-based", { commit: true });
    const noBase = plantCrashedTree(repo, "codex-crash-legacy", { commit: true, baseSha: false });
    if (!withBase || !noBase) return "planting the crashed trees failed";
    const { code, err } = await run(null, { args: ["--worktree", repo] });
    if (code !== EXIT.OK) return `the reconciling run exited ${code}: ${err.trim().slice(0, 200)}`;
    for (const [name, planted] of [["codex-crash-based", withBase], ["codex-crash-legacy", noBase]]) {
      if (fs.existsSync(planted.dir)) return `${name}: the crashed tree was not removed`;
      if (fs.existsSync(path.join(STATE_DIR, "worktrees", `${name}.json`))) return `${name}: the ledger entry survived`;
      const log = spawnSync("git", ["-C", repo, "log", "--format=%s", `refs/codex-delegate/${name}`], { encoding: "utf8" });
      if (log.status !== 0 || !log.stdout.includes(`crashed-${name}`))
        return `${name}: the commits were stranded — refs/codex-delegate/${name} does not carry them ` +
          `(${String(log.stdout || log.stderr).trim().slice(0, 160)})`;
    }
    if (!/commits are kept at/.test(err)) return `the rescue was silent: ${err.trim().slice(0, 200)}`;
    return true;
  });

test("the ledger entry exists before `git worktree add` creates anything",
  "a SIGKILL between the add and the ledger write left a checked-out tree that no entry named, so no reconciler could ever find it — an orphan by construction, in the one path whose whole job is to leave a trace",
  async () => {
    const repo = freshRepo("wt-intent");
    if (!repo) return "git setup failed";
    const bin = freshDir("wt-intent-bin");
    const snap = path.join(bin, "ledger-at-add.txt");
    // The shim answers one question: what did the ledger directory hold at the instant of the add?
    fs.writeFileSync(path.join(bin, "git"),
      `#!/bin/sh\ncase "$*" in *"worktree add"*) ls "${path.join(STATE_DIR, "worktrees")}" > "${snap}" 2>&1 ;; esac\n` +
      `exec ${REAL_GIT} "$@"\n`, { mode: 0o755 });
    const { code, out, err } = await run(null, { args: ["--worktree", repo],
      env: { PATH: `${bin}:${shimDir}:${process.env.PATH}` } });
    if (code !== EXIT.OK) return `the run exited ${code}: ${err.trim().slice(0, 200)}`;
    let r = null; try { r = JSON.parse(out); } catch { return "no JSON report"; }
    const name = path.basename(r.worktreePath ?? "");
    let listing = "";
    try { listing = fs.readFileSync(snap, "utf8"); } catch { return "the shim never saw `worktree add`"; }
    return listing.includes(`${name}.json`)
      || `the tree was created before its ledger entry existed; the directory then held: ${JSON.stringify(listing.trim().slice(0, 200))}`;
  });

test("the reconciler's bound reaches the OLDEST entries, not whichever fifty the filesystem lists first",
  "the sweep took an unsorted first-50: on a directory that returns a stable order the same fifty are handed to every run and everything after them is starved forever, which for a ledger means a tree nobody ever reconciles",
  async () => {
    const repo = freshRepo("wt-starve");
    if (!repo) return "git setup failed";
    const ledgerDir = path.join(STATE_DIR, "worktrees");
    fs.mkdirSync(ledgerDir, { recursive: true, mode: 0o700 });
    // Named to sort before any real entry (a real name opens with a base36 timestamp), and CREATED in
    // reverse, so insertion order and sorted order disagree. Each names a path that does not exist, so
    // the entry is simply dropped and no git runs.
    const names = Array.from({ length: 60 }, (_, i) => `codex-0000-${String(i).padStart(2, "0")}`);
    for (const n of [...names].reverse())
      fs.writeFileSync(path.join(ledgerDir, `${n}.json`),
        JSON.stringify({ path: path.join(repo, ".claude", "worktrees", n), repo, pid: 2147483646, started: "old" }));
    const { code, err } = await run(null, { args: ["--worktree", repo] });
    if (code !== EXIT.OK) return `the run exited ${code}: ${err.trim().slice(0, 200)}`;
    const left = names.filter((n) => fs.existsSync(path.join(ledgerDir, `${n}.json`)));
    for (const n of left) fs.rmSync(path.join(ledgerDir, `${n}.json`), { force: true });
    const expected = names.slice(50);
    if (left.join(",") !== expected.join(","))
      return `the fifty oldest entries were not the ones reconciled; left behind: ${JSON.stringify(left)}`;
    return true;
  });

test("--resume last from the repository finds a worktree seat, whose own cwd no longer exists",
  "a worktree seat records the tree as its cwd and that tree is REMOVED when the seat finishes, so matching on cwd alone skipped every worktree seat: `--resume last` from the repository silently continued the newest READ seat instead",
  async () => {
    const repo = freshRepo("wt-resume-last");
    if (!repo) return "git setup failed";
    const first = await run(null, { args: ["--worktree", repo] });
    if (first.code !== EXIT.OK) return `the worktree seat exited ${first.code}: ${first.err.trim().slice(0, 160)}`;
    let r1 = null; try { r1 = JSON.parse(first.out); } catch { return "no JSON report from the worktree seat"; }
    if (r1.resumedFrom !== null) return `a fresh seat reported resumedFrom=${JSON.stringify(r1.resumedFrom)}`;
    if (fs.existsSync(r1.worktreePath)) return "the tree survived, so the case does not test what it claims";
    const second = await run(repo, { args: ["--resume", "last"] });
    if (second.code !== EXIT.OK) return `--resume last from the repository exited ${second.code}: ${second.err.trim().slice(0, 200)}`;
    let r2 = null; try { r2 = JSON.parse(second.out); } catch { return "no JSON report from the resumed run"; }
    if (r2.resumedFrom !== "thr_root") return `the report did not name the thread it continued: ${JSON.stringify(r2.resumedFrom)}`;
    return true;
  });

test("--worktree REPO --resume ID rebuilds that thread's tree and continues in it",
  "a completed worktree seat could not be continued at all: the tree was removed, --worktree --resume was refused outright, and the record's cwd pointed at a directory that no longer existed — the seat's base commit and harvested diff lived only in a one-shot report",
  async () => {
    const repo = freshRepo("wt-resume-rebuild");
    if (!repo) return "git setup failed";
    const first = await run(null, { args: ["--worktree", repo, "--verify",
      "printf 'seat-line\\n' >> seed && printf 'scratch\\n' > scratch.txt"] });
    if (first.code !== EXIT.OK) return `the first seat exited ${first.code}: ${first.err.trim().slice(0, 160)}`;
    let r1 = null; try { r1 = JSON.parse(first.out); } catch { return "no JSON report from the first seat"; }
    if (!r1.worktreeHarvested || !r1.worktreeDiffPath || !r1.worktreeUntrackedPath)
      return `the first seat harvested nothing to rebuild from: ${JSON.stringify({ h: r1.worktreeHarvested, d: r1.worktreeDiffPath, u: r1.worktreeUntrackedPath })}`;
    const second = await run(null, { args: ["--worktree", repo, "--resume", "last"] });
    let r2 = null; try { r2 = JSON.parse(second.out); } catch {}
    try {
      if (second.code !== EXIT.OK) return `--worktree --resume exited ${second.code}: ${second.err.trim().slice(0, 200)}`;
      if (!r2) return "no JSON report from the resumed seat";
      if (r2.resumedFrom !== "thr_root") return `the resumed thread was not named: ${JSON.stringify(r2.resumedFrom)}`;
      if (r2.worktreeBase !== r1.worktreeBase)
        return `the rebuilt tree does not start where the thread's tree started: ${r2.worktreeBase} vs ${r1.worktreeBase}`;
      if (r2.worktreeRestored?.diff !== r1.worktreeDiffPath || r2.worktreeRestored?.untracked !== r1.worktreeUntrackedPath)
        return `the harvest was not restored into the tree: ${JSON.stringify(r2.worktreeRestored)}`;
      // The rebuilt tree's OWN harvest is the proof the work was really there: this seat's verifier
      // changed nothing, so anything in the diff came from the restore.
      if (!/seed/.test(r2.worktreeDiffStat ?? ""))
        return `the restored tracked work is not in the rebuilt tree: ${JSON.stringify(r2.worktreeDiffStat)}`;
      const listing = spawnSync("tar", ["-tzf", r2.worktreeUntrackedPath ?? "/nonexistent"], { encoding: "utf8" });
      if (listing.status !== 0 || !/scratch\.txt/.test(listing.stdout))
        return `the restored untracked file is not in the rebuilt tree: ${String(listing.stdout || listing.stderr).trim().slice(0, 160)}`;
      // A thread with no rebuildable record is refused rather than run against a fresh tree at HEAD.
      const blind = await run(null, { args: ["--worktree", repo, "--resume", "thr_no_such_record"] });
      if (blind.code !== EXIT.USAGE) return `an unrebuildable --worktree --resume exited ${blind.code}, expected 2`;
      if (!/no record of that thread/.test(blind.err)) return `the refusal did not say why: ${blind.err.trim().slice(0, 200)}`;
      if (worktreesUnder(repo).length) return `worktree directories left behind: ${JSON.stringify(worktreesUnder(repo))}`;
    } finally {
      if (r2?.worktreePath && fs.existsSync(r2.worktreePath))
        spawnSync("git", ["-C", repo, "worktree", "remove", "--force", r2.worktreePath]);
      for (const p of [r1?.worktreeDiffPath, r1?.worktreeUntrackedPath, r2?.worktreeDiffPath, r2?.worktreeUntrackedPath])
        if (p) fs.rmSync(p, { force: true });
    }
    return true;
  });

test("a crashed --mcp run's private home is reaped by the next one",
  "the home holds the caller's MCP servers' env tokens in a 0600 config.toml and is removed only in shutdown(); measured: --mcp plus kill -9 left homes/<hex>/config.toml with the token in it, and nothing ever reconciled homes/",
  async () => {
    const homes = path.join(STATE_DIR, "homes");
    const dead = path.join(homes, "00000000deadbeef");
    fs.mkdirSync(dead, { recursive: true, mode: 0o700 });
    fs.writeFileSync(path.join(dead, "config.toml"), 'TOKEN = "secret"\n', { mode: 0o600 });
    fs.writeFileSync(path.join(dead, "owner.json"), JSON.stringify({ pid: 2147483646, started: "old" }), { mode: 0o600 });
    const { code, err } = await run(freshDir("mcp-reap"), { args: ["--mcp"], env: { FAKE_MCP: "1" } });
    if (code !== EXIT.OK) return `the --mcp run exited ${code}: ${err.trim().slice(0, 200)}`;
    if (fs.existsSync(dead)) return "a dead owner's private home, holding its MCP secrets, survived the next --mcp run";
    if (!/reaped a crashed --mcp run's private home/.test(err)) return `the reaping was silent: ${err.trim().slice(0, 200)}`;
    return true;
  });


test("a crashed tree whose HEAD cannot be read is left in place, not removed",
  "an unreadable HEAD is not evidence of 'no commits': the committed test read null as false, and the tree was then removed with no ref naming whatever its HEAD held",
  async () => {
    const repo = freshRepo("wt-head-unreadable");
    if (!repo) return "git setup failed";
    const planted = plantCrashedTree(repo, "codex-crash-blindhead", { commit: true });
    if (!planted) return "planting the crashed tree failed";
    const bin = freshDir("wt-head-bin");
    // Only that tree's HEAD: the reconciling run needs every other rev-parse to work.
    fs.writeFileSync(path.join(bin, "git"),
      `#!/bin/sh\ncase "$*" in *"-C ${planted.dir} rev-parse HEAD"*) exit 1 ;; esac\nexec ${REAL_GIT} "$@"\n`, { mode: 0o755 });
    const entry = path.join(STATE_DIR, "worktrees", "codex-crash-blindhead.json");
    const { code, err } = await run(null, { args: ["--worktree", repo],
      env: { PATH: `${bin}:${shimDir}:${process.env.PATH}` } });
    try {
      if (code !== EXIT.OK) return `the reconciling run exited ${code}: ${err.trim().slice(0, 200)}`;
      if (!fs.existsSync(planted.dir)) return "the tree was removed although its HEAD could not be read";
      if (!fs.existsSync(entry)) return "the ledger entry was dropped, so nothing names the tree any more";
      if (!/HEAD of the crashed tree .* could not be read/.test(err))
        return `the refusal to remove was silent: ${err.trim().slice(0, 200)}`;
    } finally {
      spawnSync("git", ["-C", repo, "worktree", "remove", "--force", planted.dir]);
      fs.rmSync(entry, { force: true });
    }
    return true;
  });

test("a `worktree add` that died after creating the directory leaves its ledger entry behind",
  "the entry written before the add is there for exactly this crash, and removing it unconditionally on a failed add turned the half-made tree into the unlisted orphan the entry exists to prevent",
  async () => {
    const repo = freshRepo("wt-add-orphan");
    if (!repo) return "git setup failed";
    const bin = freshDir("wt-add-orphan-bin");
    // The destination is the last argument of `worktree add --detach <dir>`; create it and fail, exactly
    // as an add killed mid-checkout leaves it.
    fs.writeFileSync(path.join(bin, "git"),
      `#!/bin/sh\ncase "$*" in *"worktree add"*) for a in "$@"; do last=$a; done; mkdir -p "$last"; ` +
      `echo "planted" >&2; exit 1 ;; esac\nexec ${REAL_GIT} "$@"\n`, { mode: 0o755 });
    const ledgerDir = path.join(STATE_DIR, "worktrees");
    const { code } = await run(null, { args: ["--worktree", repo],
      env: { PATH: `${bin}:${shimDir}:${process.env.PATH}` } });
    const stranded = fs.readdirSync(ledgerDir).filter((n) => {
      try {
        const e = JSON.parse(fs.readFileSync(path.join(ledgerDir, n), "utf8"));
        return e.state === "creating" && fs.existsSync(e.path);
      } catch { return false; }
    });
    try {
      if (code !== EXIT.USAGE) return `a failed worktree add exited ${code}, expected 2`;
      if (stranded.length !== 1) return `the half-made tree is unlisted: ${stranded.length} ledger entries name it`;
      // And the next run must say so rather than walk past it.
      const { err } = await run(null, { args: ["--worktree", repo] });
      const orphan = JSON.parse(fs.readFileSync(path.join(ledgerDir, stranded[0]), "utf8")).path;
      if (!err.includes(orphan)) return `the reconciler never named the orphan: ${err.trim().slice(0, 200)}`;
    } finally {
      for (const n of stranded) {
        try { fs.rmSync(JSON.parse(fs.readFileSync(path.join(ledgerDir, n), "utf8")).path, { recursive: true, force: true }); } catch {}
        fs.rmSync(path.join(ledgerDir, n), { force: true });
      }
    }
    return true;
  });

test("a rebuild that cannot finish leaves no tree and no ledger entry",
  "the diff applies, the archive does not, and the half-restored tree preserved nothing the answer log did not still hold — while every later reconciler announced it as work someone had to harvest",
  async () => {
    const repo = freshRepo("wt-restore-broken");
    if (!repo) return "git setup failed";
    const first = await run(null, { args: ["--worktree", repo, "--verify",
      "printf 'seat-line\\n' >> seed && printf 'scratch\\n' > scratch.txt"] });
    if (first.code !== EXIT.OK) return `the first seat exited ${first.code}: ${first.err.trim().slice(0, 160)}`;
    let r1 = null; try { r1 = JSON.parse(first.out); } catch { return "no JSON report from the first seat"; }
    if (!r1.worktreeUntrackedPath) return "the first seat saved no untracked archive, so there is nothing to corrupt";
    fs.writeFileSync(r1.worktreeUntrackedPath, "not a gzip stream at all\n");
    const before = fs.readdirSync(path.join(STATE_DIR, "worktrees"));
    const { code, err } = await run(null, { args: ["--worktree", repo, "--resume", "last"] });
    try {
      if (code !== EXIT.USAGE) return `a rebuild that cannot finish exited ${code}, expected 2`;
      if (!/could not be unpacked/.test(err)) return `the refusal did not say why: ${err.trim().slice(0, 200)}`;
      if (worktreesUnder(repo).length) return `the half-restored tree was left behind: ${JSON.stringify(worktreesUnder(repo))}`;
      const after = fs.readdirSync(path.join(STATE_DIR, "worktrees"));
      if (after.length > before.length) return `the abandoned rebuild left a ledger entry: ${JSON.stringify(after)}`;
    } finally {
      for (const p of [r1?.worktreeDiffPath, r1?.worktreeUntrackedPath]) if (p) fs.rmSync(p, { force: true });
    }
    return true;
  });

test("a PRESERVED tree keeps its ledger entry, so something still names it",
  "the entry was dropped on every disposition, removed or not: a preserved tree became invisible to the reconciler, the one reader that would ever mention it again",
  async () => {
    const repo = freshRepo("wt-preserved-ledger");
    if (!repo) return "git setup failed";
    const { code, out } = await run(null, { scenario: "turn-failed", args: ["--worktree", repo] });
    if (code !== 1) return `expected exit 1, got ${code}`;
    let r = null; try { r = JSON.parse(out); } catch {}
    const name = path.basename(r?.worktreePath ?? "");
    const entry = path.join(STATE_DIR, "worktrees", `${name}.json`);
    try {
      if (r?.worktreeRemoved !== false) return "the tree was removed, so the case does not test what it claims";
      if (!fs.existsSync(entry)) return "the preserved tree's ledger entry was deleted; nothing names it any more";
      const e = JSON.parse(fs.readFileSync(entry, "utf8"));
      if (e.path !== r.worktreePath || e.state !== "preserved")
        return `the entry does not describe the preserved tree: ${JSON.stringify(e)}`;
    } finally {
      if (r?.worktreePath) spawnSync("git", ["-C", repo, "worktree", "remove", "--force", r.worktreePath]);
      fs.rmSync(entry, { force: true });
    }
    return true;
  });

test("a detached run's lock is the RUN's, and the front that started it releases nothing",
  "the front holds no lock by construction — it branches before setup — so a lock naming the front would be released the moment the front returned its handle, and a second writer would walk into a directory a live seat is editing",
  async () => {
    const d = freshDir("detach-lock");
    const { code, out, err } = await run(d, { scenario: "slow-turn", timeout: 60, args: ["--detach"] });
    if (code !== EXIT.BUSY) return `--detach exited ${code}, expected the handle's 10: ${err.trim().slice(0, 200)}`;
    let h = null; try { h = JSON.parse(out); } catch { return `the handle is not JSON: ${out.slice(0, 160)}`; }
    const p = lockFor(d);
    // The front has exited (run() resolved on its close) and the lock is still there.
    if (!fs.existsSync(p)) return "the front's exit took the detached run's lock with it";
    let held = null; try { held = JSON.parse(fs.readFileSync(p, "utf8")); } catch {}
    if (held?.pid !== h.pid) return `the lock names ${held?.pid}, not the detached run ${h.pid}`;
    let alive = false;
    try { process.kill(h.pid, 0); alive = true; } catch {}
    if (!alive) return "the lock names a process that is already gone";
    // The app-server's group, recorded once it existed: the second half of the reclaim rule.
    if (!Number.isInteger(held.appServerPgid) || held.appServerPgid <= 0)
      return `the lock carries no app-server group: ${JSON.stringify(held)}`;
    for (const end = Date.now() + 20000; fs.existsSync(p) && Date.now() < end; )
      await new Promise((r) => setTimeout(r, 25));
    if (fs.existsSync(p)) { fs.rmSync(p, { force: true }); return "the detached run never released its lock"; }
    return true;
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

let failed = 0;
for (const c of CASES) {
  let verdict;
  try { verdict = await c.fn(); }
  catch (e) { verdict = `threw: ${e.message}`; }
  if (verdict === true) console.log(`ok    ${c.name}`);
  else { failed++; console.log(`FAIL  ${c.name}: ${verdict}\n      ${c.why}`); }
}

// Several cases plant locks in the suite's own state directory on purpose. Compute their paths while
// the work directories still exist, or the residue outlives the suite.
for (const d of workDirs) {
  try { for (const suffix of ["", ".reclaim"]) fs.rmSync(`${lockFor(d)}${suffix}`, { recursive: true, force: true }); } catch {}
  fs.rmSync(d, { recursive: true, force: true });
}
// Every tempdir this suite made, not just the work dirs: STATE_DIR and the survivor shim used to be
// left behind on every run — 217 had accumulated in $TMPDIR before anyone counted.
for (const d of [shimDir, STATE_DIR, survivorShim]) fs.rmSync(d, { recursive: true, force: true });
console.log(failed ? `\n${failed}/${CASES.length} failed` : `\nall ${CASES.length} passed`);
process.exit(failed ? 1 : 0);
