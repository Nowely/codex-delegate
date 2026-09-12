# Prior art, words, structure — the three decisions before a sentence

| Stage | Decides | Wrong here costs | Owned by |
|---|---|---|---|
| 1. Prior art | what the genre already solved, and how the page looks | a section every comparable document has | `rethink` |
| 2. The words | what things are called, and what a reader parses them as | a vocabulary that argues against the thesis | `rethink` |
| 3. The structure | what is said, in what order, at what length | every sentence written against it | `rethink` |
| 4. The blocks | the sentences | one block | `rewrite` |

The order is not a preference: an error at stage 1 cannot be repaired at stage 4, and the reverse is
cheap. That asymmetry is the whole argument for three stages of deciding before any writing.

Stage 3's output — a skeleton — is put in front of the reader, and their word on it is where `rethink`
stops. Stage 4 and the loop that drives it are
[`rewrite`'s](../../rewrite/references/loop.md).

**It is a cycle, not a pipeline.** Each stage is settled before the next begins *the first time*; after
that, findings from the writing route back to whichever stage owns them, and everything written under
the old answer is rewritten. One pass through 1 to 4 produces a first draft, and a first draft is the
thing this file exists because of.

## The principle every stage serves

The owner's own statement of it, and it governs structure and sentences alike: **every word and every
sentence carries a score — what it delivers to the reader — and the document is a knapsack.** The job is
not to write well and then cut. It is to take, at each place, the formulation that carries the most
meaning for the space it occupies.

This is why "no water" and "the best phrasing" are one requirement rather than two. Water is not extra
words beside good ones; it is words whose score does not pay for their space. A section that survives
because it was in the outline, a sentence that repeats its neighbour, an assertion with nothing behind
it — each is a low-scoring item taking room a higher one wanted.

It is also why a word budget is a design tool rather than a limit. At 2700 words nothing has to argue
its way in. At 1000, every block must say what it displaces.

## The measurement that forced this file

2026-09-11. Ten sections of documentation, 2233 words, written at the author's ordinary quality and
handed to the owner with one question: would you ship this unchanged. He stopped at the third section
and returned nine objections.

**Nine of nine were about what the document contained, where it sat, or how much of it there was. None
was about phrasing.**

| His objection | What kind |
|---|---|
| no statement of the goal or the project's philosophy | missing content |
| technical detail from almost the first line, where the opening should sell rather than frighten | arrangement |
| JSON-RPC, the process name, the exit ladder — "what problem is this meant to solve, frightening the user?" | content that does not belong |
| the rights section is also full of rubbish | content |
| technical detail needs its own "how it works" section | arrangement |
| no update block to match the install block | missing content |
| Node version and `PATH` — "nobody says you need Node when they tell you how to install codex" | noise |
| `auth.json`, an invented example path | noise |
| did not read further, it looks like a lot of water | length |

This is the finding, not the anecdote: **a writing rule about wording could not have moved any of it.**
A bake-off that scores three whole candidates on sentence quality will pick the best-phrased of three
documents with the wrong shape. The shape has to be settled and agreed before a sentence is written.

His first objection is also worth naming for what it is. "It is not clear what problem we are solving"
is not a preference; it is a reader failing to get an answer, which is what `audit` measures. Where a
document has never been audited, that objection is the one to expect first.

## Stage 1. What comparable documents already solved

**Before designing anything, read how others in the same position did it, weighting by how much use a
document has had.** A README for a plugin is a solved genre: people have converged on a shape, and the
convergence is evidence of what readers are used to — not that the shape made them succeed. Inventing a structure from nothing throws that away and reliably loses a
section everybody else has.

Measured on 2026-09-12: a fourteen-agent structure exercise, one of whose ten angles was explicitly "look
at comparable tools", produced a seven-section skeleton with **no table of commands** — for a plugin,
where the first thing a user needs is what to type. One glance at a popular plugin README had it as a
titled section with `Command | Purpose` columns. The angle existed and placed second, and the synthesis
still dropped the row; a survey that is one voice among ten is a survey that can be outvoted.

So it is a **phase of its own, before the proposals, and it is a fan-out rather than one reader.** One
agent searching "good READMEs" returns the genre's folklore. Cut the genre into slices and give each its
own surveyor, so the sample is not one person's recall:

- **The exact genre.** Documents for the same kind of artifact, the ones people actually install.
- **The same structural position.** A wrapper or driver that grants, constrains or manages another
  program has our problem whatever it wraps — `direnv`, `mise`, `pre-commit`, `gh` extensions.
- **The most used, regardless of genre.** What survives contact with a hundred thousand readers.
- **Vendor guidance.** The documentation of whoever's product this sits next to, and their own examples.
  Often more current than anything in the community.
- **Whatever the document's hard part is.** Ours runs commands on the reader's machine, so: how do
  documents for sandboxes, runners and package managers present rights and blast radius, and where.
- **An adopt-nothing slice.** What the popular ones do that should *not* be copied, and why.

Two rules for the surveyors, both learned the hard way:

**Fetch, do not recall.** A survey written from memory is the folklore again. Every document reported
carries its URL and its headings in order.

**Weight by use, not by taste.** A README with forty thousand stars has been read by more people and
survived more confusion than one with forty. Report the usage signal beside each document. Where a
popular one does something badly, say so — but do not quietly rank a pretty unknown above a used one.

Each surveyor returns gaps as **sections with a purpose and a place**, never as adjectives. Then one
synthesis decides what to take, and the bar is that a change earns its words in *this* document: it must
name what it displaces, or admit the document grows. A survey concluding "add nine sections" has weighed
nothing.

Then synthesise rather than imitate: take the shape that has been proven, and put your own material in
it.

### Presentation is a third axis, and it is surveyed the same way

Content, arrangement and length are what a reader complains about. **How the page looks is what they
notice first**, and it is not any of the three. Survey it explicitly, from the markdown source rather
than from a rendering: a summary of a document does not show you its devices.

What a survey of the source turns up, and what each costs:

| Device | Pays | Costs |
|---|---|---|
| a nav line of anchor links under the title | a reader lands on the section they came for | one line |
| horizontal rules between major sections | the page reads as parts rather than as a wall | nothing |
| a one-line count summary under the title | the size of the thing, before any prose | one line |
| bold lead-in on each bullet | a list becomes scannable without being read | nothing |
| a command block with `#` comments per line | the inventory and its purpose in one artifact | nothing |
| a badge row | version and licence at a glance | credibility, once a badge is untrue or irrelevant |
| a banner image | recognition | making and maintaining one |
| an ASCII diagram of the flow | what runs, in what order, in parallel or not — in one glance | it must be maintained beside the thing it draws |

The first five are free; a badge costs credibility the moment one of them is untrue, and a row of seven
where three point at registries you do not publish to is a claim about how established you are, which a
reader checks.

**The last two rows of that table were wrong when first written, and the survey caught it.** They came
from one example — a project that uses horizontal rules and ASCII diagrams well — and the slice of
most-used documents does not use either: emoji headings, box diagrams and rules between sections are on
its do-not-copy list. A device inferred from one document is folklore with a citation. Weight by use
applies to presentation exactly as it applies to structure, and the first draft of this very table
broke that rule.

One caution against over-formatting, measured: in Morkes & Nielsen 1997 the "scannable" arm — bullets,
bold keywords, more headings — was the only version that did **worse** than the promotional control on
how well readers understood the document's organisation, while improving task time. Formatting that
helps a reader find things can cost them the shape of the whole. Devices that separate parts are safer
than devices that chop prose into fragments.

### A rejection of content can be a rejection of its format

Before deleting a fact a reader called noise, try it in another form. The reader is reporting what the
page did to them, and what a page does is presentation as much as content — they are not obliged to tell
the two apart, and usually cannot.

Measured on 2026-09-12. A reader called a runtime version and a `PATH` requirement rubbish — "nobody
says you need Node when they tell you how to install codex" — and they were deleted. A survey of six
slices then proposed restoring them, unanimously, with the usage evidence behind it: the direct
competitor at thirty-three thousand stars states its Node floor, and our own document elsewhere warns
that an upgrade of the wrapped tool is the likeliest thing to break a run, which is unactionable without
the version that was measured. Shown that, the same reader restored all three and said: *"possibly I did
not like the format that information was presented in."*

So: a deletion driven by a reader's objection is provisional until the fact has been tried as a titled
list, as a table row, and as a clause. Only then is it noise rather than noise-shaped.

## Stage 2. The words themselves

A separate pass, and it belongs before the structure rather than inside the writing, because a term that
misleads will mislead in every structure you try.

**Do not inherit a project's vocabulary because the project uses it.** Internal names are chosen early,
by whoever was thinking about the mechanism, and they harden before anyone asks what they say to a
stranger. For each load-bearing term, three questions:

1. **Who parses it, and as what?** Not "is it explained somewhere" but what a reader assumes on meeting
   it cold, before any definition reaches them.
2. **What does it actually mean, and where does it come from?** A word carries its other uses. If the
   commonest sense in the reader's own field is a different thing, the term is working against you.
3. **Is it attributed?** A term borrowed from a domain should be recognisable as borrowed and used in
   that domain's sense; a term invented here needs a definition at first use or a better word.

### The worked example: "seat"

This project called a delegated Codex agent a **seat** throughout — skill name, reference files, prose.
Taken cold:

- **What a developer assumes.** The dominant sense of "seat" in software is a licence slot: *we bought
  ten seats*. A reader meets "a Codex seat" and parses a billing unit before anything else.
- **What it was reaching for.** A seat at a table — a place in a panel, one participant among several.
  That reading is real but second, and it only arrives for a reader who already knows the design.
- **What it cost.** The document's whole claim was parity: that a delegated agent is the equal of a
  native subagent. Calling it by a word the native ones are never called by denies that claim in every
  sentence. The vocabulary argued against the thesis, quietly, throughout.

The fix was not a definition. It was the word the claim already used: **Codex agent**, or **Codex
subagent**. `seat` survives as the skill's internal name, where the reader is an agent and the term is
addressed by the code.

The general form: **where a document's thesis is that A is like B, call A by B's word.** Any other
choice is an argument against the document.

### Headings are terms, and the check runs both ways

A section name is a word doing the same job as any other: a reader scans for the one they expect. An
invented heading can be more precise and still be unfindable, and unfindable is the more expensive
failure — precision that nobody reaches is not precision.

So stage 2 covers two vocabularies, and stage 1 is where the evidence for both comes from. The surveys
report what comparable documents call things; that list is the input here, not a stylistic aside. The
two stages are coupled, and running stage 2 on intuition is running it on folklore.

Measured on 2026-09-12: a draft shipped **Install and first run**, **When something goes wrong** and
**Where the details live**, while the surveyed documents used **Quick start**, **Troubleshooting** and
**Further reading** — three conventions the draft had reinvented without noticing, one of which the
survey had already named as universal in the genre.

The check runs in both directions, and neither default is safe:

- **The project's own word against the domain's.** If the genre has an established term, deviating costs
  findability and has to be paid for.
- **The domain's word against this document's meaning.** A convention can still be wrong here. One
  heading in that same draft stayed invented on purpose: `Limitations` is the genre's word, but the
  document's thesis is parity, so its limits are *where parity stops*, and the conventional label would
  have flattened the claim the whole document is making.

State which you chose and why, in the skeleton, for every heading that departs from convention. A
departure nobody defended is a departure nobody decided.

## Stage 3. The structure, decided before any prose

Generate about ten structures, each from a **different reading of what the document is for** — not ten
runs of one prompt. Angles that produced distinct results: parity with the thing the reader already
uses; the sequence of decisions the reader makes; the Diátaxis split; the objections that stop adoption;
the shortest honest version; the reader's clock, from two minutes to the day it breaks; outcomes rather
than features; trust, for a tool that runs commands; one continuous argument; and what comparable tools
do, named.

Each returns section titles, one sentence of purpose each, **what the section deliberately leaves out**,
and a word budget. No prose. A structure is a set of decisions about what a reader needs and in what
order, and those decisions have to be legible on their own.

Then compare them **together, not one at a time.** Critics see all ten at once, because ranking is the
judgement being asked for and it cannot be made from isolated reviews. Give each critic a different
lens, and ask for the worst flaw of every structure including the one it ranks first; a critic
that finds none in its winner says so, and that is an answer, not a failure to look.

Ask each critic one more thing: what all ten got wrong. That answer is usually worth more than the
ranking, because a failure every angle shares is a failure of the brief.

Synthesise from the winner, grafting only the specific ideas the critics named. Do not average ten
structures into a compromise; that is how a document ends up with everyone's sections and nobody's
order.

**Then stop and put the structure in front of the owner.** Rewriting two thousand words against the
wrong skeleton costs more than one round trip.

**And keep the skeleton current.** It is the contract the mechanical rules and the word budgets are read
from, and every later decision — a section added on survey evidence, a fact restored on the reader's word,
a budget that grew to carry a true sentence — is written back into it. Measured on 2026-09-12: a rules
critic reading the skeleton as written reported the Node floor, the uninstall block and three sections as
violations, all of them decisions the reader had taken after the skeleton was agreed and none of them
recorded in it. A skeleton nobody maintains measures the document against a document nobody agreed. Every section
carries a budget, the ones added later included: a section without one cannot be over it, and the one
run where three were added without budgets ended 600 words over a total nobody had revised.

## The rules this produced

Derived from what one owner changed on one document, on 2026-09-11 and 12, not from a standard. They are
that owner's rules and the calibration target for their next document; another owner's are learned the
same way, and none of them is a law of the genre. They are about content and order; the rules about
sentences are in [writing-rules.md](../../rewrite/references/writing-rules.md) and are a different layer.

1. **Open with the problem and the goal.** What is this for, what is it trying to achieve. The project's
   own purpose — parity between a delegated seat and a native one — was absent from a ten-section draft
   about it.
2. **The opening sells; it does not warn.** No protocol names, no process names, no exit codes, no
   failure modes in the sections a reader meets first.
3. **Technical detail lives in one section of its own, below the middle.** Whoever reaches it came for
   it. Spread through the early sections it reads as a warning notice.
4. **A prerequisite that is satisfied on nearly every machine is noise — unless the document depends on
   it elsewhere.** `PATH` and credential files went; the runtime version and the wrapped tool's version
   came back when the survey showed the upgrade warning is unactionable without them.
5. **Install is a block to copy, immediately.** This is the one thing in the rejected draft the owner
   said he liked.
6. **Update gets the same block, in the same form.** A document that says how to start and not how to
   move forward is half a document.
7. **No invented examples.** A fabricated file path in a sample command is water; use something real or
   nothing.
8. **The vocabulary has to agree with the claim.** A document arguing that a delegated agent is the
   equal of a native one, while calling it by a different word throughout, denies its own thesis in
   every sentence. Internal jargon — a skill's name, a term the reference files use — is for readers who
   are agents. Where the reader is a person, the word that names the claim is the word to use.
9. **Where a section states a comparison whose rows differ, a table beats prose.** The claim is either
   visible in the rows or it is not true, and a reader checks a table in seconds and an argument in
   paragraphs. A table whose rows all say the same thing proves sameness by looking identical, and the
   one built for this document was cut for exactly that.
10. **A command goes in a fenced block, with a language, in the form that runs.** Not prose around it,
    not the in-application shorthand. `/plugin install …` works only for a reader already inside Claude
    Code; `claude plugin install …` works for the reader arriving at the page. The language tag is not
    decoration: an untagged block is unhighlighted, and highlighting is what makes a command legible as
    a command rather than as a quotation.
11. **A qualification is not a fix.** A sentence that needs a caveat to be true says too much: say less, or
    link the source that carries the detail. Five rounds of one document added caveats to make sentences
    truer and each caveat was contradicted by a finer detail of the code — regressions rose from one to
    ten. The owner named it: an *оговорка* is an anti-pattern.

## One rule about the artifact you show for review

A structure put in front of a reviewer describes the document. It does not argue for itself.

Measured the hard way on 2026-09-11: a skeleton was written with each section introduced by why it
existed — "the block you liked", "the twin block you said was missing", "the section you asked for by
name". The reviewer's reaction was that something was wrong before he could say what: the sections were
being justified to him rather than shown. Cut every trace of the negotiation that produced a structure
before showing it. The purpose of a section is what it does for its reader, never who asked for it.

## What it costs

The structure stage was fourteen agents: ten proposals, three critics over all ten, one synthesis. That
is the expensive part and it is paid once. The block stage is proportional to the document.

Against it: one rejected draft cost 2233 words of writing and the owner's patience, and was abandoned at
its third section.
