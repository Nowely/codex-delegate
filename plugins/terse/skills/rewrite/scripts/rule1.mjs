#!/usr/bin/env node
// Rule 1: no flag name, header field, exit code, protocol name, environment variable or absolute path
// before the technical section. Usage:
//   node rule1.mjs FILE [--cut "How it works"] [--except "What it stores"]
// --cut     heading (## level) at which the rule stops applying; absent heading = whole document
// --except  heading whose section may carry literal paths (the stated exception); may repeat
// Exit 1 when a violation is found. Fences are NOT skipped: a flag in a copy-paste block before the
// technical section is still a flag the reader meets.
import fs from "node:fs";
const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--") && !["How it works"].includes(a) && fs.existsSync(a));
let cut = "How it works"; const excepts = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--cut") cut = args[++i];
  else if (args[i] === "--except") excepts.push(args[++i]);
}
if (!file) { console.error("usage: node rule1.mjs FILE [--cut HEADING] [--except HEADING]..."); process.exit(2); }
const lines = fs.readFileSync(file, "utf8").split("\n");
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
let end = lines.findIndex((l) => new RegExp(`^##\\s+${esc(cut)}\\s*$`).test(l));
if (end === -1) end = lines.length;
const before = lines.slice(0, end);
const RULES = [
  ["absolute path", /(?:~|\$HOME)\/[\w.\-/]+|(?<![\w.~$)])\/[A-Za-z][\w.\-]*\/[\w.\-/]+/g],
  ["flag name",     /(?<![\w-])--[a-z][a-z0-9-]+/g],
  ["env var",       /\$[A-Z_]{2,}|(?<![\w$])[A-Z][A-Z0-9]*_[A-Z0-9_]+(?![\w])/g],
  ["exit code",     /\bexits?\s+\d+\b|\bexit\s+(?:code|status)\b|\bexit\s+ladder\b/gi],
  ["protocol name", /\b(?:MCP|JSON-?RPC|RPC|app-server|stdio|SSE)\b/g],
  ["header field",  /(?<![\w`])[A-Z]{3,}:(?=\s)/g],
];
const ranges = excepts.map((h) => {
  const s = before.findIndex((l) => new RegExp(`^##\\s+${esc(h)}`).test(l));
  if (s === -1) return null;
  let e = before.findIndex((l, i) => i > s && /^##\s/.test(l)); if (e === -1) e = before.length;
  return [s, e];
}).filter(Boolean);
const excused = (i) => ranges.some(([s, e]) => i > s && i < e);
let hits = 0, ex = 0;
before.forEach((line, i) => {
  for (const [name, re] of RULES) {
    re.lastIndex = 0;
    for (const m of line.matchAll(re)) {
      if (name === "absolute path" && excused(i)) { ex++; console.log(`  line ${i + 1}  ${name.padEnd(14)} ${m[0]}   [stated exception]`); }
      else { hits++; console.log(`! line ${i + 1}  ${name.padEnd(14)} ${m[0]}`); }
    }
  }
});
console.log(`\n${hits} violation(s), ${ex} excused`);
process.exit(hits ? 1 : 0);
