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
const READ_PROFILE = "codex_delegate_read";

const canon = (p) => { try { return fs.realpathSync(p); } catch { return p ?? null; } };

// One handshake against whichever binary is named, with the driver's own -c payload and params.
function handshake(bin, args, params, { timeoutMs = 60000, env = process.env } = {}) {
  return new Promise((resolve) => {
    let child;
    try { child = spawn(bin, [...args, "app-server"], { stdio: ["pipe", "pipe", "pipe"], env }); }
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
        send({ jsonrpc: "2.0", method: "initialized" });
        send({ jsonrpc: "2.0", id: 2, method: "thread/start", params });
      }
      if (m.id === 2) done(m.error
        ? { failure: { kind: "JSON-RPC error", detail: `thread/start returned ${JSON.stringify(m.error)}` } }
        : { result: m.result });
    });
    send({ jsonrpc: "2.0", id: 1, method: "initialize", params: { clientInfo: { name: "fidelity", title: "fidelity", version: "0" } } });
  });
}

// The fields whose shape the driver actually reasons about. Compared canonically, because the server
// returns realpaths while a caller's config may not.
function shapeOf(r) {
  const sb = r?.sandbox ?? {};
  return {
    sandboxType: sb.type ?? null,
    writableRoots: (sb.writableRoots ?? []).map(canon).sort(),
    networkAccess: Boolean(sb.networkAccess),
    excludeSlashTmp: sb.excludeSlashTmp ?? null,
    workspaceRoots: (r?.runtimeWorkspaceRoots ?? []).map(canon).sort(),
    profileId: r?.activePermissionProfile?.id ?? null,
    approvalPolicy: r?.approvalPolicy ?? null,
    approvalsReviewer: r?.approvalsReviewer ?? null,
  };
}

const workDirs = [];
const freshDir = (n) => { const d = fs.mkdtempSync(path.join(os.tmpdir(), `fidelity-${n}-`)); workDirs.push(d); return d; };

// The header claimed this suite writes nothing. It was false: the server records a trusted-project entry in
// CODEX_HOME/config.toml for every unseen cwd it is handed, and since every case here mints a fresh temp
// cwd, the caller's own config grew a dead entry per case per run — 195 `fidelity-*` tables out of 326 by
// the time anyone measured it. A private home fixes that, and it makes the comparison truer besides: the
// driver now runs isolated too, so what the live server reads is the `-c` payload and nothing a user
// happens to keep in their own config.
const CODEX_HOME = freshDir("home");
const liveEnv = (env) => ({ ...(env ?? process.env), CODEX_HOME });

const readCfg = [
  "-c", "web_search=disabled",
  "-c", `permissions.${READ_PROFILE}.extends=":read-only"`,
  "-c", `permissions.${READ_PROFILE}.filesystem={":tmpdir"="write"}`,
  "-c", `default_permissions="${READ_PROFILE}"`,
];
const writeCfg = (roots, net) => [
  "-c", "web_search=disabled",
  "-c", `sandbox_workspace_write.writable_roots=[${roots.map((r) => JSON.stringify(r)).join(",")}]`,
  "-c", `sandbox_workspace_write.network_access=${net}`,
];
const baseParams = (cwd, extra = {}) => ({
  cwd, model: null, approvalPolicy: "on-request", approvalsReviewer: "user",
  developerInstructions: "fidelity probe", serviceName: "fidelity", ephemeral: true, ...extra,
});

// Each case is a request both servers must answer alike. They exist because each one is a place where the
// fixture and the real server HAVE diverged, or plainly could.
const CASES = [
  { name: "read level, ordinary cwd",
    why: "the baseline: one writable root, the profile applied, /tmp excluded",
    build: () => { const d = freshDir("read"); return { args: readCfg, params: baseParams(d) }; } },

  { name: "read level, cwd IS $TMPDIR",
    why: "the server subtracts the workspace root from writableRoots — the fixture reported it for months",
    build: () => { const d = freshDir("readtmp"); return { args: readCfg, params: baseParams(d), env: { ...process.env, TMPDIR: d } }; } },

  { name: "write level, no extra roots",
    why: "writableRoots is empty and the cwd appears only under runtimeWorkspaceRoots",
    build: () => { const d = freshDir("write"); return { args: writeCfg([], false), params: baseParams(d, { sandbox: "workspace-write" }) }; } },

  { name: "write level, one extra root",
    why: "the extra root is reported, the cwd still is not",
    build: () => { const d = freshDir("wr1"); const e = freshDir("wr1x"); return { args: writeCfg([e], false), params: baseParams(d, { sandbox: "workspace-write" }) }; } },

  { name: "write level, the cwd named as a writable root",
    why: "the exact request that failed live with exit 4 while all 77 cases stayed green",
    build: () => { const d = freshDir("wrself"); return { args: writeCfg([d], false), params: baseParams(d, { sandbox: "workspace-write" }) }; } },

  { name: "write level, a root named twice",
    why: "the server dedupes; a driver that does not compares two entries against one",
    build: () => { const d = freshDir("wrdup"); const e = freshDir("wrdupx"); return { args: writeCfg([e, e], false), params: baseParams(d, { sandbox: "workspace-write" }) }; } },

  { name: "write level, network requested",
    why: "networkAccess must follow the flag and nothing else",
    build: () => { const d = freshDir("wrnet"); return { args: writeCfg([], true), params: baseParams(d, { sandbox: "workspace-write" }) }; } },

  { name: "read level, the filesystem grant misspelled",
    why: "a typo inside the profile silently drops the grant while the id still reads back correctly",
    build: () => { const d = freshDir("typo"); return {
      args: ["-c", "web_search=disabled", "-c", `permissions.${READ_PROFILE}.extends=":read-only"`,
             "-c", `permissions.${READ_PROFILE}.filesysten={":tmpdir"="write"}`,
             "-c", `default_permissions="${READ_PROFILE}"`],
      params: baseParams(d) }; } },
];

let failed = 0, skipped = 0;
for (const c of CASES) {
  const { args, params, env } = c.build();
  const live = await handshake("codex", ["--strict-config", ...args], params, { env: liveEnv(env) });
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
  const fake = await handshake(process.execPath, [FAKE, ...args], params, { env: { ...(env ?? process.env), FAKE_SCENARIO: "happy" } });
  if (fake.unavailable || fake.failure) {
    failed++;
    const why = fake.failure ? `${fake.failure.kind}: ${fake.failure.detail}` : `binary absent: ${fake.unavailable}`;
    console.log(`FAIL  ${c.name}\n      the fixture did not answer: ${why.slice(0, 160)}`);
    continue;
  }

  const L = shapeOf(live.result), F = shapeOf(fake.result);
  const diffs = Object.keys(L).filter((k) => JSON.stringify(L[k]) !== JSON.stringify(F[k]));
  if (!diffs.length) { console.log(`ok    ${c.name}`); continue; }
  failed++;
  console.log(`FAIL  ${c.name}\n      ${c.why}`);
  for (const k of diffs) console.log(`      ${k}: live=${JSON.stringify(L[k])}  fixture=${JSON.stringify(F[k])}`);
}

for (const d of workDirs) fs.rmSync(d, { recursive: true, force: true });
const ran = CASES.length - skipped;
console.log(!ran ? `\n${skipped} skipped (codex binary absent); no live comparisons ran`
  : skipped ? `\n${skipped} skipped (codex binary absent), ${failed ? `${failed}/${ran} failed or diverged` : `all ${ran} cases that ran agree`}`
  : failed ? `\n${failed}/${CASES.length} failed or diverged` : `\nall ${CASES.length} agree`);
// An ENOENT skip is not a pass, but it is not a defect either: exit 0 so CI without codex stays usable.
// Every case that reached a process must agree for the suite to exit 0.
process.exit(failed ? 1 : 0);
