# Review of the calibrate skill, 2026-09-11

Three seats sent at a skill that had been written, committed, and never checked against the field that
studies exactly this problem. Between them they found five errors in it, two of them in a correction that
had itself been published as a fix.

| File | Model | What the seat did | Commands |
|---|---|---|---|
| `C-A-statistics.md` | gpt-6-astra | the statistics of the calibration design taken apart | 40 |
| `C-S-elicitation-literature.md` | gpt-5.6-sol | paired comparison, discrete choice, alignment preference practice | 107 |
| `C-T-practices-sweep.md` | gpt-5.6-terra | all 271 collected practices reread for calibration | 43 |

The corrections they produced are folded into `plugins/terse/skills/calibrate/`. The numbers there were
recomputed independently by two of the three and agree to six decimal places.

## The session page, reviewed four ways

One Codex seat and three Opus agents read the same page. `UX-questionnaire-literature.md` is the seat's
return in full. The three agents ran inside the session and their transcripts are not archived here; what
they found is listed below, because the findings are the part worth keeping.

**Defects, four of them confirmed against a running instance.** A note written once was silently
re-attached to every later answer — the redraw read the old textarea before the container was replaced —
so in a 285-item run the first note would have poisoned the whole comment column. A failed write returned
500 while the session advanced, so hours of judging could be lost with the only warning in a terminal
behind the browser. The option order for three-way items lived in memory and was lost on restart, giving
answers that could not be mapped to a variant. A duplicate answer from a second tab was silently
discarded while looking accepted. Breaks were absorbed into the next item's recorded time. `1fr` columns
let one long token widen its own side, which is a content-correlated side cue and exactly the bias the
side balancing exists to remove.

**Accessibility, computed rather than estimated.** Muted text ran at 2.38:1 light and 3.38:1 dark against
a 4.5:1 requirement; control borders at 1.37:1 against 3:1; white on the accent at 2.41:1. The whole
container was rebuilt on every keystroke, so focus sat on `body` and every single-letter shortcut was
live there — a 2.1.4 violation with a documented speech-input hazard. Paragraphs inside `button` elements
are invalid and ARIA flattens them, so a screen reader could not step through a passage.

**Annotation tooling, five tools read at source.** Every tool that carries optional per-item metadata
keeps the commit keystroke separate: Prodigy's `choice_auto_accept` is opt-in and its `instant_submit`
documents the price as losing undo; Label Studio, Argilla and doccano all require an explicit submit.
Only Chatbot Arena advances on the click, and it has no note, no flags and no undo. Undo exists
everywhere except brat — Prodigy keeps ten. The page had none. The most common long-session warning in
their documentation is task complexity per pass, not fatigue; brat measured a 15% time saving purely from
cutting the visible option set from 54 to 2.88.

**Questionnaire research.** Conrad et al. 2010, n=3,179: dropout was 12.7% with no progress indicator,
14.4% constant, 21.8% slow-to-fast and 11.3% fast-to-slow — a motivational indicator is not supported and
one form of it cost 9.1 points. Couper et al. 2013, n=2,410: visible follow-up work changes primary
answers, which is the measured reason to make extras skippable and to keep them from looking mandatory.
Albulescu et al. 2022, 22 samples and N=2,335: breaks improved fatigue at d=.35 but overall performance
only at d=.16, p=.116 — offer breaks, claim no quality cliff.

The correction that mattered most to the design: the four outcomes are four legitimate answers and must
look equal. An earlier revision demoted two of them to dashed links while trying to make them look
optional, which is the opposite of what they are.
