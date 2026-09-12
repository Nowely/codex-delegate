#!/usr/bin/env node
// One idea, one home. Counts in how many `## ` sections each concept appears.
// Usage: node dup.mjs FILE CONCEPTS.json      CONCEPTS.json = [{"name": "...", "pattern": "regex source"}]
// Section bodies are whitespace-normalised before matching, so a phrase broken across a line still counts.
// A concept in three or more sections is flagged; the symptom-keyed repeat is the one allowed exception,
// and that is a judgement the reader makes, not this script.
import fs from "node:fs";
const [file, conceptsFile] = process.argv.slice(2);
if (!file || !conceptsFile) { console.error("usage: node dup.mjs FILE CONCEPTS.json"); process.exit(2); }
const concepts = JSON.parse(fs.readFileSync(conceptsFile, "utf8"));
const secs = []; let cur = { name: "(opening)", body: "" };
for (const l of fs.readFileSync(file, "utf8").split("\n")) {
  if (/^##\s/.test(l)) { secs.push(cur); cur = { name: l.replace(/^##\s*/, "").replace(/`/g, ""), body: "" }; }
  else cur.body += l + "\n";
}
secs.push(cur);
let flagged = 0;
for (const { name, pattern } of concepts) {
  const re = new RegExp(pattern, "i");
  const where = secs.filter((s) => re.test(s.body.replace(/\s+/g, " "))).map((s) => s.name);
  const flag = where.length >= 3 ? "   <<<" : "";
  if (flag) flagged++;
  console.log(String(where.length).padStart(3), " ", name.padEnd(30), where.join(" | ") + flag);
}
console.log(`\n${flagged} concept(s) in three or more sections`);
