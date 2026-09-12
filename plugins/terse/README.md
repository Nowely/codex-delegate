# terse

A Claude Code plugin that measures whether your documentation gives readers the right answer, and then
repairs what it measured. It sends fresh readers through your `.md` files and checks every claim about
behaviour against the code, so a failure arrives with a line number and a cause rather than an opinion.

Four skills. You invoke all four; none starts on its own.

```
/terse:rethink  →  skeleton  →  /terse:rewrite  →  candidate + diff  →  /terse:audit
/terse:audit    →  run file  →  /terse:rewrite  →  candidate + diff  →  /terse:audit again
   what broke                    what to write                          did it hold

/terse:calibrate  →  which forms you prefer, measured on you, blind
```

## What each one does

**`/terse:audit`** builds a profile of who reads this project, derives the correct answers from the
code, then sends one fresh reader per question through the documentation — `.md` only, starting where a
real reader starts. It returns a score, the questions that failed, and why each failed: the text lied,
the answer was nowhere, the true sentence sat where it misleads, it was there and unfindable, or every
sentence was true and the sequence left the reader worse off. It never suggests
wording.

**`/terse:rethink`** decides what a document should be before a sentence of it is written: what
comparable documents in the same genre already solved, what things should be called, and what is said in
what order. It returns a skeleton — section titles, what each is for, what each leaves out, a word budget
— and stops there for your word. It exists because a draft written at ordinary quality was abandoned by
its reader at the third section, and nine of his nine objections were about what the document contained,
where it sat and how much of it there was. None was about phrasing.

**`/terse:rewrite`** takes a skeleton or an audit's run file and writes against it. Three writers produce
candidates and two judges score them on the failures rather than on taste; the winner then goes through
a loop of critics whose lenses do not overlap — the code, the rules, an adversarial reader, a task, a
reader's questions — until a round finds nothing new and nothing got worse. Every round is kept as its
own file. You get the winner, the diff, a list of every cut of twenty words or more with its reason, and the file, line and evidence level behind every behavioural claim. It writes into its own run directory. Applying
anything to your files needs your word.

**`/terse:calibrate`** measures something the other three cannot see. A right answer is not the same as a
text you would rather read, and in the field studies that report both, the two sometimes move in
opposite directions. It shows you pairs of passages — same content, one thing different, sides shuffled,
nothing labelled — and asks which you prefer. Repeated items measure you against yourself, so a real
preference can be told from a coin toss. The result is a set of rules in your own terms, plus a number
for how far each model judge agrees with you, so a cheap screen can stand in for you without pretending
to be you. A preference never overrides a measured comprehension failure; it settles ties.

All four skills announce how many agents they are about to spawn, on which model, and wait.

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
