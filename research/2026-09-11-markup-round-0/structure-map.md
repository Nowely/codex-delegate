# Structure map — README-candidate.md

1383 words, 10 sections. Against 2726 in today's README and 2233 in the draft that was abandoned at its
third section.

Each block below carries: **what it buys the reader**, **why it exists at all**, and an honest verdict on
whether it is clear and whether it pays for its words. Three blocks are marked as failing.

---

## 1 · `# codex-delegate` — the opening · 115w

| ¶ | Job | Verdict |
|---|---|---|
| 1 | says what the thing is and where it runs, in one sentence | **good** — 16 words, no mechanism, matches the convention 7 of 8 most-used documents follow |
| 2 | control and checking | **fails** — see below |
| 3 | why you would want a second model at all | **weak placement** — see below |

**¶2 fails on its own rules.** It lists the three kinds of access — read only, a throwaway copy, a named
directory — which is mechanism, in the block whose job is to sell. Worse, the same list is the body of
§5, word for word in places: the duplication check counts `throwaway copy` three times across two
sections and I let it pass. A reader meets the rights twice before deciding anything.

**¶3 is the strongest sentence in the document and it is third.** *"A review, a refutation or a competing
implementation from the same model is one model's opinion twice"* is the reason the project exists. It
sits after a paragraph of mechanism, where a reader deciding whether to keep reading has already met a
list.

**Proposed order: identity → why you would want it → what makes it trustworthy.** That is problem, then
value, then credibility, and it is the order the survey found in the documents that get read.

```
¶1  A Claude Code plugin that runs OpenAI Codex agents the way Claude Code
    runs its own subagents.                                          [unchanged]

¶2  A review, a refutation or a competing implementation from the same model
    is one model's opinion twice. So one task can go to a panel of Claude and
    Codex agents, each answer attributed to the model that gave it.   [was ¶3]

¶3  You say what an agent may touch before it starts, and what it did is
    checked against the record of the turn rather than taken on its word:
    an agent that ran nothing comes back failed, not finished.        [rewritten,
                                                                   −25 words,
                                                        the rights list cut]
```

---

## 2 · Quick start · 271w

- **install fence** — two commands, first screen. The one thing the reader was told he liked.
- **activation sentence** — `/reload-plugins` or next start. Corrects a false statement in the last draft.
- **requirements, three bullets** — `codex` signed in, Node 22, the measured codex build. Proposed
  independently by all six surveys; the codex version is load-bearing because §8 warns that an upgrade
  is what breaks a run.
- **worked exchange** — the only place the reader sees a real delegation happen.
- **small print** — the permission prompt, and that it spends your Codex quota.
- **`<details>` from-source route** — collapsed, so it costs screen and not reading.

**Verdict: sound, and the fattest section at 271 words.** It is the only section carrying six different
jobs. The `<details>` block is ~85 of those words and hidden by default, so the visible cost is ~185.

---

## 3 · Commands · 147w

- **trigger fence** — five literal sentences a user would type, including the Russian form and the
  refusal. This is the interface: a model-invoked skill fires on phrasing.
- **table** — the two modes that are started by name, with a real first column header.

**Verdict: this is the block that was missing entirely** until a survey of comparable plugin READMEs put
it third in almost every document. For a plugin, what to type is the base.

---

## 4 · Update and uninstall · 66w

- update fence, activation sentence, one clause that stored data survives an update
- uninstall, and that removing the **marketplace** instead takes the data with it

**Verdict: lean, and one of its two facts is a correction.** The previous draft promised data survives,
which is false on the marketplace-removal path — vendor-documented, and it has happened in this
repository's own history.

---

## 5 · What a Codex agent can do, and what it may touch · 202w

- three access kinds as bullets, each with the qualification that carries the information
- one `[!WARNING]` — the only alert in the document — for the throwaway copy starting at your last commit
- one paragraph: what a native subagent can do that this keeps, and the single place the two differ

**Verdict: good, once ¶2 of the opening stops pre-empting it.** This began as a nine-row comparison
table and was cut: eight of its nine rows said "yes" in both columns, so it proved sameness by looking
identical, which is not what a table is for.

---

## 6 · What it stores, and what leaves your machine · 113w

- `$TMPDIR`, the state directory by its literal path, and the Codex account
- what ages out and what stays

**Verdict: mostly a move, and it earns its heading.** Five of six surveys asked for it. The facts existed
before as asides in two other sections, where nothing was linkable when somebody asked "what does this
keep".

---

## 7 · Where parity stops · 103w

Four limits in the same vocabulary as the claim, immediately after it.

**Verdict: keeps an invented heading on purpose.** `Limitations` is the genre's word, but the thesis is
parity, so the limits are where parity stops. This is the one heading that departs from convention with
a stated reason.

---

## 8 · Against the official `openai-codex` plugin · 93w

Two measured defects, one paragraph, forensics linked.

**Verdict: promoted out of §9 by four surveys.** It is the bounce question of an informed reader — *why
not the official one* — and it was buried inside the technical section where that reader never reaches
it.

---

## 9 · How it works · 107w

The mechanism, all of it, below the adoption decision: one Node script per agent, rights asserted against
what was granted, the verdict derived from the turn, and the driver's own `--help` as a runnable command.

**Verdict: the section the reader asked for by name.** Every flag, exit code and protocol noun in the
document is inside it or linked from it — checkable by `grep`, which is how the rule is written.

---

## 10 · Troubleshooting · 146w

Four symptom-keyed rows, then where to report a problem and with what.

**Verdict: the second-highest-convergence gap, and the most expensive addition at 146 words.** Rows are
keyed by what the reader sees, not by what went wrong — which is why one of them may repeat a warning
from §5 without that being duplication: a reader arriving with a symptom never read §5.

---

## 11 · Further reading · 46w

Three canonical pointers, the evals note, changelog, licence.

**Verdict: the correct substitute for a table of contents** at this length. The survey put the threshold
for a ToC at roughly 200 lines or 2000 words; this document is 143 lines.

---

## What was deliberately refused

Named here because a reader of this map will wonder. Badge rows, a table of contents, Contributing, a
Philosophy or Tips list, an FAQ, a Use cases section, a configuration env-var table, an ASCII
architecture diagram, horizontal rules between sections, emoji headings, and a "check it worked"
smoke-test — the last because there is no `--version` and no doctor command to point at, so the section
would have had to invent one.

## The three failing blocks

| Where | What is wrong | Cost to fix |
|---|---|---|
| opening ¶2 | mechanism in the selling block, duplicating §5 | −25 words |
| opening ¶3 | the best sentence in the document is third | reorder, free |
| Quick start | 271 words, six jobs in one section | unresolved — splitting it would push the worked exchange off the first screen |
