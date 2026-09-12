Codex gpt-5.6-terra R3-L8 — opened S1000D Issue 4.2, OASIS DITA 1.3 Part 2 plus its official grammar ZIP, and Horn 1993/1998; most valuable: they type modules/markup, not sentences, and none provides a measured causal case for a mandatory placement pass.

**[S1000D Issue 4.2](https://github.com/Scuba4436/asd-s1000d-42/blob/main/S1000D_Issue_4.2.pdf)** (primary specification, mirrored)

- **Measures:** nothing reader-facing in the opened chapters; n=none.
- **[Asserted/normative]** A data module has identification/status plus a content section containing its text and illustrations (Ch. 3.2, pp. 1–2).
- **[Asserted/normative]** Its DMC identifies product/part, information type, applicable location, and optionally learning type; `infoCode` and `infoCodeVariant` are mandatory DMC attributes (Ch. 3.9.5.1 §2.1.1.1, p. 5).
- The information-type partition is `infoCode` (three alphanumerics), variant (one), and location (one); the DMC is 17–41 characters (Ch. 4.3 pp. 2–3; 4.3.6–7).
- Codes form a hierarchy: 000 description/planning, 100 operation, 200 servicing, 300 tests, 400 fault isolation, 500 removal, 600 repair, 700 install, 800 storage, 900 miscellaneous, C00 software/data (Ch. 8.4 p. 2).
- Granularity is a product-part × information-type package, not a sentence or fixed word count; the opened rules prescribe no size limit and allow content applicability below module level.
- **Cost/collision:** take only a declared module-type field; it makes a module’s claimed type mechanically inspectable, not a sentence’s semantic type. S1000D is separate from ASD-STE100, which it cites as another standard (Ch. 3.9.5.1 p. 3).

**[OASIS DITA 1.3 Part 2](https://docs.oasis-open.org/dita/dita/v1.3/os/part2-tech-content/dita-v1.3-os-part2-tech-content.html)** and [official grammar ZIP](https://docs.oasis-open.org/dita/dita/v1.3/os/dita-v1.3-os.zip)

- **Measures:** no reader study or sample; n=none.
- **[Asserted/normative]** Concept supplies background/“what is”; task answers “how do I”; reference supplies fact lookup (Part 2 §§2.7.1.1, 2.7.1.2, 2.7.1.4).
- All three roots require `<title>` and `@id`; `<shortdesc>/<abstract>`, prolog, body, and links are optional (Appendix C, C.3/C.17/C.19).
- `conbody` permits general content then sections/examples; `refbody` permits tables, properties, syntax, sections, examples in any number; strict `taskbody` orders optional prereq, context, steps, result, troubleshooting, example, postreq.
- If `<steps>` occurs it has one-or-more `<step>`; each `<step>` requires `<cmd>` (official `task.mod`, `strictTaskbodyConstraint.mod`).
- A validator can enforce root/type, required title/id, allowed elements, order, cardinality, and attributes—not whether prose is actually conceptual, procedural, or reference information.
- **Cost/collision:** XML typing adds real structure but cannot diagnose terse’s sentence-level placement failure; do not turn it into a mandatory Markdown pass.

**Horn, “Structured Writing at Twenty-Five” (1993)** ([archived PDF](/tmp/horn_at25.pdf))

- **Measures:** no new controlled reader result; n=none.
- **[Argued]** Its seven information types are procedure, process, concept, structure, classification, principle, and fact (archive PDF p. 5).
- An information block is one-or-more sentences and/or diagrams about a limited topic, normally visibly labelled (pp. 4–5).
- Labels may name content, function (for example, Definition or Example), or both (p. 6).
- **Cost/collision:** the types can generate missing-decision questions or visible function labels; they are not validated truth and Horn’s old 7±2 size guidance is already incompatible with terse’s rejected hard limits.

**Horn, “Structured Writing as a Paradigm” (1998)** ([archived PDF](/tmp/horn_paradigm.pdf))

- **Measures:** Horn reports ten prior studies, seven on learning and two on retrieval time, with individual sample sizes/effects unavailable here (p. 18).
- One organizational report trained **n=180** managers; supervisors self-reported a 32% mean reading-time decrease—uncontrolled and not a test of typing (pp. 19–20).
- **[Argued]** The relevance principle says a chunk should contain information serving one main point by reader purpose/function (p. 7).
- **[Argued]** His “chunking scale” says separate chunks should serve one purpose; mixed introductory/definitional paragraphs score low (pp. 14–15).
- **Cost/collision:** this is a useful failure hypothesis and repair question, not evidence for a required pass; Horn himself asks for component-isolating research (p. 20).

**Check — proposed experiment, not evidence**

- Use **8** fresh existing reader seats, same cheap model/effort, randomly four per temporary Markdown variant. Six seats cannot reach two-sided significance even at 3/3 versus 0/3 (*p*=.10); 4/4 versus 0/4 gives Fisher *p*=.0286.
- Derive the answer key from code first: “Must I create `config.toml` before the first run?” → no.
- Variant A places the exact true sentence under `Optional configuration`; B moves only that sentence under `Prerequisites`; entry file, all other bytes, links, and question remain identical.
- Give each seat terse’s normal docs-only brief and collect answer, files, steps, departed, and the quoted line; no seat may see the other variant.
- Predeclare the effect as lower correct-answer rate in B, with B’s wrong answers quoting the unchanged true sentence; classify those as placement.
- This tests one known case only. A null is underpowered; a positive result is evidence about that sentence/heading pairing, not a license for a mandatory typing pass.

## Contradictions

- S1000D supports a mechanically checkable **declared module type**, not “this sentence is wrong type.”
- DITA’s formal grammar permits a valid task with optional `taskbody`, and optional steps within it; a validator cannot ensure a real procedure exists.
- Horn explicitly allows a block to be assigned to **one or more** information types (1998, p. 13), so his taxonomy is not an exclusive unit type.
- The only outcome evidence found is bundled, weak, or self-reported; none isolates wrong-type placement as the cause.

## Unopened

- A current S1000D issue and any project-specific BREX profile; this report opened Issue 4.2 (2016).
- Horn et al. 1969 and Horn 1992b’s underlying ten studies; their individual samples and effects were not independently verified.
- No primary controlled study isolating a true sentence’s wrong unit type from correct placement.