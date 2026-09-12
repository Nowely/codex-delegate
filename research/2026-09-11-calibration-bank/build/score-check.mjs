// Scores a blind manipulation check against the key. Usage: node score-check.mjs <journal.jsonl>
// The checker is not taken at face value: its "one side is worse" verdicts are broken out by which
// variant that side actually was, because a checker with a taste of its own reports it as a defect.
import fs from 'node:fs'

const key = JSON.parse(fs.readFileSync('/tmp/bank-build/check/key.json', 'utf8'))
const V = new Map()
for (const line of fs.readFileSync(process.argv[2], 'utf8').split('\n').filter(Boolean)) {
  let e; try { e = JSON.parse(line) } catch { continue }
  if (e.type !== 'result') continue
  const list = Array.isArray(e.result) ? e.result : (e.result || {}).verdicts || []
  for (const v of list) V.set(v.pair, v)
}

const MAP = {
  'one side claims a benefit where the other states a plain fact': 'promotional-tone',
  'one uses a figure of speech where the other is plain': 'metaphor',
  'the main point sits in a different position': 'answer-first',
}
const F = ['promotional-tone', 'metaphor', 'answer-first']
const hit = {}, other = {}, det = {}, worse = {}
for (const k of key) {
  const v = V.get(k.token)
  if (!v) continue
  hit[k.factor] ??= [0, 0]; other[k.factor] ??= {}; det[k.factor] ??= {}; worse[k.factor] ??= { on: 0, off: 0, neither: 0 }
  const named = MAP[v.category] === k.factor
  hit[k.factor][named ? 0 : 1]++
  if (!named) other[k.factor][v.category] = (other[k.factor][v.category] || 0) + 1
  det[k.factor][v.detectability] = (det[k.factor][v.detectability] || 0) + 1
  const side = v.worseSide === 'neither' ? 'neither' : (v.worseSide === 'a' ? k.aIs : (k.aIs === 'on' ? 'off' : 'on'))
  worse[k.factor][side]++
}

console.log(`${V.size} verdicts scored\n`)
console.log('THE CHECKER NAMED THE INTENDED FACTOR:')
for (const f of F) { const [y, n] = hit[f] || [0, 0]; console.log(`  ${f.padEnd(20)} ${String(y).padStart(3)}/${y + n}  (${Math.round(100 * y / (y + n))}%)`) }
console.log('\nWHAT IT SAW INSTEAD:')
for (const f of F) for (const [c, n] of Object.entries(other[f] || {}).sort((a, b) => b[1] - a[1])) console.log(`  ${f.padEnd(20)} ${String(n).padStart(3)}x  ${c}`)
console.log('\nDETECTABILITY:')
for (const f of F) console.log(`  ${f.padEnd(20)}`, det[f])
console.log('\nWHICH VARIANT THE CHECKER CALLED WORSE (its taste, not a defect count):')
for (const f of F) console.log(`  ${f.padEnd(20)} on ${String(worse[f].on).padStart(3)}   off ${String(worse[f].off).padStart(3)}   neither ${String(worse[f].neither).padStart(3)}`)
