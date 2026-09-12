# Prior art

Everyone writing documentation tooling prescribes. Almost nobody measures. This file records who does
which, so a later version of this plugin can compose what works instead of reinventing it, and so a
rejected approach is not proposed a second time.

Surveyed 2026-09-11 in three rounds. Round one: four scouts, eight deep readers, one Codex seat. Round
two: sixteen Claude agents and ten Codex seats, sent at everything round one left unopened plus the
research literature, the writing-craft literature, and the formatting of `.md` itself. Round three:
eleven Codex seats against the gaps a completeness critic proved, including the one question everything
else rests on — whether a model reader stands in for a human one. Together they opened well over two
hundred primary sources.

**Evidence discipline used here.** Every entry says what was *opened* against what was reached by search
only. Practices are marked **measured**, **argued**, or **asserted**, and one never stands in for
another. A line reference is a place to look, not a proven fact: round two showed five round-one
judgements to be wrong, all in the direction of dismissal, so treat a verdict without an opened file as a
guess. Licences are recorded wherever taking the text would be the point.

## The closest prior art is Anthropic's own skill

`anthropics/skills`, skill `doc-coauthoring`, Stage 3 "Reader Testing": predict five to ten questions a
reader would ask, hand each to a fresh sub-agent together with the document, summarise what the reader
got right and wrong, loop back to refinement. Verified directly at `skills/doc-coauthoring/SKILL.md`.
The fresh-reader test is not ours.

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

## What the field measures, and what it does not

Four censuses, each done by enumerating a whole population rather than sampling:

- `github/awesome-copilot`: 3,772 tree nodes, **848 entries**, every header screened, 144 bodies read,
  **141 about text**. Not one of the 141 reports a controlled comprehension gain. The census reconciles as
  141 included, 3 read and excluded, 704 never opened — the headers of all 848 were screened, the bodies
  of 144 were read, and the claim covers only those. GitHub's own curated collection.
- Seven Vale style packs, **~145 rule files**. Exactly **two** mechanisms recur across independently
  authored packs as genuine reader-facing defect checks: an undefined-acronym check (Google, Microsoft,
  GDS-via-18F) and an adjacent-doubled-word check (write-good, GDS-via-testthedocs). The other 130-odd
  rules, including entire packs branded as developer-documentation style, are voice, punctuation,
  terminology or register preference.
- `neeeophytee/agent-stylebooks`: 16 published house styles. The one source among them that was a scored
  instrument — the CDC Clear Communication Index, twenty questions with thresholds — was deliberately
  stripped of its scoring for licensing reasons (`PROVENANCE.md:44-45`), and the skill now forbids
  copying a checklist score into the output as proof (`skills/cdc-clear-communication/SKILL.md:72`).
- Production telemetry at GitHub, Algolia, Elastic and PostHog: real metric queries, readable in source.
  **No published action threshold for any instrument**, and no case study where a page changed and an
  effect was measured with a sample size.

Two published thresholds exist anywhere in this survey, and both come from regulators, not from software:
the EU readability guideline for medicine leaflets — **90% find the information, 90% of those understand
it, operationalised as 16 of 20 per question, results not aggregated across questions** — and the FDA
human-factors guidance — **at least 15 participants per distinct user population**, with the warning that
a correct verbal answer does not establish safe execution.

## Where this plugin sits, by someone else's map

Schriver 1989 classifies text evaluation on a continuum from text-focused (formulas, expert review) to
reader-focused (comprehension tests, protocol analysis), and splits reader-focused into **concurrent**
and **retrospective**. She holds that concurrent measures are the more reliable, and that retrospective
methods should be used in conjunction with them, not instead.

A post-hoc comprehension test is her retrospective node. That is where our audit sits — the weaker half
of the class we assumed we led. Worse, the diagnostic information our lie / placement / findability
taxonomy exists to reconstruct is what concurrent methods give away for free, and **we already collect
it and throw it away**: which files a reader opened, in what order, what it returned to. The read log is
concurrent data sitting unused in our own protocol.

ISO 24495-1 arrives at the same place from another direction. Of its four governing principles, the
fourth — *usable* — contains no writing guidance at all; the standard's position is that if the first
three are followed the document should be usable, so that clause discusses how to **evaluate** whether it
is. A quarter of the world plain-language standard is an evaluation clause, written by people with no
connection to us.

## Findings against this plugin's own claims

An adversarial Codex seat was given the whole of our evidence and told to refute, not to balance. Its
verdict: **none of our six conclusions survives as stated**; all six are weakened, none refuted.

**The headline number is not distinguishable from noise.** Three improvements and zero reversals over six
paired questions gives an exact two-sided McNemar **p = 0.25**. Our 3/6 → 6/6 clears skillsbench's
30-point noise floor at +50 points, and still cannot be told from chance at conventional thresholds. One
trial per question, and nothing we publish says so.

**"Asking a reader about clarity is worthless" is too strong.** Sauro and Dumas, CHI 2009, found
subjective difficulty ratings distinguished two applications with 26 participants performing five tasks
each. Our finding is three observations in which a model's self-report did not track correctness. Keep
the rule — it is cheap and the signal is unreliable — but state it at the size of its evidence. Anthropic's
own guidance was checked for a conflict and has none: nowhere does it ask a measured reader to report
whether a text felt clear.

**We have no control for prior knowledge, and two benchmarks say the control is large.** Code-QA-Bench's
closed-book arm — question only, no repository — scores **0.56 to 0.68** on tasks designed to require
documentation, and its authors treat a high closed-book score as contamination. SWD-Bench's no-document
arm sits at chance (48.68 balanced accuracy, MCC −3.43). Both ran the control. We did not.

**Our questions are shown to the writers and then reused as the regression test.** That measures repair
of those failures, not performance on unseen reader decisions. Anthropic's evaluation guidance asks for
volume and a held-out set; its coding guidance says to solve the general problem rather than hardcode the
test inputs. Two independent routes to the same demand: hidden questions.

**The taxonomy has a hole and a loaded word.** A question whose answer is nowhere in the documentation is
neither a lie, nor a placement error, nor a findability failure — there is no fourth category. And "lie"
imputes intent that a wrong sentence does not establish; the benchmarks call it unsupported or
contradicted.

Four more threats worth fixing in the text of the skills: questions authored by the same party that wrote
the repair; the answer key written by the same model that later judged; control questions selected after
the baseline was scored, which `measure.md` does not disclose; and no arm that re-runs the unchanged
document, so repair effect is not separated from run-to-run variation.

The cheapest decisive experiment, costed by the same seat: three writers, two judges, ten hidden
questions, three fresh readers per question per version — **60 reader calls**, of which 30 are additional
to what we spend now.

## Is a model reader a valid stand-in? The honest answer

A seat was sent at this question alone, because every number the plugin has rests on it. Its verdict, in
its own words: **terse currently measures model answerability, and its numbers are not valid evidence of
human improvement yet.** The literature does not establish that a calibrated proxy is impossible — it
supplies working narrow proxies and specific documented failures. Nobody has validated a cheap model
navigating repository Markdown and predicting the benefit of a documentation edit.

**The attack on the foundation is weaker than it was handed to us.** Harding et al., "AI language models
cannot replace human research participants", is an opinion column: **N = 0, no measurement**. Its argument
— that models are exemplary text processors by construction and so will not reveal human comprehension
difficulty — justifies refusing substitution on the evidence of fluent output. It is not an impossibility
theorem, and two measured studies contradict its categorical form: across 456 sentence–question pairs
with ten native readers each (4,560 human responses), humans and models showed the same garden-path,
plausibility and verb-type effects, and larger models tracked item difficulty better.

**The real threats are narrower and have numbers.**

- **Discrimination between nearby versions is where proxies fail.** Model–human agreement on average
  ratings reached *r* = .792 while agreement on **within-pair differences** was *r* = .312, and the best
  F1 for reproducing the human pair-selection decision was **.55**. Comparing a document before and after
  a rewrite is exactly a nearby-version discrimination task.
- **Floor and ceiling are real and were observed.** Across 31 models and seven structure types, models
  sometimes failed to separate a hard item from an easy one because both were too hard, or both too easy;
  the useful capacity range differed per construction. A zero delta can be the instrument, not the text.
  "Use a cheap model" is an economy argument, never a validity argument.
- **Our own instrument is now saturated.** The 3/6 baseline was not a ceiling, but 6/6 leaves no upward
  range on those six items. A second repair cannot register.
- **Model task performance predicts human difficulty weakly.** Difficulty estimated from models' actual
  correctness correlated with human difficulty at Spearman **ρ = .309**, with **35.6%** of items solved by
  over 90% of models. And a novice persona is not novice knowledge: instructing a model to answer as a
  weak student moved accuracy from **.958 to .957** on the same 793 items.
- **A bigger model is not a better proxy.** Within three model families, larger variants' surprisal fitted
  human reading times *worse*. Select a reader by held-out predictive validity, not by tier.
- **Fresh calls are not sampled humans.** Demographic prompting did not increase response diversity in the
  one experiment that tested it; temperature and persona variation cannot be counted as human variance.

**One belief of ours is contradicted in the other direction.** A model's readability rating does carry
human information: GPT-4 Turbo's ratings correlated with human ratings at *r* = .76 over 4,724 excerpts.
That does not restore the rejected rating gate — comprehension and navigation were not measured, and the
rating is the outcome that correlates, not the reading — but "a model's own rating never carries human
information" is too strong and is corrected here.

**The complexity floor is softer than the critic reported.** Simplified English improved comprehension and
information-location accuracy on one procedure of four and did nothing on the others; the authors
identified the harder document's complexity **after** seeing the differential result, not as a planned
manipulation, and say the threshold is unknown. So "a README is an easy document and our instrument
cannot register a difference" is not established. The corroborating field study was never opened; it is
known only through the first study's summary of it.

**What would make the ruler valid**, as seven checks with costs attached. None has been run.

1. **Document dependence** — full docs, no docs, and the answer-bearing passage removed, plus a synthetic
   identifier counterfactual. Answers must follow the evidence and become unsupported when it goes. Two or
   three extra calls per sampled question.
2. **A/A repeatability** — the unchanged document under blinded version labels, repeated fresh contexts,
   fixed settings. Six questions × two labels × three repeats = 36 calls. Until this runs, "the score
   fell" cannot be told from noise.
3. **Sensitivity and saturation** — inject and repair a false claim, an ambiguous condition and a broken
   path, plus one harmless edit. If every variant scores 100% or every variant fails, the instrument is
   uninformative on that document.
4. **Human edit effects** — counterbalanced original and revised, real readers starting at the real entry
   page, recording answer, time and navigation; compare paired deltas and sign reversals, not pooled
   correlation. 24 readers × 15 minutes = six participant-hours for a falsification pilot.
5. **Population and interface** — novices and experienced readers, and language groups, examined
   separately. File-open counts, tokens and latency each need their own validation before standing in for
   human effort.
6. **Held-out transfer** — questions hidden from writers, scoring and model settings frozen, evaluated on
   a second repository; repair of exposed failures reported separately from unseen-task gains.
7. **Uncertainty** — a meaningful human gain predeclared, intervals that respect shared participants,
   questions and repositories. Non-significance is not equivalence, and more model samples do not create
   more human participants or more documents.

Until at least the first three run, the honest scope of every number in this plugin is: **a model answered
differently after the text changed.**

## What round three found

Ten more seats, sent at the gaps a completeness critic proved. Each opened primary sources.

**Placement: the answer is repetition, not relocation.** A seat read all 71 pages of NASA CR-177549 to
settle whether critical items are deliberately placed late. They are not: the report says such placement
was *probably* done that way, and the repair it actually anchors to accidents is **set or check early,
then recheck immediately before use**. Recovery buffers outrank adjacency; critical items early override
both of its flow rules. So a true sentence read where it misleads is sometimes repaired by putting it in
both places, which our current remedy — move it to the decision it belongs to — does not allow.
DOE-STD-1029 reaches the same shape from the other end: a local warning goes immediately before its
action **and on the same page**, while a global hazard is stated once and repeated locally; a
prerequisite goes before manipulation *except* a check valid only immediately before use, which belongs
in the body.

**The verification-response rule, verified at its source.** A step that confirms something must make the
reader state the observed value — "ALTIMETERS 30.10" — never an acknowledgement word like "checked",
"set" or "completed", and the reader should touch or point at the object. The accident behind it: Delta
1141 produced nominally correct flap callouts in under one second while the flaps and slats remained
unset. This transfers to any written check, and our truth pass has nothing like it.

**Read the evidence class before borrowing from this literature.** The NASA report's own base is 42 crews
over 72 legs and about 140 hours at one carrier, 15 pilot interviews across seven carriers, and an
unpublished tabulation of 20 airlines. Its 12,000-report ICAO collection and the ASRS narratives were
deliberately *not* analysed statistically, and the ASRS examples are declared unrepresentative. Its
authors call their sixteen guidelines proposals that can conflict with one another, not specifications.
DOE-STD-1029 measures nothing at all, is marked archived and cancelled, and calls itself a model guide;
its one quantitative claim — a quarter of human-performance events attributed to deficient warnings —
cites no sample. NUREG-0899 could not be opened.

**One rule from that world contradicts a rule we were about to adopt.** DOE §4.1[8] says to consider
*combining* multiple verbs that share one object, keeping only actions assigned to different people
separate. A blanket one-instruction-per-sentence rule is not what procedure writing settled on.

**The taxonomy's missing bucket has a measured size.** Aghajani et al. mined 805,939 candidates from
issues, pull requests, mailing lists and Stack Overflow, classified 878 by hand and labelled 1,548
sentences. Within their 485 *What* artifacts: **completeness 268, up-to-dateness 190, correctness 72**.
The largest measured class of documentation defect is *the answer is not there*, and our three causes have
no bucket for it. Their labellers disagreed on **92.27%** of items at first pass (765 of 829) before
adjudication, which is the best available warning about how hard this classification is. A 2020
follow-up of 146 practitioners ranks the reader-facing issues: clarity 88%, findability 65%, information
organisation 49%; missing new-feature documentation 69%, missing install and release documentation 68%.
Their Process and Tool categories mostly affect writers, so mining every issue would dilute a reader test.

**Structure dominates wording, by a factor we did not expect.** In Groeben's 1982 experiment across 18
classes, **content structure explained 86% of the explained variance in comprehensibility and linguistic
simplicity 3.5%**; retention depended only on structure. The same seat corrected a claim we had been
handed: "maximum comprehensibility lowers retention" is too strong — the inverse-U belonged to a
*combined* retention-plus-curiosity criterion, and interest alone had no meaningful effect. If the 86/3.5
split transfers at all, effort spent on sentences is effort spent on the small term.

**A second reader instrument exists and its evidence is thin.** Göpferich's reverbalisation asks the
reader to *produce* an optimised paraphrase while thinking aloud, then labels each changed passage
improvement, deterioration or neither, and aggregates by how many readers hit it. It keeps the ban on
opinion. But the measured demonstration is **n = 5**, all translation students or lecturers, and the
author calls the sample unrepresentative. The Karlsruhe framework around it is an expert checklist with
six dimensions and no reader study; the Hamburg model's four dimensions have only qualitative weights.

**Who is allowed to validate.** Under Inclusion Europe's standard, whose first rule is to ask people with
intellectual disabilities to test the text, our result is an internal pilot rather than a validation.
PEMAT splits 24 items into **17 understandability and 7 actionability** — and actionability, whether a
reader could *act*, is a dimension our judging sheet does not have. The sharpest number in that group:
Lee et al. **failed three calibration rounds** before averaging several human raters reached acceptable
reliability. Two uncalibrated judges are two opinions.

**Language is not a sufficient reader label.** Kim, Crossley and Skalicky measured 48 Spanish-L1 learners
with a real proficiency instrument — Gates-MacGinitie 7 to 34, TOEFL 420 to 597 — and found higher L2
reading proficiency predicted faster processing and *interacted* with text properties; simplified passages
were faster than authentic ones. The MECO L2 corpus, 543 readers across 12 first languages, attributes
**23%** of L2 comprehension-accuracy variance to English component skills together with motivation and IQ.
Proficiency and first-language reading ability are separate variables, and a model instructed to
role-play a non-native reader measures neither.

**At the sentence, nothing yet earns a gate.** Centre embedding is over-represented in hard text — 0.729
against 0.272 clauses per sentence, odds ratio 2.56 — and a four-feature rewrite moved comprehension from
67.7% to 73.5% and recall from 35.3% to 42.4%. But that study computed no dependency-distance predictor
and calls its isolated centre-embedding effect underpowered, and the eye-tracking benchmark finds
integration cost and embedding depth mostly non-significant. Per-word surprisal from a small model was
the best predictor there, and it is model inference rather than a deterministic check. The three-noun cap
that ASD-STE100 is said to impose has no opened source behind it.

**Tree testing is precise and its numbers are weak.** Success is the share choosing a predeclared correct
destination; directness is reaching it without backtracking; targets must be leaf nodes. The originating
paper offers no stability data, "at least 30 participants" is asserted rather than demonstrated, and the
one published case — success rising from 31% to 67% — reports no sample size. It tests a heading tree
before any prose exists, which is a thing our audit cannot do at all.

**Typed units do not solve placement.** S1000D encodes an information type in each data module's own
identifier and DITA constrains concept, task and reference structurally — but both type *modules and
markup, never sentences*, and a validator can check that a unit declares a type, not that its prose is
actually of that type. Neither supplies a measured case that typed units help a reader. The one thing
worth taking is the declared-type field, which makes a claimed type mechanically inspectable.

## What is worth taking

Ranked within each group by what it buys. Every line names where it lives and what it costs. The numbers
are labels for reference; ranking runs within a group, not across the whole list.

This is the curated forty. All 271 practices the survey returned are in
[practices-full.md](practices-full.md), unedited and unranked, because a practice that reads as taste
today is sometimes the one that turns out to carry a defect.

### The answer key

1. **Generate the answer first, then derive the question from it.** Take the source of truth, produce a
   verified answer with cited evidence, and write the question afterwards. Code-QA-Bench,
   `paper_concise.tex:183-184`. Argued, with a falsifiable prediction attached. This inverts our order and
   costs nothing.
2. **An oracle before scoring.** A run with full access must score 100% first; if it does not, abort and
   fix the question rather than reporting a document failure.
   `skillsbench .agents/skills/task-review/scripts/run_experiments.sh:96-101`. Cheap, and it guards the
   step the whole method rests on.
3. **Audit the key and publish its error rate.** QASPER sampled its own keyed items and reported
   **207 of 273 (75.8%)** individually correct. `qasper-src/sections/analysis.tex:61`. Measured. A key
   nobody audited is a key nobody has reason to trust.
4. **Compute a human lower bound on your own instrument.** QASPER scored each reference answer against
   the others to get 60.9 Answer-F1 before reading any model score. `baselines.tex:15`. Without it a
   model score has no ceiling to be read against.
5. **Require the key to cite concrete loci and validate them.** Key file paths plus at least three
   code-evidence items naming file and function, with the paths checked against the filesystem.
   Code-QA-Bench `paper_concise.tex:290-291`. Implemented there as an automated gate.
6. **Audit the key for source leakage** before use: hand each key claim and the source of truth to an
   auditor that must label it derivable or not. Same paper, `:293-301`.
7. **Forbid the question from naming file paths or versions**, so the reader cannot shortcut the answer
   out of the question. SWD-Bench `3_Method.tex:74`.
8. **Split question-writing from answering, and show the question-writer only the entry surface.** QASPER
   showed its question writers the title and abstract alone. `dataset.tex:10,18`.

### The readers

9. **A no-document control arm, always, reported beside the score.** SWD-Bench `5_Experimental_Results`;
   skillsbench `run_experiments.sh:103-106`. Measured in both. It doubles seats per question, which
   collides with the standing rule against large fan-outs — so run it once per audit, not per rewrite.
10. **A clean room for the reader seat.** `--setting-sources ""`, `--disallowedTools
    Bash,Read,Write,Edit,Glob,Grep,WebFetch,WebSearch`, `cwd=/tmp`, effort pinned and recorded in every
    raw file, and a refusal to compare runs recorded at different effort levels.
    `AminBlg/SimpleEnglish evals/run_bench.py:47-57`. Our `measure.md` states these rights as prose; this
    is the same rights as flags, and strictly better.
11. **Check that the score is reader-independent.** Run the audit with two different reader models and
    require the *ranking* to hold, not the absolute numbers. SWD-Bench `5_Experimental_Results`. Measured.
12. **Vary the reading budget.** Fixed token budgets simulate a skimming reader against a thorough one;
    SWD-Bench reports the curve from 1024 to 2048. `4_Evaluation.tex`.
13. **Plant unanswerable questions, about one in ten**, and score a confident answer as a failure.
    DocBench `neurips_data_2024.tex:295-297`. Measured and discriminative. This is also the missing fourth
    category of our taxonomy, arriving as an instrument.
14. **Scramble identifiers so names cannot carry the answer.** Apple ToolSandbox scrambles tool and
    argument names to force reliance on the documentation. Cheap, and it isolates what the text does.
15. **Score against multiple reference answers, take the max, and credit a correct "the document does not
    say".** QASPER's evaluator scores empty prediction against empty gold as 1.0.
    `qasper_evaluator.py:51-53,114-126`.
16. **Paraphrase testing as a second instrument.** Split the document into predeclared bits, send one
    fresh reader through them in order, and record what they can restate. plainlanguage.gov's own test
    guidance specifies six to nine one-on-one interviews; Jarrett and Redish give the protocol. It
    measures something the answer-key questions cannot.
17. **Cloze as a ranking instrument between two versions of the same content.** Taylor 1953: delete by a
    mechanical rule, never by judging which words matter, and score exact matches only.
18. **Tree testing, which measures findability before any prose exists.** Give a participant the heading
    tree with no body text and a realistic task, and score success and directness separately — whether
    they arrived, and whether they went straight there. Spencer 2003 originated it; Optimal Workshop's
    method adds the leaf-nodes-only rule. It catches a wrong branch that a reader walking from the entry
    file cannot distinguish from a slow reader. Round two found this and the first draft of this file lost
    it.

### The score and what it means

19. **Report a rewrite's effect as a four-tuple** — answer accuracy, time to answer, error or rework
    rate, reader preference — not as one number. Kimble 1996 surveys 25 independent studies in exactly
    these units; his Veterans Affairs letter moved readers who failed to understand it from **56% to
    11%**, with reading time 8 minutes to 6. Measured, on real populations, and the single strongest
    evidence in this survey that rewriting works at all.
20. **Add a structure-recall measure.** After reading, ask where the reader would go for a given decision.
    Morkes and Nielsen 1997, n=51, with significance reported.
21. **Mechanical failure classification from the read log** rather than from judgement: no document file
    opened at all means "never found"; the router read and the linked detail never opened is computed as
    `top_level_only = bool(skill_files) and not sub_files`.
    `skillsbench references/audit-skillsbench.md:7-62`. This is the concurrent data Schriver says is the
    reliable kind, and we already have it.
22. **Treat a regression as a first-class outcome with a quoted cause.** A delta of −10 points or worse is
    `hurt` and must carry a `misled_quote`: the exact line that misled the reader. Same file, `:79-87`.
23. **A declared noise floor and trial count on every delta.** Same file, `:114-117`.
24. **Do not score prose quality inside a correctness audit.** Code-QA-Bench dropped clarity and reasoning
    as axes deliberately. `paper_concise.tex:378-379`. Argued, and it agrees with our own clarity rule.
25. **Validate the document metric against a downstream task** the owner cares about, and check the
    ranking survives. SWD-Bench used issue-solving rate on 57 SWE-Bench Verified instances.

### The repair

26. **Repair coherence at identified inference gaps only** — places where a sentence introduces a term
    with no antecedent — rather than rewriting for flow. Britton & Gulgoz 1991, two experiments, 170
    undergraduates and 125 Air Force recruits. Measured. Abstracts only; the papers were not opened.
27. **Condition the repair on the reader's prior knowledge.** McNamara, Kintsch, Songer & Kintsch 1996
    report the reverse cohesion effect: for readers with domain knowledge, more explicitness can *lower*
    deep understanding. With Kalyuga's expertise-reversal effect this is two independent warnings that a
    single reader profile can make the text worse for one population while improving it for another.
28. **A mechanical preservation gate on every rewrite.** A before/after diff that errors when the rewrite
    touched fenced code, frontmatter, a blockquote, a table cell, inline code, a URL, a path, or heading
    structure, and warns on a dropped figure or more than 40% word shrink.
    `conorbronsdon/avoid-ai-writing detector/validate.js:165-319`. No model in the loop. Their carve-outs
    matter: a validator that fires on its own skill's instructions gets switched off within a day.
29. **A fact-preservation map.** Inventory every fact, number, qualification and conditional before the
    rewrite; map each to its place afterwards; compare numbers independently from prose.
    `agent-stylebooks skills/sec-plain-english/SKILL.md:51-55`. A precondition every candidate must satisfy
    before judging, not a row on the sheet.
30. **The first-seven-words diagnosis.** Extract the opening words of every sentence into a column and
    read only that column; if it is a list of unrelated new terms rather than a consistent cast of
    characters, the passage has no topic string. Gopen & Swan 1990 (opened in full); Williams' seven-word
    test is the same move. Argued with worked demonstrations, measured by neither.
31. **Treat a structural rewrite as a content audit.** Wherever old information cannot be placed because
    none exists, a missing explanation has been found, not a wording problem. Gopen & Swan, the chemistry
    example.
32. **Classify every section by what dictated its order** — the reader's decisions, the writer's discovery
    sequence, or the source material's own layout — and count the sentences whose grammatical subject is
    the project, the authors or the development process rather than the reader.
    Flower 1979, *College English* 41(1), pp. 19-37, at pp. 25-28. **Attribution correction:** writer-based
    and reader-based prose is Linda Flower alone in 1979, not Flower & Hayes 1981, which mentions the term
    once in passing at p. 371. The brief that commissioned this survey had it wrong and the error is
    recorded here so it is not repeated. Her related move, the code-word pass — the writer circles every
    expression that stands for a large body of experience for them and conveys a vague direction to anyone
    else — is the curse of knowledge with a procedure attached.
33. **Name promotional tone as its own defect class.** Stripping promotional language from otherwise
    identical content was worth **+27% measured usability on its own** — the one factor Morkes and Nielsen
    isolated cleanly.
34. **Write error recovery at the point of the error.** Inventory the errors real users actually make,
    then place detection, diagnosis and correction where the error happens. Carroll's minimalist
    instruction, validated on learning time and subtasks completed (Experiment 1, n=19). The strongest
    measured evidence in the craft literature.
35. **Get the reader acting within the first page or two**, and keep sections short enough to finish with
    a defined start and end state. Same source.
36. **Label every chunk, and label by function as well as content** — Definition, Example, Prerequisites —
    so a reader scanning only labels gets the gist. Horn's Information Mapping. Its own author reports the
    evidence as weak; take the labelling discipline, not the 7±2 limit, which he also disowns.
37. **Accept bounded repetition.** Write the Docs' ARID: refusing all repetition in documentation forces
    readers to chase cross-references. Independent agreement with our safeguard that repetition at a
    decision point is not redundancy. They add: minimise cross-references, because most readers skip them.

### The truth pass

38. **Run the claim check in both directions.** Document claims verified against the code give precision —
    lies. Code behaviours verified against the document give recall — omissions. RAGAS
    `factual_correctness.py:256-296`, implemented and parameterised. We only run the first direction, which
    is why a missing answer has no category.
39. **Decompose into standalone claims with pronouns forbidden**, so each claim can be checked alone.
    RAGAS `faithfulness.py:37,46`.
40. **Make the judge emit claim, reason, verdict in that field order**, so the reason is generated before
    the verdict rather than after it. `faithfulness.py:58-61`. The same move A10 named as the single
    technique most worth adopting: reason against the rubric before scoring.
41. **Teach the judge the three ways a claim fails**, one example each: contradicted by the source,
    plausible but absent, unrelated. `faithfulness.py:77-130`.
42. **Abstain rather than score zero** when decomposition produces nothing to check.
    `faithfulness.py:182-194`.
43. **A deterministic verbatim check before spending a judge call:** extract every quoted span of three or
    more words and match it against the source. `quoted_spans.py:32-56`. Zero model calls.
44. **A deterministic lie detector from identifiers.** Extract every repository-specific identifier the
    document names — class, function, method, flag, path — and check each exists.
    `docagent_truthfulness.py:40-59,121-161`. Zero model calls, and it catches the most common false claim
    in software documentation.
45. **Derive the required-content checklist from the code's own shape**, not from a documentation
    standard: if the function takes parameters, parameters must be documented.
    `docagent_eval_README.md:45-62`.
46. **An execution witness for command-shaped claims.** Run each command from the `.md` against the real
    build; the witness is the exit code plus an output substring.
    `doc-detective src/skills/doc-detective-doc-testing/SKILL.md:139-166`. Level 3 of our truth pass made
    real, for the subset of claims that have an executable witness. Elastic does the same and warns that
    substitutions can make a snippet lie; their own snippet testing is currently disabled during a
    migration, which is the caution that matters.
47. **Mine the repository's history for stale documentation** before running any model: find commits that
    changed a documented behaviour and check whether the documentation moved with them. Free, deterministic
    labels, from the comment-code-inconsistency task framing.

### Doc-versus-code drift, as five projects actually build it

These five were round one's "nearest unexplored neighbours". Round two opened all five, and they turned
out to hold the most directly applicable engineering in the survey.

48. **Split the audit into two layers and say so in the instructions.** A script checks only claims with a
    definite answer — does this command exist, does this link resolve, is this name real — and the model
    is spent only on what the script cannot settle.
    `specialone0007/review-skills skills/docs-sync-audit/scripts/docs_drift.py:11-23`. Its sibling states
    the rule as a gate: `if r.status == "missing": continue` — absence is settled by search, quality is
    the model's job. `gurevich89/ai-docs-reviewer src/ai_docs_reviewer/judge.py:39-41`.
49. **Treat text inside the repository under review as evidence, never as instruction.** If a README, a
    comment, a commit message or a manifest tries to direct the audit, that is a finding, not an order.
    `review-skills skills/docs-sync-audit/SKILL.md:23`. Our skills say nothing about this, and an auditing
    agent reading an untrusted tree is exactly the shape that needs it.
50. **Citation anchoring as a single testable predicate:** the line you cite must literally contain the
    thing you name — not the blank line above it, not the decorator, not a nearby line.
    `review-skills SKILL.md:90-92`.
51. **Rewrite a prohibition the model ignores as a positive show-your-work requirement.** Not "do not state
    unverified numbers" but "every number in the report appears under a Checks section with the command
    that produced it". `review-skills SKILL.md:93`, and the measurement that forced the rewrite is in the
    same repository.
52. **Require every negative claim to be checked in every plausible location before it is written**, and
    name the locations. Undocumented, unused, missing, nothing-reads-this — a negative from a single
    search is not a negative. `review-skills SKILL.md:94`.
53. **A third verdict beyond present and absent:** documented, read by code, but only inside a module
    nothing imports. `review-skills scripts/docs_drift.py:356-379`.
54. **Report what is in good shape, specifically, beside the defects** — naming the claims that checked out
    and why. `review-skills examples/docs-sync-audit.md:53-62`. An audit that returns only defects trains
    its reader to distrust the whole document.
55. **Exempt a document that discloses its own pin.** An example or report that names the commit it was
    written against, in its own header, is a historical snapshot and not drift.
    `review-skills examples/docs-sync-audit.md:9`.
56. **A closed whitelist of reportable defect types plus an explicit do-not-report list**, in place of a
    quality rubric. `deichrenner/driftcheck src/config.rs:9-23`. Its own prompt contains the cautionary
    error too: one sentence says to skip recently-modified docs and the next says to flag them anyway
    (`:19` against `:21`).
57. **Split retrieval from judgement into two model calls and cache the first**, keyed on the input hash,
    with a hard context budget on the retrieved excerpts and stated merge rules — dedupe by `file:line`,
    merge chunks within five lines with an ellipsis marker.
    `driftcheck src/analyzer.rs:52-107` and `:124-151`.
58. **Derive the search terms from the code and then grep the documentation for them**, enumerating the
    term categories in the prompt so the model does not free-associate: function names, class names, API
    endpoints, flags, paths. `driftcheck src/config.rs:34-36`.
59. **Any check that blocks must advertise its own bypass in the same message**, and ship more than one
    off-switch. `driftcheck src/main.rs:267-270`.
60. **Stamp each document with the commit it was written against and the code paths it describes** —
    `Fingerprint: git:5b237fa`, `Monitored: src/auth/jwt.ts, package.json` — so staleness is one `git diff`
    and zero model calls. `wshobson/agents plugins/documentation-standards/skills/grounded-vault/SKILL.md:41-53`.
61. **Every number, date and direct quotation must appear verbatim in its named source**, checked by exact
    token search rather than by rereading — and the result is published as "fidelity suspects, not
    verdicts", never as an auto-fix or a commit gate. Same skill, `:55-63`.
62. **Correct by superseding, not deleting.** A page contradicted by a newer source gets `Status: Disputed`;
    a page whose subject moved on gets `Status: Outdated` with a one-line reason. Same skill, `:19,:31`.
63. **Never ground a compiled page on another compiled page.** Compiled pages cite immutable sources only.
    Same family, `llm-wiki-loop wiki-protocol.md`.
64. **A placement defect is a mode switch.** A page is broken when it forces the reader to be in two
    different modes at once — learning and doing, or deciding and executing. This is the first definition
    of our placement cause that is not an example.
    `trogera/diataxisSkills references/reasoning.md:110-121`.
65. **Require two independent signals before a classifier assigns a label**, and let confidence fall out of
    the signal count rather than being judged separately. `trogera references/page-types.md:24-36`.
66. **Ship every diagnostic signal with its known false positives attached.** Declarative sentences outside
    steps are a mixing signal; declarative step results inside steps are not.
    `trogera references/page-types.md:40-59`.
67. **Forbid the repair pass from inventing content.** A split or repair plan redistributes text that
    already exists; if a gap is found, name the gap, do not fill it.
    `trogera .skills/docs-reorg/SKILL.md:167`.
68. **Give the classifier a licensed escape hatch:** when nothing reaches threshold, output `unclassifiable`
    and name the boundary that is unclear. `trogera SKILL.md:54-57`.
69. **Sequence a restructuring so the path-changing step comes last:** rewrite and add in place, validate,
     and only then move files and update links. `trogera case-study/docs-reorg-systemA.md:85-134`.
70. **Malformed model output degrades to "no verdict", never to a pass and never to a crash.** Strip
     fences, take the outermost braces, and on failure record the raw text with the score set to null.
     `gurevich89 src/ai_docs_reviewer/judge.py:27-34,51-52`.
71. **Persist the requirement set as a versioned, diffable file beside the docs**, with a defaults block
     and per-item overrides. `gurevich89 examples/docs-topics.toml:1-37`. For us this is the strongest
     borrow in the group: our answer key is derived fresh from code each run, so two runs are not
     comparable and a regression is invisible. The file must stay regenerable from code, or it becomes the
     stale artifact we exist to catch.
72. **Render the audit as a work list, not a grade**: one section per failing item, each gap on its own
     line with its `file#heading` and line number. `gurevich89 src/ai_docs_reviewer/report.py:23-38`.
73. **Derive freshness from `git log -1 --format=%ct -- <path>`**, falling back to filesystem mtime, and
     set `fetch-depth: 0` in CI — a fresh checkout gives every file the same mtime.
     `gurevich89 src/ai_docs_reviewer/loader.py:15-21`.
74. **End the repair by re-running the measurement and requiring the gate to go green** before the change
     is proposed to a human. `gurevich89 .claude/skills/docs-gap-fill/SKILL.md:13`. Independent agreement
     with our own Step 6.
75. **Do not trust a small fixture to validate an audit skill.** A 15-file fixture has no room for line
     numbers to drift, so citation errors are invisible in it; run a trial on a real repository and freeze
     the helper's JSON output against a deliberately defective fixture as a committed snapshot.
     `review-skills CONTRIBUTING.md:101` and `evals/snapshots/docs_drift.json`.

### The bake-off and its judges

76. **Two readings as the proof of a defect.** A finding counts only if it names the intended reading and
    the plausible wrong reading an agent could act on. `Battle-Creek-LLC/tamos agents/ambiguity-attacker.md:19-24`.
77. **Severity by consequence.** "If you cannot name the wrong output a finding produces, it is not high."
    Only blocking-and-high fails; an individual validator's FAIL cannot override that threshold.
    `tamos commands/tamos-validate.md:16-65`.
78. **Permit "no findings" explicitly**, and require the strongest near-miss considered.
    `tamos agents/contradiction-hunter.md:21-23`. Without it, a panel invents work.
79. **A judge from a different provider family than whatever wrote the text or the key**, stated in the
    report. Code-QA-Bench measured the mitigation. Our all-Claude default fails this.
80. **Calibrate the judge against humans.** ARES asks for at least 50 labelled triples, then uses
    prediction-powered inference: subtract the mean judge-minus-human error and build a confidence interval
    for the aggregate. `ares/.../ppi.py:77-86`. This is how cheap readers become usable despite the false
    consensus finding below.
81. **Give the judge the reference evidence text, not only the reference answer**, and tell it to consult
    the evidence only when the comparison is unclear. DocBench `docbench_evaluate.py:94-96`; **98% human
    agreement** reported for the prompt.
82. **A judge ladder: tracked, then soft `atLeast`, then hard `gate`**, with a deterministic assertion
    preferred wherever one exists and a failure receipt printing prompt, criteria, response and rationale.
    `vercel/eve docs/evals/judge.mdx:6,:31-39,:66-80`.
83. **Bind a judge's verdict to the sha256 of the text it read.**
    `riekelt plugins/technical-writer/agents/prose-reviewer.md:15`.
84. **Several independent readers per question, keeping the distribution.** A measured human study of legal
    interpretation — 5,096 trials, 364 participants, data and code public — finds readers believe they
    agree far more than they do. One reader per question cannot see disagreement at all.

### Deterministic checks that cost no reader

85. **MD051** — a same-file anchor link whose fragment matches no heading. Zero network, no flake.
    `markdownlint doc/md051.md:97-104`. Single-document scope by design.
86. **MD052** — an undefined reference label renders as visible brackets rather than a link.
    `doc/md052.md:30-33`. A rendering-visible defect, not a style opinion.
87. **remark-validate-links** — repo-wide cross-file links and heading fragments, offline. Use the CLI;
    the programmatic API alone does not do the cross-file resolution.
88. **lychee** for external URLs only, with a token, explicit accepted codes and retries — and never as
    ground truth. Force `--method get` if fragment accuracy matters; a successful HEAD hides a dead
    fragment.
89. **The undefined-acronym check** — an acronym used but never spelled out anywhere in the document. The
    only style-pack rule reinvented independently by three organisations.
90. **The adjacent-doubled-word check** — "the the". The other one.
91. **Invisible Unicode control characters** — a hardcoded list of 17 code points, flagged unconditionally,
    no context and no threshold. `slopless src/rules/orthography/hidden-unicode-controls.ts:5-21`.
92. **Leftover draft markers** — TODO, FIXME, XXX — run against parsed AST text nodes with Link, Image and
    BlockQuote children skipped, so the rule cannot fire inside a quotation.
    `textlint-rule-no-todo src/no-todo.js:16-18`.
93. **Internal inconsistency where no single correct form exists.** Vale's `consistency` check takes pairs
    of mutually exclusive regexes and alerts when both appear in one file; it designates neither as
    correct. `vale-cli/vale internal/check/consistency.go:19-118`. Exactly one shipped pack instantiates
    it: `proselint/Spelling.yml` v0.3.4, twelve pairs — established by scanning all 21 registered release
    archives and 1,157 YAML files. ГОСТ Р 2.105-2019 requires the same thing normatively: no synonyms for
    one concept, and mandatory wording distinguished from permissive.
94. **Article-agreement as literal string pairs** keyed to the noun — "a npm" to "an npm", "an URL" to
    "a URL" — rather than a phonetic rule. `textlint-rule-terminology terms.jsonc`.
95. **A redundant-notation rule shape**: a symbol and its spelled-out unit for the same value, as in
    "$5 dollars". `proselint checks/misc/currency.py`. Generalises past currency.
96. **Confusable real words** — their/there, accept/except, adapting/adopting — via LanguageTool's hosted
    API rather than rebuilding its n-gram model. High precision per pair, safe to auto-flag.
97. **Recompute every printed number from committed raw data in CI**, and fail on mismatch.
    `SimpleEnglish evals/check_numbers.py:34,:88,:102,:116`.
98. **Assert every relative link resolves and every count stated in prose matches the count on disk.**
    `riekelt test/repository.test.cjs:89-98,:100-112`. The narrow exception to our rejection of CI gates:
    these check claims, not taste.
99. **Single-source blocks with a sync check.** `ifiokjr/mdt` (Unlicense) marks provider blocks and
    consumers, renders, and its `check` compares actual against rendered, returning stale entries with
    locations. Prevents copy drift by construction rather than by detection.

### Our own evals, still unbuilt

100. **A with-skill / without-skill benchmark harness** that runs a task in both configurations several
    times and reports mean, standard deviation and delta. `anthropics/skills skill-creator
    scripts/aggregate_benchmark.py`. Our 2×5 run improvised exactly this.
101. **A grader that also critiques its own assertions** — "a passing grade on a weak assertion is worse
    than useless" — and separately extracts implicit claims from the output and verifies them.
    `skill-creator agents/grader.md`.
102. **A prompt-set eval harness**: fixed prompts, a fresh model each, assertions over the reply, a pass
    counter, non-zero exit when the count drops. `doc-detective scripts/test-skill.sh:385-675`. Do not
    copy their assertions — grep-for-a-keyword scoring is weaker than an answer key — and note their
    harness runs Claude with permissions bypassed, which is not a thing to copy.
103. **A hash-only corpus with provenance**: a manifest recording what each document is, its source,
    licence, register, word count and sha256, never the text; verification fails loudly on mismatch.
    `avoid-ai-writing corpus/manifest.json`. Our 2026-09-10 result is pinned to no document version at all.
104. **Lift as a razor on our own rules.** A rule earns its place only by separating the two classes;
    below 1.0 it fires more on the class you did not intend. `avoid-ai-writing scripts/fp-measure.js:181-185`.
    Adopting it is a commitment to possibly deleting part of our fixed writing rules.
105. **Validate a rule by seeding its violations** and seeing whether readers report them unprompted —
    never by asking readers whether they approve of the rule. Williams 1981 built that instrument with
    about 100 planted errors, and distinguished first-reading response from deliberate search. Rules whose
    violations nobody notices go.
106. **Check a usage rule against a corpus of prose you respect before enforcing it.** Pullum 2009 does this
    with counts: if good writers alternate, the rule is a preference and must not be a gate. His related
    test is sharper still — check whether a style guide's own prose obeys its rules on the same page.
107. **An `execution_evidence` field on every handoff** — `not_run | model_only | executed`, where
    `executed` requires evidence from the host. `avoid-ai-writing .../handoff-contract.md:26-29`.
108. **A publication gate on our own claims**: no number reaches a README without an n, an interval, and a
    statement of register. `avoid-ai-writing corpus/README.md:229-234`. They keep their own unflattering
    AUC of 0.501 out of their README to honour it.

## Formatting `.md` for human readers

Nothing in the plugin covers this today. Two seats went at it: one gathered 36 primary sources and marked
each rule's evidence class, the other measured ten well-regarded documents and asked what converges.

**The one real measurement.** Morkes and Nielsen 1997, study 3: 51 participants across five between-subject
conditions. The scannable version produced **fewer task errors**, t(19) = 2.16, one-tailed p < .05. The
famous "47% improvement" that gets quoted from this work is a **composite usability score, not a
comprehension gain**, and the contributions of individual formatting features were not isolated — except
for promotional tone, above.

One arithmetic correction, because a reader of this survey nearly inherited it. A round-two return
described the combined version's 124% gain as greater than the sum of its three single-factor versions.
Those are 58%, 47% and 27%, which sum to 132%. The combination is **less** than the sum of its parts, not
more: the factors overlap, and nothing here supports stacking formatting interventions for additive
effect. The independent second writer of this survey caught it; the first did not.

**Attention, with sample sizes.** Scrolling and attention: 120 participants, over 130,000 fixations —
57% of viewing time above the fold, 74% in the first two screenfuls, 81% in the first three. These are
shares of attention, not the share of readers who stopped. Page length behaves as an attention budget:
each extra 100 words buys roughly 18 words actually read. The F-pattern rests on 232 users originally and
47 in the 2017 revisit; the layer-cake pattern on **9 participants**, and its "exponentially improved
usability" claim carries no quantity at all.

**What converges across ten independently maintained documents** (threshold: at least 8 of 10):

- 10/10 explain the purpose or the task before the first executable example
- 9/10 reach a code block within the first 400 words
- 9/10 open with explicit headings before body prose
- 9/10 have a median prose paragraph of one sentence
- 9/10 use no collapsible blocks at all
- 8/10 use no tables at all
- 8/10 carry an installation route on the page

**Three widely repeated beliefs that these measurements do not support.** Heading levels are skipped by
uv, Vite and FastAPI — only 6 of 9 explicit outlines obey the no-skip rule. An install command near the
top appears in only 2 of 5 READMEs. One-sentence-per-source-line does not converge at all, which
contradicts SemBr's recommendation; its benefits are to diffs and review, not to the rendered reader.

**Rules with their evidence class.** Line measure: 45–75 characters (Bringhurst, read in a secondary
reproduction), 45–90 (Butterick) — craft consensus, no experimental derivation, and a Markdown author does
not control rendered width anyway. WCAG is normative where it applies: 1.3.1 (A) structure, 2.4.6 (AA)
descriptive headings, 1.1.1 (A) text alternatives, 1.4.10 (AA) reflow with a two-dimensional-table
exception, 1.4.8 (AAA) a mechanism for ≤80 characters. Two corrections to received wisdom: **"click here"
is not an automatic failure** — 2.4.4 allows purpose to be determined from programmatically determined
context — and **find-in-page opens collapsed `<details>`** in Chrome 97+, Firefox 148+ and partially
Safari 26.2+, so the old argument against collapsible blocks has expired.

**The most load-bearing single rule found:** do not format alternatives as a numbered list. Readers take
numbered choices for required steps and perform all of them. That is a formatting defect which produces a
wrong *action*, not merely a wrong answer. GitHub's own guidance caps alerts at one or two per article,
forbids consecutive and nested alerts, and no controlled comparison of a boxed warning against an inline
one exists anywhere in this survey — while banner-blindness work (26 participants) is indirect evidence
that a box can be skipped precisely because it looks like a box.

**And the limit that matters for us.** A model reading raw `.md` sees the contents of collapsed blocks and
HTML comments, and experiences no viewport width, no visual prominence and no human scanning. Our
fresh-reader ruler is **structurally unable** to measure most of this dimension. Formatting must therefore
be checked deterministically from source — heading ranks and skips, duplicate anchors, list nesting depth,
table shape, unclosed fences, missing language tags, unresolved local links and fragments, missing alt
text, alert type and nesting, `<details>` initial state, warnings inside collapsed blocks, content hidden
in HTML comments, and GitHub's 500 KiB README truncation — or recorded honestly as something we do not
measure.

## Candidates to test

Text held here because it is not yet evidence. Each says what would settle it.

**Anthropic's mannered-prose instruction.** From
`platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5-1`, section
*Writing density*, quoted in full:

> Mannered prose substitutes metaphor and flourish for direct statement. Instead of "a parameter worth
> varying," the mannered writer produces "a dial worth turning." Instead of "this point still matters,"
> they write "this point earns its keep." The phrases exist to display the writer, not to convey the idea,
> and readers can tell. That is why mannered prose irritates: it makes the reader work harder so the
> writer can perform. It is also imprecise. Metaphors drag in connotations the writer did not choose and
> cannot control. The fix is to say what you mean. When a literal phrase is available, use it.

The same page documents that the short form — "Please remove all mannered prose" — also tends to work, and
recommends placing the instruction in a user message rather than the system prompt. Our fixed writing
rules say nothing about metaphor, and this rule passes our own testable-rule gate: *when a literal phrase
is available, use it* names an observable decision. **Settled by:** adding it to the writer brief for one
audit cycle and comparing measured failures repaired. Cost: none beyond a normal run.

**A one-line standard-naming instruction**, found by the owner:

> Use ASD-STE 1000 simplified technical english, and the Barbara Minto Pyramid Principle when you
> communicate with me

Recorded verbatim, including its error: the standard is **ASD-STE100**; S1000D is a different
specification, for technical publication data. What makes this worth testing is its shape, not its
content. A 299-byte micro-prompt beat its own author's 53-rule ASD-STE100 skill across eight scenarios
(`AminBlg/SimpleEnglish evals/results/rebuild-2026-09-02/`); a one-line `AGENTS.md` naming a single book
was the control arm that held its own in `ciembor/agent-rules-books`; and Anthropic reports the same for
its own one-liner above. Three independent observations that naming the standard carries most of the
effect of teaching it. **Settled by:** entering it as a fourth writer angle in one bake-off, models hidden
from the judges. Cost: one extra writer seat.

Two cautions before either is adopted. Minto's own justification is asserted, not measured — the mind
"automatically sorts information into pyramidal groupings", resting on Miller's magical number seven —
and her SCQA opening, which withholds the answer until the reader holds the question, contradicts her own
answer-first rule; the book was not opened, both editions being lending-restricted. And ASD-STE100 Issue 9
is not simple English: it combines writing rules with approved meanings and parts of speech, so text that
merely reads simply is not compliant. The full standard requires a free-copy request and was not obtained.

## Rejected on evidence, and independently reconfirmed

The 2026-09-10 run rejected published standards as a mandatory pass, hard per-sentence word limits, prose
linters as a gate and CI punctuation gates. Round two reconfirmed each from sources with no connection to
us:

- **A standard's own advocate measured it losing.** `AminBlg/SimpleEnglish`, above.
- **A stylebook collection destroyed its only instrument** for licence hygiene. `agent-stylebooks`, above.
  It goes further: `scripts/validate_repo.py:390` fails the build if an `evals/` directory exists.
- **Write the Docs ships the 28-word sentence rule and has quietly disabled it.**
  `vale/WTD/SentenceLength.yml` carries `level: suggestion` while `vale.ini` and `guide.ini` set a
  `MinAlertLevel` that filters it out.
- **Readability formulas do not predict reading ease.** The eye-tracking ground truth of arXiv 2502.11150
  finds formulas, ML readability systems and frontier models all poor predictors. Klare 1963: of six
  studies that simplified vocabulary to improve comprehension, one succeeded. Klare 1976: of 36 studies,
  about half succeeded, and those required an average 6.5 grade-level change. Charrow & Charrow 1979:
  revisions that raised comprehension often *lowered* readability scores.
- **Never use a model's own readability rating.** Asking a frontier model to grade text on a 1–12 or
  1–100 scale produced no significant correlation with measured reading ease. If a cheap automatic number
  is ever wanted, mean per-word surprisal from a small language model beat every formula.
- **Never gate on a metric you also ask writers to optimise.** Bruce, Rubin & Starr 1981 give six
  conditions for adopting a text metric and this is the one that kills gating outright. Redish 2000 puts
  it plainly: optimising the score is lighting a match under the thermometer.
- **Do not instruct "avoid the passive".** Any tool that flags passives will mostly flag non-passives;
  state the actual want instead. Pullum, with counts.
- **Do not adopt SUCCESs, or any six-item property checklist, as a pass** — by the same argument that
  removed Diataxis.

One thing to keep from the sources we rejected: neither `agent-stylebooks` nor `riekelt/technical-writer`
imposes a hard word limit anywhere, and neither gates prose in CI.

## Round one was wrong five times, always by dismissing

Recorded because it is a fact about our method, not about the field. Every one of these was a verdict
issued without opening the file:

| Round one said | Round two found |
|---|---|
| `anthropics/skills` has no measurement | `doc-coauthoring` Stage 3 tests comprehension with a fresh reader |
| no Vale pack instantiates `consistency` | `proselint/Spelling.yml` does, with twelve pairs; all 21 release archives scanned to establish it |
| the three Diataxis skills are near-duplicates | five-token overlap of 0%, 0% and 0.262%; each does something the others do not |
| `fayerman-source/deslop` is a Google-style digest | it is built on Garner, SEC plain English and the ABA — legal drafting |
| `Vuk97/unslop` is pure opinion with no mechanism | regex detection, a CLI failure exit, and a stop hook that blocks high-severity findings |

"Not relevant" and "duplicate" are verdicts like any other. Our own `truth-pass.md` demands evidence for a
verdict about somebody else's document; this survey owed the same to the field and did not pay it the
first time.

## Disagreements kept rather than resolved

Two writers built this survey independently from the same returns, and a third round is still arriving.
Where sources disagree, both are recorded. A tidy account of a contested question would be the most
expensive thing in this file.

| The question | One side | The other |
|---|---|---|
| Where a misplaced true sentence goes | our rule: move it to the decision it belongs to | settled below, and it is neither side: the repair is set early, **recheck** before use. Repetition, not relocation |
| Whether to ask a reader about clarity | our three observations say the self-report ran against correctness | Sauro & Dumas, CHI 2009: subjective difficulty ratings distinguished two applications, 26 participants, five tasks each |
| Hard word caps | we measured standards carrying caps losing to unguided controls | ASD-STE100 is publicly documented as a *bundle*: Part 1 writing rules plus Part 2, a controlled dictionary in which an approved word generally has one meaning and one part of speech. We rejected a cap shipped without a dictionary, which is a different intervention. **Not verified:** its public pages do not disclose the 53 rules, the ~900 approved and ~1,200 avoided words, the 20/25-word limits, or a one-instruction-per-sentence rule. An earlier draft of this file stated those as fact; they came from a secondary account. "One topic per sentence" is documented and is not the same claim |
| One sentence per source line | SemBr and the ventilated-prose tradition argue for it | measured across ten well-regarded documents, it does not converge; its benefit is to diffs, not to readers |
| Whether comprehensibility trades against retention | the framing handed to us said maximum comprehensibility lowers retention | the primary source says that is too strong: the inverse-U was for a *combined* retention-plus-curiosity criterion, and interest alone had no meaningful effect. In the same experiment content structure explained 86% of explained variance in comprehensibility against 3.5% for linguistic simplicity |
| Whether a panel of judges is worth having | our bake-off assumes it | Göpferich §3: expert judgement is preparatory and cannot replace target-group testing. Our own `bake-off.md` already concedes the gain is unmeasured |
| Whether hiding the model from judges is enough | our sheet labels candidates A, B, C | measured: a model recognises its own prose without labels — recognition 0.672 and 0.747, self-preference 0.705 and 0.912. Labels are necessary and insufficient |
| Whether a model reader stands in for a human one | the whole plugin assumes it | settled above, and against us: the plugin measures model answerability, not human improvement. The categorical objection turned out to be an opinion column with no measurement; the measured threats are discrimination between nearby versions at *r* = .312 and instrument floor and ceiling |

Two disagreements were settled by measurement rather than kept: no Vale pack instantiates `consistency`
(false — one does), and the three Diataxis skills are near-duplicates (false — overlap is 0%). Both are
recorded above under round one's dismissals.

## Still unread or unverified

- **Books, all lending-restricted or paywalled, reached only through notes and quotations:** Williams,
  *Style: Lessons in Clarity and Grace*; Minto, *The Pyramid Principle*; Heath & Heath, *Made to Stick*;
  Pinker, *The Sense of Style*, chapter 3; Redish, *Letting Go of the Words*.
- **Papers reached by abstract only:** Britton & Gulgoz 1991; McNamara, Kintsch, Songer & Kintsch 1996;
  Sauro & Dumas CHI 2009; Kalyuga et al. 2003.
- **Standards not obtained:** ASD-STE100 Issue 9 (free copy on request); IEC/IEEE 82079-1:2019 (paid);
  ISO 24495-1:2023 (paid; read through the IPLF/IIID pattern library instead).
- **`azu/technical-word-rules-prh`** — metadata only.
- Recordings and conference talks behind their abstracts, including the MongoDB cross-engine accuracy
  claim of 93% across roughly eight answer engines, whose denominator and rubric are not published.
- The legacy Anthropic prompt-engineering pages — `prompt-improver`, `prompt-generator`,
  `prompt-templates-and-variables` — now redirect with no replacement section, and their historical claims
  cannot be verified.

### Fifteen gaps a completeness critic proved, and what is being done about them

A sixteenth round-two agent read everything the other fifteen returned and then grepped this plugin's own
files for what nobody had mentioned. Its absences are proven, not suspected: non-native and translation
readers, aviation and procedure design, centre-embedding, easy-to-read standards, actionability, issue
mining as a question source, tree testing, verbosity bias, non-English instruments, cognitive load,
reverbalisation and information scent all returned zero hits across `plugins/terse/**/*.md`.

Its own summary of the shape of the hole: the survey covered measurement method well and the craft
literature partly, and missed **the entire branch of technical writing where a misread sentence injures
someone**, and with it every reader who is not a fluent English-reading model. Its highest-value gap is
the provenance of the questions — everything downstream rests on six questions invented by the party that
also writes the repair.

A third round was commissioned on 2026-09-11 against the ten gaps that can be closed by reading: the
validity of a model reader as a stand-in for a human one; aviation and nuclear procedure writing;
ASD-STE100 in its real form with its two field studies; question mining from issue trackers; the reader's
language and non-English rule sets; who standards permit to be a validator; dependency distance and
centre-embedding as the measurable thing that word caps were not; verbosity and self-preference bias in
judges; reverbalisation as a second reader instrument; tree testing and information scent; and typed units
as a theory of placement. Its returns are not in this file yet.

Five gaps it named are not closable by reading and are recorded as standing limits: we have no human
readers, no repeat arm, no held-out questions, no proficiency axis in the reader profile, and no
actionability dimension in the judging sheet.

## How this survey was run, and where it is weak

Round one: twelve agents in one workflow, four scouts on Sonnet and eight readers on Opus, 966,000 agent
tokens, 401 tool calls, fifteen minutes — plus one Codex seat that died on a usage limit after 34 commands,
leaving only commentary. That commentary carried the survey's single most important finding, and the Claude
scout covering the same repository had reported its opposite.

Round two: sixteen Claude agents on Opus and Sonnet, and ten Codex `gpt-6-astra` seats. 1.79 million agent
tokens, 780 tool calls, 62 minutes. Four of the ten seats exited 6 — an approval the sandbox refused, in
each case a host outside the permitted set or a retry outside the sandbox — after completing their turns;
their answers are used, as a non-zero exit here does not discard an answer. Two were built to attack us
rather than the field: one refuting our conclusions, one measuring a duplication claim we had asserted.
The sixteenth agent was a completeness critic that read the other fifteen and then grepped this plugin
for what nobody had mentioned.

Round three: eleven Codex seats against the critic's gaps — one `gpt-6-astra` on the validity of the
ruler itself, one `gpt-5.6-sol` on procedure writing, eight `gpt-5.6-terra` on the rest, and one more
`gpt-6-astra` that rewrote this entire survey independently from the same inputs so the two could be
compared. That second writing found an arithmetic error neither the first writer nor the returning agent
had caught, corrected an overstated census, and is kept whole in the archive.

Round two's structured returns hold **271 practices**; about forty are ranked above and all 271 are kept
in [practices-full.md](practices-full.md). The raw returns — eleven Codex seat reports and sixteen agent
returns including the critic's — are preserved under `research/2026-09-11-terse-survey/` at the repository
root, outside every plugin payload, together with round one's twelve returns and round three's eleven
seats. Every raw return from all three rounds is in the repository.

**The evidence this plugin was built on is one directory over:** `research/2026-09-10-chain/` holds the
four-pass rewrite stage by stage, the claim ledger C01–C67 that the plugin's ledger format comes from, the
cut ledger, the prerequisite inventory, and forty Codex seat returns from the bake-off whose result
decided most of the plugin's shape. Every 2026-09-10 number quoted anywhere in this file traces there. It
was living outside version control until 2026-09-11, and the two reproduced blocks in `rewrite` now carry
the SHA-256 of their own text so the reproduction claim is checkable even without it.

Weaknesses. The Codex seats were single-pass and unreplicated; where two inputs disagreed, both are
recorded rather than reconciled. The craft literature is mostly notes and quotations rather than opened
books. Several practices above are implemented in one repository each and have never been run by us. The
first draft of this file dropped five of round two's sixteen returns outright — the five repositories now
in the drift group — because it was written from a truncated digest rather than from the returns
themselves, which is the same failure it records round one for. And the whole survey inherits the flaw its
own findings name: it is a retrospective reading of what other people wrote, not a measurement of
anything.
