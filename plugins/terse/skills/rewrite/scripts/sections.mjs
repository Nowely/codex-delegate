#!/usr/bin/env node
// Word count per `## ` section, against a budget when one is given.
// Usage: node sections.mjs FILE [BUDGETS.json]      BUDGETS.json = {"<heading text>": <words>, ...}
// With budgets: prints budget, actual and the difference per section, and exits 1 when any section is over.
import fs from "node:fs";
const [file, budgetsFile] = process.argv.slice(2);
if (!file) { console.error("usage: node sections.mjs FILE [BUDGETS.json]"); process.exit(2); }
if (budgetsFile && !fs.existsSync(budgetsFile)) { console.error(`sections.mjs: ${budgetsFile} does not exist; write it once per document (every ## heading mapped to a budget)`); process.exit(2); }
const budgets = budgetsFile ? JSON.parse(fs.readFileSync(budgetsFile, "utf8")) : null;
const lines = fs.readFileSync(file, "utf8").split("\n");
let cur = "(opening)", buf = [], total = 0, over = 0;
const rows = [];
const flush = () => { const w = buf.join(" ").split(/\s+/).filter(Boolean).length; rows.push([cur, w]); total += w; };
for (const l of lines) {
  if (/^##\s/.test(l)) { flush(); cur = l.replace(/^##\s*/, ""); buf = []; }
  else buf.push(l);
}
flush();
for (const [s, w] of rows) {
  const b = budgets ? budgets[s] ?? budgets[s.replace(/`/g, "")] : undefined;
  if (b === undefined) console.log(String(w).padStart(5), s + (budgets ? "   (no budget)" : ""));
  else { const d = w - b; if (d > 0) over++; console.log(String(w).padStart(5), `/ ${String(b).padEnd(4)}`, (d > 0 ? "+" : "") + d, " ", s); }
}
console.log(String(total).padStart(5), "TOTAL" + (budgets ? `, ${over} section(s) over budget` : ""));
process.exit(over ? 1 : 0);
