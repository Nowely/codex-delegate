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
