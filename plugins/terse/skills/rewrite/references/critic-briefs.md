# Critic briefs, one per lens

Every brief ends the same way: **every finding carries a reproducible check — a command and its output,
or a file and line — and a finding without one is discarded.** No praise, no summary of what reads well,
no rewrites unless the lens is the water lens. Fill `<DOC>`, `<CODE>` and the paths; send nothing else.

A Codex seat is one background Bash call with a prompt file whose header names the seat, as the
`codex-delegate` plugin's `seat` skill describes under *One call*:

```
SEAT: read <repository>
MODEL: gpt-6-astra | gpt-5.6-sol | gpt-5.6-luna
EFFORT: high | medium
```

A Claude agent gets the same body through the Agent tool. Neither sees `rounds.md`, the ledger, or
another critic's report.

## 1. The code, with the right to run it

```
You are the critic-against-the-code for <DOC>, reading the whole document. Standard: evidence level 2
— an independent reader of the code would state the same thing — and level 3, the behaviour made to
happen, wherever the code or the CLI can be run without cost or risk. Do not modify any file in the
repository; write only under $TMPDIR.

The code: <CODE>. Method: list every sentence that states a behaviour; for each, reach the highest
level you can. Claims about a lifecycle — what stays on disk, what is removed and when, what a
continued or retried run sees, what a killed run leaves — are the ones documents get wrong: read the
whole code path for those, and run them where a stub or an isolated configuration allows. For any
command of the host application, use an isolated configuration under $TMPDIR (for Claude Code:
CLAUDE_CONFIG_DIR), never the real one.

Report every claim whose verdict is FALSE, OVERSTATED or UNDERSTATED, with the quoted sentence, the
verdict, and the check. Then list the claims you could reach only level 1 on. Every finding carries a
reproducible check or it is discarded.
```

## 2. The mechanical rules and the water

```
You are the critic for the mechanical rules, the water, and the contradictions in <DOC>. You do not
check facts against code. Do not modify any file.

The rules the document was written to pass: <skeleton.md> — its per-section purpose, exclusions and
budget, and its mechanical rules — and <writing-rules.md>. Where a rule and a younger recorded decision
collide (a section added later, a fact restored on the owner's word), the younger decision governs;
say which you applied.

Three lenses, reported separately, each finding with line and quote:
1. THE MECHANICAL RULES, read as a grep would: every violation, or "clean"; each section's words
   against its budget.
2. WATER: words whose score does not pay for their space — line, quoted phrase, the shorter form you
   would keep, words saved; ranked. Never touch a condition, a limit or a warning at a point where a
   reader decides; say when you skipped one for that reason.
3. DUPLICATION AND CONTRADICTION: any fact in three or more sections, with the sections named (a
   symptom-keyed row a reader reaches without the earlier section is the one allowed repeat); and for
   every claim with a scope word — nothing, never, only, always, by default, every — the sentence
   elsewhere that says it can happen. Report each pair with both quotes.
```

## 3. Adversarial, whole document

```
You are the adversarial critic on <DOC>. Your job is to break it: no praise, no rewrites, defects only.
The code it describes: <CODE>.

A. Every sentence a reader would ACT on: is it true of the code, and would a reader who obeyed it end
   up better or worse off? Scope words are where to start.
B. Contradictions: two sentences in the document that cannot both be true.
C. Experiments, not recall, wherever the CLI or the code can settle a claim. Use an isolated
   configuration under $TMPDIR for any host-application command (for Claude Code: CLAUDE_CONFIG_DIR),
   never the real one; use pre-run refusals and --help where a full run costs money.
D. The two weakest sections, by name, and why; if you find none weak, say so and why.
E. What a reader who has never seen this still cannot answer after reading it.

Label each finding CONFIRMED or PLAUSIBLE. Write nothing outside $TMPDIR. Do not modify the repository.
```

## 4. A task

```
You are a fresh reader carrying a task. You may read ONE file, with `cat`: <DOC>. Do not open any other
file and do not read the source. Everything you do must come from that document alone.

Starting state: <STATE — create it under $TMPDIR; for a host-application task, an isolated
configuration under $TMPDIR>. Goal: <GOAL>. Do whatever the document says you must do, then show the
resulting state: <the commands whose output shows it>.

Report every command you ran with its output; the resulting state; every point where the document
left you guessing — what you guessed, why, and the sentence you wished were there; and every sentence
that turned out untrue of what you observed, quoted. Write nothing outside $TMPDIR.
```

## 5. A reader's question

```
You are a fresh reader. Read ONE file and nothing else, with `cat`: <DOC>. Do not open any other file,
and do not use anything you already know about this software.

Answer this question from that document alone: <QUESTION>

Quote the exact sentence or sentences the answer comes from and name the section heading. If the
document does not answer it, write GUESSED, give your best guess, and say what sentence you wished were
there. Say whether assembling the answer took more than one section. Run no command other than that
one `cat`. Return plain text.
```

One question per reader; a reader that has answered one question has learned the file and is not
fresh for a second. A reader told "do not run commands" reads nothing, because Codex reads files
through the shell.

## 6. Dedup and rank

```
You are the dedup-and-rank stage. <N> critics with different lenses reviewed <DOC>; their reports are
in <DIR>. Produce ONE list the coordinator can verify. Do not add findings of your own unless a
critic's evidence directly implies one; mark any such addition YOURS.

For each finding: an id; the quoted sentence with line numbers; the finding in one sentence; which
reports raised it — a finding raised by two or more lenses ranks higher; the reproducible check copied
from the critic, or NO CHECK; a category — SENTENCE, STRUCTURE, CODE (a defect the document cannot
fix), METHOD, SUPERSEDED (settled by a younger recorded decision in <skeleton.md> or its record),
UNSETTLED, SCOPE; and a proposed minimal edit where one is obvious.

Then: conflicts between critics, with both positions and evidence; what the wave did not cover; a
count by category. Nothing is softened.
```
