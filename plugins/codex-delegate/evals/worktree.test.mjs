#!/usr/bin/env node
// Worktree regression tests for scripts/driver.mjs.
//
// --worktree is the only mode in which the driver creates the directory a seat works in and then has to
// dispose of it: harvest what the turn wrote, keep what it committed, preserve a tree it cannot prove is
// clean, and reconcile the ledger entries a crashed seat left behind. These cases pin that lifecycle end
// to end against real git repositories; the lock, the signals and the teardown are in lock.test.mjs.
//
//   node evals/worktree.test.mjs
//
// Exit 0 if every case matches. Uses the same scripted server as protocol.test.mjs, so no model is called.

import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DRIVER, EXIT, codexShim, registry, runCases, spawnNode, summarize, tempDir } from "./lib/harness.mjs";

// A private state directory: these cases plant ledger entries by hand and lean on the reconciler's own
// bound over them, so nothing else may be writing entries into the same root.
const STATE_DIR = tempDir("codex-worktree-state-");

const shimDir = tempDir("codex-worktree-shim-");
codexShim(shimDir);

const workDirs = [];
function freshDir(name) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), `codex-worktree-${name}-`));
  workDirs.push(d);
  return d;
}

// --level write, so the worktree is actually created. A slow scenario is used where a case needs the
// tree held while something else looks at it.
function run(dir, { scenario = "happy", timeout = 30, args = [], env = {} } = {}) {
  return spawnNode(
    [DRIVER, "--level", "write", ...(dir === null ? [] : ["--cwd", dir]),
     "--timeout", String(timeout), "--allow-no-commands", ...args, "--prompt", "irrelevant, the server is scripted"],
    { env: { PATH: `${shimDir}:${process.env.PATH}`, FAKE_SCENARIO: scenario,
             CODEX_DELEGATE_STATE_DIR: STATE_DIR, ...env } }).done;
}

const { cases: CASES, test } = registry();

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
  "the driver must remove a completed worktree it can prove holds no work, without requiring manual cleanup",
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
  "a completed dirty worktree must be harvested before removal, including staged, unstaged and untracked work",
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

test("a harvest that takes no tracked diff removes the one an earlier turn left under the same name",
  "the harvest names its artefacts after the THREAD, so a resumed seat writes over the previous turn's: a turn whose tracked work is gone reports worktreeDiffPath null while the old .diff stays on disk, and the next reader opens work this turn does not have as if it were this turn's",
  async () => {
    const repo = freshRepo("wt-reharvest");
    if (!repo) return "git setup failed";
    // A private state root: this case is about a file named after the fixture's one thread id, which
    // every other harvest case here writes too.
    const state = path.join(STATE_DIR, "reharvest-state");
    const stale = path.join(state, "answers", "thr_root.diff");
    fs.mkdirSync(path.dirname(stale), { recursive: true, mode: 0o700 });
    fs.writeFileSync(stale, "diff --git a/seed b/seed\n+an earlier turn's work\n");
    // Untracked work only: `status --porcelain` calls the tree dirty so the harvest runs, and the diff
    // against the base is empty — the shape a re-harvest has when the tracked work is no longer there.
    const { code, out, err } = await run(null, { args: ["--worktree", repo, "--verify",
      "printf 'untracked-only\\n' > untracked-only.txt"], env: { CODEX_DELEGATE_STATE_DIR: state } });
    let r = null; try { r = JSON.parse(out); } catch {}
    try {
      if (code !== EXIT.OK) return `the run exited ${code}: ${err.trim().slice(0, 200)}`;
      if (!r) return "no JSON report";
      if (r.worktreeHarvested !== true) return `the untracked work was not harvested: ${JSON.stringify(r.worktreePreserved)}`;
      if (r.worktreeDiffPath !== null) return `a tracked diff was reported that this turn did not take: ${JSON.stringify(r.worktreeDiffPath)}`;
      if (!r.worktreeUntrackedPath) return "the untracked archive was dropped along with the diff";
      if (fs.existsSync(stale)) return "the earlier turn's .diff outlived a harvest that took none";
      if (!/harvested nothing, so the earlier .*\.diff was removed/.test(err))
        return `the removal was silent: ${err.trim().slice(0, 200)}`;
    } finally {
      if (r?.worktreePath && fs.existsSync(r.worktreePath))
        spawnSync("git", ["-C", repo, "worktree", "remove", "--force", r.worktreePath]);
    }
    return true;
  });

test("a harvest that takes no diff does not remove the turn diff the same run persisted",
  "the server's turn/diff/updated and the worktree harvest write ONE path, `<threadId>.diff`: a harvest that clears the previous turn's artefact there would delete this run's own turn diff and leave turnDiffPath in the report naming a file that is gone",
  async () => {
    const repo = freshRepo("wt-turndiff");
    if (!repo) return "git setup failed";
    const state = path.join(STATE_DIR, "turndiff-state");
    // `turn-diff` sends two turn/diff/updated notifications; the verifier leaves untracked work only, so
    // the harvest takes no tracked diff and reaches the removal this case is about.
    const { code, out, err } = await run(null, { scenario: "turn-diff", args: ["--worktree", repo, "--verify",
      "printf 'untracked-only\\n' > untracked-only.txt"], env: { CODEX_DELEGATE_STATE_DIR: state } });
    let r = null; try { r = JSON.parse(out); } catch {}
    try {
      if (code !== EXIT.OK) return `the run exited ${code}: ${err.trim().slice(0, 200)}`;
      if (!r) return "no JSON report";
      if (!r.turnDiffPath) return "the run persisted no turn diff, so this case measured nothing";
      if (r.worktreeDiffPath !== null) return `the harvest took a tracked diff, so the removal was never reached: ${JSON.stringify(r.worktreeDiffPath)}`;
      if (!fs.existsSync(r.turnDiffPath)) return `the report names a turn diff the harvest deleted: ${r.turnDiffPath}`;
    } finally {
      if (r?.worktreePath && fs.existsSync(r.worktreePath))
        spawnSync("git", ["-C", repo, "worktree", "remove", "--force", r.worktreePath]);
    }
    return true;
  });

test("--worktree harvests a seat's COMMITS, not just its diff, before removing the tree",
  "harvesting against HEAD omits committed work, and removing a detached worktree can strand its commits; the harvest must include the full change from the base",
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
  "a seat that commits everything leaves porcelain empty; clean status must not cause removal to strand those commits",
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
  "crashed runs must not leave ledger entries and clean worktrees indefinitely; reconciliation must remove abandoned state",
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

test("--worktree refuses a destination that a symlink puts outside the checked repository",
  "checkRoot(repo) guards the source repository, but a symlinked .claude can redirect the worktree destination; that destination must be checked before git creates files or runs hooks",
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

// The git the DRIVER spawns, observed from outside: a shim that logs its own argv and execs the real
// binary. Resolved before the shim exists, or `command -v git` would find the shim.
const REAL_GIT = (() => {
  const r = spawnSync("/usr/bin/env", ["sh", "-c", "command -v git"], { encoding: "utf8" });
  return r.status === 0 && r.stdout.trim() ? r.stdout.trim() : "git";
})();

test("no git the driver spawns runs the repository's hooks, fsmonitor or external diff",
  "a seat can leave hooks, an fsmonitor or an external diff driver in the tree it worked in; harvest, removal and later worktree creation must not execute seat-authored code with the caller's rights",
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
      args: ["--worktree", repo, "--verify", "printf 'seat-work\\n' >> seed"],
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
  "a crashed seat can leave a spotless detached worktree whose HEAD is the only reference to its commits; porcelain alone cannot justify removing it",
  async () => {
    const repo = freshRepo("wt-reconcile-commits");
    if (!repo) return "git setup failed";
    // Check records with a base and legacy records without one; without a base, reachability from
    // any ref is what must be disproven.
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
  "the ledger entry must exist before worktree add so a crash during checkout cannot leave an unlisted tree",
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

test("a ledger entry that cannot be parsed is quarantined, and the tree it names survives",
  "an entry the reconciler cannot read is the ONLY name a crashed seat's tree has left: deleting it deletes the pointer to a checkout that may hold uncommitted work, and the tree then survives as an orphan nobody can find",
  async () => {
    const repo = freshRepo("wt-bad-entry");
    if (!repo) return "git setup failed";
    const planted = plantCrashedTree(repo, "codex-crash-unparsable", { commit: true });
    if (!planted) return "planting the crashed tree failed";
    const entry = path.join(STATE_DIR, "worktrees", "codex-crash-unparsable.json");
    // A truncated body is what an interrupted in-place write leaves; the reconciler cannot tell that
    // from corruption, and must not act on either.
    const torn = '{"path":"' + planted.dir + '","repo":';
    fs.writeFileSync(entry, torn);
    const { code, err } = await run(null, { args: ["--worktree", repo] });
    try {
      if (code !== EXIT.OK) return `the reconciling run exited ${code}: ${err.trim().slice(0, 200)}`;
      if (!fs.existsSync(planted.dir)) return "the tree named by the unparsable entry was removed";
      if (fs.existsSync(entry)) return "the unparsable entry was left in place, so every later run re-reads it";
      if (!fs.existsSync(`${entry}.bad`)) return `the unparsable entry was deleted rather than kept: ${err.trim().slice(0, 200)}`;
      if (fs.readFileSync(`${entry}.bad`, "utf8") !== torn) return "the quarantined entry is not the bytes that were there";
      if (!/could not be parsed; it is kept at/.test(err)) return `the quarantine was silent: ${err.trim().slice(0, 200)}`;
    } finally {
      spawnSync("git", ["-C", repo, "worktree", "remove", "--force", planted.dir]);
      fs.rmSync(`${entry}.bad`, { force: true });
      fs.rmSync(entry, { force: true });
    }
    return true;
  });

test("a ledger that cannot be written stops the run before `git worktree add`",
  "the ledger entry is what names a tree after a crash; writing it best-effort and adding anyway creates a checkout nothing points at, and 22 of 64 such orphans held uncommitted work",
  async () => {
    const repo = freshRepo("wt-ledger-unwritable");
    if (!repo) return "git setup failed";
    // A private state root, so obstructing the ledger cannot reach any other case's entries.
    const state = path.join(STATE_DIR, "ledger-unwritable-state");
    fs.mkdirSync(state, { recursive: true, mode: 0o700 });
    // A regular FILE where the ledger directory belongs: mkdir and the write both fail, and no
    // permission bit has to be trusted for the case to mean the same thing as root and as a user.
    fs.writeFileSync(path.join(state, "worktrees"), "not a directory\n");
    const { code, err } = await run(null, { args: ["--worktree", repo], env: { CODEX_DELEGATE_STATE_DIR: state } });
    if (code !== EXIT.USAGE) return `an unwritable ledger did not refuse the run: exit ${code} (${err.trim().slice(0, 200)})`;
    if (!/worktree ledger under .* could not be written/.test(err))
      return `the refusal did not name the ledger: ${err.trim().slice(0, 200)}`;
    let trees = [];
    try { trees = fs.readdirSync(path.join(repo, ".claude", "worktrees")); } catch {}
    if (trees.length) return `a tree was created although its ledger entry could not be: ${JSON.stringify(trees)}`;
    return true;
  });

test("the reconciler's bound reaches the OLDEST entries, not whichever fifty the filesystem lists first",
  "a bounded sweep must rotate through ledger entries; repeatedly taking the same unsorted prefix starves later entries forever",
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
  "a worktree seat's cwd can be removed after completion; --resume last from the repository must still find that seat rather than silently select a read seat",
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
  "resuming a completed worktree seat must rebuild its base and harvested changes so the continued thread sees its prior work",
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

test("a resumed seat that reverted everything leaves nothing for the next resume to reapply",
  "the record's pointers are what a rebuild reads: a resumed turn that ends on a clean tree harvested nothing, and keeping the previous turn's diff and archive would hand the third turn work the second one deliberately undid, at exit 0 and on a tree that is not the thread's",
  async () => {
    const repo = freshRepo("wt-resume-reverted");
    if (!repo) return "git setup failed";
    const first = await run(null, { args: ["--worktree", repo, "--verify",
      "printf 'seat-line\\n' >> seed && printf 'scratch\\n' > scratch.txt"] });
    let r1 = null; try { r1 = JSON.parse(first.out); } catch {}
    if (first.code !== EXIT.OK) return `the first seat exited ${first.code}: ${first.err.trim().slice(0, 160)}`;
    if (!r1?.worktreeDiffPath || !r1?.worktreeUntrackedPath)
      return `the first seat harvested nothing to revert: ${JSON.stringify({ d: r1?.worktreeDiffPath, u: r1?.worktreeUntrackedPath })}`;
    // The second turn puts the tree back exactly as it was created, so git calls it clean.
    const second = await run(null, { args: ["--worktree", repo, "--resume", "last", "--verify",
      "printf 'seed\\n' > seed && rm -f scratch.txt"] });
    let r2 = null; try { r2 = JSON.parse(second.out); } catch {}
    const third = await run(null, { args: ["--worktree", repo, "--resume", "last", "--verify", "cat seed; ls"] });
    let r3 = null; try { r3 = JSON.parse(third.out); } catch {}
    try {
      if (second.code !== EXIT.OK) return `the reverting seat exited ${second.code}: ${second.err.trim().slice(0, 200)}`;
      if (!r2) return "no JSON report from the reverting seat";
      if (r2.worktreeRestored?.diff !== r1.worktreeDiffPath)
        return `the reverting seat did not start from the first seat's work: ${JSON.stringify(r2.worktreeRestored)}`;
      if (r2.worktreeDiffPath !== null || r2.worktreeUntrackedPath !== null)
        return `a clean tree still reported harvested artefacts: ${JSON.stringify({ d: r2.worktreeDiffPath, u: r2.worktreeUntrackedPath })}`;
      for (const art of [r1.worktreeDiffPath, r1.worktreeUntrackedPath]) {
        if (fs.existsSync(art)) return `${art} survived the turn that harvested nothing`;
        if (!second.err.includes(`this turn harvested nothing, so the earlier ${art} was removed`))
          return `the removal was silent: ${second.err.trim().slice(-240)}`;
      }
      if (third.code !== EXIT.OK) return `the third seat exited ${third.code}: ${third.err.trim().slice(0, 200)}`;
      if (!r3) return "no JSON report from the third seat";
      if (r3.worktreeRestored?.diff !== null || r3.worktreeRestored?.untracked !== null)
        return `the third seat rebuilt work the second one undid: ${JSON.stringify(r3.worktreeRestored)}`;
      const saw = String(r3.verify?.stdout ?? "");
      if (!/^seed$/m.test(saw) || /seat-line/.test(saw) || /scratch\.txt/.test(saw))
        return `the third seat's tree is not the reverted one: ${JSON.stringify(saw.slice(0, 200))}`;
    } finally {
      for (const r of [r1, r2, r3]) {
        if (r?.worktreePath && fs.existsSync(r.worktreePath))
          spawnSync("git", ["-C", repo, "worktree", "remove", "--force", r.worktreePath]);
        for (const p of [r?.worktreeDiffPath, r?.worktreeUntrackedPath]) if (p) fs.rmSync(p, { force: true });
      }
    }
    return true;
  });

test("a crashed tree whose HEAD cannot be read is left in place, not removed",
  "an unreadable HEAD is not evidence of no commits; reconciliation must preserve a tree whose commit reachability cannot be determined",
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
  "a failed worktree add can leave a half-created tree; its ledger entry must survive so reconciliation can find it",
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
  "if archive restoration fails after the diff applies, the incomplete tree must be removed rather than preserved as successfully restored work",
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
  "a preserved tree must retain its ledger entry so the reconciler can continue to report it",
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

const failed = await runCases(CASES);

for (const d of workDirs) fs.rmSync(d, { recursive: true, force: true });
for (const d of [shimDir, STATE_DIR]) fs.rmSync(d, { recursive: true, force: true });
process.exit(summarize(failed, CASES.length));
