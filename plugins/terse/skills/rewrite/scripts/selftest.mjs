#!/usr/bin/env node
// Every check is tested against a planted violation before its output is believed. Exit 1 on any miss.
import fs from "node:fs"; import os from "node:os"; import path from "node:path"; import { execFileSync } from "node:child_process";
const here = path.dirname(new URL(import.meta.url).pathname);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "terse-selftest."));
const run = (script, args) => { try { return { code: 0, out: execFileSync("node", [path.join(here, script), ...args], { encoding: "utf8" }) }; }
                                catch (e) { return { code: e.status, out: String(e.stdout) }; } };
let failed = 0;
const check = (name, ok) => { console.log(`${ok ? "ok  " : "MISS"} ${name}`); if (!ok) failed++; };
// rule1: a flag and a tilde path before the cut must both be reported; the same path inside the exception must be excused
const r1 = path.join(tmp, "r1.md");
fs.writeFileSync(r1, "use --no-network and ~/.codex/sessions\n\n## What it stores\n\n~/.claude/plugins/data/x\n\n## How it works\n\n--help is fine here\n");
const a = run("rule1.mjs", [r1, "--except", "What it stores"]);
check("rule1 reports the planted flag", a.out.includes("--no-network"));
check("rule1 reports the planted tilde path", a.out.includes("~/.codex/sessions"));
check("rule1 excuses the path in the stated exception", /stated exception/.test(a.out) && a.out.includes("~/.claude/plugins/data/x"));
check("rule1 ignores the section after the cut", !a.out.includes("--help"));
check("rule1 exits 1 on a violation", a.code === 1);
// dup: a concept broken across a line still counts, and three sections are flagged
const d = path.join(tmp, "d.md"), c = path.join(tmp, "c.json");
fs.writeFileSync(d, "## A\nan agent that ran\nnothing\n## B\nran nothing\n## C\nran nothing\n## D\nunrelated\n");
fs.writeFileSync(c, JSON.stringify([{ name: "ran nothing", pattern: "ran nothing" }]));
const b = run("dup.mjs", [d, c]);
check("dup counts a phrase broken across a line", /^\s*3\s+ran nothing/m.test(b.out));
check("dup flags three sections", b.out.includes("<<<"));
// ledger: a lost claim, an unwanted phrase and a control
const l = path.join(tmp, "l.json"), f1 = path.join(tmp, "01.md"), f2 = path.join(tmp, "02.md");
fs.writeFileSync(l, JSON.stringify([{ name: "kept", pattern: "commit\\s+first", want: true }, { name: "bad", pattern: "Commit or stash", want: false }, { name: "control", pattern: "zzz", want: false }]));
fs.writeFileSync(f1, "Commit or stash. commit\nfirst.\n"); fs.writeFileSync(f2, "Nothing here.\n");
const g = run("ledger.mjs", [l, f1, f2]);
check("ledger sees a claim broken across a line", /kept\s+L\S*\s+yes/.test(g.out));
check("ledger reports an unwanted phrase", /bad\s+L\S*\s+YES/.test(g.out));
check("ledger reports a lost claim in the last file", /kept\s+L\S*\s+yes\s+LOST/.test(g.out));
check("ledger exits 1 when the last file fails", g.code === 1);
// round: refuses a non-unique anchor, refuses to overwrite, grows the ledger
const e = path.join(tmp, "e.json"), from = path.join(tmp, "from.md"), to = path.join(tmp, "to.md"), lg = path.join(tmp, "lg.json");
fs.writeFileSync(from, "alpha beta alpha\n");
fs.writeFileSync(e, JSON.stringify([{ name: "x", old: "alpha", new: "gamma" }]));
check("round refuses an anchor that occurs twice", run("round.mjs", [from, to, e]).code === 1 && !fs.existsSync(to));
fs.writeFileSync(e, JSON.stringify([{ name: "x", old: "beta", new: "gamma", claims: [{ name: "g stays", pattern: "gamma" }] }]));
check("round refuses claims without a check", run("round.mjs", [from, to, e]).code === 1 && !fs.existsSync(to));
fs.writeFileSync(e, JSON.stringify([{ name: "x", old: "beta", new: "gamma", check: { level: 2, how: "read" }, claims: [{ name: "g stays", pattern: "gamma" }], retire: [{ name: "b", pattern: "beta" }] }]));
const h = run("round.mjs", [from, to, e, "--ledger", lg]);
check("round writes the new file", h.code === 0 && fs.readFileSync(to, "utf8") === "alpha gamma alpha\n");
const grown = JSON.parse(fs.readFileSync(lg, "utf8"));
check("round grows the ledger with a claim and a retirement", grown.length === 2);
check("a claim inherits its edit's level", grown.find((c) => c.name === "g stays")?.level === 2);
check("a level-2 lifecycle claim is marked provisional", grown.find((c) => c.name === "g stays")?.provisional === true);
check("the ledger prints the level and the provisional mark", /g stays\s+L2~/.test(run("ledger.mjs", [lg, to]).out));
check("round refuses to overwrite a round", run("round.mjs", [from, to, e]).code === 1);
const to2 = path.join(tmp, "to2.md");
fs.writeFileSync(e, JSON.stringify([{ name: "y", old: "gamma", new: "delta", drop: ["g stays"] }]));
check("round drops a ledger entry on purpose", run("round.mjs", [to, to2, e, "--ledger", lg]).code === 0 && !JSON.parse(fs.readFileSync(lg, "utf8")).some((c) => c.name === "g stays"));
// sections
const s = run("sections.mjs", [d]);
check("sections counts per heading", /^\s*2 B$/m.test(s.out) && /TOTAL/.test(s.out));
const bj = path.join(tmp, "b.json"); fs.writeFileSync(bj, JSON.stringify({ A: 10, B: 1, C: 5, D: 5 }));
const sb = run("sections.mjs", [d, bj]);
check("sections reports a section over its budget and still exits 0", /\+1\s+B/.test(sb.out) && sb.code === 0);
fs.rmSync(tmp, { recursive: true, force: true });
console.log(failed ? `\n${failed} check(s) MISSED` : "\nall checks caught their planted violation");
process.exit(failed ? 1 : 0);
