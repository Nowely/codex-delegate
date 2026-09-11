# The truth pass

Documentation fails in two ways that look identical from the outside: a reader cannot find the answer,
or a reader finds an answer the software does not honour. Only one of them is repaired by better
structure. This pass separates them, and it runs before any reader is spawned so that its output can
serve as the answer key.

## Three levels of evidence

Citing a line is the weakest of the three, and it is the one that feels like proof.

| Level | What is proved | What it takes |
|---|---|---|
| 1 | the line exists | the path and line number resolve |
| 2 | the code says this | an independent reader of that code would state the same thing |
| 3 | the behaviour happens | a check that runs and shows it |

Record the level you actually reached, not the level you wish you had. The audit that first stated this
rule admitted in its own header: *citation existence checks are not runtime verification*.

## The rule on guarantee words

**every, always, never, cannot, guarantees, ensures** — a claim in this shape must reach level 3 or be
weakened to what levels 1 and 2 support. There is no third option, because a guarantee is a claim about
all runs, and reading one function proves nothing about all runs.

Both lies found on 2026-09-10 had this shape, and both survived two earlier rewrites that made the
prose cleaner:

- *"Every completed turn leaves a receipt the driver checks"* and *"a seat that did nothing cannot
  report as though it had."* The check reads the opening metadata of a session record for a matching
  thread id. It does not establish that the task succeeded, and a failed check does not change the exit
  verdict. Two readers repeated the guarantee back as the project's core promise.
- *Exit 0 means a command ran.* Two switches waive that floor. One reader had read the accurate
  sentence in a skill file and still preferred the README's stronger claim — a stronger claim beats a
  truer one when both are in front of a reader, so the weak form has to be the only form.

## Three verdicts, and the middle one is the danger

- **confirmed**, with the level reached.
- **refuted**, with the file and line that contradicts it.
- **unconfirmed** — you could not settle it.

Unconfirmed is not neutral. It is how both lies above reached readers: nobody proved them false, so they
stayed. Work to refute rather than to confirm, and when you are unsure, write unconfirmed rather than
confirmed. A run whose ledger is entirely confirmed at level 1 has measured nothing.

## True, but not where it is read

Truth and position are separate axes, and a wrong position is not repaired by a truer sentence. Flag
this case on its own.

The measured instance: *"you need not create `config.toml`"* is true, and it sat in a list headed
Prerequisites. The reader turned it into a requirement to create the file. A second instance from the
same run: a truthful warning was lifted to line 8, where two readers met it before they knew what the
tool was, and both remarked on it.

Flag any claim that is true and read at a point where it answers a question the reader has not asked
yet, or fails to answer the one they have.

## What is not a claim about behaviour

Keep this boundary or the pass turns into a general audit of the prose, which is the failure mode this
plugin exists to avoid:

- the argument for an instruction
- voice, tone and ordering
- examples that illustrate rather than promise
- recipes for tools this repository does not ship

These belong to `revise`, under the writing rules. They do not enter the ledger.

## When no code backs the text

Level 3 is unreachable for a claim about the world rather than about software. The rule degrades to:
a guarantee-shaped claim carries a named source the reader can check, or it is weakened. Everything
else stands — the three verdicts, the refutation stance, the position flag.

This weaker form has not been measured. Say so in the report rather than reporting a score as though it
had been.
