#!/usr/bin/env node
// What ships, and what version it says it is.
//
//   node evals/package.test.mjs
//
// marketplace.json declares `source: "./"`, so the payload IS this repository: everything git tracks is
// installed into a user's plugin cache. Nothing asserted what must be in it, and nothing compared the
// places the version is written against each other or against the tag that was cut.

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { EVALS, ROOT, SCRIPTS, VERSION, registry, runCases, summarize } from "./lib/harness.mjs";

const { cases: CASES, test } = registry();
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const git = (args) => spawnSync("git", ["-C", ROOT, ...args], { encoding: "utf8" });
// Every skill page the tree holds, read from the directory rather than listed: a new skill is a new copy
// of the version and a new set of links the day its directory appears.
const skillPages = fs.readdirSync(path.join(ROOT, "skills"), { withFileTypes: true })
  .filter((d) => d.isDirectory()).map((d) => `skills/${d.name}/SKILL.md`).sort();

// ------------------------------------------------------------------ version

test("plugin.json, every SKILL.md and the driver state one version",
  "a saved report names the driver that produced it, and an install names the plugin; hand-maintained copies drifted silently for a release, and every new skill adds one nobody bumps",
  () => {
    const plugin = JSON.parse(read(".claude-plugin/plugin.json")).version;
    // The Agent Skills spec puts version under `metadata`; a top-level `version` is an unknown frontmatter
    // key and strict packaging rejects it, so this reads the nested one and nothing else.
    const metaVersion = (rel) =>
      /^metadata:\s*$[\s\S]*?^\s+version:\s*"?([^"\s]+)"?\s*$/m.exec(read(rel).split("---")[1] ?? "")?.[1] ?? null;
    const seen = {
      "plugin.json": plugin,
      ...Object.fromEntries(skillPages.map((p) => [`${p} metadata.version`, metaVersion(p)])),
      "driver VERSION": VERSION,
    };
    const disagree = Object.entries(seen).filter(([, v]) => v !== VERSION);
    return disagree.length === 0 || `versions disagree: ${JSON.stringify(seen)}`;
  });

test("marketplace.json describes the same plugin as plugin.json",
  "the marketplace entry is a second copy of the plugin's name and description, and a marketplace listing that names a plugin the manifest does not is an install that fails at the last step",
  () => {
    const plugin = JSON.parse(read(".claude-plugin/plugin.json"));
    const entry = JSON.parse(read(".claude-plugin/marketplace.json")).plugins.find((p) => p.name === plugin.name);
    if (!entry) return `marketplace.json lists no plugin named ${plugin.name}`;
    return entry.description === plugin.description || "the two descriptions differ";
  });

test("the newest v* tag is the version the tree claims",
  "the tag is what a user installs at; a tree that says 0.6.0 under a v0.7.0 tag ships the wrong driver under the right name",
  () => {
    const tags = git(["tag", "--list", "v*"]);
    if (tags.status !== 0) return `git tag --list failed: ${tags.error?.message ?? String(tags.stderr).trim()}`;   // no git, no tags to compare against
    const versions = tags.stdout.split("\n").map((t) => t.trim()).filter((t) => /^v\d+\.\d+\.\d+$/.test(t))
      .map((t) => t.slice(1))
      .sort((a, b) => {
        const [pa, pb] = [a, b].map((v) => v.split(".").map(Number));
        for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i];
        return 0;
      });
    const newest = versions.at(-1);
    // A shallow clone (actions/checkout's default) fetches no tags. Announced rather than silently
    // counted as agreement, so a green run cannot come to mean "there was nothing to check".
    if (!newest) { console.log("note  no v* tag is visible in this checkout; the tag comparison did not run"); return true; }
    return newest === VERSION || `the newest tag is v${newest} and the tree says ${VERSION}`;
  });

// ------------------------------------------------------------------ content

// Everything git tracks, which under `source: "./"` is exactly what an install copies.
const tracked = (() => {
  const r = git(["ls-files", "-z"]);
  return r.status === 0 ? r.stdout.split("\0").filter(Boolean) : null;
})();

test("git can list the payload (the content cases below are sound)",
  "the content cases read this list; if it were empty they would pass vacuously, asserting nothing about what ships",
  () => (tracked && tracked.length > 50) || `git ls-files returned ${tracked ? tracked.length : "an error"}`);

test("every file the plugin needs to run is in the payload",
  "an install is a copy of this tree: a file left untracked is a file the user does not get, and the failure lands at delegation time as exit 90 or a missing reference",
  () => {
    // The fixed entries are the files no directory listing yields; skill pages, scripts and suites come
    // from the tree itself, so a file created and never `git add`ed is caught here rather than at a
    // user's install.
    const under = (rel) => fs.readdirSync(path.join(ROOT, rel)).filter((f) => f.endsWith(".mjs")).map((f) => `${rel}/${f}`);
    const required = [
      ".claude-plugin/plugin.json", ".claude-plugin/marketplace.json",
      "skills/codex-delegate/schemas/review-output.schema.json",
      "agents/codex-seat.md", "LICENSE", "README.md",
      ...skillPages,
      ...under(path.relative(ROOT, SCRIPTS)),
      ...under(path.relative(ROOT, EVALS)), ...under(path.relative(ROOT, path.join(EVALS, "lib"))),
    ];
    const have = new Set(tracked ?? []);
    const missing = required.filter((f) => !have.has(f));
    // Every reference a SKILL.md sends the reader to, resolved rather than listed here: a new one is
    // covered the moment it is linked, and a link to a file nobody committed is caught before release.
    // Every page, because orchestrate's whole mechanism is a link into the sibling.
    const linked = skillPages.flatMap((page) => [...read(page).matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)]
      .map((m) => m[1].split("#")[0])
      .filter((t) => t && !/^[a-z]+:/.test(t))                     // an external URL is not part of the payload
      .map((t) => path.relative(ROOT, path.resolve(path.dirname(path.join(ROOT, page)), t)).split(path.sep).join("/")));
    const dangling = [...new Set(linked)].filter((f) => !have.has(f));
    const problems = [];
    if (missing.length) problems.push(`not tracked, so not shipped: ${missing.join(", ")}`);
    if (dangling.length) problems.push(`SKILL.md links to files the payload does not carry: ${dangling.join(", ")}`);
    // The conformance suite validates the fixture against these, and the upgrade recipe regenerates them.
    if (!(tracked ?? []).some((f) => /^schema-\d[^/]*\/.+\.json$/.test(f))) problems.push("no schema-<version>/ directory is tracked");
    return problems.length === 0 || problems.join("; ");
  });

test("no local artifact is in the payload",
  "`source: \"./\"` makes every tracked file part of the install; a committed .claude/settings.local.json ships one machine's model pin to every user, and a stale .codex-delegate.lock ships a lock",
  () => {
    const REJECT = [
      [/^\.claude\//, "Claude Code's per-checkout state"],
      [/(^|\/)\.DS_Store$/, "a Finder artifact"],
      [/\.lock$/, "a lock file"],
      [/(^|\/)node_modules\//, "an installed dependency tree"],
      [/(^|\/)\.env(\.|$)/, "an environment file"],
    ];
    const bad = [];
    for (const f of tracked ?? [])
      for (const [re, what] of REJECT) if (re.test(f)) bad.push(`${f} (${what})`);
    return bad.length === 0 || `tracked and would ship: ${bad.join(", ")}`;
  });

test("nothing in the payload is ignored by .gitignore",
  "the two rules disagreeing means one of them is dead: either a shipped file is about to be dropped by a fresh clone's tooling, or the ignore rule is decorative",
  () => {
    const r = git(["ls-files", "-i", "-c", "--exclude-standard", "-z"]);
    if (r.status !== 0) return true;
    const both = r.stdout.split("\0").filter(Boolean);
    return both.length === 0 || `tracked AND ignored: ${both.join(", ")}`;
  });

process.exit(summarize(await runCases(CASES), CASES.length));
