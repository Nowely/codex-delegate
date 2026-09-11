# The curse of knowledge

Part three of the four-part chain. The text below is fixed. Run the three numbered steps in order and
keep the inventory from step one; it is one of the artifacts `revise` returns.

Camerer, Loewenstein & Weber (1989) and Newton (1990): once you know something you cannot accurately
simulate the mind of someone who does not. Tappers tapping a song predicted listeners would name it half
the time; the real rate was 2.5%. Your documentation is the tapping. You hear the melody and can no
longer hear the knocking. The procedure:

  1. Inventory the invisible prerequisites: what must a reader already know for this to make sense -
     vocabulary, mental model, context, prior steps. The items you almost did not list are the curse.
  2. Rebuild from the reader's actual state, not yours minus a bit: what do they see first, what will
     they try first.
  3. Write to the failure point: wherever a non-knower stalled, that is where the melody was playing
     silently in your head.

Its own warnings: do not fix by adding more text, because the curse hides missing framing rather than
missing detail, and one sentence of "what this is and when you need it" beats three paragraphs of how.
Every "obviously", "simply" or "just" hides a prerequisite.

## What the inventory looks like when it is honest

From the 2026-09-10 run on one README, three of the twenty-four items it found:

- **Two installations.** The host tool being installed does not establish that the second one is
  installed and authenticated. Name both, and the language runtime, in the first setup paragraph.
- **Configuration versus prerequisites.** A reader treats every item under a heading named
  Prerequisites as mandatory. Say at the install decision that the optional file need not be created.
- **Instructions versus checks.** Prose addressed to a model is not an executable check. A reader who
  cannot tell them apart believes a verification runs that does not.

Note the shape: none of them is a missing detail. Each is a missing frame around details already on the
page. That pass added 105 words to a text the previous pass had cut by 105, and the addition was framing
rather than implementation background.
