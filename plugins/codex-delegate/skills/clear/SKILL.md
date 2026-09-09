---
name: clear
description: >-
  Lists files left by codex-delegate, suggests what to remove, and deletes the
  user's selection after approval.
disable-model-invocation: true
metadata:
  version: "0.11.1"
license: MIT
---

Run the script, show its listing as it is, propose a set, and wait for the
user's word. Speak in short sentences when proposing, when clarifying, after
deleting, and on every refusal or error. Read the JSON yourself for the
numbers; never read it, paths or exit codes to the user, and never retell the
listing in your own words.

## The cycle

1. Run the listing with the Bash description "List files left by
   codex-delegate."

       F="$(mktemp "${TMPDIR:-/tmp}/codex-delegate-clear.XXXXXXXX")"
       CLAUDE_PLUGIN_DATA="${CLAUDE_PLUGIN_DATA}" node "${CLAUDE_PLUGIN_ROOT}/skills/codex-delegate/scripts/clear.mjs" --list --json >"$F" && cat "$F" && echo "snapshot: $F"

   `mktemp` gives each listing its own file. A name built from the shell's
   `$$` does not: two listings in one shell would share it, and a number from
   the first would then be read against the second. Keep the snapshot path
   from the last line; step 3 needs that exact path. Show the `text`
   field to the user in one code block, unchanged. It is the listing: numbered
   items, their sizes, when they last changed, whether each is suggested,
   selectable by its number or kept, and why. Say nothing about the items
   yourself. An empty inventory is "I found no items covered by this cleanup."
2. Propose in one sentence exactly what `proposed` holds, by those rows' names
   and their total size: "I suggest deleting the temporary files for seat
   u1-astra and 172 temporary directories from the lock tests, about 11 MB;
   shall I?" When `selectable` holds numbers that are not in `proposed`, add
   one sentence naming them: "Item 1, the 9 September 2026 clear, and item 18,
   43 saved conversations from the tests, can go too if you say their
   numbers." Then wait. With nothing suggested and nothing else selectable,
   say "I have no cleanup to suggest; the listed items are being kept for the
   reasons shown."
3. Map the answer to numbers yourself. "Yes", "yes please", "go", "go ahead",
   "apply it" or "да" is exactly the numbers in `proposed`. Digits are those
   numbers; an affirmative with digits adds them to the suggestion; "only" or
   "instead" restricts to the digits alone. "All" or "everything": ask "Do you
   mean the items I suggested, or the runs and saved conversations as well?"
   and wait. "No": "I'll leave the listed items in place." A question: answer
   it, delete nothing. Silence: wait. A number that is not in `selectable` is
   not yours to send — say "<name> is being kept; the listing says why." and
   leave it out. Then run, with the description "Delete the cleanup items the
   user selected.":

       CLAUDE_PLUGIN_DATA="${CLAUDE_PLUGIN_DATA}" node "${CLAUDE_PLUGIN_ROOT}/skills/codex-delegate/scripts/clear.mjs" --delete --from "<SNAPSHOT>" <numbers>

   Do not run the listing again between the user's word and this call: the
   snapshot is what binds each number to what was shown, and an item that
   changed since then is left in place and reported.
4. The command prints one paragraph per outcome, then the fresh listing.
   Report the outcomes in your own message using those sentences as written —
   "I deleted the temporary files for seat u1-astra and 172 temporary
   directories from the lock tests, and left the 9 September 2026 clear in
   place because it changed since it was listed." Then show the fresh listing
   in a code block when anything remains, and say "I have no further cleanup
   to suggest." only when its last lines say nothing is suggested and nothing
   else is selectable.

## Reading the result

Read the whole output even on exit 10: deletions and refusals occur together.
Use the listing's names; omit outcomes that did not occur.

| Result | What to say and do |
| --- | --- |
| 0 | the deletion sentences the command printed, then the fresh listing |
| 1 | "I could not remove <name> because <reason>; check it by hand." beside the confirmed deletions |
| 2, no data directory | "Cleanup could not start because this session has no plugin data directory configured; nothing was deleted." |
| 2, a stale or unreadable snapshot | "The list I showed you is no longer usable, so nothing was deleted; here is the current list." Then start again at step 1 |
| 2, invalid command | "Cleanup could not start because the command was invalid; nothing was deleted." Correct the call |
| 10 | each refusal in its own sentence, from the command's own wording: it changed since it was listed; it is being kept and cannot be chosen; it changed while it was being removed |
| no readable result | "Cleanup did not return a readable result, so I cannot yet confirm what was deleted." Establish the outcome first |

## What it never touches

Managed worktrees and their ledger, write locks and the shared Codex home are
listed and never removed: the driver reconciles the first two itself, and the
last is shared by every seat. The data directory of another copy of this
plugin is the user's own to remove — when they ask how, say "This command
removes it." and show that row's `command` from `manual` in its own block. For
the entries outside this cleanup, say "To list those entries without removing
them, run this command." and show `notCovered.listCommand`; for removal,
`notCovered.removeCommand`.

Forward `CLAUDE_PLUGIN_DATA` as shown. The script uses
`CODEX_DELEGATE_STATE_DIR` first, then `CLAUDE_PLUGIN_DATA`; setup follows the
sibling's [One call](../codex-delegate/SKILL.md#one-call).
