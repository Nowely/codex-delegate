# The calibration tool, retired from the plugin

This was `/terse:calibrate`, moved out of `plugins/terse` on 2026-09-12 on the owner's word. It measured
which of two phrasings one person prefers, blind, with repeated items. Run once, on the owner: 42
answers, one factor separated, one undetermined, one unjudgeable. The same reader then rejected a draft
on nine grounds, none of which was a phrasing; the question that decides whether a document ships is
asked at the scale of the document, not the sentence. The bank it was built for is beside this
directory. The blind-pair machinery in `scripts/session.mjs` is intact and would serve a judge of round
N against round N−1, if that judge is ever built.
