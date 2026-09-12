# Research

Every measurement the `terse` plugin's rules rest on, and the runs that produced them. Nothing here is
installed with a plugin or read at runtime. Each directory has its own README with the result; this is
the index.

| Directory | Question | Result |
|---|---|---|
| [2026-09-10-chain](2026-09-10-chain/) | does a four-pass audit-and-revise chain make one README truer and easier to answer from? | 3/6 → 6/6 on six reader questions, one trial each (p = 0.25, not distinguishable from chance); two of six failures were false claims a prose rewrite would have kept; five published writing standards lost to unguided controls on ten seats |
| [2026-09-11-terse-survey](2026-09-11-terse-survey/) | what does the field already know? | three rounds, 37 agents, 108 ranked practices; the plugin's own numbers measure model answerability, not human improvement; no arm ever ran without the document |
| [2026-09-11-calibration-bank](2026-09-11-calibration-bank/) | which forms of writing does this one reader prefer, measured blind? | a 139-item bank that passed its blind checks (tone 30% → 73% single-factored after a one-span rule); the run on the owner stopped at 42 answers with one factor separated at 0.05, one undetermined, one unjudgeable, and five objections none of which was an item — the skill was retired |
| [2026-09-11-markup-round-0](2026-09-11-markup-round-0/) | can the method produce a README its owner would send as it is? | nine rounds; regressions per round 1, 2, 1, 0, 6, 5, 10 — every one a lifecycle sentence written from reading, not running; an eleven-agent wave found 41 defects after six rounds; the first naive reader said "not yet" for content, not phrasing; round 09 says less and awaits the owner's read |
| [2026-09-12-skill-review](2026-09-12-skill-review/) | can a fresh agent execute the skill from its text? | 9,650 words to the first action and 19 gaps; after restructuring, 677 words; the dry-run prompt is the ruler for skill text |

What carried over into the plugin: the content rules and their measurements in
`plugins/terse/skills/rethink/references/stages.md`, the loop and its measurements in
`plugins/terse/skills/rewrite/references/`, the scripts and their self-test in
`plugins/terse/skills/rewrite/scripts/`. What did not: `calibrate`, kept at
`2026-09-11-calibration-bank/tool/` with its result.
