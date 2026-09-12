Codex gpt-5.6-terra R3-L3 — opened Inclusion Europe’s 40-page PDF, the AHRQ PEMAT guide/form, Shoemaker, Lee et al., and IEC’s catalogue/25-page preview; most valuable find: Lee et al. failed three calibration rounds before averaging multiple human raters reached acceptable reliability.

### Inclusion Europe, *Information for all* ([PDF](https://www.inclusion-europe.eu/wp-content/uploads/2017/06/EN_Information_for_all.pdf), pp. 25–31)

- **Measures:** nothing; this is asserted guidance, with no sample or pass threshold.
- **Validator rule:** §3 “Creating an accessible website,” rule 1: “Always ask people with intellectual disabilities to test your website.” [asserted]
- Rules 2–7: use accessibility aids; add “easy-to-read” metadata; avoid pop-ups and slow/heavy features; provide search. [asserted]
- Rules 8–17: clear purpose/contact on homepage; text-size control; visible location; consistent, simple navigation and ≤7–8 primary headings. [asserted]
- Rules 18–26: avoid crowding, horizontal scrolling and animation; make links clear, word-based, and visibly visited. Rules 27–29: accessible CD-ROM case, compatibility disclosure, autostart plus easy instructions. [asserted]
- **Cost/collision:** target-population recruitment, accessibility support, consent and compensation; model instances are not the named population. [argued]
- **Check:** terse’s result is at most an internal model **pilot**, not validation under this standard: it omits the required people with intellectual disabilities. [argued]

### AHRQ, *PEMAT and User’s Guide*, Publication 14-0002-EF ([archived original PDF](https://web.archive.org/web/20240518165743id_/https://www.ahrq.gov/sites/default/files/publications/files/pemat_guide.pdf), PDF pp. 6–8, 60–63)

- **Measures:** separate printable-material scores: 17 understandability and 7 actionability items; the guide specifies no validation sample size. [asserted]
- **Allowed roles:** professional raters score it (guide p. 2), calibrate against shared materials; adequacy then requires testing “with some of your patients” (guide p. 3). [asserted]
- **Understandability 1–5:** purpose evident; no distracting content; everyday language; define medical terms; active voice. [asserted]
- **6–12:** numbers clear; no calculations; chunking; informative headers; logical order; summary; visual cues for key points. [asserted]
- **15–19:** visual aids when helpful; aids reinforce content; captions; clear/uncluttered images; simple tables with clear headings. [asserted]
- **Actionability 20–26:** name an action; address user directly; explicit manageable steps; tangible tool when helpful; calculation examples; explain action-oriented visuals; visual aids that ease action. [asserted]
- **Cost/collision/check:** terse scores none of these separately—especially 20–26—and lacks target-user testing; its six model calls are a pilot, not PEMAT validation. Do not transplant all 24 health-material criteria to docs. [argued]

### Shoemaker, Wolf & Brach, *Patient Education and Counseling* 96(3):395–403 (2014) ([full text](https://pmc.ncbi.nlm.nih.gov/articles/PMC5085258/), §§2.3, 3.3; Tables 1–3)

- **Measures:** inter-rater reliability of the rubric across four rounds: 22 distinct raters; round 4 used 2 raters on 46 materials. [measured]
- Final round: understandability had 82% agreement, Cohen’s κ=.57, Gwet’s AC1=.74; actionability 82%, κ=.58, AC1=.75. [measured]
- Item κ ranged .35–.84, including .35 for “identifies at least one action”; consumer construct-validation sample was n=47. [measured]
- **Take/cost:** calibrate a panel and publish agreement before treating its rubric score as stable; this costs shared test items and independent ratings. [argued]
- This is an analogue, not an estimate for LLM judges; nevertheless it contradicts assuming two uncalibrated judges are reliable. [argued]

### Lee et al., *Health Promotion Practice* 17–19 (2022) ([full text](https://pmc.ncbi.nlm.nih.gov/articles/PMC8273191/), Background ¶¶5–7; “Pathway Forward”)

- **Measures:** PEMAT coding of farmworker material by 3–4 human coders; it is a single-team reliability case, not a general panel estimate. [measured]
- Three calibration waves failed its α>.65 criterion: 3 coders/5 materials, α=.42/.19; 4/15, .34/.07; 4/10, .32/.18 for understandability/actionability. [measured]
- Averaging the four raters’ scores produced ICC=.76 understandability and .73 actionability. [measured]
- **Take/cost:** label an uncalibrated two-judge panel as such; if retaining a rubric, independently rate shared materials and average two or more raters. [argued]
- This directly collides with terse’s “two are usually enough” default without a demonstrated agreement study. [argued]

### IEC/IEEE 82079-1:2019 ([IEC catalogue](https://webstore.iec.ch/en/publication/29075), [official preview](https://webstore.iec.ch/en/publication/29075), preview pp. 2, 7, 9–12)

- **Measures:** nothing in the free material; the catalogue identifies a 130-page, CHF 380 standard.
- Preview contents place Clause 5 at pp. 20–22: purpose (§5.2), information quality (§5.3: completeness through accessibility), and repeatable processes (§5.4). [asserted]
- The official foreword says: “Empirical methods for the evaluation of information for use are described in the normative part” (preview p. 7). [asserted]
- It also exposes §4.2 evaluation of consumer-product information, §4.3 documentary evidence, §6.3.3 reviewing/editing/testing, and Annex A.2.3 empirical effectiveness check. [asserted]
- **Cost/collision:** a conforming claim appears to require an empirical, documented process, but the accessible material does not expose validator eligibility or the operative criteria. [argued]
- **Check:** do not call terse IEC validation. The preview’s Scope says the horizontal standard “will not apply unless specifically referred to or included” in the relevant product standard; absent that and the paid Clause 5 text, terse is only a preliminary pilot. [argued]

## contradictions

- Inclusion and PEMAT distinguish target-user testing from an expert/model review; fresh same-family model answers are not a substitute.
- PEMAT makes actionability a separate score; terse’s judging sheet has accuracy, preservation, repairs, prerequisites, cuts, and length—but no actionability row ([bake-off.md:81](/Users/ruliny/Git/agent-skills/plugins/terse/skills/revise/references/bake-off.md:81)).
- The universal claim that every such standard names validators is not established: IEC’s free material confirms normative empirical evaluation but not who may validate.

## unopened

- The paid 130-page IEC/IEEE 82079-1:2019 text: specifically operative §§4.2, 5, and 6.3.3, so no stronger claim about its validator-selection rule is warranted.
