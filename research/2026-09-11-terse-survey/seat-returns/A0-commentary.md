## commentary

I’ll read the repository’s instruction files and supporting prompts, then compare any useful checks with terse’s measured audit and revision chain. I’ll cite a pinned commit so the line references remain stable.

## commentary

The repository has a dedicated `doc-coauthoring` skill and a `skill-creator` evaluation workflow. I’ll inspect both before accepting “only prescribes”; reader testing and scored evaluation may be exceptions, though neither necessarily matches terse’s code-derived answer key.

## commentary

`doc-coauthoring` does test document comprehension: it sends each question and the document to a fresh subagent, then records what the reader got right or wrong. It does not specify a frozen answer key, code verification, or navigation tracking. `skill-creator` also includes baseline comparisons and assertion scores, so “only prescribes” would be inaccurate.