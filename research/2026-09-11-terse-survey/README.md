# Survey of documentation methods, 2026-09-11

Raw returns from the survey behind `plugins/terse/references/prior-art.md`. Kept whole because the
curated file quotes a small part of them and a later reader may want the rest, and because several of
these returns contain measurements nobody has folded in yet.

This directory is outside every plugin payload. Nothing here is installed with a plugin, and nothing here
is read at runtime.

## What is here

`seat-returns/` — eleven returns from Codex `gpt-6-astra` seats. Prose reports, as returned.

| File | What the seat did |
|---|---|
| `A0-commentary.md` | killed by a usage limit after 34 commands; commentary only. Its one finding was verified by hand afterwards |
| `A1.md` | enumerated all 848 entries of `github/awesome-copilot`, read the 141 about text |
| `A2.md` | `anivar/developer-docs-framework` and `thegooddocsproject/templates` |
| `A3.md` | production documentation telemetry at GitHub, Algolia, Elastic, PostHog |
| `A4.md` | 52 searches in five languages: non-English practice, safety-critical writing, instructional design, legal drafting, agent benchmarks |
| `A5.md` | adversarial refutation of the plugin's own six conclusions |
| `A6.md` | Vale's `consistency` mechanism, `tamos`, `mdt`, `readme-score` |
| `A7.md` | measured the duplication claim against three Diataxis skills, plus six smaller targets |
| `A8.md` | 36 primary sources on formatting `.md` for human readers |
| `A9.md` | measured ten well-regarded documents; script, manifest and hashes named in the report |
| `A10.md` | every current page of Anthropic's prompt-engineering documentation |

`round2-returns/` — sixteen structured returns from Claude agents, as JSON. Fifteen readers plus
`critic-completeness.json`, which lists fifteen gaps the survey still has, each proven by a grep over the
plugin's own files.

The 271 practices inside these JSON returns are rendered as Markdown in
`plugins/terse/references/practices-full.md`. The JSON is kept because it carries the fields that
rendering drops.

## What is not here

Round one's twelve agents. Their findings are in `prior-art.md`; their raw returns were not archived
before the workflow transcript aged out. Recorded so nobody looks for them.
