#!/usr/bin/env node
// Differential test: does evals/fake-app-server.mjs answer thread/start the way the REAL server does?
//
//   node evals/fidelity.test.mjs
//
// The other two suites drive the driver against the fixture. That proves the driver behaves as the fixture
// expects — and the fixture is one person's model of the server. When that model is wrong, the driver and
// the fixture are wrong in the SAME way and every case stays green while production fails. This has now
// happened twice: `move_path` dropped from a rename, and the cwd not subtracted from writableRoots. Both
// were live-server behaviours the fixture did not model, both shipped under a fully green suite.
//
// So this suite asks a different question: for the same request, does the fixture reply like the real
// thing? It only ever performs the initialize/thread/start handshake — no turn is started and no model is
// called — which makes it cheap enough to run on every change to either side.
//
// It writes into a private CODEX_HOME, not the caller's: a bare thread/start is enough to make the server
// record a trusted-project entry, so the earlier claim that this suite wrote nothing was wrong by 195
// entries. Nothing of the caller's is read or modified, and every case still costs one handshake.
//
// It SKIPS rather than fails only when `codex` is absent, because a missing binary is not a fidelity
// defect. Every other spawn or handshake failure is protocol drift. A skip is reported loudly so it
// cannot be mistaken for a pass.

import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FAKE = path.join(HERE, "fake-app-server.mjs");
const DRIVER = path.join(HERE, "..", "scripts", "driver.mjs");
const READ_PROFILE = "codex_delegate_read";

const canon = (p) => { try { return fs.realpathSync(p); } catch { return p ?? null; } };

// Replay the request captured from the driver against whichever server is named. `args` already ends in
// app-server: appending it here would make this test almost-the-driver rather than the driver.
function handshake(bin, args, request, { timeoutMs = 60000, env = process.env } = {}) {
  return new Promise((resolve) => {
    let child;
    try { child = spawn(bin, args, { cwd: request.spawnCwd, stdio: ["pipe", "pipe", "pipe"], env }); }
    catch (e) {
      return resolve(e?.code === "ENOENT"
        ? { unavailable: e.message }
        : { failure: { kind: "spawn failure", detail: e.message } });
    }
    let err = "", settled = false, started = false, lines;
    let bell;
    child.stderr.on("data", (d) => { err += d; });
    child.stdin.on("error", () => {});
    child.once("spawn", () => { started = true; });
    const send = (o) => { try { child.stdin.write(`${JSON.stringify(o)}\n`); } catch {} };
    const detail = (prefix) => {
      const stderr = err.trim().replace(/\s+/g, " ").slice(0, 200);
      return stderr ? `${prefix}: ${stderr}` : prefix;
    };
    const done = (v, kill = true) => {
      if (settled) return;
      settled = true;
      clearTimeout(bell);
      try { lines?.close(); } catch {}
      if (kill) { try { child.kill("SIGKILL"); } catch {} }
      resolve(v);
    };
    child.once("error", (e) => done(!started && e?.code === "ENOENT"
      ? { unavailable: e.message }
      : { failure: { kind: "spawn failure", detail: e.message } }));
    child.once("close", (code, signal) => {
      const status = signal ? `signal ${signal}` : `code ${code}`;
      done({ failure: { kind: "child exited", detail: detail(`app-server exited (${status})`) } }, false);
    });
    bell = setTimeout(() => done({
      failure: { kind: "handshake timeout", detail: detail(`no reply in ${timeoutMs}ms`) },
    }), timeoutMs);
    lines = readline.createInterface({ input: child.stdout });
    lines.on("line", (line) => {
      let m; try { m = JSON.parse(line); } catch { return; }
      if (m.id === 1) {
        if (m.error) { done({ failure: { kind: "JSON-RPC error", detail: `initialize returned ${JSON.stringify(m.error)}` } }); return; }
        send({ jsonrpc: "2.0", method: "initialized", params: request.initializedParams });
        send({ jsonrpc: "2.0", id: 2, method: request.threadMethod, params: request.threadParams });
      }
      if (m.id === 2) done(m.error
        ? { failure: { kind: "JSON-RPC error", detail: `thread/start returned ${JSON.stringify(m.error)}` } }
        : { result: m.result });
    });
    send({ jsonrpc: "2.0", id: 1, method: "initialize", params: request.initializeParams });
  });
}

// The fields whose shape the driver actually reasons about. Workspace roots are canonicalised because
// that is exactly what the driver's assertions do. Writable roots deliberately are NOT: the live server
// canonicalises :tmpdir roots, but echoes configured write roots and subtracts cwd by exact spelling.
// Canonicalising that field here erased the distinction this suite is meant to pin.
const idShape = (id) => typeof id === "string" && id.length ? "<non-empty string>" : (id ?? null);
function shapeOf(r) {
  const sb = r?.sandbox ?? {};
  return {
    threadId: idShape(r?.thread?.id),
    cwd: r?.cwd ?? null,
    model: r?.model ?? null,
    modelProvider: r?.modelProvider ?? null,
    reasoningEffort: r?.reasoningEffort ?? null,
    serviceTier: r?.serviceTier ?? null,
    sandboxType: sb.type ?? null,
    writableRoots: [...(sb.writableRoots ?? [])].sort(),
    networkAccess: Boolean(sb.networkAccess),
    excludeSlashTmp: sb.excludeSlashTmp ?? null,
    workspaceRoots: (r?.runtimeWorkspaceRoots ?? []).map(canon).sort(),
    profileId: r?.activePermissionProfile?.id ?? null,
    approvalPolicy: r?.approvalPolicy ?? null,
    approvalsReviewer: r?.approvalsReviewer ?? null,
  };
}

// Three live differences were hidden outside the old subset. `model` is now compared under a fixed
// inherited config. The other two are thread.cwd and thread.ephemeral: the fixture's nested Thread is
// intentionally canned history metadata (/tmp and false), while this driver reads neither field (it uses
// the top-level cwd/runtimeWorkspaceRoots and its own request flag). Comparing them would turn harmless
// fixture metadata into permanent noise. Volatile ids/timestamps and new response-only metadata such as
// instructionSources/multiAgentMode are excluded for the same reason; thread.id is the exception because
// the driver uses it to attribute every event and to start the turn, so its required non-empty shape is
// compared above and asserted independently below.

const workDirs = [];
const freshDir = (n) => { const d = fs.mkdtempSync(path.join(os.tmpdir(), `fidelity-${n}-`)); workDirs.push(d); return d; };
let cleaned = false;
function cleanup() {
  if (cleaned) return;
  cleaned = true;
  for (const d of workDirs) { try { fs.rmSync(d, { recursive: true, force: true }); } catch {} }
}
// `finally` below covers ordinary exceptions. The exit hook also covers an asynchronous stream error —
// notably stdout EPIPE when a caller closes a pipe — which otherwise bypasses that control flow.
process.once("exit", cleanup);

// Capture the driver's real app-server argv and initialize/thread requests without starting a turn. The
// preload changes only os.userInfo().homedir for this child, so the driver's passwd-anchored isolated home
// lands under our temp directory instead of ~/.codex-delegate. The capture server exits as soon as it sees
// thread/start and never replies to it, so the driver cannot issue turn/start.
const CAPTURE_MARKER = "FIDELITY_DRIVER_CAPTURE ";
const captureRoot = freshDir("capture");
const captureBin = path.join(captureRoot, "bin");
const capturePreload = path.join(captureRoot, "passwd-home.cjs");
const captureServer = path.join(captureBin, "codex");
fs.mkdirSync(captureBin);
fs.writeFileSync(capturePreload, String.raw`"use strict";
const os = require("node:os");
const realUserInfo = os.userInfo;
os.userInfo = () => {
  const homedir = process.env.FIDELITY_PASSWD_HOME;
  if (!homedir) throw new Error("FIDELITY_PASSWD_HOME is missing");
  return { ...realUserInfo(), homedir };
};
`);
fs.writeFileSync(captureServer, String.raw`#!/usr/bin/env node
"use strict";
const readline = require("node:readline");
const MARKER = "FIDELITY_DRIVER_CAPTURE ";
let initializeParams = null;
let initializedParams = null;
const send = (o) => process.stdout.write(JSON.stringify(o) + "\n");
readline.createInterface({ input: process.stdin }).on("line", (line) => {
  let m;
  try { m = JSON.parse(line); } catch { return; }
  if (m.method === "initialize") {
    initializeParams = m.params;
    send({ jsonrpc: "2.0", id: m.id, result: {
      userAgent: "fidelity-capture", codexHome: process.env.CODEX_HOME,
      platformFamily: "unix", platformOs: process.platform
    } });
    return;
  }
  if (m.method === "initialized") { initializedParams = m.params; return; }
  // The driver asks the server what the caller's config resolves to before it starts anything, so the
  // capture has to answer that too or the driver never reaches thread/start and every case fails with
  // "capture timed out". Fixed values, because this suite must not depend on the developer's own config —
  // ISOLATED_CONFIG below is what the driver is then expected to have written.
  if (m.method === "config/read") {
    send({ jsonrpc: "2.0", id: m.id, result: { config: {
      model: "fake-model", model_reasoning_effort: "high", personality: "none", service_tier: "auto",
      // Deliberately NOT in the driver's INHERITED list, and the reason it is here: without a key the
      // driver ignores, ADDING one to that list changed nothing observable and every suite stayed green.
      // With it, a widened list writes a fifth line into the isolated config and ISOLATED_CONFIG below
      // stops matching. Removing a key was already caught; this is the other direction.
      model_verbosity: "high",
    }, origins: {} } });
    return;
  }
  if (m.method === "thread/start" || m.method === "thread/resume") {
    const captured = {
      spawnArgs: process.argv.slice(2), spawnCwd: process.cwd(), codexHome: process.env.CODEX_HOME,
      initializeParams, initializedParams, threadMethod: m.method, threadParams: m.params
    };
    process.stderr.write(MARKER + JSON.stringify(captured) + "\n", () => process.exit(86));
  }
});
`, { mode: 0o700 });

// All four production-inherited scalars are present, but their values are fixed by the test. `fake-model`
// matches the fixture's deterministic fallback, `high` is also sent as the driver's real --effort
// override so the fixture can observe it without pretending to parse config.toml, and `auto` resolves to
// the protocol's null service tier. The extra scalar in the capture's reply is what makes a WIDENED
// INHERITED list visible; a probe pointed at the wrong CODEX_HOME is NOT pinned by anything here, and
// saying so is better than the claim that used to sit on this line.
const CALLER_CONFIG = `model = "fake-model"\nmodel_reasoning_effort = "high"\npersonality = "none"\nservice_tier = "auto"\nmodel_verbosity = "low"\n\n[mcp_servers.must_not_escape]\ncommand = "false"\n`;
const ISOLATED_CONFIG = `model = "fake-model"\nmodel_reasoning_effort = "high"\npersonality = "none"\nservice_tier = "auto"\n`;

function captureDriver(spec) {
  const passwdHome = freshDir("passwd");
  const callerCodex = path.join(passwdHome, ".codex");
  fs.mkdirSync(callerCodex);
  fs.writeFileSync(path.join(callerCodex, "config.toml"), CALLER_CONFIG, { mode: 0o600 });

  const driverArgs = [DRIVER, "--level", spec.level, "--cwd", spec.cwd,
    "--effort", "high", "--ephemeral", "--prompt", "fidelity probe"];
  for (const root of spec.writable ?? []) driverArgs.push("--writable", root);
  if (spec.network) driverArgs.push("--network");
  const baseEnv = spec.env ?? process.env;
  const driverEnv = {
    ...baseEnv,
    FIDELITY_PASSWD_HOME: passwdHome,
    PATH: `${captureBin}${path.delimiter}${baseEnv.PATH ?? ""}`,
  };

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--require", capturePreload, ...driverArgs], {
      stdio: ["ignore", "pipe", "pipe"], env: driverEnv,
    });
    let stdout = "", stderr = "", settled = false;
    child.stdout.on("data", (d) => { stdout += d; });
    child.stderr.on("data", (d) => { stderr += d; });
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(bell);
      fn(value);
    };
    child.once("error", (e) => finish(reject, new Error(`cannot run driver capture: ${e.message}`)));
    child.once("close", () => {
      const lines = stderr.split("\n").filter((line) => line.startsWith(CAPTURE_MARKER));
      if (lines.length !== 1) {
        const detail = `${stderr}\n${stdout}`.trim().replace(/\s+/g, " ").slice(0, 400);
        finish(reject, new Error(`driver emitted ${lines.length} capture records${detail ? `: ${detail}` : ""}`));
        return;
      }
      let captured;
      try { captured = JSON.parse(lines[0].slice(CAPTURE_MARKER.length)); }
      catch (e) { finish(reject, new Error(`driver capture was not JSON: ${e.message}`)); return; }
      const expectedHome = path.join(passwdHome, ".codex-delegate", "home");
      if (captured.codexHome !== expectedHome)
        { finish(reject, new Error(`driver used CODEX_HOME ${JSON.stringify(captured.codexHome)}, expected ${JSON.stringify(expectedHome)}`)); return; }
      if (captured.threadMethod !== "thread/start")
        { finish(reject, new Error(`driver sent ${JSON.stringify(captured.threadMethod)}, expected thread/start`)); return; }
      if (captured.spawnArgs?.at(-1) !== "app-server")
        { finish(reject, new Error(`driver argv did not end in app-server: ${JSON.stringify(captured.spawnArgs)}`)); return; }
      // A differential compares two REPLIES to one request, so anything wrong with the REQUEST is
      // invisible: the capture replays it to both servers and both agree on the same wrong thing.
      // Measured — mutating web_search to `live`, dropping --strict-config, flipping experimentalApi or
      // ephemeral each left all nine agreeing, because no response field carries their effect. So those
      // four are asserted here by value — a small explicit list, not a second copy of the driver's argv.
      // A child pointed at a different TMPDIR is invisible HERE too, but is not unpinned: it reddens 48
      // of 59 protocol cases and one lock case. The earlier version of this comment claimed otherwise.
      const sent = (key) => {
        const i = captured.spawnArgs.findIndex((a, n) => captured.spawnArgs[n - 1] === "-c" && a.startsWith(`${key}=`));
        return i < 0 ? null : captured.spawnArgs[i].slice(key.length + 1);
      };
      const expect = (what, got, want) => {
        if (got === want) return false;
        finish(reject, new Error(`driver sent ${what} as ${JSON.stringify(got)}, expected ${JSON.stringify(want)}`));
        return true;
      };
      if (expect("-c web_search", sent("web_search"), "disabled")) return;
      if (expect("--strict-config", captured.spawnArgs.includes("--strict-config"), true)) return;
      if (expect("initialize capabilities.experimentalApi", captured.initializeParams?.capabilities?.experimentalApi, false)) return;
      // The capture invokes the driver WITH --ephemeral (line ~211), so true is the correct value here;
      // asserting undefined was my own mistake and the suite caught it on the first run.
      if (expect("thread ephemeral", captured.threadParams?.ephemeral, true)) return;
      let isolated;
      try { isolated = fs.readFileSync(path.join(expectedHome, "config.toml"), "utf8"); }
      catch (e) { finish(reject, new Error(`cannot read driver's isolated config: ${e.message}`)); return; }
      // A byte compare, so ADDING an inherited scalar reddens all nine cases at once. That is intended —
      // what the driver carries across the isolation boundary is a decision, not an implementation detail —
      // but the message has to say what changed, or the next person sees nine failures naming nothing.
      if (isolated !== ISOLATED_CONFIG)
        { finish(reject, new Error(`driver isolated config drifted\n  expected: ${JSON.stringify(ISOLATED_CONFIG)}\n  got:      ${JSON.stringify(isolated)}`)); return; }
      finish(resolve, {
        ...captured,
        replayEnv: { ...baseEnv, CODEX_HOME: expectedHome },
      });
    });
    const bell = setTimeout(() => {
      try { child.kill("SIGKILL"); } catch {}
      finish(reject, new Error("driver capture timed out before thread/start"));
    }, 10000);
  });
}

function replaceConfig(request, key, value) {
  const args = [...request.spawnArgs];
  const prefix = `${key}=`;
  const indexes = args.flatMap((arg, i) => args[i - 1] === "-c" && arg.startsWith(prefix) ? [i] : []);
  if (indexes.length !== 1) throw new Error(`expected one ${key} in driver argv, found ${indexes.length}`);
  args[indexes[0]] = `${key}=${value}`;
  return { ...request, spawnArgs: args };
}

function misspellConfig(request, key, misspelling) {
  const args = [...request.spawnArgs];
  const prefix = `${key}=`;
  const indexes = args.flatMap((arg, i) => args[i - 1] === "-c" && arg.startsWith(prefix) ? [i] : []);
  if (indexes.length !== 1) throw new Error(`expected one ${key} in driver argv, found ${indexes.length}`);
  args[indexes[0]] = `${misspelling}${args[indexes[0]].slice(key.length)}`;
  return { ...request, spawnArgs: args };
}

const WRITE_ROOTS = "sandbox_workspace_write.writable_roots";

// Every request starts with a real driver capture. Three cases then alter one captured config value to
// probe server boundary rules the driver normally pre-normalises: alias subtraction, exact deduplication,
// and a misspelled profile field. Params, all other -c values, cwd, environment, and isolated home remain
// exactly what the driver produced.
const CASES = [
  { name: "read level, ordinary cwd",
    why: "the baseline: one writable root, the profile applied, /tmp excluded",
    build: () => ({ level: "read", cwd: freshDir("read") }) },

  { name: "read level, cwd IS $TMPDIR",
    why: "the canonicalised :tmpdir root equals the driver's realpath'd cwd and must be subtracted",
    build: () => { const d = freshDir("readtmp"); return { level: "read", cwd: d, env: { ...process.env, TMPDIR: d } }; } },

  { name: "write level, no extra roots",
    why: "writableRoots is empty and the cwd appears only under runtimeWorkspaceRoots",
    build: () => ({ level: "write", cwd: freshDir("write") }) },

  { name: "write level, one extra root",
    why: "the extra root is reported, the cwd still is not",
    build: () => ({ level: "write", cwd: freshDir("wr1"), writable: [freshDir("wr1x")] }) },

  { name: "write level, the cwd named as a writable root",
    why: "write roots are compared to cwd by spelling, so a symlink spelling of cwd is not subtracted",
    build: () => {
      const d = freshDir("wrself"), aliasDir = freshDir("wrself-alias"), alias = path.join(aliasDir, "cwd-link");
      fs.symlinkSync(d, alias, "dir");
      return { level: "write", cwd: d, writable: [alias],
        mutate: (r) => replaceConfig(r, WRITE_ROOTS, JSON.stringify([alias])) };
    } },

  // The base rule the alias case above refines, and it went uncovered when that case was rewritten to use
  // a symlink: the driver filters the cwd out of its own roots, so nothing reaches this branch of the
  // server unless the request is mutated to put it back. Measured while it was missing — deleting the
  // fixture's cwd subtraction left all three suites green.
  { name: "write level, the cwd's own spelling sent as a writable root",
    why: "the server subtracts the cwd from writableRoots when the spellings match exactly",
    build: () => {
      const d = freshDir("wrcwd");
      return { level: "write", cwd: d, mutate: (r) => replaceConfig(r, WRITE_ROOTS, JSON.stringify([canon(d)])) };
    } },

  // The rewrite replaced this case's exact duplicate with two alias spellings, which tests a different
  // rule and left the plain one uncovered: deleting the fixture's dedup kept all nine agreeing. Both
  // spellings of the question are needed.
  { name: "write level, the same root named twice, spelled identically",
    why: "the server collapses an exact duplicate before reporting writableRoots",
    build: () => {
      const d = freshDir("wrdup2"), e = freshDir("wrdup2x");
      return { level: "write", cwd: d, writable: [e],
        mutate: (r) => replaceConfig(r, WRITE_ROOTS, JSON.stringify([canon(e), canon(e)])) };
    } },

  { name: "write level, a root named twice",
    why: "write-root deduplication is by exact spelling, not canonical identity",
    build: () => {
      const d = freshDir("wrdup"), e = freshDir("wrdupx"), aliasDir = freshDir("wrdup-alias"), alias = path.join(aliasDir, "root-link");
      fs.symlinkSync(e, alias, "dir");
      return { level: "write", cwd: d, writable: [e, alias],
        mutate: (r) => replaceConfig(r, WRITE_ROOTS, JSON.stringify([canon(e), alias])) };
    } },

  { name: "write level, network requested",
    why: "networkAccess must follow the flag and nothing else",
    build: () => ({ level: "write", cwd: freshDir("wrnet"), network: true }) },

  { name: "read level, the filesystem grant misspelled",
    why: "a typo inside the profile silently drops the grant while the id still reads back correctly",
    build: () => ({ level: "read", cwd: freshDir("typo"),
      mutate: (r) => misspellConfig(r, `permissions.${READ_PROFILE}.filesystem`, `permissions.${READ_PROFILE}.filesysten`) }) },
];

async function main() {
  let failed = 0, skipped = 0;
  for (const c of CASES) {
    let request, spec;
    try {
      spec = c.build();
      request = await captureDriver(spec);
      if (spec.mutate) request = spec.mutate(request);
    } catch (e) {
      failed++;
      console.log(`FAIL  ${c.name}\n      could not derive the request from scripts/driver.mjs: ${e.message.slice(0, 240)}`);
      continue;
    }

    const live = await handshake("codex", request.spawnArgs, request, { env: request.replayEnv });
    if (live.unavailable) {
      skipped++;
      console.log(`SKIP  ${c.name}\n      codex binary absent (spawn ENOENT): ${live.unavailable.slice(0, 120)}`);
      continue;
    }
    if (live.failure) {
      failed++;
      console.log(`FAIL  ${c.name}\n      protocol drift (live ${live.failure.kind}; not a missing binary): ${live.failure.detail.slice(0, 160)}`);
      continue;
    }
    const fake = await handshake(process.execPath, [FAKE, ...request.spawnArgs], request, {
      env: { ...request.replayEnv, FAKE_SCENARIO: "happy" },
    });
    if (fake.unavailable || fake.failure) {
      failed++;
      const why = fake.failure ? `${fake.failure.kind}: ${fake.failure.detail}` : `binary absent: ${fake.unavailable}`;
      console.log(`FAIL  ${c.name}\n      the fixture did not answer: ${why.slice(0, 160)}`);
      continue;
    }

    const L = shapeOf(live.result), F = shapeOf(fake.result);
    const diffs = new Set(Object.keys(L).filter((k) => JSON.stringify(L[k]) !== JSON.stringify(F[k])));
    // Required on the live response and operationally load-bearing. If both sides ever omit it together,
    // equality alone is not enough: that shared mistake must still make the suite red.
    if (L.threadId !== "<non-empty string>" || F.threadId !== "<non-empty string>") diffs.add("threadId");
    if (!diffs.size) { console.log(`ok    ${c.name}`); continue; }
    failed++;
    console.log(`FAIL  ${c.name}\n      ${c.why}`);
    for (const k of diffs) console.log(`      ${k}: live=${JSON.stringify(L[k])}  fixture=${JSON.stringify(F[k])}`);
  }

  const ran = CASES.length - skipped;
  console.log(!ran ? `\n${skipped} skipped (codex binary absent); no live comparisons ran`
    : skipped ? `\n${skipped} skipped (codex binary absent), ${failed ? `${failed}/${ran} failed or diverged` : `all ${ran} cases that ran agree`}`
    : failed ? `\n${failed}/${CASES.length} failed or diverged` : `\nall ${CASES.length} agree`);
  // An ENOENT skip is not a pass, but it is not a defect either: exit 0 so CI without codex stays usable.
  // Every case that reached a process must agree for the suite to exit 0.
  return failed ? 1 : 0;
}

let exitCode = 1;
try { exitCode = await main(); }
finally { cleanup(); }
process.exitCode = exitCode;
