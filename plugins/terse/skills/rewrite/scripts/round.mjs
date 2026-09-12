#!/usr/bin/env node
// Produce the next round from the previous one by asserted edits, and grow the ledger.
// Usage: node round.mjs FROM.md TO.md EDITS.json [--ledger LEDGER.json]
// EDITS.json = [{"name": "...", "old": "...", "new": "...",
//                "check":  {"level": 1|2|3, "how": "command or file:line"},   // how the edit's claims were verified
//                "claims": [{"name","pattern"}],   // verified claims this edit introduces  (want: true, level from check)
//                "retire": [{"name","pattern"}]}]  // phrasings this edit removes as false   (want: false)
// Every `old` must occur exactly once in FROM, or nothing is written. TO must not exist: a round is a
// new file, never an overwrite. With --ledger, claims and retirements are appended (deduplicated by name).
// An edit that declares claims must carry a check. A level-2 claim whose name or pattern mentions a
// lifecycle — stays, removed, continued, resumed, reclaimed, kept, pruned — is marked provisional in the
// ledger, because such claims have fallen to runs; ledger.mjs prints it as L2~.
import fs from "node:fs";
const args = process.argv.slice(2);
const li = args.indexOf("--ledger"); const ledgerFile = li === -1 ? null : args[li + 1];
const [from, to, editsFile] = args.filter((a, i) => li === -1 || (i !== li && i !== li + 1));
if (!from || !to || !editsFile) { console.error("usage: node round.mjs FROM.md TO.md EDITS.json [--ledger LEDGER.json]"); process.exit(2); }
if (fs.existsSync(to)) { console.error(`${to} exists; a round is a new file, never an overwrite`); process.exit(1); }
let t = fs.readFileSync(from, "utf8");
const edits = JSON.parse(fs.readFileSync(editsFile, "utf8"));
for (const e of edits) {
  if ((e.claims ?? []).length && !(e.check && [1, 2, 3].includes(e.check.level)))
    { console.error(`${e.name}: an edit that declares claims needs a check {level: 1|2|3, how}; nothing written`); process.exit(1); }
  const n = t.split(e.old).length - 1;
  if (n !== 1) { console.error(`${e.name}: found ${n} time(s) in ${from}, expected exactly 1; nothing written`); process.exit(1); }
  t = t.replace(e.old, e.new); console.log("ok ", e.name);
}
fs.writeFileSync(to, t);
if (ledgerFile) {
  const ledger = fs.existsSync(ledgerFile) ? JSON.parse(fs.readFileSync(ledgerFile, "utf8")) : [];
  const byName = new Map(ledger.map((c) => [c.name, c]));
  for (const e of edits) {
    for (const c of e.claims ?? []) byName.set(c.name, { name: c.name, pattern: c.pattern, want: true,
      level: e.check?.level ?? null, ...(e.check?.how ? { how: e.check.how } : {}),
      ...(e.check?.level === 2 && /lifecycle|stays|removed|continu|resum|reclaim|kept|prun/i.test(c.name + " " + c.pattern) ? { provisional: true } : {}) });
    for (const c of e.retire ?? []) byName.set(c.name, { name: c.name, pattern: c.pattern, want: false });
  }
  fs.writeFileSync(ledgerFile, JSON.stringify([...byName.values()], null, 1) + "\n");
  console.log(`ledger: ${byName.size} claim(s)`);
}
console.log(`wrote ${to}`);
