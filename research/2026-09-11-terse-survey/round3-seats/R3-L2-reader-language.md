Codex gpt-5.6-terra R3-L2 — opened terse’s audit/revise skills, their seven references, prior-art, and the primary/public sources below; most valuable find: Kim–Crossley–Skalicky measured L2 reading proficiency and found it changed processing of simplified versus authentic English text.

### Holmback, Shubert & Spyridakis, CLAW ’96

- What/measures: [measured] Boeing controlled-English studies: comprehension, n=130; translation, n=38 (Spanish 15, Chinese 17, Japanese 6), with nine native-language raters ([pp. 167–68](https://mt-archive.net/90/CLAW-1996-Holmback.pdf)).
- It explicitly says ability was only native/non-native; Chervak’s reading test correlated moderately with performance but did not independently vary non-native English ability or report an interaction ([pp. 170–71](https://mt-archive.net/90/CLAW-1996-Holmback.pdf)).
- Practice: [argued by authors] systematically vary English ability/literacy and test more target languages ([pp. 175–76](https://mt-archive.net/90/CLAW-1996-Holmback.pdf)).
- Cost/collision: terse’s profile has “in their languages” but no document language, L1, proficiency, residence, or translation-direction field ([profile line 19](/Users/ruliny/Git/agent-skills/plugins/terse/skills/audit/references/reader-profile.md:19)).

### Kim, Crossley & Skalicky (2018)

- What/measures: [measured] 48 Spanish-L1 learners in Mexico, ages 15–24, read nine English passages word-by-word; authentic, beginning-simplified, and intermediate-simplified versions.
- Ability was actually measured: 48-question Gates–MacGinitie reading test, scores 7–34; TOEFL 420–597, approximately B1–C1 ([Methods: Participants; Measures of Individual Differences](https://zenodo.org/records/7637739)).
- Result: higher L2 reading proficiency predicted quicker processing; proficiency interacted with orthographic distinctiveness; simplified passages were faster than authentic passages ([Results](https://zenodo.org/records/7637739)).
- Cost/collision: [argued] add a reader proficiency measure or defensible proxy and sample across intended bands; a model merely role-playing “non-native” is not that measurement.

### Kuperman et al., MECO L2 (2022)

- What/measures: [measured] eye-tracking corpus of 543 university readers across 12 L1s and 11 L2-English samples; sites include Russia, Germany, Japan-adjacent language groups are not represented, and many non-English countries ([pp. 3, 11](https://www.cambridge.org/core/services/aop-cambridge-core/content/view/31CE1F8A8D33F93EE31B75AF26F76DB5/S0272263121000954a.pdf/div-class-title-text-reading-in-english-as-a-second-language-evidence-from-the-multilingual-eye-movements-corpus-div.pdf)).
- It measures English component skills, L1 reading, motivation, and comprehension; analyses with complete data use n=412 ([pp. 12, 26–27](https://www.cambridge.org/core/services/aop-cambridge-core/content/view/31CE1F8A8D33F93EE31B75AF26F76DB5/S0272263121000954a.pdf/div-class-title-text-reading-in-english-as-a-second-language-evidence-from-the-multilingual-eye-movements-corpus-div.pdf)).
- Result: 23% of L2 comprehension-accuracy variance was associated with English component skills plus IQ/motivation; the sample is intermediate-to-advanced, so it does not establish a low-proficiency threshold ([pp. 12, 26–27](https://www.cambridge.org/core/services/aop-cambridge-core/content/view/31CE1F8A8D33F93EE31B75AF26F76DB5/S0272263121000954a.pdf/div-class-title-text-reading-in-english-as-a-second-language-evidence-from-the-multilingual-eye-movements-corpus-div.pdf)).
- Cost/collision: [argued] language is not a sufficient reader label; proficiency and L1 reading ability are distinct variables.

### IEEE/IEC 82079-1:2019

- What/measures: [asserted] I opened only IEEE’s public catalogue description, not the paid standard text.
- Its public scope explicitly includes people responsible for “translation” and “localization,” and says product-specific requirements should consider target audiences ([official description, lines 439–465](https://standards.ieee.org/ieee/82079-1/7219)).
- Practice: [asserted, catalogue only] treat source language, target locale, target audience, and translation/localization ownership as lifecycle inputs—not as inferred reader traits.
- Cost/collision: this is evidence of scope, not evidence for a clause-level terse pass; the missing profile fields are in tension with it.

### ISO/IEC/IEEE 26514

- What/measures: [asserted] I opened only the public description, not the paid text. The current active edition is IEEE/ISO/IEC 26514-2021, published 2022, superseding IEEE 26514-2010 / ISO/IEC 26514:2008 ([official record](https://standards.ieee.org/ieee/26514/7467)).
- The public scope covers determining what users need, presentation, and requirements for structure/content/format; it does not publicly state a translation/localization requirement ([lines 457–458](https://standards.ieee.org/ieee/26514/7467)).
- Practice: [asserted] no clause-level writing rule can be taken without opening the standard.
- Cost/collision: terse should identify which edition a project invokes; do not infer localization obligations from this public summary.

### textlint-rule-preset-ja-technical-writing

- What/measures: [asserted] a Japanese technical-writing linter preset, not a reader study; it measures nothing.
- Its 23 configured rules include sentence/comma/読点 limits; Kanji runs; register and punctuation; number style; repeated conjunctions, `が`, and particles; double negatives; kana/Unicode/control characters; weak, redundant, successive, and misused forms ([source lines 5–129](https://github.com/textlint-ja/textlint-rule-preset-ja-technical-writing/blob/master/lib/textlint-rule-preset-ja-technical-writing.js#L5-L129)).
- Requested values: sentence ≤100 **characters** (90 suggested stricter); 読点 `、` ≤3 per sentence; contiguous Kanji ≤6; repeated `が` disallowed and repeated particles use `min_interval: 1` ([README lines 104–194, 304–385](https://github.com/textlint-ja/textlint-rule-preset-ja-technical-writing/blob/master/README.md#L104-L194)).
- Cost/collision: [argued] it proves units must be locale-specific, but supplies no outcome evidence and must not become a gate—consistent with terse’s existing linter rejection.

### ГОСТ Р 2.105—2019

- What/measures: [asserted] technical-document standard, opened from a non-official GitHub mirror; it measures nothing, and I did not verify amendments or current legal status.
- §5.2.2 says text should be brief, clear, and non-ambiguous; it distinguishes mandatory modality (`должен`, `следует`, `не допускается`, etc.) from conditional/permissive wording ([printed p. 5](https://github.com/Denigmma/agent_doc_system/blob/main/RAG/data/Pdfs%20example%20to%20index%20in%20knowledge%20base/GOST_R_2.105-2019.pdf)).
- §5.2.3 prohibits colloquialisms, competing near-synonymous technical terms, and foreign terms where equivalent Russian terms exist ([printed pp. 5–6](https://github.com/Denigmma/agent_doc_system/blob/main/RAG/data/Pdfs%20example%20to%20index%20in%20knowledge%20base/GOST_R_2.105-2019.pdf)).
- Cost/collision: [argued] preserve modal force and technical-term identity during revision; its §6.1 permits a “Terms and definitions” structural element, so terse’s absolute anti-opening-glossary wording is untested for this document genre.

### Главред / Ильяхов implementation

- What/measures: [asserted] the official service; it does not measure comprehension. Its About page says the score is only the stop-word share and “not a measure of text quality” ([“Что за оценка?”](https://glvrd.ru/about/)).
- Weights are partly documented: shipped JS uses per-hint `weight` and `penalty`, with `floor((1 − weightedStopwords/words)^3 × 100) − penalties`, clamped then displayed /10 ([bundle lines 491–541](https://glvrd.ru/static/bundle.min.js)).
- No static public rule→weight table was present in the opened source; rule weights arrive in API hints. Thus the formula/schema are public, the exhaustive schedule is not.
- Cost/collision: its API marketing suggests blocking texts by score, directly colliding with both the service’s own caveat and terse’s rejection of score/gate passes.

### СТБ 2631-2023

- What/measures: unopened. The official Belarus Госстандарт search returned “nothing found” for the exact designation ([result](https://gosstandart.gov.by/search?query=%D0%A1%D0%A2%D0%91+2631-2023)).
- I could not verify its title, scope, requirements, or a public full text; therefore it supplies no reported practice.
- Cost/collision: [argued] do not claim Belarusian plain-language rules or make a Belarusian pass from this citation.
- This is an evidence gap, not evidence that the standard does not exist.

### tekom and the Hamburg model

- What/measures: tekom’s own index exposes entries titled “Leitlinie Regelbasiertes Schreiben” and “Hamburger Verständlichkeitsmodell,” but this is an index, not the rules or model ([tekom search](https://www.tekom.de/suche?tx_solr%5Bq%5D=Schreibregeln)).
- Measures: nothing opened. The linked expert-answer pages returned access denial, and I did not open an original Hamburg-model book or paper.
- Practice: none reported; I will not reproduce the familiar four-dimension summary from secondary retellings as though I had opened its source.
- Cost/collision: German-specific requirements remain unestablished; no mandatory tekom/Hamburg pass is supportable from this seat.

## Transfer check

The fixed rules are at [writing-rules.md lines 6–25](/Users/ruliny/Git/agent-skills/plugins/terse/skills/revise/references/writing-rules.md:6).

| Fixed rule | Japanese | Russian | Verdict |
|---|---|---|---|
| No sentence that carries nothing | Operable as a meaning judgment. | Operable as a meaning judgment. | Untested cross-lingually, not meaningless. |
| Cut repeated rationale for an instruction | Operable. | Operable. | Untested discourse rule, not script-bound. |
| Cut editing history, emphatic capitals, and claims on the wrong line | “Capitals used for emphasis” is non-operative for Japanese-script text, except Latin spans. | Capitals can carry emphasis, but legitimate acronyms and typography need exceptions. | Capital rule is meaningless for native Japanese script; “wrong line” is unsafe if literal because translation/layout reflow changes lines. |
| Define a term at first need; no opening glossary | Term definition transfers. | Term definition transfers, but ГОСТ permits a terms/definitions section. | “Never” is too absolute for document genres; not proven language-wrong. |
| Purpose once at the top, in reader words | Requires a specified target language/locale. | Same. | Cannot operate from terse’s current profile alone. |
| Preserve conditions, limits, warnings, dates, numbers | Transfers. | Transfers; preserve modal strength especially. | The strongest transferable rule. |
| Sentence-length/repeated-phrase counts prompt review | Character, punctuation, Kanji-run, and particle units are available. | Word boundaries exist, but repeated-phrase detection needs inflection/lemma handling. | Not a word-count rule as written, but its unit/tokenizer is unspecified; an English implementation does not transfer. |

So: only the capitals clause is plainly non-operative for Japanese-script prose; literal line placement is unsafe in both languages; count-based review needs localized units. The other four content rules are not meaningless, but terse has not measured their transfer.

## contradictions

- Holmback’s explicit next-step recommendation, Kim’s n=48 result, and MECO’s n=543 corpus all contradict treating “non-native” or “their languages” as an adequate proficiency profile. None proves that simulated model personas substitute for profiled readers.
- Japanese tooling contradicts any implicit universal word-based length heuristic: its operative unit is characters plus Japanese punctuation and morphology. It does not contradict terse’s “not gates” rule.
- Главред contradicts itself: About says its score is not quality; API marketing calls it quality and proposes publish blocking. This strengthens, rather than weakens, terse’s existing rejection of score gates.
- ГОСТ’s modality distinction means aggressive shortening must not flatten `must`, `should`, permission, and prohibition into one force.
- The public 82079 description puts translation/localization in scope, while terse currently never asks whether a document will be translated.

## unopened

- Paid full texts: IEEE/IEC 82079-1:2019; ISO/IEC/IEEE 26514-2021 and the earlier ISO/IEC 26514:2008 lineage.
- СТБ 2631-2023 full text and verified catalogue record.
- tekom’s actual rule guideline and the original Hamburg comprehensibility-model publication.
- Ilyakhov’s original books/posts linked by Главред; only the official current implementation and explanatory pages were opened.