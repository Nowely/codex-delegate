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
import { pathToFileURL } from "node:url";
import { EVALS, ROOT, SCRIPTS, VERSION, measured, parseCount, registry, runCases, skip, spawnNode,
         summarize, tempDir } from "./lib/harness.mjs";

const { cases: CASES, test } = registry();
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const git = (args) => spawnSync("git", ["-C", ROOT, ...args], { encoding: "utf8" });
// An installed plugin root is a copy of the payload with no .git in it. Every case below that reads
// git announces itself there instead of failing, or `npm test` from that root — which README.md
// promises — is red on its second suite with a message saying every payload file is missing.
const hasRepo = git(["rev-parse", "--git-dir"]).status === 0;
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

test("a v* tag on HEAD is the version the tree claims",
  "the tag is what a user installs at; a tree that says 0.6.0 under a v0.7.0 tag ships the wrong driver under the right name",
  () => {
    if (!hasRepo) return skip("no git repository here, so no tag names this tree");
    const tags = git(["tag", "--list", "v*", "--points-at", "HEAD"]);
    if (tags.status !== 0) return `git tag --points-at failed: ${tags.error?.message ?? String(tags.stderr).trim()}`;
    const onHead = tags.stdout.split("\n").map((t) => t.trim()).filter((t) => /^v\d+\.\d+\.\d+$/.test(t));
    // Only the tag ON HEAD, because RELEASING.md cuts it at step 8 and runs `npm test` at step 4: the
    // newest tag in the repository names the PREVIOUS release for the whole of a release preparation,
    // and comparing against that makes every such run red. A shallow clone (actions/checkout's default)
    // fetches no tags and lands here too. Announced rather than silently counted as agreement, so a
    // green run cannot come to mean "there was nothing to check".
    if (!onHead.length) return skip("HEAD carries no v* tag; the version is compared at the tag, not before it");
    const wrong = onHead.filter((t) => t.slice(1) !== VERSION);
    return wrong.length === 0 || `HEAD carries ${wrong.join(", ")} and the tree says ${VERSION}`;
  });

// ------------------------------------------------------------------ content

// Everything git tracks, which under `source: "./"` is exactly what an install copies.
const tracked = (() => {
  const r = git(["ls-files", "-z"]);
  return r.status === 0 ? r.stdout.split("\0").filter(Boolean) : null;
})();

test("git can list the payload (the content cases below are sound)",
  "the content cases read this list; the floor sits far below the tree's real count but still catches an empty or near-empty list, which would let every content case below pass vacuously",
  () => {
    if (!hasRepo) return skip("no git repository here, so there is no payload list to build");
    return (tracked && tracked.length > 30) || `git ls-files returned ${tracked ? tracked.length : "an error"}`;
  });

test("every file the plugin needs to run is in the payload",
  "an install is a copy of this tree: a file left untracked is a file the user does not get, and the failure lands at delegation time as exit 90 or a missing reference",
  () => {
    if (!hasRepo) return skip("no git repository here; what an install carries is decided in the checkout it was cut from");
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
    if (!hasRepo) return skip("no git repository here, so there is no payload list to check for local artifacts");
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
    if (!hasRepo) return skip("no git repository here, so there is nothing tracked for the two rules to disagree about");
    const r = git(["ls-files", "-i", "-c", "--exclude-standard", "-z"]);
    if (r.status !== 0) return `git ls-files -i -c failed: ${r.error?.message ?? String(r.stderr).trim()}`;
    const both = r.stdout.split("\0").filter(Boolean);
    return both.length === 0 || `tracked AND ignored: ${both.join(", ")}`;
  });

// ------------------------------------------------------------------ the runner, and an installed root

// Here rather than in a suite of their own because their subject is this repository's own machinery —
// what an install carries, and how `npm test` counts what it ran — not the driver's behaviour.

// The two cases that re-run this suite inside a copy set this, or the copy would copy itself.
const NESTED = process.env.CODEX_DELEGATE_EVAL_NESTED === "1";

// An installed plugin root, made the way `source: "./"` makes one: every tracked file, no .git.
function payloadCopy(name) {
  const d = tempDir(`codex-payload-${name}-`);
  for (const f of tracked) {
    const dest = path.join(d, f);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(ROOT, f), dest);
  }
  return d;
}
const runSuiteIn = (dir) => spawnNode([path.join(dir, "evals", "package.test.mjs")],
  { env: { CODEX_DELEGATE_EVAL_NESTED: "1" }, killAfterMs: 120000 }).done;

test("this suite is green from a plugin root that has no .git",
  "README.md tells a user to run `npm test` from the installed plugin root; there git answers nothing, and the cases that read it used to FAIL — three of seven — which stopped run-all on its second suite with a message saying every payload file was missing",
  async () => {
    if (NESTED) return skip("this run IS the copy");
    if (!tracked) return skip("no git repository here to copy a payload out of");
    const { code, out } = await runSuiteIn(payloadCopy("nogit"));
    if (code !== 0) return `exit ${code} without a repository: ${out.match(/^FAIL.*/m)?.[0] ?? out.trim().slice(-200)}`;
    const summary = out.trim().split("\n").at(-1);
    const m = /^all (\d+) passed, (\d+) skipped/.exec(summary);
    if (!m) return `the summary does not separate what ran from what could not: ${summary}`;
    return Number(m[2]) >= 3 || `expected the git cases to announce themselves; got ${summary}`;
  });

test("a v* tag on HEAD that disagrees with the tree is a failure",
  "the tag comparison now waits for a tagged HEAD, so between releases nothing exercises it: without this case the gate could rot silently and ship a tree whose version is not the tag it was cut at",
  async () => {
    if (NESTED) return skip("this run IS the copy");
    if (!tracked) return skip("no git repository here to copy a payload out of");
    const d = payloadCopy("tagged");
    const g = (...a) => spawnSync("git", ["-C", d, "-c", "commit.gpgsign=false", "-c", "user.email=evals@invalid",
                                          "-c", "user.name=evals", ...a], { encoding: "utf8" });
    if (g("init", "-q").status !== 0) return skip("git init does not work here");
    if (g("add", "-A").status !== 0 || g("commit", "-q", "-m", "payload").status !== 0) return skip("git commit does not work here");
    if (g("tag", "v9.9.9").status !== 0) return "git tag failed in the scratch repository";
    const { code, out } = await runSuiteIn(d);
    if (code === 0) return `a v9.9.9 tag over ${VERSION} left the suite green: ${out.trim().split("\n").at(-1)}`;
    return /HEAD carries v9\.9\.9 and the tree says/.test(out)
      || `it went red for another reason: ${out.match(/^FAIL.*/m)?.[0] ?? out.trim().slice(-200)}`;
  });

test("parseCount tells a suite that ran from one that did not",
  "run-all counts green suites out of these strings; the forms it cannot read used to land as \"?\" and count as green, so a suite whose summary prose drifted was reported as passing",
  () => {
    const forms = [
      ["\nall 76 passed\n", "76", true],
      ["\nall 74 passed, 2 skipped: a; b\n", "74 passed, 2 skipped", true],
      ["\n7 skipped (codex binary absent)\n", "7 skipped", false],
      ["\n3 skipped (codex binary absent)\nall 4 cases that ran agree\n", "4", true],
      ["orchestrate-live: NOT RUN (set ORCHESTRATE_LIVE=1)\n", "not run", false],
      ["\n2/76 failed\n", "?", false],
    ];
    const wrong = forms.filter(([out, want, green]) => parseCount(out) !== want || measured(parseCount(out)) !== green)
      .map(([out, want]) => `${JSON.stringify(out.trim())} -> ${parseCount(out)}, expected ${want}`);
    return wrong.length === 0 || wrong.join("; ");
  });

test("run-all fails on a suite a signal killed",
  "a killed child reports `code` null and `process.exit(null)` exits 0, so a suite that was killed — out of memory, out of a sandbox — used to end `npm test` green",
  async () => {
    const d = tempDir("codex-runall-");
    fs.mkdirSync(path.join(d, "lib"));
    fs.copyFileSync(path.join(EVALS, "run-all.mjs"), path.join(d, "run-all.mjs"));
    // The real harness through a one-line re-export: run-all resolves it relatively, and a copy of it
    // would be a second parseCount that could disagree with the one being tested.
    fs.writeFileSync(path.join(d, "lib", "harness.mjs"),
      `export * from ${JSON.stringify(pathToFileURL(path.join(EVALS, "lib", "harness.mjs")).href)};\n`);
    // run-all refuses to start unless its hand-ordered list matches the directory, so the stub tree
    // carries every suite name — each one killing itself, whichever the runner reaches first.
    for (const f of fs.readdirSync(EVALS).filter((n) => n.endsWith(".test.mjs")))
      fs.writeFileSync(path.join(d, f), `process.kill(process.pid, "SIGKILL");\n`);
    const { code, out } = await spawnNode([path.join(d, "run-all.mjs")], { killAfterMs: 60000 }).done;
    if (code === 0) return `run-all exited 0 on a suite that was killed: ${out.trim().split("\n").at(-1)}`;
    return /run-all: \S+ FAILED \(killed by SIG/.test(out) || `the summary does not name the signal: ${out.trim().split("\n").at(-1)}`;
  });

process.exit(summarize(await runCases(CASES), CASES.length));
