#!/usr/bin/env node
// The claim ledger across rounds. Usage: node ledger.mjs LEDGER.json FILE...
// LEDGER.json = [{"name": "...", "pattern": "regex source", "want": true|false, "flags": "i" (optional)}]
//   want true  : a verified claim that must be present (LOST when absent)
//   want false : a phrasing found false, which must be absent (YES when present)
// Text is whitespace-normalised. Prints one row per claim, one column per file, and exits 1 when the
// LAST file fails any row — that file is the round being judged.
import fs from "node:fs";
const [ledgerFile, ...files] = process.argv.slice(2);
if (!ledgerFile || files.length === 0) { console.error("usage: node ledger.mjs LEDGER.json FILE..."); process.exit(2); }
const claims = JSON.parse(fs.readFileSync(ledgerFile, "utf8"));
const texts = files.map((f) => fs.readFileSync(f, "utf8").replace(/\s+/g, " "));
const w = Math.max(...claims.map((c) => c.name.length)) + 2;
console.log("claim".padEnd(w), files.map((f) => f.replace(/^.*\//, "").slice(0, 4)).join(" "));
let failures = 0;
for (const { name, pattern, want, flags } of claims) {
  const re = new RegExp(pattern, flags ?? "");
  const row = texts.map((t) => re.test(t));
  const last = row[row.length - 1];
  if (last !== want) failures++;
  console.log(name.padEnd(w), row.map((v) => (v === want ? (v ? "yes " : " -  ") : (v ? "YES " : "LOST"))).join(" "));
}
console.log(`\n${failures} failure(s) in ${files[files.length - 1]}`);
process.exit(failures ? 1 : 0);
