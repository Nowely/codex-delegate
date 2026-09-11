// Third pass, on the twelve pairs that still differ in more than one place. Each failing item goes back
// to the engine that wrote it - a different engine would break the eight-per-factor rotation - and this
// time the prompt shows the offending spans instead of restating the rule.
import fs from 'node:fs'

const bank = JSON.parse(fs.readFileSync('/Users/ruliny/Git/agent-skills/research/2026-09-11-calibration-bank/bank.json', 'utf8'))
const OUT = '/tmp/bank-build/v3'

function diffSpans(a, b) {
  const n = a.length, m = b.length
  const L = Array.from({ length: n + 1 }, () => new Int32Array(m + 1))
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
    L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1])
  const out = []
  let i = 0, j = 0, cur = null
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) { if (cur) { out.push(cur); cur = null }; i++; j++; continue }
    cur ??= { on: [], off: [] }
    if (j >= m || (i < n && L[i + 1][j] >= L[i][j + 1])) cur.on.push(a[i++])
    else cur.off.push(b[j++])
  }
  if (cur) out.push(cur)
  return out
}

const failing = bank.items.filter((it) => ['promotional-tone', 'metaphor'].includes(it.factor) &&
  diffSpans(it.variants.on.text.split(/\s+/), it.variants.off.text.split(/\s+/)).length !== 1)

const byWorker = {}
for (const it of failing) (byWorker[it.id.split('-')[0]] ??= []).push(it)

for (const [w, items] of Object.entries(byWorker)) {
  const body = items.map((it) => {
    const d = diffSpans(it.variants.on.text.split(/\s+/), it.variants.off.text.split(/\s+/))
    return `--- ${it.id}   factor: ${it.factor}   source: ${it.source}
on:  ${it.variants.on.text}
off: ${it.variants.off.text}

Your two sides part company in ${d.length} places. They may part company in ONE:
${d.map((s, k) => `  ${k + 1}. on: "${s.on.join(' ') || '(nothing)'}"\n     off: "${s.off.join(' ') || '(nothing)'}"`).join('\n')}
Keep whichever of these carries the factor. Make every other one go away by copying one side's wording
onto the other - it does not matter which, as long as both sides then read the same there.`
  }).join('\n\n')

  fs.writeFileSync(`${OUT}/${w}.prompt.txt`, `${items.length} of the pairs you rewrote still differ in more than one place. Fix those, and only those.

Repository root: /Users/ruliny/Git/agent-skills

THE RULE, RESTATED EXACTLY

The two sides of a pair are word-for-word identical except for ONE contiguous span. It is checked with a
diff. A second difference of two words fails the item as surely as a rewritten sentence does.

Below, each item is shown with the places its sides currently differ. Keep the one that carries the
factor — the justification clause for promotional tone, the figure of speech for metaphor — and erase
every other difference by making both sides say the same thing there.

Keep the id, the factor and the source unchanged. Each side stays between 40 and 60 words, and for
promotional tone the two sides stay within 10% of each other in length. Do not introduce a new
difference while removing an old one: that is the way this fails twice.

YOUR ITEMS

${body}

OUTPUT. Return ONE JSON object, {"items":[...]}, matching the schema, with "type":"single-factor",
"code":"", the id, factor and source copied unchanged, and the instruction fields describing the single
span you kept. Count words literally.`)
}
console.log(Object.entries(byWorker).map(([w, i]) => `${w}: ${i.length} (${i.map((x) => x.id.split('-').slice(1).join('-')).join(', ')})`).join('\n'))
