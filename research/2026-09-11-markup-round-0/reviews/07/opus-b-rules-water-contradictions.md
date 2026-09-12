# Opus critic B — rules, water, contradictions — on 07-lifecycle.md

1. THE MECHANICAL RULES

Rule-age note first, because two rules collide with younger written decisions.
Evidence: `skeleton.md` mtime Sep 11 23:40; `structure-map.md` Sep 12 14:21; `rounds.md` Sep 12 17:56 (`ls -lT`). The younger two record structural exceptions and I applied them; the skeleton's word budgets have no younger replacement, so I applied those as written.
- Skeleton §4 "**A table is the section.**" (skeleton.md:74) vs structure-map.md:93-95 "This began as a nine-row comparison table and was cut: eight of its nine rows said 'yes' in both columns". Map is younger → exception applied; the missing table in 07 is NOT scored as a violation.
- Skeleton's 7 sections vs the document's 10. structure-map.md:3 "1383 words, 10 sections" and its per-section verdicts are younger → the 10-section shape is accepted; budgets are mapped onto it below.
- Rule 1 itself is re-asserted by the younger map (structure-map.md:135 "Every flag, exit code and protocol noun in the document is inside it or linked from it — checkable by `grep`"), so rule 1 is NOT waived. But the same map, at :102, accepts "the state directory by its literal path" inside §6 What it stores. Map is younger → the four literal paths are reported as rule-1 hits under the skeleton reading and as accepted under the map.

RULE 1 — "No mechanism before the decision it would inform. No flag name, header field, exit code, protocol name, environment variable or absolute path before §6" (skeleton.md:19-21). §6 = "## How it works", line 150.
- L71 flag name, outside §6: "add --keep-data to keep your answers and run records". VIOLATION.
- L111, L118, L115, L117: "`~/.claude/plugins/data/codex-delegate-nowely`"; "`~/.codex/sessions`"; "`.claude/worktrees` inside your repository"; "`refs/codex-delegate/`". Four path mechanisms before §6. VIOLATION under the skeleton, permitted by the younger map.
- L8 protocol noun in the opening: "the run stops if the server grants anything else". "The server" is unglossed until L152 "`codex app-server`". VIOLATION (also a term-before-definition hit).
- L97 "reach the network — off in one line": a flag with its name withheld. BORDERLINE.
- Code-block enumeration in rule 1: six blocks found: 14-17 install (allowed), 32-40 exchange (allowed), 50-56 example phrasings (NOT allowed), 67-72 update (allowed), 163-165 `driver.mjs --help` (NOT in the list), 170-175 from-source (allowed). Two extra blocks; the 163-165 block collides with rule 2, which demands the generated reference be reachable.

RULE 2 — "Generated reference is linked, never transcribed" (skeleton.md:22-24).
- L189 transcribed report field: "the report's `error` says why: a full Codex quota window, a held write lock, no state directory". A field name plus an enumeration of its values. VIOLATION.
- L71 `--keep-data` is a transcribed flag. VIOLATION on a literal read.

RULE 3 — "Every command is in a fenced block with a language, in the form that runs from a shell" (skeleton.md:25-27).
- L24 "check with `codex login status`" — inline. VIOLATION.
- L180 "Update the clone with `git pull`." — inline. VIOLATION.
- L188 "your own edits are gone until `git stash pop`" — inline. VIOLATION.
- L193 "with `codex --version`, the plugin version" — inline. VIOLATION.
- Slash forms have no shell form: NOT scored.

TERMINOLOGY RULE — clean as prose; "seat" only in paths and the skill name.

PER-SECTION EXCLUSION LISTS (skeleton's "*Not here:*").
- §2 forbids "Node version": L26 "- Node 22 or newer"; skeleton also lists it under "Deleted outright". VIOLATION (under the skeleton as written).
- §3 forbids "uninstall": L65 heading, L71 command, L75-77 marketplace removal. VIOLATION (three sites).
- §5 forbids "the Chromium override": L133 "the override Chromium needs is a file in the tree." VIOLATION.
- §6 forbids "lock design" and "the state directory's tree": L122-123 lock sentence; L107-120 "four places" with each path and its contents. VIOLATION (two).
- §6's "Three sentences and one link per paragraph": L140-145 is four sentences. VIOLATION on sentence count.

SKELETON CONTENT REQUIRED AND ABSENT.
- §5 was to carry "The interface underneath is experimental, which is why a codex upgrade is the thing that breaks" (skeleton.md:103-104). It lives at L27-28 (Quick start) and L191 (Troubleshooting) instead.
- §6 was to state the retention numbers, "bounded at 14 days or 400 entries" (skeleton.md:115-116). L121 gives "age out by count and by age" with no numbers. Requirement unmet.
- §7 was to end with "four canonical pointers" (skeleton.md:127). L198-200 has three.

WORD BUDGETS — `wc -w` per section (fences and table pipes included; 144 words inside fences).

| Skeleton section · budget | Document section(s) | words | verdict |
|---|---|---|---|
| §1 · 110 | title + opening (1-11) | 104 | pass, −6 |
| §2 · 210 | Quick start (12-44) | 172 | pass, −38 |
| §3 · 55 | Update and uninstall (65-78) | 71 | OVER 16 (+29%) |
| §4 · 230 | What a Codex agent can do (79-101) | 248 | OVER 18 (+8%) |
| §5 · 110 | Where parity stops (125-138) | 99 | pass, −11 |
| §6 · 190 | How it works 205 + What it stores 215 + Against the official plugin 87 | 507 | OVER 317 (+167%) |
| §7 · 100 | Commands 139 + Further reading 41 | 180 | OVER 80 (+80%) |
| — no budget | Troubleshooting (184-195) | 181 | unbudgeted |
| total ~1005 | whole file | 1611 | OVER 606 (+60%) |

Direction over the rounds: 01 → 07 grew 1383 → 1611, all of it in four sections — What a Codex agent can do 190→248, What it stores 104→215, How it works 103→205, Troubleshooting 128→181. Every other section is byte-stable. Water alone (~140 words) does not close a 606-word gap; the gap is structural, in those four.

WRITING-RULES, remaining rules.
- "Cut first: the argument for an instruction": L160 "which is where they stay accurate"; L177-179 "nothing else supplies it on this route, where the driver refuses to start rather than invent a location under your home". VIOLATION (two). L5 is the purpose statement, protected.
- "Define a term where the reader first needs it": L8 "the server" 144 lines before L152 "`codex app-server`". L112 "the worktree ledger" introduces "worktree", never defined, while the user-facing name is "throwaway copy" (L86, L91, L115) — two vocabularies for one thing. VIOLATION (two).
- Dated measurement: L27 keeps its number — clean.

2. WATER, ranked by words saved

Skipped on principle (condition/limit/warning at a decision point): L19-20; L24-25; L75-77; L90-94 the whole WARNING; L98-99 "unless your tooling keeps a daemon…"; all four Troubleshooting rows; L26-28 the version pin.

| # | line | quoted phrase | keep instead | saved |
|---|---|---|---|---|
| 1 | 122-123 | "A write lock goes when its run ends, and one a killed run left behind is reclaimed by the next." | cut; L189 already tells the reader what to do about a lock | 21 |
| 2 | 177-179 | "Claude Code has to inherit it, and nothing else supplies it on this route, where the driver refuses to start rather than invent a location under your home" | "Claude Code must inherit it; without it the driver refuses to start" | 15 |
| 3 | 5-6 | "A review, a refutation or a competing implementation from the same model is one model's opinion twice. So one task can go to a panel" | "One model reviewing its own answer is one opinion twice, so a task can go to a panel" | 14 |
| 4 | 112-113 | "the scratch of read-only agents started from a shell that names no temp directory" | cut here; the condition is already at L84 (cut one of the two, not both) | 14 |
| 5 | 118-119 | "so a check on what really ran has something to read" | cut; L157-158 states the use inside §6 | 11 |
| 6 | 86-87 | "Made for it, removed once what it did has been saved, and kept for you to look at when the turn or the saving fails." | "Removed once its work is saved; kept for you if the turn or the save fails." | 9 |
| 7 | 160-161 | "The flags, the report's fields and every exit code are the driver's own help, which is where they stay accurate:" | "Flags, report fields and exit codes live in the driver's help:" | 9 |
| 8 | 99-100 | "The one place the two differ is proof, and that is what [How it works](#how-it-works) is about." | "Where they differ is proof: [How it works](#how-it-works)." | 9 |
| 9 | 47-48 | "Most of the time you type nothing special — you name Codex, or ask for a second opinion, and the plugin takes it from there:" | "You name Codex, or ask for a second opinion, and the plugin takes it from there:" | 9 |
| 10 | 30 | "Then ask for the work in the conversation." | cut; L47-48 says it again, better | 8 |
| 11 | 128 | "Granting that directory is a widening to decide on its own." | "Grant it only deliberately." | 7 |
| 12 | 42-43 | "Claude briefs each agent by writing its prompt to a file outside your project, so the first run asks your permission to write there." | "Claude writes each agent's prompt outside your project, so the first run asks permission." | 7 |
| 13 | 144-145 | "Neither failure announces itself: both runs come back looking successful." | "Both come back looking successful." | 6 |
| 14 | 97 | "reach the network — off in one line" | "reach the network" | 5 |
| 15 | 60 | "Agrees one plan with you, then pushes every verbose step — tests, tree-wide greps, diffs, logs" | "Agrees a plan, then pushes the verbose steps — tests, greps, diffs, logs" | 4 |
| 16 | 157-158 | "opened and its first record read rather than matched by name" | "opened and read, not matched by name" | 4 |
| 17 | 76-77 | "copy its data directory, named under [What it stores](#…), first" | "copy its data directory (see [What it stores](#…)) first" | 2 |

Sum ≈ 144 words.

3. DUPLICATION AND CONTRADICTION

One idea, one home — three or more places:
- The verdict comes from the record, not the model's account: L9-10; L99; L156; L144 (the fourth is the competitor contrast and earns itself).
- Answers and run records survive / are the stored data: L71; L74; L111; L121. L71 and L74 are four lines apart.
- Write locks: L111, L122, L189. Only L189 is symptom-keyed and allowed.

Two homes where the skeleton gave one: browser tests (L85, L133); the `parity.md` pointer near-verbatim (L137, L199); the temp-directory fallback (L84, L112-113).
Allowed repeats, symptom-keyed: L91-93 vs L188; L135 vs L190; L25 vs L189.

Contradictions:
- L99 "The one place the two differ is proof" vs L127-135, four differences under "Where parity stops"; also vs L96 and the title line.
- L104 "The plugin sends nothing anywhere itself." vs L104-106 "What reaches OpenAI is the turn". The load is carried by "itself".
- L83 "writes nothing of yours" (and L36) vs L84 "one temp directory is the only thing it may write — yours". Your temp directory is yours.
- L127 "By default a Codex agent cannot commit" vs L117 "a crashed run's commits are kept under `refs/codex-delegate/`" and L86-87. The scope word needed is "cannot commit to your branch".
- L113-114 "a Codex home of the plugin's own, so your own Codex plugins, skills and memories cannot steer a turn" vs L118 "`~/.codex/sessions`, your own Codex home — each turn's full transcript lands there". Nothing reconciles them.
- L63 "Both are yours to start; nothing invokes them on your behalf." vs L179 "`/seat`, not `/codex-delegate:seat`". A third startable mode named nowhere in Commands.
- L19-20 reload for an install vs L74 restart for an update, no reason given.
- L9 "by default, an agent that ran nothing comes back failed" vs L156 unconditional; no sentence says how the default is changed.
- L130-131 "nothing pauses to ask you" vs L42-43 "the first run asks your permission to write there". Different actors, never distinguished.
