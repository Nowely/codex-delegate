# Nowely's agent skills

A marketplace of Claude Code plugins. Each plugin is a set of skills an agent loads when the work calls
for it.

```text
/plugin marketplace add Nowely/agent-skills
```

Then install what you need:

| Plugin | Install | What it does |
| --- | --- | --- |
| [codex-delegate](plugins/codex-delegate/) | `/plugin install codex-delegate@nowely` | Runs OpenAI Codex as a subagent beside Claude's own agents. Each call declares what Codex may write; the report says what actually ran. |
| [terse](plugins/terse/) | `/plugin install terse@nowely` | Measures whether documentation gives readers the right answer — fresh readers per question, every behavioural claim checked against the code — and repairs what it measured. |

## Layout

```text
.claude-plugin/marketplace.json   the catalogue: one entry per plugin
plugins/<name>/                   one plugin, with its own manifest, docs and tests
```

A plugin owns everything under its directory, including its README, its CHANGELOG and its suites. The
catalogue at the root is the repository's, not any one plugin's.

## Releases

One tag namespace serves every plugin, so a tag names the plugin it releases:
`codex-delegate@0.13.0`. A plugin's own `RELEASING.md` is the procedure for cutting it.
