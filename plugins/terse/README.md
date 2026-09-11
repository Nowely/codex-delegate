# terse

A Claude Code plugin that measures whether your documentation gives readers the right answer, and then
repairs what it measured. It sends fresh readers through your `.md` files and checks every claim about
behaviour against the code, so a failure arrives with a line number and a cause rather than an opinion.

Three skills. You invoke all three; none starts on its own.

```
/terse:audit   →  run file  →  /terse:revise  →  candidate + diff  →  /terse:audit again
   what broke                    what to write                          did it hold

/terse:calibrate  →  which forms you prefer, measured on you, blind
```

## What each one does

**`/terse:audit`** builds a profile of who reads this project, derives the correct answers from the
code, then sends one fresh reader per question through the documentation — `.md` only, starting where a
real reader starts. It returns a score, the questions that failed, and why each failed: the text lied,
the true sentence sat where it misleads, or the answer was there and unfindable. It never suggests
wording.

**`/terse:revise`** takes that file and rewrites against it in four passes: who reads this, the writing
rules, the curse of knowledge, then the measured failures one at a time. Three writers produce
candidates, two judges score them on the failures rather than on taste, and you get the winner, the
diff, a list of every cut of twenty words or more with its reason, and the file and line behind every
behavioural claim. It writes into its own run directory. Applying anything to your files needs your
word.

**`/terse:calibrate`** measures something the other two cannot see. A right answer is not the same as a
text you would rather read, and in the field studies that report both, the two sometimes move in
opposite directions. It shows you pairs of passages — same content, one thing different, sides shuffled,
nothing labelled — and asks which you prefer. Repeated items measure you against yourself, so a real
preference can be told from a coin toss. The result is a set of rules in your own terms, plus a number
for how far each model judge agrees with you, so a cheap screen can stand in for you without pretending
to be you. A preference never overrides a measured comprehension failure; it settles ties.

All three skills announce how many agents they are about to spawn, on which model, and wait.

## Install

```
/plugin marketplace add Nowely/agent-skills
/plugin install terse@nowely
```

The same two steps from a shell: `claude plugin marketplace add Nowely/agent-skills`, then
`claude plugin install terse@nowely`. Nothing else is needed — no dependencies, no configuration file,
no account anywhere. Node 22 or newer if you run the checkout directly.

## What it will and will not do to your text

It makes documentation truer and easier to answer from. It is not a compressor. On the one file
measured, the chain moved 2,725 words to 2,571 — six percent — while the second pass cut 105 words and
the third added 105 back as missing framing. If your text is long because it is wrong, this shortens it.
If it is long because it explains something hard, it will stay long and start being right.

It will not touch a condition, a limit or a warning at a point where you decide something. It will not
strip a repetition that sits at a decision a reader reaches independently. It will not drop the date or
the numbers from a measurement, including numbers the code has since changed.

## What was measured

One run, on 2026-09-10, on one README in one repository. Read the size of it before the numbers:

- The four-pass chain took six reader questions from three right answers to six, took readers leaving
  the documentation from one to zero, and broke neither control question. **Six questions, one trial
  each.** Three improvements and no reversals over six paired items gives an exact two-sided McNemar
  *p* = 0.25, so this result is not distinguishable from chance. It is a pilot, not a rate.
- Two of the six failures were lies rather than findability. A reader repeated two guarantees from
  `README.md:5-9` that the code does not make. A structural rewrite would have carried both forward in
  better prose.
- A reader's own sense of clarity ran against the truth. Two who reported no confusion answered wrong;
  the one who called a section scattered and confusing answered right. Neither skill asks a reader
  whether the text was clear.
- Five published writing standards were put against two unguided controls across ten seats, models
  hidden from the judges. Both controls beat both entries of both standards. On the first 116 words,
  seven of ten seats proposed nothing and the only seat that shortened the passage was a control. **Ten
  seats, one run, one passage** — one observation per cell, not a rate.

Not measured: which of the four passes produced the gain, and whether a bake-off beats one careful pass.
Also not measured, and worth knowing before you trust any of the above: there was no arm that ran the
same questions with no document at all, so none of this separates what the text taught a reader from what
the reader already knew. Two published benchmarks that did run that arm found it large. The reference
files say so where it matters, and
[references/prior-art.md](references/prior-art.md) collects every finding against these numbers.

## Licence

MIT.
