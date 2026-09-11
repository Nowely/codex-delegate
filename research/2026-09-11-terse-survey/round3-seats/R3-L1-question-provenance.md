Codex gpt-5.6-terra R3-L1 — opened both author-posted ICSE PDFs, both replication packages, and `terse`’s audit sources; most valuable find: **Completeness (the answer is absent) is a measured documentation-issue category with no `terse` bucket**, while mined questions have not been shown here to predict reader confusion.

### `terse` current method

- What it is: audit derives 5–8 questions from a model-built reader profile; the profile permits issue titles/search terms as reader language, but does not require mined questions ([reader-profile.md](/Users/ruliny/Git/agent-skills/plugins/terse/skills/audit/references/reader-profile.md:7), [measure.md](/Users/ruliny/Git/agent-skills/plugins/terse/skills/audit/references/measure.md:8)).
- Measures: one six-question, one-trial README run; 3/6→6/6, McNemar two-sided p=.25—not distinguishable from chance ([measure.md](/Users/ruliny/Git/agent-skills/plugins/terse/skills/audit/references/measure.md:92)).
- Practice: use locally mined reader questions as a predeclared candidate/held-out pool, but still derive each answer key from code. **Argued**; the studies below do not validate this repair.
- Cost/collision: requires manual filtering because many mined discussions are maintainer, process, or tool questions—not first-time-reader decisions.

### Aghajani et al., 2019, “Software Documentation Issues Unveiled,” ICSE, pp. 1199–1210

- [Author copy](https://raw.githubusercontent.com/emadpres/emadpres.github.io/master/pdfs/icse2019.pdf) opened. **Measured:** mined 805,939 candidates from issues, PRs, Apache mailing lists, and Stack Overflow; manually classified 878, retaining 824 valid artifacts and 1,548 labelled sentences (Table II, p.1201; §IV, p.1202).
- Mining method: SO used 78 documentation tags/28,792 discussions; GitHub used 66 keywords in issue/PR title or first post, including PR-review events; Apache covered 480 docs/dev/users lists (pp.1201–1202).
- Sample: issues 394,504→345 analysed→324 valid; PRs 375,745→332→310; mail 6,898→101→95; SO 28,792→100→95. Initial 665 target was 99% confidence ±5%; stratification made 829, 99% ±4.5% (p.1201).
- Taxonomy counts are overlapping artifact counts: **What 485** = correctness 72, completeness 268, up-to-dateness 190; **How 255** = usability 138, maintainability 21, readability 107, usefulness 20 (pp.1202, 1205–1206).
- **Process 81** = internationalization 20, contributing 50, generator configuration 4, development effects 8, traceability 5; **Tools 134** = bug 17, support/expectations 34, help-required 90, migration 4 (pp.1203, 1207–1208).
- Worth taking: mine the four repository/community channels, preserve provenance and manually code candidate questions. **Measured** as corpus collection, but only **argued** as an audit-question source.
- Cost/collision: they found a 92.27% initial labeller-conflict rate (765/829; p.1202); the study neither changed documentation nor measured comprehension, so it supplies no predictive-validity or “enough questions” result.

### Aghajani et al., 2020, “Software Documentation: The Practitioners’ Perspective,” ICSE, pp. 590–601

- [Author copy](https://raw.githubusercontent.com/emadpres/emadpres.github.io/master/pdfs/icse2020.pdf) opened. **Measured:** relevance self-reports from 146 practitioners—125 ABB, 21 online; Survey I n=78 and Survey II n=68 (§3.2–3.3, pp.592–594).
- It does not create a new taxonomy: it reduces the 2019 **162** types to **51** Survey-I items—22 What, 12 How, 17 Process/Tool (§3.2, p.593).
- Underlying mined-artifact category prevalence is What 55%, How 29%, Process 9%, Tool 15% (p.592); these overlap and must not be summed.
- Reader-relevant signals were strong but self-reported: clarity 88%, accessibility/findability 65%, information organization 49%; missing new-feature documentation 69%, installation/deployment/release 68%, missing user documentation 65% (Fig.2, p.595; discussion pp.596–597).
- Practice: use the taxonomy to screen mined material for reader-facing omissions, accuracy, and route questions. **Measured** relevance survey, **not** a test that questions forecast confusion.
- Cost/collision: the paper says Process/Tool items mostly affect writers (p.597), so blindly sampling all issues would dilute `terse`’s reader test.

### 2020 Survey-I replication package

- [Authors’ package](https://github.com/USI-INF-Software/Conf-ReplicationPackage-ICSE2020) opened; its `Survey1-DocumentationIssues.md` gives the exact 51-item instrument and definitions. It measures nothing beyond the study’s raw design/responses.
- **What, 22:** Correctness/5—erroneous examples, faulty tutorial, inappropriate install, wrong comments, wrong translation; Completeness/7—developer guides, install/deploy/release, missing behavior, comments, diagrams, links, user docs; Up-to-date/10—code-doc mismatch, new feature/release docs, old refs/examples/install/license/screenshots/translations/version.
- **How, 12:** Maintainability/3—clone, lengthy, superfluous; Readability/3—clarity, concision, spelling/grammar; Usability/5—access/findability, load time, format, organization, example best-practice violation; Usefulness/1—not useful in practice.
- **Process/Tool, 17:** Process/8—translation difficulty, encoding, lack of time, missing translation, reporting, external contributors, file organization, traceability; Tools/9—bug, output size, use help, poor automation, expired licence, missing feature, obsolete tool, warnings/errors, migration.
- The package also has nine free-text “Other” fields; they are not part of the 51 predefined types.
- Practice: add **omission/completeness** to `terse`’s failure ledger: “the documentation does not answer this code-grounded question.” **Argued**, but directly grounded in a measured taxonomy.
- Cost/collision: this is a type taxonomy, whereas lie/placement/findability classifies a reader’s wrong answer; do not force a one-to-one mapping.

## contradictions

- **Completeness is the missing bucket.** A missing code-behavior clarification or user document is neither lie, placement, nor findability; call it omission/unsupported-answer.
- `lie` conflates the authors’ correctness and up-to-dateness distinctions. A formerly true claim made stale by change is separately classified in their taxonomy.
- The 2020 paper says 22 What items (p.593) but later summarizes “7 out of 23” (p.596). The published 51-item package supports 22 predefined What items; preserve the discrepancy.
- Neither paper supports the claim that mined questions predict actual confusion, nor a fixed question count. Their 829/878 sample sizes justify a corpus taxonomy, not six—or any number of—reader-test questions.

## unopened

- No primary site-search-log study, and no primary experiment linking mined questions to fresh-reader comprehension, was opened or found in these sources.
- Publisher PDFs were not used: ACM returned a Cloudflare 403; the fully opened author copies above supplied the cited pages.