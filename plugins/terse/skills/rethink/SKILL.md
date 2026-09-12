---
name: rethink
description: >-
  Decides what a document should be before a sentence of it is written: what comparable documents already
  solved, what things are called, and what is said in what order. Returns a skeleton and stops there —
  the writing is `rewrite`'s. Use when a document's shape is wrong, or when starting one.
disable-model-invocation: true
metadata:
  version: "0.1.0"
license: MIT
---

Three decisions, in order, each cheap to change here and expensive to change later. The output is a
skeleton: section titles, what each is for, what each deliberately leaves out, a word budget, and the
rules that will gate the writing. No prose.

**Then it stops.** Putting a skeleton in front of the person before two thousand words are written
against it is the point, not a courtesy. Measured on 2026-09-11: a ten-section draft written at ordinary
quality was abandoned by its reader at the third section, and nine of his nine objections were about what
the document contained, where it sat, or how much of it there was. None was about phrasing. Every
sentence in it was written against a shape nobody had agreed.

The method, with the measurements behind each stage: [stages.md](references/stages.md).

## Step 1. What comparable documents already solved

A fan-out, not one reader. One agent searching for good examples returns the genre's folklore; six agents
on six slices return a sample.

Announce the count and the models before spawning, and wait for the user's word. Default slices, one
surveyor each: the exact genre, the same structural position, the most used regardless of genre, vendor
guidance, whatever this document's hard part is, and one slice whose job is what *not* to copy.

Two rules the surveyors carry, both learned by getting them wrong: **fetch, do not recall** — every
document reported carries its URL and its headings in order — and **weight by use, not by taste**.

Presentation is surveyed here too, from the markdown source rather than from a rendering, because a
summary of a document does not show you its devices.

One synthesis decides what to take. The bar is that a change earns its words in *this* document: it names
what it displaces, or admits the document grows.

## Step 2. The words

Do not inherit a project's vocabulary because the project uses it. For each load-bearing term: who parses
it and as what, where it comes from, and whether its commonest sense in the reader's own field is a
different thing.

Where the document's thesis is that A is like B, call A by B's word. Any other choice is an argument
against the document, made in every sentence. The worked example — a project that called its delegated
agents "seats" while claiming they were the equal of native subagents — is in
[stages.md](references/stages.md#stage-2-the-words-themselves).

## Step 3. The structure

About ten structures, each from a **different reading of what the document is for**, not ten runs of one
prompt. Announce the count and the models, and wait.

Critics see **all of them at once**, because ranking is the judgement being asked for and it cannot be
made from isolated reviews. Give each critic a different lens and require a fatal flaw for every
structure including the one it ranks first.

Ask each critic one more thing: what all of them got wrong. That answer is usually worth more than the
ranking — a failure every angle shares is a failure of the brief. On the run this method came from, it
was the three critics' shared answer that found the real defect, and none of the ten proposals had.

Synthesise from the winner, grafting only what the critics named. Do not average ten structures into a
compromise.

## Step 4. What you hand over

One file, and it describes the document rather than arguing for itself. A skeleton introduced by why each
section exists — "the block you asked for", "the one you said was missing" — is a negotiation transcript,
and a reader feels it before they can name it.

- each section: title, one sentence of purpose, what it deliberately excludes, a word budget
- the mechanical rules the writing must pass, written so that passing is a fact rather than an opinion
- the terminology decisions from step 2, including the ones you rejected and why
- what was deleted outright rather than moved, and the stated cost of deleting it
- any edit this structure requires in a file that is not the document

Then stop and wait. `rewrite` starts from the skeleton the user agreed to, and routes back here anything
it finds that belongs to a stage above it.

## Reference

- The four stages, the measurements, and the content rules: [stages.md](references/stages.md).
- Filling the blocks, and the loop: [loop.md](../rewrite/references/loop.md).
- What the field already says about all of this: [prior-art.md](../../references/prior-art.md).
