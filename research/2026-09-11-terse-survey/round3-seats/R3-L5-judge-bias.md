Codex gpt-5.6-terra R3-L5 — opened the bake-off rules, prior-art judge section, and four arXiv PDFs; most valuable: anonymous A/B/C labels do not prevent recognition—unlabelled GPT-4 recognized its own summaries at 0.672/0.747 and preferred them at 0.705/0.912 across XSUM/CNN.

**Current terse bake-off** — [bake-off.md](/Users/ruliny/Git/agent-skills/plugins/terse/skills/revise/references/bake-off.md:14).  
Measures: its ten-seat standards comparison, not whether its bake-off improves repairs.  
Current rule: all-Claude default; A/B/C labels; shortest word count breaks a tie (lines 19–24, 83, 93).  
Collision: “different model blind spots” is asserted, not measured; A/B/C hides declared authorship only.

**Zheng et al., 2023, [arXiv:2306.05685](https://arxiv.org/pdf/2306.05685), PDF pp. 5–6, 25–26.**  
Measures: 80 MT-Bench first-turn questions for order; 23 list-containing answers for verbosity.  
Measured: default position consistency / first-position preference: Claude-v1 23.8% / 75.0%, GPT-3.5 46.2% / 50.0%, GPT-4 65.0% / 30.0% (p. 5).  
Measured: redundant-list attack fooled Claude-v1 and GPT-3.5 91.3% each, GPT-4 8.7% (n=23, p. 5).  
Practice: run a tied pair in both orders; accept a winner only if the same candidate wins both; otherwise tie (measured mitigation, p. 6).  
Cost/collision: doubles a comparison, not judge seats; few-shot improved GPT-4 consistency 65.0→77.5% but costs 4× and can move rather than remove bias (pp. 6, 26).

**Panickssery, Bowman & Feng, [arXiv:2404.13076](https://arxiv.org/pdf/2404.13076), PDF pp. 2–7, 13–16.**  
Measures: 1,000 XSUM plus 1,000 CNN/DM articles; pairwise prompts hid the alternative source and were run in both orders.  
Measured, no fine-tuning: GPT-4 recognition/preference scores were .672/.705 on XSUM and .747/.912 on CNN; the paper also reports 73.5% authorship-recognition accuracy (pp. 2, 14).  
It separated recognition from preference with distinct prompts on the same pairs, hidden provenance, order averaging, 500-train/500-test fine-tunes, and length/vowel/readability/random controls (pp. 2, 5).  
Most direct blind-label test: falsely swapping explicit source labels changed GPT-4’s XSUM self-preference .73→.32 and GPT-3.5’s .61→.46; effects were not consistent on CNN or Llama (pp. 6, 13).  
Practice: do not let a judge score a candidate from its own underlying model family; A/B/C remains necessary but insufficient. This transfer to documentation is argued, not measured.  
Cost/collision: this paper does not test Claude, Codex, or rewrite bake-offs; it is evidence against assuming concealment works, not proof that provider diversity fully cures it.

**Dubois et al., [Length-Controlled AlpacaEval](https://arxiv.org/pdf/2404.04475), PDF pp. 3–9.**  
Measures: >120 models and 805 instructions; 38 models overlap Chatbot Arena.  
Method: fit a regularized logistic model for model, instruction, and output-length difference, then set the length term to zero counterfactually (pp. 4–5).  
Magnitude: a GPT-4-1106-preview score varied 22.9–64.3% under concise/verbose prompting; length control reduced this to 41.9–51.6%, normalized SD 25→10% (p. 6).  
Measured: correlation with Arena rose .94→.98; raw metric gameability was 26% versus 10% controlled (pp. 7–8).  
Cost/collision: do not divide by word count—the paper found that weaker; its fitted correction needs a large logged corpus, not three candidates on one document.

**Liu, Moosavi & Lin, [arXiv:2311.09766](https://arxiv.org/pdf/2311.09766), PDF pp. 1–5.**  
Measures: 20 generative evaluators over 500 CNN/DM and 500 XSUM documents, plus human-scored summarization sets.  
Measured: same-family evaluator/generator configurations show inflated diagonal scores, especially reference-free (pp. 1–5).  
It does not test anonymous candidate labels or recognition from raw prose, so it cannot establish whether A/B/C is enough.  
Useful only as converging evidence against same-model judging; its task and scoring mechanism differ from terse.

**What terse must change**

- Replace “length breaks a tie” with: “a tie on vetoes and repaired failures remains a tie.” Preserve all tied candidates; run the existing outcome audit on each, then choose only if one has a higher re-audit score with no control regression or new lie. Word count remains a reported diagnostic, never a selector.

- Replace the all-Claude judge default with two judges from two distinct provider families, neither sharing a provider/model family with any candidate it scores. A third split judge must meet the same rule. A/B/C labels remain, and candidate order/labels must be independently randomized per judge.

- For any direct comparison among tied candidates, use the same judge twice with reversed order and require order-invariant preference. This adds calls, not seats.

- Record every tie, all candidate word counts, presentation orders, judge model families, and whether selection was length-driven. Existing length-selected winners are unresolved, not retrospectively “corrected.”

- A future post-hoc length adjustment is possible only after accumulating many contests with per-failure binary outcomes and external calibration: fit a length term and re-score at equal length. AlpacaEval’s correction is not valid for the present three-candidate, one-document bake-off.

**Contradictions**

- The current shortest-text tiebreak has no evidence that it improves repairs. The measured LLM bias is toward verbosity, not toward shortness; neither direction licenses word count as quality.  
- “Models hidden from judges” is not sufficient blindness: Panickssery’s source-hidden setting still finds recognition and self-preference.  
- Provider diversity is sensible risk reduction, but no opened study proves that it removes this bias for documentation rewrites.

**Unopened**

- The primary Code-QA-Bench source behind prior-art’s “different provider family” claim; I did not rely on that unverified claim here.  
- No primary study directly tests A/B/C-labelled document-rewrite bake-offs, or Claude/Codex recognition of each other’s prose.