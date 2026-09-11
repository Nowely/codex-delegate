# terse

A Claude Code plugin that measures whether your documentation gives readers the right answer, and then
repairs what it measured. It sends fresh readers through your `.md` files and checks every claim about
behaviour against the code, so a failure arrives with a line number and a cause rather than an opinion.

Two skills, run in that order. You invoke both; neither starts on its own.

```
/terse:audit   →  run file  →  /terse:revise  →  candidate + diff  →  /terse:audit again
   what broke                    what to write                          did it hold
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

Both skills announce how many agents they are about to spawn, on which model, and wait.

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

On 2026-09-10, on one repository:

- The four-pass chain took six reader questions from three right answers to six, took readers leaving
  the documentation from one to zero, and broke neither control question.
- Two of the six failures were lies rather than findability. A reader repeated two guarantees from
  `README.md:5-9` that the code does not make. A structural rewrite would have carried both forward in
  better prose.
- A reader's own sense of clarity ran against the truth. Two who reported no confusion answered wrong;
  the one who called a section scattered and confusing answered right. Neither skill asks a reader
  whether the text was clear.
- Five published writing standards were put against two unguided controls across ten seats, models
  hidden from the judges. Both controls beat both entries of both standards. On the first 116 words,
  seven of ten seats proposed nothing and the only seat that shortened the passage was a control.

Not measured: which of the four passes produced the gain, and whether a bake-off beats one careful pass.
The reference files say so where it matters.

## Licence

MIT.
