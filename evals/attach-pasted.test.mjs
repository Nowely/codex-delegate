#!/usr/bin/env node
// Tests for scripts/attach-pasted.mjs — the front-end that hands a user's PASTED images to a seat.
//
//   node evals/attach-pasted.test.mjs
//
// It never calls codex: the driver is replaced by a shim that records the argv it was given, so every
// case checks what WOULD have been delegated. The transcripts are synthetic but shaped like the real
// ones — including the machine records that share the "user" type and once made an offset selector
// count the wrong turns.

import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FRONT = path.join(HERE, "..", "skills", "codex-delegate", "scripts", "attach-pasted.mjs");

const work = fs.mkdtempSync(path.join(os.tmpdir(), "codex-attach-test-"));
process.on("exit", () => { try { fs.rmSync(work, { recursive: true, force: true }); } catch {} });

// A real 1x1 PNG and a real 2x1 PNG, so the magic-byte check and the dimension reader see genuine
// files rather than a string that happens to be base64.
const PNG_1x1 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const PNG_2x1 = "iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAAEklEQVR42mP8z8Dwn4GBgYEBAA8+AwGpB1MlAAAAAElFTkSuQmCC";

let seq = 0;
const ts = (min) => new Date(Date.UTC(2026, 8, 1, 12, min, 0)).toISOString();
const humanTurn = (blocks, minutes, origin = { kind: "human" }) => JSON.stringify({
  type: "user", uuid: `uuid-${String(++seq).padStart(4, "0")}`, timestamp: ts(minutes),
  isSidechain: false, ...(origin ? { origin } : {}),
  message: { role: "user", content: blocks },
});
const img = (b64) => ({ type: "image", source: { type: "base64", media_type: "image/png", data: b64 } });
const txt = (t) => ({ type: "text", text: t });

// The machine records that share type "user" and are NOT human turns.
const taskNotification = (minutes) => JSON.stringify({
  type: "user", uuid: `uuid-tn-${++seq}`, timestamp: ts(minutes), origin: { kind: "task-notification" },
  message: { role: "user", content: [txt("<task-notification>\n<task-id>x</task-id>\n</task-notification>")] },
});
const skillMeta = (minutes) => JSON.stringify({
  type: "user", uuid: `uuid-meta-${++seq}`, timestamp: ts(minutes), isMeta: true,
  message: { role: "user", content: [txt("Base directory for this skill: /x")] },
});
const toolResult = (minutes) => JSON.stringify({
  type: "user", uuid: `uuid-tr-${++seq}`, timestamp: ts(minutes),
  message: { role: "user", content: [{ type: "tool_result", tool_use_id: "t1", content: [img(PNG_1x1)] }] },
});

function transcript(name, lines) {
  const p = path.join(work, `${name}.jsonl`);
  fs.writeFileSync(p, lines.join("\n") + "\n");
  return p;
}

// A driver shim: records argv, exits with whatever RC says.
const shimDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-attach-shim-"));
process.on("exit", () => { try { fs.rmSync(shimDir, { recursive: true, force: true }); } catch {} });
const argvLog = path.join(shimDir, "argv.json");
const driverShim = path.join(shimDir, "driver.mjs");
// It records the argv AND the bytes of each attachment while they still exist: the front-end removes
// them when the run ends, which is the point of the hygiene case below, so a test that stats them
// afterwards is testing its own timing rather than the contract.
fs.writeFileSync(driverShim,
  `import fs from "node:fs";\n` +
  `const argv = process.argv.slice(2);\n` +
  `const files = argv.map((a, i) => (argv[i - 1] === "--attach" ? { path: a, bytes: fs.statSync(a).size } : null)).filter(Boolean);\n` +
  `fs.writeFileSync(${JSON.stringify(argvLog)}, JSON.stringify({ argv, files }));\n` +
  `process.exit(Number(process.env.SHIM_RC ?? 0));\n`);

// The front-end resolves the driver as its own sibling, so the shim has to sit beside a copy of it.
const frontCopy = path.join(shimDir, "attach-pasted.mjs");
fs.copyFileSync(FRONT, frontCopy);

const stateDir = path.join(work, "state");

function run(args, env = {}) {
  try { fs.rmSync(argvLog, { force: true }); } catch {}
  const r = spawnSync(process.execPath, [frontCopy, ...args], {
    encoding: "utf8",
    env: { ...process.env, CODEX_DELEGATE_STATE_DIR: stateDir, CLAUDE_CODE_SESSION_ID: "", ...env },
  });
  let seen = null;
  try { seen = JSON.parse(fs.readFileSync(argvLog, "utf8")); } catch {}
  return { code: r.status, out: r.stdout ?? "", err: r.stderr ?? "", argv: seen?.argv ?? null, files: seen?.files ?? null };
}

const CASES = [];
const test = (name, why, fn) => CASES.push({ name, why, fn });

test("every image of the latest human turn is forwarded, in paste order",
  "the main agent receives all N blocks in order; forwarding one of three is strictly below what the coordinator itself saw",
  () => {
    const t = transcript("multi", [
      humanTurn([img(PNG_1x1), txt("older single")], 10),
      humanTurn([img(PNG_1x1), img(PNG_2x1), img(PNG_1x1), txt("describe these")], 20),
    ]);
    const r = run(["--pasted-transcript", t, "--", "--cwd", work, "--prompt", "x"]);
    if (r.code !== 0) return `exit ${r.code}: ${r.err.trim().slice(0, 200)}`;
    const files = r.files ?? [];
    if (files.length !== 3) return `expected 3 attachments, got ${files.length}`;
    const sizes = files.map((f) => f.bytes);
    if (!(sizes[1] > sizes[0])) return `order lost: the 2x1 png should be the SECOND attachment (${sizes})`;
    if (r.argv.slice(-4).join(" ") !== "--cwd " + work + " --prompt x")
      return `driver flags were not passed through verbatim: ${JSON.stringify(r.argv.slice(-4))}`;
    return true;
  });

test("machine records that share the \"user\" type are not human turns",
  "task notifications and the skill loader's isMeta injections outnumber human turns in a live session; counting them selects the wrong image with no error",
  () => {
    const t = transcript("machine", [
      humanTurn([img(PNG_1x1), txt("the real paste")], 10),
      taskNotification(11), skillMeta(12), toolResult(13),
    ]);
    const r = run(["--pasted-transcript", t, "--", "--cwd", work, "--prompt", "x"]);
    if (r.code !== 0) return `exit ${r.code}: ${r.err.trim().slice(0, 200)}`;
    return (r.files ?? []).length === 1 || `expected the human turn's single image, got ${(r.files ?? []).length}`;
  });

test("a tool_result image is never mistaken for a pasted one",
  "reading a PNG with the Read tool puts an image block in a user-role record; forwarding it would upload a file the user never pasted",
  () => {
    const t = transcript("toolresult", [humanTurn([txt("look at it")], 10), toolResult(11)]);
    const r = run(["--pasted-transcript", t, "--", "--cwd", work, "--prompt", "x"]);
    if (r.code !== 2) return `expected exit 2, got ${r.code}`;
    return /carries no image/.test(r.err) || `wrong refusal: ${r.err.trim().slice(0, 160)}`;
  });

test("no implicit reach-back when the latest human turn has no image",
  "walking backward to the last image-bearing turn is how a stale screenshot from another topic gets uploaded silently",
  () => {
    const t = transcript("reachback", [
      humanTurn([img(PNG_1x1), txt("a picture")], 10),
      humanTurn([txt("now do something unrelated")], 20),
    ]);
    const r = run(["--pasted-transcript", t, "--", "--cwd", work, "--prompt", "x"]);
    if (r.code !== 2) return `expected exit 2, got ${r.code} (argv: ${JSON.stringify(r.argv)})`;
    if (r.argv) return "the driver was started despite the refusal";
    return /--list/.test(r.err) || `the refusal did not offer a way forward: ${r.err.trim().slice(0, 200)}`;
  });

test("--pasted-turn selects explicitly, --pasted-pick narrows within it",
  "an id copied from --list is checkable in one glance; an offset is not, and shifts when a message is queued",
  () => {
    const t = transcript("explicit", [
      humanTurn([img(PNG_1x1), img(PNG_2x1), img(PNG_1x1), txt("three")], 10),
      humanTurn([txt("later")], 20),
    ]);
    const uuid = JSON.parse(fs.readFileSync(t, "utf8").split("\n")[0]).uuid;
    const r = run(["--pasted-transcript", t, "--pasted-turn", uuid, "--pasted-pick", "2", "--", "--cwd", work, "--prompt", "x"]);
    if (r.code !== 0) return `exit ${r.code}: ${r.err.trim().slice(0, 200)}`;
    const files = r.files ?? [];
    if (files.length !== 1) return `expected exactly the picked image, got ${files.length}`;
    return files[0].bytes === Buffer.from(PNG_2x1, "base64").length
      || "the picked image is not the second one";
  });

test("a turn far older than the session's newest record needs --pasted-allow-old",
  "a resumed session copies earlier turns into its own file with fresh uuids, so 'present in this file' does not mean 'part of this conversation'",
  () => {
    const old = JSON.stringify({
      type: "user", uuid: "uuid-old", timestamp: "2026-08-20T12:00:00.000Z", origin: { kind: "human" },
      message: { role: "user", content: [img(PNG_1x1), txt("from another day")] },
    });
    const t = transcript("old", [old, humanTurn([txt("today")], 30)]);
    const denied = run(["--pasted-transcript", t, "--pasted-turn", "uuid-old", "--", "--cwd", work, "--prompt", "x"]);
    if (denied.code !== 2) return `expected exit 2 without the flag, got ${denied.code}`;
    if (!/--pasted-allow-old/.test(denied.err)) return `the refusal did not name the override: ${denied.err.trim().slice(0, 160)}`;
    const allowed = run(["--pasted-transcript", t, "--pasted-turn", "uuid-old", "--pasted-allow-old", "--", "--cwd", work, "--prompt", "x"]);
    return allowed.code === 0 || `the explicit override did not work: ${allowed.code} ${allowed.err.trim().slice(0, 160)}`;
  });

test("a block whose bytes are not what its media_type claims is refused before anything is written",
  "the driver derives the protocol item kind from the extension, so a wrong one becomes a provider refusal after the delegation is paid for",
  () => {
    const t = transcript("badmagic", [humanTurn([{ type: "image", source: { type: "base64", media_type: "image/png", data: Buffer.from("not a png at all").toString("base64") } }, txt("x")], 10)]);
    const r = run(["--pasted-transcript", t, "--", "--cwd", work, "--prompt", "x"]);
    if (r.code !== 2) return `expected exit 2, got ${r.code}`;
    if (r.argv) return "the driver was started with an invalid image";
    const dirs = fs.existsSync(path.join(stateDir, "pasted")) ? fs.readdirSync(path.join(stateDir, "pasted")) : [];
    if (dirs.length) return `files were written despite the refusal: ${JSON.stringify(dirs)}`;
    return /are not image\/png/.test(r.err) || `wrong message: ${r.err.trim().slice(0, 160)}`;
  });

test("the extracted images are 0600 under the state dir, and are removed when the run ends",
  "$TMPDIR is the read level's one writable root — the seat being shown the images could edit them — and a retention cache would turn a one-turn upload into a corpus every later seat can read",
  () => {
    const t = transcript("hygiene", [humanTurn([img(PNG_1x1), txt("x")], 10)]);
    const probe = path.join(shimDir, "probe.mjs");
    fs.writeFileSync(probe,
      `import fs from "node:fs";\n` +
      `const p = process.argv[process.argv.indexOf("--attach") + 1];\n` +
      `fs.writeFileSync(${JSON.stringify(argvLog)}, JSON.stringify({ path: p, mode: (fs.statSync(p).mode & 0o777).toString(8), dir: (fs.statSync(p.replace(/\\/[^/]+$/, "")).mode & 0o777).toString(8) }));\n`);
    const front2 = path.join(shimDir, "sub", "attach-pasted.mjs");
    fs.mkdirSync(path.dirname(front2), { recursive: true });
    fs.copyFileSync(FRONT, front2);
    fs.copyFileSync(probe, path.join(path.dirname(front2), "driver.mjs"));
    const r = spawnSync(process.execPath, [front2, "--pasted-transcript", t, "--", "--cwd", work],
      { encoding: "utf8", env: { ...process.env, CODEX_DELEGATE_STATE_DIR: stateDir, CLAUDE_CODE_SESSION_ID: "" } });
    if (r.status !== 0) return `exit ${r.status}: ${String(r.stderr).trim().slice(0, 200)}`;
    let seen = null;
    try { seen = JSON.parse(fs.readFileSync(argvLog, "utf8")); } catch { return "the shim recorded nothing"; }
    if (seen.mode !== "600") return `image mode is ${seen.mode}, expected 600`;
    if (seen.dir !== "700") return `run directory mode is ${seen.dir}, expected 700`;
    if (!seen.path.startsWith(path.join(stateDir, "pasted"))) return `written outside the state dir: ${seen.path}`;
    if (fs.existsSync(seen.path)) return "the extracted image outlived the run";
    return true;
  });

test("the driver's exit code is forwarded, not translated",
  "a front-end that swallows the exit code makes the published ladder unreadable — every code from 1 to 13 means something specific",
  () => {
    const t = transcript("rc", [humanTurn([img(PNG_1x1), txt("x")], 10)]);
    const r = run(["--pasted-transcript", t, "--", "--cwd", work], { SHIM_RC: "11" });
    return r.code === 11 || `expected 11, got ${r.code}`;
  });

test("--list writes nothing and names the turns a human can recognise",
  "selection by uuid is only usable if there is a way to see the uuids beside their timestamps and text",
  () => {
    const t = transcript("list", [
      humanTurn([img(PNG_1x1), img(PNG_2x1), txt("two pictures here")], 10),
      humanTurn([txt("no image")], 20),
    ]);
    const r = run(["--pasted-transcript", t, "--list"]);
    if (r.code !== 0) return `exit ${r.code}: ${r.err.trim().slice(0, 160)}`;
    if (r.argv) return "the driver was started by --list";
    if (!/2 image\(s\) \[1x1, 2x1\]/.test(r.out)) return `dimensions missing: ${r.out.trim().slice(0, 160)}`;
    return /two pictures here/.test(r.out) || `the turn's text is not shown: ${r.out.trim().slice(0, 160)}`;
  });

let failed = 0;
for (const c of CASES) {
  let verdict;
  try { verdict = c.fn(); } catch (e) { verdict = `threw: ${e.message}`; }
  if (verdict === true) console.log(`ok    ${c.name}`);
  else { failed++; console.log(`FAIL  ${c.name}: ${verdict}\n      ${c.why}`); }
}
console.log(failed ? `\n${failed}/${CASES.length} failed` : `\nall ${CASES.length} passed`);
process.exit(failed ? 1 : 0);
