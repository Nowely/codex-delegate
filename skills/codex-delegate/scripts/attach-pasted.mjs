#!/usr/bin/env node
// Hands the images a user PASTED into Claude Code to a Codex seat.
//
//   node attach-pasted.mjs [selection] -- <driver.mjs flags…>
//   node attach-pasted.mjs --list
//
// Claude Code keeps a pasted image nowhere but the session transcript: the record carries
// {type:"image", source:{type:"base64", media_type, data}} and no filename, no path, no index — the
// position in the content array is the image's only identity. So the only way to give one to a seat is
// to decode it here, write it, and pass the path to `driver.mjs --attach`, which is also how a native
// subagent gets an image at all (a tool result that read a PATH; the Agent tool's prompt is a string
// and carries none).
//
// This is a SEPARATE front-end, not a driver flag, on purpose. The driver owns rights, locks,
// worktrees and sandbox assertions; it must not also parse another product's private, version-drifting
// JSONL. And its standing rule — a file that leaves this machine is named on the command line, never
// in a relayed seat file — stays true when the names come from here.
//
// It spawns the driver rather than exec-ing it, so the extracted files can be removed when the run
// ends. Exit code and terminating signal are forwarded.

import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DRIVER = path.join(HERE, "driver.mjs");

const USAGE = `attach-pasted — give a Codex seat the image(s) the user pasted into this session.

  node attach-pasted.mjs [selection] -- <driver.mjs flags…>
  node attach-pasted.mjs --list

Selection (default: every image of the LATEST human turn, in the order pasted)
  --pasted-turn UUID    take that turn instead; repeatable, emitted in timestamp order
  --pasted-pick 1,3-4   1-based indices within the selected turn (default: all)
  --pasted-allow-old    permit a turn more than 12h older than the newest record
  --pasted-transcript F read this transcript instead of resolving the session's own
  --list                the last 10 image-bearing human turns, then exit; writes nothing

Everything after -- is passed to driver.mjs unchanged, with --attach <path> prepended per image.
The images are uploaded to the Codex model provider: the receipt on stderr names each one.

There is deliberately no offset selector (--turns N, back:N): machine records interleave with human
ones and a queued message shifts the count, so an offset silently selects a different image. Copy a
uuid from --list instead. There is no implicit reach-back either: if the latest human turn carries no
image, this exits 2 rather than uploading something older that the caller did not mean.
`;

const MEDIA = { "image/png": ".png", "image/jpeg": ".jpg", "image/gif": ".gif", "image/webp": ".webp" };
const MAGIC = {
  ".png": (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  ".jpg": (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  ".gif": (b) => b.subarray(0, 6).toString("latin1") === "GIF87a" || b.subarray(0, 6).toString("latin1") === "GIF89a",
  ".webp": (b) => b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP",
};
const MAX_IMAGES = 20, MAX_BYTES_EACH = 10 * 1024 * 1024, MAX_BYTES_TOTAL = 25 * 1024 * 1024;
const REACH_BACK_MS = 12 * 3600 * 1000;

function die(msg) {
  process.stderr.write(`attach-pasted: ${msg}\n`);
  process.exit(2);
}

function parseArgs(argv) {
  const o = { turns: [], pick: null, allowOld: false, transcript: null, list: false, driverArgs: [] };
  const sep = argv.indexOf("--");
  const mine = sep === -1 ? argv : argv.slice(0, sep);
  o.driverArgs = sep === -1 ? [] : argv.slice(sep + 1);
  const need = (i, flag) => {
    const v = mine[i];
    if (v === undefined || v === "" || v.startsWith("--")) die(`${flag} requires a non-empty value`);
    return v;
  };
  for (let i = 0; i < mine.length; i++) {
    switch (mine[i]) {
      case "--pasted-turn": o.turns.push(need(++i, "--pasted-turn")); break;
      case "--pasted-pick": o.pick = need(++i, "--pasted-pick"); break;
      case "--pasted-allow-old": o.allowOld = true; break;
      case "--pasted-transcript": o.transcript = need(++i, "--pasted-transcript"); break;
      case "--list": o.list = true; break;
      case "-h": case "--help": process.stdout.write(USAGE); process.exit(0); break;
      default: die(`unknown argument: ${mine[i]} (driver flags go after --)`);
    }
  }
  if (new Set(o.turns).size !== o.turns.length) die("--pasted-turn names the same turn more than once");
  if (o.pick && o.turns.length > 1) die("--pasted-pick applies within ONE turn; select a single --pasted-turn");
  if (!o.list && !o.driverArgs.length) die("nothing to run: put the driver's flags after --, or pass --list");
  return o;
}

// The session's own transcript, resolved rather than guessed: CLAUDE_CODE_SESSION_ID names it and is
// exported even inside a subagent. Matched at exactly one depth so a subagent's own transcript
// (projects/<slug>/<session>/subagents/agent-*.jsonl) can never be picked up instead.
function resolveTranscript(explicit) {
  if (explicit) {
    if (!fs.existsSync(explicit)) die(`--pasted-transcript: ${explicit} does not exist`);
    return explicit;
  }
  const id = process.env.CLAUDE_CODE_SESSION_ID;
  if (!id) die("CLAUDE_CODE_SESSION_ID is unset, so this session's transcript cannot be resolved; pass --pasted-transcript FILE");
  const base = path.join(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude"), "projects");
  let hits = [];
  try {
    for (const slug of fs.readdirSync(base)) {
      const p = path.join(base, slug, `${id}.jsonl`);
      if (fs.existsSync(p)) hits.push(p);
    }
  } catch (e) { die(`cannot read ${base}: ${e.message}`); }
  if (hits.length !== 1) die(`expected exactly one transcript for session ${id}, found ${hits.length}; pass --pasted-transcript FILE`);
  return hits[0];
}

// A HUMAN turn, as opposed to the machine records that share the "user" type: task notifications
// (origin.kind "task-notification"), the skill loader's isMeta injections, and tool results. The
// origin field decides it where present; the fallback covers transcripts written before it existed.
const MACHINE_PREFIXES = ["<task-notification>", "<command-name>", "<command-message>", "<local-command-"];
function isHumanTurn(rec) {
  if (rec?.type !== "user" || rec?.isSidechain === true) return false;
  const content = rec?.message?.content;
  if (!Array.isArray(content)) return false;
  if (rec?.origin?.kind) return rec.origin.kind === "human";
  if (rec?.isMeta) return false;
  if (content.some((b) => b?.type === "tool_result")) return false;
  const text = content.filter((b) => b?.type === "text").map((b) => b.text).join("").trimStart();
  return !MACHINE_PREFIXES.some((p) => text.startsWith(p));
}

const imagesOf = (rec) => rec.message.content.filter((b) => b?.type === "image");
const textOf = (rec) => rec.message.content.filter((b) => b?.type === "text").map((b) => b.text).join(" ").replace(/\s+/g, " ").trim();

// Streamed, never read whole: the largest transcript on this machine is 28.9 MB and grows.
async function readTurns(file) {
  const humans = [];
  let newestTs = 0;
  const rl = readline.createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    let rec;
    try { rec = JSON.parse(line); } catch { continue; }
    const ts = Date.parse(rec?.timestamp ?? "");
    if (Number.isFinite(ts)) newestTs = Math.max(newestTs, ts);
    if (isHumanTurn(rec)) humans.push(rec);
  }
  return { humans, newestTs };
}

// Stored dimensions, so a receipt can say which pixel space an answer is in — Claude Code resizes a
// paste to at most ~2000px before storing it, and a coordinator asking for coordinates needs to know.
function dimensions(buf, ext) {
  try {
    if (ext === ".png") return `${buf.readUInt32BE(16)}x${buf.readUInt32BE(20)}`;
    if (ext === ".gif") return `${buf.readUInt16LE(6)}x${buf.readUInt16LE(8)}`;
    if (ext === ".jpg") {
      for (let i = 2; i + 9 < buf.length; ) {
        if (buf[i] !== 0xff) { i++; continue; }
        const marker = buf[i + 1];
        const len = buf.readUInt16BE(i + 2);
        if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker))
          return `${buf.readUInt16BE(i + 7)}x${buf.readUInt16BE(i + 5)}`;
        i += 2 + len;
      }
    }
    if (ext === ".webp" && buf.subarray(12, 16).toString("latin1") === "VP8X")
      return `${1 + buf.readUIntLE(24, 3)}x${1 + buf.readUIntLE(27, 3)}`;
  } catch {}
  return "?x?";
}

function parsePick(spec, count) {
  const out = [];
  for (const part of spec.split(",")) {
    const m = part.trim().match(/^(\d+)(?:-(\d+))?$/);
    if (!m) die(`--pasted-pick: ${JSON.stringify(part)} is not an index or a range`);
    const a = Number(m[1]), b = m[2] ? Number(m[2]) : a;
    if (a < 1 || b < a || b > count) die(`--pasted-pick: ${part} is outside 1..${count}`);
    for (let i = a; i <= b; i++) if (!out.includes(i)) out.push(i);
  }
  return out;
}

// Validated BEFORE anything is written: the driver derives the protocol item kind from the extension,
// so a guessed one becomes a provider refusal after the delegation has already been paid for.
function decodeImage(block, where) {
  const mt = block?.source?.media_type;
  const ext = MEDIA[mt];
  if (!ext) die(`${where}: media type ${JSON.stringify(mt ?? null)} is not one this can carry (${Object.keys(MEDIA).join(", ")})`);
  const data = block?.source?.data;
  if (typeof data !== "string" || !/^[A-Za-z0-9+/]*={0,2}$/.test(data) || data.length % 4 !== 0)
    die(`${where}: the stored base64 is malformed`);
  const buf = Buffer.from(data, "base64");
  if (!buf.length) die(`${where}: decodes to zero bytes`);
  if (!MAGIC[ext](buf)) die(`${where}: the bytes are not ${mt} whatever the record says`);
  if (buf.length > MAX_BYTES_EACH) die(`${where}: ${buf.length} bytes exceeds the ${MAX_BYTES_EACH} byte cap`);
  return { buf, ext, mediaType: mt };
}

let runDir = null;
function cleanup() {
  if (!runDir) return;
  try { fs.rmSync(runDir, { recursive: true, force: true }); } catch {}
  runDir = null;
}

// Someone else's leftovers, removed only when provably abandoned: same uid, our own pid-<hex> shape,
// the pid gone, and older than an hour. A prune without a liveness check deletes a live run's images.
function scavenge(root) {
  try {
    for (const name of fs.readdirSync(root)) {
      const m = name.match(/^(\d+)-[0-9a-f]{32}$/);
      if (!m) continue;
      const p = path.join(root, name);
      let st;
      try { st = fs.statSync(p); } catch { continue; }
      if (st.uid !== os.userInfo().uid) continue;
      if (Date.now() - st.mtimeMs < 3600_000) continue;
      try { process.kill(Number(m[1]), 0); continue; } catch (e) { if (e.code === "EPERM") continue; }
      fs.rmSync(p, { recursive: true, force: true });
    }
  } catch {}
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  const file = resolveTranscript(o.transcript);
  const { humans, newestTs } = await readTurns(file);
  const withImages = humans.filter((r) => imagesOf(r).length);

  if (o.list) {
    if (!withImages.length) { process.stdout.write("no image-bearing human turn in this session\n"); return 0; }
    for (const rec of withImages.slice(-10)) {
      const imgs = imagesOf(rec);
      const dims = imgs.map((b, i) => {
        const { buf, ext } = decodeImage(b, `turn ${rec.uuid} image ${i + 1}`);
        return dimensions(buf, ext);
      });
      process.stdout.write(`${rec.uuid}  ${rec.timestamp}  ${imgs.length} image(s) [${dims.join(", ")}]  ${textOf(rec).slice(0, 80)}\n`);
    }
    return 0;
  }

  let selected;
  if (o.turns.length) {
    const byId = new Map(humans.map((r) => [r.uuid, r]));
    selected = o.turns.map((id) => {
      const rec = byId.get(id);
      if (!rec) die(`--pasted-turn: no human turn ${id} in ${file}; run --list`);
      if (!imagesOf(rec).length) die(`--pasted-turn: turn ${id} carries no image`);
      return rec;
    }).sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
    for (const rec of selected) {
      const age = newestTs - Date.parse(rec.timestamp);
      if (age > REACH_BACK_MS && !o.allowOld)
        die(`--pasted-turn ${rec.uuid} is ${Math.round(age / 3600000)}h older than this session's newest record. ` +
            `A resumed session copies earlier turns into its file, so that image may belong to another conversation; ` +
            `add --pasted-allow-old if you meant it`);
    }
  } else {
    const last = humans.at(-1);
    if (!last) die(`no human turn found in ${file}`);
    if (!imagesOf(last).length)
      die(`the latest human turn (${last.uuid}, ${last.timestamp}, ${JSON.stringify(textOf(last).slice(0, 60))}) carries no image. ` +
          `Run --list to see which turns do and pass --pasted-turn <uuid>, or --attach a file yourself. ` +
          `Nothing older is uploaded implicitly.`);
    selected = [last];
  }

  const chosen = [];
  for (const rec of selected) {
    const imgs = imagesOf(rec);
    const idx = o.pick ? parsePick(o.pick, imgs.length) : imgs.map((_, i) => i + 1);
    for (const i of idx) chosen.push({ rec, n: i, total: imgs.length, block: imgs[i - 1] });
  }
  if (chosen.length > MAX_IMAGES) die(`${chosen.length} images selected; the cap is ${MAX_IMAGES}`);

  const decoded = chosen.map((c) => ({ ...c, ...decodeImage(c.block, `turn ${c.rec.uuid} image ${c.n}/${c.total}`) }));
  const total = decoded.reduce((s, d) => s + d.buf.length, 0);
  if (total > MAX_BYTES_TOTAL) die(`${total} bytes selected; the cap is ${MAX_BYTES_TOTAL}`);

  // Under the driver's own state directory, which every write-level root refuses by identity — not
  // $TMPDIR, which is the read level's ONE writable root and therefore reachable by the very seat
  // being shown the images.
  const stateRoot = process.env.CODEX_DELEGATE_STATE_DIR || path.join(os.userInfo().homedir, ".codex-delegate");
  const pastedRoot = path.join(stateRoot, "pasted");
  fs.mkdirSync(pastedRoot, { recursive: true, mode: 0o700 });
  fs.chmodSync(pastedRoot, 0o700);
  scavenge(pastedRoot);
  runDir = path.join(pastedRoot, `${process.pid}-${crypto.randomBytes(16).toString("hex")}`);
  fs.mkdirSync(runDir, { mode: 0o700 });
  fs.chmodSync(runDir, 0o700);   // mkdir's mode is umask-masked; the chmod is not decoration

  const paths = [];
  decoded.forEach((d, i) => {
    const sha = crypto.createHash("sha256").update(d.buf).digest("hex");
    const p = path.join(runDir, `${String(i + 1).padStart(2, "0")}-${sha.slice(0, 12)}${d.ext}`);
    fs.writeFileSync(p, d.buf, { mode: 0o600, flag: "wx" });
    fs.chmodSync(p, 0o600);
    paths.push(p);
    process.stderr.write(`attach-pasted: turn ${d.rec.uuid.slice(0, 8)} ${d.rec.timestamp} ` +
      `${JSON.stringify(textOf(d.rec).slice(0, 60))} image ${d.n}/${d.total} ` +
      `${d.mediaType} ${dimensions(d.buf, d.ext)} ${d.buf.length} B sha256 ${sha.slice(0, 12)} -> ${p}\n`);
  });
  process.stderr.write(`attach-pasted: ${paths.length} image(s) will be uploaded to the Codex model provider, in this order\n`);

  const args = [DRIVER, ...paths.flatMap((p) => ["--attach", p]), ...o.driverArgs];
  const child = spawn(process.execPath, args, { stdio: "inherit" });
  for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) process.on(sig, () => { try { child.kill(sig); } catch {} });
  return await new Promise((resolve) => {
    child.on("exit", (code, signal) => {
      cleanup();
      // Re-raised rather than translated: a driver killed by a signal must not come back as an exit
      // code it never chose, or the published exit ladder stops meaning anything.
      if (signal) { process.kill(process.pid, signal); return; }
      resolve(code ?? 0);
    });
    child.on("error", (e) => { cleanup(); process.stderr.write(`attach-pasted: cannot start the driver: ${e.message}\n`); resolve(4); });
  });
}

process.on("exit", cleanup);
main().then((code) => process.exit(code)).catch((e) => { cleanup(); die(e.message); });
