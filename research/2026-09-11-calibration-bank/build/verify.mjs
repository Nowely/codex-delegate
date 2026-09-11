// Checks a built bank against the properties item-bank.md requires. Every failure it reports is a
// property that is cheap now and impossible to add once the person has started answering.
import fs from 'node:fs'

const bank = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
const P = JSON.parse(fs.readFileSync('/tmp/partition.json', 'utf8'))
const fail = [], warn = []
const F = ['promotional-tone', 'metaphor', 'answer-first']

const words = (s) => s.trim().split(/\s+/).filter(Boolean).length
const parse = (src) => {
  const m = /^(.*):(\d+)-(\d+)$/.exec(src)
  return m ? { file: m[1], a: +m[2], b: +m[3] } : null
}

// 1. Identifiers are the session file's only key to an item.
const ids = bank.items.map((i) => i.id)
if (new Set(ids).size !== ids.length) fail.push(`duplicate ids: ${ids.filter((x, n) => ids.indexOf(x) !== n).join(', ')}`)

// 2. One item per source passage. Items sharing a source are correlated, and the arithmetic that
//    justifies 28 per factor assumes they are not: at an intracluster correlation of 0.2 the real
//    error rate is 0.167 against a nominal 0.031.
const byFile = new Map()
for (const it of bank.items) {
  const r = parse(it.source)
  if (!r) { fail.push(`${it.id}: source "${it.source}" is not file:line-line`); continue }
  if (!fs.existsSync('/Users/ruliny/Git/agent-skills/' + r.file)) fail.push(`${it.id}: source file does not exist: ${r.file}`)
  const list = byFile.get(r.file) || []
  for (const o of list) if (r.a <= o.b && o.a <= r.b) fail.push(`${it.id} overlaps ${o.id} at ${r.file}:${Math.max(r.a, o.a)}-${Math.min(r.b, o.b)}`)
  list.push({ ...r, id: it.id })
  byFile.set(r.file, list)
}

// 3. An engine that strayed outside its blocks took a passage another engine was also given.
const blocks = {}
for (const [w, a] of Object.entries(P.assignment)) blocks[w] = [...a.prose, ...a.code].map(parse)
for (const it of bank.items) {
  const w = it.id.split('-')[0]
  const r = parse(it.source)
  if (!r || !blocks[w]) continue
  if (!blocks[w].some((b) => b.file === r.file && r.a >= b.a && r.b <= b.b)) warn.push(`${it.id}: ${it.source} is outside ${w}'s assigned blocks`)
}

// 4. Factor is uncorrelated with engine only if every engine wrote the same number in every factor.
const single = bank.items.filter((i) => i.type === 'single-factor')
const cell = {}
for (const it of single) {
  if (!F.includes(it.factor)) { fail.push(`${it.id}: unknown factor "${it.factor}"`); continue }
  cell[it.engine] ??= {}
  cell[it.engine][it.factor] = (cell[it.engine][it.factor] || 0) + 1
}
for (const f of F) {
  const n = single.filter((i) => i.factor === f).length
  if (n !== 40) warn.push(`factor ${f} has ${n} items, not the 40 that yields 28 decisive at a 30% tie rate`)
}
const engines = Object.keys(cell)
for (const e of engines) for (const f of F) {
  const n = cell[e][f] || 0
  if (n !== 8) warn.push(`engine ${e} wrote ${n} ${f} items, not 8 — engine and factor stay confounded`)
}

// 5. Word counts are claimed by the engine that wrote them, so they are recomputed here.
for (const it of bank.items) {
  for (const [k, v] of Object.entries(it.variants)) {
    if (k === 'delete') continue
    const real = words(v.text)
    if (Math.abs(real - v.words) > 1) fail.push(`${it.id}/${k}: claims ${v.words} words, has ${real}`)
    if (it.type === 'single-factor' && (real < 30 || real > 75)) warn.push(`${it.id}/${k}: ${real} words, outside 40-60 by more than a margin`)
  }
}

// 6. The promotional-tone instruction adds justification, which adds length, and annotators have been
//    measured choosing the longer text 62% of the time. Unmatched, this factor reports length as tone.
for (const it of single.filter((i) => i.factor === 'promotional-tone')) {
  const on = words(it.variants.on.text), off = words(it.variants.off.text)
  const d = Math.abs(on - off) / Math.max(on, off)
  if (d > 0.10) fail.push(`${it.id}: word counts ${on} vs ${off} differ by ${(d * 100).toFixed(0)}%, over the 10% tolerance`)
}

// 7. A pair whose sides are the same text is not a comparison.
for (const it of bank.items) {
  const texts = Object.values(it.variants).map((v) => v.text.trim().toLowerCase())
  if (new Set(texts).size !== texts.length) fail.push(`${it.id}: two variants carry the same text`)
}

// 8. Shape.
for (const it of bank.items) {
  const ks = Object.keys(it.variants).sort().join(',')
  if (it.type === 'single-factor' && ks !== 'off,on') fail.push(`${it.id}: variants are ${ks}, expected off,on`)
  if (it.type === 'code-comment' && ks !== 'delete,keep,rewrite') fail.push(`${it.id}: variants are ${ks}, expected delete,keep,rewrite`)
  if (it.type === 'code-comment' && !(it.code || '').trim()) fail.push(`${it.id}: code-comment item carries no code`)
}

// 9. The bank nominates repeat candidates and the session order places bank.repeats of them, because
//    whether an item falls late enough to leave no room for its copy is not knowable until the order
//    exists. Fewer candidates than the target is the failure; more is the point.
const reps = bank.items.filter((i) => i.repeat)
const want = bank.repeats ?? 5
if (reps.length < want) fail.push(`${reps.length} items nominated for repeat, fewer than the ${want} to be placed`)
const repFactors = new Set(reps.map((i) => i.factor))
if (repFactors.size < 3) warn.push(`repeat candidates cover ${repFactors.size} factors, not 3`)

// 10. "One factor varies" is checkable as a diff. A pair whose sides part company in several places has
//     varied several things, whatever the instruction said: the first build averaged five differing
//     spans in the tone items, and a blind reader named the intended factor in 30% of them. Moving a
//     sentence is two spans by nature - a deletion and an insertion - so answer-first is counted and
//     reported, not failed.
function spans(a, b) {
  const n = a.length, m = b.length
  const L = Array.from({ length: n + 1 }, () => new Int32Array(m + 1))
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
    L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1])
  let i = 0, j = 0, groups = 0, inDiff = false
  while (i < n && j < m) {
    if (a[i] === b[j]) { i++; j++; inDiff = false }
    else { if (!inDiff) { groups++; inDiff = true }; if (L[i + 1][j] >= L[i][j + 1]) i++; else j++ }
  }
  if (i < n || j < m) groups += inDiff ? 0 : 1
  return groups
}
const spanCount = {}
for (const it of single) {
  const k = spans(it.variants.on.text.split(/\s+/), it.variants.off.text.split(/\s+/))
  spanCount[it.factor] ??= {}
  spanCount[it.factor][k] = (spanCount[it.factor][k] || 0) + 1
  if (['promotional-tone', 'metaphor'].includes(it.factor) && k !== 1) fail.push(`${it.id}: ${k} differing spans, not 1 — more than one thing varies`)
}
console.log('differing spans per pair:')
for (const f of F) console.log(`  ${f.padEnd(18)} ` + Object.entries(spanCount[f] || {}).sort((x, y) => x[0] - y[0]).map(([k, v]) => `${k}:${v}`).join('  '))

console.log(`items ${bank.items.length}  single-factor ${single.length}  code-comment ${bank.items.filter((i) => i.type === 'code-comment').length}  whole-text ${bank.items.filter((i) => i.type === 'whole-text').length}`)
console.log('per engine per factor:')
for (const e of engines) console.log(`  ${e.padEnd(18)} ${F.map((f) => `${f} ${cell[e][f] || 0}`).join('   ')}`)
console.log(`\nFAIL ${fail.length}`); fail.forEach((x) => console.log('  ✗ ' + x))
console.log(`WARN ${warn.length}`); warn.forEach((x) => console.log('  ! ' + x))
process.exit(fail.length ? 1 : 0)
