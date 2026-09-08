#!/usr/bin/env node
// Does the fixture still speak like the real app-server?
//
//   node evals/conformance.test.mjs
//
// This suite drives every fixture scenario and validates each emitted line against the pinned schemas.
// The validator is deliberately small and local (no dependency): local $ref and the structural keywords
// in KNOWN; other keywords are REPORTED as unchecked so conformance cannot mean nothing was checked.
// looked at".

import fs from "node:fs";
import path from "node:path";
import { SCENARIOS } from "./fake-app-server.mjs";
import { DRIVER, PINNED_CODEX, ROOT, codexShim, spawnNode, tempDir } from "./lib/harness.mjs";

// The upgrade recipe in README.md generates a SECOND schema-<version>/ beside the old one, and
// readdirSync order is not sorted — so "the first one that matches" could validate the fixture against
// the version being replaced and say nothing. Pick the newest by version and name it in the output.
// CODEX_DELEGATE_SCHEMA_DIR overrides that choice with a directory name, which is how the upgrade
// recipe validates the newly generated tree before PINNED_CODEX moves to it.
const schemaDirs = fs.readdirSync(ROOT).filter((n) => /^schema-\d/.test(n))
  .sort((a, b) => {
    const part = (n) => n.slice("schema-".length).split(".").map((x) => Number.parseInt(x, 10) || 0);
    const [pa, pb] = [part(a), part(b)];
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pb[i] ?? 0) - (pa[i] ?? 0);
    return a < b ? 1 : -1;
  });
const override = process.env.CODEX_DELEGATE_SCHEMA_DIR ?? null;
const schemaDir = override ?? schemaDirs[0];
if (!schemaDir) { console.log("FAIL  no schema-<version>/ directory in the repository root"); process.exit(1); }
if (!fs.existsSync(path.join(ROOT, schemaDir))) {
  console.log(`FAIL  CODEX_DELEGATE_SCHEMA_DIR names ${schemaDir}, which is not a directory in the repository root`);
  process.exit(1);
}
// The pin is what every report calls codexVersionPinned. A regeneration into a newer directory that
// nobody pinned would otherwise validate green while each run still claimed the old version.
if (!override && schemaDir !== `schema-${PINNED_CODEX}`) {
  console.log(`FAIL  the newest schema directory is ${schemaDir} and the driver pins ${PINNED_CODEX}; move PINNED_CODEX, or set CODEX_DELEGATE_SCHEMA_DIR to validate against one directory while the pin names another`);
  process.exit(1);
}
if (schemaDirs.length > 1)
  console.log(`note  ${schemaDirs.length} schema directories present; validating against ${schemaDir} (also: ${schemaDirs.filter((d) => d !== schemaDir).join(", ")})`);
const SCHEMAS = path.join(ROOT, schemaDir);
// Recorded as they are loaded, so the check below reads the same list the cases do rather than a copy.
const loaded = new Set();
const load = (rel) => { loaded.add(rel); return JSON.parse(fs.readFileSync(path.join(SCHEMAS, rel), "utf8")); };

const SERVER_NOTIFICATION = load("ServerNotification.json");
const SERVER_REQUEST = load("ServerRequest.json");
// The responses the driver actually waits on. A method missing here is not validated, and the run says
// so rather than counting it as conformant.
const RESPONSE_SCHEMAS = {
  "initialize": load("v1/InitializeResponse.json"),
  "thread/start": load("v2/ThreadStartResponse.json"),
  "thread/resume": load("v2/ThreadResumeResponse.json"),
  "turn/start": load("v2/TurnStartResponse.json"),
  "config/read": load("v2/ConfigReadResponse.json"),
  "turn/interrupt": load("v2/TurnInterruptResponse.json"),
  "turn/steer": load("v2/TurnSteerResponse.json"),
  "model/list": load("v2/ModelListResponse.json"),
  "account/rateLimits/read": load("v2/GetAccountRateLimitsResponse.json"),
};
// An error reply matches none of the three shapes above, and used to fall through every branch while
// still counting itself validated. It has a schema of its own.
const JSONRPC_ERROR = load("JSONRPCError.json");

// The directory tracks what this suite loads and nothing else. A schema no case reads is validated
// against nothing, goes stale at the next codex upgrade unnoticed, and makes the tracked count a number
// nobody can act on. The regeneration recipe in README copies the whole tree; this is what prunes it.
const unloaded = fs.readdirSync(SCHEMAS, { recursive: true })
  .map((p) => String(p).split(path.sep).join("/"))
  .filter((p) => p.endsWith(".json") && !loaded.has(p));
if (unloaded.length) {
  console.log(`FAIL  ${schemaDir} tracks ${unloaded.length} schema(s) this suite never loads: ${unloaded.join(", ")}`);
  process.exit(1);
}

const unchecked = new Set();
const KNOWN = new Set(["$ref", "oneOf", "anyOf", "allOf", "type", "enum", "const", "required", "properties",
  "additionalProperties", "items", "description", "title", "$schema", "default", "format", "examples"]);

function resolve(node, root) {
  let seen = 0;
  while (node && node.$ref) {
    if (++seen > 20) return {};
    const p = node.$ref.replace(/^#\//, "").split("/");
    let cur = root;
    for (const k of p) cur = cur?.[k];
    node = cur;
  }
  return node ?? {};
}

// Returns [] when the value conforms, else a list of one-line reasons.
function check(value, schemaIn, root, at = "$") {
  const schema = resolve(schemaIn, root);
  for (const k of Object.keys(schema)) if (!KNOWN.has(k)) unchecked.add(k);
  const errs = [];
  const typeOf = (v) => Array.isArray(v) ? "array" : v === null ? "null" : typeof v;

  if (schema.oneOf || schema.anyOf) {
    const branches = schema.oneOf ?? schema.anyOf;
    if (branches.some((b) => check(value, b, root, at).length === 0)) return errs;
    // A union of dozens of method variants reports uselessly unless the RIGHT variant is named. These unions
    // are discriminated by a literal `method`, so pick that branch and report its own complaints;
    // fall back to the fewest-errors branch only for unions with no discriminator.
    const byMethod = value && typeof value === "object" && value.method
      ? branches.find((b) => (resolve(b, root).properties?.method?.enum ?? []).includes(value.method))
      : null;
    if (byMethod) return check(value, byMethod, root, at);
    const perBranch = branches.map((b) => check(value, b, root, at));
    const best = perBranch.reduce((a, b) => (b.length < a.length ? b : a), perBranch[0]);
    errs.push(`${at}: matches none of the ${branches.length} variants; closest: ${best[0] ?? "?"}`);
    return errs;
  }
  if (Array.isArray(schema.allOf)) for (const s of schema.allOf) errs.push(...check(value, s, root, at));

  if (schema.type !== undefined) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    const vt = typeOf(value);
    const ok = types.includes(vt) || (vt === "number" && types.includes("integer") && Number.isInteger(value));
    if (!ok) { errs.push(`${at}: expected ${types.join("|")}, got ${vt}`); return errs; }
  }
  if (schema.const !== undefined && JSON.stringify(value) !== JSON.stringify(schema.const))
    errs.push(`${at}: must be ${JSON.stringify(schema.const)}`);
  if (Array.isArray(schema.enum) && !schema.enum.some((e) => JSON.stringify(e) === JSON.stringify(value)))
    errs.push(`${at}: ${JSON.stringify(value)} is not one of ${JSON.stringify(schema.enum)}`);

  if (typeOf(value) === "object") {
    for (const k of schema.required ?? []) if (!Object.hasOwn(value, k)) errs.push(`${at}.${k}: required and missing`);
    for (const [k, sub] of Object.entries(schema.properties ?? {}))
      if (Object.hasOwn(value, k)) errs.push(...check(value[k], sub, root, `${at}.${k}`));
    if (schema.additionalProperties === false) {
      const known = new Set(Object.keys(schema.properties ?? {}));
      for (const k of Object.keys(value)) if (!known.has(k)) errs.push(`${at}.${k}: not permitted here`);
    }
  }
  if (typeOf(value) === "array" && schema.items && !Array.isArray(schema.items))
    value.forEach((v, i) => errs.push(...check(v, schema.items, root, `${at}[${i}]`)));
  return errs;
}

// Every scenario the fixture implements, taken from its exported inventory so dispatches outside the
// turn/start switch are included.
const scenarios = Object.keys(SCENARIOS);

// A few scenarios only emit their interesting messages when the driver asks for the matching feature.
const shimDir = tempDir("codex-conformance-");
codexShim(shimDir);
const schemaFile = path.join(shimDir, "s.json");
fs.writeFileSync(schemaFile, JSON.stringify({
  type: "object", additionalProperties: false, required: ["verdict", "count"],
  properties: { verdict: { type: "string" }, count: { type: "integer" } },
}));
// The inventory says what each scenario needs; the translation into flags lives here, because the
// fixture cannot know the path of a schema file this suite writes.
function argsFor(scenario) {
  const s = SCENARIOS[scenario];
  return [
    "--prompt", "conformance",
    ...(s.resume ? ["--resume", s.resume] : []),
    ...(s.effort ? ["--effort", s.effort] : []),
    ...(s.outputSchema ? ["--output-schema", schemaFile] : []),
    "--timeout", String(s.timeout ?? 20),
  ];
}

async function runScenario(scenario) {
  const emit = path.join(shimDir, `emit-${scenario}.jsonl`);
  try { fs.rmSync(emit, { force: true }); } catch {}
  await spawnNode([DRIVER, "--level", "read", "--cwd", shimDir, ...argsFor(scenario)], {
    env: { PATH: `${shimDir}:${process.env.PATH}`, FAKE_SCENARIO: scenario,
           FAKE_EMIT_LOG: emit, CODEX_DELEGATE_STATE_DIR: path.join(shimDir, "state") },
    stdio: ["ignore", "ignore", "ignore"], killAfterMs: 30000 }).done;
  try { return fs.readFileSync(emit, "utf8").split("\n").filter((l) => l.trim()); } catch { return []; }
}

let failed = 0, validated = 0, notifications = 0, requests = 0, responses = 0, errors = 0;
const unvalidatedMethods = new Set();
const deliberate = [];

for (const scenario of scenarios) {
  const lines = await runScenario(scenario);
  if (!lines.length) {
    // A scenario that emits nothing at all is either unreachable from the driver or a broken fixture;
    // either way it is not evidence of conformance and must not pass silently.
    console.log(`FAIL  ${scenario}: the fixture emitted nothing`);
    failed++;
    continue;
  }
  const problems = [];
  for (const line of lines) {
    let msg;
    try { msg = JSON.parse(line); } catch { problems.push(`unparsable line: ${line.slice(0, 80)}`); continue; }
    // Excluded by the fixture's own marker, with its reason printed — a scenario whose point is a
    // malformed message must not be validated, and must not be silently skipped either.
    if (msg.__deliberatelyMalformed) { deliberate.push(`${scenario}: ${msg.__deliberatelyMalformed}`); continue; }
    if (msg.method && msg.id === undefined) {
      notifications++;
      problems.push(...check(msg, SERVER_NOTIFICATION, SERVER_NOTIFICATION).map((e) => `notification ${msg.method}: ${e}`));
    } else if (msg.method && msg.id !== undefined) {
      requests++;
      problems.push(...check(msg, SERVER_REQUEST, SERVER_REQUEST).map((e) => `request ${msg.method}: ${e}`));
    } else if (msg.result !== undefined) {
      responses++;
      // The fixture answers in order, so a response's method is the request it replies to; the driver's
      // own sequence is fixed and short, and the fixture records which method produced each reply.
      const method = msg.__method ?? null;
      if (!method) { unvalidatedMethods.add("(response: method not recorded)"); continue; }
      const schema = RESPONSE_SCHEMAS[method];
      if (!schema) { unvalidatedMethods.add(method); continue; }
      problems.push(...check(msg.result, schema, schema).map((e) => `response ${method}: ${e}`));
    } else if (msg.error !== undefined) {
      errors++;
      problems.push(...check(msg, JSONRPC_ERROR, JSONRPC_ERROR).map((e) => `error response: ${e}`));
    } else {
      // Not a notification, a request, a result or an error: no JSON-RPC message has that shape, and
      // counting it validated is how the tally came to exceed the four categories it is made of.
      problems.push(`neither a notification, a request nor a response: ${line.slice(0, 80)}`);
    }
    validated++;
  }
  if (problems.length) {
    failed++;
    console.log(`FAIL  ${scenario}: ${problems.length} conformance problem(s)`);
    for (const p of problems.slice(0, 4)) console.log(`        ${p}`);
  } else {
    console.log(`ok    ${scenario} (${lines.length} message(s))`);
  }
}

console.log(`\n${validated} message(s) validated: ${notifications} notification(s), ${requests} server request(s), ${responses} response(s), ${errors} error response(s)`);
if (unchecked.size) console.log(`keywords the validator does not check: ${[...unchecked].sort().join(", ")}`);
if (unvalidatedMethods.size) console.log(`responses not validated (no schema mapped): ${[...unvalidatedMethods].join(", ")}`);
for (const d of deliberate) console.log(`excluded, deliberately malformed — ${d}`);
console.log(failed ? `\n${failed}/${scenarios.length} scenario(s) failed` : `\nall ${scenarios.length} scenarios conform to ${schemaDir}`);
process.exit(failed ? 1 : 0);
