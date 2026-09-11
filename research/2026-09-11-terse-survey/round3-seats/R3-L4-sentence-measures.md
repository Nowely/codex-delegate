Codex gpt-5.6-terra R3-L4 — opened terse’s two skills and seven references; Martínez–Mollica–Gibson, Futrell–Gibson–Levy, and arXiv:2502.11150v5 full texts — most valuable find: surprisal is the only candidate here with a large eye-tracking benchmark; that benchmark says DLT integration/embedding mostly fail, so neither earns a gate.

[Martínez, Mollica & Gibson (2022)](https://hdl.handle.net/1721.1/148805), Cognition 224, pp. 2, 4–5 — opened CC BY-NC-ND full text.  
- Measures: 3.5m contract words against 15m comparator words; two experiments total N=184 (main analysis retains 108). **Measured.**  
- Centre embedding: 0.729 vs 0.272 clauses/sentence, OR 2.56 (95% CI 2.48–2.63), §2.2.4/p.3.  
- The four-feature rewrite improved comprehension 67.7%→73.5% and recall 35.3%→42.4%, §3.2/p.4–5.  
- It did not compute a numeric dependency-distance predictor; centre embedding’s individual effect is exploratory and explicitly underpowered, §3.2.3/p.5.  
- Compute: centre embedding requires a syntactic parser; not model-free deterministic from Markdown. It flags retention burdens an answer-key test may never sample.  
- Cost/collision: parser setup and false positives; legal contracts and jointly changed features do not justify a documentation threshold or terse gate.

[Futrell, Gibson & Levy (2020)](https://hdl.handle.net/1721.1/135946), *Lossy-Context Surprisal*, pp. 6–7, 29, 44 n.1 — opened full text.  
- Measures: nothing on Markdown; it gives the DLT memory account and reviews evidence. **Argued**, with mixed reviewed results.  
- DLT integration cost rises when a dependent must retrieve its head across intervening *new discourse referents*, not merely words.  
- That explains word-count failure: a long sentence can have local dependencies, while a short centre embedding keeps a head active and makes later retrieval costly.  
- The relevant numeric unit is 0, 1, 2… intervening referents; it is not an empirically established prose cap.  
- Compute: dependency parse plus referent classification (`icy-parses` is the implementation used by arXiv:2502.11150); therefore no model-free deterministic `.md` check.  
- Cost/collision: it can reveal a structurally distant relation that a reader question misses, but the paper reports mixed natural-reading effects (p.7), so track only.

[Gruteke Klein et al., arXiv:2502.11150v5](https://arxiv.org/abs/2502.11150v5), pp. 5–6, 11, 13–14, 19–21, 45, 48 — opened PDF and source.  
- Measures: eye tracking for 638 adults, 3,733,817 word tokens, 30 news articles/162 paragraphs; about 106 readers per version. **Measured.**  
- Per-word surprisal is `−log₂ P(word | preceding context)`; sum subword surprisals into words, then average (§2.4/p.11).  
- Pythia-70M was the main model; surprisal was the best overall predictor, while integration cost and embedding depth were mostly non-significant (pp.13–14).  
- Compute: `psycholing-metrics` plus pinned Pythia-70M; no remote bill is necessary, but this is model inference, not deterministic/model-free.  
- Cost: one local 70M-parameter model; raw weights alone are about 140 MB FP16 or 280 MB FP32, plus runtime memory. No wall-time benchmark was reported.  
- It catches unexpectedly hard wording in otherwise short sentences that no audit question exercises; exclude fenced code and commands. Newswire adults ≠ technical Markdown, so review prompt only.

Noun stacking / terminology density — no opened primary source establishes ASD-STE100’s three-noun cap.  
- It measures nothing evidentially here: the rule is **asserted**, not a measured threshold; I did not treat the prior-art paraphrase as a source.  
- Martínez supplies a defensible terminology signal: contract content words averaged 187.531 SUBTLEX occurrences versus 451.399, pp.2–3. **Measured**, but not a noun-stack test.  
- Candidate: count low-frequency content words and project terms used before a first-use definition/link; record density and maximum local concentration. **Argued.**  
- Compute deterministically after pinning a frequency list and curated term list: Markdown AST + exact token matching; no model call.  
- Do not infer “noun runs” from regex: Markdown alone cannot reliably distinguish nouns from modifiers, names, verbs, or commands.  
- It can expose unexplained terminology outside sampled reader questions; cost is glossary upkeep and false positives for necessary technical terms. Counts must remain review prompts.

contradictions

- Martínez does not give a numeric dependency-distance effect, nor a powered isolated centre-embedding estimate.  
- The eye-tracking benchmark directly cuts against elevating DLT integration cost or embedding depth to a sentence-quality measure.  
- Surprisal’s evidence is adult English newswire, not software documentation; it measures online ease, not task correctness.  
- No opened evidence supports a three-noun threshold; adopting one would repeat terse’s rejected hard-cap pattern.

unopened

- Gibson’s original 1998 *Linguistic complexity* full text: ScienceDirect returned 403; Elsevier’s API exposed only minimized metadata.  
- ASD-STE100 Issue 9: not obtained; its official site timed out, so neither its rule locus nor supporting evidence was read.  
- Martínez supplementary material: not opened; it may contain extraction details and the exploratory feature coefficients.