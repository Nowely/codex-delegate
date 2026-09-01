#!/usr/bin/env node
// Does the shipped relay agent still describe the driver it drives?
//
//   node evals/agent-contract.test.mjs
//
// agents/codex-seat.md is the artefact every default plugin install uses, and its whole contract — the
// seat-file vocabulary, the fields that are refused, the report keys it promises to relay, the exit-90
// sentinel — lived in prose that nothing checked. It had already drifted twice: a TIMEOUT constant with
// no derivation, and three driver flags (--review, --resume, --progress) the header could not express.
// This reads the document and the driver and compares them.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");
const AGENT = path.join(ROOT, "agents", "codex-seat.md");
const DRIVER = path.join(ROOT, "skills", "codex-delegate", "scripts", "driver.mjs");

const agent = fs.readFileSync(AGENT, "utf8");
const driver = fs.readFileSync(DRIVER, "utf8");

const CASES = [];
const test = (name, why, fn) => CASES.push({ name, why, fn });

// The driver's own vocabulary, read out of the source rather than restated here — a copy in this file
// would be a third place to drift.
const seatFields = (() => {
  const m = driver.match(/const SEAT_FIELDS = new Set\(\[([\s\S]*?)\]\)/);
  return m ? [...m[1].matchAll(/"([A-Z_]+)"/g)].map((x) => x[1]) : [];
})();
// What the agent's header block documents: the FIELD: lines of its own field list.
const documented = [...agent.matchAll(/^ {4}([A-Z_]+):/gm)].map((m) => m[1]);

test("the driver's seat-file vocabulary is not empty (the reader below is sound)",
  "every case here compares against SEAT_FIELDS; if the regex stopped matching, the whole suite would pass vacuously",
  () => seatFields.length >= 10 || `read ${seatFields.length} fields out of the driver: ${JSON.stringify(seatFields)}`);

test("every field the driver accepts is documented by the agent",
  "a flag the relay cannot express is a capability the plugin ships and cannot use — exactly how --review, --resume and --progress went missing",
  () => {
    // VERIFY is the one field the driver parses but this relay must never write: it needs
    // --allow-seat-verify on the command line, which the agent never passes. It therefore belongs in
    // the refusal table (asserted below), not in the header list.
    const missing = seatFields.filter((f) => f !== "VERIFY" && !documented.includes(f));
    return missing.length === 0 || `undocumented in codex-seat.md: ${missing.join(", ")}`;
  });

test("every field the agent documents is accepted by the driver",
  "the opposite drift: a header the relay writes and the driver rejects fails the seat with exit 2 before any work",
  () => {
    const bogus = documented.filter((f) => !seatFields.includes(f));
    return bogus.length === 0 || `documented but rejected by the driver: ${bogus.join(", ")}`;
  });

test("the four command-line-only flags are refused as fields, and the agent says so",
  "a newline in a relayed value opens a new field, so anything accepted here can be injected: VERIFY runs a shell, ATTACH uploads a file, STEER_FILE truncates one, MCP grants tool servers",
  () => {
    const problems = [];
    // VERIFY is special: it IS a driver field, but reachable only with --allow-seat-verify on the
    // command line, which this relay never passes — so the agent must name it as refused.
    if (!/allow-seat-verify/.test(agent)) problems.push("the agent does not mention --allow-seat-verify");
    if (!/--allow-seat-verify/.test(driver)) problems.push("the driver lost --allow-seat-verify");
    if (!/`VERIFY`/.test(agent)) problems.push("VERIFY is not named in the agent's refusal table");
    for (const f of ["ATTACH", "STEER_FILE", "MCP"]) {
      if (seatFields.includes(f)) problems.push(`${f} is a seat field again`);
      if (!new RegExp(`\`?${f}\`?`).test(agent)) problems.push(`${f} is not named in the agent's refusal table`);
    }
    return problems.length === 0 || problems.join("; ");
  });

test("SEAT is first and required, in both the document and the driver",
  "a seat file whose rights line is not first can have one supplied by an injected later line",
  () => {
    const problems = [];
    if (!/first field must be SEAT/.test(driver)) problems.push("the driver no longer enforces SEAT-first");
    if (!/`SEAT:` goes first|SEAT.*first/i.test(agent)) problems.push("the agent no longer states the SEAT-first rule");
    if (seatFields[0] !== "SEAT") problems.push(`SEAT is not the first entry of SEAT_FIELDS: ${seatFields[0]}`);
    return problems.length === 0 || problems.join("; ");
  });

test("the report keys the agent promises to relay exist in the driver's report",
  "the envelope is the coordinator's only view of a wrapped seat; a key that stopped being emitted turns into a silent null in every panel",
  () => {
    const promised = ["exitCode", "threadId", "receiptOk", "commandsSucceeded", "receiptPath", "answerPath",
                      "answerTruncated", "worktreePreserved", "worktreeRemoveCommand"];
    const missing = promised.filter((k) => !new RegExp(`\\b${k}\\b`).test(driver) || !new RegExp(`\\b${k}\\b`).test(agent));
    return missing.length === 0 || `promised by the agent but absent from the driver's report (or vice versa): ${missing.join(", ")}`;
  });

test("the exit-90 sentinel is distinct from every code the driver can return",
  "node's own exit 1 for a missing module is indistinguishable from the driver's documented 'the turn did not complete', which is why DRIVER_NOT_FOUND has a code of its own",
  () => {
    if (!/DRIVER_NOT_FOUND/.test(agent) || !/exit 90/.test(agent)) return "the agent lost the DRIVER_NOT_FOUND sentinel";
    const codes = [...driver.matchAll(/const EXIT = \{([^}]*)\}/g)].flatMap((m) => [...m[1].matchAll(/: (\d+)/g)].map((x) => Number(x[1])));
    return !codes.includes(90) || "the driver now uses exit 90 too, so the sentinel is ambiguous";
  });

test("the driver paths the agent probes are the ones the plugin installs",
  "the relay resolves the driver by trying two locations; if the layout moved, every wrapped seat fails with DRIVER_NOT_FOUND",
  () => {
    const probed = [...agent.matchAll(/\$\{?CLAUDE_PLUGIN_ROOT[^"]*?\/([^"$]*driver\.mjs)|HOME\/([^"$]*driver\.mjs)/g)]
      .map((m) => m[1] ?? m[2]).filter(Boolean);
    if (!probed.length) return "the agent no longer probes any driver path";
    const rel = path.relative(ROOT, DRIVER);
    const ok = probed.some((p) => p.endsWith(rel) || p.endsWith("skills/codex-delegate/scripts/driver.mjs"));
    return ok || `none of the probed paths matches the shipped layout ${rel}: ${JSON.stringify(probed)}`;
  });

test("the agent's default TIMEOUT states why it is not the driver's",
  "560 against the driver's 900 is exactly the kind of unexplained constant that becomes folklore; it exists because the Bash tool caps a call at 600 s",
  () => {
    if (!/TIMEOUT: <seconds> \[560/.test(agent)) return "the 560 s default is gone or reworded beyond recognition";
    if (!/600/.test(agent)) return "the derivation (the 600 s Bash cap) is not stated beside it";
    return /--timeout <sec>\s*\(default 900|default 900/.test(driver) || "the driver's own default is no longer 900, so the agent's note is stale";
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
