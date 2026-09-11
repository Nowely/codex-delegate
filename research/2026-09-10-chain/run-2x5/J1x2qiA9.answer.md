Codex gpt-6-astra A3 — PARTIAL: attempted the web audit, inspected local marketplace sources, and identified what access failures prevented me from establishing.

1. **Is there a community-accepted skill?**

**I could not establish one; I also cannot prove that none exists.** The available evidence does not justify a “community-accepted” recommendation.

The phrase is meaningful if supported by independent adoption, sustained maintenance, or comparative evaluation. Treating registry installs or a containing repository’s stars as proof of writing quality would be a category error. Bundle installation is a possible confounder; attributing a particular skill’s popularity to bundling requires evidence about how those installations were counted.

This run’s limitation was stronger than “cached search”: every search and page-opening request returned HTTP 429, yielding **no readable cached results**. Direct shell fetching failed on DNS; permission to retry outside the sandbox was rejected.

2. **Ranked shortlist**

**Empty.** I could not independently read a relevant documentation/commenting `SKILL.md` that qualified for recommendation. Filling this list with registry descriptions would violate the requested standard.

Two leads remain from the supplied handoff, **unread by this seat and unranked**:

- [PostHog `writing-code-comments`](https://github.com/posthog/posthog/blob/master/.agents/skills/writing-code-comments/SKILL.md): the handoff describes checkable deletion rules and internal monorepo use. **Could not open** through the web tool; length and current contents unverified.
- [Riekelt `technical-writer`](https://github.com/riekelt/technical-writer): the handoff describes `technical-writing` and supporting style/truth references. **Could not open** the repository through the web tool; exact skill path, length, and current contents unverified.

The supplied approximate counts—PostHog **60**, Riekelt **6,000**, awesome-copilot **26,000**—are **unverified handoff figures**, attributed there to the registry. No snapshot date was supplied or recovered. Relevant registry targets: [PostHog](https://skills.sh/posthog/posthog/writing-code-comments), [Riekelt](https://skills.sh/riekelt/technical-writer/technical-writing), [awesome-copilot](https://skills.sh/github/awesome-copilot/documentation-writer). I use none as ranking evidence.

3. **Awesome-copilot verdict: could not read**

I attempted the actual [GitHub file](https://github.com/github/awesome-copilot/blob/main/skills/documentation-writer/SKILL.md), its [raw source](https://raw.githubusercontent.com/github/awesome-copilot/main/skills/documentation-writer/SKILL.md), and its registry page. Web requests failed with HTTP 429; `curl` failed to resolve the raw-source host.

Consequently, **“45 lines,” “thin persona prompt,” and “only a Diátaxis pointer” remain unverified**. The explanation that roughly 26,000 installs result from repository popularity is also unverified. Neither the content judgement nor that causal explanation is confirmed.

4. **Worth adopting outside the skill category**

**One substantive artifact was readable locally:** Anthropic marketplace’s [`comment-analyzer` agent definition](https://github.com/anthropics/claude-plugins-official/blob/main/plugins/pr-review-toolkit/agents/comment-analyzer.md), **79 lines**. I read the [local file](/Users/ruliny/.claude/plugins/marketplaces/claude-plugins-official/plugins/pr-review-toolkit/agents/comment-analyzer.md), not the remote URL.

It encodes checkable review rules: compare documented parameters, returns, edge cases, references, and complexity claims against code; identify missing preconditions, side effects, and errors; flag misleading examples and redundant comments. Findings require locations and suggested corrections. It is advisory and explicitly does not edit comments. Those checks are worth incorporating into a review rule block.

**Classification:** an agent definition with concrete checks, **not a `SKILL.md` and not evidence of community consensus**. Local marketplace metadata attributes the package to Anthropic; its recorded last update is **2026-08-10**, which is a local metadata date, not a verified upstream revision. Current remote contents remain unverified.

The requested human-facing sources remain separate reference targets: [Diátaxis](https://diataxis.fr/), [Google’s developer documentation style guide](https://developers.google.com/style), [Microsoft’s Writing Style Guide](https://learn.microsoft.com/en-us/style-guide/welcome/), [ASD-STE100](https://www.asd-ste100.org/), [Write the Docs](https://www.writethedocs.org/guide/), and [Ousterhout’s book](https://web.stanford.edu/~ouster/cgi-bin/book.php). **Could not open** them in this run; I make no fresh textual assessment.

The distinction to preserve is: **human guidance → a skill merely naming that guidance → a skill encoding observable checks**. Naming a respected framework does not demonstrate that a skill implements it or improves results.

5. **Search coverage and unresolved gaps**

Attempted searches covered skills.sh; awesome-claude-skills lists; the Anthropic and OpenAI skills repositories; vendor marketplaces; engineering-organisation documentation instructions; and combinations of `SKILL.md`, documentation/comments, benchmark, and evaluation. All returned access errors.

**I recovered no published evaluation or measured comparison. That is an access-limited result, not evidence that none exists.** Likewise, I could not establish independent adoption, production effectiveness, current counts, or the prevalence of shallow framework wrappers.

Local marketplace inspection produced the comment-review checklist above. It does not close the central evidence gap: **this seat cannot substantiate either a community-endorsed winner or a proven negative answer.**