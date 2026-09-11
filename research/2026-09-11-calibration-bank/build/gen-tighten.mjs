// Regenerates the tone and metaphor items in place. Each writer gets back its OWN items, on the same
// source passages, and rewrites each pair so that exactly one contiguous span differs. Same ids, so the
// bank keeps one item per source passage and the answer-first items are untouched.
import fs from 'node:fs'

const bank = JSON.parse(fs.readFileSync('/Users/ruliny/Git/agent-skills/research/2026-09-11-calibration-bank/bank.json', 'utf8'))
const OUT = '/tmp/bank-build/v2'
const WORKERS = ['astra', 'sol', 'terraA', 'terraB', 'opusA', 'opusB', 'sonA', 'sonB', 'sonC', 'sonD']

const RULE = `THE ONE RULE THAT MATTERS

The two sides of a pair must be word-for-word identical EXCEPT FOR ONE CONTIGUOUS SPAN. Pick a span —
a phrase or a clause — and write two versions of that span. Everything before it and everything after it
is the same text, character for character, on both sides.

This is checked mechanically. A pair whose sides differ in two places, however small the second one,
fails. Your last attempt at these same passages averaged five separate differences per pair, and a blind
reader could no longer say what had been varied.`

const FACTOR = {
  'promotional-tone': `YOUR FACTOR: promotional tone.

  off — the span states a further fact about the thing
  on  — the span states why the thing is good

Both spans are the same kind of grammatical unit and within a few words of each other in length, so the
two sides stay matched in length. Annotators pick the longer text 62% of the time; a justification that
is simply extra words measures length and reports it as tone.

Good:  "...refuses a resume with exit 10, [which the caller can retry once the turn closes]."
       "...refuses a resume with exit 10, [so a half-written thread is never resumed by accident]."
Bad:   any pair where a sentence elsewhere was also reworded, reordered or tightened.`,
  metaphor: `YOUR FACTOR: metaphor against literal.

  on  — the span is the plain, literal phrase
  off — the span is a figure of speech for that same idea

Not a different sentence: the same sentence with one phrase swapped. If the passage has no idea that can
carry a figure of speech, say so by keeping the item and choosing a different span within it.

Good:  "A seat that passes its checks is [not evidence the task succeeded]."
       "A seat that passes its checks is [a green light, not a signed delivery note]."
Bad:   any pair where the surrounding sentences also changed.`,
}

for (const w of WORKERS) {
  const mine = bank.items.filter((i) => i.id.startsWith(w + '-') && ['promotional-tone', 'metaphor'].includes(i.factor))
  if (!mine.length) continue
  const body = mine.map((i) => `--- ${i.id}   factor: ${i.factor}   source: ${i.source}
current on:  ${i.variants.on.text}
current off: ${i.variants.off.text}`).join('\n\n')

  fs.writeFileSync(`${OUT}/${w}.prompt.txt`, `You wrote ${mine.length} items for a blind paired-comparison instrument. A blind check has since
measured them and they failed: the two sides of a pair were meant to differ in one thing, and they
differ in several. Rewrite them.

Repository root: /Users/ruliny/Git/agent-skills

${RULE}

WHAT STAYS THE SAME

The item id, the factor, and the source passage. Keep building on the same lines of the same file — open
them if you need the context. The content of the passage stays what it was. Only the discipline changes.

${FACTOR['promotional-tone']}

${FACTOR.metaphor}

Each item below says which factor it is. Use the rules for that factor and ignore the other.

WHAT TO DO WITH EACH

Start from the current pair. You may keep whichever side is closer to the passage and rewrite only the
other, or write both again — whatever gets you to one differing span. Each side stays between 40 and 60
words. Both sides must read as prose a competent technical writer could have shipped; a pair where one
side is visibly worse is a wasted item whatever its span count.

YOUR ITEMS

${body}

OUTPUT. Return ONE JSON object, {"items":[...]}, matching the schema you were given, with the id and
factor exactly as above, "type":"single-factor", "code":"", and the source string copied unchanged:

{"id":"${mine[0].id}","type":"single-factor","factor":"${mine[0].factor}","source":"${mine[0].source}",
 "code":"","instructionOn":"...","instructionOff":"...",
 "variants":[{"key":"on","text":"...","words":52},{"key":"off","text":"...","words":51}]}

Count words literally. Do not record which side you expect a reader to prefer, anywhere.`)
}
console.log(WORKERS.map((w) => {
  const n = bank.items.filter((i) => i.id.startsWith(w + '-') && ['promotional-tone', 'metaphor'].includes(i.factor)).length
  return `${w}: ${n} items`
}).join('\n'))
