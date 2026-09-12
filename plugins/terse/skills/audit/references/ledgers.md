# The run file and the three ledgers

`audit` and `rewrite` are two skills and two invocations, possibly two sessions. Nothing passes between
them except one file, so the file has a contract: fixed headings, fixed order, no renaming. `rewrite` is
given the directory and reads the headings by name.

## The run file

Path: `$RUN/audit.md`. Headings exactly as below, in this order.

```markdown
# Audit of <what was audited> at <commit or date>

## Scope
Files audited, the entry file, the repository that backs them, and the absolute run directory.

## Reader profile
The eight sections, as confirmed by the user.

## Claim ledger
Entries C01, C02, … in document order.

## Questions and answer key
Each question, its correct answer, the ledger entries that support it, and whether it is a control.

## Reader results
One row per reader.

## Score
Right answers over questions, steps, departures. Written as a single line that can be compared later.

## What broke
One entry per wrong answer, each with a cause.

## Open
What could not be settled, and anything the steps contradicted each other about.
```

Two headings are load-bearing for `rewrite`: **Reader profile** is the brief it writes to, and **What
broke** is the fourth part of its chain. Without them it is three parts of a four-part method, and it
has to say so.

## Claim ledger entry

One entry per sentence that states what the software does. Number them in document order so a later run
can be diffed against this one.

```markdown
### C07 — README.md:46

Claim: the installer requires Node at or above the version package.json declares.

Sources: package.json:1-9 (engines.node is ">=22"); skills/seat/scripts/driver.mjs:24-29.

Level: 2. Verdict: confirmed.
Position: misplaced — sends the reader to look the number up instead of stating it.
```

- **Claim** restates the sentence as a checkable assertion, not as a quote.
- **Sources** name file and line range. Every source is a real path in the audited checkout.
- **Level** is 1, 2 or 3, as reached — see [truth-pass.md](truth-pass.md).
- **Verdict** is confirmed, refuted or unconfirmed. A refuted entry names what contradicts it.
- **Position** appears only when the claim is true and read where it misleads.

## Reader results

```markdown
| # | Question | Answer | Right | Steps | Departed | Quote |
|---|---|---|---|---|---|---|
| 1 | What is this? | "delegates coding work" | no | 1 | no | README.md:3 |
```

`Quote` is the line the reader based the answer on. A wrong answer without it cannot be repaired at its
source, only guessed at.

## What broke

```markdown
### Failure 1 — "What is this?" — cause: refuted

The reader answered "coding work" from README.md:3. The software takes any work. The same reader
repeated two guarantees from README.md:5-9 that the code does not make (C02, C14).

Repair must: correct the scope sentence and remove both guarantees at their source.
```

Name the cause with one of the four words — refuted, missing, placement, findability — because
`rewrite` treats them differently. Name the ledger entries involved. State what a repair must achieve, not how to word it.

## The two ledgers `rewrite` returns

**Cut ledger.** Every removed passage of twenty words or more: where it was, what it said, and why it
went. A cut without a reason is indistinguishable from losing something.

```markdown
### Cut 4 — README.md:118-124, 31 words

What it said: the argument for declaring rights per call, restated beside the rights table.

Why: the case for an instruction lives in one place; the instruction stays.
```

**Invisible prerequisites.** One numbered item per thing a reader must already know, each with the
repair. The 2026-09-10 run found twenty-four on one README. The items you almost did not write down are
the ones that matter.

```markdown
3. **Configuration versus prerequisites.** A reader treats every item under a heading named
   Prerequisites as mandatory. State at the install decision that the optional file need not be created.
```
