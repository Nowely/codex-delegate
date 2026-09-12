#!/usr/bin/env node
// Word count per `## ` section. Usage: node sections.mjs FILE
import fs from "node:fs";
const file = process.argv[2];
if (!file) { console.error("usage: node sections.mjs FILE"); process.exit(2); }
const lines = fs.readFileSync(file, "utf8").split("\n");
let cur = "(opening)", buf = [], total = 0;
const rows = [];
const flush = () => { const w = buf.join(" ").split(/\s+/).filter(Boolean).length; rows.push([cur, w]); total += w; };
for (const l of lines) {
  if (/^##\s/.test(l)) { flush(); cur = l.replace(/^##\s*/, ""); buf = []; }
  else buf.push(l);
}
flush();
for (const [s, w] of rows) console.log(String(w).padStart(5), s);
console.log(String(total).padStart(5), "TOTAL");
