# Prior art

Everyone writing documentation tooling prescribes. Almost nobody measures. This file records who does
which, so a later version of this plugin can compose what works instead of reinventing it, and so a
rejected approach is not proposed a second time.

Surveyed 2026-09-11. Four scouts swept GitHub and the web by different angles, eight readers went deep,
and one Codex seat read the official Anthropic skills. Forty-one candidates survived dedup; eight were
read in full and thirty-three were not. The unread are listed at the end rather than dropped.

**Evidence level, in this plugin's own terms.** Every line reference below is level 2: one reader opened
that file and reported it. They are not re-verified by a second reader, except the Anthropic skill in
the next section, which was read directly. Treat a citation here as a place to look, not as a proven
fact. Research entries reached only by web search are marked unconfirmed.

## The closest prior art is Anthropic's own skill

`anthropics/skills`, skill `doc-coauthoring`, Stage 3 "Reader Testing": predict five to ten questions a
reader would ask, hand each to a fresh sub-agent together with the document, summarise what the reader
got right and wrong, loop back to refinement. Verified directly on 2026-09-11 at
`skills/doc-coauthoring/SKILL.md`. The fresh-reader test is not ours.

It diverges exactly where this plugin has measurements:

| `doc-coauthoring` | `terse:audit` |
|---|---|
| "check if Reader Claude gives correct answers" — the key is in the author's head | the key is derived from the code before the first reader exists |
| Step 3 asks the reader what was ambiguous or unclear | never asks: on 2026-09-10 that self-report ran against the truth |
| no claim is checked against code | the truth pass, with three evidence levels and three verdicts |
| the document is pasted into the reader | the reader starts at the entry file; steps and departures are counted |
| no control questions | controls are mandatory, so a repair cannot silently break what worked |
| exit when the reader stops complaining | a score, comparable between runs, and a fall is a refusal |
| questions are "what would readers ask to discover this doc" | questions are "what decision must this reader make" |

The repository declares **no licence**. Learn from it; copy nothing.

## The eight read in full

| Repository | Licence | What it measures | Verdict |
|---|---|---|---|
| `neeeophytee/agent-stylebooks` | MIT; 16 upstream guides keep their own terms | itself, not documents | take a part |
| `ciembor/agent-rules-books` | MIT | almost nothing, and says so in `docs/CRITICISM.md:17` | take a part |
| `AminBlg/SimpleEnglish` | MIT | the text's surface, never a reader's understanding | take a part |
| `riekelt/technical-writer` | MIT | four rulers; one routes queries, the rest prescribe | take a part |
| `vercel/eve` | Apache-2.0 | the skill nothing; the repository around it plenty | take a part |
| `benchflow-ai/skillsbench` | Apache-2.0 | outcome: the delta between with-document and without | take a part |
| `conorbronsdon/avoid-ai-writing` | MIT | its own detector, and preservation across a rewrite | take a part |
| `doc-detective/agent-tools` | **AGPL-3.0** | the product against the document's claims | take a part |

AGPL spreads to what links it. From `doc-detective`, take ideas only.

## What is worth taking

Ranked by what it would buy us. Each line names where it lives and what it costs.

1. **An oracle before scoring.** A run with full access must score 100% first; if it does not, abort and
   fix the question rather than reporting a document failure.
   `skillsbench .agents/skills/task-review/scripts/run_experiments.sh:96-101`. Cheap, and it guards the
   step our whole method rests on. Cost: one extra run, and a hard stop on a bad question.
2. **A mechanical preservation gate on every rewrite.** A before/after diff that errors when the rewrite
   touched fenced code, frontmatter, a blockquote, a table cell, inline code, a URL, a path, or heading
   structure, and warns on a dropped figure or more than 40% word shrink.
   `conorbronsdon/avoid-ai-writing detector/validate.js:165-319`. No model in the loop. Their carve-outs
   matter: a validator that fires on its own skill's instructions gets switched off within a day.
3. **A clean room for the reader seat.** `--setting-sources ""` so no user settings leak in,
   `--disallowedTools Bash,Read,Write,Edit,Glob,Grep,WebFetch,WebSearch` so the seat cannot go find the
   answer elsewhere, `cwd=/tmp`, the effort level pinned and recorded in every raw file, and a refusal
   to compare runs recorded at different effort levels.
   `AminBlg/SimpleEnglish evals/run_bench.py:47-57`. `measure.md` states the rights as prose; this is
   the same rights as flags, and it is strictly better.
4. **Failure classification from the read log instead of from judgement.** No document file was ever
   opened means "never found". The router was read and the linked detail file never was, computed as
   `top_level_only = bool(skill_files) and not sub_files`.
   `skillsbench .../references/audit-skillsbench.md:7-62`. It needs the reader to browse a directory and
   emit a tool log — which our protocol already requires, and which `doc-coauthoring` forfeits by pasting
   the document in.
5. **A fact-preservation map.** Before rewriting, inventory every fact, number, qualification and
   conditional; after rewriting, map each to its place in the new text and compare numbers independently
   from prose. Anything that lost a qualifier is a defect.
   `agent-stylebooks skills/sec-plain-english/SKILL.md:51-55`, restated at `EXAMPLES.md:103`. It belongs
   as a precondition every bake-off candidate must satisfy before judging, not as a row on the sheet.
6. **Lift as a razor on our own rules.** A rule earns its place only by separating the two classes:
   `lift = firing rate on class A / firing rate on class B`, and below 1.0 it fires more on the class you
   did not intend. Published beside the headline number even when it indicts the flagship.
   `avoid-ai-writing scripts/fp-measure.js:181-185`, table in `corpus/README.md`. Adopting it is a
   commitment to possibly deleting part of our fixed writing rules.
7. **An execution witness for command-shaped claims.** For every command in the `.md` files, run it
   against the real build and let the exit code plus an output substring be the witness.
   `doc-detective src/skills/doc-detective-doc-testing/SKILL.md:139-166`. This is level 3 of our truth
   pass made real, for the subset of claims that have an executable witness. Placement and findability
   have none.
8. **Findability by distractor routing.** Give a cheap model a realistically badly-phrased query and the
   real destinations plus about ten deliberate distractors; score hits over total, with negative cases
   and an accept list that tolerates a correct sibling.
   `riekelt/technical-writer plugins/technical-writer/evals/trigger-evals.json`.
9. **Bind a judge's verdict to the sha256 of the text it read.** Compute the digest first, stop on
   mismatch, and state the digest when none was given.
   `riekelt plugins/technical-writer/agents/prose-reviewer.md:15`.
10. **An `execution_evidence` field on every handoff:** `not_run | model_only | executed`, where
    `executed` requires evidence from the host that it ran. A verifier that could not run its tool
    reports `model_only` rather than a clean pass.
    `avoid-ai-writing skills/avoid-ai-writing-router/references/handoff-contract.md:26-29`.
11. **A testable-rule gate on our own writing rules.** Every rule must name an observable decision — what
    goes first, which sentence subject, what an error message must contain — and a rule that reduces to
    an adjective is rejected. `agent-stylebooks CONTRIBUTING.md:52-56`.
12. **A boilerplate rejection test on findings.** A finding fails review if its sentence could be pasted
    unchanged into another document's report, if it cites a whole file instead of a line range, or if it
    states a claim without saying why the cited line matters.
    `agent-rules-books _rule-workbench/CHECK_COMPATIBILITY.md:286-321`.
13. **Route each failure to "method bug" or "this document missed it".** A method bug edits the method
    first and the document is re-run. `agent-rules-books _rule-workbench/PROCESS.md:137-172`. This turns
    a deterministic chain into a learning one, and two runs on two repositories can then diverge. Real
    tension, recorded, not adopted.
14. **Doc-vs-code invariants with a zero-false-positive selection rule.** Extract every code fence's
    import specifiers and check them against the package's real `exports` map, instead of typechecking
    snippets. `vercel/eve scripts/check-doc-snippets.mjs:29-33`, rationale at `:8-12`.
15. **Orphan pages as a measured property.** Compute rendered URLs, flag any page nothing links to, and
    require a hub to body-link every child its nav manifest declares.
    `vercel/eve scripts/check-docs.mjs:183-190`.
16. **A judge ladder: tracked, then soft `atLeast`, then hard `gate`,** with a deterministic assertion
    preferred wherever one exists, the judge model never the model under test, and a failure receipt
    printing prompt, criteria, response and rationale. `vercel/eve docs/evals/judge.mdx:6, :31-39, :66-80`.
17. **Metric-design discipline: when you define a metric, close the loophole the last one left.** Their
    reply cap excluded list items, so the model bulleted everything and scored clean; the replacement
    counts every list item and table row as a sentence, pinned by a fixture asserting exactly five
    sentences, one em-dash, one bold, one header, two bullets.
    `SimpleEnglish evals/ste_lint.py:185-214`, fixture at `:240`.
18. **Two mechanical claim checks that are not style gates.** Assert every relative Markdown link
    resolves on disk, and assert any count stated in prose equals the count on disk.
    `riekelt test/repository.test.cjs:89-98` and `:100-112`. The narrow exception to our rejection of
    CI gates: these check claims, not taste.
19. **Recompute every printed number from committed raw data in CI,** and fail on mismatch.
    `SimpleEnglish evals/check_numbers.py:34` (`expect`), `:88`, `:102` (copy drift), `:116` (one version
    string across four files). The mechanised half of our lie class, with no model call.
20. **A hash-only corpus with provenance.** A manifest recording what each document is, its source,
    licence, register, word count and sha256 — never the text. Verification fails loudly on a mismatch,
    because a source that changed invalidates the measurement it backs.
    `avoid-ai-writing corpus/manifest.json`, mechanism at `corpus/README.md:11-33`. Our 2026-09-10 result
    is pinned to no document version at all.

Deliberately not taken: a no-document control arm scored as a delta
(`skillsbench run_experiments.sh:103-106`) doubles the seats per question, and a three-vote ensemble per
check (`doc-detective src/agents/doc-detective-specialist.md:181-203`) triples them. Both collide with the
standing rule against large fan-outs. Record them as available, not as planned.

## Two findings against our own numbers

**The noise floor.** "Single-trial deltas with |Δ| < 30 pp are likely noise. Always note the trial count
alongside the verdict." `skillsbench .../references/audit-skillsbench.md:114-117`. Our 3/6 → 6/6 is
+50 pp and clears that bar. It was one trial per question, and nothing we publish says so.

**The publication gate.** `avoid-ai-writing` forbids itself any number in a README without n ≥ 100, a
confidence interval, and more than one register — and keeps its own unflattering AUC of 0.501 out of the
README to honour it. `corpus/README.md:229-234`, Wilson intervals at `scripts/fp-measure.js:48-55`. By
that standard "five standards lost to two controls across ten seats" is one run, not a rate, and should
read that way.

**Treat a regression as a first-class outcome.** A delta of −10 pp or worse is `hurt` and must carry a
`misled_quote`: the exact line that misled the reader. `skillsbench audit-skillsbench.md:79-87`. This
contradicts a bake-off where a judge picks a winner — a candidate can repair more measured failures and
still break a question that was already right.

## Rejected, and now independently reconfirmed

The 2026-09-10 run rejected published standards as a mandatory pass, hard per-sentence word limits, prose
linters and CI punctuation gates. Two sources reached the same place from the inside:

- **A standard's own advocate measured it losing.** `AminBlg/SimpleEnglish` put a 299-byte micro-prompt
  against its full 53-rule ASD-STE100 skill across eight scenarios. The micro-prompt won on sentence
  length, em-dashes, bold, headers and bullets, and lost only on the linter the standard itself defines.
  Raw files committed: `evals/results/rebuild-2026-09-02/micro-prompt.txt`,
  `evals/results/WHY-USELESS-2026-09-02.md`.
- **A stylebook collection destroyed its only instrument.** Of the sixteen sources in
  `neeeophytee/agent-stylebooks`, one was a scored instrument: the CDC Clear Communication Index, twenty
  questions with thresholds. It was "operationalized without reproducing its 20 questions, scoring
  thresholds, score sheets" (`PROVENANCE.md:44-45`), and the skill now forbids copying a checklist score
  into the output as proof (`skills/cdc-clear-communication/SKILL.md:72`). Licence hygiene converted a
  measurement into prose. That is the direction this plugin refuses to go.
- A third admits it outright: `ciembor/agent-rules-books docs/CRITICISM.md:17` scores "there is no clear
  measurement of improvement" at validity 9/10 and about 2/10 solved.
- `agent-stylebooks` goes further than refusing to measure: `scripts/validate_repo.py:390` fails the
  build if an `evals/` directory exists, and `AGENTS.md:9` says to keep eval infrastructure out of v0.2.

One thing both of those repositories get right and we should not lose: neither imposes a hard word limit
anywhere, and neither gates prose in CI.

## Not read

Thirty-three candidates were found and not opened. Nothing here is dismissed; it is unread.

**Doc-vs-code drift, the nearest unexplored neighbours.** These check claims mechanically before
involving a model, which is our truth pass by another route.

- `specialone0007/review-skills` — `docs-sync-audit` runs a stdlib-only Python script over
  machine-verifiable claims (npm and make commands, relative links, env-var names, both directions)
  before any model judges prose.
- `github/awesome-copilot` — the same `docs-sync-audit` skill inside a 370-entry `skills/` directory.
- `gurevich89/ai-docs-reviewer` — required doc topics declared in TOML, deterministic coverage scoring
  (missing, thin, stale by git mtime, broken links), a model called only where a topic already exists.
- `wshobson/agents`, skill `grounded-vault` — every compiled page carries `Fingerprint: git:<hash>` and a
  `Monitored:` file list, so staleness is one `git diff` and zero model calls.
- `deichrenner/driftcheck` — a pre-push hook that flags only clear factual errors against a diff, and
  suppresses what recent commits already fixed.
- `doc-detective/doc-detective` — the engine underneath the skills above.

**Methodologies and templates.** `anivar/developer-docs-framework` (27 rules, six pluggable guides);
`trogera/diataxisSkills` (scores a page against the four Diataxis types plus wayfinding, emits a split
plan); `thegooddocsproject/templates`; `GSA/plainlanguage.gov`; ISO 24495-1:2023;
`writethedocs/www`; Carroll's minimalist instruction and Information Mapping.

**Research and benchmarks — unconfirmed, reached by search only.** Each is a protocol we could run.

- `taylor-1953-cloze-procedure` — delete every nth word, have readers restore it from context, score the
  percentage. A reader-performance measurement, not a formula.
- `schriver-1989-evaluating-text-quality` — classifies text evaluation on a continuum from text-focused
  (formulas, expert opinion) to reader-focused (comprehension tests, protocol analysis), and argues the
  reader-focused end catches what the other end cannot. Our method sits at that end; this is its
  citation.
- `arxiv 2502.11150` — builds an eye-tracking ground truth for reading ease and shows formulas, ML
  readability systems and frontier models are all poor predictors of it.
- `allenai/qasper` — 5,049 questions written by practitioners **before** they read the paper. The same
  guard against post-hoc quiz-writing that our answer-key-before-readers rule exists for.
- `Anni-Zou/DocBench` — 229 PDFs, 1,102 QA pairs, including deliberately unanswerable questions.
- `explodinggradients/ragas` — Faithfulness decomposes an answer into atomic claims and checks each
  against its source; Answer Relevancy regenerates the question from the answer.
- Tree testing; task-based usability testing of documents; search and ticket-deflection telemetry.

Addresses for the entries above that are not repositories, because a name alone will not find them again:
Taylor 1953 at `doi.org/10.1177/107769905303000401`; Schriver 1989 at `ieeexplore.ieee.org/document/44536`;
the reading-ease paper at `arxiv.org/abs/2502.11150`; QASPER at `allenai.org/data/qasper`; ISO 24495-1 at
`iso.org/standard/78907.html`; tree testing at `optimalworkshop.com/product/tree-testing`; the
task-based protocol at `uxmatters.com/mt/archives/2020/05/how-to-test-the-usability-of-documents.php`;
the deflection metrics in Zendesk's self-service reporting guide.

**Linters and rule packs.** Already rejected as a mandatory pass; listed because four individual rules
catch real defects rather than style preferences: `markdownlint` MD051 (an internal anchor that matches
no heading), `remarkjs/remark-validate-links` (links and headings across a whole repository),
`lycheeverse/lychee` (external URLs resolve), `berelevant-ai/slopless`
`orthography:hidden-unicode-controls` (invisible control characters in prose). The rest are style:
`vale-cli/Google`, `vale-cli/Microsoft`, `vale-cli/proselint`, `vale-cli/write-good`,
`alphagov/gds-vale-styles`, `textlint-rule-preset-google`, `languagetool-org/languagetool` confusion
sets.

## How this survey was run, and where it is weak

Twelve agents in one workflow — four scouts on Sonnet, eight readers on Opus — plus one Codex
`gpt-6-astra` seat on the Anthropic skills. 966,000 agent tokens, 401 tool calls, fifteen minutes.

The Codex seat died on a Codex usage limit with its answer unwritten, after 34 commands. What survived
was its commentary, and it carried the survey's single most important finding: that `doc-coauthoring`
does test comprehension with a fresh reader. The Claude scout covering the same repository reported the
opposite — "no writing/docs skill, only doc-coauthoring for artifact generation, not measurement". One
model missed what the other found, which is the argument for a panel that does not share one model's
blind spots. The finding was then verified by hand rather than taken from either.

Weaknesses to fix in a later pass: eight of forty-one read; the research layer reached by search rather
than by primary source; every line reference at evidence level 2 with a single reader behind it.

The output guard fired once, on the `doc-detective/agent-tools` record, matching `bypass-permissions`.
Checked: it is a false positive on a CLI flag name quoted inside a description of that project's own test
harness. The real caveat stands — their harness runs Claude with permissions bypassed, and that is not a
thing to copy.
